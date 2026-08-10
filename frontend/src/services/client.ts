import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { ApiErrorBody } from '@/types/api'
import { clearSession, readToken } from './tokenStore'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 30_000,
  headers: { Accept: 'application/json' },
})

/**
 * A normalized error the UI can render directly. `status` is 0 for transport
 * failures (offline, DNS, CORS rejection, timeout) where no response arrived.
 */
export class ApiError extends Error {
  readonly status: number
  readonly correlationId?: string
  readonly isNetworkError: boolean

  constructor(message: string, status: number, correlationId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.correlationId = correlationId
    this.isNetworkError = status === 0
  }
}

/** Fired when the API rejects our token, so AuthContext can drop the session. */
export const UNAUTHORIZED_EVENT = 'bankanalyzer:unauthorized'

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = readToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

function messageFor(status: number, fromServer?: string): string {
  // The backend sends a useful `error` string for validation failures, so prefer
  // it. Generic transport/server statuses get a friendlier fallback.
  if (fromServer && status !== 500 && status !== 0) return fromServer

  switch (status) {
    case 0:
      return 'Could not reach the server. Check your connection and try again.'
    case 401:
      return 'Your session has expired. Please sign in again.'
    case 403:
      return 'You do not have permission to do that.'
    case 404:
      return 'We could not find what you were looking for.'
    case 413:
      return 'That file is too large. The limit is 5 MB.'
    case 415:
      return 'Unsupported file type. Upload a .csv or .xlsx file.'
    case 422:
      return fromServer ?? 'Some of the information provided was not valid.'
    case 429:
      return 'Too many requests. Please wait a moment and try again.'
    default:
      return status >= 500
        ? 'Something went wrong on our end. Please try again shortly.'
        : (fromServer ?? 'Something went wrong. Please try again.')
  }
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status ?? 0
    const body = error.response?.data
    const serverMessage = typeof body?.error === 'string' ? body.error : undefined

    if (status === 401) {
      // The token is dead — never keep a rejected credential around.
      clearSession()
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
    }

    return Promise.reject(
      new ApiError(messageFor(status, serverMessage), status, body?.correlation_id),
    )
  },
)

/** Narrowing helper so components can branch on status without importing axios. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function errorMessage(error: unknown): string {
  if (isApiError(error)) return error.message
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred.'
}
