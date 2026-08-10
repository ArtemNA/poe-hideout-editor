# Handoff for the agent receiving `Content.ggpk`

Read these files before taking action:

1. `Path of Exile Hideout Visual Editor.md`
2. `ARCHITECTURE.md`
3. `PROGRESS.md`
4. `docs/ASSET_PIPELINE_PLAN.md`

## User intent

The archive and extracted assets are for the user's private local editor. Nothing extracted should be committed, published, uploaded or bundled into the application.

## First response after receiving the file

Confirm or discover:

- absolute path to the supplied `Content.ggpk`;
- absolute path to a separate asset workspace;
- available free disk space;
- whether the archive came from standalone or Steam PoE 1;
- current game/build version if known.

Do not ask questions whose answers can be obtained safely from the local filesystem.

## Mandatory preflight

1. Resolve both paths to absolute paths.
2. Confirm the output is not:
   - the repository root;
   - the game installation directory;
   - the directory containing `Content.ggpk`;
   - a parent of the archive;
   - a broad directory such as a drive root or home directory.
3. Record input file size, last-write timestamp and SHA-256.
4. Check available disk space.
5. Add the local workspace path to a user-local configuration file that is ignored by Git.
6. Verify repository status before generating anything.
7. Update `PROGRESS.md` with the selected paths but do not record private usernames when avoidable.

## Extraction protocol

1. Start with archive listing only.
2. Select an existing reader based on actual compatibility.
3. Record the reader repository, version/commit and executable hash.
4. Extract one small representative file.
5. Re-hash `Content.ggpk` and confirm it did not change.
6. Extract only targeted hideout metadata and one decoration dependency chain.
7. Inspect the results.
8. Only then consider broader extraction.

## Never do

- Do not overwrite or rewrite `Content.ggpk`.
- Do not run GGPK compaction or patching.
- Do not extract into the repository.
- Do not use a recursive delete without resolving and verifying the exact asset-workspace path.
- Do not copy assets into `public/`, `dist/`, releases or test fixtures.
- Do not assume a model format from its extension.
- Do not bulk-convert thousands of files before one full decoration dependency chain works.
- Do not make the editor require assets to open or export `.hideout` files.

## Expected initial deliverables

After the first reconnaissance session, produce:

```text
<asset workspace>/reports/extraction-report.json
<asset workspace>/indexes/ggpk-files.json
<asset workspace>/reports/target-decoration-notes.md
```

And update repository documentation with:

- verified archive structure;
- chosen tooling;
- exact test decoration hash and variation;
- discovered source paths;
- unresolved format questions;
- the next narrow experiment.

## First technical target

Use one simple, static, non-animated decoration already represented in the development fixtures. A candidate may be chosen only after its hash resolves to actual archive metadata.

The first successful vertical slice is:

```text
.hideout hash + variation
  → catalog record
  → visual identity
  → model/material/texture dependencies
  → extracted local files
  → converted mesh/textures
  → transparent top-down sprite
  → displayed in the existing editor
```

## Progress discipline

At every milestone:

1. update `PROGRESS.md`;
2. record commands and tool versions;
3. add non-proprietary tests;
4. verify the original archive hash;
5. verify existing `.hideout` round-trip tests;
6. run the editor and visually inspect the change;
7. document failures instead of silently skipping assets.

## Completion boundary

The 2D stage is complete only when the editor can load the local asset catalog, show generated sprites for supported decorations, fall back safely for unsupported ones and still export a correct `.hideout` with the asset workspace disconnected.

The 3D stage begins only after that boundary is met.
