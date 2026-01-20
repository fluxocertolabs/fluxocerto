import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import {
  motionTransitions,
  pageMotionVariants,
  pageReducedMotionVariants,
} from '@/lib/motion'

interface AnimatedOutletProps {
  className?: string
}

export function AnimatedOutlet({ className }: AnimatedOutletProps) {
  const location = useLocation()
  const shouldReduceMotion = useReducedMotion()
  const variants = shouldReduceMotion ? pageReducedMotionVariants : pageMotionVariants

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        className={cn('relative', className)}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={motionTransitions.page}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  )
}

