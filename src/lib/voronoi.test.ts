import { describe, expect, it } from 'vitest'
import { polygonArea } from './geom2d'
import { lloyd, periodicVoronoi, randomSeeds, type Domain } from './voronoi'

const dom: Domain = { width: 300, y0: 10, y1: 110 }

function areaStd(cells: ReturnType<typeof periodicVoronoi>) {
  const a = cells.map(polygonArea)
  const mean = a.reduce((s, v) => s + v, 0) / a.length
  return Math.sqrt(a.reduce((s, v) => s + (v - mean) ** 2, 0) / a.length) / mean
}

describe('randomSeeds', () => {
  it('is deterministic and inside the domain', () => {
    const a = randomSeeds(40, dom, 3)
    expect(randomSeeds(40, dom, 3)).toEqual(a)
    expect(randomSeeds(40, dom, 4)).not.toEqual(a)
    expect(a).toHaveLength(40)
    for (const [x, y] of a) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(dom.width)
      expect(y).toBeGreaterThanOrEqual(dom.y0)
      expect(y).toBeLessThanOrEqual(dom.y1)
    }
  })
})

describe('periodicVoronoi', () => {
  it('tiles the band exactly: cell areas add up to the domain area', () => {
    const seeds = randomSeeds(50, dom, 1)
    const cells = periodicVoronoi(seeds, dom)
    const total = cells.reduce((s, c) => s + polygonArea(c), 0)
    expect(total).toBeCloseTo(dom.width * (dom.y1 - dom.y0), 4)
    for (const c of cells) expect(polygonArea(c)).toBeGreaterThan(0)
  })
  it('wraps around the seam: a seed near x=0 has a neighbour across x=width', () => {
    const cells = periodicVoronoi([[2, 50], [dom.width - 2, 50]], dom)
    // Two seeds 4 apart across the seam split the band there, so each cell is half of it.
    expect(polygonArea(cells[0])).toBeCloseTo((dom.width * 100) / 2, 1)
    expect(Math.min(...cells[0].map((p) => p[0]))).toBeLessThan(0)
  })
})

describe('lloyd', () => {
  it('evens out cell sizes', () => {
    const seeds = randomSeeds(50, dom, 2)
    const before = areaStd(periodicVoronoi(seeds, dom))
    const after = areaStd(periodicVoronoi(lloyd(seeds, dom, 8), dom))
    expect(after).toBeLessThan(before * 0.6)
  })
  it('does nothing for zero iterations and keeps seeds in the domain', () => {
    const seeds = randomSeeds(20, dom, 5)
    expect(lloyd(seeds, dom, 0)).toEqual(seeds)
    for (const [x, y] of lloyd(seeds, dom, 3)) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(dom.width)
      expect(y).toBeGreaterThanOrEqual(dom.y0)
      expect(y).toBeLessThanOrEqual(dom.y1)
    }
  })
})
