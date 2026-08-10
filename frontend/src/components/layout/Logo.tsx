import { cn } from '@/utils/cn'

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'bg-brand-600 flex size-8 shrink-0 items-center justify-center rounded-lg',
        className,
      )}
    >
      <svg viewBox="0 0 20 20" className="size-4" fill="none">
        <path
          d="M3 14.5 7.2 9.3l3.3 3.1L17 4.5"
          stroke="white"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M3 17h14" stroke="white" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="text-ink-primary text-[0.95rem] font-semibold tracking-tight">
        BankAnalyzer
      </span>
    </span>
  )
}
