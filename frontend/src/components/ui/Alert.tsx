import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

type Tone = 'info' | 'success' | 'warning' | 'error'

const TONES: Record<Tone, { wrapper: string; icon: ReactNode }> = {
  info: {
    wrapper: 'bg-brand-50 text-brand-900 ring-brand-200',
    icon: <Info className="size-4 shrink-0" aria-hidden="true" />,
  },
  success: {
    wrapper: 'bg-[#eaf6ea] text-[#0b4d0b] ring-[#bfe3bf]',
    icon: <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />,
  },
  warning: {
    wrapper: 'bg-[#fdf4e0] text-[#6b4a05] ring-[#f4dda4]',
    icon: <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />,
  },
  error: {
    wrapper: 'bg-[#fdeceb] text-[#8c2020] ring-[#f4c4c3]',
    icon: <XCircle className="size-4 shrink-0" aria-hidden="true" />,
  },
}

/**
 * Status is never carried by colour alone — every tone ships an icon plus its
 * text, per the accessibility rule for status palettes.
 */
export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: Tone
  title?: string
  children?: ReactNode
  className?: string
}) {
  const { wrapper, icon } = TONES[tone]

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-2.5 rounded-lg px-3.5 py-3 text-sm ring-1 ring-inset', wrapper, className)}
    >
      <span className="mt-0.5">{icon}</span>
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && 'mt-0.5')}>{children}</div> : null}
      </div>
    </div>
  )
}
