import { Spherical, Vector3, type WebGLRenderer } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { PonyConfig } from '../../../shared/utils/pony'
import { createPonyModel } from './model'
import { createPonyRenderer, createPonyStage } from './stage'

export async function createPonyViewer(canvas: HTMLCanvasElement, config: PonyConfig, baseURL: string,
  signal: AbortSignal, onError: () => void) {
  const model = await createPonyModel(config, baseURL)
  let renderer: WebGLRenderer | undefined
  let controls: OrbitControls | undefined
  let frame = 0
  let lastTime = 0
  let elapsed = 0
  let playing = true
  let visible = true
  let disposed = false
  let width = 1
  let height = 1

  function dispose() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame)
    document.removeEventListener('visibilitychange', visibilityChanged)
    controls?.dispose()
    model.dispose()
    renderer?.dispose()
    renderer?.forceContextLoss()
  }

  function invalidate() {
    if (!disposed && visible && !document.hidden && !frame) frame = requestAnimationFrame(draw)
  }

  function visibilityChanged() {
    lastTime = 0
    if (document.hidden) {
      cancelAnimationFrame(frame)
      frame = 0
    } else invalidate()
  }

  const stage = createPonyStage(model)

  function draw(now: number) {
    frame = 0
    if (disposed || !visible || document.hidden) return
    try {
      const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0
      lastTime = now
      if (playing) elapsed += delta
      model.animate(elapsed)
      const changed = controls!.update(delta)
      renderer!.render(stage.scene, stage.camera)
      if (playing || changed) invalidate()
      else lastTime = 0
    } catch {
      dispose()
      onError()
    }
  }

  try {
    signal.throwIfAborted()
    renderer = createPonyRenderer(canvas)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    controls = new OrbitControls(stage.camera, canvas)
    controls.target.copy(stage.center)
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.rotateSpeed = 0.65
    controls.zoomSpeed = 0.8
    controls.minZoom = 0.55
    controls.maxZoom = 2.8
    controls.minPolarAngle = 0.18
    controls.maxPolarAngle = Math.PI - 0.18
    controls.update()
    controls.saveState()
    controls.addEventListener('change', invalidate)
    document.addEventListener('visibilitychange', visibilityChanged)

    return {
      resize(nextWidth: number, nextHeight: number) {
        if (disposed || nextWidth <= 0 || nextHeight <= 0) return
        width = nextWidth
        height = nextHeight
        renderer!.setSize(width, height, false)
        stage.resize(width, height)
        invalidate()
      },
      setPlaying(value: boolean) {
        playing = value
        lastTime = 0
        invalidate()
      },
      setVisible(value: boolean) {
        visible = value
        lastTime = 0
        if (!visible) {
          cancelAnimationFrame(frame)
          frame = 0
        } else invalidate()
      },
      reset() {
        if (disposed) return
        controls!.reset()
        stage.resize(width, height)
        invalidate()
      },
      zoom(factor: number) {
        if (disposed) return
        stage.camera.zoom = Math.max(controls!.minZoom, Math.min(controls!.maxZoom, stage.camera.zoom * factor))
        stage.camera.updateProjectionMatrix()
        controls!.update()
        invalidate()
      },
      rotate(horizontal: number, vertical: number) {
        if (disposed) return
        const angle = new Spherical().setFromVector3(stage.camera.position.clone().sub(controls!.target))
        angle.theta += horizontal
        angle.phi = Math.max(controls!.minPolarAngle, Math.min(controls!.maxPolarAngle, angle.phi + vertical))
        stage.camera.position.copy(controls!.target).add(new Vector3().setFromSpherical(angle))
        controls!.update()
        invalidate()
      },
      dispose
    }
  } catch (error) {
    dispose()
    throw error
  }
}

export type PonyViewer = Awaited<ReturnType<typeof createPonyViewer>>
