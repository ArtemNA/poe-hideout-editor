import {
  type JsonEntry,
  type JsonObject,
  objectEntry,
  objectNumber,
  objectString,
  parseLosslessJson,
} from './losslessJson'
import {
  emptyEditorState,
  type DecorationInstance,
  type HideoutMetadata,
  type ParseResult,
  unpackFv,
} from './types'

function makeId(index: number): string {
  return `dec-${index + 1}-${Math.random().toString(36).slice(2, 9)}`
}

function metadataFromRoot(root: JsonObject): HideoutMetadata {
  return {
    version: objectNumber(root, 'version'),
    language: objectString(root, 'language'),
    hideoutName: objectString(root, 'hideout_name'),
    hideoutHash: objectNumber(root, 'hideout_hash'),
    musicName: objectString(root, 'music_name'),
    musicHash: objectNumber(root, 'music_hash'),
  }
}

function nodeToUnknown(node: JsonEntry['value']): unknown {
  if (node.kind === 'number' || node.kind === 'string' || node.kind === 'literal') return node.value
  if (node.kind === 'array') return node.items.map(nodeToUnknown)
  const value: Record<string, unknown> = {}
  for (const entry of node.entries) value[entry.key] = nodeToUnknown(entry.value)
  return value
}

function decorationFromEntry(entry: JsonEntry, index: number, warnings: string[]): DecorationInstance | undefined {
  if (entry.value.kind !== 'object') {
    warnings.push(`Doodad '${entry.key}' is not an object; retained as unmodeled raw data.`)
    return undefined
  }
  const raw = entry.value
  const x = objectNumber(raw, 'x')
  const y = objectNumber(raw, 'y')
  const rotation = objectNumber(raw, 'r')
  const fv = objectNumber(raw, 'fv')
  const gameHash = objectNumber(raw, 'hash')
  const missing = [['x', x], ['y', y], ['r', rotation], ['fv', fv]]
    .filter(([, value]) => value === undefined).map(([key]) => key)
  if (missing.length) warnings.push(`Doodad '${entry.key}' is missing ${missing.join(', ')}; safe editor defaults were applied.`)
  const packed = fv ?? 0
  const { variation, flipped } = unpackFv(packed)
  const properties: Record<string, unknown> = {}
  for (const property of raw.entries) {
    if (!['hash', 'x', 'y', 'r', 'fv'].includes(property.key)) properties[property.key] = nodeToUnknown(property.value)
  }
  return {
    editorId: makeId(index),
    name: entry.key,
    gameHash,
    x: x ?? 0,
    y: y ?? 0,
    rotation: rotation ?? 0,
    fv: packed,
    variation,
    flipped,
    properties,
    raw,
  }
}

function parseCurrent(source: string, bom: boolean, newline: '\n' | '\r\n'): ParseResult {
  const parsed = parseLosslessJson(source)
  if (parsed.kind !== 'object') throw new Error('Hideout root must be an object.')
  const doodadsNode = objectEntry(parsed, 'doodads')?.value
  if (!doodadsNode || doodadsNode.kind !== 'object') throw new Error("Hideout must contain an object-valued 'doodads' field.")
  const warnings: string[] = []
  const decorations: DecorationInstance[] = []
  const unmodeledDoodads: JsonEntry[] = []
  doodadsNode.entries.forEach((entry, index) => {
    const decoration = decorationFromEntry(entry, index, warnings)
    if (decoration) decorations.push(decoration)
    else unmodeledDoodads.push(entry)
  })
  return {
    project: {
      metadata: metadataFromRoot(parsed),
      decorations,
      editorState: emptyEditorState(),
      raw: { format: 'current-json', root: parsed, unmodeledDoodads, bom, newline, originalSource: source },
    },
    warnings,
  }
}

function parseLegacy(source: string, bom: boolean, newline: '\n' | '\r\n'): ParseResult {
  const warnings: string[] = []
  const metadata: HideoutMetadata = {}
  const metadataMap: Array<[RegExp, keyof HideoutMetadata, 'string' | 'number']> = [
    [/^\s*Version\s*=\s*(\d+)/im, 'version', 'number'],
    [/^\s*Language\s*=\s*"([^"]*)"/im, 'language', 'string'],
    [/^\s*Hideout Name\s*=\s*"([^"]*)"/im, 'hideoutName', 'string'],
    [/^\s*Hideout Hash\s*=\s*(\d+)/im, 'hideoutHash', 'number'],
    [/^\s*Music Name\s*=\s*"([^"]*)"/im, 'musicName', 'string'],
    [/^\s*Music Hash\s*=\s*(\d+)/im, 'musicHash', 'number'],
  ]
  for (const [pattern, key, type] of metadataMap) {
    const match = pattern.exec(source)
    if (match) Object.assign(metadata, { [key]: type === 'number' ? Number(match[1]) : match[1] })
  }
  const decorationPattern = /^\s*(.+?)\s*=\s*\{\s*Hash\s*=\s*(\d+)\s*,\s*X\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*Y\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*Rot\s*=\s*(-?\d+)\s*,\s*Flip\s*=\s*(\d+)\s*,\s*Var\s*=\s*(\d+)\s*\}\s*$/gim
  const decorations: DecorationInstance[] = []
  for (const match of source.matchAll(decorationPattern)) {
    const flipped = Number(match[6]) !== 0
    const variation = Number(match[7])
    decorations.push({
      editorId: makeId(decorations.length), name: match[1].trim(), gameHash: Number(match[2]),
      x: Number(match[3]), y: Number(match[4]), rotation: Number(match[5]),
      fv: variation + (flipped ? 128 : 0), variation, flipped, properties: {},
    })
  }
  if (!decorations.length) throw new Error('Legacy hideout syntax detected, but no valid decoration records were found.')
  warnings.push('Legacy hideout imported. Unknown legacy lines are preserved only when the project is not edited; export uses normalized legacy fields.')
  return {
    project: {
      metadata, decorations, editorState: emptyEditorState(),
      raw: { format: 'legacy', unmodeledDoodads: [], bom, newline, originalSource: source },
    }, warnings,
  }
}

export function parseHideout(input: string): ParseResult {
  if (typeof input !== 'string' || !input.trim()) throw new Error('The hideout file is empty.')
  const bom = input.charCodeAt(0) === 0xfeff
  const source = bom ? input.slice(1) : input
  const newline: '\n' | '\r\n' = source.includes('\r\n') ? '\r\n' : '\n'
  return source.trimStart().startsWith('{') ? parseCurrent(source, bom, newline) : parseLegacy(source, bom, newline)
}
