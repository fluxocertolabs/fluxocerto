import { useEffect, useState } from 'react'
import Lottie from 'lottie-react'
import { useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

type AnimationModule = { default: object } | object

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

  useEffect(() => {
    if (shouldReduceMotion && staticFallback) {
      return
    }

    let isActive = true
    void animationLoader().then((module) => {
      if (!isActive) return
      const resolved = 'default' in module ? module.default : module
      setAnimationData(resolved)
    })

    return () => {
      isActive = false
    }
  }, [animationLoader, shouldReduceMotion, staticFallback])

  if (shouldReduceMotion && staticFallback) {
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

  return (
    <div
      className={cn('flex items-center justify-center', className)}
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <Lottie
        animationData={animationData}
        loop={shouldReduceMotion ? false : loop}
        autoplay={shouldReduceMotion ? false : autoplay}
      />
    </div>
  )
}

