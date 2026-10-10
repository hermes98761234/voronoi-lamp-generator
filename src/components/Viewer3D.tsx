import { useEffect, useRef } from 'react'
import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { LampMesh } from '../useLamp'

interface Props {
  mesh: LampMesh | null
  lampOn: boolean
  resetKey: number
  label: string
}

interface Ctx {
  renderer: WebGLRenderer
  scene: Scene
  camera: PerspectiveCamera
  controls: OrbitControls
  lamp: Mesh
  floor: Mesh
  hemi: HemisphereLight
  sun: DirectionalLight
  ambient: AmbientLight
  bulb: PointLight
  render: () => void
  fit: () => void
  height: number
  radius: number
}

/** Three.js preview of the finished solid, z up. Renders on demand. */
export default function Viewer3D({ mesh, lampOn, resetKey, label }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const ctx = useRef<Ctx | null>(null)
  const fitted = useRef(false)

  useEffect(() => {
    const el = host.current!
    const renderer = new WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.type = PCFShadowMap
    el.appendChild(renderer.domElement)
    const scene = new Scene()
    const camera = new PerspectiveCamera(38, 1, 1, 5000)
    camera.up.set(0, 1, 0)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = false
    const hemi = new HemisphereLight(0xffffff, 0x556070, 1.1)
    const sun = new DirectionalLight(0xffffff, 1.6)
    sun.position.set(200, 400, 250)
    const ambient = new AmbientLight(0xffffff, 0.15)
    const bulb = new PointLight(0xffc27a, 0, 0, 0)
    bulb.castShadow = true
    bulb.shadow.mapSize.set(1024, 1024)
    bulb.shadow.bias = -0.002
    scene.add(hemi, sun, ambient, bulb)
    const lamp = new Mesh(new BufferGeometry(), new MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.55, metalness: 0.05 }))
    lamp.rotation.x = -Math.PI / 2 // model is z-up
    lamp.castShadow = true
    scene.add(lamp)
    const floor = new Mesh(new PlaneGeometry(2000, 2000), new MeshStandardMaterial({ color: 0xcfd3da, roughness: 0.95 }))
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    floor.visible = false
    scene.add(floor)

    let raf = 0
    const render = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => renderer.render(scene, camera))
    }
    const c: Ctx = {
      renderer, scene, camera, controls, lamp, floor, hemi, sun, ambient, bulb, render, height: 100, radius: 50,
      fit: () => {
        const h = c.height
        const dist = Math.max(h * 2.0, c.radius * 4)
        camera.position.set(0.55 * dist, 0.3 * dist, 0.78 * dist)
        controls.target.set(0, 0, 0)
        controls.update()
        render()
      },
    }
    ctx.current = c
    controls.addEventListener('change', render)
    const resize = () => {
      const w = Math.max(1, el.clientWidth)
      const h = Math.max(1, el.clientHeight)
      renderer.setSize(w, h, false)
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      render()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()
    c.fit()
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      lamp.geometry.dispose()
      floor.geometry.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      ctx.current = null
      fitted.current = false
    }
  }, [])

  // New geometry from the worker.
  useEffect(() => {
    const c = ctx.current
    if (!c || !mesh) return
    const indexed = new BufferGeometry()
    indexed.setAttribute('position', new BufferAttribute(mesh.positions, 3))
    indexed.setIndex(new BufferAttribute(mesh.indices, 1))
    const geo = indexed.toNonIndexed() // flat shading keeps the cut edges crisp
    indexed.dispose()
    geo.computeVertexNormals()
    geo.computeBoundingBox()
    const bb = geo.boundingBox!
    const h = bb.max.z - bb.min.z
    geo.translate(0, 0, -(bb.min.z + h / 2))
    c.lamp.geometry.dispose()
    c.lamp.geometry = geo
    c.height = h
    c.radius = Math.max(bb.max.x, bb.max.y, -bb.min.x, -bb.min.y)
    c.floor.position.y = -h / 2 - 0.05
    c.bulb.position.set(0, 0, 0)
    if (!fitted.current) {
      fitted.current = true
      c.fit()
    }
    c.render()
  }, [mesh])

  // Lamp on: warm light inside, dim room, shadow pattern on the floor.
  useEffect(() => {
    const c = ctx.current
    if (!c) return
    c.floor.visible = lampOn
    c.bulb.intensity = lampOn ? 4 : 0
    c.bulb.distance = 0
    c.hemi.intensity = lampOn ? 0.12 : 1.1
    c.sun.intensity = lampOn ? 0 : 1.6
    c.ambient.intensity = lampOn ? 0.08 : 0.15
    const mat = c.lamp.material as MeshStandardMaterial
    mat.emissive = new Color(lampOn ? 0x1a0f05 : 0x000000)
    c.renderer.shadowMap.enabled = lampOn
    mat.needsUpdate = true
    ;(c.floor.material as MeshStandardMaterial).needsUpdate = true
    c.render()
  }, [lampOn, mesh])

  useEffect(() => {
    ctx.current?.fit()
  }, [resetKey])

  return <div className="viewer" ref={host} role="img" aria-label={label} />
}
