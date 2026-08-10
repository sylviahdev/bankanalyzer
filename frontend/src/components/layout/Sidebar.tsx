import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Logo } from './Logo'
import { NAV_ITEMS } from './navigation'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/utils/cn'

export interface SidebarProps {
  /** Called after a nav item is chosen, so the mobile drawer can close itself. */
  onNavigate?: () => void
  onLogout: () => void
  loggingOut: boolean
}

export function Sidebar({ onNavigate, onLogout, loggingOut }: SidebarProps) {
  const { user } = useAuth()

  return (
    <div className="bg-surface flex h-full flex-col">
      <div className="border-hairline flex h-16 items-center border-b px-5">
        <Logo />
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-secondary hover:bg-canvas hover:text-ink-primary',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn('size-[18px] shrink-0', isActive && 'text-brand-600')}
                  aria-hidden="true"
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-hairline border-t p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <span
            className="bg-brand-100 text-brand-800 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase"
            aria-hidden="true"
          >
            {user?.username.slice(0, 2) ?? '—'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-ink-primary truncate text-sm font-medium">
              {user?.username ?? 'Signed in'}
            </p>
            <p className="text-ink-muted text-xs">Personal account</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="text-ink-secondary hover:bg-canvas hover:text-ink-primary mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 disabled:opacity-55"
        >
          <LogOut className="size-[18px] shrink-0" aria-hidden="true" />
          {loggingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  )
}
