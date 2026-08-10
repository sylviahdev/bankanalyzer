import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltip } from './chartPrimitives'
import { AXIS_STROKE, GRID_STROKE, axisProps, currencyTick } from './chartTheme'
import type { MonthlyPoint } from '@/types/api'
import { INCOME_COLOR } from '@/utils/palette'
import { formatCurrency, formatMonth } from '@/utils/format'

/**
 * Net position month over month. A single series, so no legend box — the card
 * title already names what is plotted.
 */
export function NetTrendChart({ data }: { data: MonthlyPoint[] }) {
  const rows = data.map((point) => ({ ...point, label: formatMonth(point.month) }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
            {/* A wash, not a saturated block. */}
            <stop offset="0%" stopColor={INCOME_COLOR} stopOpacity={0.16} />
            <stop offset="100%" stopColor={INCOME_COLOR} stopOpacity={0.01} />
          </linearGradient>
        </defs>

        <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="0" strokeWidth={1} />
        <XAxis dataKey="label" {...axisProps} stroke={AXIS_STROKE} />
        <YAxis {...axisProps} tickFormatter={currencyTick} width={64} />
        <ReferenceLine y={0} stroke={AXIS_STROKE} strokeWidth={1} />

        <Tooltip
          cursor={{ stroke: AXIS_STROKE, strokeWidth: 1 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const point = payload[0].payload as MonthlyPoint
            return (
              <ChartTooltip
                title={String(label)}
                rows={[
                  { label: 'Net', value: formatCurrency(point.net), color: INCOME_COLOR },
                  { label: 'Income', value: formatCurrency(point.income) },
                  { label: 'Expenses', value: formatCurrency(point.expenses) },
                ]}
              />
            )
          }}
        />

        <Area
          type="monotone"
          dataKey="net"
          stroke={INCOME_COLOR}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="url(#netFill)"
          // ≥8px markers with a 2px surface ring so they stay legible on the line.
          dot={{ r: 4, fill: INCOME_COLOR, stroke: '#ffffff', strokeWidth: 2 }}
          activeDot={{ r: 5.5, fill: INCOME_COLOR, stroke: '#ffffff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
