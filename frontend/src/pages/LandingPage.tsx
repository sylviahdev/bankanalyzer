import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  FileSpreadsheet,
  KeyRound,
  LineChart,
  Lock,
  PieChart,
  ScanLine,
  ShieldCheck,
  Tags,
  Timer,
  Wallet,
} from 'lucide-react'
import { Logo, LogoMark } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'

const STEPS = [
  {
    icon: FileSpreadsheet,
    title: 'Upload your statement',
    body: 'Export a .csv or .xlsx from your bank and drop it in. Files are capped at 5 MB and never leave your account.',
  },
  {
    icon: ScanLine,
    title: 'Transactions are categorised',
    body: 'Every row is parsed and classified — income, rent, groceries, transport, bills, subscriptions and more.',
  },
  {
    icon: LineChart,
    title: 'Read the analysis',
    body: 'Totals, category breakdowns and month-by-month trends, ready to explore or export back to a spreadsheet.',
  },
]

const FEATURES = [
  {
    icon: Tags,
    title: 'Automatic categorisation',
    body: 'A keyword classifier sorts each transaction, and any Category column already in your file is used as-is.',
  },
  {
    icon: Wallet,
    title: 'Income and expense split',
    body: 'Inflows and outflows are separated so net position is a fact, not a calculation you do in your head.',
  },
  {
    icon: PieChart,
    title: 'Spending breakdown',
    body: 'See where the money actually goes, ranked by category with share of total spend.',
  },
  {
    icon: BarChart3,
    title: 'Monthly trends',
    body: 'Track income against expenses across every month covered by the statements you upload.',
  },
  {
    icon: Timer,
    title: 'Statement history',
    body: 'Every upload is kept, so you can analyse one statement in isolation or all of them together.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Spreadsheet export',
    body: 'Download a category summary workbook for any statement whenever you need it elsewhere.',
  },
]

const SECURITY = [
  {
    icon: KeyRound,
    title: 'Hardened credentials',
    body: 'Passwords are hashed with bcrypt at cost factor 12. They are never stored, logged or transmitted in the clear.',
  },
  {
    icon: Lock,
    title: 'Short-lived signed sessions',
    body: 'Access tokens are signed JWTs that expire in 30 minutes, and signing out revokes yours immediately server-side.',
  },
  {
    icon: ShieldCheck,
    title: 'Strict isolation',
    body: 'Every query is scoped to your account. Uploads are validated, size-capped and stored per user.',
  },
]

function Section({
  id,
  children,
  className = '',
}: {
  id?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section id={id} className={`px-4 py-16 sm:px-6 lg:px-8 lg:py-24 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description?: string
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-brand-600 text-xs font-semibold tracking-[0.14em] uppercase">
        {eyebrow}
      </p>
      <h2 className="text-ink-primary mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="text-ink-secondary mt-3 text-base leading-relaxed">{description}</p>
      ) : null}
    </div>
  )
}

export function LandingPage() {
  return (
    <div className="bg-surface min-h-dvh">
      <header className="border-hairline sticky top-0 z-40 border-b bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="flex items-center gap-2" aria-label="Account">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <Section className="pt-14 pb-12 lg:pt-24 lg:pb-16">
        <div className="mx-auto max-w-3xl text-center">
          <span className="ring-hairline text-ink-secondary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1">
            <ShieldCheck className="text-brand-600 size-3.5" aria-hidden="true" />
            Private by design — your statements stay in your account
          </span>

          <h1 className="text-ink-primary animate-rise mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
            Understand Your Money. Make Better Decisions.
          </h1>

          <p className="text-ink-secondary animate-rise mx-auto mt-5 max-w-2xl text-base leading-relaxed text-pretty sm:text-lg">
            BankAnalyzer securely analyses your bank statements and turns raw transaction
            data into financial insight — what you earned, where it went, and how the
            pattern changes month over month.
          </p>

          <div className="animate-rise mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register" className="w-full sm:w-auto">
              <Button size="lg" fullWidth icon={<ArrowRight className="size-4 order-2" aria-hidden="true" />}>
                Get started
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" fullWidth>
                Sign in
              </Button>
            </Link>
          </div>

          <p className="text-ink-muted mt-4 text-xs">
            Accepts .csv and .xlsx exports · No card required
          </p>
        </div>

        {/* A structural preview of the product surface — deliberately not fake
            financial figures, which would misrepresent real analysis. */}
        <div className="ring-hairline bg-canvas animate-rise mx-auto mt-14 max-w-4xl rounded-2xl p-2 ring-1 sm:p-3">
          <div className="bg-surface ring-hairline rounded-xl p-5 ring-1 sm:p-6">
            <div className="flex items-center gap-2">
              <LogoMark className="size-6 rounded-md" />
              <span className="text-ink-secondary text-sm font-medium">
                Financial Overview
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {['Total income', 'Total expenses', 'Net balance', 'Transactions'].map(
                (label) => (
                  <div key={label} className="ring-hairline rounded-lg p-3.5 ring-1">
                    <p className="text-ink-muted text-xs">{label}</p>
                    <div className="bg-canvas mt-2.5 h-5 w-4/5 rounded" aria-hidden="true" />
                  </div>
                ),
              )}
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              <div className="ring-hairline rounded-lg p-4 ring-1 lg:col-span-2">
                <p className="text-ink-muted text-xs">Income vs expenses</p>
                <div className="mt-4 flex h-24 items-end gap-2" aria-hidden="true">
                  {[38, 62, 45, 74, 52, 84, 60, 70].map((height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t"
                      style={{
                        height: `${height}%`,
                        background: index % 2 === 0 ? '#2a78d6' : '#e34948',
                        opacity: 0.85,
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="ring-hairline rounded-lg p-4 ring-1">
                <p className="text-ink-muted text-xs">Spending by category</p>
                <div className="mt-3 flex justify-center" aria-hidden="true">
                  <div
                    className="size-24 rounded-full"
                    style={{
                      background:
                        'conic-gradient(#2a78d6 0 34%, #ffffff 34% 35%, #eb6834 35% 58%, #ffffff 58% 59%, #1baf7a 59% 76%, #ffffff 76% 77%, #eda100 77% 90%, #ffffff 90% 91%, #898781 91% 100%)',
                      mask: 'radial-gradient(circle, transparent 56%, black 57%)',
                      WebkitMask: 'radial-gradient(circle, transparent 56%, black 57%)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* How it works */}
      <Section id="how-it-works" className="bg-canvas">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps from spreadsheet to insight"
          description="No bank connection, no credentials shared with anyone. You control exactly which statements are analysed."
        />

        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="bg-surface ring-hairline rounded-[--radius-card] p-6 ring-1"
            >
              <div className="flex items-center gap-3">
                <span className="bg-brand-50 text-brand-700 flex size-9 items-center justify-center rounded-lg">
                  <step.icon className="size-[18px]" aria-hidden="true" />
                </span>
                <span className="text-ink-muted tabular text-xs font-semibold">
                  0{index + 1}
                </span>
              </div>
              <h3 className="text-ink-primary mt-4 text-base font-semibold">{step.title}</h3>
              <p className="text-ink-secondary mt-2 text-sm leading-relaxed">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Features */}
      <Section id="features">
        <SectionHeading
          eyebrow="Key features"
          title="Everything you need to read a statement properly"
          description="Built around the questions people actually ask of their own money."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="ring-hairline hover:ring-brand-200 rounded-[--radius-card] p-6 ring-1 transition-shadow duration-200 hover:shadow-sm"
            >
              <span className="bg-brand-50 text-brand-700 flex size-9 items-center justify-center rounded-lg">
                <feature.icon className="size-[18px]" aria-hidden="true" />
              </span>
              <h3 className="text-ink-primary mt-4 text-base font-semibold">
                {feature.title}
              </h3>
              <p className="text-ink-secondary mt-2 text-sm leading-relaxed">{feature.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Analytics */}
      <Section id="analytics" className="bg-canvas">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-brand-600 text-xs font-semibold tracking-[0.14em] uppercase">
              Financial analytics
            </p>
            <h2 className="text-ink-primary mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              The numbers, and what they mean
            </h2>
            <p className="text-ink-secondary mt-3 text-base leading-relaxed">
              Aggregation happens server-side across every statement you have uploaded,
              so the figures are consistent whether you are looking at one month or a
              year.
            </p>

            <ul className="mt-7 space-y-4">
              {[
                ['Totals that reconcile', 'Income, expenses and net balance derived from the same rows you uploaded.'],
                ['Category ranking', 'Spend per category with share of total and transaction counts.'],
                ['Monthly series', 'Income against expenses for every month your statements cover.'],
                ['Largest expenses', 'The individual transactions doing the most damage, surfaced automatically.'],
              ].map(([title, body]) => (
                <li key={title} className="flex gap-3">
                  <span
                    className="bg-brand-600 mt-2 size-1.5 shrink-0 rounded-full"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-ink-primary text-sm font-medium">{title}</p>
                    <p className="text-ink-secondary mt-0.5 text-sm">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-surface ring-hairline rounded-[--radius-card] p-6 ring-1">
            <p className="text-ink-secondary text-sm font-medium">What a statement becomes</p>
            <div className="mt-5 space-y-3">
              {[
                { label: 'Rows parsed', bar: 100, color: '#2a78d6' },
                { label: 'Categorised', bar: 100, color: '#1baf7a' },
                { label: 'Income identified', bar: 62, color: '#2a78d6' },
                { label: 'Expenses identified', bar: 84, color: '#e34948' },
              ].map((row) => (
                <div key={row.label}>
                  <p className="text-ink-secondary mb-1.5 text-xs">{row.label}</p>
                  <div className="bg-canvas h-2 overflow-hidden rounded-full" aria-hidden="true">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${row.bar}%`, background: row.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-ink-muted mt-5 text-xs">
              Illustrative of the processing pipeline. Your dashboard shows only figures
              derived from your own uploads.
            </p>
          </div>
        </div>
      </Section>

      {/* Security */}
      <Section id="security">
        <SectionHeading
          eyebrow="Security"
          title="Financial data deserves real controls"
          description="BankAnalyzer treats statement data as sensitive by default, not as an afterthought."
        />

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {SECURITY.map((item) => (
            <div
              key={item.title}
              className="ring-hairline rounded-[--radius-card] p-6 ring-1"
            >
              <span className="bg-canvas text-ink-primary flex size-9 items-center justify-center rounded-lg">
                <item.icon className="size-[18px]" aria-hidden="true" />
              </span>
              <h3 className="text-ink-primary mt-4 text-base font-semibold">{item.title}</h3>
              <p className="text-ink-secondary mt-2 text-sm leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section className="pt-0">
        <div className="bg-brand-900 relative overflow-hidden rounded-2xl px-6 py-14 text-center sm:px-12">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-30"
            style={{
              background:
                'radial-gradient(60% 90% at 50% 0%, rgba(57,135,229,0.55) 0%, transparent 70%)',
            }}
          />
          <div className="relative">
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Start reading your statements properly
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-white/75">
              Create an account, upload a statement, and see your first breakdown in under
              a minute.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/register" className="w-full sm:w-auto">
                <Button size="lg" variant="inverse" fullWidth>
                  Create your account
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="inverseOutline" fullWidth>
                  I already have one
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Section>

      <footer className="border-hairline border-t px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Logo />
            <p className="text-ink-muted text-xs">
              Bank statement analysis for people who want the detail.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {[
              ['How it works', '#how-it-works'],
              ['Features', '#features'],
              ['Analytics', '#analytics'],
              ['Security', '#security'],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="text-ink-secondary hover:text-ink-primary text-sm transition-colors"
              >
                {label}
              </a>
            ))}
            <Link
              to="/login"
              className="text-ink-secondary hover:text-ink-primary text-sm transition-colors"
            >
              Sign in
            </Link>
          </nav>
        </div>

        <p className="text-ink-muted mx-auto mt-8 max-w-6xl text-center text-xs sm:text-left">
          © {new Date().getFullYear()} BankAnalyzer. Analysis is informational and is not
          financial advice.
        </p>
      </footer>
    </div>
  )
}
