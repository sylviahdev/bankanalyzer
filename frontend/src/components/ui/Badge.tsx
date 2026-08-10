import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type Tone = 'neutral' | 'income' | 'expense' | 'brand'

const TONES: Record<Tone, string> = {
  neutral: 'bg-canvas text-ink-secondary ring-hairline',
  income: 'bg-brand-50 text-brand-800 ring-brand-200',
  expense: 'bg-[#fdeceb] text-[#a32c2c] ring-[#f4c4c3]',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
