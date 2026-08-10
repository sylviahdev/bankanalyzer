import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Logo } from './Logo'
import { useAuth } from '@/hooks/useAuth'

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Close the drawer on route change and lock body scroll while it is open.
  useEffect(() => setDrawerOpen(false), [location.pathname])

  useEffect(() => {
    if (!drawerOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [drawerOpen])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="bg-canvas min-h-dvh">
      <a
        href="#main"
        className="focus:bg-surface focus:ring-hairline sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:ring-1"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="border-hairline fixed inset-y-0 left-0 z-30 hidden w-64 border-r lg:block">
        <Sidebar onLogout={handleLogout} loggingOut={loggingOut} />
      </aside>

      {/* Mobile top bar */}
      <header className="bg-surface border-hairline sticky top-0 z-30 flex h-16 items-center justify-between border-b px-4 lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          className="text-ink-secondary hover:bg-canvas -mr-2 rounded-lg p-2.5"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </header>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setDrawerOpen(false)}
            className="animate-fade absolute inset-0 bg-black/35"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="animate-fade absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] shadow-xl"
          >
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation menu"
              className="text-ink-secondary hover:bg-canvas absolute top-4 right-3 z-10 rounded-lg p-2"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <Sidebar
              onNavigate={() => setDrawerOpen(false)}
              onLogout={handleLogout}
              loggingOut={loggingOut}
            />
          </div>
        </div>
      ) : null}

      <main id="main" className="lg:pl-64">
        <div className="mx-auto max-w-[88rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
