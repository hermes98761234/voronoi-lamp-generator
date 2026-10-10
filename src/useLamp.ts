import { useEffect, useRef, useState } from 'react'
import type { LampStats } from './lib/build'
import type { LampParams } from './lib/params'
import type { WorkerReply, WorkerRequest } from './build.worker'

export interface LampMesh {
  positions: Float32Array
  indices: Uint32Array
  stats: LampStats
}
export interface LampState {
  status: 'building' | 'ready' | 'error'
  /** Latest successfully built solid (may lag behind the parameters while building). */
  mesh: LampMesh | null
  error: string
}

interface Done {
  params: LampParams
  mesh: LampMesh | null
  error: string
}

/** Rebuilds the solid in a Web Worker whenever the parameters change (debounced). */
export function useLamp(params: LampParams): LampState {
  const [done, setDone] = useState<Done | null>(null)
  const worker = useRef<Worker | null>(null)
  const seq = useRef(0)
  const asked = useRef(new Map<number, LampParams>())
  const last = useRef<LampMesh | null>(null)

  useEffect(() => {
    const w = new Worker(new URL('./build.worker.ts', import.meta.url), { type: 'module' })
    worker.current = w
    w.onmessage = (e: MessageEvent<WorkerReply>) => {
      const r = e.data
      const p = asked.current.get(r.id)
      if (!p || r.id !== seq.current) return
      if (r.ok) {
        last.current = { positions: r.positions, indices: r.indices, stats: r.stats }
        setDone({ params: p, mesh: last.current, error: '' })
      } else setDone({ params: p, mesh: last.current, error: r.error })
    }
    w.onerror = (e) => setDone({ params: asked.current.get(seq.current) ?? params, mesh: last.current, error: e.message || 'worker error' })
    return () => {
      w.terminate()
      worker.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const id = ++seq.current
    asked.current.set(id, params)
    const timer = setTimeout(() => {
      const req: WorkerRequest = { id, params }
      worker.current?.postMessage(req)
    }, 220)
    return () => clearTimeout(timer)
  }, [params])

  if (!done || done.params !== params) return { status: 'building', mesh: done?.mesh ?? null, error: '' }
  return { status: done.error ? 'error' : 'ready', mesh: done.mesh, error: done.error }
}
