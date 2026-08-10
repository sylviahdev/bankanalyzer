/**
 * Chart colour assignment.
 *
 * These are the validated categorical slots (see index.css). Two rules matter:
 *
 *  1. Slots are assigned in fixed order and never cycled. A ninth category folds
 *     into "Other" instead of generating a new hue — `foldCategories` enforces it.
 *  2. Colour follows the entity, not its rank: `categoryColor` keys off a stable
 *     sorted category list, so filtering the chart never repaints the survivors.
 */

export const SERIES_COLORS = [
  '#2a78d6', // 1 blue
  '#eb6834', // 2 orange
  '#1baf7a', // 3 aqua
  '#eda100', // 4 yellow
  '#e87ba4', // 5 magenta
  '#008300', // 6 green
  '#4a3aa7', // 7 violet
] as const

/** Reserved neutral for the "Other" bucket — never one of the series slots. */
export const OTHER_COLOR = '#898781'
export const OTHER_LABEL = 'Other'

/** blue ↔ red diverging poles: inflow vs outflow. */
export const INCOME_COLOR = '#2a78d6'
export const EXPENSE_COLOR = '#e34948'

export const MAX_SERIES: number = SERIES_COLORS.length

/**
 * Builds a stable category → colour map. Pass the full universe of categories
 * (not the filtered subset) so a category keeps its colour across views.
 */
export function buildCategoryColorMap(categories: string[]): Map<string, string> {
  const ordered = [...new Set(categories)].sort((a, b) => a.localeCompare(b))
  const map = new Map<string, string>()

  let slot = 0
  for (const category of ordered) {
    if (category === OTHER_LABEL) {
      map.set(category, OTHER_COLOR)
      continue
    }
    map.set(category, SERIES_COLORS[slot % MAX_SERIES])
    slot += 1
  }
  return map
}

export interface FoldedSlice<T> {
  name: string
  value: number
  source: T[]
}

/**
 * Keeps the largest `limit` entries and folds the remainder into a single
 * "Other" slice, so a chart never has to invent a colour for slot 9+.
 */
export function foldCategories<T>(
  items: T[],
  getName: (item: T) => string,
  getValue: (item: T) => number,
  limit: number = MAX_SERIES,
): FoldedSlice<T>[] {
  const sorted = [...items].sort((a, b) => getValue(b) - getValue(a))
  const head = sorted.slice(0, limit)
  const tail = sorted.slice(limit)

  const slices: FoldedSlice<T>[] = head.map((item) => ({
    name: getName(item),
    value: getValue(item),
    source: [item],
  }))

  if (tail.length > 0) {
    const merged = tail.reduce((sum, item) => sum + getValue(item), 0)
    const existing = slices.find((slice) => slice.name === OTHER_LABEL)
    if (existing) {
      existing.value += merged
      existing.source.push(...tail)
    } else {
      slices.push({ name: OTHER_LABEL, value: merged, source: tail })
    }
  }

  return slices
}
