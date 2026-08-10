import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

/** Blocks the app shell until the session check resolves, then redirects
 *  unauthenticated visitors to /login, remembering where they were headed. */
export function ProtectedRoute() {
  const { isAuthenticated, initializing } = useAuth()
  const location = useLocation()

  if (initializing) {
    return (
      <div className="bg-canvas flex min-h-dvh items-center justify-center" role="status">
        <Loader2 className="text-brand-500 size-6 animate-spin" aria-hidden="true" />
        <span className="sr-only">Checking your session…</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

/** The mirror image: keeps signed-in users off the login/register screens. */
export function PublicOnlyRoute() {
  const { isAuthenticated, initializing } = useAuth()

  if (initializing) {
    return (
      <div className="bg-canvas flex min-h-dvh items-center justify-center" role="status">
        <Loader2 className="text-brand-500 size-6 animate-spin" aria-hidden="true" />
        <span className="sr-only">Checking your session…</span>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />
  }

  return <Outlet />
}
