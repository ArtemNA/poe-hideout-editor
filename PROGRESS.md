# Development progress

Last updated: 2026-08-10

## Current milestone

First usable browser release implemented; in-game import acceptance remains external.

## Verified findings

- Current PoE 1 exports use a JSON-like version 1 document.
- Top-level fields observed: `version`, `language`, `hideout_name`, `hideout_hash`, optional `music_name`, optional `music_hash`, and `doodads`.
- `doodads` is an object whose property names are localized decoration names.
- Duplicate property names are legal and common inside `doodads`. Standard `JSON.parse` is unsafe because it silently discards all but the last duplicate.
- Observed decoration fields are `hash`, `x`, `y`, `r`, and `fv`; unknown fields must be retained.
- Rotation is an unsigned 16-bit turn: 65,536 native units = 360 degrees; 8,192 = 45 degrees and 16,384 = 90 degrees.
- The packed `fv` byte stores variation in the low seven bits and flip in bit 7: `fv = variation + (flip ? 128 : 0)`. A documented real example maps 131 to Flip=1, Var=3.
- Older exports used a line-oriented `Name = { Hash=…, X=…, Y=…, Rot=…, Flip=…, Var=… }` syntax. It remains a compatibility target.
- No object-scale field was observed in the researched PoE 1 fixtures.

## Sources / fixtures

- GGG forum discussion showing old and current syntax: https://www.pathofexile.com/forum/view-thread/3036044
- GGG forum example confirming `fv=131` means Flip=1, Var=3: https://www.pathofexile.com/forum/view-thread/2542497/page/6
- Real 2023 Stately Hideout export: https://gist.github.com/AndreVallestero/3a39bcd4169654f1ae34bb2a4495d5ab
- Real 2026 Stately Hideout export with repeated `Tasuni's Shrine` keys: https://gist.github.com/AltimorTASDK/a46946ce8c7d3e6e4fa75d27e5848b56
- Real 2021 Eclipsed Hideout export with hundreds of duplicates and varied `fv`: https://gist.github.com/madjar/52251190c3e9a0e899da6ea750e8f08b

## Work log

- [x] Inspected the initially empty workspace and read the specification.
- [x] Researched real current and legacy files.
- [x] Identified duplicate-key data-loss hazard.
- [x] Chosen React + TypeScript + Vite + Konva architecture.
- [x] Implement lossless ordered JSON parser.
- [x] Implement normalized model, serializer and validator.
- [x] Add two real current fixtures, a legacy fixture and synthetic edge cases.
- [x] Pass round-trip, geometry and history tests (10 tests).
- [x] Build functional canvas editor with pan, zoom, grid, selection and marquee.
- [x] Add exact editing, multi-drag, keyboard movement, duplicate and delete.
- [x] Add transactional undo/redo.
- [x] Add mirror+duplicate, align, distribute, linear and radial arrays.
- [x] Add object search, locking/hiding, project files and IndexedDB autosave.
- [x] Verify the production build and browser smoke-test the main workflow.
- [ ] Smoke-test an exported file inside the Path of Exile 1 client.

## Latest verification

- `npm test`: 3 test files, 10 tests passed.
- `npm run build`: TypeScript and Vite production build passed.
- Browser smoke test: demo rendered correctly; selection → duplicate changed 18 to 19 objects; undo returned to 18; no console errors.

## Local game-asset roadmap

- [x] Added a staged private/local-only plan for generated 2D assets and approximate 3D preview.
- [x] Added a safety and handoff checklist for the future agent receiving `Content.ggpk`.
- [x] Defined a repository-independent asset workspace and Git exclusions.
- [ ] Receive the user's `Content.ggpk` and perform read-only archive reconnaissance.

Planning documents:

- `docs/ASSET_PIPELINE_PLAN.md`
- `docs/GGPK_AGENT_HANDOFF.md`
- `asset-workspace.example.json`

## Explicit assumptions / open verification

- Field ordering appears non-semantic to the game, but the serializer preserves it for unchanged fields.
- Native rotation values observed are integer values in the 0…65,535 range. The editor normalizes generated values to that range but preserves imported numeric lexemes until edited.
- Comments have not been observed and strict JSON syntax does not support them. The parser reports them as errors instead of guessing.
- Exact encoding and newline style vary by source. Import detects a UTF-8 BOM and CRLF/LF; export preserves both.
- Successful import back into the game must still be smoke-tested by a user with PoE 1; automated tests can establish structural/semantic round trips but cannot execute the game importer.
