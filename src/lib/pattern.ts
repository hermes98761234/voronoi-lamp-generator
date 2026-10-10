import { insetConvex, polygonArea, roundedOffset, type Pt } from './geom2d'
import { sanitize, type LampParams } from './params'
import { buildProfile, maxWall, surfaceAt, type Profile } from './profile'
import { mulberry32 } from './rng'
import { lloyd, periodicVoronoi, randomSeeds, type Domain } from './voronoi'

export interface Hole {
  /** Index of the seed this opening belongs to. */
  index: number
  /** Opening outline in unwrapped coordinates, counter-clockwise. */
  outline: Pt[]
  /** Seed position in unwrapped coordinates, used as the local metric reference. */
  seed: Pt
}

export interface Pattern {
  params: LampParams
  profile: Profile
  domain: Domain
  /** Wall thickness after clamping to what the shape allows. */
  wall: number
  seeds: Pt[]
  cells: Pt[][]
  holes: Hole[]
  /** Fraction of the outer skin that is open. */
  openRatio: number
}

/** Local true-length scale of the unwrapped plane at height y: x stretches by r/rRef, y by rRef/r. */
export function localScale(pr: Profile, y: number): [number, number] {
  const r = Math.max(surfaceAt(pr, y).r, 0.15 * pr.rRef)
  return [r / pr.rRef, pr.rRef / r]
}

export function computePattern(input: Partial<LampParams>): Pattern {
  const params = sanitize(input)
  const profile = buildProfile(params)
  const wall = Math.min(params.wall, maxWall(profile))
  const rim = Math.min(params.rim, profile.height * 0.4)
  const domain: Domain = { width: profile.width, y0: rim, y1: profile.height - rim }
  const seeds = lloyd(randomSeeds(params.cells, domain, params.seed), domain, params.relax)
  const cells = periodicVoronoi(seeds, domain)
  const rnd = mulberry32(params.seed * 7919 + 13)
  const holes: Hole[] = []
  let holeArea = 0
  cells.forEach((cell, index) => {
    const keepClosed = rnd() * 100 < params.solidPct // always draw so the other cells do not shift
    if (keepClosed || cell.length < 3) return
    const seed = seeds[index]
    const [sx, sy] = localScale(profile, seed[1])
    // Work in true lengths around the seed so the rib width is the same in every direction.
    const local = cell.map((p): Pt => [(p[0] - seed[0]) * sx, (p[1] - seed[1]) * sy])
    let corner = params.corner
    let inner: Pt[] = []
    for (let k = 0; k < 5; k++) {
      inner = insetConvex(local, params.rib / 2 + corner)
      if (inner.length >= 3) break
      corner = k < 3 ? corner / 2 : 0
    }
    if (inner.length < 3) return
    const rounded = corner > 0.05 ? roundedOffset(inner, corner) : inner
    const outline = rounded.map((p): Pt => [p[0] / sx + seed[0], p[1] / sy + seed[1]])
    const area = polygonArea(outline) // equal-area plane: this is the real area in mm^2
    if (area < 4) return
    holes.push({ index, outline, seed })
    holeArea += area
  })
  return { params, profile, domain, wall, seeds, cells, holes, openRatio: holeArea / (profile.width * profile.height) }
}
