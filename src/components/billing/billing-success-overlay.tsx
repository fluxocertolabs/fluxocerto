import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useLocation } from 'react-router-dom'
import { useBillingStatus } from '@/hooks/use-billing-status'
import { clearBillingSuccessFlag, readBillingSuccessFlag } from '@/components/billing/billing-success-flag'

const loadingAnimation = () => import('@/assets/lottie/loading.json')

type AnimationModule = { default: unknown } | unknown
type LottieComponentType = React.ComponentType<{
  animationData: object
  loop?: boolean | number
  autoplay?: boolean
}>

// Slightly larger than before (but not oversized): 96px.
const LOADING_SIZE = 'w-24 h-24'
const EXIT_ANIMATION_MS = 240

function resolveDefault(module: AnimationModule): unknown {
  return module && typeof module === 'object' && 'default' in module
    ? (module as { default: unknown }).default
    : module
}

type OverlayPhase = 'loading' | 'done'

/**
 * Full-screen overlay shown after returning from Stripe success.
 * - Dims the current page
 * - Shows a looping loading animation while waiting for access
 * - Once access is granted, fades out and disappears
 */
export function BillingSuccessOverlay() {
  const location = useLocation()
  const shouldReduceMotion = useReducedMotion()
  const { hasAccess, refetch } = useBillingStatus()
  const [isActive, setIsActive] = useState(false)
  const [phase, setPhase] = useState<OverlayPhase>('loading')
  const [loadingData, setLoadingData] = useState<object | null>(null)
  const [LottieComponent, setLottieComponent] = useState<LottieComponentType | null>(null)
  const closeSequenceStarted = useRef(false)
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

    return () => {
      alive = false
    }
  }, [isActive, shouldReduceMotion])

  // Drive the phase machine.
  useEffect(() => {
    if (!isActive) {
      wasActiveRef.current = false
      return
    }

    // Reset sequence on re-activation to avoid getting stuck if hasAccess is already true.
    if (!wasActiveRef.current) {
      wasActiveRef.current = true
      closeSequenceStarted.current = false
      setPhase('loading')
    }
    if (!hasAccess) closeSequenceStarted.current = false

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

    if (closeSequenceStarted.current) {
      return
    }
    closeSequenceStarted.current = true

    // Access granted: fade out the overlay, then close.
    setPhase('done')
    const t = window.setTimeout(() => {
      clearBillingSuccessFlag()
      setIsActive(false)
    }, EXIT_ANIMATION_MS)

    return () => {
      window.clearTimeout(t)
    }
  }, [isActive, hasAccess, shouldReduceMotion])

  if (!isActive) return null

  const canRenderLoading = !shouldReduceMotion && !!LottieComponent && !!loadingData

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm">
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={false}
          animate={
            phase === 'done' ? { scale: 0.92, opacity: 0 } : { scale: 1, opacity: 1 }
          }
          transition={{ duration: EXIT_ANIMATION_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
          className={LOADING_SIZE}
        >
          {canRenderLoading ? (
            <LottieComponent animationData={loadingData!} autoplay loop />
          ) : (
            <div className={LOADING_SIZE} />
          )}
        </motion.div>
      </div>
    </div>
  )
}


