# PoE Hideout Visual Editor

A local-first 2D CAD-style editor for Path of Exile 1 `.hideout` layouts.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite. No backend, login, or cloud service is used.

## Production and tests

```bash
npm test
npm run build
```

## Implemented first usable workflow

- Import current JSON-like and legacy line-oriented `.hideout` files.
- Losslessly preserve duplicate decoration keys and unknown fields.
- Drag-and-drop, file picker, or raw-text import.
- Pan, cursor-centered zoom, grid, origin axes, fit view and world coordinates.
- Click, Shift+Click and marquee selection.
- Group movement by drag, keyboard nudging and exact numeric X/Y editing.
- Native and degree rotation fields without silently rounding untouched values.
- Duplicate, delete, mirror+duplicate, align, distribute, linear array and radial array.
- Undo/redo transactions.
- Instance search, hide and lock controls.
- IndexedDB autosave and `.poehideoutproject` save/open.
- Validated `.hideout` export that does not overwrite the source file.
- Developer raw-data panel for selected objects.

## Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+O | Open hideout/project |
| Ctrl+S | Save editor project |
| Ctrl+Shift+S | Export `.hideout` |
| Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y | Undo / redo |
| Ctrl+C / Ctrl+V / Ctrl+D | Copy / paste / duplicate |
| Delete | Delete unlocked selection |
| Ctrl+A | Select all visible objects |
| Escape | Clear selection |
| F | Fit selection, or all objects when selection is empty |
| Arrow / Shift+Arrow / Ctrl+Arrow | Move by 1 / 10 / 0.1 units |

## Format safety

Do not replace the parser with `JSON.parse`. Real PoE exports contain repeated property names inside `doodads`; standard parsing silently deletes earlier instances. See [ARCHITECTURE.md](./ARCHITECTURE.md) and [PROGRESS.md](./PROGRESS.md).

The private local-asset roadmap is documented in [docs/ASSET_PIPELINE_PLAN.md](./docs/ASSET_PIPELINE_PLAN.md). The checklist for the future agent receiving `Content.ggpk` is [docs/GGPK_AGENT_HANDOFF.md](./docs/GGPK_AGENT_HANDOFF.md).

## Known boundary

Automated tests verify semantic import/export round trips, including a real fixture with fourteen identical keys. Final acceptance still requires importing an exported file into a running PoE 1 client, which this repository cannot automate.
