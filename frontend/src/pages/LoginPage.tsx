import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/hooks/useAuth'
import { errorMessage, isApiError } from '@/services'

interface LocationState {
  from?: string
  registered?: boolean
}

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state ?? {}) as LocationState

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)

    if (!username.trim() || !password) {
      setFormError('Enter your username and password.')
      return
    }

    setSubmitting(true)
    try {
      await login(username, password)
      navigate(state.from ?? '/app/dashboard', { replace: true })
    } catch (cause) {
      // 401 from this endpoint always means bad credentials — the backend does
      // not distinguish "no such user" from "wrong password", and neither do we.
      if (isApiError(cause) && cause.status === 401) {
        setFormError('Incorrect username or password.')
      } else if (isApiError(cause) && cause.status === 429) {
        setFormError('Too many sign-in attempts. Please wait a minute and try again.')
      } else {
        setFormError(errorMessage(cause))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back. Enter your details to reach your dashboard."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-brand-600 hover:text-brand-700 font-medium">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {state.registered ? (
          <Alert tone="success" title="Account ready">
            Sign in with the username and password you just chose.
          </Alert>
        ) : null}

        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <Input
          label="Username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="your.username"
          leadingIcon={<User className="size-4" />}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          disabled={submitting}
          required
        />

        <Input
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••••••"
          leadingIcon={<Lock className="size-4" />}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={submitting}
          required
          trailingSlot={
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="text-ink-muted hover:text-ink-primary rounded-md p-2 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          }
        />

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
