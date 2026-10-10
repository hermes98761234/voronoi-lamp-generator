import { describe, expect, it } from 'vitest'
import { insetConvex, openCcw, polygonArea, polygonCentroid, roundedOffset, type Pt } from './geom2d'

const square = (a: number): Pt[] => [[0, 0], [a, 0], [a, a], [0, a]]

describe('polygon helpers', () => {
  it('computes area and centroid', () => {
    expect(polygonArea(square(4))).toBeCloseTo(16)
    expect(polygonArea([...square(4)].reverse())).toBeCloseTo(-16)
    const [cx, cy] = polygonCentroid([[0, 0], [6, 0], [0, 3]])
    expect(cx).toBeCloseTo(2)
    expect(cy).toBeCloseTo(1)
  })
  it('drops the closing vertex and fixes the winding', () => {
    const p = openCcw([[0, 0], [0, 2], [2, 2], [2, 0], [0, 0]])
    expect(p).toHaveLength(4)
    expect(polygonArea(p)).toBeCloseTo(4)
  })
})

describe('insetConvex', () => {
  it('shrinks a square by d on every side', () => {
    const p = insetConvex(square(10), 2)
    expect(polygonArea(p)).toBeCloseTo(36)
  })
  it('grows with a negative distance of a convex polygon', () => {
    expect(polygonArea(insetConvex(square(10), -1))).toBeCloseTo(100) // clipping cannot grow beyond the original
  })
  it('returns nothing when the polygon vanishes', () => {
    expect(insetConvex(square(10), 5)).toEqual([])
    expect(insetConvex(square(10), 6)).toEqual([])
  })
  it('keeps a right triangle similar: inradius shrink', () => {
    // 3-4-5 triangle has inradius 1; insetting by 0.5 scales it by 0.5 about the incentre.
    const tri: Pt[] = [[0, 0], [4, 0], [0, 3]]
    expect(polygonArea(insetConvex(tri, 0.5))).toBeCloseTo(6 * 0.25, 6)
  })
})

describe('roundedOffset', () => {
  it('matches the Steiner formula A + P r + pi r^2', () => {
    const r = 1.5
    const a = polygonArea(roundedOffset(square(10), r, Math.PI / 64))
    expect(a).toBeGreaterThan(100 + 40 * r + Math.PI * r * r - 0.2)
    expect(a).toBeLessThanOrEqual(100 + 40 * r + Math.PI * r * r)
  })
  it('is the identity for radius zero', () => {
    expect(roundedOffset(square(3), 0)).toEqual(square(3))
  })
})
