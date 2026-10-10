export type Shape = 'cylinder' | 'sphere' | 'vase'

/** All lengths in millimetres. */
export interface LampParams {
  shape: Shape
  /** Cylinder / cone / vase height. */
  height: number
  radiusBottom: number
  radiusTop: number
  sphereRadius: number
  /** Sphere: polar angle (degrees) removed at the top and the bottom. */
  capAngle: number
  /** Vase: five radii, bottom to top, joined by a smooth curve. */
  vase: number[]
  wall: number
  /** Minimum web (rib) width between neighbouring openings. */
  rib: number
  /** Solid band kept at the top and bottom edge. */
  rim: number
  /** Corner radius of the openings. */
  corner: number
  cells: number
  seed: number
  /** Lloyd relaxation iterations. */
  relax: number
  /** Percentage of cells left closed. */
  solidPct: number
  /** Closed bottom plate of wall thickness. */
  base: boolean
  /** Facets around the circumference. */
  segments: number
}

export const DEFAULTS: LampParams = {
  shape: 'cylinder',
  height: 180,
  radiusBottom: 50,
  radiusTop: 50,
  sphereRadius: 70,
  capAngle: 35,
  vase: [38, 55, 40, 48, 36],
  wall: 2.4,
  rib: 3,
  rim: 8,
  corner: 1.5,
  cells: 70,
  seed: 7,
  relax: 3,
  solidPct: 0,
  base: true,
  segments: 120,
}

export interface Preset {
  name: string
  params: Partial<LampParams>
}

export const PRESETS: Preset[] = [
  { name: 'Classic cylinder', params: { shape: 'cylinder', height: 180, radiusBottom: 50, radiusTop: 50, cells: 70, relax: 3 } },
  { name: 'Lampshade cone', params: { shape: 'cylinder', height: 150, radiusBottom: 75, radiusTop: 35, cells: 60, relax: 4, base: false } },
  { name: 'Globe', params: { shape: 'sphere', sphereRadius: 70, capAngle: 35, cells: 90, relax: 4, base: false } },
  { name: 'Belly vase', params: { shape: 'vase', height: 200, vase: [38, 55, 40, 48, 36], cells: 80, relax: 3, base: true } },
  { name: 'Hourglass', params: { shape: 'vase', height: 190, vase: [55, 40, 24, 40, 55], cells: 80, relax: 3, base: true } },
  { name: 'Tulip', params: { shape: 'vase', height: 170, vase: [28, 48, 55, 48, 30], cells: 55, relax: 5, corner: 3, base: true } },
]

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Coerces any stored/typed values into a safe range. */
export function sanitize(p: Partial<LampParams>): LampParams {
  const d = DEFAULTS
  const num = (v: unknown, def: number, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : def)
  const vase = Array.isArray(p.vase) && p.vase.length === 5 ? p.vase.map((v, i) => num(v, d.vase[i], 5, 300)) : d.vase.slice()
  const shape: Shape = p.shape === 'sphere' || p.shape === 'vase' ? p.shape : 'cylinder'
  return {
    shape,
    height: num(p.height, d.height, 30, 500),
    radiusBottom: num(p.radiusBottom, d.radiusBottom, 10, 300),
    radiusTop: num(p.radiusTop, d.radiusTop, 10, 300),
    sphereRadius: num(p.sphereRadius, d.sphereRadius, 20, 250),
    capAngle: num(p.capAngle, d.capAngle, 5, 80),
    vase,
    wall: num(p.wall, d.wall, 0.8, 10),
    rib: num(p.rib, d.rib, 0.8, 20),
    rim: num(p.rim, d.rim, 0, 60),
    corner: num(p.corner, d.corner, 0, 15),
    cells: Math.round(num(p.cells, d.cells, 6, 300)),
    seed: Math.round(num(p.seed, d.seed, 0, 999999)),
    relax: Math.round(num(p.relax, d.relax, 0, 30)),
    solidPct: num(p.solidPct, d.solidPct, 0, 100),
    base: typeof p.base === 'boolean' ? p.base : d.base,
    segments: Math.round(num(p.segments, d.segments, 48, 240)),
  }
}
