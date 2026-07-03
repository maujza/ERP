export const CHART_TOP = 8
export const CHART_BOTTOM = 92

const clampToNonNegativeFinite = (value: number) => {
  if (!Number.isFinite(value)) return 0
  return Math.max(value, 0)
}

export const buildTrendPolylinePoints = (values: number[]) => {
  if (!values.length) return ""

  const safeValues = values.map(clampToNonNegativeFinite)
  const max = Math.max(...safeValues, 1)
  const range = CHART_BOTTOM - CHART_TOP

  return safeValues
    .map((value, index) => {
      const x = (index / Math.max(safeValues.length - 1, 1)) * 100
      const y = CHART_BOTTOM - (value / max) * range
      return `${x},${y}`
    })
    .join(" ")
}

