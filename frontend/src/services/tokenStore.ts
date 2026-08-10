/**
 * Token persistence.
 *
 * The API sets `supports_credentials=False` and only allows the `Authorization`
 * header (see app.py CORS config), so an httpOnly cookie is not an option — the
 * backend's design requires a bearer token held by the client. We keep it in
 * localStorage so a refresh does not sign the user out, store the expiry
 * alongside it, and treat an expired token as absent so we never send one the
 * server will reject.
 *
 * The token is never rendered, logged, or placed in a URL.
 */

const TOKEN_KEY = 'bankanalyzer.token'
const EXPIRY_KEY = 'bankanalyzer.expires_at'

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    // Private-mode / blocked storage: fall back to an in-memory session.
    return null
  }
}

let memoryToken: string | null = null
let memoryExpiry: string | null = null

export function saveSession(token: string, expiresAt: string): void {
  memoryToken = token
  memoryExpiry = expiresAt
  const store = storage()
  store?.setItem(TOKEN_KEY, token)
  store?.setItem(EXPIRY_KEY, expiresAt)
}

export function clearSession(): void {
  memoryToken = null
  memoryExpiry = null
  const store = storage()
  store?.removeItem(TOKEN_KEY)
  store?.removeItem(EXPIRY_KEY)
}

export function expiresAt(): Date | null {
  const raw = memoryExpiry ?? storage()?.getItem(EXPIRY_KEY) ?? null
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Returns the token, or null if it is missing or already expired. */
export function readToken(): string | null {
  const token = memoryToken ?? storage()?.getItem(TOKEN_KEY) ?? null
  if (!token) return null

  const expiry = expiresAt()
  if (expiry && expiry.getTime() <= Date.now()) {
    clearSession()
    return null
  }

  memoryToken = token
  return token
}

/** Milliseconds until expiry, or null when there is no live session. */
export function millisecondsUntilExpiry(): number | null {
  const expiry = expiresAt()
  if (!expiry) return null
  return expiry.getTime() - Date.now()
}
