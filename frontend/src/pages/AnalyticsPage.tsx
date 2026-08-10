import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Upload } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/States'
import { IncomeExpenseChart } from '@/components/charts/IncomeExpenseChart'
import { NetTrendChart } from '@/components/charts/NetTrendChart'
import { CategoryDonut } from '@/components/charts/CategoryDonut'
import { CategorySpendBars } from '@/components/charts/CategorySpendBars'
import { ChartPlaceholder } from '@/components/charts/chartPrimitives'
import { useAsync } from '@/hooks/useAsync'
import { useCategoryColors } from '@/hooks/useCategoryColors'
import { analyticsService, statementService } from '@/services'
import { EXPENSE_COLOR, INCOME_COLOR } from '@/utils/palette'
import { formatCurrency, formatNumber, formatPercent } from '@/utils/format'

export function AnalyticsPage() {
  const [scope, setScope] = useState('all')

  const loadStatements = useCallback(
    (signal: AbortSignal) => {
      void signal
      return statementService.listStatements()
    },
    [],
  )
  const { data: statements } = useAsync(loadStatements, [])

  const statementId = scope === 'all' ? undefined : Number(scope)
  const loadSummary = useCallback(
    (signal: AbortSignal) => analyticsService.getSummary(statementId, signal),
    [statementId],
  )
  const { data, loading, error, reload } = useAsync(loadSummary, [statementId])

  const colorFor = useCategoryColors((data?.by_category ?? []).map((row) => row.category))

  const incomeCategories = useMemo(
    () => (data?.by_category ?? []).filter((row) => row.total > 0).sort((a, b) => b.total - a.total),
    [data],
  )

  const scopeOptions = useMemo(
    () => [
      { value: 'all', label: 'All statements' },
      ...(statements ?? []).map((statement) => ({
        value: String(statement.id),
        label: statement.filename,
      })),
    ],
    [statements],
  )

  if (error) {
    return (
      <>
        <PageHeader title="Analytics" />
        <Card>
          <ErrorState message={error} onRetry={reload} />
        </Card>
      </>
    )
  }

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Analytics" description="Loading your analysis…" />
        <Card className="p-6">
          <LoadingBlock rows={8} label="Loading analytics" />
        </Card>
      </>
    )
  }

  if (!data) return null

  const { totals, by_category, monthly, top_expenses } = data

  if (totals.statement_count === 0) {
    return (
      <>
        <PageHeader title="Analytics" />
        <Card>
          <EmptyState
            icon={<BarChart3 className="size-5" aria-hidden="true" />}
            title="Nothing to analyse yet"
            description="Upload a bank statement to start analysing your finances."
            action={
              <Link to="/app/upload">
                <Button icon={<Upload className="size-4" aria-hidden="true" />}>
                  Upload a statement
                </Button>
              </Link>
            }
          />
        </Card>
      </>
    )
  }

  const incomeCount = by_category.reduce(
    (sum, row) => sum + (row.total > 0 ? row.count : 0),
    0,
  )
  const expenseShare =
    totals.income > 0 ? (totals.expenses / totals.income) * 100 : null
  const averageExpense =
    totals.transaction_count > 0 && totals.expenses > 0
      ? totals.expenses / by_category.reduce((sum, row) => sum + (row.expense_total > 0 ? row.count : 0), 0)
      : 0

  return (
    <>
      <PageHeader
        title="Analytics"
        description="A closer look at how money moves through your accounts."
        action={
          <div className="w-full min-w-52 sm:w-64">
            <Select
              label="Statement scope"
              hideLabel
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              options={scopeOptions}
            />
          </div>
        }
      />

      {/* Income & expense analysis side by side — same measure, separate stories.
          `items-start` so a user with one income category doesn't get a card
          stretched to match a long expense list. */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Income analysis" description="Where money comes in." />
          <CardBody>
            <p className="text-positive text-3xl font-semibold tracking-tight">
              {formatCurrency(totals.income)}
            </p>
            <p className="text-ink-secondary mt-1 text-sm">
              across {formatNumber(incomeCount)} incoming{' '}
              {incomeCount === 1 ? 'transaction' : 'transactions'}
            </p>

            {incomeCategories.length > 0 ? (
              <ul className="mt-5 space-y-3">
                {incomeCategories.map((row) => {
                  const share = totals.income > 0 ? (row.total / totals.income) * 100 : 0
                  return (
                    <li key={row.category}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-ink-secondary truncate">{row.category}</span>
                        <span className="text-ink-primary tabular font-medium">
                          {formatCurrency(row.total)}
                        </span>
                      </div>
                      <div className="bg-canvas mt-1.5 h-1.5 overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${share}%`, background: INCOME_COLOR }}
                          aria-hidden="true"
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-ink-secondary mt-5 text-sm">
                No incoming transactions in this selection.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Expense analysis" description="Where money goes out." />
          <CardBody>
            <p className="text-3xl font-semibold tracking-tight" style={{ color: EXPENSE_COLOR }}>
              {formatCurrency(totals.expenses)}
            </p>
            <p className="text-ink-secondary mt-1 text-sm">
              {expenseShare !== null
                ? `${formatPercent(expenseShare, 0)} of income spent`
                : 'No income recorded to compare against'}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-3">
              <div className="ring-hairline rounded-lg p-3.5 ring-1">
                <dt className="text-ink-muted text-xs">Average expense</dt>
                <dd className="text-ink-primary tabular mt-1 text-base font-semibold">
                  {averageExpense > 0 ? formatCurrency(averageExpense) : '—'}
                </dd>
              </div>
              <div className="ring-hairline rounded-lg p-3.5 ring-1">
                <dt className="text-ink-muted text-xs">Spending categories</dt>
                <dd className="text-ink-primary tabular mt-1 text-base font-semibold">
                  {formatNumber(by_category.filter((row) => row.expense_total > 0).length)}
                </dd>
              </div>
            </dl>

            <p className="text-ink-secondary mt-5 mb-3 text-sm font-medium">
              Largest individual expenses
            </p>
            {top_expenses.length > 0 ? (
              <ol className="divide-hairline divide-y">
                {top_expenses.map((transaction) => (
                  <li key={transaction.id} className="flex items-center gap-3 py-2.5">
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: colorFor(transaction.category) }}
                    />
                    <span className="text-ink-secondary min-w-0 flex-1 truncate text-sm">
                      {transaction.description || transaction.category}
                    </span>
                    <span className="text-ink-primary tabular text-sm font-medium">
                      {formatCurrency(transaction.amount)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-ink-secondary text-sm">No expenses in this selection.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Spending by category"
          description="Ranked by total outflow. Colour is identity — it matches the breakdown below."
        />
        <CardBody>
          {totals.expenses > 0 ? (
            <CategorySpendBars data={by_category} colorFor={colorFor} />
          ) : (
            <ChartPlaceholder>No expenses recorded in this selection.</ChartPlaceholder>
          )}
        </CardBody>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Monthly trends"
            description="Income against expenses for every month covered."
          />
          <CardBody>
            {monthly.length > 0 ? (
              <IncomeExpenseChart data={monthly} />
            ) : (
              <ChartPlaceholder>
                <span>
                  This selection has no dated transactions. Include a{' '}
                  <strong>Date</strong> column to unlock monthly analysis.
                </span>
              </ChartPlaceholder>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Transaction distribution"
            description="Share of spend per category."
          />
          <CardBody>
            {totals.expenses > 0 ? (
              <CategoryDonut data={by_category} colorFor={colorFor} />
            ) : (
              <ChartPlaceholder>Nothing to distribute yet.</ChartPlaceholder>
            )}
          </CardBody>
        </Card>
      </div>

      {monthly.length > 0 ? (
        <Card className="mt-4">
          <CardHeader
            title="Net position over time"
            description="Income minus expenses, month by month."
          />
          <CardBody>
            <NetTrendChart data={monthly} />
          </CardBody>
        </Card>
      ) : null}

      {/* A table view alongside the charts — values are never gated behind colour. */}
      <Card className="mt-4 overflow-hidden">
        <CardHeader title="Category breakdown" description="The same figures as a table." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left">
            <thead>
              <tr className="border-hairline border-b">
                {['Category', 'Transactions', 'Spent', 'Net'].map((label, index) => (
                  <th
                    key={label}
                    scope="col"
                    className={`text-ink-muted px-5 py-3 text-xs font-medium tracking-wide uppercase sm:px-6 ${
                      index > 0 ? 'text-right' : ''
                    }`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...by_category]
                .sort((a, b) => b.expense_total - a.expense_total)
                .map((row) => (
                  <tr key={row.category} className="border-hairline border-b last:border-0">
                    <td className="px-5 py-3 sm:px-6">
                      <span className="text-ink-primary inline-flex items-center gap-2 text-sm">
                        <span
                          aria-hidden="true"
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: colorFor(row.category) }}
                        />
                        {row.category}
                      </span>
                    </td>
                    <td className="text-ink-secondary tabular px-5 py-3 text-right text-sm sm:px-6">
                      {formatNumber(row.count)}
                    </td>
                    <td className="text-ink-secondary tabular px-5 py-3 text-right text-sm sm:px-6">
                      {row.expense_total > 0 ? formatCurrency(row.expense_total) : '—'}
                    </td>
                    <td className="text-ink-primary tabular px-5 py-3 text-right text-sm font-medium sm:px-6">
                      {formatCurrency(row.total)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
