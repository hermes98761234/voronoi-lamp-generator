import Module from 'manifold-3d'
import wasmUrl from 'manifold-3d/manifold.wasm?url'
import { buildLamp, type LampStats } from './lib/build'
import type { LampParams } from './lib/params'

export interface WorkerRequest {
  id: number
  params: LampParams
}
export type WorkerReply =
  | { id: number; ok: true; positions: Float32Array; indices: Uint32Array; stats: LampStats }
  | { id: number; ok: false; error: string }

const ready = Module({ locateFile: () => wasmUrl }).then((w) => {
  w.setup()
  return w
})

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, params } = e.data
  try {
    const wasm = await ready
    const r = buildLamp(wasm, params)
    const reply: WorkerReply = { id, ok: true, positions: r.positions, indices: r.indices, stats: r.stats }
    ;(self as unknown as Worker).postMessage(reply, [r.positions.buffer, r.indices.buffer])
  } catch (err) {
    const reply: WorkerReply = { id, ok: false, error: err instanceof Error ? err.message : String(err) }
    ;(self as unknown as Worker).postMessage(reply)
  }
}
