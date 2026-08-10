/**
 * Formatting helpers. The backend stores plain numbers with no currency unit, so
 * the display currency is a frontend presentation choice (configurable via
 * VITE_CURRENCY) rather than something inferred from the data.
 */

const CURRENCY = import.meta.env.VITE_CURRENCY ?? 'USD'
const LOCALE = import.meta.env.VITE_LOCALE ?? undefined

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  maximumFractionDigits: 2,
})

const compactFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  notation: 'compact',
  maximumFractionDigits: 1,
})

const numberFormatter = new Intl.NumberFormat(LOCALE)

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

/** Compact form for axis ticks, where full precision would collide. */
export function formatCompactCurrency(value: number): string {
  return compactFormatter.format(value)
}

/** Always shows the sign — used where inflow vs outflow must be unambiguous. */
export function formatSignedCurrency(value: number): string {
  const formatted = currencyFormatter.format(Math.abs(value))
  if (value > 0) return `+${formatted}`
  if (value < 0) return `−${formatted}`
  return formatted
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`
}

/** `2026-01-05` → `5 Jan 2026`. Returns a dash for rows with no date. */
export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** `2026-01` → `Jan 2026` for the monthly axis. */
export function formatMonth(month: string): string {
  const [year, monthPart] = month.split('-')
  const date = new Date(Number(year), Number(monthPart) - 1, 1)
  if (Number.isNaN(date.getTime())) return month
  return date.toLocaleDateString(LOCALE, { month: 'short', year: '2-digit' })
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/** `2026-08-10` in local time — for date inputs. */
export function toDateInputValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}
