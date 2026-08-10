import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EditorCanvas } from './components/EditorCanvas'
import { Inspector } from './components/Inspector'
import { ObjectList } from './components/ObjectList'
import { alignDecorations, distributeDecorations, linearArray, mirrorDecorations, moveDecorations, radialArray } from './editor/transforms'
import { commitHistory, createHistory, redoHistory, undoHistory, type HistoryState } from './editor/history'
import { boundsOf } from './editor/geometry'
import { createDemoProject } from './demo'
import { parseHideout } from './hideout/parser'
import { serializeHideout } from './hideout/serializer'
import { normalizeNativeRotation, type DecorationInstance, type HideoutProject } from './hideout/types'
import { validateHideout } from './hideout/validator'
import { loadAutosave, parseEditorProject, saveAutosave, serializeEditorProject } from './project/projectStorage'

function download(name: string, content: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function fileStem(project: HideoutProject): string {
  return (project.metadata.hideoutName || 'hideout').replace(/[<>:"/\\|?*]+/g, '-').trim() || 'hideout'
}

export function App() {
  const [history, setHistory] = useState<HistoryState<HideoutProject>>(() => createHistory(createDemoProject()))
  const project = history.present
  const [selectedIds, setSelectedIds] = useState(new Set<string>())
  const [camera, setCamera] = useState({ x: 400, y: 300, scale: 1 })
  const [gridSize, setGridSize] = useState(10)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [cursor, setCursor] = useState<{ x: number; y: number }>()
  const [fitSignal, setFitSignal] = useState(1)
  const [message, setMessage] = useState('Demo project loaded')
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const projectFileRef = useRef<HTMLInputElement>(null)
  const clipboard = useRef<DecorationInstance[]>([])

  const commit = useCallback((update: (project: HideoutProject) => HideoutProject, status?: string) => {
    setHistory((current) => commitHistory(current, update(current.present)))
    if (status) setMessage(status)
  }, [])

  const hiddenIds = useMemo(() => new Set(project.editorState.hiddenIds), [project.editorState.hiddenIds])
  const lockedIds = useMemo(() => new Set(project.editorState.lockedIds), [project.editorState.lockedIds])
  const selected = useMemo(() => project.decorations.filter((item) => selectedIds.has(item.editorId)), [project.decorations, selectedIds])
  const uniqueTypes = useMemo(() => new Set(project.decorations.map((item) => item.name)).size, [project.decorations])

  useEffect(() => {
    loadAutosave().then((saved) => {
      if (saved) {
        setHistory(createHistory(saved))
        setCamera(saved.editorState.camera)
        setMessage('Autosave restored')
      }
    }).catch(() => setMessage('Autosave unavailable; editing remains local in this tab'))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => saveAutosave({ ...project, editorState: { ...project.editorState, camera } }).then(() => setMessage((current) => current.includes('failed') ? current : 'Autosaved locally')).catch(() => setMessage('Autosave failed; use Save Project')), 700)
    return () => clearTimeout(timer)
  }, [project, camera])

  const openSource = useCallback((source: string, fileName = 'file') => {
    try {
      const { project: next, warnings } = parseHideout(source)
      setHistory(createHistory(next))
      setSelectedIds(new Set())
      setFitSignal((value) => value + 1)
      setMessage(`Imported ${next.decorations.length} decorations from ${fileName}${warnings.length ? ` · ${warnings.length} warning(s)` : ''}`)
      setPasteOpen(false)
    } catch (error) {
      setMessage(`Import failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [])

  const openFile = async (file?: File) => {
    if (!file) return
    const source = await file.text()
    if (file.name.endsWith('.poehideoutproject')) {
      try {
        const next = parseEditorProject(source)
        setHistory(createHistory(next)); setSelectedIds(new Set()); setCamera(next.editorState.camera); setFitSignal((value) => value + 1)
        setMessage(`Opened editor project ${file.name}`)
      } catch (error) { setMessage(`Project open failed: ${error instanceof Error ? error.message : String(error)}`) }
    } else openSource(source, file.name)
  }

  const patchSelected = (patch: Partial<DecorationInstance>) => commit((current) => ({
    ...current,
    decorations: current.decorations.map((item) => selectedIds.has(item.editorId) && !lockedIds.has(item.editorId) ? { ...item, ...patch } : item),
  }), `Updated ${selectedIds.size} decoration(s)`)

  const duplicate = useCallback((offset = 10) => {
    const now = Date.now()
    const clones = project.decorations.filter((item) => selectedIds.has(item.editorId)).map((item, index) => ({ ...item, editorId: `${item.editorId}-copy-${now}-${index}`, x: item.x + offset, y: item.y + offset }))
    if (!clones.length) return
    commit((current) => ({ ...current, decorations: [...current.decorations, ...clones] }), `Duplicated ${clones.length} decoration(s)`)
    setSelectedIds(new Set(clones.map((item) => item.editorId)))
  }, [commit, project.decorations, selectedIds])

  const removeSelected = useCallback(() => {
    const removable = new Set([...selectedIds].filter((id) => !lockedIds.has(id)))
    if (!removable.size) return
    commit((current) => ({ ...current, decorations: current.decorations.filter((item) => !removable.has(item.editorId)) }), `Deleted ${removable.size} decoration(s)`)
    setSelectedIds(new Set())
  }, [commit, lockedIds, selectedIds])

  const nudge = useCallback((dx: number, dy: number) => {
    const movable = new Set([...selectedIds].filter((id) => !lockedIds.has(id)))
    if (movable.size) commit((current) => ({ ...current, decorations: moveDecorations(current.decorations, movable, dx, dy) }), `Moved ${movable.size} decoration(s)`)
  }, [commit, lockedIds, selectedIds])

  const copy = useCallback(() => {
    clipboard.current = project.decorations.filter((item) => selectedIds.has(item.editorId)).map((item) => ({ ...item }))
    setMessage(`Copied ${clipboard.current.length} decoration(s)`)
    navigator.clipboard?.writeText(JSON.stringify({ type: 'poe-hideout-decorations', decorations: clipboard.current })).catch(() => undefined)
  }, [project.decorations, selectedIds])

  const paste = useCallback(() => {
    if (!clipboard.current.length) return
    const now = Date.now()
    const clones = clipboard.current.map((item, index) => ({ ...item, editorId: `${item.editorId}-paste-${now}-${index}`, x: item.x + 20, y: item.y + 20 }))
    commit((current) => ({ ...current, decorations: [...current.decorations, ...clones] }), `Pasted ${clones.length} decoration(s)`)
    setSelectedIds(new Set(clones.map((item) => item.editorId)))
  }, [commit])

  const exportHideout = useCallback(() => {
    const issues = validateHideout(project)
    const errors = issues.filter((issue) => issue.severity === 'error')
    if (errors.length) { setMessage(`Export blocked: ${errors[0].message} (${errors.length} error(s))`); return }
    try {
      download(`${fileStem(project)}-edited.hideout`, serializeHideout(project), 'application/octet-stream')
      setMessage(`Exported ${project.decorations.length} decorations · ${issues.length} warning(s)`)
    } catch (error) { setMessage(`Export failed safely: ${error instanceof Error ? error.message : String(error)}`) }
  }, [project])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      const ctrl = event.ctrlKey || event.metaKey
      if (ctrl && event.key.toLowerCase() === 'z') { event.preventDefault(); setHistory((current) => event.shiftKey ? redoHistory(current) : undoHistory(current)); return }
      if (ctrl && event.key.toLowerCase() === 'y') { event.preventDefault(); setHistory(redoHistory); return }
      if (ctrl && event.key.toLowerCase() === 'a') { event.preventDefault(); setSelectedIds(new Set(project.decorations.filter((item) => !hiddenIds.has(item.editorId)).map((item) => item.editorId))); return }
      if (ctrl && event.key.toLowerCase() === 'c') { event.preventDefault(); copy(); return }
      if (ctrl && event.key.toLowerCase() === 'v') { event.preventDefault(); paste(); return }
      if (ctrl && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicate(); return }
      if (ctrl && event.shiftKey && event.key.toLowerCase() === 's') { event.preventDefault(); exportHideout(); return }
      if (ctrl && event.key.toLowerCase() === 's') { event.preventDefault(); download(`${fileStem(project)}.poehideoutproject`, serializeEditorProject({ ...project, editorState: { ...project.editorState, camera } })); setMessage('Editor project saved'); return }
      if (ctrl && event.key.toLowerCase() === 'o') { event.preventDefault(); fileRef.current?.click(); return }
      if (event.key === 'Delete') { event.preventDefault(); removeSelected(); return }
      if (event.key === 'Escape') { setSelectedIds(new Set()); return }
      if (event.key.toLowerCase() === 'f') { setFitSignal((value) => value + 1); return }
      const step = event.shiftKey ? 10 : event.ctrlKey ? 0.1 : 1
      if (event.key === 'ArrowLeft') { event.preventDefault(); nudge(-step, 0) }
      if (event.key === 'ArrowRight') { event.preventDefault(); nudge(step, 0) }
      if (event.key === 'ArrowUp') { event.preventDefault(); nudge(0, -step) }
      if (event.key === 'ArrowDown') { event.preventDefault(); nudge(0, step) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [camera, copy, duplicate, exportHideout, hiddenIds, nudge, paste, project, removeSelected])

  const mirror = (axis: 'horizontal' | 'vertical', duplicateSelection = true) => {
    const movable = new Set([...selectedIds].filter((id) => !lockedIds.has(id)))
    if (!movable.size) return
    commit((current) => ({ ...current, decorations: mirrorDecorations(current.decorations, movable, axis, undefined, duplicateSelection) }), `${duplicateSelection ? 'Duplicated and mirrored' : 'Mirrored'} ${movable.size} decoration(s)`)
  }

  const align = (mode: Parameters<typeof alignDecorations>[2]) => commit((current) => ({ ...current, decorations: alignDecorations(current.decorations, selectedIds, mode) }), `Aligned ${selectedIds.size} decoration(s)`)

  const createLinear = () => {
    const copies = Number(window.prompt('Number of additional copies', '5'))
    const dx = Number(window.prompt('X spacing', '25'))
    const dy = Number(window.prompt('Y spacing', '0'))
    if (![copies, dx, dy].every(Number.isFinite) || copies < 1) return
    const additions = linearArray(selected, Math.floor(copies), { x: dx, y: dy })
    commit((current) => ({ ...current, decorations: [...current.decorations, ...additions] }), `Created linear array with ${additions.length} new decoration(s)`)
    setSelectedIds(new Set(additions.map((item) => item.editorId)))
  }

  const createRadial = () => {
    const copies = Number(window.prompt('Total copies around the circle', '12'))
    if (!Number.isFinite(copies) || copies < 2 || !selected.length) return
    const b = boundsOf(selected)
    const additions = radialArray(selected, Math.floor(copies), { x: b.centerX, y: b.centerY }, true)
    commit((current) => ({ ...current, decorations: [...current.decorations, ...additions] }), `Created radial array with ${additions.length} new decoration(s)`)
    setSelectedIds(new Set(additions.map((item) => item.editorId)))
  }

  const toggleEditorSet = (field: 'hiddenIds' | 'lockedIds', id: string) => commit((current) => {
    const values = new Set(current.editorState[field]); values.has(id) ? values.delete(id) : values.add(id)
    return { ...current, editorState: { ...current.editorState, [field]: [...values] } }
  })

  const validation = validateHideout(project)
  return <main className="app" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void openFile(event.dataTransfer.files[0]) }}>
    <input ref={fileRef} type="file" accept=".hideout,.poehideoutproject" hidden onChange={(event) => void openFile(event.target.files?.[0])} />
    <input ref={projectFileRef} type="file" accept=".poehideoutproject" hidden onChange={(event) => void openFile(event.target.files?.[0])} />
    <header className="titlebar"><div><strong>PoE Hideout</strong><span>Visual Editor</span></div><div className="document-name">{project.metadata.hideoutName ?? 'Untitled'} <small>{project.raw.format}</small></div></header>
    <nav className="menubar">
      <div className="tool-group"><button onClick={() => fileRef.current?.click()}>Open</button><button onClick={() => setPasteOpen(true)}>Paste raw</button><button onClick={() => download(`${fileStem(project)}.poehideoutproject`, serializeEditorProject({ ...project, editorState: { ...project.editorState, camera } }))}>Save project</button><button className="primary" onClick={exportHideout}>Export .hideout</button></div>
      <div className="tool-group"><button disabled={!history.past.length} onClick={() => setHistory(undoHistory)}>Undo</button><button disabled={!history.future.length} onClick={() => setHistory(redoHistory)}>Redo</button><button onClick={() => duplicate()}>Duplicate</button><button onClick={removeSelected}>Delete</button></div>
      <div className="tool-group"><button onClick={() => mirror('vertical')}>Mirror ↔</button><button onClick={() => mirror('horizontal')}>Mirror ↕</button><button onClick={() => align('left')}>Align L</button><button onClick={() => align('center-x')}>Center X</button><button onClick={() => align('top')}>Align T</button><button onClick={() => commit((current) => ({ ...current, decorations: distributeDecorations(current.decorations, selectedIds, 'x') }), 'Distributed horizontally')}>Distribute X</button></div>
      <div className="tool-group"><button onClick={createLinear}>Linear array</button><button onClick={createRadial}>Radial array</button><button onClick={() => setFitSignal((value) => value + 1)}>Fit</button></div>
    </nav>
    <section className="workspace">
      <ObjectList decorations={project.decorations} selectedIds={selectedIds} hiddenIds={hiddenIds} lockedIds={lockedIds} onSelect={setSelectedIds} onToggleHidden={(id) => toggleEditorSet('hiddenIds', id)} onToggleLocked={(id) => toggleEditorSet('lockedIds', id)} />
      <EditorCanvas decorations={project.decorations} selectedIds={selectedIds} hiddenIds={hiddenIds} lockedIds={lockedIds} camera={camera} gridSize={gridSize} snapEnabled={snapEnabled} onCameraChange={setCamera} onSelectionChange={setSelectedIds} onMove={(ids, dx, dy) => commit((current) => ({ ...current, decorations: moveDecorations(current.decorations, ids, dx, dy) }), `Moved ${ids.size} decoration(s)`)} onCursor={setCursor} fitSignal={fitSignal} />
      <Inspector selected={selected} onPatch={patchSelected} />
    </section>
    <footer className="statusbar"><span>{project.decorations.length} decorations · {uniqueTypes} types · {selectedIds.size} selected</span><span>{message}</span><span className={validation.some((issue) => issue.severity === 'error') ? 'error' : ''}>{validation.filter((issue) => issue.severity === 'error').length} errors · {validation.filter((issue) => issue.severity === 'warning').length} warnings</span><label>Grid <select value={gridSize} onChange={(event) => setGridSize(Number(event.target.value))}>{[1, 2, 5, 10, 25, 50, 100].map((value) => <option key={value}>{value}</option>)}</select></label><label><input type="checkbox" checked={snapEnabled} onChange={(event) => setSnapEnabled(event.target.checked)} /> Snap</label><span>{cursor ? `X ${cursor.x.toFixed(1)} · Y ${cursor.y.toFixed(1)}` : 'X — · Y —'}</span><span>{Math.round(camera.scale * 100)}%</span></footer>
    {pasteOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPasteOpen(false) }}><section className="modal"><h2>Paste raw .hideout text</h2><textarea autoFocus value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder="Paste the entire exported file here…" /><div><button onClick={() => setPasteOpen(false)}>Cancel</button><button className="primary" onClick={() => openSource(pasteText, 'pasted text')}>Import</button></div></section></div>}
  </main>
}
