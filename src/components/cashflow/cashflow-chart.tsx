/**
 * CashflowChart - Main chart component for 30-day cashflow projection.
 * Displays optimistic and pessimistic scenarios with area fills.
 */

import { useState, useCallback } from 'react'
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'
import { cn } from '@/lib/utils'
import { formatChartCurrency } from '@/lib/format'
import type { ChartDataPoint, DangerRange, LineVisibility } from './types'
import { DEFAULT_LINE_VISIBILITY } from './types'
import { ChartTooltip } from './chart-tooltip'
import { ChartLegend } from './chart-legend'
import { useThemeStore } from '@/stores/theme-store'

// Color constants from spec
const COLORS = {
  optimistic: '#22c55e', // green-500
  pessimistic: '#f59e0b', // amber-500
  investmentInclusive: '#06b6d4', // cyan-500
  danger: '#ef4444', // red-500
} as const

// Axis tick colors per theme (muted-foreground equivalent)
const AXIS_COLORS = {
  light: 'hsl(0 0% 45.1%)', // --muted-foreground light
  dark: 'hsl(240 5% 64.9%)', // --muted-foreground dark
} as const

interface CashflowChartProps {
  chartData: ChartDataPoint[]
  dangerRanges: DangerRange[]
  /** Optional callback to observe legend visibility toggles (used by Dashboard for scenario-specific UI) */
  onVisibilityChange?: (visibility: LineVisibility) => void
}

export function CashflowChart({ chartData, dangerRanges, onVisibilityChange }: CashflowChartProps) {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme)
  const axisColor = AXIS_COLORS[resolvedTheme]

  // Visibility state for interactive legend toggle
  const [visibility, setVisibility] = useState<LineVisibility>(DEFAULT_LINE_VISIBILITY)

  const handleToggle = useCallback((key: keyof LineVisibility) => {
    setVisibility((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      onVisibilityChange?.(next)
      return next
    })
  }, [onVisibilityChange])

  // Calculate appropriate Y-axis domain with padding
  // Handle empty data case with sensible defaults
  // Include investmentInclusiveBalance for fixed scale (FR-010)
  const balances = chartData.flatMap((d) => [
    d.optimisticBalance,
    d.pessimisticBalance,
    d.investmentInclusiveBalance,
  ])
  const minBalance = balances.length > 0 ? Math.min(...balances, 0) : 0
  const maxBalance = balances.length > 0 ? Math.max(...balances) : 1000
  const padding = (maxBalance - minBalance) * 0.1 || 100
  const yMin = Math.floor(minBalance - padding)
  const yMax = Math.ceil(maxBalance + padding)

  // Calculate X-axis interval based on data length for mobile responsiveness
  const xAxisInterval = chartData.length > 15 ? Math.floor(chartData.length / 7) : 0

  return (
    <div data-testid="cashflow-chart" className={cn('rounded-xl border border-border bg-card p-4')}>
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Projeção de Fluxo de Caixa
      </h2>

      <div className="h-[300px] md:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            {/* Gradient definitions for area fills */}
            <defs>
              <linearGradient id="gradientOptimistic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.optimistic} stopOpacity={0.4} />
                <stop offset="95%" stopColor={COLORS.optimistic} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradientPessimistic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.pessimistic} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.pessimistic} stopOpacity={0.05} />
              </linearGradient>
            </defs>

            {/* Axes */}
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: axisColor, fontSize: 12 }}
              interval={xAxisInterval}
              dy={10}
            />
            <YAxis
              tickFormatter={formatChartCurrency}
              axisLine={false}
              tickLine={false}
              tick={{ fill: axisColor, fontSize: 12 }}
              width={60}
              domain={[yMin, yMax]}
            />

            {/* Custom tooltip with visibility filtering */}
            <Tooltip
              content={<ChartTooltip visibility={visibility} />}
              cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
            />

            {/* Zero balance reference line - conditional visibility with fade */}
            <ReferenceLine
              y={0}
              stroke={COLORS.danger}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              strokeOpacity={visibility.dangerZone ? 1 : 0}
              style={{ transition: 'opacity 150ms' }}
            />

            {/* Danger day ranges - conditional visibility with fade */}
            {dangerRanges.map((range, index) => (
              <ReferenceArea
                key={`danger-${index}`}
                x1={range.start}
                x2={range.end}
                fill={COLORS.danger}
                fillOpacity={visibility.dangerZone ? (range.scenario === 'both' ? 0.15 : 0.1) : 0}
                strokeOpacity={0}
                style={{ transition: 'opacity 150ms' }}
              />
            ))}

            {/* Pessimistic area (rendered first, behind optimistic) - conditional visibility with fade */}
            <Area
              type="monotone"
              dataKey="pessimisticBalance"
              stroke={COLORS.pessimistic}
              strokeWidth={2}
              fill="url(#gradientPessimistic)"
              fillOpacity={visibility.pessimistic ? 0.3 : 0}
              strokeOpacity={visibility.pessimistic ? 1 : 0}
              dot={false}
              activeDot={visibility.pessimistic ? {
                r: 6,
                stroke: COLORS.pessimistic,
                strokeWidth: 2,
                fill: 'hsl(var(--card))',
              } : false}
              name="Pessimista"
              style={{ transition: 'opacity 150ms' }}
            />

            {/* Optimistic area (rendered on top) - conditional visibility with fade */}
            <Area
              type="monotone"
              dataKey="optimisticBalance"
              stroke={COLORS.optimistic}
              strokeWidth={2}
              fill="url(#gradientOptimistic)"
              fillOpacity={visibility.optimistic ? 0.4 : 0}
              strokeOpacity={visibility.optimistic ? 1 : 0}
              dot={false}
              activeDot={visibility.optimistic ? {
                r: 6,
                stroke: COLORS.optimistic,
                strokeWidth: 2,
                fill: 'hsl(var(--card))',
              } : false}
              name="Otimista"
              style={{ transition: 'opacity 150ms' }}
            />

            {/* Investment-inclusive line (stroke-only, no fill) - conditional visibility with fade */}
            <Line
              type="monotone"
              dataKey="investmentInclusiveBalance"
              stroke={COLORS.investmentInclusive}
              strokeWidth={2}
              strokeOpacity={visibility.investmentInclusive ? 1 : 0}
              dot={false}
              activeDot={visibility.investmentInclusive ? {
                r: 6,
                stroke: COLORS.investmentInclusive,
                strokeWidth: 2,
                fill: 'hsl(var(--card))',
              } : false}
              name="Saldo com Investimentos"
              style={{ transition: 'opacity 150ms' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive legend */}
      <ChartLegend visibility={visibility} onToggle={handleToggle} />
    </div>
  )
}

