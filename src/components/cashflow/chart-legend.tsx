/**
 * ChartLegend - Interactive legend with toggle functionality.
 * Clicking items shows/hides corresponding chart elements.
 */

import { cn } from '@/lib/utils'
import type { LineVisibility, LegendItem } from './types'

const LEGEND_ITEMS: LegendItem[] = [
  { key: 'optimistic', label: 'Otimista', color: '#22c55e' },
  { key: 'pessimistic', label: 'Pessimista', color: '#f59e0b' },
  { key: 'investmentInclusive', label: 'Saldo com Investimentos', color: '#06b6d4' },
  { key: 'dangerZone', label: 'Zona de Perigo', color: '#ef4444' },
]

interface ChartLegendProps {
  visibility: LineVisibility
  onToggle: (key: keyof LineVisibility) => void
}

export function ChartLegend({ visibility, onToggle }: ChartLegendProps) {
  return (
    <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-4 text-sm">
      {LEGEND_ITEMS.map((item) => (
        <button
          key={item.key}
          onClick={() => onToggle(item.key)}
          className={cn(
            'flex items-center gap-2 cursor-pointer',
            'transition-opacity duration-150',
            'hover:opacity-80',
            !visibility[item.key] && 'opacity-50'
          )}
          title="Clique para ocultar/mostrar"
        >
          <div
            className={cn(
              'h-3 w-3 rounded-full',
              'transition-opacity duration-150'
            )}
            style={{ backgroundColor: item.color }}
          />
          <span
            className={cn(
              'text-muted-foreground',
              !visibility[item.key] && 'line-through'
            )}
          >
            {item.label}
          </span>
        </button>
      ))}
    </div>
  )
}

