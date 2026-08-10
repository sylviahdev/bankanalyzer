import { api } from './client'
import type { AnalyticsSummary } from '@/types/api'

/**
 * GET /api/analytics/summary — totals, per-category breakdown, monthly series,
 * top expenses and recent activity, all aggregated in SQL by the backend.
 * Pass a statementId to scope the figures to a single upload.
 */
export async function getSummary(
  statementId?: number,
  signal?: AbortSignal,
): Promise<AnalyticsSummary> {
  const { data } = await api.get<AnalyticsSummary>('/api/analytics/summary', {
    params: statementId ? { statement_id: statementId } : undefined,
    signal,
  })
  return data
}
