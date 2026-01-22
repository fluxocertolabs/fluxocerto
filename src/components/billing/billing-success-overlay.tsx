import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
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

function resolveDefault(module: AnimationModule): unknown {
  return module && typeof module === 'object' && 'default' in module
    ? (module as { default: unknown }).default
    : module
}

function getLottieDurationMs(animationData: AnimationData): number {
  const fr = typeof animationData.fr === 'number' ? animationData.fr : null
  const ip = typeof animationData.ip === 'number' ? animationData.ip : 0
  const op = typeof animationData.op === 'number' ? animationData.op : null
  if (!fr || !op || fr <= 0) return 1200
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
  const shouldReduceMotion = useReducedMotion()
  const { hasAccess, refetch } = useBillingStatus()
  const [isActive, setIsActive] = useState(false)
  const [phase, setPhase] = useState<OverlayPhase>('loading')
  const [loadingData, setLoadingData] = useState<object | null>(null)
  const [completeData, setCompleteData] = useState<object | null>(null)
  const [LottieComponent, setLottieComponent] = useState<LottieComponentType | null>(null)
  const completionSequenceStarted = useRef(false)
  const completionDurationMsRef = useRef<number>(1200)

  // Activate overlay if a success flag exists.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const active = readBillingSuccessFlag()
    setIsActive(active)
  }, [])

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
      .catch(() => {})

    void loadingAnimation()
      .then((mod) => {
        if (!alive) return
        const resolved = resolveDefault(mod)
        if (resolved && typeof resolved === 'object') setLoadingData(resolved as object)
      })
      .catch(() => {})

    void completeAnimation()
      .then((mod) => {
        if (!alive) return
        const resolved = resolveDefault(mod)
        if (resolved && typeof resolved === 'object') setCompleteData(resolved as object)
      })
      .catch(() => {})

    return () => {
      alive = false
    }
  }, [isActive, shouldReduceMotion])

  const completeDurationMs = useMemo(() => {
    if (!completeData) return 1200
    return getLottieDurationMs(completeData as AnimationData)
  }, [completeData])

  // Drive the phase machine.
  useEffect(() => {
    if (!isActive) return
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

    // Wait until we have the completion animation loaded so timing is stable.
    if (!completeData) {
      return
    }

    if (completionSequenceStarted.current) {
      return
    }
    completionSequenceStarted.current = true
    completionDurationMsRef.current = completeDurationMs

    // Access granted: run shrink -> complete -> done.
    setPhase('shrink')
    const t1 = window.setTimeout(() => setPhase('complete'), 220)
    const t2 = window.setTimeout(() => setPhase('done'), 220 + completionDurationMsRef.current + 150)
    const t3 = window.setTimeout(() => {
      clearBillingSuccessFlag()
      setIsActive(false)
    }, 220 + completionDurationMsRef.current + 250)

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
          className="w-[min(78vw,520px)] sm:w-[min(60vw,620px)]"
        >
          {phase === 'complete' || phase === 'done' ? (
            canRenderComplete ? (
              <LottieComponent animationData={completeData!} autoplay loop={false} />
            ) : (
              <div className="h-[min(78vw,520px)] sm:h-[min(60vw,620px)]" />
            )
          ) : (
            canRenderLoading ? (
              <LottieComponent animationData={loadingData!} autoplay loop />
            ) : (
              <div className="h-[min(78vw,520px)] sm:h-[min(60vw,620px)]" />
            )
          )}
        </motion.div>
      </div>
    </div>
  )
}


