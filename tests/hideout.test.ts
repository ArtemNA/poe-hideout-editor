import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseHideout } from '../src/hideout/parser'
import { serializeHideout } from '../src/hideout/serializer'
import { validateHideout } from '../src/hideout/validator'

function fixture(name: string): string {
  return readFileSync(resolve('tests/fixtures', name), 'utf8')
}

function semantic(project: ReturnType<typeof parseHideout>['project']) {
  return {
    metadata: project.metadata,
    decorations: project.decorations.map(({ editorId: _editorId, raw: _raw, ...decoration }) => decoration),
  }
}

describe('hideout parser and serializer', () => {
  it.each(['real-stately-2023.hideout', 'real-stately-duplicates-2026.hideout', 'legacy-overgrown.hideout'])(
    'round trips %s semantically', (name) => {
      const first = parseHideout(fixture(name)).project
      const second = parseHideout(serializeHideout(first)).project
      expect(semantic(second)).toEqual(semantic(first))
      expect(validateHideout(second).filter((issue) => issue.severity === 'error')).toEqual([])
    },
  )

  it('preserves every duplicate-key decoration', () => {
    const source = fixture('real-stately-duplicates-2026.hideout')
    const parsed = parseHideout(source).project
    const shrines = parsed.decorations.filter((decoration) => decoration.name === "Tasuni's Shrine")
    expect(shrines.length).toBe(14)
    const reparsed = parseHideout(serializeHideout(parsed)).project
    expect(reparsed.decorations.filter((decoration) => decoration.name === "Tasuni's Shrine")).toHaveLength(14)
  })

  it('preserves unknown root and decoration fields', () => {
    const source = '{\n  "version": 1,\n  "hideout_name": "Test",\n  "hideout_hash": 1,\n  "future_root": {"x": 2},\n  "doodads": {\n    "Future": {"hash": 9, "x": 1, "y": 2, "r": 3, "fv": 131, "future": [1, 2]}\n  }\n}'
    const project = parseHideout(source).project
    expect(project.decorations[0]).toMatchObject({ variation: 3, flipped: true })
    const output = serializeHideout(project)
    expect(output).toContain('"future_root"')
    expect(output).toContain('"future"')
  })

  it('reports useful line information for malformed input', () => {
    expect(() => parseHideout('{\n "doodads": { nope }\n}')).toThrow(/line 2, column/)
  })
})
