import type { ReactNode } from 'react'
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/utils/cn'

/** Shimmer placeholder used while a panel's data is in flight. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('bg-canvas animate-pulse rounded-md', className)}
      aria-hidden="true"
    />
  )
}

export function LoadingBlock({ label = 'Loading', rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className={cn('h-4', index === 0 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <div className="bg-canvas text-ink-muted mb-4 flex size-11 items-center justify-center rounded-full">
        {icon ?? <Inbox className="size-5" aria-hidden="true" />}
      </div>
      <p className="text-ink-primary text-sm font-semibold">{title}</p>
      {description ? (
        <p className="text-ink-secondary mt-1 max-w-sm text-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center px-6 py-12 text-center', className)}
    >
      <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-[#fdeceb] text-[#a32c2c]">
        <AlertCircle className="size-5" aria-hidden="true" />
      </div>
      <p className="text-ink-primary text-sm font-semibold">Something went wrong</p>
      <p className="text-ink-secondary mt-1 max-w-sm text-sm">{message}</p>
      {onRetry ? (
        <Button
          variant="secondary"
          size="sm"
          className="mt-5"
          onClick={onRetry}
          icon={<RefreshCw className="size-4" aria-hidden="true" />}
        >
          Try again
        </Button>
      ) : null}
    </div>
  )
}
