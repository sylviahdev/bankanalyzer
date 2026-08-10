import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/layout/Logo'

export function NotFoundPage() {
  return (
    <div className="bg-canvas flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo />
      <p className="text-ink-muted tabular mt-10 text-sm font-medium">404</p>
      <h1 className="text-ink-primary mt-2 text-2xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="text-ink-secondary mt-2 max-w-sm text-sm">
        The page you are looking for does not exist or has moved.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/app/dashboard">
          <Button>Go to dashboard</Button>
        </Link>
        <Link to="/">
          <Button variant="secondary">Back to home</Button>
        </Link>
      </div>
    </div>
  )
}
