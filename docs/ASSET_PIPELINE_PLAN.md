# Local PoE Asset Pipeline Plan

Status: planning document for a private, local-only workflow.

## Objective

Extend the existing 2D hideout editor with visual assets generated locally from the user's own Path of Exile 1 installation.

The work is deliberately divided into two stages:

1. A practical 2D top-down asset pipeline.
2. An optional approximate 3D preview.

Visual identity with the game renderer is not required. File-format correctness, stable decoration mapping and editor usability remain more important than rendering accuracy.

## Non-negotiable rules

- Never commit extracted game files, converted assets or caches to Git.
- Never place extracted files under `src/` or `public/`.
- Do not modify the supplied `Content.ggpk`.
- Treat the supplied archive as read-only.
- Extraction must go into a separate user-selected directory.
- Do not require a backend or cloud service.
- Do not upload extracted assets anywhere.
- The editor must continue working when the local asset cache is absent.
- Unknown or failed assets must fall back to the current footprint/marker rendering.
- Record hashes, file sizes and extraction tool versions for reproducibility.

## Proposed directories

The repository contains only code and manifests:

```text
project_14/
  src/
  tools/
    asset-pipeline/
  docs/
  asset-workspace.example.json
```

Large local data must live outside the repository:

```text
<user-selected asset workspace>/
  input/
    Content.ggpk
  extracted/
    raw/
  indexes/
    ggpk-files.json
    decorations.json
    dependencies.json
  converted/
    textures/
    meshes/
    materials/
  generated/
    sprites/
    thumbnails/
    footprints/
  cache/
  reports/
    extraction-report.json
    unresolved-assets.json
    conversion-errors.json
```

Recommended example on Windows:

```text
C:\PoEHideoutAssets\
```

The actual path must be configurable. No code may assume that exact location.

## Stage 0 — Archive reconnaissance

### Goal

Prove that the supplied archive can be read safely and determine its actual structure before bulk extraction.

### Tasks

1. Ask the user for the absolute path to `Content.ggpk` and a separate output directory.
2. Confirm that input and output are different resolved paths.
3. Record archive size, modification time and SHA-256 hash.
4. Identify the archive generation and contained bundle layout.
5. Evaluate existing readers before writing custom extraction logic:
   - `ex-nihil/ggpk`;
   - `VisualGGPK2`;
   - PyPoE-related readers;
   - another maintained reader if it demonstrably supports the supplied PoE 1 build.
6. List archive contents without extracting everything.
7. Find representative files from these categories:
   - `Data/HideoutDoodads` tables;
   - visual identity and metadata records;
   - one simple static decoration model;
   - its textures and material references;
   - one decoration with multiple variations;
   - one animated or effect-based decoration;
   - one hideout base.
8. Produce `reports/extraction-report.json`.

### Safety checks

- Extraction tools get the archive path as an input-only argument.
- Never run in-place compaction, replacement or patch operations.
- Check free disk space before bulk extraction.
- If a tool supports both reading and writing GGPK archives, use only list/read/extract operations.
- Stop if the tool attempts to update or rewrite the archive.

### Done when

- Archive listing succeeds.
- At least one small file can be extracted and hashed.
- The original archive hash is unchanged.
- The chosen reader and its exact version are documented.

## Stage 1 — Decoration identity database

### Goal

Build the stable mapping used by both 2D and 3D modes.

### Target record

```ts
interface LocalDecorationAssetRecord {
  gameHash: number;
  names: Record<string, string>;
  variation: number;

  sourceRows: Array<{
    table: string;
    row: number | string;
  }>;

  visualIdentity?: string;
  modelPaths: string[];
  materialPaths: string[];
  texturePaths: string[];
  animationPaths: string[];
  effectPaths: string[];

  renderability:
    | "static-mesh"
    | "animated-mesh"
    | "effect-only"
    | "composite"
    | "unknown";

  diagnostics: string[];
}
```

### Tasks

1. Parse the relevant DAT/DAT64 tables.
2. Locate the row or identity represented by each `.hideout` decoration `hash`.
3. Resolve localized name separately from identity.
4. Enumerate variation values without imposing guessed limits.
5. Follow references to visual identity, models, materials and textures.
6. Preserve unresolved references instead of dropping the record.
7. Generate `indexes/decorations.json` and `indexes/dependencies.json`.
8. Add a CLI diagnostic:

```text
poe-assets inspect-decoration --hash 3766811383 --variation 0
```

### Critical requirement

Never use the localized decoration name as the primary asset key. The authoritative join key is the game hash plus variation and any verified visual identity references.

### Done when

- Imported fixtures resolve most ordinary decoration hashes to catalog records.
- Duplicate instances map to one catalog entry but remain separate editor objects.
- Variation 0 and at least one non-zero variation resolve correctly.
- An unresolved decoration produces a useful report and a safe editor fallback.

# Part I — 2D top-down assets

## Stage 2 — Minimal conversion proof

### Goal

Render one simple static decoration into a transparent top-down image.

### Tasks

1. Extract the selected model and only its transitive dependencies.
2. Decode its geometry or convert it to an intermediate format such as glTF.
3. Decode DDS textures to a renderable format.
4. Implement a minimal material approximation:
   - base color;
   - alpha mask/blending;
   - normal map when available;
   - emissive map when available;
   - safe defaults for unknown channels.
5. Render with a fixed orthographic top-down camera.
6. Produce transparent WebP and PNG variants.
7. Record the world-space bounds and image-to-game-unit scale.

### Output manifest

```ts
interface GeneratedSpriteManifest {
  gameHash: number;
  variation: number;
  image: string;
  widthPixels: number;
  heightPixels: number;
  worldWidth: number;
  worldHeight: number;
  anchorX: number;
  anchorY: number;
  generationVersion: string;
  warnings: string[];
}
```

### Done when

- The image has a transparent background.
- Rotation around the chosen anchor behaves correctly in the editor.
- The asset footprint approximately matches its visible bounds.
- Missing material features produce warnings rather than failure.

## Stage 3 — Automated 2D generator

### Goal

Generate reusable sprites for every decoration that can be represented reliably enough.

### Tasks

1. Create a resumable queue keyed by asset hash and variation.
2. Skip outputs whose source dependency hashes have not changed.
3. Render standard views:
   - top-down sprite;
   - small library thumbnail;
   - optional debug perspective thumbnail.
4. Generate footprints and anchors from mesh bounds.
5. Detect empty, fully transparent, clipped and obviously broken output.
6. Store per-asset warnings.
7. Limit concurrency to avoid exhausting RAM or VRAM.
8. Make cancellation safe; already completed results must remain usable.
9. Generate a compact runtime catalog containing only metadata and paths.

### Rendering conventions

- Orthographic camera.
- Transparent background.
- Stable neutral lighting.
- Stable world-to-pixel scale across decorations when practical.
- Preserve the model origin in metadata even when the sprite is tightly cropped.
- Do not bake `.hideout` instance rotation into the sprite.
- Generate separate files for verified variations.

### Failure categories

```text
unsupported-model
missing-texture
missing-material
empty-render
effect-only
animated-only
composite-unresolved
unknown-format
conversion-crash
```

## Stage 4 — Editor integration for 2D

### Goal

Add real-asset visualization without weakening the existing editor.

### Tasks

1. Introduce a pluggable asset provider:

```ts
interface DecorationAssetProvider {
  getSprite(gameHash: number, variation: number): Promise<SpriteAsset | undefined>;
  getFootprint(gameHash: number, variation: number): Promise<Footprint | undefined>;
  getThumbnail(gameHash: number, variation: number): Promise<string | undefined>;
}
```

2. Add editor visualization modes:
   - markers;
   - footprints;
   - generated sprites;
3. Load images lazily and release unused textures.
4. Keep selection hit testing independent from transparent pixels where necessary.
5. Apply `.hideout` rotation at instance render time.
6. Apply the verified flip bit at instance render time.
7. Show a visible fallback when a sprite is unavailable.
8. Add an asset diagnostics panel.
9. Add an asset workspace picker in settings.
10. Never write extracted assets into the browser build output.

### Performance targets

- 2,000 instances remain navigable.
- Use sprite texture reuse for identical hash/variation pairs.
- Do not decode the same image once per instance.
- Use level-of-detail behavior: thumbnails or markers at distant zoom levels.
- Avoid React rerenders during pan and drag.

### 2D acceptance test

1. Import a real `.hideout` file.
2. Resolve at least 80% of ordinary static decoration instances.
3. Render the same decoration many times using one cached texture.
4. Confirm correct rotation and flip for known test objects.
5. Confirm variations produce different sprites where expected.
6. Confirm missing assets fall back to markers.
7. Export a semantically identical `.hideout`; visual metadata must not leak into it.

# Part II — approximate 3D preview

Begin 3D only after the 2D identity database and dependency graph are stable.

## Stage 5 — Static 3D prototype

### Goal

Display a small set of converted static decorations in a Three.js scene.

### Tasks

1. Reuse the exact catalog and dependency mapping from the 2D pipeline.
2. Convert supported meshes to glTF/GLB.
3. Store external texture references or pack them predictably.
4. Create approximate PBR materials.
5. Load models with instancing for repeated decorations.
6. Apply game coordinates, native rotation and flip.
7. Add orbit and top-down cameras.
8. Add object picking synchronized with the 2D selection model.
9. Keep the normalized hideout project as the source of truth.

### Explicit exclusions

- No requirement to match the PoE renderer.
- No shader reverse-engineering milestone.
- No requirement to support every particle effect.
- No requirement to reproduce global illumination or post-processing.

### Done when

- 20 representative static decorations render with acceptable geometry and textures.
- Repeated decorations use instanced rendering.
- Moving or rotating in 2D immediately updates 3D and vice versa.
- Unsupported objects use bounding boxes or billboards.

## Stage 6 — Base hideout preview

### Goal

Provide useful spatial context, not an exact game-level recreation.

### Tasks

1. Investigate one hideout base only.
2. Resolve its static geometry and primary materials.
3. Establish a verified transform between base geometry and `.hideout` coordinates.
4. Record origin, axis directions, unit scale and rotation offset.
5. Support user calibration when automatic resolution is uncertain.
6. Render simplified collision/walkable boundaries if full geometry is unavailable.

### Stop condition

Do not generalize to every base until one base has a repeatable, documented coordinate transform.

## Stage 7 — Optional advanced visuals

Implement only features with a clear usability benefit:

- simple skeletal animation playback;
- emissive materials;
- alpha-tested vegetation;
- billboard approximations for particle effects;
- simple animated textures;
- base-specific lighting presets.

Effects that cannot be decoded reliably should use a labeled proxy, not silently disappear.

## 3D acceptance test

1. Open a real project with several hundred instances.
2. Show supported models and explicit proxies for unsupported ones.
3. Maintain interactive navigation on the target machine.
4. Verify coordinates and rotation against known placements.
5. Confirm that 3D mode cannot alter game hashes or unknown raw fields accidentally.
6. Confirm `.hideout` export remains covered by the existing round-trip tests.

## Suggested implementation stack

The choice must be validated against the supplied archive rather than fixed prematurely.

Likely components:

- GGPK/bundle reader: existing maintained tool or a wrapped library.
- Metadata extraction: Python, Rust or TypeScript CLI depending on best-supported parser.
- Texture conversion: DirectXTex/`texconv` or another local DDS decoder.
- Intermediate model format: glTF/GLB.
- Offline rendering: Blender CLI, Three.js with headless capture, or a small native renderer.
- Browser 3D: Three.js.
- Browser 2D: existing Konva canvas.

Blender is attractive for early conversion experiments because it offers robust import, scripting, orthographic rendering and bounds inspection. A custom headless renderer is preferable only after the model/material mapping is understood.

## Testing strategy

### Unit tests

- hash/variation catalog lookup;
- dependency graph traversal;
- path normalization and traversal prevention;
- manifest parsing;
- coordinate and rotation conversion;
- sprite anchor math;
- cache invalidation.

### Fixture tests

- one static mesh;
- one alpha-tested decoration;
- one emissive decoration;
- one multi-variation decoration;
- one composite decoration;
- one effect-only decoration;
- one unresolved decoration.

Do not commit proprietary fixture content. Tests should use tiny synthetic equivalents or hashes/manifests without the underlying game bytes.

### Integration tests

- archive list without mutation;
- targeted extraction;
- incremental rebuild;
- corrupted dependency handling;
- cancellation and resume;
- editor fallback when cache is moved or deleted.

## Order of work

```text
Archive reconnaissance
  → decoration identity database
  → one static asset extraction
  → one top-down sprite
  → automated 2D generator
  → 2D editor integration
  → 2D validation on real hideouts
  → static 3D prototype
  → one base calibration
  → optional advanced visuals
```

Do not start bulk extraction, bulk conversion or full 3D before the preceding narrow proof succeeds.
