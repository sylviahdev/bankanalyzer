import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltip } from './chartPrimitives'
import { GRID_STROKE, axisProps, currencyTick } from './chartTheme'
import type { CategoryBreakdown } from '@/types/api'
import { formatCurrency, formatNumber } from '@/utils/format'

/**
 * Spend per category as horizontal bars — the right form when the job is
 * comparing magnitudes rather than reading a part-to-whole share. Colour is
 * identity here (it matches the donut), never a value-ramp on bar length.
 */
export function CategorySpendBars({
  data,
  colorFor,
}: {
  data: CategoryBreakdown[]
  colorFor: (category: string) => string
}) {
  const rows = data
    .filter((row) => row.expense_total > 0)
    .sort((a, b) => b.expense_total - a.expense_total)

  if (rows.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 42)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid horizontal={false} stroke={GRID_STROKE} strokeDasharray="0" strokeWidth={1} />
        <XAxis type="number" {...axisProps} tickFormatter={currencyTick} />
        <YAxis
          type="category"
          dataKey="category"
          {...axisProps}
          width={104}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: 'rgba(11,11,11,0.04)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const row = payload[0].payload as CategoryBreakdown
            return (
              <ChartTooltip
                title={row.category}
                rows={[
                  {
                    label: 'Spent',
                    value: formatCurrency(row.expense_total),
                    color: colorFor(row.category),
                  },
                  { label: 'Transactions', value: formatNumber(row.count) },
                  { label: 'Net', value: formatCurrency(row.total) },
                ]}
              />
            )
          }}
        />
        <Bar dataKey="expense_total" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {rows.map((row) => (
            <Cell key={row.category} fill={colorFor(row.category)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
