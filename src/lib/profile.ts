import type { LampParams } from './params'

/**
 * Outer profile of the lamp as a polyline (r, z) from the bottom to the top, plus an equal-area
 * "unwrapped" parameterisation: x = angle * rRef (0..width), y = area / width (0..height).
 * Equal area means uniformly random seeds in the flat rectangle are uniform on the real surface.
 */
export interface Profile {
  r: number[]
  z: number[]
  /** Outward unit normal in the (r, z) half-plane. */
  nr: number[]
  nz: number[]
  /** Unwrapped y coordinate of each sample (cumulative lateral area / width). */
  y: number[]
  /** Reference radius: lateral area / (2 pi * profile arc length). */
  rRef: number
  /** Unwrapped width, 2 pi rRef. */
  width: number
  /** Unwrapped height = arc length of the profile. */
  height: number
  /** Lateral surface area of the outer skin. */
  area: number
  zMin: number
  zMax: number
}

export interface SurfacePoint {
  r: number
  z: number
  nr: number
  nz: number
}

const SAMPLES = 192

export function sampleProfile(p: LampParams): { r: number[]; z: number[] } {
  const r: number[] = []
  const z: number[] = []
  if (p.shape === 'cylinder') {
    for (let i = 0; i <= SAMPLES; i++) {
      const t = i / SAMPLES
      r.push(p.radiusBottom + (p.radiusTop - p.radiusBottom) * t)
      z.push(p.height * t)
    }
  } else if (p.shape === 'sphere') {
    const cap = (p.capAngle * Math.PI) / 180
    const phi0 = cap
    const phi1 = Math.PI - cap
    for (let i = 0; i <= SAMPLES; i++) {
      const phi = phi0 + ((phi1 - phi0) * i) / SAMPLES
      r.push(p.sphereRadius * Math.sin(phi))
      z.push(p.sphereRadius * (Math.cos(phi0) - Math.cos(phi)))
    }
  } else {
    const k = p.vase
    const m = k.length
    const tangent = (i: number) => (i === 0 ? k[1] - k[0] : i === m - 1 ? k[m - 1] - k[m - 2] : (k[i + 1] - k[i - 1]) / 2)
    for (let i = 0; i <= SAMPLES; i++) {
      const u = (i / SAMPLES) * (m - 1)
      const s = Math.min(m - 2, Math.floor(u))
      const t = u - s
      const t2 = t * t
      const t3 = t2 * t
      // Cubic Hermite through the stations with Catmull-Rom tangents.
      const v =
        (2 * t3 - 3 * t2 + 1) * k[s] + (t3 - 2 * t2 + t) * tangent(s) + (-2 * t3 + 3 * t2) * k[s + 1] + (t3 - t2) * tangent(s + 1)
      r.push(Math.max(1, v))
      z.push((p.height * i) / SAMPLES)
    }
  }
  return { r, z }
}

export function buildProfile(p: LampParams): Profile {
  const { r, z } = sampleProfile(p)
  const n = r.length
  const nr: number[] = []
  const nz: number[] = []
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1)
    const b = Math.min(n - 1, i + 1)
    let tr = r[b] - r[a]
    let tz = z[b] - z[a]
    const l = Math.hypot(tr, tz) || 1
    tr /= l
    tz /= l
    // Walking up the profile, the outside is on the right: n = (tz, -tr).
    nr.push(tz)
    nz.push(-tr)
  }
  const cum: number[] = [0] // cumulative lateral area
  let length = 0
  for (let i = 1; i < n; i++) {
    const ds = Math.hypot(r[i] - r[i - 1], z[i] - z[i - 1])
    length += ds
    cum.push(cum[i - 1] + Math.PI * (r[i] + r[i - 1]) * ds)
  }
  const area = cum[n - 1]
  const rRef = area / (2 * Math.PI * length)
  const width = 2 * Math.PI * rRef
  return {
    r,
    z,
    nr,
    nz,
    y: cum.map((a) => a / width),
    rRef,
    width,
    height: length,
    area,
    zMin: Math.min(...z),
    zMax: Math.max(...z),
  }
}

/** Surface point (profile radius, height, normal) at unwrapped height y. */
export function surfaceAt(pr: Profile, y: number): SurfacePoint {
  const ys = pr.y
  let lo = 0
  let hi = ys.length - 1
  const yy = Math.min(ys[hi], Math.max(0, y))
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (ys[mid] <= yy) lo = mid
    else hi = mid
  }
  const span = ys[hi] - ys[lo]
  const t = span > 0 ? (yy - ys[lo]) / span : 0
  const nr = pr.nr[lo] + (pr.nr[hi] - pr.nr[lo]) * t
  const nz = pr.nz[lo] + (pr.nz[hi] - pr.nz[lo]) * t
  const nl = Math.hypot(nr, nz) || 1
  return {
    r: pr.r[lo] + (pr.r[hi] - pr.r[lo]) * t,
    z: pr.z[lo] + (pr.z[hi] - pr.z[lo]) * t,
    nr: nr / nl,
    nz: nz / nl,
  }
}

/** Largest wall thickness that keeps the inner skin off the axis. */
export function maxWall(pr: Profile): number {
  let m = Infinity
  for (let i = 0; i < pr.r.length; i++) {
    // Inner radius is r - t * nr; keep it positive where the normal points outward.
    if (pr.nr[i] > 0.05) m = Math.min(m, pr.r[i] / pr.nr[i])
  }
  return m * 0.9
}
