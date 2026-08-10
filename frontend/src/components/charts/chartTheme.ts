import { formatCompactCurrency } from '@/utils/format'

/**
 * Shared chart chrome. Grid and axes are hairline, solid and recessive; text
 * always wears an ink token rather than the series colour.
 */
export const AXIS_TICK = { fill: '#898781', fontSize: 12 } as const
export const GRID_STROKE = '#e1e0d9'
export const AXIS_STROKE = '#c3c2b7'

export const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: AXIS_TICK,
} as const

export function currencyTick(value: number): string {
  return formatCompactCurrency(value)
}
