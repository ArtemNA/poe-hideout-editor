import { describe, expect, it } from 'vitest'
import { mirrorNativeRotation, radialPoints, rotatePoint } from '../src/editor/geometry'
import { NATIVE_ROTATION_TURN } from '../src/hideout/types'

describe('geometry', () => {
  it('rotates around a pivot', () => {
    const point = rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, 90)
    expect(point.x).toBeCloseTo(0)
    expect(point.y).toBeCloseTo(10)
  })

  it('mirrors native rotation correctly', () => {
    expect(mirrorNativeRotation(0, 'vertical')).toBe(NATIVE_ROTATION_TURN / 2)
    expect(mirrorNativeRotation(NATIVE_ROTATION_TURN / 4, 'horizontal')).toBe(NATIVE_ROTATION_TURN * 3 / 4)
  })

  it('places radial copies without duplicating the endpoint', () => {
    const points = radialPoints({ x: 0, y: 0 }, 10, 4)
    expect(points).toHaveLength(4)
    expect(points[0]).toEqual({ x: 10, y: 0 })
    expect(points[1].x).toBeCloseTo(0)
    expect(points[1].y).toBeCloseTo(10)
  })
})
