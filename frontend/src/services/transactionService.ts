import { api } from './client'
import type { TransactionPage, TransactionQuery } from '@/types/api'

/** Drops empty/"all" values so the request URL stays clean and cacheable. */
function toParams(query: TransactionQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {}

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '' || value === 'all') continue
    params[key] = value as string | number
  }
  return params
}

/** GET /api/transactions — server-side paging, filtering and sorting. */
export async function listTransactions(
  query: TransactionQuery = {},
  signal?: AbortSignal,
): Promise<TransactionPage> {
  const { data } = await api.get<TransactionPage>('/api/transactions', {
    params: toParams(query),
    signal,
  })
  return data
}

/** GET /api/categories — the distinct categories present in the user's data. */
export async function listCategories(signal?: AbortSignal): Promise<string[]> {
  const { data } = await api.get<{ categories: string[] }>('/api/categories', { signal })
  return data.categories
}
