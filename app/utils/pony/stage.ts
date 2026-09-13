import { Box3, OrthographicCamera, Scene, Vector3, WebGLRenderer } from 'three'
import type { PonyModel } from './model'

export function createPonyRenderer(canvas?: HTMLCanvasElement) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, stencil: true, powerPreference: 'low-power' })
  renderer.setClearColor(0x000000, 0)
  return renderer
}

export function createPonyStage(model: PonyModel) {
  const scene = new Scene()
  scene.add(model.root)
  const center = model.bounds.getCenter(new Vector3())
  const distance = model.bounds.getSize(new Vector3()).length() * 3
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, distance * 5)
  const position = center.clone().add(new Vector3(-0.8, 0.3, -1.4).normalize().multiplyScalar(distance))
  camera.position.copy(position)
  camera.lookAt(center)

  function resize(width: number, height: number) {
    const aspect = Math.max(1, width) / Math.max(1, height)
    camera.updateMatrixWorld(true)
    const bounds = new Box3()
    for (let i = 0; i < 8; i++) {
      bounds.expandByPoint(new Vector3(
        i & 1 ? model.bounds.max.x : model.bounds.min.x,
        i & 2 ? model.bounds.max.y : model.bounds.min.y,
        i & 4 ? model.bounds.max.z : model.bounds.min.z
      ).applyMatrix4(camera.matrixWorldInverse))
    }
    const size = bounds.getSize(new Vector3())
    const halfHeight = Math.max(size.y, size.x / aspect) * 0.62
    camera.left = -halfHeight * aspect
    camera.right = halfHeight * aspect
    camera.top = halfHeight
    camera.bottom = -halfHeight
    camera.updateProjectionMatrix()
  }

  return { scene, camera, center, position, resize }
}
