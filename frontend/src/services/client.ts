import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { ApiErrorBody, TokenResponse } from '@/types/api'
import { clearSession, readRefreshToken, readToken, saveSession } from './tokenStore'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 30_000,
  headers: { Accept: 'application/json' },
})

/**
 * A bare client used only to refresh. It deliberately has no interceptors, so a
 * 401 from the refresh endpoint can never re-enter the refresh path.
 */
const refreshClient: AxiosInstance = axios.create({
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

/** Fired when the session is gone for good, so AuthContext can tear it down. */
export const UNAUTHORIZED_EVENT = 'bankanalyzer:unauthorized'

/** Endpoints where a 401 is a legitimate answer, not an expired session. */
const NO_REFRESH_PATHS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/register']

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = readToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

/*
 * Single-flight refresh.
 *
 * When several requests are in the air and the access token lapses, they all
 * come back 401 at once. Without this, each would fire its own refresh — and
 * because refresh tokens rotate, the second one would present an already-burned
 * token, which the server correctly reads as theft and kills the whole session.
 * So the first 401 starts the refresh and every other 401 awaits that same
 * promise.
 */
let inFlightRefresh: Promise<string> | null = null

function refreshAccessToken(): Promise<string> {
  if (inFlightRefresh) return inFlightRefresh

  inFlightRefresh = (async () => {
    const refreshToken = readRefreshToken()
    if (!refreshToken) throw new Error('no refresh token')

    const { data } = await refreshClient.post<TokenResponse>('/api/auth/refresh', {
      refresh_token: refreshToken,
    })

    saveSession(data)
    return data.access_token
  })()

  // Clear the slot however it settles, so a later 401 can start a fresh attempt.
  void inFlightRefresh.catch(() => undefined).finally(() => {
    inFlightRefresh = null
  })

  return inFlightRefresh
}

function endSession(): void {
  clearSession()
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
}

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

function toApiError(error: AxiosError<ApiErrorBody>): ApiError {
  const status = error.response?.status ?? 0
  const body = error.response?.data
  const serverMessage = typeof body?.error === 'string' ? body.error : undefined
  return new ApiError(messageFor(status, serverMessage), status, body?.correlation_id)
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status ?? 0
    const config = error.config as RetriableConfig | undefined

    const canRetry =
      status === 401 &&
      config !== undefined &&
      // `_retried` is the loop guard: one refresh attempt per request, ever.
      config._retried !== true &&
      !NO_REFRESH_PATHS.some((path) => (config.url ?? '').includes(path))

    if (canRetry) {
      config._retried = true
      try {
        const token = await refreshAccessToken()
        config.headers.set('Authorization', `Bearer ${token}`)
        return await api.request(config)
      } catch {
        // Refresh failed or there was nothing to refresh with — the session is
        // over. The reason is deliberately not surfaced: it is never actionable.
        endSession()
        return Promise.reject(
          new ApiError('Your session has expired. Please sign in again.', 401),
        )
      }
    }

    if (status === 401) {
      endSession()
    }

    return Promise.reject(toApiError(error))
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
