import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'
import { formatNumber } from '@/utils/format'

export interface PaginationProps {
  page: number
  totalPages: number
  total: number
  perPage: number
  hasPrev: boolean
  hasNext: boolean
  onPageChange: (page: number) => void
  disabled?: boolean
}

export function Pagination({
  page,
  totalPages,
  total,
  perPage,
  hasPrev,
  hasNext,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  if (total === 0) return null

  const first = (page - 1) * perPage + 1
  const last = Math.min(page * perPage, total)

  return (
    <nav
      aria-label="Transaction pages"
      className="border-hairline flex flex-col gap-3 border-t px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
    >
      <p className="text-ink-secondary tabular text-sm">
        Showing <span className="text-ink-primary font-medium">{formatNumber(first)}</span>–
        <span className="text-ink-primary font-medium">{formatNumber(last)}</span> of{' '}
        <span className="text-ink-primary font-medium">{formatNumber(total)}</span>
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasPrev || disabled}
          onClick={() => onPageChange(page - 1)}
          icon={<ChevronLeft className="size-4" aria-hidden="true" />}
        >
          Previous
        </Button>
        <span className="text-ink-secondary tabular px-1 text-sm" aria-current="page">
          {page} / {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasNext || disabled}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}
