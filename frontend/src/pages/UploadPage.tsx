import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  Trash2,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/States'
import { Dropzone } from '@/components/upload/Dropzone'
import { useAsync } from '@/hooks/useAsync'
import { statementService, errorMessage } from '@/services'
import type { AnalyzeResponse } from '@/types/api'
import { formatCurrency, formatDate, formatDateTime, formatFileSize, formatNumber } from '@/utils/format'

/**
 * `sending` reports real XHR upload bytes. Once those bytes are gone the server
 * is parsing and reports nothing, so we switch to an indeterminate `analyzing`
 * state rather than animating a fake percentage.
 */
type Phase = 'idle' | 'sending' | 'analyzing' | 'done' | 'error'

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [downloading, setDownloading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const loadStatements = useCallback(
    (signal: AbortSignal) => {
      void signal
      return statementService.listStatements()
    },
    [],
  )
  const {
    data: statements,
    loading: statementsLoading,
    error: statementsError,
    reload: reloadStatements,
  } = useAsync(loadStatements, [])

  function selectFile(candidate: File) {
    const check = statementService.validateFile(candidate)
    if (!check.ok) {
      setFile(null)
      setResult(null)
      setPhase('error')
      setError(check.error ?? 'That file cannot be uploaded.')
      return
    }
    setFile(candidate)
    setResult(null)
    setError(null)
    setPhase('idle')
    setProgress(0)
  }

  function reset() {
    abortRef.current?.abort()
    abortRef.current = null
    setFile(null)
    setResult(null)
    setError(null)
    setPhase('idle')
    setProgress(0)
  }

  async function handleUpload() {
    if (!file) return

    const controller = new AbortController()
    abortRef.current = controller

    setPhase('sending')
    setProgress(0)
    setError(null)

    try {
      const response = await statementService.uploadStatement(file, {
        signal: controller.signal,
        onProgress: (percent) => {
          setProgress(percent)
          if (percent >= 100) setPhase('analyzing')
        },
      })
      setResult(response)
      setPhase('done')
      reloadStatements()
    } catch (cause) {
      if (controller.signal.aborted) {
        setPhase('idle')
        return
      }
      setPhase('error')
      setError(errorMessage(cause))
    } finally {
      abortRef.current = null
    }
  }

  async function handleDownload(token: string, filename: string) {
    setDownloading(true)
    try {
      await statementService.downloadSummary(token, `${filename.replace(/\.[^.]+$/, '')}-summary.xlsx`)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setDownloading(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      await statementService.deleteStatement(id)
      if (result?.statement.id === id) reset()
      reloadStatements()
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  const busy = phase === 'sending' || phase === 'analyzing'

  return (
    <>
      <PageHeader
        title="Upload Statement"
        description="Add a bank statement export and BankAnalyzer will parse, categorise and analyse every transaction."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {/* Success — real figures returned by the API for this upload. */}
          {phase === 'done' && result ? (
            <Card className="animate-rise">
              <CardHeader
                title="Analysis complete"
                description={`${formatNumber(result.total_transactions)} transactions parsed from ${result.statement.filename}.`}
                action={
                  <Button variant="ghost" size="sm" onClick={reset} icon={<X className="size-4" aria-hidden="true" />}>
                    Upload another
                  </Button>
                }
              />
              <CardBody>
                <Alert tone="success" title="Statement processed">
                  Your dashboard and transactions have been updated with this statement.
                </Alert>

                <dl className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    ['Transactions', formatNumber(result.statement.row_count)],
                    ['Income', formatCurrency(result.statement.total_income)],
                    ['Expenses', formatCurrency(result.statement.total_expenses)],
                    ['Net', formatCurrency(result.statement.net_balance)],
                  ].map(([label, value]) => (
                    <div key={label} className="ring-hairline rounded-lg p-3.5 ring-1">
                      <dt className="text-ink-muted text-xs">{label}</dt>
                      <dd className="text-ink-primary tabular mt-1 text-lg font-semibold">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {result.statement.period_start ? (
                  <p className="text-ink-secondary mt-4 text-sm">
                    Covering {formatDate(result.statement.period_start)} –{' '}
                    {formatDate(result.statement.period_end)}
                  </p>
                ) : (
                  <p className="text-ink-secondary mt-4 text-sm">
                    This file had no Date column, so monthly trends are unavailable for it.
                  </p>
                )}

                <div className="mt-5 border-t border-[color:var(--color-hairline)] pt-5">
                  <p className="text-ink-secondary mb-3 text-sm font-medium">
                    Category totals
                  </p>
                  <ul className="divide-hairline divide-y">
                    {Object.entries(result.summary)
                      .sort(([, a], [, b]) => a - b)
                      .map(([category, total]) => (
                        <li key={category} className="flex items-center justify-between py-2.5">
                          <span className="text-ink-secondary text-sm">{category}</span>
                          <span className="text-ink-primary tabular text-sm font-medium">
                            {formatCurrency(total)}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/app/dashboard">
                    <Button icon={<ArrowUpRight className="size-4 order-2" aria-hidden="true" />}>
                      View dashboard
                    </Button>
                  </Link>
                  <Link to="/app/transactions">
                    <Button variant="secondary">Browse transactions</Button>
                  </Link>
                  <Button
                    variant="secondary"
                    loading={downloading}
                    onClick={() => handleDownload(result.token, result.statement.filename)}
                    icon={<Download className="size-4" aria-hidden="true" />}
                  >
                    Download summary
                  </Button>
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody className="pt-5">
                {error ? (
                  <Alert tone="error" className="mb-4" title="Upload failed">
                    {error}
                  </Alert>
                ) : null}

                {!file ? (
                  <Dropzone onFileSelected={selectFile} disabled={busy} />
                ) : (
                  <div className="ring-hairline rounded-[--radius-card] p-5 ring-1">
                    <div className="flex items-start gap-4">
                      <span
                        className="bg-brand-50 text-brand-700 flex size-10 shrink-0 items-center justify-center rounded-lg"
                        aria-hidden="true"
                      >
                        <FileSpreadsheet className="size-5" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-ink-primary truncate text-sm font-medium">
                          {file.name}
                        </p>
                        <p className="text-ink-muted mt-0.5 text-xs">
                          {formatFileSize(file.size)}
                        </p>

                        {phase === 'sending' ? (
                          <div className="mt-3">
                            <div className="bg-canvas h-1.5 overflow-hidden rounded-full">
                              <div
                                role="progressbar"
                                aria-valuenow={progress}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label="Upload progress"
                                className="bg-brand-500 h-full rounded-full transition-[width] duration-200"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <p className="text-ink-secondary tabular mt-1.5 text-xs">
                              Uploading… {progress}%
                            </p>
                          </div>
                        ) : null}

                        {phase === 'analyzing' ? (
                          <p
                            role="status"
                            aria-live="polite"
                            className="text-ink-secondary mt-3 inline-flex items-center gap-2 text-xs"
                          >
                            <Loader2 className="text-brand-500 size-3.5 animate-spin" aria-hidden="true" />
                            Parsing and categorising transactions…
                          </p>
                        ) : null}
                      </div>

                      {!busy ? (
                        <button
                          type="button"
                          onClick={reset}
                          aria-label="Remove selected file"
                          className="text-ink-muted hover:text-ink-primary hover:bg-canvas rounded-lg p-2 transition-colors"
                        >
                          <X className="size-4" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button onClick={handleUpload} loading={busy} disabled={busy}>
                        {phase === 'analyzing' ? 'Analysing…' : 'Analyse statement'}
                      </Button>
                      <Button variant="secondary" onClick={reset} disabled={busy}>
                        Choose a different file
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="File requirements" />
            <CardBody>
              <div className="flex gap-2.5">
                <Info className="text-ink-muted mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div className="text-ink-secondary space-y-2 text-sm">
                  <p>
                    Your file must contain an <strong>Amount</strong> column of numbers,
                    plus either a <strong>Category</strong> column (used as-is) or a{' '}
                    <strong>Description</strong> column (categorised automatically).
                  </p>
                  <p>
                    An optional <strong>Date</strong> column unlocks monthly trends and
                    date filtering.
                  </p>
                  <p>Accepted formats: .csv and .xlsx, up to 5 MB and 50,000 rows.</p>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[24rem] text-left text-xs">
                  <caption className="text-ink-muted mb-2 text-left">
                    Example layout
                  </caption>
                  <thead>
                    <tr className="text-ink-muted border-hairline border-b">
                      <th scope="col" className="py-2 pr-4 font-medium">Date</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Description</th>
                      <th scope="col" className="py-2 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-ink-secondary tabular">
                    <tr className="border-hairline border-b">
                      <td className="py-2 pr-4">2026-03-01</td>
                      <td className="py-2 pr-4">Salary</td>
                      <td className="py-2">3000</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">2026-03-02</td>
                      <td className="py-2 pr-4">Supermarket</td>
                      <td className="py-2">-150</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Upload history */}
        <Card className="h-fit">
          <CardHeader title="Your statements" description="Every upload is kept." />
          {statementsError ? (
            <ErrorState message={statementsError} onRetry={reloadStatements} />
          ) : statementsLoading && !statements ? (
            <CardBody>
              <LoadingBlock rows={4} label="Loading statements" />
            </CardBody>
          ) : !statements || statements.length === 0 ? (
            <EmptyState
              icon={<FileSpreadsheet className="size-5" aria-hidden="true" />}
              title="No statements yet"
              description="Uploaded statements will appear here."
            />
          ) : (
            <ul className="divide-hairline divide-y">
              {statements.map((statement) => (
                <li key={statement.id} className="px-5 py-3.5 sm:px-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-ink-primary truncate text-sm font-medium">
                        {statement.filename}
                      </p>
                      <p className="text-ink-muted mt-0.5 text-xs">
                        {formatNumber(statement.row_count)} rows ·{' '}
                        {formatDateTime(statement.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDownload(statement.token, statement.filename)}
                        aria-label={`Download summary for ${statement.filename}`}
                        className="text-ink-muted hover:text-ink-primary hover:bg-canvas rounded-lg p-2 transition-colors"
                      >
                        <Download className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(statement.id)}
                        aria-label={`Delete ${statement.filename}`}
                        className="text-ink-muted hover:text-negative hover:bg-canvas rounded-lg p-2 transition-colors"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="text-ink-secondary tabular mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="text-positive size-3.5" aria-hidden="true" />
                      Net {formatCurrency(statement.net_balance)}
                    </span>
                    {statement.period_start ? (
                      <span>
                        {formatDate(statement.period_start)} – {formatDate(statement.period_end)}
                      </span>
                    ) : (
                      <span className="text-ink-muted">No dates</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
