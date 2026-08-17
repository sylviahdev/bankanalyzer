import { useEffect, useState, type FormEvent } from 'react'
import { Lock, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { authService, errorMessage, isApiError } from '@/services'
import { formatNumber } from '@/utils/format'

export interface DeleteAccountDialogProps {
  open: boolean
  onClose: () => void
  username: string
  statementCount: number
  transactionCount: number
  /** Called once the account is gone; the session is already cleared. */
  onDeleted: () => void
}

export function DeleteAccountDialog({
  open,
  onClose,
  username,
  statementCount,
  transactionCount,
  onDeleted,
}: DeleteAccountDialogProps) {
  const [password, setPassword] = useState('')
  const [typedName, setTypedName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Never leave a typed password sitting in state after the dialog closes.
  useEffect(() => {
    if (!open) {
      setPassword('')
      setTypedName('')
      setError(null)
    }
  }, [open])

  // Two independent confirmations: the account password proves identity, and
  // typing the username proves this is deliberate rather than a mis-click.
  const nameMatches = typedName.trim().toLowerCase() === username.toLowerCase()
  const canSubmit = nameMatches && password.length > 0 && !submitting

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setError(null)
    try {
      await authService.deleteAccount(password)
      onDeleted()
    } catch (cause) {
      if (isApiError(cause) && cause.status === 401) {
        setError('That password is incorrect. Your account has not been deleted.')
      } else if (isApiError(cause) && cause.status === 429) {
        setError('Too many attempts. Please wait a while and try again.')
      } else {
        setError(errorMessage(cause))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      tone="danger"
      busy={submitting}
      icon={<Trash2 className="size-5" />}
      title="Delete your account"
      description={
        <>
          This permanently deletes your account,{' '}
          <strong>
            {formatNumber(statementCount)} {statementCount === 1 ? 'statement' : 'statements'}
          </strong>{' '}
          and{' '}
          <strong>{formatNumber(transactionCount)} transactions</strong>. This cannot be
          undone and the data cannot be recovered.
        </>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            form="delete-account-form"
            type="submit"
            loading={submitting}
            disabled={!canSubmit}
            icon={<Trash2 className="size-4" aria-hidden="true" />}
          >
            {submitting ? 'Deleting…' : 'Delete my account'}
          </Button>
        </>
      }
    >
      <form id="delete-account-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {error ? <Alert tone="error">{error}</Alert> : null}

        <Input
          label={`Type your username to confirm`}
          name="confirmUsername"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={username}
          value={typedName}
          onChange={(event) => setTypedName(event.target.value)}
          hint={`Enter “${username}” exactly.`}
          disabled={submitting}
        />

        <Input
          label="Your password"
          name="deletePassword"
          type="password"
          autoComplete="current-password"
          leadingIcon={<Lock className="size-4" />}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={submitting}
        />
      </form>
    </Modal>
  )
}
