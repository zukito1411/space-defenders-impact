/** One ground camera shared by terrain UVs and every island/volcano sprite. */
export type SurfaceCameraFrame = {
  scroll: number; x: number; y: number; span: number; padding: number; tileSize: number
}
export const positiveSurfaceModulo = (n: number, period: number) => ((n % period) + period) % period
export function createSurfaceCameraFrame(): SurfaceCameraFrame {
  return { scroll: 0, x: 0, y: 0, span: 1, padding: 0, tileSize: 1 }
}
export function sampleSurfaceCamera(seconds: number, width: number, height: number, dpr: number,
  steeringX: number, steeringY: number, texturePixels: number, out: SurfaceCameraFrame) {
  const w = Math.max(1, width), h = Math.max(1, height)
  out.padding = Math.max(h * 0.18, Math.min(w, h) * 0.5 * 0.72)
  out.span = h + out.padding * 2
  out.scroll = seconds * 0.024 * out.span
  out.x = -steeringX * w * 0.025
  out.y = -steeringY * h * 0.012
  // Square material tiles, with enough source texels even at maximum insertion zoom.
  // Portrait adds repetitions vertically rather than elongating the source image.
  out.tileSize = Math.max(1, Math.min(Math.min(w, h) * 1.4, texturePixels / (Math.max(1, dpr) * 1.45)))
  return out
}
export function getSurfaceIslandY(camera: SurfaceCameraFrame, seed: number) {
  return positiveSurfaceModulo(camera.scroll + seed * camera.span, camera.span) - camera.padding + camera.y
}
