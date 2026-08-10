import { memo } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import type { Transaction, TransactionQuery } from '@/types/api'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'

type SortKey = NonNullable<TransactionQuery['sort']>

export interface TransactionTableProps {
  transactions: Transaction[]
  colorFor?: (category: string) => string
  /** Omit to render a static, non-sortable table (the dashboard's recent list). */
  sort?: SortKey
  order?: 'asc' | 'desc'
  onSortChange?: (key: SortKey) => void
  /** Dims the rows while a new page/filter is loading, without unmounting them. */
  busy?: boolean
}

const COLUMNS: { key: SortKey; label: string; align?: 'right'; sortable: boolean }[] = [
  { key: 'date', label: 'Date', sortable: true },
  { key: 'description', label: 'Description', sortable: true },
  { key: 'category', label: 'Category', sortable: true },
  { key: 'amount', label: 'Amount', align: 'right', sortable: true },
]

function SortIcon({ active, order }: { active: boolean; order: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown className="size-3.5 opacity-40" aria-hidden="true" />
  return order === 'asc' ? (
    <ArrowUp className="size-3.5" aria-hidden="true" />
  ) : (
    <ArrowDown className="size-3.5" aria-hidden="true" />
  )
}

function AmountCell({ transaction }: { transaction: Transaction }) {
  const isIncome = transaction.type === 'income'
  return (
    <span
      className={cn(
        'tabular font-medium',
        isIncome ? 'text-positive' : 'text-ink-primary',
      )}
    >
      {formatCurrency(transaction.amount)}
    </span>
  )
}

function CategoryCell({
  category,
  colorFor,
}: {
  category: string
  colorFor?: (category: string) => string
}) {
  return (
    <span className="text-ink-secondary inline-flex items-center gap-2 text-sm">
      {colorFor ? (
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full"
          style={{ background: colorFor(category) }}
        />
      ) : null}
      {category}
    </span>
  )
}

export const TransactionTable = memo(function TransactionTable({
  transactions,
  colorFor,
  sort,
  order = 'desc',
  onSortChange,
  busy = false,
}: TransactionTableProps) {
  const sortable = Boolean(onSortChange)

  return (
    <>
      {/* Desktop / tablet: a real table, scrolling horizontally only if it must. */}
      <div className={cn('hidden overflow-x-auto transition-opacity sm:block', busy && 'opacity-55')}>
        <table className="w-full min-w-[38rem] border-collapse text-left">
          <caption className="sr-only">Transactions</caption>
          <thead>
            <tr className="border-hairline border-b">
              {COLUMNS.map((column) => {
                const isActive = sort === column.key
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      isActive ? (order === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={cn(
                      'text-ink-muted px-5 py-3 text-xs font-medium tracking-wide uppercase sm:px-6',
                      column.align === 'right' && 'text-right',
                    )}
                  >
                    {sortable && column.sortable ? (
                      <button
                        type="button"
                        onClick={() => onSortChange?.(column.key)}
                        className={cn(
                          'hover:text-ink-primary inline-flex items-center gap-1.5 transition-colors',
                          isActive && 'text-ink-primary',
                          column.align === 'right' && 'flex-row-reverse',
                        )}
                      >
                        {column.label}
                        <SortIcon active={isActive} order={order} />
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                )
              })}
              <th scope="col" className="text-ink-muted px-5 py-3 text-xs font-medium tracking-wide uppercase sm:px-6">
                Type
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr
                key={transaction.id}
                className="border-hairline hover:bg-canvas border-b last:border-0 transition-colors"
              >
                <td className="text-ink-secondary tabular px-5 py-3.5 text-sm whitespace-nowrap sm:px-6">
                  {formatDate(transaction.date)}
                </td>
                <td className="text-ink-primary max-w-[22rem] truncate px-5 py-3.5 text-sm sm:px-6">
                  {transaction.description || '—'}
                </td>
                <td className="px-5 py-3.5 sm:px-6">
                  <CategoryCell category={transaction.category} colorFor={colorFor} />
                </td>
                <td className="px-5 py-3.5 text-right text-sm whitespace-nowrap sm:px-6">
                  <AmountCell transaction={transaction} />
                </td>
                <td className="px-5 py-3.5 sm:px-6">
                  <Badge tone={transaction.type === 'income' ? 'income' : 'expense'}>
                    {transaction.type === 'income' ? 'Income' : 'Expense'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards, because a five-column table cannot survive 375px. */}
      <ul className={cn('divide-hairline divide-y transition-opacity sm:hidden', busy && 'opacity-55')}>
        {transactions.map((transaction) => (
          <li key={transaction.id} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-ink-primary truncate text-sm font-medium">
                  {transaction.description || '—'}
                </p>
                <p className="text-ink-muted mt-1 text-xs">
                  {formatDate(transaction.date)}
                </p>
              </div>
              <AmountCell transaction={transaction} />
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <CategoryCell category={transaction.category} colorFor={colorFor} />
              <Badge tone={transaction.type === 'income' ? 'income' : 'expense'}>
                {transaction.type === 'income' ? 'Income' : 'Expense'}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
})
