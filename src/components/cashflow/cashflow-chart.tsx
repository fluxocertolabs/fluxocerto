/**
 * CashflowChart - Main chart component for 30-day cashflow projection.
 * Displays optimistic and pessimistic scenarios with area fills.
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'
import { cn } from '@/lib/utils'
import { formatChartCurrency } from '@/lib/format'
import type { ChartDataPoint, DangerRange } from './types'
import { ChartTooltip } from './chart-tooltip'
import { useThemeStore } from '@/stores/theme-store'

// Color constants from spec
const COLORS = {
  optimistic: '#22c55e', // green-500
  pessimistic: '#f59e0b', // amber-500
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
}

export function CashflowChart({ chartData, dangerRanges }: CashflowChartProps) {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme)
  const axisColor = AXIS_COLORS[resolvedTheme]

  // Calculate appropriate Y-axis domain with padding
  // Handle empty data case with sensible defaults
  const balances = chartData.flatMap((d) => [d.optimisticBalance, d.pessimisticBalance])
  const minBalance = balances.length > 0 ? Math.min(...balances, 0) : 0
  const maxBalance = balances.length > 0 ? Math.max(...balances) : 1000
  const padding = (maxBalance - minBalance) * 0.1 || 100
  const yMin = Math.floor(minBalance - padding)
  const yMax = Math.ceil(maxBalance + padding)

  // Calculate X-axis interval based on data length for mobile responsiveness
  const xAxisInterval = chartData.length > 15 ? Math.floor(chartData.length / 7) : 0

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4')}>
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

            {/* Custom tooltip */}
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
            />

            {/* Zero balance reference line */}
            <ReferenceLine
              y={0}
              stroke={COLORS.danger}
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />

            {/* Danger day ranges */}
            {dangerRanges.map((range, index) => (
              <ReferenceArea
                key={`danger-${index}`}
                x1={range.start}
                x2={range.end}
                fill={COLORS.danger}
                fillOpacity={range.scenario === 'both' ? 0.15 : 0.1}
                strokeOpacity={0}
              />
            ))}

            {/* Pessimistic area (rendered first, behind optimistic) */}
            <Area
              type="monotone"
              dataKey="pessimisticBalance"
              stroke={COLORS.pessimistic}
              strokeWidth={2}
              fill="url(#gradientPessimistic)"
              dot={false}
              activeDot={{
                r: 6,
                stroke: COLORS.pessimistic,
                strokeWidth: 2,
                fill: 'hsl(var(--card))',
              }}
              name="Pessimista"
            />

            {/* Optimistic area (rendered on top) */}
            <Area
              type="monotone"
              dataKey="optimisticBalance"
              stroke={COLORS.optimistic}
              strokeWidth={2}
              fill="url(#gradientOptimistic)"
              dot={false}
              activeDot={{
                r: 6,
                stroke: COLORS.optimistic,
                strokeWidth: 2,
                fill: 'hsl(var(--card))',
              }}
              name="Otimista"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: COLORS.optimistic }}
          />
          <span className="text-muted-foreground">Otimista</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: COLORS.pessimistic }}
          />
          <span className="text-muted-foreground">Pessimista</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: COLORS.danger }}
          />
          <span className="text-muted-foreground">Zona de Perigo</span>
        </div>
      </div>
    </div>
  )
}

