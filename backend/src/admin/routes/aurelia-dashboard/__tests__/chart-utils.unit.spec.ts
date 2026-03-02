import { buildTrendPolylinePoints, CHART_BOTTOM, CHART_TOP } from "../chart-utils"

const parsePoints = (points: string) =>
  points.split(" ").map((pair) => {
    const [x, y] = pair.split(",").map(Number)
    return { x, y }
  })

describe("buildTrendPolylinePoints", () => {
  it("returns empty for no values", () => {
    expect(buildTrendPolylinePoints([])).toBe("")
  })

  it("creates valid coordinates with expected bounds", () => {
    const points = buildTrendPolylinePoints([0, 5, 10])
    const parsed = parsePoints(points)

    expect(parsed).toHaveLength(3)
    expect(parsed[0].x).toBe(0)
    expect(parsed[2].x).toBe(100)
    parsed.forEach((point) => {
      expect(Number.isNaN(point.x)).toBe(false)
      expect(Number.isNaN(point.y)).toBe(false)
      expect(point.y).toBeGreaterThanOrEqual(CHART_TOP)
      expect(point.y).toBeLessThanOrEqual(CHART_BOTTOM)
    })
  })

  it("keeps a visible baseline when all values are zero", () => {
    const points = buildTrendPolylinePoints([0, 0, 0, 0])
    const parsed = parsePoints(points)

    parsed.forEach((point) => {
      expect(point.y).toBe(CHART_BOTTOM)
    })
  })

  it("clamps negative and invalid values to zero", () => {
    const points = buildTrendPolylinePoints([-5, Number.NaN, Number.POSITIVE_INFINITY, 2])
    const parsed = parsePoints(points)

    expect(parsed[0].y).toBe(CHART_BOTTOM)
    expect(parsed[1].y).toBe(CHART_BOTTOM)
    expect(parsed[2].y).toBe(CHART_BOTTOM)
    expect(parsed[3].y).toBe(CHART_TOP)
  })
})

