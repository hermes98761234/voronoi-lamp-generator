import type { ManifoldToplevel, Manifold } from 'manifold-3d'
import { cutterMeshes } from './cutters'
import { computePattern, type Pattern } from './pattern'
import type { LampParams } from './params'

export interface LampStats {
  triangles: number
  /** Volume in mm^3. */
  volume: number
  /** Genus of the finished solid (number of through-holes of the mesh). */
  genus: number
  holes: number
  /** Share of the outer skin that is open, 0..1. */
  openRatio: number
  /** Bounding box size in mm. */
  size: [number, number, number]
  /** Wall thickness actually used (it is limited by the radius). */
  wall: number
  /** Openings that Manifold rejected (should be zero). */
  skipped: number
  manifold: boolean
}

export interface LampResult {
  positions: Float32Array
  indices: Uint32Array
  stats: LampStats
  pattern: Pattern
}

/** Builds the watertight lamp shell with Manifold: revolved wall, minus all openings, plus the base plate. */
export function buildLamp(wasm: ManifoldToplevel, input: Partial<LampParams>): LampResult {
  const { Manifold, CrossSection, Mesh } = wasm
  const pat = computePattern(input)
  const { profile: pr, params, wall } = pat
  const garbage: { delete(): void }[] = []
  const keep = <T extends { delete(): void }>(o: T): T => {
    garbage.push(o)
    return o
  }
  try {
    // Wall cross-section (x = radius, y = height): up the outside, down the inside.
    const n = pr.r.length
    const idx: number[] = []
    if (params.shape === 'cylinder') idx.push(0, n - 1)
    else for (let i = 0; i < n; i += 2) idx.push(i)
    if (idx[idx.length - 1] !== n - 1) idx.push(n - 1)
    const outer = idx.map((i): [number, number] => [pr.r[i], pr.z[i]])
    const inner = idx.map((i): [number, number] => [pr.r[i] - wall * pr.nr[i], pr.z[i] - wall * pr.nz[i]]).reverse()
    const section = keep(new CrossSection([[...outer, ...inner]]))
    const wallSolid = keep(Manifold.revolve(section, params.segments))
    let result: Manifold = wallSolid

    let skipped = 0
    const cutters: Manifold[] = []
    for (const c of cutterMeshes(pat)) {
      const mesh = new Mesh({ numProp: 3, vertProperties: c.positions, triVerts: c.indices })
      const m = keep(new Manifold(mesh))
      if (m.status() !== 'NoError' || m.isEmpty()) skipped++
      else cutters.push(m)
    }
    if (cutters.length) {
      const all = keep(Manifold.union(cutters))
      result = keep(wallSolid.subtract(all))
    }
    if (params.base) {
      const rOut = pr.r[0]
      const rIn = pr.r[0] - wall * pr.nr[0]
      const rd = rIn + (rOut - rIn) * 0.6
      const disc = keep(Manifold.cylinder(wall, rd, rd, params.segments).translate([0, 0, pr.z[0]]))
      result = keep(result.add(disc))
    }
    const mesh = result.getMesh()
    const np = mesh.numProp
    const positions = new Float32Array((mesh.vertProperties.length / np) * 3)
    for (let i = 0, v = 0; i < mesh.vertProperties.length; i += np, v += 3) {
      positions[v] = mesh.vertProperties[i]
      positions[v + 1] = mesh.vertProperties[i + 1]
      positions[v + 2] = mesh.vertProperties[i + 2]
    }
    const bb = result.boundingBox()
    return {
      positions,
      indices: new Uint32Array(mesh.triVerts),
      pattern: pat,
      stats: {
        triangles: mesh.triVerts.length / 3,
        volume: result.volume(),
        genus: result.genus(),
        holes: cutters.length,
        openRatio: pat.openRatio,
        size: [bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]],
        wall,
        skipped,
        manifold: result.status() === 'NoError',
      },
    }
  } finally {
    for (const g of garbage.reverse()) g.delete()
  }
}
