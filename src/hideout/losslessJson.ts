export type JsonNode = JsonObject | JsonArray | JsonString | JsonNumber | JsonLiteral

export interface JsonEntry {
  key: string
  keyRaw: string
  value: JsonNode
}

export interface JsonObject {
  kind: 'object'
  entries: JsonEntry[]
}

export interface JsonArray {
  kind: 'array'
  items: JsonNode[]
}

export interface JsonString {
  kind: 'string'
  value: string
  raw: string
}

export interface JsonNumber {
  kind: 'number'
  value: number
  raw: string
}

export interface JsonLiteral {
  kind: 'literal'
  value: boolean | null
  raw: 'true' | 'false' | 'null'
}

export class LosslessJsonError extends Error {
  constructor(message: string, public readonly offset: number, source: string) {
    const before = source.slice(0, offset)
    const line = before.split(/\r\n|\r|\n/).length
    const lastBreak = Math.max(before.lastIndexOf('\n'), before.lastIndexOf('\r'))
    const column = offset - lastBreak
    super(`${message} at line ${line}, column ${column}`)
    this.name = 'LosslessJsonError'
  }
}

class Reader {
  private index = 0

  constructor(private readonly source: string) {}

  parse(): JsonNode {
    this.space()
    const value = this.value()
    this.space()
    if (this.index !== this.source.length) this.fail('Unexpected trailing input')
    return value
  }

  private value(): JsonNode {
    const char = this.source[this.index]
    if (char === '{') return this.object()
    if (char === '[') return this.array()
    if (char === '"') return this.string()
    if (char === '-' || (char >= '0' && char <= '9')) return this.number()
    if (this.source.startsWith('true', this.index)) return this.literal(true, 'true')
    if (this.source.startsWith('false', this.index)) return this.literal(false, 'false')
    if (this.source.startsWith('null', this.index)) return this.literal(null, 'null')
    this.fail('Expected a JSON value')
  }

  private object(): JsonObject {
    this.index++
    const entries: JsonEntry[] = []
    this.space()
    if (this.take('}')) return { kind: 'object', entries }
    while (true) {
      this.space()
      if (this.source[this.index] !== '"') this.fail('Expected an object property name')
      const keyNode = this.string()
      this.space()
      if (!this.take(':')) this.fail("Expected ':' after property name")
      this.space()
      entries.push({ key: keyNode.value, keyRaw: keyNode.raw, value: this.value() })
      this.space()
      if (this.take('}')) break
      if (!this.take(',')) this.fail("Expected ',' or '}'")
    }
    return { kind: 'object', entries }
  }

  private array(): JsonArray {
    this.index++
    const items: JsonNode[] = []
    this.space()
    if (this.take(']')) return { kind: 'array', items }
    while (true) {
      this.space()
      items.push(this.value())
      this.space()
      if (this.take(']')) break
      if (!this.take(',')) this.fail("Expected ',' or ']'")
    }
    return { kind: 'array', items }
  }

  private string(): JsonString {
    const start = this.index++
    let value = ''
    while (this.index < this.source.length) {
      const char = this.source[this.index++]
      if (char === '"') {
        return { kind: 'string', value, raw: this.source.slice(start, this.index) }
      }
      if (char === '\\') {
        const escaped = this.source[this.index++]
        const simple: Record<string, string> = {
          '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t',
        }
        if (escaped in simple) value += simple[escaped]
        else if (escaped === 'u') {
          const hex = this.source.slice(this.index, this.index + 4)
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) this.fail('Invalid Unicode escape')
          value += String.fromCharCode(Number.parseInt(hex, 16))
          this.index += 4
        } else this.fail('Invalid string escape')
      } else {
        if (char < ' ') this.fail('Unescaped control character in string')
        value += char
      }
    }
    this.fail('Unterminated string')
  }

  private number(): JsonNumber {
    const rest = this.source.slice(this.index)
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(rest)
    if (!match) this.fail('Invalid number')
    this.index += match[0].length
    const value = Number(match[0])
    if (!Number.isFinite(value)) this.fail('Number is outside the supported range')
    return { kind: 'number', value, raw: match[0] }
  }

  private literal(value: boolean | null, raw: JsonLiteral['raw']): JsonLiteral {
    this.index += raw.length
    return { kind: 'literal', value, raw }
  }

  private space(): void {
    while (/\s/.test(this.source[this.index] ?? '')) this.index++
  }

  private take(char: string): boolean {
    if (this.source[this.index] !== char) return false
    this.index++
    return true
  }

  private fail(message: string): never {
    throw new LosslessJsonError(message, this.index, this.source)
  }
}

export function parseLosslessJson(source: string): JsonNode {
  return new Reader(source).parse()
}

export function cloneJson<T extends JsonNode>(node: T): T {
  if (node.kind === 'object') {
    return { kind: 'object', entries: node.entries.map((entry) => ({ ...entry, value: cloneJson(entry.value) })) } as T
  }
  if (node.kind === 'array') return { kind: 'array', items: node.items.map(cloneJson) } as T
  return { ...node }
}

export function jsonString(value: string): JsonString {
  return { kind: 'string', value, raw: JSON.stringify(value) }
}

export function jsonNumber(value: number, raw = String(value)): JsonNumber {
  return { kind: 'number', value, raw }
}

export function objectEntry(object: JsonObject, key: string): JsonEntry | undefined {
  return object.entries.find((entry) => entry.key === key)
}

export function objectNumber(object: JsonObject, key: string): number | undefined {
  const value = objectEntry(object, key)?.value
  return value?.kind === 'number' ? value.value : undefined
}

export function objectString(object: JsonObject, key: string): string | undefined {
  const value = objectEntry(object, key)?.value
  return value?.kind === 'string' ? value.value : undefined
}

export function setObjectNumber(object: JsonObject, key: string, value: number): void {
  const existing = objectEntry(object, key)
  if (existing) {
    if (existing.value.kind === 'number' && Object.is(existing.value.value, value)) return
    existing.value = jsonNumber(value)
  } else {
    object.entries.push({ key, keyRaw: JSON.stringify(key), value: jsonNumber(value) })
  }
}

function indent(level: number, unit: string): string {
  return unit.repeat(level)
}

export function stringifyLosslessJson(node: JsonNode, newline = '\n', unit = '  ', level = 0): string {
  if (node.kind === 'string' || node.kind === 'number' || node.kind === 'literal') return node.raw
  if (node.kind === 'array') {
    if (node.items.length === 0) return '[]'
    const body = node.items.map((item) => `${indent(level + 1, unit)}${stringifyLosslessJson(item, newline, unit, level + 1)}`).join(`,${newline}`)
    return `[${newline}${body}${newline}${indent(level, unit)}]`
  }
  if (node.entries.length === 0) return '{}'
  const body = node.entries.map((entry) => `${indent(level + 1, unit)}${entry.keyRaw}: ${stringifyLosslessJson(entry.value, newline, unit, level + 1)}`).join(`,${newline}`)
  return `{${newline}${body}${newline}${indent(level, unit)}}`
}
