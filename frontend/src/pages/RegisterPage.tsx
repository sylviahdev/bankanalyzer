import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Eye, EyeOff, Lock, User, X } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/hooks/useAuth'
import { errorMessage, isApiError } from '@/services'
import {
  passwordStrength,
  validatePassword,
  validateUsername,
} from '@/utils/validation'
import { cn } from '@/utils/cn'

const STRENGTH_STYLES = [
  { bar: 'bg-negative', width: 'w-1/4', text: 'text-negative' },
  { bar: 'bg-[#fab219]', width: 'w-2/4', text: 'text-[#6b4a05]' },
  { bar: 'bg-[#0ca30c]', width: 'w-3/4', text: 'text-positive' },
  { bar: 'bg-positive', width: 'w-full', text: 'text-positive' },
] as const

export function RegisterPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const { register, login } = useAuth()
  const navigate = useNavigate()

  const strength = useMemo(() => passwordStrength(password), [password])

  const usernameError = touched.username ? validateUsername(username) : null
  const passwordError = touched.password ? validatePassword(password) : null
  const confirmError =
    touched.confirm && confirm !== password ? 'Passwords do not match' : null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setTouched({ username: true, password: true, confirm: true })
    setFormError(null)
    setNotice(null)

    const firstError =
      validateUsername(username) ??
      validatePassword(password) ??
      (confirm !== password ? 'Passwords do not match' : null)

    if (firstError) {
      setFormError(firstError)
      return
    }

    setSubmitting(true)
    try {
      await register(username, password)

      // The API answers 202 whether or not the username was free — it refuses to
      // leak account existence. Signing in is what actually confirms the account
      // is ours, so we do that rather than claiming success we cannot verify.
      try {
        await login(username, password)
        navigate('/app/dashboard', { replace: true })
      } catch {
        setNotice(
          'That username may already be taken. Try signing in, or choose a different username.',
        )
      }
    } catch (cause) {
      if (isApiError(cause) && cause.status === 429) {
        setFormError(
          'Too many sign-up attempts from this network. Please try again later.',
        )
      } else {
        setFormError(errorMessage(cause))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const style = STRENGTH_STYLES[strength.score]

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start analysing your statements in a couple of minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError ? <Alert tone="error">{formError}</Alert> : null}
        {notice ? (
          <Alert tone="warning" title="Could not sign you in">
            {notice}{' '}
            <Link to="/login" className="font-medium underline">
              Go to sign in
            </Link>
          </Alert>
        ) : null}

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
          onBlur={() => setTouched((prev) => ({ ...prev, username: true }))}
          error={usernameError}
          hint="3–32 characters. Lowercase letters, digits, and . _ - only."
          disabled={submitting}
          required
        />

        <div>
          <Input
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••••••"
            leadingIcon={<Lock className="size-4" />}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
            error={passwordError}
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

          {password ? (
            <div className="mt-3">
              <div className="flex items-center justify-between gap-3">
                <div className="bg-canvas h-1 flex-1 overflow-hidden rounded-full">
                  <div
                    className={cn('h-full rounded-full transition-all duration-300', style.bar, style.width)}
                  />
                </div>
                <span className={cn('text-xs font-medium', style.text)}>{strength.label}</span>
              </div>

              <ul className="mt-2.5 space-y-1">
                {strength.checks.map((check) => (
                  <li
                    key={check.label}
                    className={cn(
                      'flex items-center gap-1.5 text-xs',
                      check.met ? 'text-positive' : 'text-ink-muted',
                    )}
                  >
                    {check.met ? (
                      <Check className="size-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <X className="size-3.5 shrink-0" aria-hidden="true" />
                    )}
                    {check.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <Input
          label="Confirm password"
          name="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="••••••••••••"
          leadingIcon={<Lock className="size-4" />}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          onBlur={() => setTouched((prev) => ({ ...prev, confirm: true }))}
          error={confirmError}
          disabled={submitting}
          required
        />

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>

        <p className="text-ink-muted text-center text-xs">
          BankAnalyzer identifies you by username. No email address is collected.
        </p>
      </form>
    </AuthLayout>
  )
}
