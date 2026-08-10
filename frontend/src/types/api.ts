/**
 * Types mirroring the Flask API exactly. Every shape here corresponds to a
 * response the backend actually returns — see auth.py, analyze.py, transactions.py.
 */

export type TransactionKind = 'income' | 'expense'

/** POST /api/auth/login and POST /api/auth/refresh return the same shape. */
export interface TokenResponse {
  access_token: string
  token_type: string
  expires_at: string
  /** Rotates on every refresh — the previous value is burned server-side. */
  refresh_token: string
  refresh_expires_at: string
}

export type LoginResponse = TokenResponse

/** POST /api/auth/register — the backend always answers 202 with this body. */
export interface RegisterResponse {
  message: string
}

/** POST /api/auth/password */
export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

/** GET /api/auth/me */
export interface User {
  id: number
  username: string
  created_at: string
}

/** GET /api/statements → statements[] */
export interface Statement {
  id: number
  token: string
  filename: string
  row_count: number
  total_income: number
  total_expenses: number
  net_balance: number
  period_start: string | null
  period_end: string | null
  created_at: string
}

/** POST /api/analyze */
export interface AnalyzeResponse {
  token: string
  /** Category → signed total, as produced by the pandas groupby. */
  summary: Record<string, number>
  total_transactions: number
  statement: Statement
}

/** GET /api/transactions → transactions[] */
export interface Transaction {
  id: number
  statement_id: number
  date: string | null
  description: string
  category: string
  amount: number
  type: TransactionKind
}

/** GET /api/transactions */
export interface TransactionPage {
  transactions: Transaction[]
  page: number
  per_page: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export interface TransactionQuery {
  page?: number
  per_page?: number
  category?: string
  type?: TransactionKind | 'all'
  q?: string
  date_from?: string
  date_to?: string
  sort?: 'date' | 'amount' | 'description' | 'category'
  order?: 'asc' | 'desc'
  statement_id?: number
}

/** GET /api/analytics/summary */
export interface AnalyticsTotals {
  income: number
  /** Always a positive magnitude; the backend takes abs(). */
  expenses: number
  net: number
  transaction_count: number
  statement_count: number
}

export interface CategoryBreakdown {
  category: string
  /** Signed net for the category. */
  total: number
  count: number
  /** Positive magnitude of the outflows only. */
  expense_total: number
}

export interface MonthlyPoint {
  /** `YYYY-MM` */
  month: string
  income: number
  expenses: number
  net: number
}

export interface AnalyticsSummary {
  totals: AnalyticsTotals
  by_category: CategoryBreakdown[]
  monthly: MonthlyPoint[]
  top_expenses: Transaction[]
  recent_transactions: Transaction[]
}

/** Every non-2xx response from the API carries this shape. */
export interface ApiErrorBody {
  error: string
  correlation_id?: string
}
