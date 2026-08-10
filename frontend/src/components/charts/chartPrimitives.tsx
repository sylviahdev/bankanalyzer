import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface TooltipRow {
  label: string
  value: string
  color?: string
}

/** One tooltip shape for every chart in the app. */
export function ChartTooltip({
  title,
  rows,
  footer,
}: {
  title: string
  rows: TooltipRow[]
  footer?: ReactNode
}) {
  return (
    <div className="bg-surface ring-hairline min-w-[10rem] rounded-lg px-3 py-2.5 shadow-lg ring-1">
      <p className="text-ink-primary text-xs font-semibold">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4 text-xs">
            <span className="text-ink-secondary flex items-center gap-1.5">
              {row.color ? (
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: row.color }}
                />
              ) : null}
              {row.label}
            </span>
            <span className="text-ink-primary tabular font-medium">{row.value}</span>
          </li>
        ))}
      </ul>
      {footer ? <div className="text-ink-muted mt-1.5 text-xs">{footer}</div> : null}
    </div>
  )
}

export interface LegendItem {
  label: string
  color: string
  value?: string
}

/** A legend is always present for two or more series — identity is never
 *  carried by colour alone. */
export function ChartLegend({
  items,
  className,
}: {
  items: LegendItem[]
  className?: string
}) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5', className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs">
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 rounded-[3px]"
            style={{ background: item.color }}
          />
          <span className="text-ink-secondary">{item.label}</span>
          {item.value ? (
            <span className="text-ink-primary tabular font-medium">{item.value}</span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

/** Shown in place of a plot when the underlying data cannot support it. */
export function ChartPlaceholder({ children }: { children: ReactNode }) {
  return (
    <div className="text-ink-secondary flex h-[16rem] items-center justify-center rounded-lg border border-dashed border-[color:var(--color-grid)] px-6 text-center text-sm">
      {children}
    </div>
  )
}
