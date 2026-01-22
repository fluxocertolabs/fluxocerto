import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReducedMotion } from 'motion/react'
import { useBillingStatus } from '@/hooks/use-billing-status'
import { captureEvent } from '@/lib/analytics/posthog'

const completeAnimation = () => import('@/assets/lottie/complete.json')

type AnimationModule = { default: unknown } | unknown
type AnimationData = { fr?: number; ip?: number; op?: number }
type LottieComponentType = React.ComponentType<{
  animationData: object
  loop?: boolean | number
  autoplay?: boolean
}>

function getLottieDurationMs(animationData: AnimationData): number {
  const fr = typeof animationData.fr === 'number' ? animationData.fr : null
  const ip = typeof animationData.ip === 'number' ? animationData.ip : 0
  const op = typeof animationData.op === 'number' ? animationData.op : null
  if (!fr || !op || fr <= 0) return 1800
  const frames = Math.max(0, op - ip)
  return Math.min(10_000, Math.max(600, Math.round((frames / fr) * 1000)))
}

export function BillingSuccessPage() {
  const navigate = useNavigate()
  const { hasAccess, isLoading, subscription, refetch } = useBillingStatus()
  const hasTracked = useRef(false)
  const shouldReduceMotion = useReducedMotion()
  const [animationData, setAnimationData] = useState<object | null>(null)
  const [LottieComponent, setLottieComponent] = useState<LottieComponentType | null>(null)

  useEffect(() => {
    if (!hasTracked.current && !isLoading) {
      hasTracked.current = true
      captureEvent('billing_checkout_returned', {
        result: 'success',
        status: subscription?.status ?? 'unknown',
      })
    }
  }, [isLoading, subscription?.status])

  useEffect(() => {
    if (hasAccess) return
    const interval = window.setInterval(() => {
      refetch()
    }, 3000)
    return () => window.clearInterval(interval)
  }, [hasAccess, refetch])

  // Load Lottie data/component (lazy) for the full-screen celebration overlay.
  useEffect(() => {
    if (shouldReduceMotion) return
    let active = true

    void completeAnimation()
      .then((module: AnimationModule) => {
        if (!active) return
        const resolved = (module && typeof module === 'object' && 'default' in module
          ? (module as { default: unknown }).default
          : module) as unknown
        if (resolved && typeof resolved === 'object') {
          setAnimationData(resolved as object)
        }
      })
      .catch(() => {
        // If the animation fails to load, we'll still navigate once access is granted.
      })

    void import('lottie-react')
      .then((mod) => {
        if (!active) return
        setLottieComponent(() => mod.default as unknown as LottieComponentType)
      })
      .catch(() => {
        // If the component fails to load, we'll still navigate once access is granted.
      })

    return () => {
      active = false
    }
  }, [shouldReduceMotion])

  const shouldAutoNavigate = hasAccess && !shouldReduceMotion

  const durationMs = useMemo(() => {
    if (!animationData) return 1800
    return getLottieDurationMs(animationData as AnimationData)
  }, [animationData])

  useEffect(() => {
    if (!hasAccess) return
    // Reduced motion users shouldn't have to wait through an animation.
    if (shouldReduceMotion) {
      navigate('/', { replace: true })
      return
    }

    // If we couldn't load the animation for any reason, don't block the user.
    if (!animationData || !LottieComponent) {
      navigate('/', { replace: true })
      return
    }

    const timeout = window.setTimeout(() => {
      navigate('/', { replace: true })
    }, durationMs + 150)

    return () => window.clearTimeout(timeout)
  }, [hasAccess, shouldReduceMotion, navigate, animationData, LottieComponent, durationMs])

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center"
      aria-hidden="true"
    >
      <div className="w-[min(78vw,560px)] sm:w-[min(70vw,680px)]">
        {!shouldReduceMotion && animationData && LottieComponent ? (
          <LottieComponent
            key={shouldAutoNavigate ? 'complete' : 'waiting'}
            animationData={animationData}
            autoplay
            loop={!shouldAutoNavigate}
          />
        ) : (
          // In reduced motion (or if animation fails), we keep the screen minimal and
          // immediately redirect once access is confirmed (see effect above).
          <div className="h-40 w-40" />
        )}
      </div>
    </div>
  )
}

