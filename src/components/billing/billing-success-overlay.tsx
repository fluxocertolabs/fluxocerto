import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useLocation } from 'react-router-dom'
import { useBillingStatus } from '@/hooks/use-billing-status'
import { clearBillingSuccessFlag, readBillingSuccessFlag } from '@/components/billing/billing-success-flag'

const loadingAnimation = () => import('@/assets/lottie/loading.json')
const completeAnimation = () => import('@/assets/lottie/complete.json')

type AnimationModule = { default: unknown } | unknown
type AnimationData = { fr?: number; ip?: number; op?: number }
type LottieComponentType = React.ComponentType<{
  animationData: object
  loop?: boolean | number
  autoplay?: boolean
}>

const LOADING_SIZE = 'w-20 h-20'
const COMPLETE_SIZE = 'w-28 h-28'
const FALLBACK_DURATION_MS = 900

function resolveDefault(module: AnimationModule): unknown {
  return module && typeof module === 'object' && 'default' in module
    ? (module as { default: unknown }).default
    : module
}

function getLottieDurationMs(animationData: AnimationData): number {
  const fr = typeof animationData.fr === 'number' ? animationData.fr : null
  const ip = typeof animationData.ip === 'number' ? animationData.ip : 0
  const op = typeof animationData.op === 'number' ? animationData.op : null
  if (!fr || !op || fr <= 0) return FALLBACK_DURATION_MS
  const frames = Math.max(0, op - ip)
  return Math.min(10_000, Math.max(600, Math.round((frames / fr) * 1000)))
}

type OverlayPhase = 'loading' | 'shrink' | 'complete' | 'done'

/**
 * Full-screen overlay shown after returning from Stripe success.
 * - Dims the current page
 * - Shows a looping loading animation while waiting for access
 * - Shrinks to center and plays the completion animation once access is granted
 * - Then disappears
 */
export function BillingSuccessOverlay() {
  const location = useLocation()
  const shouldReduceMotion = useReducedMotion()
  const { hasAccess, refetch } = useBillingStatus()
  const [isActive, setIsActive] = useState(false)
  const [phase, setPhase] = useState<OverlayPhase>('loading')
  const [loadingData, setLoadingData] = useState<object | null>(null)
  const [completeData, setCompleteData] = useState<object | null>(null)
  const [LottieComponent, setLottieComponent] = useState<LottieComponentType | null>(null)
  const completionSequenceStarted = useRef(false)
  const completionDurationMsRef = useRef<number>(FALLBACK_DURATION_MS)
  const wasActiveRef = useRef(false)

  // Activate overlay if a success flag exists.
  useEffect(() => {
    if (typeof window === 'undefined') return
    setIsActive(readBillingSuccessFlag())
  }, [location.key])

  // Poll billing status only while the overlay is active.
  useEffect(() => {
    if (!isActive) return
    const interval = window.setInterval(() => {
      refetch()
    }, 2000)
    return () => window.clearInterval(interval)
  }, [isActive, refetch])

  // Lazy-load lottie-react + both animations (best effort).
  useEffect(() => {
    if (!isActive) return
    if (shouldReduceMotion) return

    let alive = true

    void import('lottie-react')
      .then((mod) => {
        if (!alive) return
        setLottieComponent(() => mod.default as unknown as LottieComponentType)
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn('Failed to load lottie-react:', err)
      })

    void loadingAnimation()
      .then((mod) => {
        if (!alive) return
        const resolved = resolveDefault(mod)
        if (resolved && typeof resolved === 'object') setLoadingData(resolved as object)
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn('Failed to load loading animation:', err)
      })

    void completeAnimation()
      .then((mod) => {
        if (!alive) return
        const resolved = resolveDefault(mod)
        if (resolved && typeof resolved === 'object') setCompleteData(resolved as object)
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn('Failed to load complete animation:', err)
      })

    return () => {
      alive = false
    }
  }, [isActive, shouldReduceMotion])

  const completeDurationMs = useMemo(() => {
    if (!completeData) return FALLBACK_DURATION_MS
    return getLottieDurationMs(completeData as AnimationData)
  }, [completeData])

  // Drive the phase machine.
  useEffect(() => {
    if (!isActive) {
      wasActiveRef.current = false
      return
    }

    // Reset sequence on re-activation to avoid getting stuck if hasAccess is already true.
    if (!wasActiveRef.current) {
      wasActiveRef.current = true
      completionSequenceStarted.current = false
      setPhase('loading')
    }
    if (!hasAccess) {
      completionSequenceStarted.current = false
    }

    // Reduced motion: as soon as access is available, just close.
    if (shouldReduceMotion) {
      if (hasAccess) {
        clearBillingSuccessFlag()
        setIsActive(false)
      }
      return
    }

    if (!hasAccess) {
      setPhase('loading')
      return
    }

    if (completionSequenceStarted.current) {
      return
    }
    completionSequenceStarted.current = true
    // If the completion animation failed to load, we still proceed and close
    // the overlay using a fallback duration (the placeholder will render).
    completionDurationMsRef.current = completeData ? completeDurationMs : FALLBACK_DURATION_MS

    // Access granted: run shrink -> complete -> done.
    setPhase('shrink')
    const t1 = window.setTimeout(() => setPhase('complete'), 160)
    const t2 = window.setTimeout(() => setPhase('done'), 160 + completionDurationMsRef.current + 30)
    const t3 = window.setTimeout(() => {
      clearBillingSuccessFlag()
      setIsActive(false)
    }, 160 + completionDurationMsRef.current + 60)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [isActive, hasAccess, shouldReduceMotion, completeData, completeDurationMs])

  if (!isActive) return null

  const canRenderLoading = !shouldReduceMotion && !!LottieComponent && !!loadingData
  const canRenderComplete = !shouldReduceMotion && !!LottieComponent && !!completeData

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm">
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={false}
          animate={
            phase === 'shrink'
              ? { scale: 0.72, opacity: 0 }
              : phase === 'complete'
                ? { scale: 1, opacity: 1 }
                : { scale: 1, opacity: 1 }
          }
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className={phase === 'complete' || phase === 'done' ? COMPLETE_SIZE : LOADING_SIZE}
        >
          {phase === 'complete' || phase === 'done' ? (
            canRenderComplete ? (
              <LottieComponent animationData={completeData!} autoplay loop={false} />
            ) : (
              <div className={COMPLETE_SIZE} />
            )
          ) : (
            canRenderLoading ? (
              <LottieComponent animationData={loadingData!} autoplay loop />
            ) : (
              <div className={LOADING_SIZE} />
            )
          )}
        </motion.div>
      </div>
    </div>
  )
}


