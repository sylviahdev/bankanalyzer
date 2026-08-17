import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, KeyRound, LogOut, ShieldCheck, Trash2, User } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { LoadingBlock } from '@/components/ui/States'
import { ChangePasswordForm } from '@/components/settings/ChangePasswordForm'
import { DeleteAccountDialog } from '@/components/settings/DeleteAccountDialog'
import { useAuth } from '@/hooks/useAuth'
import { useAsync } from '@/hooks/useAsync'
import { statementService, UNAUTHORIZED_EVENT } from '@/services'
import { refreshExpiresAt } from '@/services/tokenStore'
import { formatDateTime, formatNumber } from '@/utils/format'

export function SettingsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const loadStatements = useCallback(
    (signal: AbortSignal) => {
      void signal
      return statementService.listStatements()
    },
    [],
  )
  const { data: statements, loading } = useAsync(loadStatements, [])

  const sessionExpiry = refreshExpiresAt()

  async function handleLogout() {
    setSigningOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your account details and session controls."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Account information"
              description="Details held for your BankAnalyzer account."
            />
            <CardBody>
              <dl className="divide-hairline divide-y">
                <div className="flex items-center gap-4 py-3.5">
                  <span
                    className="bg-canvas text-ink-secondary flex size-9 shrink-0 items-center justify-center rounded-lg"
                    aria-hidden="true"
                  >
                    <User className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <dt className="text-ink-muted text-xs">Username</dt>
                    <dd className="text-ink-primary mt-0.5 text-sm font-medium">
                      {user?.username ?? '—'}
                    </dd>
                  </div>
                </div>

                <div className="flex items-center gap-4 py-3.5">
                  <span
                    className="bg-canvas text-ink-secondary flex size-9 shrink-0 items-center justify-center rounded-lg"
                    aria-hidden="true"
                  >
                    <CalendarDays className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <dt className="text-ink-muted text-xs">Member since</dt>
                    <dd className="text-ink-primary mt-0.5 text-sm font-medium">
                      {user ? formatDateTime(user.created_at) : '—'}
                    </dd>
                  </div>
                </div>

                <div className="flex items-center gap-4 py-3.5">
                  <span
                    className="bg-canvas text-ink-secondary flex size-9 shrink-0 items-center justify-center rounded-lg"
                    aria-hidden="true"
                  >
                    <ShieldCheck className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <dt className="text-ink-muted text-xs">Account ID</dt>
                    <dd className="text-ink-primary tabular mt-0.5 text-sm font-medium">
                      {user?.id ?? '—'}
                    </dd>
                  </div>
                </div>
              </dl>

              <Alert tone="info" className="mt-4">
                BankAnalyzer identifies accounts by username only — no email address is
                collected or stored.
              </Alert>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Password &amp; security"
              description="How your credentials and session are protected."
            />
            <CardBody>
              <ul className="space-y-3.5">
                {[
                  [
                    'Password storage',
                    'Hashed with bcrypt at cost factor 12. The plaintext password is never stored or logged.',
                  ],
                  [
                    'Session tokens',
                    'Signed JWTs valid for 30 minutes, renewed by a rotating refresh token so you are not signed out mid-task.',
                  ],
                  [
                    'Theft detection',
                    'Each renewal invalidates the previous refresh token. Reusing an old one is treated as theft and ends every session on this account.',
                  ],
                  [
                    'Sign-out revocation',
                    'Signing out denylists your access token and revokes its refresh token, so both stop working immediately.',
                  ],
                ].map(([title, body]) => (
                  <li key={title} className="flex gap-3">
                    <KeyRound
                      className="text-ink-muted mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-ink-primary text-sm font-medium">{title}</p>
                      <p className="text-ink-secondary mt-0.5 text-sm">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="border-hairline mt-6 border-t pt-6">
                <h3 className="text-ink-primary mb-4 text-sm font-semibold">
                  Change password
                </h3>
                <ChangePasswordForm
                  onChanged={() => navigate('/login', { replace: true })}
                />
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Your data" />
            <CardBody>
              {loading && !statements ? (
                <LoadingBlock rows={2} label="Loading your data" />
              ) : (
                <dl className="space-y-3">
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-secondary text-sm">Statements uploaded</dt>
                    <dd className="text-ink-primary tabular text-sm font-semibold">
                      {formatNumber(statements?.length ?? 0)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-secondary text-sm">Transactions stored</dt>
                    <dd className="text-ink-primary tabular text-sm font-semibold">
                      {formatNumber(
                        (statements ?? []).reduce((sum, s) => sum + s.row_count, 0),
                      )}
                    </dd>
                  </div>
                </dl>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Current session" />
            <CardBody>
              <p className="text-ink-secondary text-sm">
                {sessionExpiry
                  ? `Access is renewed automatically while you are using the app. If left idle, this session ends on ${formatDateTime(sessionExpiry.toISOString())}.`
                  : 'Session details are unavailable.'}
              </p>
              <Button
                variant="secondary"
                fullWidth
                className="mt-4"
                loading={signingOut}
                onClick={handleLogout}
                icon={<LogOut className="size-4" aria-hidden="true" />}
              >
                {signingOut ? 'Signing out…' : 'Sign out'}
              </Button>
            </CardBody>
          </Card>

          {/* Destructive actions are visually separated and never one click away. */}
          <Card className="ring-[#f4c4c3]">
            <CardHeader
              title="Danger zone"
              description="Permanent actions that cannot be undone."
            />
            <CardBody>
              <p className="text-ink-secondary text-sm">
                Deleting your account removes your profile, every uploaded statement and
                every transaction parsed from them. This is immediate and irreversible.
              </p>
              <Button
                variant="danger"
                fullWidth
                className="mt-4"
                onClick={() => setDeleteOpen(true)}
                icon={<Trash2 className="size-4" aria-hidden="true" />}
              >
                Delete account
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      <DeleteAccountDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        username={user?.username ?? ''}
        statementCount={statements?.length ?? 0}
        transactionCount={(statements ?? []).reduce((sum, s) => sum + s.row_count, 0)}
        onDeleted={() => {
          setDeleteOpen(false)
          // The account is gone and the service already cleared storage, so
          // calling the logout endpoint would only 401. Tear the session down
          // locally instead — AuthContext listens for this.
          window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
          navigate('/', { replace: true })
        }}
      />
    </>
  )
}
