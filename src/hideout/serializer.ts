import {
  cloneJson,
  jsonNumber,
  jsonString,
  objectEntry,
  setObjectNumber,
  stringifyLosslessJson,
  type JsonEntry,
  type JsonObject,
} from './losslessJson'
import { packFv, type DecorationInstance, type HideoutProject } from './types'

function decorationObject(decoration: DecorationInstance): JsonObject {
  const object = decoration.raw ? cloneJson(decoration.raw) : { kind: 'object' as const, entries: [] }
  if (decoration.gameHash !== undefined) setObjectNumber(object, 'hash', decoration.gameHash)
  setObjectNumber(object, 'x', decoration.x)
  setObjectNumber(object, 'y', decoration.y)
  setObjectNumber(object, 'r', decoration.rotation)
  const fv = packFv(decoration.variation, decoration.flipped)
  setObjectNumber(object, 'fv', fv)
  return object
}

function setRootPrimitive(root: JsonObject, key: string, value: string | number | undefined): void {
  if (value === undefined) return
  const existing = objectEntry(root, key)
  const node = typeof value === 'string' ? jsonString(value) : jsonNumber(value)
  if (existing) existing.value = node
  else {
    const doodadsIndex = root.entries.findIndex((entry) => entry.key === 'doodads')
    root.entries.splice(doodadsIndex < 0 ? root.entries.length : doodadsIndex, 0, { key, keyRaw: JSON.stringify(key), value: node })
  }
}

function serializeCurrent(project: HideoutProject): string {
  const root = project.raw.root ? cloneJson(project.raw.root) : { kind: 'object' as const, entries: [] }
  setRootPrimitive(root, 'version', project.metadata.version ?? 1)
  setRootPrimitive(root, 'language', project.metadata.language ?? 'English')
  setRootPrimitive(root, 'hideout_name', project.metadata.hideoutName)
  setRootPrimitive(root, 'hideout_hash', project.metadata.hideoutHash)
  setRootPrimitive(root, 'music_name', project.metadata.musicName)
  setRootPrimitive(root, 'music_hash', project.metadata.musicHash)
  let doodadsEntry = objectEntry(root, 'doodads')
  if (!doodadsEntry) {
    doodadsEntry = { key: 'doodads', keyRaw: '"doodads"', value: { kind: 'object', entries: [] } }
    root.entries.push(doodadsEntry)
  }
  const entries: JsonEntry[] = project.decorations.map((decoration) => ({
    key: decoration.name,
    keyRaw: JSON.stringify(decoration.name),
    value: decorationObject(decoration),
  }))
  entries.push(...project.raw.unmodeledDoodads.map((entry) => ({ ...entry, value: cloneJson(entry.value) })))
  doodadsEntry.value = { kind: 'object', entries }
  return `${project.raw.bom ? '\ufeff' : ''}${stringifyLosslessJson(root, project.raw.newline)}${project.raw.newline}`
}

function quoteLegacy(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}

function serializeLegacy(project: HideoutProject): string {
  const n = project.raw.newline
  const lines: string[] = []
  if (project.metadata.version !== undefined) lines.push(`Version = ${project.metadata.version}`)
  if (project.metadata.language !== undefined) lines.push(`Language = ${quoteLegacy(project.metadata.language)}`)
  if (project.metadata.hideoutName !== undefined) lines.push(`Hideout Name = ${quoteLegacy(project.metadata.hideoutName)}`)
  if (project.metadata.hideoutHash !== undefined) lines.push(`Hideout Hash = ${project.metadata.hideoutHash}`)
  if (project.metadata.musicName !== undefined) lines.push(`Music Name = ${quoteLegacy(project.metadata.musicName)}`)
  if (project.metadata.musicHash !== undefined) lines.push(`Music Hash = ${project.metadata.musicHash}`)
  for (const decoration of project.decorations) {
    lines.push(`${decoration.name} = { Hash=${decoration.gameHash ?? 0}, X=${decoration.x}, Y=${decoration.y}, Rot=${decoration.rotation}, Flip=${decoration.flipped ? 1 : 0}, Var=${decoration.variation} }`)
  }
  return `${project.raw.bom ? '\ufeff' : ''}${lines.join(n)}${n}`
}

export function serializeHideout(project: HideoutProject): string {
  return project.raw.format === 'legacy' ? serializeLegacy(project) : serializeCurrent(project)
}
