/**
 * Token persistence.
 *
 * The API sets `supports_credentials=False` and only allows the `Authorization`
 * header (see app.py CORS config), so an httpOnly cookie is not an option — the
 * backend's design requires tokens held by the client. Both the access token
 * and the rotating refresh token are kept here.
 *
 * The access token's expiry is stored alongside it and an expired one is
 * treated as absent, so the interceptor refreshes instead of sending a token
 * the server will reject. Tokens are never rendered, logged, or put in a URL.
 */

const TOKEN_KEY = 'bankanalyzer.token'
const EXPIRY_KEY = 'bankanalyzer.expires_at'
const REFRESH_KEY = 'bankanalyzer.refresh_token'
const REFRESH_EXPIRY_KEY = 'bankanalyzer.refresh_expires_at'

export interface SessionTokens {
  access_token: string
  expires_at: string
  refresh_token: string
  refresh_expires_at: string
}

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    // Private-mode / blocked storage: fall back to an in-memory session.
    return null
  }
}

/** Mirrors localStorage so the app still works when storage is unavailable. */
const memory = new Map<string, string>()

function read(key: string): string | null {
  return memory.get(key) ?? storage()?.getItem(key) ?? null
}

function write(key: string, value: string): void {
  memory.set(key, value)
  storage()?.setItem(key, value)
}

export function saveSession(tokens: SessionTokens): void {
  write(TOKEN_KEY, tokens.access_token)
  write(EXPIRY_KEY, tokens.expires_at)
  write(REFRESH_KEY, tokens.refresh_token)
  write(REFRESH_EXPIRY_KEY, tokens.refresh_expires_at)
}

export function clearSession(): void {
  for (const key of [TOKEN_KEY, EXPIRY_KEY, REFRESH_KEY, REFRESH_EXPIRY_KEY]) {
    memory.delete(key)
    storage()?.removeItem(key)
  }
}

function parseDate(raw: string | null): Date | null {
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

export function expiresAt(): Date | null {
  return parseDate(read(EXPIRY_KEY))
}

/** When the session ends for good if the user stays idle. */
export function refreshExpiresAt(): Date | null {
  return parseDate(read(REFRESH_EXPIRY_KEY))
}

/** The access token, or null if it is missing or already expired. */
export function readToken(): string | null {
  const token = read(TOKEN_KEY)
  if (!token) return null

  const expiry = expiresAt()
  if (expiry && expiry.getTime() <= Date.now()) return null

  return token
}

/** The refresh token, or null if it is missing or past its own expiry. */
export function readRefreshToken(): string | null {
  const token = read(REFRESH_KEY)
  if (!token) return null

  const expiry = refreshExpiresAt()
  if (expiry && expiry.getTime() <= Date.now()) return null

  return token
}

/** True when there is anything worth trying to restore on boot. */
export function hasSession(): boolean {
  return readToken() !== null || readRefreshToken() !== null
}

/** Milliseconds until the session can no longer be renewed. */
export function millisecondsUntilSessionEnd(): number | null {
  const expiry = refreshExpiresAt()
  if (!expiry) return null
  return expiry.getTime() - Date.now()
}
