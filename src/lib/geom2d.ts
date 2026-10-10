export type Pt = [number, number]

/** Signed area of a simple polygon (positive when counter-clockwise). */
export function polygonArea(p: readonly Pt[]): number {
  let a = 0
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i]
    const [x1, y1] = p[(i + 1) % p.length]
    a += x0 * y1 - x1 * y0
  }
  return a / 2
}

/** Area centroid of a simple polygon. */
export function polygonCentroid(p: readonly Pt[]): Pt {
  let a = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i]
    const [x1, y1] = p[(i + 1) % p.length]
    const w = x0 * y1 - x1 * y0
    a += w
    cx += (x0 + x1) * w
    cy += (y0 + y1) * w
  }
  if (Math.abs(a) < 1e-12) {
    const n = p.length || 1
    return [p.reduce((s, q) => s + q[0], 0) / n, p.reduce((s, q) => s + q[1], 0) / n]
  }
  return [cx / (3 * a), cy / (3 * a)]
}

/** Drops the duplicated closing vertex that d3-delaunay adds and makes the winding counter-clockwise. */
export function openCcw(p: readonly Pt[]): Pt[] {
  const q = p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1] ? p.slice(0, -1) : p.slice()
  return polygonArea(q) < 0 ? q.reverse() : q
}

/**
 * Shrinks a convex counter-clockwise polygon by `d` (grows when negative) by clipping against every
 * edge moved inward. Returns [] when nothing is left.
 */
export function insetConvex(poly: readonly Pt[], d: number): Pt[] {
  let out: Pt[] = poly.slice()
  const n = poly.length
  for (let i = 0; i < n && out.length >= 3; i++) {
    const [x0, y0] = poly[i]
    const [x1, y1] = poly[(i + 1) % n]
    const len = Math.hypot(x1 - x0, y1 - y0)
    if (len < 1e-12) continue
    // Inward unit normal of a counter-clockwise edge is its left side.
    const nx = -(y1 - y0) / len
    const ny = (x1 - x0) / len
    const side = (p: Pt) => (p[0] - x0) * nx + (p[1] - y0) * ny - d // >= 0 keeps
    const next: Pt[] = []
    for (let j = 0; j < out.length; j++) {
      const a = out[j]
      const b = out[(j + 1) % out.length]
      const sa = side(a)
      const sb = side(b)
      if (sa >= 0) next.push(a)
      if (sa >= 0 !== sb >= 0) {
        const t = sa / (sa - sb)
        next.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
      }
    }
    out = next
  }
  if (out.length < 3 || Math.abs(polygonArea(out)) < 1e-9) return []
  return out
}

/** Grows a convex counter-clockwise polygon by `r` with circular arcs at the corners (rounded offset). */
export function roundedOffset(poly: readonly Pt[], r: number, arcStep = Math.PI / 8): Pt[] {
  if (r <= 1e-9) return poly.slice()
  const n = poly.length
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const p = poly[i]
    const a = poly[(i + n - 1) % n]
    const b = poly[(i + 1) % n]
    // Outward normals of the incoming and outgoing edges.
    const l0 = Math.hypot(p[0] - a[0], p[1] - a[1]) || 1
    const l1 = Math.hypot(b[0] - p[0], b[1] - p[1]) || 1
    const a0 = Math.atan2(-(p[0] - a[0]) / l0, (p[1] - a[1]) / l0) // normal (dy, -dx)
    let a1 = Math.atan2(-(b[0] - p[0]) / l1, (b[1] - p[1]) / l1)
    while (a1 < a0) a1 += 2 * Math.PI
    const steps = Math.max(1, Math.ceil((a1 - a0) / arcStep))
    for (let k = 0; k <= steps; k++) {
      const ang = a0 + ((a1 - a0) * k) / steps
      out.push([p[0] + r * Math.cos(ang), p[1] + r * Math.sin(ang)])
    }
  }
  return out
}
