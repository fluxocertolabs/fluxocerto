import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { BrandSymbol } from '@/components/brand'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LottieIllustration } from '@/components/illustrations/lottie-illustration'
import { cn } from '@/lib/utils'

type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'error'

type StatusIllustration =
  | {
      animationLoader: () => Promise<{ default: object } | object>
      staticFallback?: ReactNode
      ariaLabel?: string
      loop?: boolean
      autoplay?: boolean
      className?: string
    }
  | { node: ReactNode }

export interface StatusScreenProps {
  title: ReactNode
  description?: ReactNode
  tone?: StatusTone
  illustration?: StatusIllustration
  primaryAction?: ReactNode
  secondaryAction?: ReactNode
  footer?: ReactNode
  children?: ReactNode
  className?: string
  cardClassName?: string
}

const TONE_STYLES: Record<
  StatusTone,
  { ring: string; iconBg: string; glow: string; title: string }
> = {
  neutral: {
    ring: 'ring-border/50',
    iconBg: 'bg-muted',
    glow: 'from-muted/0 via-muted/0 to-muted/0',
    title: 'text-foreground',
  },
  info: {
    ring: 'ring-primary/20',
    iconBg: 'bg-primary/10',
    glow: 'from-primary/20 via-primary/10 to-background',
    title: 'text-foreground',
  },
  success: {
    ring: 'ring-emerald-500/20',
    iconBg: 'bg-emerald-500/10',
    glow: 'from-emerald-500/20 via-emerald-500/10 to-background',
    title: 'text-foreground',
  },
  warning: {
    ring: 'ring-amber-500/25',
    iconBg: 'bg-amber-500/10',
    glow: 'from-amber-500/20 via-amber-500/10 to-background',
    title: 'text-foreground',
  },
  error: {
    ring: 'ring-destructive/25',
    iconBg: 'bg-destructive/10',
    glow: 'from-destructive/20 via-destructive/10 to-background',
    title: 'text-foreground',
  },
}

export function StatusScreen({
  title,
  description,
  tone = 'neutral',
  illustration,
  primaryAction,
  secondaryAction,
  footer,
  children,
  className,
  cardClassName,
}: StatusScreenProps) {
  const shouldReduceMotion = useReducedMotion()
  const styles = TONE_STYLES[tone]

  const illustrationNode = (() => {
    if (!illustration) {
      return <BrandSymbol className="h-10 w-10 text-foreground" aria-hidden="true" />
    }
    if ('node' in illustration) return illustration.node
    return (
      <LottieIllustration
        animationLoader={illustration.animationLoader}
        staticFallback={
          illustration.staticFallback ?? (
            <BrandSymbol className="h-10 w-10 text-foreground" aria-hidden="true" />
          )
        }
        loop={illustration.loop}
        autoplay={illustration.autoplay}
        className={illustration.className ?? 'h-10 w-10'}
        ariaLabel={illustration.ariaLabel}
      />
    )
  })()

  return (
    <div
      className={cn(
        'min-h-screen bg-background flex items-center justify-center p-4',
        className
      )}
    >
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: 0.38,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="w-full max-w-md"
      >
        <Card
          className={cn(
            'relative overflow-hidden border-border/60 bg-card/80 backdrop-blur',
            'shadow-[0_20px_70px_-45px_rgba(0,0,0,0.55)]',
            'ring-1',
            styles.ring,
            cardClassName
          )}
        >
          {/* ambient glow */}
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-0 opacity-80',
              'bg-[radial-gradient(1200px_circle_at_20%_-10%,var(--tw-gradient-stops))]',
              styles.glow
            )}
          />

          <CardHeader className="text-center relative">
            <div className="flex justify-center mb-4">
              <div
                className={cn(
                  'h-16 w-16 rounded-full ring-1 ring-border/40',
                  'flex items-center justify-center',
                  styles.iconBg
                )}
              >
                {illustrationNode}
              </div>
            </div>
            <CardTitle className={cn('text-xl sm:text-2xl', styles.title)}>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </CardHeader>

          <CardContent className="relative space-y-4">
            {children}

            {(primaryAction || secondaryAction) && (
              <div className="flex flex-col gap-2">
                {primaryAction}
                {secondaryAction}
              </div>
            )}

            {footer ? <div className="pt-2 text-xs text-muted-foreground">{footer}</div> : null}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}


