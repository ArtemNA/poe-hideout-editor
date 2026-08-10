import { NATIVE_ROTATION_TURN, normalizeNativeRotation, type DecorationInstance } from '../hideout/types'

export interface Point { x: number; y: number }
export interface Bounds { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number; centerX: number; centerY: number }

export function rotatePoint(point: Point, pivot: Point, degrees: number): Point {
  const angle = degrees * Math.PI / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = point.x - pivot.x
  const dy = point.y - pivot.y
  return { x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos }
}

export function boundsOf(items: Pick<DecorationInstance, 'x' | 'y'>[]): Bounds {
  if (!items.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 }
  const xs = items.map((item) => item.x)
  const ys = items.map((item) => item.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 }
}

export function snap(value: number, step: number): number {
  return step > 0 ? Math.round(value / step) * step : value
}

export function mirrorNativeRotation(rotation: number, axis: 'horizontal' | 'vertical'): number {
  // Canvas/game X grows right and Y grows down. Reflecting position over a vertical
  // axis maps angle θ to π-θ; reflecting over a horizontal axis maps θ to -θ.
  return axis === 'vertical'
    ? normalizeNativeRotation(NATIVE_ROTATION_TURN / 2 - rotation)
    : normalizeNativeRotation(-rotation)
}

export function radialPoints(center: Point, radius: number, copies: number, startDegrees = 0, sweepDegrees = 360): Point[] {
  if (copies <= 0) return []
  const divisor = sweepDegrees === 360 ? copies : Math.max(1, copies - 1)
  return Array.from({ length: copies }, (_, index) => {
    const angle = (startDegrees + sweepDegrees * index / divisor) * Math.PI / 180
    return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }
  })
}
