import { api } from './client'
import { clearSession, saveSession } from './tokenStore'
import type { LoginResponse, RegisterResponse, User } from '@/types/api'

export interface Credentials {
  username: string
  password: string
}

/**
 * POST /api/auth/register — always resolves 202 with a neutral message, whether
 * or not the username was taken. That is deliberate on the backend (it refuses
 * to leak account existence), so the UI must not claim the account is new.
 */
export async function register(credentials: Credentials): Promise<RegisterResponse> {
  const { data } = await api.post<RegisterResponse>('/api/auth/register', credentials)
  return data
}

/** POST /api/auth/login — persists the bearer token on success. */
export async function login(credentials: Credentials): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/api/auth/login', credentials)
  saveSession(data.access_token, data.expires_at)
  return data
}

/** GET /api/auth/me */
export async function me(): Promise<User> {
  const { data } = await api.get<User>('/api/auth/me')
  return data
}

/**
 * POST /api/auth/logout — revokes the jti server-side. The local session is
 * cleared regardless, so a network failure can never strand a signed-in UI.
 */
export async function logout(): Promise<void> {
  try {
    await api.post('/api/auth/logout')
  } finally {
    clearSession()
  }
}
