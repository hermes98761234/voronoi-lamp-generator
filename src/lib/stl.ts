/** Binary STL (little endian, 80-byte header, millimetres). */
export function toBinaryStl(positions: ArrayLike<number>, indices: ArrayLike<number>, name = 'voronoi-lamp'): ArrayBuffer {
  const n = Math.floor(indices.length / 3)
  const buf = new ArrayBuffer(84 + n * 50)
  const dv = new DataView(buf)
  const head = `binary STL ${name}`.slice(0, 79)
  for (let i = 0; i < head.length; i++) dv.setUint8(i, head.charCodeAt(i) & 0x7f)
  dv.setUint32(80, n, true)
  let o = 84
  for (let t = 0; t < n; t++) {
    const a = indices[t * 3] * 3
    const b = indices[t * 3 + 1] * 3
    const c = indices[t * 3 + 2] * 3
    const ux = positions[b] - positions[a]
    const uy = positions[b + 1] - positions[a + 1]
    const uz = positions[b + 2] - positions[a + 2]
    const vx = positions[c] - positions[a]
    const vy = positions[c + 1] - positions[a + 1]
    const vz = positions[c + 2] - positions[a + 2]
    let nx = uy * vz - uz * vy
    let ny = uz * vx - ux * vz
    let nz = ux * vy - uy * vx
    const l = Math.hypot(nx, ny, nz) || 1
    nx /= l
    ny /= l
    nz /= l
    for (const v of [nx, ny, nz]) {
      dv.setFloat32(o, v, true)
      o += 4
    }
    for (const k of [a, b, c]) {
      for (let q = 0; q < 3; q++) {
        dv.setFloat32(o, positions[k + q], true)
        o += 4
      }
    }
    o += 2 // attribute byte count
  }
  return buf
}
