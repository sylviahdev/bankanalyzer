import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Receipt, Upload } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/States'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { TransactionTable } from '@/components/transactions/TransactionTable'
import { TransactionFilters } from '@/components/transactions/TransactionFilters'
import {
  EMPTY_FILTERS,
  hasActiveFilters,
  type FilterState,
} from '@/components/transactions/filterState'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useCategoryColors } from '@/hooks/useCategoryColors'
import { transactionService } from '@/services'
import type { TransactionQuery } from '@/types/api'

type SortKey = NonNullable<TransactionQuery['sort']>

const PER_PAGE_OPTIONS = [
  { value: '25', label: '25 per page' },
  { value: '50', label: '50 per page' },
  { value: '100', label: '100 per page' },
]

export function TransactionsPage() {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [sort, setSort] = useState<SortKey>('date')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  // Only the search box needs debouncing — selects and dates fire once.
  const debouncedSearch = useDebouncedValue(filters.search, 350)

  const loadCategories = useCallback(
    (signal: AbortSignal) => transactionService.listCategories(signal),
    [],
  )
  const { data: categories } = useAsync(loadCategories, [])

  const loadTransactions = useCallback(
    (signal: AbortSignal) =>
      transactionService.listTransactions(
        {
          page,
          per_page: perPage,
          sort,
          order,
          q: debouncedSearch || undefined,
          category: filters.category,
          type: filters.type,
          date_from: filters.dateFrom || undefined,
          date_to: filters.dateTo || undefined,
        },
        signal,
      ),
    [
      page,
      perPage,
      sort,
      order,
      debouncedSearch,
      filters.category,
      filters.type,
      filters.dateFrom,
      filters.dateTo,
    ],
  )

  const { data, loading, error, reload } = useAsync(loadTransactions, [loadTransactions])

  // Any change to the result set resets paging — page 7 of a new filter is meaningless.
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setPage(1)
  }, [debouncedSearch, filters.category, filters.type, filters.dateFrom, filters.dateTo, perPage])

  const colorFor = useCategoryColors(categories ?? [])

  function handleSortChange(key: SortKey) {
    if (key === sort) {
      setOrder((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(key)
      setOrder(key === 'description' || key === 'category' ? 'asc' : 'desc')
    }
    setPage(1)
  }

  const filtersActive = hasActiveFilters(filters)
  const transactions = data?.transactions ?? []

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every transaction parsed from the statements you have uploaded."
        action={
          <Link to="/app/upload">
            <Button variant="secondary" icon={<Upload className="size-4" aria-hidden="true" />}>
              Upload statement
            </Button>
          </Link>
        }
      />

      <Card className="overflow-hidden">
        <TransactionFilters
          filters={filters}
          categories={categories ?? []}
          onChange={setFilters}
          onReset={() => setFilters(EMPTY_FILTERS)}
        />

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading && !data ? (
          <div className="px-5 py-8 sm:px-6">
            <LoadingBlock rows={8} label="Loading transactions" />
          </div>
        ) : transactions.length === 0 ? (
          filtersActive ? (
            <EmptyState
              title="No matching transactions"
              description="No transactions match the filters you have applied. Try widening the date range or clearing a filter."
              action={
                <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Receipt className="size-5" aria-hidden="true" />}
              title="No transactions yet"
              description="Upload a bank statement to start analysing your finances."
              action={
                <Link to="/app/upload">
                  <Button icon={<Upload className="size-4" aria-hidden="true" />}>
                    Upload a statement
                  </Button>
                </Link>
              }
            />
          )
        ) : (
          <>
            <div className="border-hairline flex items-center justify-between gap-3 border-b px-5 py-2.5 sm:px-6">
              <p className="text-ink-muted text-xs" role="status" aria-live="polite">
                {loading ? 'Updating…' : `${data?.total ?? 0} matching transactions`}
              </p>
              <div className="w-36">
                <Select
                  label="Rows per page"
                  hideLabel
                  className="h-8 text-xs"
                  value={String(perPage)}
                  onChange={(event) => setPerPage(Number(event.target.value))}
                  options={PER_PAGE_OPTIONS}
                />
              </div>
            </div>

            <TransactionTable
              transactions={transactions}
              colorFor={colorFor}
              sort={sort}
              order={order}
              onSortChange={handleSortChange}
              busy={loading}
            />

            {data ? (
              <Pagination
                page={data.page}
                totalPages={data.total_pages}
                total={data.total}
                perPage={data.per_page}
                hasPrev={data.has_prev}
                hasNext={data.has_next}
                onPageChange={setPage}
                disabled={loading}
              />
            ) : null}
          </>
        )}
      </Card>
    </>
  )
}
