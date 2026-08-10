import type { JsonEntry, JsonObject } from './losslessJson'

export type HideoutSourceFormat = 'current-json' | 'legacy'

export interface HideoutMetadata {
  version?: number
  language?: string
  hideoutName?: string
  hideoutHash?: number
  musicName?: string
  musicHash?: number
}

export interface DecorationInstance {
  editorId: string
  name: string
  gameHash?: number
  x: number
  y: number
  rotation: number
  fv: number
  variation: number
  flipped: boolean
  properties: Record<string, unknown>
  raw?: JsonObject
}

export interface EditorGroup {
  id: string
  name: string
  decorationIds: string[]
  locked?: boolean
  hidden?: boolean
}

export interface EditorGuide {
  id: string
  axis: 'x' | 'y'
  value: number
}

export interface EditorState {
  groups: EditorGroup[]
  lockedIds: string[]
  hiddenIds: string[]
  guides: EditorGuide[]
  camera: { x: number; y: number; scale: number }
}

export interface RawHideoutDocument {
  format: HideoutSourceFormat
  root?: JsonObject
  unmodeledDoodads: JsonEntry[]
  bom: boolean
  newline: '\n' | '\r\n'
  originalSource: string
}

export interface HideoutProject {
  metadata: HideoutMetadata
  decorations: DecorationInstance[]
  editorState: EditorState
  raw: RawHideoutDocument
}

export type ValidationSeverity = 'error' | 'warning'

export interface ValidationIssue {
  severity: ValidationSeverity
  message: string
  decorationId?: string
}

export interface ParseResult {
  project: HideoutProject
  warnings: string[]
}

export const NATIVE_ROTATION_TURN = 65_536

export function nativeToDegrees(native: number): number {
  return native * 360 / NATIVE_ROTATION_TURN
}

export function degreesToNative(degrees: number): number {
  return normalizeNativeRotation(Math.round(degrees * NATIVE_ROTATION_TURN / 360))
}

export function normalizeNativeRotation(rotation: number): number {
  return ((Math.round(rotation) % NATIVE_ROTATION_TURN) + NATIVE_ROTATION_TURN) % NATIVE_ROTATION_TURN
}

export function unpackFv(fv: number): { variation: number; flipped: boolean } {
  const packed = Math.max(0, Math.round(fv))
  return { variation: packed & 0x7f, flipped: (packed & 0x80) !== 0 }
}

export function packFv(variation: number, flipped: boolean): number {
  return (Math.max(0, Math.round(variation)) & 0x7f) | (flipped ? 0x80 : 0)
}

export function emptyEditorState(): EditorState {
  return { groups: [], lockedIds: [], hiddenIds: [], guides: [], camera: { x: 0, y: 0, scale: 1 } }
}
