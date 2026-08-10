import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Lock, ShieldCheck, Timer } from 'lucide-react'
import { Logo } from './Logo'

const ASSURANCES = [
  { icon: Lock, text: 'Passwords hashed with bcrypt — never stored in the clear' },
  { icon: Timer, text: 'Sessions expire after 30 minutes of validity' },
  { icon: ShieldCheck, text: 'Every query is scoped to your account alone' },
]

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="bg-canvas min-h-dvh lg:grid lg:grid-cols-[1fr_minmax(0,28rem)]">
      {/* Brand panel — desktop only, so the form owns the whole viewport on mobile. */}
      <aside className="bg-brand-900 relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(70% 60% at 20% 10%, rgba(57,135,229,0.6) 0%, transparent 65%)',
          }}
        />
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-white/15">
              <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden="true">
                <path
                  d="M3 14.5 7.2 9.3l3.3 3.1L17 4.5"
                  stroke="white"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="text-[0.95rem] font-semibold tracking-tight text-white">
              BankAnalyzer
            </span>
          </Link>
        </div>

        <div className="relative max-w-md">
          <p className="text-3xl font-semibold tracking-tight text-balance text-white">
            Understand your money. Make better decisions.
          </p>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            Turn a raw statement export into a clear picture of income, spending and
            trends.
          </p>

          <ul className="mt-10 space-y-3.5">
            {ASSURANCES.map((item) => (
              <li key={item.text} className="flex items-start gap-3 text-sm text-white/70">
                <item.icon className="mt-0.5 size-4 shrink-0 text-white/50" aria-hidden="true" />
                {item.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">
          © {new Date().getFullYear()} BankAnalyzer
        </p>
      </aside>

      <main className="flex min-h-dvh flex-col justify-center px-4 py-10 sm:px-8 lg:min-h-0 lg:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden">
            <Link to="/" className="inline-block">
              <Logo />
            </Link>
          </div>

          <Link
            to="/"
            className="text-ink-secondary hover:text-ink-primary mt-8 hidden items-center gap-1.5 text-sm transition-colors lg:inline-flex"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to home
          </Link>

          <h1 className="text-ink-primary mt-8 text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="text-ink-secondary mt-1.5 text-sm">{subtitle}</p>

          <div className="mt-7">{children}</div>

          <div className="text-ink-secondary mt-6 text-center text-sm">{footer}</div>
        </div>
      </main>
    </div>
  )
}
