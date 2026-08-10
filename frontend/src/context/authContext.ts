import { createContext } from 'react'
import type { User } from '@/types/api'

export interface AuthContextValue {
  user: User | null
  /** True until the initial "do we have a valid session?" check resolves. */
  initializing: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<string>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
