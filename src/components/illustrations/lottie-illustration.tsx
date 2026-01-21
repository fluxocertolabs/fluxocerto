import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

type AnimationModule = { default: object } | object
type LottieComponentType = React.ComponentType<{
  animationData: object
  loop?: boolean | number
  autoplay?: boolean
}>

interface LottieIllustrationProps {
  animationLoader: () => Promise<AnimationModule>
  className?: string
  loop?: boolean
  autoplay?: boolean
  staticFallback?: React.ReactNode
  ariaLabel?: string
}

export function LottieIllustration({
  animationLoader,
  className,
  loop = true,
  autoplay = true,
  staticFallback,
  ariaLabel,
}: LottieIllustrationProps) {
  const shouldReduceMotion = useReducedMotion()
  const [animationData, setAnimationData] = useState<object | null>(null)
  const [LottieComponent, setLottieComponent] = useState<LottieComponentType | null>(null)
  const [hasLoadError, setHasLoadError] = useState(false)
  const [hasComponentError, setHasComponentError] = useState(false)

  useEffect(() => {
    if (shouldReduceMotion) return
    if (hasLoadError) return

    let isActive = true
    void animationLoader()
      .then((module) => {
        if (!isActive) return
        const resolved = 'default' in module ? module.default : module
        setAnimationData(resolved)
      })
      .catch(() => {
        if (!isActive) return
        setHasLoadError(true)
      })

    return () => {
      isActive = false
    }
  }, [animationLoader, shouldReduceMotion, hasLoadError])

  useEffect(() => {
    if (shouldReduceMotion) return
    if (!animationData) return
    if (LottieComponent) return
    if (hasComponentError) return

    let isActive = true
    void import('lottie-react')
      .then((mod) => {
        if (!isActive) return
        setLottieComponent(() => mod.default as unknown as LottieComponentType)
      })
      .catch(() => {
        if (!isActive) return
        setHasComponentError(true)
      })

    return () => {
      isActive = false
    }
  }, [shouldReduceMotion, animationData, LottieComponent, hasComponentError])

  if (shouldReduceMotion) {
    return (
      <div
        className={cn('flex items-center justify-center', className)}
        role={ariaLabel ? 'img' : 'presentation'}
        aria-label={ariaLabel}
        aria-hidden={ariaLabel ? undefined : true}
      >
        {staticFallback ?? null}
      </div>
    )
  }

  if ((hasLoadError || hasComponentError) && staticFallback) {
    return (
      <div
        className={cn('flex items-center justify-center', className)}
        role={ariaLabel ? 'img' : 'presentation'}
        aria-label={ariaLabel}
        aria-hidden={ariaLabel ? undefined : true}
      >
        {staticFallback}
      </div>
    )
  }

  if (!animationData) {
    return (
      <div
        className={cn('flex items-center justify-center', className)}
        role="presentation"
        aria-hidden="true"
      />
    )
  }

  if (!LottieComponent) {
    return (
      <div
        className={cn('flex items-center justify-center', className)}
        role="presentation"
        aria-hidden="true"
      />
    )
  }

  return (
    <div
      className={cn('flex items-center justify-center', className)}
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <LottieComponent
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
      />
    </div>
  )
}

