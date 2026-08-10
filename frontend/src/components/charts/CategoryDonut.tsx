import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartTooltip } from './chartPrimitives'
import type { CategoryBreakdown } from '@/types/api'
import { OTHER_COLOR, OTHER_LABEL, foldCategories } from '@/utils/palette'
import { formatCurrency, formatPercent } from '@/utils/format'

/** Part-to-whole at a glance only — capped at 6 segments, tail folded to "Other". */
const MAX_SLICES = 6

export interface CategoryDonutProps {
  data: CategoryBreakdown[]
  colorFor: (category: string) => string
}

export function CategoryDonut({ data, colorFor }: CategoryDonutProps) {
  const slices = useMemo(() => {
    const spending = data.filter((row) => row.expense_total > 0)
    return foldCategories(
      spending,
      (row) => row.category,
      (row) => row.expense_total,
      MAX_SLICES - 1,
    )
  }, [data])

  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  if (total === 0) return null

  const colorOf = (name: string) => (name === OTHER_LABEL ? OTHER_COLOR : colorFor(name))

  return (
    // Always stacked: this card is often only a third of the grid wide, and a
    // side-by-side legend gets squeezed until the category names truncate away.
    <div className="flex flex-col items-center gap-5">
      <div className="relative w-full max-w-[15rem] shrink-0">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="94%"
              // 2px of surface between segments — the gap does the separating,
              // never a stroke drawn around the mark.
              paddingAngle={1.5}
              stroke="#ffffff"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
            >
              {slices.map((slice) => (
                <Cell key={slice.name} fill={colorOf(slice.name)} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const slice = payload[0].payload as { name: string; value: number }
                return (
                  <ChartTooltip
                    title={slice.name}
                    rows={[
                      {
                        label: 'Spent',
                        value: formatCurrency(slice.value),
                        color: colorOf(slice.name),
                      },
                      {
                        label: 'Share',
                        value: formatPercent((slice.value / total) * 100),
                      },
                    ]}
                  />
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* The hole carries the total, so the donut leads with a number. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-ink-muted text-xs">Total spent</span>
          <span className="text-ink-primary mt-0.5 text-lg font-semibold">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/*
        The three lightest slots sit below 3:1 against the white surface, so the
        relief rule applies: every slice carries a visible label and value here.
      */}
      <ul className="w-full min-w-0 flex-1 space-y-2.5">
        {slices.map((slice) => {
          const share = (slice.value / total) * 100
          return (
            <li key={slice.name} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ background: colorOf(slice.name) }}
              />
              <span className="text-ink-secondary min-w-16 flex-1 truncate text-sm">
                {slice.name}
              </span>
              <span className="text-ink-muted tabular shrink-0 text-right text-xs">
                {formatPercent(share, 0)}
              </span>
              <span className="text-ink-primary tabular shrink-0 text-sm font-medium">
                {formatCurrency(slice.value)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
