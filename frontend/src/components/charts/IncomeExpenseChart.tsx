import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartLegend, ChartTooltip } from './chartPrimitives'
import { AXIS_STROKE, GRID_STROKE, axisProps, currencyTick } from './chartTheme'
import type { MonthlyPoint } from '@/types/api'
import { EXPENSE_COLOR, INCOME_COLOR } from '@/utils/palette'
import { formatCurrency, formatMonth } from '@/utils/format'

/**
 * Money in vs money out, per month. Two series on ONE axis — both are the same
 * measure in the same unit, so a shared scale is honest. Never a second y-axis.
 */
export function IncomeExpenseChart({ data }: { data: MonthlyPoint[] }) {
  const rows = data.map((point) => ({
    ...point,
    label: formatMonth(point.month),
  }))

  return (
    <div>
      <ChartLegend
        className="mb-3"
        items={[
          { label: 'Income', color: INCOME_COLOR },
          { label: 'Expenses', color: EXPENSE_COLOR },
        ]}
      />

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -12 }} barGap={2}>
          <CartesianGrid
            vertical={false}
            stroke={GRID_STROKE}
            strokeDasharray="0"
            strokeWidth={1}
          />
          <XAxis dataKey="label" {...axisProps} stroke={AXIS_STROKE} />
          <YAxis {...axisProps} tickFormatter={currencyTick} width={64} />
          <Tooltip
            cursor={{ fill: 'rgba(11,11,11,0.04)' }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const point = payload[0].payload as MonthlyPoint
              return (
                <ChartTooltip
                  title={String(label)}
                  rows={[
                    {
                      label: 'Income',
                      value: formatCurrency(point.income),
                      color: INCOME_COLOR,
                    },
                    {
                      label: 'Expenses',
                      value: formatCurrency(point.expenses),
                      color: EXPENSE_COLOR,
                    },
                  ]}
                  footer={`Net ${formatCurrency(point.net)}`}
                />
              )
            }}
          />
          {/* 4px rounded cap, square at the baseline; capped thickness leaves air in the band. */}
          <Bar dataKey="income" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
          <Bar dataKey="expenses" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
