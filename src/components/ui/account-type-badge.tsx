import { cn } from '@/lib/utils'
import type { AccountType } from '@/components/quick-update/types'

export type { AccountType }

interface AccountTypeBadgeProps {
  type: AccountType | undefined | null
  className?: string
}

const TYPE_CONFIG: Record<AccountType, { label: string; icon: string; colors: string }> = {
  checking: {
    label: 'Corrente',
    icon: '🏦',
    colors: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  savings: {
    label: 'Poupança',
    icon: '💰',
    colors: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  investment: {
    label: 'Investimento',
    icon: '📈',
    colors: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
}

export function AccountTypeBadge({ type, className }: AccountTypeBadgeProps) {
  if (!type) return null

  const config = TYPE_CONFIG[type]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium',
        config.colors,
        className
      )}
      aria-label={`Tipo: ${config.label}`}
    >
      <span className="text-[10px]" aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  )
}

