import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/States'
import { cn } from '@/utils/cn'

export interface StatCardProps {
  label: string
  value: string
  /** Optional supporting line — a count, a period, a derived ratio. */
  detail?: string
  icon: LucideIcon
  /** Colours the value. Reserved for figures where direction genuinely matters. */
  tone?: 'neutral' | 'positive' | 'negative'
  accent?: string
  loading?: boolean
}

const TONES = {
  neutral: 'text-ink-primary',
  positive: 'text-positive',
  negative: 'text-negative',
} as const

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'neutral',
  accent = '#898781',
  loading = false,
}: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-ink-secondary text-sm font-medium">{label}</p>
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${accent}14`, color: accent }}
        >
          <Icon className="size-4" />
        </span>
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-8 w-32" />
      ) : (
        <p className={cn('mt-2.5 text-2xl font-semibold tracking-tight', TONES[tone])}>
          {value}
        </p>
      )}

      {detail && !loading ? (
        <p className="text-ink-muted mt-1 text-xs">{detail}</p>
      ) : null}
    </Card>
  )
}
