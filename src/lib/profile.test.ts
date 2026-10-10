import { describe, expect, it } from 'vitest'
import { DEFAULTS, sanitize } from './params'
import { buildProfile, maxWall, surfaceAt } from './profile'

describe('buildProfile', () => {
  it('cylinder: lateral area is 2 pi R H and the plane is W x H', () => {
    const pr = buildProfile({ ...DEFAULTS, shape: 'cylinder', radiusBottom: 40, radiusTop: 40, height: 100 })
    expect(pr.area).toBeCloseTo(2 * Math.PI * 40 * 100, 3)
    expect(pr.rRef).toBeCloseTo(40, 6)
    expect(pr.width).toBeCloseTo(2 * Math.PI * 40, 6)
    expect(pr.height).toBeCloseTo(100, 6)
    const s = surfaceAt(pr, 50)
    expect(s.r).toBeCloseTo(40)
    expect(s.z).toBeCloseTo(50)
    expect(s.nr).toBeCloseTo(1)
    expect(s.nz).toBeCloseTo(0)
  })
  it('cone: area is pi (r1 + r2) slant', () => {
    const pr = buildProfile({ ...DEFAULTS, shape: 'cylinder', radiusBottom: 60, radiusTop: 20, height: 90 })
    const slant = Math.hypot(40, 90)
    expect(pr.area).toBeCloseTo(Math.PI * 80 * slant, 3)
    // The normal of a cone narrowing upwards leans up.
    expect(surfaceAt(pr, slant / 2).nz).toBeGreaterThan(0.3)
  })
  it('sphere zone follows Archimedes: area = 2 pi R h', () => {
    const R = 70
    const pr = buildProfile({ ...DEFAULTS, shape: 'sphere', sphereRadius: R, capAngle: 35 })
    const h = 2 * R * Math.cos((35 * Math.PI) / 180)
    expect(pr.zMax - pr.zMin).toBeCloseTo(h, 6)
    // The polyline underestimates the arc slightly.
    expect(pr.area / (2 * Math.PI * R * h)).toBeGreaterThan(0.9995)
    expect(pr.area / (2 * Math.PI * R * h)).toBeLessThan(1.0001)
    // Equal-area unwrapping: y is proportional to the height z on a sphere.
    const mid = surfaceAt(pr, pr.height / 2)
    expect(mid.z).toBeCloseTo(h / 2, 1)
    expect(mid.r).toBeCloseTo(R, 1)
  })
  it('vase passes through its stations', () => {
    const pr = buildProfile({ ...DEFAULTS, shape: 'vase', height: 200, vase: [30, 50, 40, 55, 35] })
    expect(pr.r[0]).toBeCloseTo(30)
    expect(pr.r[pr.r.length - 1]).toBeCloseTo(35)
    expect(pr.r[pr.r.length >> 1]).toBeCloseTo(40, 1)
  })
  it('limits the wall so the inside stays off the axis', () => {
    const pr = buildProfile({ ...DEFAULTS, shape: 'cylinder', radiusBottom: 10, radiusTop: 10, height: 50 })
    expect(maxWall(pr)).toBeCloseTo(9, 6)
  })
})

describe('sanitize', () => {
  it('clamps and repairs bad input', () => {
    const p = sanitize({ cells: 99999, wall: -3, shape: 'bogus' as never, vase: [1, 2] })
    expect(p.cells).toBe(300)
    expect(p.wall).toBeCloseTo(0.8)
    expect(p.shape).toBe('cylinder')
    expect(p.vase).toEqual(DEFAULTS.vase)
  })
})
