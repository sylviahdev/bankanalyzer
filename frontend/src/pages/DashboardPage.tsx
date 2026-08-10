import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  CalendarRange,
  Receipt,
  TrendingDown,
  TrendingUp,
  Upload,
  Wallet,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, LoadingBlock, Skeleton } from '@/components/ui/States'
import { StatCard } from '@/components/dashboard/StatCard'
import { TransactionTable } from '@/components/transactions/TransactionTable'
import { IncomeExpenseChart } from '@/components/charts/IncomeExpenseChart'
import { NetTrendChart } from '@/components/charts/NetTrendChart'
import { CategoryDonut } from '@/components/charts/CategoryDonut'
import { ChartPlaceholder } from '@/components/charts/chartPrimitives'
import { useAsync } from '@/hooks/useAsync'
import { useCategoryColors } from '@/hooks/useCategoryColors'
import { analyticsService } from '@/services'
import { EXPENSE_COLOR, INCOME_COLOR } from '@/utils/palette'
import { formatCurrency, formatNumber } from '@/utils/format'

export function DashboardPage() {
  const load = useCallback(
    (signal: AbortSignal) => analyticsService.getSummary(undefined, signal),
    [],
  )
  const { data, loading, error, reload } = useAsync(load, [])

  const colorFor = useCategoryColors(
    (data?.by_category ?? []).map((row) => row.category),
  )

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Financial Overview" description="Loading your figures…" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-8 w-32" />
            </Card>
          ))}
        </div>
        <Card className="mt-4 p-6">
          <LoadingBlock rows={6} label="Loading dashboard" />
        </Card>
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader title="Financial Overview" />
        <Card>
          <ErrorState message={error} onRetry={reload} />
        </Card>
      </>
    )
  }

  if (!data) return null

  const { totals, by_category, monthly, recent_transactions, top_expenses } = data

  // No statements uploaded yet — the honest state, not a zeroed-out dashboard.
  if (totals.statement_count === 0) {
    return (
      <>
        <PageHeader
          title="Financial Overview"
          description="Upload your first bank statement to start analysing your finances."
        />
        <Card>
          <EmptyState
            icon={<Upload className="size-5" aria-hidden="true" />}
            title="No statements yet"
            description="Upload a bank statement to start analysing your finances. BankAnalyzer accepts .csv and .xlsx exports up to 5 MB."
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

  const savingsRate =
    totals.income > 0 ? Math.round((totals.net / totals.income) * 100) : null
  const hasMonthly = monthly.length > 0

  return (
    <>
      <PageHeader
        title="Financial Overview"
        description={`Across ${formatNumber(totals.statement_count)} ${
          totals.statement_count === 1 ? 'statement' : 'statements'
        } and ${formatNumber(totals.transaction_count)} transactions.`}
        action={
          <Link to="/app/upload">
            <Button icon={<Upload className="size-4" aria-hidden="true" />}>
              Upload statement
            </Button>
          </Link>
        }
      />

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total income"
          value={formatCurrency(totals.income)}
          icon={TrendingUp}
          accent={INCOME_COLOR}
        />
        <StatCard
          label="Total expenses"
          value={formatCurrency(totals.expenses)}
          icon={TrendingDown}
          accent={EXPENSE_COLOR}
        />
        <StatCard
          label="Net balance"
          value={formatCurrency(totals.net)}
          detail={savingsRate !== null ? `${savingsRate}% of income retained` : undefined}
          icon={Wallet}
          tone={totals.net >= 0 ? 'positive' : 'negative'}
          accent={totals.net >= 0 ? '#0ca30c' : EXPENSE_COLOR}
        />
        <StatCard
          label="Transactions"
          value={formatNumber(totals.transaction_count)}
          detail={`${formatNumber(by_category.length)} categories`}
          icon={Receipt}
          accent="#4a3aa7"
        />
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Income vs expenses"
            description={
              hasMonthly
                ? 'Money in against money out, by month.'
                : 'Requires a Date column in your statement.'
            }
          />
          <CardBody>
            {hasMonthly ? (
              <IncomeExpenseChart data={monthly} />
            ) : (
              <ChartPlaceholder>
                <span>
                  Your statements have no dates, so month-by-month figures cannot be
                  calculated.
                  <br />
                  Include a <strong>Date</strong> column in your next upload to unlock
                  this.
                </span>
              </ChartPlaceholder>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Spending by category"
            description="Outflows only, ranked by amount."
          />
          <CardBody>
            {totals.expenses > 0 ? (
              <CategoryDonut data={by_category} colorFor={colorFor} />
            ) : (
              <ChartPlaceholder>No expenses recorded yet.</ChartPlaceholder>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Monthly financial trend"
            description="Net position for each month covered by your statements."
          />
          <CardBody>
            {hasMonthly ? (
              <NetTrendChart data={monthly} />
            ) : (
              <ChartPlaceholder>
                <span>
                  Add a <strong>Date</strong> column to your statement to see trends over
                  time.
                </span>
              </ChartPlaceholder>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Largest expenses" description="Your five biggest outflows." />
          <CardBody className="pt-0">
            {top_expenses.length > 0 ? (
              <ol className="divide-hairline divide-y">
                {top_expenses.map((transaction) => (
                  <li key={transaction.id} className="flex items-center gap-3 py-3">
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: colorFor(transaction.category) }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-ink-primary truncate text-sm font-medium">
                        {transaction.description || transaction.category}
                      </p>
                      <p className="text-ink-muted mt-0.5 text-xs">
                        {transaction.category}
                      </p>
                    </div>
                    <span className="text-ink-primary tabular text-sm font-medium">
                      {formatCurrency(transaction.amount)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-ink-secondary py-6 text-center text-sm">
                No expenses recorded yet.
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardHeader
          title="Recent transactions"
          description="The most recent activity across all your statements."
          action={
            <Link
              to="/app/transactions"
              className="text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 text-sm font-medium"
            >
              View all
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          }
        />
        {recent_transactions.length > 0 ? (
          <TransactionTable transactions={recent_transactions} colorFor={colorFor} />
        ) : (
          <EmptyState
            icon={<CalendarRange className="size-5" aria-hidden="true" />}
            title="No transactions yet"
            description="Upload a bank statement to start analysing your finances."
          />
        )}
      </Card>
    </>
  )
}
