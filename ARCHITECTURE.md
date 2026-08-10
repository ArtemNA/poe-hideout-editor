# Architecture

## File format

PoE 1's current `.hideout` format is a JSON-like object with duplicate keys permitted in `doodads`. That makes it **not safely representable by JavaScript's ordinary object model**. The parser therefore produces an ordered syntax tree made of object-entry arrays. Duplicate names, field order, unknown fields, numeric precision, BOM, and newline style survive a round trip.

The legacy line-oriented format is detected separately. Parsed projects record their source format so an unchanged legacy file can be exported in legacy syntax.

`r` is stored natively. UI degrees are a view over native rotation using `degrees = native * 360 / 65536`. Editing degrees converts only the changed value back to native units. `fv` is retained as the authoritative packed value and exposed as `variation = fv & 127`, `flipped = (fv & 128) !== 0`.

## Internal model

`HideoutProject` contains normalized metadata and a flat array of `DecorationInstance` values. Every instance receives an editor-only stable ID. It also owns a lossless raw document and unmodeled doodad entries. The UI edits normalized instances; it never treats Konva nodes as source of truth.

Editor-only groups, guides, locks, hidden state and camera are serialized to `.poehideoutproject` JSON. They are excluded from `.hideout` output.

## Parser / serializer strategy

1. Detect BOM, newline style and current-versus-legacy syntax.
2. Parse current syntax with a small recursive-descent JSON parser that stores object entries as arrays.
3. Normalize every object-valued `doodads` entry independently, including repeated names.
4. Preserve the raw object for every instance and all unknown/unmodeled entries.
5. On export, clone the raw tree, patch known fields from the normalized model, and serialize ordered entries. New instances receive canonical fields.
6. Validate before export; warnings do not block preservation, while non-finite coordinates or missing game identity are errors.

## Coordinate and canvas strategy

Game coordinates are the world-coordinate source of truth. Konva uses a camera transform (`stage position + scale`) and renders lightweight vector footprints. Y increases downward in both the raw examples and the initial canvas representation, so no unverified base-specific axis inversion is introduced. Optional calibrated backgrounds can later apply an explicit base transform.

Pointer-motion state stays inside Konva during a drag and commits one immutable project update at drag end. This prevents React rerenders and history spam on each pointer event.

## History

History stores bounded immutable project snapshots around semantic transactions. Drag, numeric edit, delete, duplicate, mirror, align and array generation each commit once. Selection and camera are ephemeral and do not pollute undo history.

## Modules

- `src/hideout`: lossless syntax tree, parser, serializer, validator, types.
- `src/editor`: geometry, transforms and immutable history.
- `src/project`: editor-project serialization and local persistence.
- `src/components`: desktop shell, canvas, inspector, library/object list and status UI.

## Safety rules

- Never call `JSON.parse` on a current `.hideout` document.
- Never synthesize or alter `hash` from a catalog name.
- Unknown decorations and fields remain editable/preservable.
- Export never overwrites the imported browser `File`; it creates a new download.
- If serialization fails, current editor state and autosave remain intact.
