import { useMemo, useState } from 'react'
import type { DecorationInstance } from '../hideout/types'

interface Props {
  decorations: DecorationInstance[]
  selectedIds: Set<string>
  hiddenIds: Set<string>
  lockedIds: Set<string>
  onSelect: (ids: Set<string>) => void
  onToggleHidden: (id: string) => void
  onToggleLocked: (id: string) => void
}

export function ObjectList({ decorations, selectedIds, hiddenIds, lockedIds, onSelect, onToggleHidden, onToggleLocked }: Props) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => decorations.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())), [decorations, search])
  const counts = useMemo(() => new Map(decorations.map((item) => [item.name, decorations.filter((candidate) => candidate.name === item.name).length])), [decorations])
  return <aside className="objects panel">
    <h2>Placed Objects</h2>
    <input className="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search instances…" />
    <div className="object-list">
      {filtered.map((item) => <div key={item.editorId} className={`object-row ${selectedIds.has(item.editorId) ? 'selected' : ''}`} onClick={(event) => {
        const next = event.shiftKey ? new Set(selectedIds) : new Set<string>()
        if (event.shiftKey && next.has(item.editorId)) next.delete(item.editorId); else next.add(item.editorId)
        onSelect(next)
      }}>
        <button title="Hide/show" onClick={(event) => { event.stopPropagation(); onToggleHidden(item.editorId) }}>{hiddenIds.has(item.editorId) ? '○' : '●'}</button>
        <button title="Lock/unlock" onClick={(event) => { event.stopPropagation(); onToggleLocked(item.editorId) }}>{lockedIds.has(item.editorId) ? '🔒' : '·'}</button>
        <span title={item.name}>{item.name}</span><small>×{counts.get(item.name)}</small>
      </div>)}
    </div>
  </aside>
}
