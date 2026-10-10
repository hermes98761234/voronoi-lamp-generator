import type { Pt } from './geom2d'
import type { Pattern } from './pattern'
import { localScale } from './pattern'
import { surfaceAt } from './profile'

export interface IndexedMesh {
  positions: Float32Array
  indices: Uint32Array
}

/** Longest straight piece of an opening edge on the curved wall (mm). */
const MAX_SEGMENT = 4

/**
 * One closed solid per opening: the outline mapped onto the outer skin and pushed through the wall
 * along the surface normals. Subtracting these from the shell cuts the openings.
 */
export function cutterMeshes(pat: Pattern): IndexedMesh[] {
  const { profile: pr, wall } = pat
  const ext = Math.max(1, wall * 0.4)
  const toSurface = (x: number, y: number, depth: number): [number, number, number] => {
    const s = surfaceAt(pr, y)
    const th = x / pr.rRef
    const c = Math.cos(th)
    const sn = Math.sin(th)
    return [(s.r - depth * s.nr) * c, (s.r - depth * s.nr) * sn, s.z - depth * s.nz]
  }
  const out: IndexedMesh[] = []
  for (const hole of pat.holes) {
    const [sx, sy] = localScale(pr, hole.seed[1])
    // Densify the outline so that straight 3D pieces follow the curved wall.
    const ring: Pt[] = []
    const o = hole.outline
    for (let i = 0; i < o.length; i++) {
      const a = o[i]
      const b = o[(i + 1) % o.length]
      const len = Math.hypot((b[0] - a[0]) * sx, (b[1] - a[1]) * sy)
      const n = Math.max(1, Math.min(16, Math.ceil(len / MAX_SEGMENT)))
      for (let k = 0; k < n; k++) ring.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n])
    }
    const m = ring.length
    const cx = ring.reduce((s, p) => s + p[0], 0) / m
    const cy = ring.reduce((s, p) => s + p[1], 0) / m
    const outer = ring.map((p) => toSurface(p[0], p[1], -ext))
    const inner = ring.map((p) => toSurface(p[0], p[1], wall + ext))
    const c0 = toSurface(cx, cy, 0)
    let d2 = 0
    for (const p of outer) d2 = Math.max(d2, (p[0] - c0[0]) ** 2 + (p[1] - c0[1]) ** 2 + (p[2] - c0[2]) ** 2)
    const sag = Math.min(d2 / 30, 8) // keeps the flat caps clear of the curved skin
    const top = toSurface(cx, cy, -(ext + sag))
    const bot = toSurface(cx, cy, wall + ext + sag)
    const verts: number[] = []
    for (const p of outer) verts.push(...p)
    for (const p of inner) verts.push(...p)
    verts.push(...top, ...bot)
    const iTop = 2 * m
    const iBot = 2 * m + 1
    const tris: number[] = []
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % m
      tris.push(iTop, i, j) // top fan
      tris.push(iBot, m + j, m + i) // bottom fan
      tris.push(i, m + i, m + j, i, m + j, j) // side quad
    }
    // Orient the solid outwards (positive signed volume).
    let vol = 0
    for (let t = 0; t < tris.length; t += 3) {
      const a = tris[t] * 3
      const b = tris[t + 1] * 3
      const c = tris[t + 2] * 3
      vol +=
        verts[a] * (verts[b + 1] * verts[c + 2] - verts[b + 2] * verts[c + 1]) -
        verts[a + 1] * (verts[b] * verts[c + 2] - verts[b + 2] * verts[c]) +
        verts[a + 2] * (verts[b] * verts[c + 1] - verts[b + 1] * verts[c])
    }
    if (vol < 0) for (let t = 0; t < tris.length; t += 3) [tris[t + 1], tris[t + 2]] = [tris[t + 2], tris[t + 1]]
    out.push({ positions: new Float32Array(verts), indices: new Uint32Array(tris) })
  }
  return out
}
