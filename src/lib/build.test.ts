import Module from 'manifold-3d'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildLamp } from './build'
import { computePattern } from './pattern'
import { DEFAULTS } from './params'
import { polygonArea } from './geom2d'

type Wasm = Awaited<ReturnType<typeof Module>>
let wasm: Wasm
beforeAll(async () => {
  wasm = await Module()
  wasm.setup()
})

/** Area of a regular n-gon with circumradius r, relative to the true circle. */
const ngon = (n: number) => (n / (2 * Math.PI)) * Math.sin((2 * Math.PI) / n)

describe('computePattern', () => {
  it('produces non-overlapping openings that respect the rib width', () => {
    const pat = computePattern({ ...DEFAULTS, cells: 40, solidPct: 0, corner: 0 })
    expect(pat.holes.length).toBeGreaterThan(30)
    // Each opening is its cell shrunk by rib/2 per side, so it is always smaller than its cell.
    for (const h of pat.holes) expect(polygonArea(h.outline)).toBeLessThan(polygonArea(pat.cells[h.index]))
    expect(pat.openRatio).toBeGreaterThan(0.3)
    expect(pat.openRatio).toBeLessThan(0.9)
  })
  it('leaves cells closed for the requested share', () => {
    const open = computePattern({ ...DEFAULTS, cells: 100, solidPct: 0 }).holes.length
    const some = computePattern({ ...DEFAULTS, cells: 100, solidPct: 40 }).holes.length
    expect(some).toBeLessThan(open * 0.8)
  })
  it('is reproducible and changes with the seed', () => {
    const a = computePattern({ ...DEFAULTS, seed: 1 })
    expect(computePattern({ ...DEFAULTS, seed: 1 }).seeds).toEqual(a.seeds)
    expect(computePattern({ ...DEFAULTS, seed: 2 }).seeds).not.toEqual(a.seeds)
  })
})

describe('buildLamp', () => {
  it('plain wall (no openings) has the volume of the tube: pi h (R^2 - r^2)', () => {
    const p = { ...DEFAULTS, shape: 'cylinder' as const, radiusBottom: 50, radiusTop: 50, height: 120, wall: 3, base: false, solidPct: 100 }
    const res = buildLamp(wasm, p)
    expect(res.stats.holes).toBe(0)
    const expected = Math.PI * 120 * (50 * 50 - 47 * 47) * ngon(p.segments)
    expect(res.stats.volume / expected).toBeGreaterThan(0.999)
    expect(res.stats.volume / expected).toBeLessThan(1.001)
    expect(res.stats.manifold).toBe(true)
    expect(res.stats.size[2]).toBeCloseTo(120, 3)
  })
  it('cutting openings removes material and leaves a manifold solid', () => {
    const res = buildLamp(wasm, { ...DEFAULTS, base: true })
    const tube = Math.PI * DEFAULTS.height * (50 * 50 - 47.6 * 47.6) * ngon(DEFAULTS.segments)
    const plate = Math.PI * 47.6 * 47.6 * DEFAULTS.wall
    expect(res.stats.manifold).toBe(true)
    expect(res.stats.skipped).toBe(0)
    expect(res.stats.holes).toBeGreaterThan(40)
    expect(res.stats.volume).toBeLessThan((tube + plate) * 0.8)
    expect(res.stats.volume).toBeGreaterThan(plate * 0.9)
    // Removed volume ~ open skin area * wall.
    const removed = tube + plate - res.stats.volume
    const expectedRemoved = res.pattern.openRatio * res.pattern.profile.area * DEFAULTS.wall
    expect(removed / expectedRemoved).toBeGreaterThan(0.85)
    expect(removed / expectedRemoved).toBeLessThan(1.15)
    // Each separate through-hole adds one handle to the topology.
    expect(res.stats.genus).toBe(res.stats.holes)
    expect(res.indices.length / 3).toBe(res.stats.triangles)
  })
  it.each(['sphere', 'vase'] as const)('builds a manifold %s', (shape) => {
    const res = buildLamp(wasm, { ...DEFAULTS, shape, cells: 50, base: shape === 'vase' })
    expect(res.stats.manifold).toBe(true)
    expect(res.stats.skipped).toBe(0)
    expect(res.stats.holes).toBeGreaterThan(30)
    expect(res.stats.volume).toBeGreaterThan(0)
  })
})
