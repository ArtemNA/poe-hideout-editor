import { useEffect, useMemo, useRef, useState } from 'react'
import Konva from 'konva'
import { Arrow, Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva'
import type { DecorationInstance } from '../hideout/types'
import { boundsOf } from '../editor/geometry'

interface Camera { x: number; y: number; scale: number }
interface Props {
  decorations: DecorationInstance[]
  selectedIds: Set<string>
  hiddenIds: Set<string>
  lockedIds: Set<string>
  camera: Camera
  gridSize: number
  snapEnabled: boolean
  onCameraChange: (camera: Camera) => void
  onSelectionChange: (ids: Set<string>) => void
  onMove: (ids: Set<string>, dx: number, dy: number) => void
  onCursor: (point?: { x: number; y: number }) => void
  fitSignal: number
}

interface Marquee { startX: number; startY: number; x: number; y: number }

export function EditorCanvas({ decorations, selectedIds, hiddenIds, lockedIds, camera, gridSize, snapEnabled, onCameraChange, onSelectionChange, onMove, onCursor, fitSignal }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const nodeRefs = useRef(new Map<string, Konva.Group>())
  const dragStart = useRef(new Map<string, { x: number; y: number }>())
  const panStart = useRef<{ pointer: { x: number; y: number }; camera: Camera }>()
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [marquee, setMarquee] = useState<Marquee>()

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const visible = decorations.filter((item) => !hiddenIds.has(item.editorId))
    if (!visible.length || !fitSignal) return
    const target = selectedIds.size ? visible.filter((item) => selectedIds.has(item.editorId)) : visible
    if (!target.length) return
    const bounds = boundsOf(target)
    const padding = 100
    const scale = Math.min(4, Math.max(0.08, Math.min((size.width - padding) / Math.max(1, bounds.width), (size.height - padding) / Math.max(1, bounds.height))))
    onCameraChange({ x: size.width / 2 - bounds.centerX * scale, y: size.height / 2 - bounds.centerY * scale, scale })
    // fitSignal intentionally drives this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignal])

  const screenToWorld = (point: { x: number; y: number }) => ({ x: (point.x - camera.x) / camera.scale, y: (point.y - camera.y) / camera.scale })
  const gridLines = useMemo(() => {
    const lines: Array<{ points: number[]; major: boolean }> = []
    const effective = gridSize * camera.scale
    if (effective < 5) return lines
    const min = screenToWorld({ x: 0, y: 0 }), max = screenToWorld({ x: size.width, y: size.height })
    const startX = Math.floor(min.x / gridSize) * gridSize
    const startY = Math.floor(min.y / gridSize) * gridSize
    for (let x = startX; x <= max.x; x += gridSize) lines.push({ points: [x, min.y, x, max.y], major: Math.round(x / gridSize) % 5 === 0 })
    for (let y = startY; y <= max.y; y += gridSize) lines.push({ points: [min.x, y, max.x, y], major: Math.round(y / gridSize) % 5 === 0 })
    return lines
    // camera values are explicit dependencies through screenToWorld.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera.x, camera.y, camera.scale, gridSize, size.width, size.height])

  const handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault()
    const stage = event.target.getStage()!
    const pointer = stage.getPointerPosition()!
    const world = screenToWorld(pointer)
    const direction = event.evt.deltaY > 0 ? -1 : 1
    const nextScale = Math.min(8, Math.max(0.04, camera.scale * (direction > 0 ? 1.12 : 1 / 1.12)))
    onCameraChange({ x: pointer.x - world.x * nextScale, y: pointer.y - world.y * nextScale, scale: nextScale })
  }

  const handlePointerDown = (event: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = event.target.getStage()!
    const pointer = stage.getPointerPosition()!
    if (event.evt.button === 1 || event.evt.button === 2) {
      panStart.current = { pointer, camera }
      return
    }
    if (event.target === stage) {
      const world = screenToWorld(pointer)
      setMarquee({ startX: world.x, startY: world.y, x: world.x, y: world.y })
      if (!event.evt.shiftKey) onSelectionChange(new Set())
    }
  }

  const handlePointerMove = (event: Konva.KonvaEventObject<PointerEvent>) => {
    const pointer = event.target.getStage()?.getPointerPosition()
    if (!pointer) return
    const world = screenToWorld(pointer)
    onCursor(world)
    if (panStart.current) {
      onCameraChange({ ...camera, x: panStart.current.camera.x + pointer.x - panStart.current.pointer.x, y: panStart.current.camera.y + pointer.y - panStart.current.pointer.y })
    } else if (marquee) setMarquee({ ...marquee, x: world.x, y: world.y })
  }

  const handlePointerUp = (event: Konva.KonvaEventObject<PointerEvent>) => {
    panStart.current = undefined
    if (!marquee) return
    const minX = Math.min(marquee.startX, marquee.x), maxX = Math.max(marquee.startX, marquee.x)
    const minY = Math.min(marquee.startY, marquee.y), maxY = Math.max(marquee.startY, marquee.y)
    const next = event.evt.shiftKey ? new Set(selectedIds) : new Set<string>()
    decorations.forEach((item) => {
      if (!hiddenIds.has(item.editorId) && item.x >= minX && item.x <= maxX && item.y >= minY && item.y <= maxY) next.add(item.editorId)
    })
    onSelectionChange(next)
    setMarquee(undefined)
  }

  const beginDrag = (item: DecorationInstance) => {
    if (!selectedIds.has(item.editorId)) onSelectionChange(new Set([item.editorId]))
    const ids = selectedIds.has(item.editorId) ? selectedIds : new Set([item.editorId])
    dragStart.current = new Map(decorations.filter((decoration) => ids.has(decoration.editorId)).map((decoration) => [decoration.editorId, { x: decoration.x, y: decoration.y }]))
  }

  const previewDrag = (item: DecorationInstance, node: Konva.Group) => {
    const origin = dragStart.current.get(item.editorId)
    if (!origin) return
    const dx = node.x() - origin.x, dy = node.y() - origin.y
    dragStart.current.forEach((position, id) => {
      if (id !== item.editorId) nodeRefs.current.get(id)?.position({ x: position.x + dx, y: position.y + dy })
    })
  }

  const endDrag = (item: DecorationInstance, node: Konva.Group, event: Konva.KonvaEventObject<DragEvent>) => {
    const origin = dragStart.current.get(item.editorId)
    if (!origin) return
    let dx = node.x() - origin.x, dy = node.y() - origin.y
    if (snapEnabled && !event.evt.altKey) {
      dx = Math.round((origin.x + dx) / gridSize) * gridSize - origin.x
      dy = Math.round((origin.y + dy) / gridSize) * gridSize - origin.y
    }
    const ids = new Set(dragStart.current.keys())
    dragStart.current.clear()
    onMove(ids, dx, dy)
  }

  return <div className="canvas-wrap" ref={containerRef} onContextMenu={(event) => event.preventDefault()}>
    <Stage ref={stageRef} width={size.width} height={size.height} onWheel={handleWheel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <Layer x={camera.x} y={camera.y} scaleX={camera.scale} scaleY={camera.scale} listening={false}>
        {gridLines.map((line, index) => <Line key={index} points={line.points} stroke={line.major ? '#303641' : '#252a32'} strokeWidth={(line.major ? 1.2 : 0.7) / camera.scale} />)}
        <Line points={[-100000, 0, 100000, 0]} stroke="#73535a" strokeWidth={1.5 / camera.scale} />
        <Line points={[0, -100000, 0, 100000]} stroke="#4f6d68" strokeWidth={1.5 / camera.scale} />
      </Layer>
      <Layer x={camera.x} y={camera.y} scaleX={camera.scale} scaleY={camera.scale}>
        {decorations.filter((item) => !hiddenIds.has(item.editorId)).map((item) => {
          const selected = selectedIds.has(item.editorId)
          const angle = item.rotation * 360 / 65536
          return <Group
            key={item.editorId} ref={(node) => { if (node) nodeRefs.current.set(item.editorId, node); else nodeRefs.current.delete(item.editorId) }}
            x={item.x} y={item.y} draggable={!lockedIds.has(item.editorId)}
            onClick={(event) => {
              event.cancelBubble = true
              const next = event.evt.shiftKey ? new Set(selectedIds) : new Set<string>()
              if (event.evt.shiftKey && next.has(item.editorId)) next.delete(item.editorId); else next.add(item.editorId)
              onSelectionChange(next)
            }}
            onDragStart={() => beginDrag(item)} onDragMove={(event) => previewDrag(item, event.target as Konva.Group)} onDragEnd={(event) => endDrag(item, event.target as Konva.Group, event)}
          >
            <Circle radius={selected ? 9 : 7} fill={selected ? '#f2c14e' : item.flipped ? '#b184e8' : '#5aa9e6'} stroke={lockedIds.has(item.editorId) ? '#e76f51' : '#111318'} strokeWidth={2 / camera.scale} />
            <Arrow points={[0, 0, Math.cos(angle * Math.PI / 180) * 22, Math.sin(angle * Math.PI / 180) * 22]} stroke={selected ? '#fff2bd' : '#a9cbe6'} fill={selected ? '#fff2bd' : '#a9cbe6'} strokeWidth={2 / camera.scale} pointerLength={5 / camera.scale} pointerWidth={5 / camera.scale} />
            {camera.scale > 0.45 && <Text text={item.name} x={10} y={-7} fontSize={12 / camera.scale} fill={selected ? '#fff1b8' : '#c8ced8'} listening={false} />}
          </Group>
        })}
        {marquee && <Rect x={Math.min(marquee.startX, marquee.x)} y={Math.min(marquee.startY, marquee.y)} width={Math.abs(marquee.x - marquee.startX)} height={Math.abs(marquee.y - marquee.startY)} stroke="#62b5ff" fill="rgba(60,150,230,.12)" strokeWidth={1 / camera.scale} />}
      </Layer>
    </Stage>
  </div>
}
