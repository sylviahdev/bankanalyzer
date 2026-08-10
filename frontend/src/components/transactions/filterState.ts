import type { TransactionKind } from '@/types/api'

export interface FilterState {
  search: string
  category: string
  type: TransactionKind | 'all'
  dateFrom: string
  dateTo: string
}

export const EMPTY_FILTERS: FilterState = {
  search: '',
  category: 'all',
  type: 'all',
  dateFrom: '',
  dateTo: '',
}

export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.search !== '' ||
    filters.category !== 'all' ||
    filters.type !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== ''
  )
}
