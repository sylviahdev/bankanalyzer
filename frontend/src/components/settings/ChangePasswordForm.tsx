import { useMemo, useState, type FormEvent } from 'react'
import { Check, Eye, EyeOff, Lock, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { authService, errorMessage, isApiError } from '@/services'
import { passwordStrength, validatePassword } from '@/utils/validation'
import { cn } from '@/utils/cn'

export interface ChangePasswordFormProps {
  /** Called after a successful change — every session is now invalid. */
  onChanged: () => void
}

export function ChangePasswordForm({ onChanged }: ChangePasswordFormProps) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [visible, setVisible] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const strength = useMemo(() => passwordStrength(next), [next])
  const nextError = touched.next ? validatePassword(next) : null
  const confirmError = touched.confirm && confirm !== next ? 'Passwords do not match' : null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setTouched({ current: true, next: true, confirm: true })
    setError(null)

    if (!current) {
      setError('Enter your current password.')
      return
    }
    const invalid = validatePassword(next)
    if (invalid) {
      setError(invalid)
      return
    }
    if (next !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (next === current) {
      setError('Your new password must be different from your current one.')
      return
    }

    setSubmitting(true)
    try {
      await authService.changePassword(current, next)
      setDone(true)
      setCurrent('')
      setNext('')
      setConfirm('')
      // The server invalidated every session, so the user must sign in again.
      window.setTimeout(onChanged, 2000)
    } catch (cause) {
      if (isApiError(cause) && cause.status === 401) {
        setError('Your current password is incorrect.')
      } else if (isApiError(cause) && cause.status === 429) {
        setError('Too many attempts. Please wait a while and try again.')
      } else {
        setError(errorMessage(cause))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <Alert tone="success" title="Password changed">
        For your security, every device has been signed out. Redirecting you to sign in
        again…
      </Alert>
    )
  }

  const toggle = (
    <button
      type="button"
      onClick={() => setVisible((shown) => !shown)}
      aria-label={visible ? 'Hide passwords' : 'Show passwords'}
      aria-pressed={visible}
      className="text-ink-muted hover:text-ink-primary rounded-md p-2 transition-colors"
    >
      {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
    </button>
  )

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <Input
        label="Current password"
        name="currentPassword"
        type={visible ? 'text' : 'password'}
        autoComplete="current-password"
        leadingIcon={<Lock className="size-4" />}
        value={current}
        onChange={(event) => setCurrent(event.target.value)}
        onBlur={() => setTouched((prev) => ({ ...prev, current: true }))}
        disabled={submitting}
        trailingSlot={toggle}
        required
      />

      <div>
        <Input
          label="New password"
          name="newPassword"
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          leadingIcon={<Lock className="size-4" />}
          value={next}
          onChange={(event) => setNext(event.target.value)}
          onBlur={() => setTouched((prev) => ({ ...prev, next: true }))}
          error={nextError}
          disabled={submitting}
          required
        />

        {next ? (
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
        ) : null}
      </div>

      <Input
        label="Confirm new password"
        name="confirmNewPassword"
        type={visible ? 'text' : 'password'}
        autoComplete="new-password"
        leadingIcon={<Lock className="size-4" />}
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        onBlur={() => setTouched((prev) => ({ ...prev, confirm: true }))}
        error={confirmError}
        disabled={submitting}
        required
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={submitting}>
          {submitting ? 'Updating…' : 'Change password'}
        </Button>
        <p className="text-ink-muted text-xs">
          Changing your password signs you out everywhere.
        </p>
      </div>
    </form>
  )
}
