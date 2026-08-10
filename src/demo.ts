import { parseHideout } from './hideout/parser'
import type { HideoutProject } from './hideout/types'

export function createDemoProject(): HideoutProject {
  const doodads = [
    ['Stash', 3230065491, 0, 0, 0, 0],
    ['Waypoint', 1224707366, 80, 0, 8192, 1],
    ['Stone Pillar', 3766811383, -120, -80, 0, 0],
    ['Stone Pillar', 3766811383, 120, -80, 32768, 0],
    ['Torch', 3535134165, -120, 80, 16384, 0],
    ['Torch', 3535134165, 120, 80, 49152, 0],
    ...Array.from({ length: 12 }, (_, index) => {
      const angle = Math.PI * 2 * index / 12
      return ['Maraketh Rug', 2244942394, Math.round(Math.cos(angle) * 190), Math.round(Math.sin(angle) * 190), Math.round(65536 * index / 12), index % 4] as [string, number, number, number, number, number]
    }),
  ] as Array<[string, number, number, number, number, number]>
  const body = doodads.map(([name, hash, x, y, r, fv]) => `    ${JSON.stringify(name)}: {"hash": ${hash}, "x": ${x}, "y": ${y}, "r": ${r}, "fv": ${fv}}`).join(',\n')
  return parseHideout(`{\n  "version": 1,\n  "language": "English",\n  "hideout_name": "Demo Hideout",\n  "hideout_hash": 31968,\n  "doodads": {\n${body}\n  }\n}`).project
}
