import { useCallback, useMemo } from 'react'
import { OTHER_COLOR, buildCategoryColorMap } from '@/utils/palette'

/**
 * Maps categories to colours from the full category universe, so a category
 * keeps its colour when a chart or filter narrows the visible set.
 */
export function useCategoryColors(categories: string[]) {
  const map = useMemo(() => buildCategoryColorMap(categories), [categories])

  return useCallback(
    (category: string) => map.get(category) ?? OTHER_COLOR,
    [map],
  )
}
