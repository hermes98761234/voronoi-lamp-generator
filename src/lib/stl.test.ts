import { describe, expect, it } from 'vitest'
import { toBinaryStl } from './stl'

describe('toBinaryStl', () => {
  it('writes the 84-byte header and 50 bytes per triangle with a unit normal', () => {
    const pos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1])
    const buf = toBinaryStl(pos, [0, 1, 2, 0, 3, 1])
    expect(buf.byteLength).toBe(84 + 2 * 50)
    const dv = new DataView(buf)
    expect(dv.getUint32(80, true)).toBe(2)
    expect([dv.getFloat32(84, true), dv.getFloat32(88, true), dv.getFloat32(92, true)]).toEqual([0, 0, 1])
    expect(dv.getFloat32(84 + 12 + 12, true)).toBe(1) // second vertex x
    // Second triangle (0,3,1): normal = (b-a) x (c-a) = (0,0,1) x (1,0,0) = (0,1,0)
    expect([dv.getFloat32(134, true), dv.getFloat32(138, true), dv.getFloat32(142, true)]).toEqual([0, 1, 0])
  })
})
