import { useEffect, useState } from 'react'
import { nativeToDegrees, type DecorationInstance } from '../hideout/types'

interface Props {
  selected: DecorationInstance[]
  onPatch: (patch: Partial<DecorationInstance>) => void
}

function mixed(items: DecorationInstance[], key: keyof DecorationInstance): string {
  if (!items.length) return ''
  const first = items[0][key]
  return items.every((item) => Object.is(item[key], first)) ? String(first) : ''
}

function NumberField({ label, value, placeholder, onCommit, step = 1 }: { label: string; value: string; placeholder?: string; onCommit: (value: number) => void; step?: number }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return <label className="field"><span>{label}</span><input type="number" value={draft} placeholder={placeholder} step={step} onChange={(event) => setDraft(event.target.value)} onBlur={() => { const number = Number(draft); if (draft !== '' && Number.isFinite(number)) onCommit(number) }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} /></label>
}

export function Inspector({ selected, onPatch }: Props) {
  if (!selected.length) return <aside className="inspector panel"><h2>Inspector</h2><div className="empty-state">Select a decoration to edit exact values.</div></aside>
  const nativeRotation = mixed(selected, 'rotation')
  return <aside className="inspector panel">
    <h2>Inspector <span className="count">{selected.length}</span></h2>
    <div className="object-title">{selected.length === 1 ? selected[0].name : 'Multiple selection'}</div>
    <NumberField label="X" value={mixed(selected, 'x')} placeholder="Mixed" onCommit={(x) => onPatch({ x })} />
    <NumberField label="Y" value={mixed(selected, 'y')} placeholder="Mixed" onCommit={(y) => onPatch({ y })} />
    <NumberField label="Rotation native" value={nativeRotation} placeholder="Mixed" onCommit={(rotation) => onPatch({ rotation })} />
    <NumberField label="Rotation degrees" value={nativeRotation ? String(Number(nativeToDegrees(Number(nativeRotation)).toFixed(4))) : ''} placeholder="Mixed" step={0.1} onCommit={(degrees) => onPatch({ rotation: Math.round(degrees * 65536 / 360) })} />
    <NumberField label="Variation" value={mixed(selected, 'variation')} placeholder="Mixed" onCommit={(variation) => onPatch({ variation: Math.max(0, Math.round(variation)) })} />
    <label className="checkbox-row"><input type="checkbox" checked={selected.every((item) => item.flipped)} ref={(node) => { if (node) node.indeterminate = !selected.every((item) => item.flipped) && selected.some((item) => item.flipped) }} onChange={(event) => onPatch({ flipped: event.target.checked })} /> Flipped</label>
    {selected.length === 1 && <details className="debug"><summary>Debug / raw</summary><dl><dt>Editor ID</dt><dd>{selected[0].editorId}</dd><dt>Hash</dt><dd>{selected[0].gameHash ?? 'Unknown'}</dd><dt>Packed fv</dt><dd>{selected[0].fv}</dd><dt>Properties</dt><dd><pre>{JSON.stringify(selected[0].properties, null, 2)}</pre></dd></dl></details>}
  </aside>
}
