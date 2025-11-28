/**
 * Health Indicator component
 * Displays at-a-glance health status (Good/Warning/Danger) with stale data badge
 */

import { cn } from '@/lib/utils'
import type { HealthStatus } from '@/hooks/use-health-indicator'

interface HealthIndicatorProps {
  /** Current health status */
  status: HealthStatus
  /** Human-readable status message */
  message: string
  /** Whether any data is stale (>30 days old) */
  isStale: boolean
  /** Number of stale entities (for badge display) */
  staleCount: number
  /** Callback when stale data badge is clicked */
  onStaleClick?: () => void
}

const statusConfig = {
  good: {
    label: 'Bom',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-600',
    icon: CheckCircleIcon,
  },
  warning: {
    label: 'Atenção',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-600',
    icon: AlertTriangleIcon,
  },
  danger: {
    label: 'Perigo',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-600',
    icon: AlertCircleIcon,
  },
}

export function HealthIndicator({
  status,
  message,
  isStale,
  staleCount,
  onStaleClick,
}: HealthIndicatorProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        config.bgColor,
        config.borderColor,
        'flex items-center justify-between gap-4'
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn('h-6 w-6 flex-shrink-0', config.textColor)} />
        <div>
          <p className={cn('font-semibold', config.textColor)}>
            {config.label}
          </p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>

      {/* Stale data badge */}
      {isStale && (
        <button
          onClick={onStaleClick}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full',
            'bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/30',
            'text-sm font-medium transition-colors cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-amber-500/50'
          )}
        >
          <ClockIcon className="h-4 w-4" />
          <span>
            {staleCount} {staleCount !== 1 ? 'itens desatualizados' : 'item desatualizado'} - Atualizar agora
          </span>
        </button>
      )}
    </div>
  )
}

// Icons
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  )
}

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

