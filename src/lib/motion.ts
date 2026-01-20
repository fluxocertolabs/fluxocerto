export const motionTransitions = {
  page: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  ui: { duration: 0.16, ease: [0.2, 0.8, 0.2, 1] },
}

export const pageMotionVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
}

export const pageReducedMotionVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

