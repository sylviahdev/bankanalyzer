import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { hasActiveFilters, type FilterState } from './filterState'

export interface TransactionFiltersProps {
  filters: FilterState
  categories: string[]
  onChange: (next: FilterState) => void
  onReset: () => void
}

export function TransactionFilters({
  filters,
  categories,
  onChange,
  onReset,
}: TransactionFiltersProps) {
  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onChange({ ...filters, [key]: value })

  return (
    <div className="border-hairline space-y-3 border-b px-5 py-4 sm:px-6">
      {/* Filters sit in one row above the table on wide screens, stacking below. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
        <Input
          label="Search descriptions"
          type="search"
          placeholder="Search transactions…"
          leadingIcon={<Search className="size-4" />}
          value={filters.search}
          onChange={(event) => update('search', event.target.value)}
        />

        <Select
          label="Category"
          value={filters.category}
          onChange={(event) => update('category', event.target.value)}
          options={[
            { value: 'all', label: 'All categories' },
            ...categories.map((category) => ({ value: category, label: category })),
          ]}
        />

        <Select
          label="Type"
          value={filters.type}
          onChange={(event) => update('type', event.target.value as FilterState['type'])}
          options={[
            { value: 'all', label: 'All types' },
            { value: 'income', label: 'Income' },
            { value: 'expense', label: 'Expenses' },
          ]}
        />

        <Input
          label="From"
          type="date"
          value={filters.dateFrom}
          max={filters.dateTo || undefined}
          onChange={(event) => update('dateFrom', event.target.value)}
        />

        <Input
          label="To"
          type="date"
          value={filters.dateTo}
          min={filters.dateFrom || undefined}
          onChange={(event) => update('dateTo', event.target.value)}
        />
      </div>

      {hasActiveFilters(filters) ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-ink-muted inline-flex items-center gap-1.5 text-xs">
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
            Filters applied
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            icon={<X className="size-4" aria-hidden="true" />}
          >
            Clear filters
          </Button>
        </div>
      ) : null}
    </div>
  )
}
