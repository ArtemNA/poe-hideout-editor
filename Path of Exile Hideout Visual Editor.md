# Path of Exile Hideout Visual Editor

Build a standalone visual editor for **Path of Exile 1 hideout layouts**.

The purpose of the application is to let a user create, edit, transform, organize, and export Path of Exile hideout presets **outside the game**.

The application should work primarily as a **2D top-down editor**, similar to a lightweight CAD / level editor.

The final output must be compatible with Path of Exile's `.hideout` import system.

---

# 1. Core Goal

The user should be able to:

1. Import an existing `.hideout` file.
2. See all decorations positioned on a 2D canvas.
3. Select decorations visually.
4. Move them.
5. Rotate them.
6. Duplicate them.
7. Delete them.
8. Move multiple decorations together.
9. Group decorations.
10. Align and distribute decorations.
11. Mirror structures.
12. Create repeated / radial patterns.
13. Search and add decorations.
14. Edit exact numeric coordinates and rotation.
15. Export a valid `.hideout` file.
16. Re-import the exported file into Path of Exile without corruption.

The application must be useful even without access to Path of Exile's actual 3D models.

Do NOT attempt to build a full 3D renderer for the first version.

---

# 2. IMPORTANT: Research the real `.hideout` format first

Before implementing the editor:

Investigate the actual Path of Exile `.hideout` file format.

Use several real exported hideout files as fixtures.

Determine:

- file structure
- hideout/base metadata
- decoration representation
- decoration names or IDs
- position fields
- rotation fields
- variation fields
- any scale fields if they exist
- any version fields
- any hashes
- any optional properties
- field ordering
- duplicate decorations
- encoding
- newline format
- whether comments are possible
- differences between old/new exported formats if any

Do NOT assume the file schema from memory.

The parser must be based on actual examples.

Create several fixture files for development.

Most importantly:

**Import -> Export without editing should produce a semantically identical hideout.**

Unknown fields must not be silently discarded.

If the format contains fields that the editor does not understand, preserve them wherever possible.

---

# 3. Application architecture

Make the project local-first.

Preferred behavior:

- no backend required
- no login
- no account
- no cloud dependency
- files remain on the user's computer

If starting from an empty repository, use:

- TypeScript
- React
- Vite

For rendering the editor, use either:

- Konva
- Fabric.js
- PixiJS

Choose whichever fits a CAD-like editor best.

Do not use plain DOM elements for thousands of decorations if that creates performance problems.

The application should also be architected in a way that it could later be packaged with:

- Electron
or
- Tauri

But the first version can run directly in the browser.

---

# 4. Internal data model

Do NOT edit the parsed file structure directly throughout the UI.

Create a normalized internal representation.

Something conceptually similar to:

```ts
interface HideoutProject {
  metadata: HideoutMetadata;
  base?: HideoutBase;
  decorations: DecorationInstance[];
  editorState: EditorState;
  rawMetadata?: unknown;
}
```

And:

```ts
interface DecorationInstance {
  editorId: string;

  name?: string;
  gameId?: string | number;

  x: number;
  y: number;

  rotation: number;

  variation?: number;

  // Any additional game properties discovered
  properties: Record<string, unknown>;

  // Original serialized data for round-trip preservation
  raw?: unknown;
}
```

Do not blindly use these fields if the actual `.hideout` format differs.

Adapt the model after researching the actual format.

Every decoration instance needs a separate editor-only ID even when several game decorations are identical.

---

# 5. Parser and serializer

Create separate modules:

```text
hideout/
    parser.ts
    serializer.ts
    validator.ts
    types.ts
```

The parser should convert:

```text
.hideout
        ↓
normalized editor model
```

The serializer should convert:

```text
normalized editor model
        ↓
valid .hideout
```

Important requirements:

- preserve unknown fields
- preserve precision where possible
- don't accidentally round coordinates
- don't rewrite unrelated metadata
- support duplicate decorations
- report malformed input gracefully
- never silently remove decorations

Create a round-trip test:

```text
original.hideout
        ↓
parse
        ↓
serialize
        ↓
parse again
```

The resulting hideout must contain the same game-relevant information.

---

# 6. Main UI

Use a desktop-editor style layout.

Suggested structure:

```text
┌────────────────────────────────────────────────────────────┐
│ File Edit View Selection Transform Tools                  │
├─────────────┬───────────────────────────────┬──────────────┤
│             │                               │              │
│ Decoration  │                               │ Inspector    │
│ Library     │          CANVAS               │              │
│             │                               │ X            │
│ Search      │                               │ Y            │
│             │                               │ Rotation     │
│             │                               │ Variation    │
│             │                               │              │
├─────────────┴───────────────────────────────┴──────────────┤
│  428 decorations | 12 selected | zoom 85%                │
└────────────────────────────────────────────────────────────┘
```

---

# 7. Canvas behavior

The canvas represents Path of Exile hideout coordinates.

Support:

- infinite or sufficiently large workspace
- pan
- zoom
- zoom to cursor
- reset camera
- fit all decorations
- fit selection
- configurable coordinate grid
- rulers if practical
- origin marker
- X/Y axis
- world coordinate display under cursor

Mouse controls should feel similar to Figma / CAD / level editors.

---

# 8. Decoration rendering

Because we probably cannot accurately render PoE models outside the game, support multiple visualization modes.

## Basic mode

Render each decoration as:

- point
- circle
- rectangle
- arrow indicating rotation

Show:

- decoration label
- rotation direction
- selection state

## Footprint mode

Allow decorations to have estimated dimensions:

```ts
width
height
anchorX
anchorY
```

These may come from an editor metadata database rather than from `.hideout`.

This allows better visual layout planning.

## Thumbnail mode

If a thumbnail is available for a decoration, render it as an optional sprite/image.

Do not make the editor dependent on thumbnails.

Never break editing because an image is unavailable.

Do not illegally bundle extracted Path of Exile assets.

If external images are used, keep the asset source configurable and respect licensing.

---

# 9. Base hideout background

Support an optional top-down reference image for each hideout base.

This is not required for the first functional milestone but architecture should support it.

Add a base configuration format such as:

```ts
interface HideoutBaseDefinition {
    id: string;
    name: string;

    backgroundImage?: string;

    originX: number;
    originY: number;

    pixelsPerGameUnit: number;

    rotationOffset?: number;
}
```

The important part is a calibration system.

Provide a developer/user calibration tool where a background can be aligned with actual game coordinates using known reference points.

Do not hardcode arbitrary coordinate conversion assumptions.

---

# 10. Selection system

Implement proper editor-style selection.

Support:

### Click

Click decoration to select.

### Shift+Click

Add/remove an item from selection.

### Marquee selection

Drag an empty region to create a rectangular selection box.

### Select All

Ctrl+A.

### Select Same

Useful commands:

- Select same decoration type
- Select same variation
- Select nearby decorations

### Selection cycling

When decorations overlap, allow cycling through them.

For example:

Alt+Click

or repeated click.

---

# 11. Moving decorations

Selected decorations can be moved with:

- mouse drag
- keyboard arrows
- numeric inspector

Keyboard:

```text
Arrow      = 1 unit
Shift+Arrow = 10 units
Ctrl+Arrow  = configurable precision
```

Allow these step sizes to be configurable.

When multiple decorations are selected, preserve their relative positions.

---

# 12. Rotation

Support:

- mouse rotation
- numeric rotation field
- keyboard shortcuts
- incremental rotation

Examples:

```text
1 unit
5 units
15°
45°
90°
```

IMPORTANT:

Path of Exile may not express rotation in conventional degrees.

Research how the actual `.hideout` rotation field works.

Internally you may expose rotation to the user in:

- native PoE units
- degrees

If conversion is reliable.

Provide a setting:

```text
Rotation display:
[x] Degrees
[ ] Native PoE rotation units
```

Do not destroy native rotation precision during conversion.

---

# 13. Inspector

The right sidebar should show properties of selected decorations.

For one selected decoration:

```text
Name
X
Y
Rotation
Variation
Game-specific properties
```

Allow exact numeric editing.

For multiple selection:

show shared / mixed values.

Example:

```text
X: Mixed
Y: Mixed
Rotation: 0
Variation: Mixed
```

Applying a value should update all selected items where logical.

---

# 14. Duplicate / Copy / Paste

Support:

```text
Ctrl+C
Ctrl+V
Ctrl+D
Delete
```

Copied decorations should remain inside the application clipboard.

If practical, also serialize clipboard data as JSON so copying between two editor tabs/windows can work.

Duplicate should create new instances offset slightly from the originals.

---

# 15. Undo / Redo

This is mandatory.

Support:

```text
Ctrl+Z
Ctrl+Shift+Z
Ctrl+Y
```

Undo actions should include:

- move
- rotate
- delete
- duplicate
- add
- variation change
- align
- distribute
- mirror
- group
- array generation

Dragging 50 pixels should be one undo action, not hundreds.

Use command/history transactions.

---

# 16. Groups

Allow editor-only groups.

A group:

- can be selected as one object
- can move together
- can rotate together
- can duplicate together
- can be named
- can be locked
- can be hidden in editor

Example:

```text
Entrance Arch
Map Device Area
Left Wall
Right Wall
Portal Structure
```

Groups do NOT need to exist in the exported `.hideout`.

Store them in the editor project file.

---

# 17. Project format

Create a separate project format:

```text
.poehideoutproject
```

or JSON.

It should contain:

- imported hideout data
- groups
- locks
- hidden state
- footprints
- optional thumbnail metadata
- base calibration
- editor camera
- guides
- custom labels

The application therefore has two export types:

### Path of Exile export

```text
.hideout
```

Only game-compatible data.

### Editor project

```text
.poehideoutproject
```

Contains editor-specific data.

---

# 18. Mirror tool

This is one of the most important features.

Allow selected decorations to be mirrored:

- horizontally
- vertically
- around world origin
- around selection center
- around custom X coordinate
- around custom Y coordinate

Example:

User builds the left half of a structure.

Select it.

Press:

```text
Mirror → Duplicate horizontally
```

The editor creates an exact symmetric copy.

Rotation must also be mirrored correctly.

Research native PoE rotation representation and implement the correct reflection formula.

---

# 19. Alignment tools

For multi-selection support:

```text
Align Left
Align Right
Align Top
Align Bottom

Align Center X
Align Center Y
```

Also:

```text
Distribute Horizontally
Distribute Vertically
```

Support both:

- object centers
- estimated footprints

where practical.

---

# 20. Snap system

Provide configurable snapping.

Options:

```text
Grid snap
Angle snap
Object center snap
Guide snap
Axis snap
```

Grid sizes:

```text
1
2
5
10
25
50
100
custom
```

Hold Alt or another modifier to temporarily disable snapping.

Show visual snapping guides.

---

# 21. Guides

Allow users to create editor guides.

Horizontal:

```text
Y = 500
```

Vertical:

```text
X = 1200
```

Useful for symmetrical structures.

Guides should not export into `.hideout`.

---

# 22. Symmetry mode

Add an optional live symmetry mode.

Example:

```text
Symmetry:
None
Vertical
Horizontal
Both
```

With:

```text
Axis X = 0
Axis Y = 0
```

When enabled, moving/creating an object can optionally update its mirrored partner.

This can be implemented after the basic mirror tool.

---

# 23. Array / repetition tools

Hideout builders frequently create repeating patterns.

Implement:

## Linear Array

Example:

```text
Copies: 10
X spacing: 25
Y spacing: 0
Rotation increment: 0
```

## Radial Array

Example:

```text
Copies: 12
Center: selection center
Radius: current distance
Angle: 360°
Rotate objects with path: yes/no
```

This allows easy creation of:

- circles
- rings
- pillars
- fences
- radial decorations
- arena structures

Show a live preview before applying.

---

# 24. Transform panel

Create a powerful transform dialog.

Example:

```text
MOVE

X += 50
Y += -20

ROTATE

Rotation += 90°

SCALE POSITION AROUND PIVOT

X/Y distance *= 1.25

PIVOT

Selection Center
World Origin
Custom
```

Important:

"Scale" here means scaling object positions around a pivot.

Do NOT export an object scale property unless Path of Exile actually supports one.

This tool is useful for making an existing circle larger/smaller.

---

# 25. Decoration library

Create a left sidebar listing available decorations.

Search should be instant.

Allow search by:

- name
- category
- master
- tags

if such metadata is available.

Example:

```text
Search decorations...

[ ] Trees
[ ] Walls
[ ] Lighting
[ ] Furniture
[ ] Effects
```

The editor should have a pluggable decoration catalog.

Do not tightly couple the parser to the decoration database.

Conceptually:

```ts
interface DecorationDefinition {
    gameName: string;
    category?: string;
    thumbnail?: string;

    footprint?: {
        width: number;
        height: number;
    };

    tags?: string[];
}
```

---

# 26. Unknown decorations

An imported `.hideout` may contain a decoration not present in our catalog.

THIS MUST STILL WORK.

Display it as:

```text
Unknown / uncatalogued decoration
```

but preserve:

- its game identifier/name
- coordinates
- rotation
- variation
- raw game data

It must still be movable and exportable.

---

# 27. Variations

If a decoration supports variation values, allow changing them.

UI example:

```text
Variation

<  3  >
```

or dropdown.

If variation limits are unknown, allow the native numeric value rather than artificially blocking it.

---

# 28. Layers / object list

Add an object tree/list.

Example:

```text
Objects

▼ Entrance
    Stone Pillar
    Stone Pillar
    Torch
    Torch

▼ Portal
    ...
```

Allow:

- click to select
- shift select
- rename group
- hide
- lock

Because many hideouts contain overlapping decorations, this list is important.

---

# 29. Locking

A decoration or group can be locked.

Locked objects:

- remain visible
- cannot accidentally move
- cannot be deleted without unlocking

Useful for finished portions of a hideout.

---

# 30. Search existing instances

Provide a separate search for decorations currently placed in the hideout.

Example:

```text
Placed Objects

Search: "Pillar"

Stone Pillar × 34
Temple Pillar × 12
Destroyed Pillar × 8
```

Clicking an item should allow:

```text
Select all 34
```

---

# 31. Coordinate tools

Include several useful coordinate utilities.

### Move entire hideout

```text
Offset all decorations:

X +500
Y -250
```

### Recenter

Recenter entire layout around:

```text
0, 0
```

or custom coordinate.

### Normalize

Move bounding-box center to chosen coordinate.

### Change base

Potential future feature:

Transform coordinates between different hideout bases using manually configured calibration transforms.

Do NOT fake support for base conversion until the transforms are verified.

---

# 32. Statistics

Show:

```text
Total decorations: 742

Unique decoration types: 126

Selected: 23
```

If cost information is available:

```text
Total favour cost
Master-specific cost
Unavailable metadata
```

Do not make cost information required for the editor.

---

# 33. Diff tool

Add a useful comparison tool.

Allow comparing two `.hideout` files.

Report:

```text
+ 12 decorations added
- 4 removed
~ 18 moved
~ 2 rotations changed
```

Optionally visualize differences on canvas.

This can be a later milestone.

---

# 34. Import UX

Support:

- drag `.hideout` file onto application
- File → Open
- paste raw hideout text

When parsing fails:

DO NOT simply show:

```text
Invalid file
```

Show useful details:

```text
Unable to parse decoration near line ...
Unknown field ...
Unexpected token ...
```

Provide a button to view raw data.

---

# 35. Export UX

Provide:

```text
Export .hideout
```

Before export run validation.

Show:

```text
742 decorations
0 errors
3 warnings
```

Errors should prevent export only when the file would clearly be invalid.

Unknown metadata should normally be preserved rather than treated as an error.

---

# 36. Autosave

Automatically store the current editor project locally.

Prefer IndexedDB for large projects.

Support:

```text
Recent Projects
```

No server is required.

Do not overwrite the user's original `.hideout` file automatically.

---

# 37. Performance

Large hideouts may contain hundreds or thousands of decorations.

The editor should remain responsive with at least:

```text
2,000 decoration instances
```

Target smooth:

- pan
- zoom
- marquee
- dragging
- multi-selection

Avoid expensive React rerenders for every pointer movement.

Keep editor/canvas state appropriately separated from React UI state.

---

# 38. Keyboard shortcuts

At minimum:

```text
Ctrl+O       Open
Ctrl+S       Save project
Ctrl+Shift+S Export hideout

Ctrl+Z       Undo
Ctrl+Y       Redo

Ctrl+C       Copy
Ctrl+V       Paste
Ctrl+D       Duplicate

Delete       Delete

Ctrl+A       Select all

Escape       Clear selection

F            Fit selection

Arrow        Move
Shift+Arrow  Move larger step
```

Create a shortcut help dialog.

---

# 39. Context menu

Right click selected decoration:

```text
Duplicate
Delete
Lock

Group
Ungroup

Mirror
    Horizontal
    Vertical

Align
    ...

Create Array
    Linear
    Radial

Select Same Type
```

---

# 40. Visual style

Use a clean dark desktop-editor UI inspired by tools such as:

- Figma
- Blender
- Unity editor
- level editors
- CAD applications

Do NOT imitate Path of Exile's ornate UI unnecessarily.

The tool should prioritize clarity and precision.

Canvas should use a dark neutral background.

Selected decorations should be visually obvious.

Use subtle grid lines.

---

# 41. MVP priorities

Do NOT attempt to implement everything at once.

Build the project incrementally.

## Milestone 1 — Format

Implement:

- actual `.hideout` format research
- parser
- serializer
- fixtures
- round-trip validation

Do not continue until actual hideout files survive parse/export.

---

## Milestone 2 — Canvas

Implement:

- canvas
- pan
- zoom
- render decorations
- coordinate mapping
- click selection
- marquee selection

---

## Milestone 3 — Editing

Implement:

- drag
- numeric position
- rotation
- delete
- duplicate
- multi-select
- keyboard movement

---

## Milestone 4 — History

Implement:

- undo
- redo
- transactional drag operations

---

## Milestone 5 — Advanced transforms

Implement:

- groups
- align
- distribute
- mirror
- grid snap
- guides

---

## Milestone 6 — Pattern tools

Implement:

- linear array
- radial array
- transform-around-pivot

---

## Milestone 7 — Decoration catalog

Implement:

- searchable library
- metadata
- footprints
- optional thumbnails

---

## Milestone 8 — Quality of life

Implement:

- autosave
- project files
- object tree
- locking
- hide/show
- statistics
- diff tool

---

# 42. Very important engineering rules

Do not build the entire application as one massive component.

Separate concerns.

Suggested modules:

```text
src/

hideout/
    parser
    serializer
    validator
    models

editor/
    canvas
    camera
    selection
    transforms
    snapping
    history
    commands

catalog/
    decorationCatalog
    footprints

project/
    projectStorage
    projectSerializer

components/
    Canvas
    DecorationLibrary
    Inspector
    ObjectTree
    Toolbar
    StatusBar
```

Use a proper state architecture.

Do not make canvas objects the source of truth.

The normalized hideout project model should be the source of truth.

---

# 43. Geometry utilities

Create reusable geometry functions for:

```text
rotate point around pivot
mirror point across X
mirror point across Y
bounding box
selection center
linear interpolation
angle conversion
grid snapping
radial placement
```

Keep these functions separate from UI code.

---

# 44. Rotation mirroring

Pay particular attention to mirroring rotations.

When reflecting an object horizontally or vertically, both:

```text
position
rotation
```

must be transformed.

Verify this visually and mathematically.

Because Path of Exile may use its own rotation representation, first convert to an internal angle representation if necessary, perform the transform, then convert back without losing precision.

---

# 45. Do not destroy user files

This is extremely important.

Never silently mutate or discard information.

If a field is unknown:

preserve it.

If a decoration cannot be resolved in the catalog:

preserve it.

If a variation is unknown:

preserve it.

If metadata is unknown:

preserve it.

The editor should be conservative when rewriting `.hideout`.

---

# 46. Debug mode

Create a developer/debug panel.

For selected decoration show:

```text
Editor ID
Raw imported data
Parsed data
Serialized data
Native coordinates
Canvas coordinates
Native rotation
Converted rotation
```

This will make reverse engineering and debugging the format much easier.

---

# 47. Sample project

Include at least one development/demo hideout.

It should demonstrate:

- many decorations
- rotations
- duplicates
- multi-selection
- mirror
- groups
- arrays

Do not distribute copyrighted game assets unnecessarily.

Fixtures containing text-format layout data are enough where legally appropriate.

---

# 48. Testing

At minimum test the dangerous logic:

### Parser

Multiple real `.hideout` fixtures.

### Serializer

Import/export round trips.

### Geometry

Mirror:

```text
X
Y
rotation
```

Rotate around pivot.

Radial arrays.

### History

Move -> Undo -> Redo.

Delete -> Undo.

Duplicate -> Undo.

The visual UI itself does not need excessive test coverage.

Focus tests on operations that could corrupt a hideout.

---

# 49. Error recovery

The editor should never lose the entire project because one operation fails.

Use:

- autosave
- history
- project snapshots

If serialization fails, keep the current editor state intact.

---

# 50. Optional future features

Do NOT block MVP on these.

Potential later features:

- Electron/Tauri desktop build
- community decoration footprint database
- user-submitted footprint corrections
- calibrated maps for every hideout base
- decoration cost calculation
- owned-decoration tracking
- HideoutShowcase integration
- automatic base conversion
- overlay image import
- template library
- blueprint sharing
- collaborative editing
- before/after diff visualization
- procedural wall builder
- procedural circle builder
- path-based decoration placement
- symmetry constraints
- 3D preview if usable assets ever become available

---

# 51. Particularly valuable tools for PoE hideout creation

Prioritize these because they provide functionality that is difficult or annoying inside Path of Exile itself:

1. Multi-select.
2. Exact numeric positioning.
3. Exact rotation.
4. Mirror + duplicate.
5. Align.
6. Equal spacing.
7. Linear arrays.
8. Radial arrays.
9. Moving entire structures.
10. Groups.
11. Locking completed structures.
12. Undo/redo.
13. Search all instances of a decoration.
14. Recenter whole hideout.
15. Copy structures between projects.

These features are more important than graphical polish.

---

# 52. Definition of Done for first usable version

The first truly usable release is complete when I can:

1. Export a hideout from Path of Exile.
2. Drag the `.hideout` file into this editor.
3. See every decoration represented on the canvas.
4. Zoom and pan around the layout.
5. Click or marquee-select decorations.
6. Move them.
7. Rotate them.
8. Select 20 decorations and move them together.
9. Duplicate a selection.
10. Mirror a selection.
11. Undo the operation.
12. Enter exact X/Y coordinates.
13. Save my editor project.
14. Export a new `.hideout`.
15. Import that `.hideout` back into Path of Exile successfully.

The goal is NOT to create a beautiful mockup.

The goal is to produce a genuinely useful Path of Exile hideout engineering tool.

---

# 53. Development workflow

Work autonomously and incrementally.

First inspect the repository.

Then research the `.hideout` format.

Then write a short architecture document in the repository explaining:

```text
actual hideout format
internal model
coordinate system
rotation system
parser/serializer strategy
canvas strategy
history system
```

Then implement Milestone 1.

Verify it.

Then proceed milestone by milestone.

Do not build fake UI controls that do nothing.

Prefer fewer fully functional tools over many placeholder buttons.

At each milestone:

1. implement
2. run the application
3. test the feature
4. fix discovered issues
5. continue

When a technical assumption about Path of Exile's format cannot be verified, explicitly document the assumption rather than silently inventing behavior.

---

# 54. Final product philosophy

Think of this application as:

**"Figma / a lightweight CAD editor for Path of Exile hideouts."**

Path of Exile remains the final renderer.

This application provides precision editing, organization, symmetry, repetition, transforms, and file manipulation that are difficult to do comfortably inside the game.

Prioritize:

**correctness > usability > performance > visual polish.**

Never sacrifice `.hideout` file correctness for prettier UI.