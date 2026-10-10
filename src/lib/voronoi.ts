import { Delaunay } from 'd3-delaunay'
import { openCcw, polygonCentroid, type Pt } from './geom2d'
import { mulberry32 } from './rng'

/** The unwrapped surface: a rectangle that is periodic in x. Seeds live in [0, width) x [y0, y1]. */
export interface Domain {
  width: number
  y0: number
  y1: number
}

/** Random seeds with a soft minimum spacing (dart throwing, measured around the seam). */
export function randomSeeds(n: number, dom: Domain, seed: number): Pt[] {
  const rnd = mulberry32(seed)
  const area = dom.width * (dom.y1 - dom.y0)
  let minDist = 0.75 * Math.sqrt(area / n)
  const pts: Pt[] = []
  let attempts = 0
  while (pts.length < n) {
    const x = rnd() * dom.width
    const y = dom.y0 + rnd() * (dom.y1 - dom.y0)
    let ok = true
    for (const q of pts) {
      let dx = Math.abs(x - q[0])
      dx = Math.min(dx, dom.width - dx)
      if (dx * dx + (y - q[1]) ** 2 < minDist * minDist) {
        ok = false
        break
      }
    }
    if (ok) pts.push([x, y])
    // Relax the spacing when the domain is too crowded for it.
    else if (++attempts > 60) {
      minDist *= 0.9
      attempts = 0
    }
  }
  return pts
}

/**
 * Voronoi cells of seeds on a cylinder (periodic in x). Returns one counter-clockwise polygon per
 * seed, in the seed order. Cells are clipped to y0..y1 and may stick out of 0..width at the seam.
 */
export function periodicVoronoi(seeds: readonly Pt[], dom: Domain): Pt[][] {
  const n = seeds.length
  const all: Pt[] = [...seeds, ...seeds.map(([x, y]): Pt => [x - dom.width, y]), ...seeds.map(([x, y]): Pt => [x + dom.width, y])]
  const del = Delaunay.from(all)
  const vor = del.voronoi([-dom.width, dom.y0, 2 * dom.width, dom.y1])
  const cells: Pt[][] = []
  for (let i = 0; i < n; i++) {
    const poly = vor.cellPolygon(i) as unknown as Pt[] | null
    cells.push(poly ? openCcw(poly.map((p): Pt => [p[0], p[1]])) : [])
  }
  return cells
}

/** Lloyd relaxation: move every seed to the centroid of its cell. */
export function lloyd(seeds: readonly Pt[], dom: Domain, iterations: number): Pt[] {
  let cur: Pt[] = seeds.map((s): Pt => [s[0], s[1]])
  for (let it = 0; it < iterations; it++) {
    const cells = periodicVoronoi(cur, dom)
    cur = cur.map((s, i): Pt => {
      if (cells[i].length < 3) return s
      const [cx, cy] = polygonCentroid(cells[i])
      return [((cx % dom.width) + dom.width) % dom.width, Math.min(dom.y1, Math.max(dom.y0, cy))]
    })
  }
  return cur
}
