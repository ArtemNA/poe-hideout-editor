import { NATIVE_ROTATION_TURN, normalizeNativeRotation, type DecorationInstance } from '../hideout/types'
import { boundsOf, mirrorNativeRotation, type Point } from './geometry'

export function moveDecorations(items: DecorationInstance[], ids: Set<string>, dx: number, dy: number): DecorationInstance[] {
  return items.map((item) => ids.has(item.editorId) ? { ...item, x: item.x + dx, y: item.y + dy } : item)
}

export function mirrorDecorations(
  items: DecorationInstance[], ids: Set<string>, axis: 'horizontal' | 'vertical',
  pivot?: number, duplicate = false,
): DecorationInstance[] {
  const selected = items.filter((item) => ids.has(item.editorId))
  if (!selected.length) return items
  const bounds = boundsOf(selected)
  const line = pivot ?? (axis === 'vertical' ? bounds.centerX : bounds.centerY)
  const mirrored = selected.map((item, index) => ({
    ...item,
    editorId: duplicate ? `${item.editorId}-mirror-${Date.now()}-${index}` : item.editorId,
    x: axis === 'vertical' ? 2 * line - item.x : item.x,
    y: axis === 'horizontal' ? 2 * line - item.y : item.y,
    rotation: mirrorNativeRotation(item.rotation, axis),
    flipped: !item.flipped,
  }))
  return duplicate ? [...items, ...mirrored] : items.map((item) => mirrored.find((next) => next.editorId === item.editorId) ?? item)
}

export type Alignment = 'left' | 'right' | 'top' | 'bottom' | 'center-x' | 'center-y'

export function alignDecorations(items: DecorationInstance[], ids: Set<string>, alignment: Alignment): DecorationInstance[] {
  const selected = items.filter((item) => ids.has(item.editorId))
  if (selected.length < 2) return items
  const b = boundsOf(selected)
  return items.map((item) => {
    if (!ids.has(item.editorId)) return item
    if (alignment === 'left') return { ...item, x: b.minX }
    if (alignment === 'right') return { ...item, x: b.maxX }
    if (alignment === 'top') return { ...item, y: b.minY }
    if (alignment === 'bottom') return { ...item, y: b.maxY }
    if (alignment === 'center-x') return { ...item, x: b.centerX }
    return { ...item, y: b.centerY }
  })
}

export function distributeDecorations(items: DecorationInstance[], ids: Set<string>, axis: 'x' | 'y'): DecorationInstance[] {
  const selected = items.filter((item) => ids.has(item.editorId)).sort((a, b) => axis === 'x' ? a.x - b.x : a.y - b.y)
  if (selected.length < 3) return items
  const start = axis === 'x' ? selected[0].x : selected[0].y
  const end = axis === 'x' ? selected.at(-1)!.x : selected.at(-1)!.y
  const positions = new Map(selected.map((item, index) => [item.editorId, start + (end - start) * index / (selected.length - 1)]))
  return items.map((item) => positions.has(item.editorId) ? { ...item, [axis]: positions.get(item.editorId)! } : item)
}

export function linearArray(source: DecorationInstance[], copies: number, spacing: Point, rotationIncrement = 0): DecorationInstance[] {
  const output: DecorationInstance[] = []
  for (let copy = 1; copy <= copies; copy++) {
    source.forEach((item, index) => output.push({
      ...item,
      editorId: `${item.editorId}-linear-${Date.now()}-${copy}-${index}`,
      x: item.x + spacing.x * copy,
      y: item.y + spacing.y * copy,
      rotation: normalizeNativeRotation(item.rotation + rotationIncrement * copy),
    }))
  }
  return output
}

export function radialArray(source: DecorationInstance[], copies: number, center: Point, rotateWithPath: boolean): DecorationInstance[] {
  const output: DecorationInstance[] = []
  for (let copy = 1; copy < copies; copy++) {
    const angle = 2 * Math.PI * copy / copies
    const cos = Math.cos(angle), sin = Math.sin(angle)
    source.forEach((item, index) => {
      const dx = item.x - center.x, dy = item.y - center.y
      output.push({
        ...item,
        editorId: `${item.editorId}-radial-${Date.now()}-${copy}-${index}`,
        x: center.x + dx * cos - dy * sin,
        y: center.y + dx * sin + dy * cos,
        rotation: rotateWithPath ? normalizeNativeRotation(item.rotation + NATIVE_ROTATION_TURN * copy / copies) : item.rotation,
      })
    })
  }
  return output
}
