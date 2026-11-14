# Technical Specification — Fantasy Sprite Colorizer

## 1. Project Goal

Build a browser-based sprite recoloring system using TypeScript.

The system takes grayscale fantasy item illustrations as input and generates multiple color variants while preserving:

- Original silhouette and proportions.
- Original lighting, shadows and highlights.
- Fine details, textures and gradients.
- Transparency (alpha channel).
- Material differences within a single sprite.

The target assets are high-resolution grayscale fantasy illustrations, such as RPG inventory items, weapons, armor, potions, plants and magical objects.

The system must work entirely in the browser, without requiring an AI API or backend.

Use HTML Canvas or an equivalent browser rendering solution.

## 2. Core Architecture

Separate the implementation into four main systems:

1. Image processing and gradient mapping.
2. Material mask/layer management.
3. Selection and segmentation tools.
4. Editor interface and export.

Recommended TypeScript data structures:

```ts
interface MaterialLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  order: number;

  mask: Uint8Array;

  gradient: {
    stops: {
      position: number;
      color: string;
    }[];
  };
}

interface SpriteDocument {
  width: number;
  height: number;

  originalImage: ImageData;

  materials: MaterialLayer[];

  selection: Uint8Array;
}
```

Each material layer should have an independent grayscale-to-color gradient.

Masks must be independent of the original image.

Use stable layer IDs rather than array indices so deleting or reordering layers does not corrupt assignments.

## 3. Gradient Recoloring

Implement luminance-based gradient mapping.

For each opaque pixel:

1. Calculate source luminance.
2. Find the corresponding gradient position.
3. Interpolate between gradient stops.
4. Write the resulting RGB values.
5. Preserve the original alpha channel.

A basic luminance formula:

```ts
const luminance =
  0.2126 * r +
  0.7152 * g +
  0.0722 * b;
```

The gradient editor should support at least three stops:

- Shadows.
- Midtones.
- Highlights.

Ideally, allow unlimited gradient stops with adjustable positions.

The recoloring must preserve the original shading information rather than applying flat color overlays.

## 4. Material Mask System

A sprite can contain multiple independent materials.

Example: Fantasy battle axe

- Steel blade.
- Wooden handle.
- Leather wrapping.
- Magical effects.

Example: Turnip

- Main root.
- Stems.
- Leaves.

Example: Potion

- Glass.
- Liquid.
- Cork.
- Magical effects.

Each material has its own mask and gradient.

The mask determines which pixels are affected by the material's color gradient.

### Layer management

Required operations:

- Create layer.
- Rename layer.
- Delete layer.
- Select layer.
- Change layer visibility.
- Lock/unlock layer.
- Reorder layers.
- Assign selected pixels to a layer.

Deleting a layer must safely reassign its pixels to a default/base layer or ask the user where to transfer them.

## 5. Selection and Mask Editing Tools

Implement the following tools.

### Brush

- Paint the selected material mask.
- Adjustable brush size.
- Adjustable hardness/softness.
- Support mouse and pointer input.

### Eraser

- Remove pixels from the active mask.
- Restore pixels to the default material.

### Bucket fill

- Flood-fill a connected region.
- Use grayscale similarity as a fill constraint.
- Adjustable tolerance.
- Respect transparent pixels and existing boundaries.

### Magic wand

Two modes:

1. Contiguous: select connected pixels with similar luminance.
2. Global: select all pixels with similar luminance across the image.

Support adjustable tolerance.

### Polygon / lasso selection

- Click to create polygon vertices.
- Close polygon with double-click or Enter.
- Escape cancels.
- Select pixels inside the polygon.
- Optional boundary snapping.

Future enhancement: freehand lasso selection.

### Boundary snapping

When placing polygon vertices, search a small neighborhood for strong image edges.

Use Sobel edge detection or an equivalent gradient-based method.

Snap the vertex to the strongest nearby edge, subject to a configurable radius.

## 6. Automatic Shape Detection

This is an important feature.

Provide an automatic mask generation system based on image processing algorithms.

It should analyze:

- Alpha/transparency boundaries.
- Grayscale differences.
- Edge strength.
- Connected components.
- Local contrast.

Recommended algorithms:

- Sobel edge detection.
- Canny edge detection (optional).
- Connected-component labeling.
- Flood-fill segmentation.
- Region merging.
- Optional watershed segmentation.

### Expected workflow

1. User clicks "Detect shapes".
2. The algorithm analyzes the sprite.
3. Candidate regions are identified.
4. Display detected regions as colored overlays.
5. User can inspect the candidates.
6. User selects one or more regions.
7. User applies them to an existing or new material layer.
8. User can refine the resulting masks manually.

Detection must not automatically modify the original image.

Important: classical shape detection cannot reliably understand semantic materials. For example, it cannot always know which region is wood and which is steel. It should propose candidate regions, leaving the final assignment to the user.

## 7. Selection Management

Required operations:

- Add to selection.
- Remove from selection.
- Replace selection.
- Invert selection.
- Clear selection.
- Apply selection to active material.
- Preview selected pixels.

Selection should be independent of material masks until explicitly applied.

## 8. Undo / Redo

Implement a history system.

Support undo/redo for:

- Brush strokes.
- Erasing.
- Bucket fill.
- Magic wand selection.
- Polygon selection.
- Automatic detection.
- Applying selections.
- Layer creation and deletion.
- Layer modifications.

Recommended shortcuts:

- Ctrl/Cmd + Z: Undo.
- Ctrl/Cmd + Shift + Z: Redo.
- Ctrl/Cmd + Y: Redo.

Use snapshots or command-based history.

For high-resolution assets, prefer efficient history storage rather than copying every full-size image after every pointer movement.

Group an entire brush stroke into one history operation.

## 9. User Interface

The editor should contain:

### Main canvas

- Transparent checkerboard background.
- Zoom and pan.
- Original image preview.
- Recolored image preview.
- Mask overlay.
- Selection overlay.

### Material panel

- Layer list.
- Layer color indicator.
- Rename.
- Delete.
- Visibility.
- Lock.
- Reorder.
- Add material.

### Tools panel

- Brush.
- Eraser.
- Bucket.
- Magic wand.
- Polygon/lasso.
- Shape detection.

### Gradient panel

For the selected material:

- Shadow color.
- Midtone color.
- Highlight color.
- Editable gradient stops.
- Gradient presets.

### Detection panel

- Edge sensitivity.
- Magic wand tolerance.
- Snap-to-edge toggle.
- Detection preview.
- Apply selection.

## 10. Presets

Include example material presets:

| Material | Shadows | Midtones | Highlights |
|---|---|---|---|
| Steel | Dark blue-gray | Silver | White |
| Wood | Dark brown | Warm brown | Light tan |
| Gold | Dark ochre | Gold | Pale yellow |
| Ice | Deep blue | Cyan | White |
| Fire | Dark red | Orange | Yellow |
| Leaf | Dark green | Green | Light green |
| Arcane | Dark purple | Violet | Lavender |

Presets should be reusable across different sprites.

Allow saving custom presets.

## 11. Export and Persistence

Required export formats:

- PNG with transparency.
- JSON material configuration.
- JSON mask configuration.

Ideally support importing a previously saved configuration and applying it to another sprite with matching dimensions.

Future enhancement: batch recoloring multiple sprites using the same material presets.

## 12. Performance Requirements

The application should support high-resolution sprites.

Important considerations:

- Avoid unnecessary full-canvas redraws.
- Use typed arrays for masks.
- Cache intermediate image data.
- Use requestAnimationFrame for interactive rendering.
- Consider Web Workers for expensive segmentation operations.
- Avoid blocking the UI during shape detection.
- Preserve exact image dimensions and alpha.

WebGL or GPU acceleration can be considered later.

## 13. Integration Requirements

The implementation must be modular and reusable inside an existing application.

Do not build a standalone application unless explicitly requested.

Separate the following modules:

```text
sprite-colorizer/
  core/
    luminance.ts
    gradient-mapping.ts
    mask-manager.ts
    layer-manager.ts

  selection/
    magic-wand.ts
    flood-fill.ts
    polygon-selection.ts
    edge-detection.ts
    shape-segmentation.ts

  history/
    history-manager.ts

  editor/
    canvas-renderer.ts
    editor-controller.ts

  export/
    png-export.ts
    config-export.ts

  types/
    sprite.ts
    material.ts
    selection.ts
```

The coding agent should first inspect the existing application's architecture and integrate these modules into its existing framework, conventions and UI components.

Avoid introducing unnecessary dependencies.

## 14. Acceptance Criteria

The implementation is considered successful when:

1. A grayscale transparent fantasy sprite can be loaded.
2. Multiple material layers can be created and independently recolored.
3. The axe example can have a wooden handle and metallic blade with different palettes.
4. The turnip example can have a separately colored root and stems.
5. Brush, eraser, bucket and magic wand work correctly.
6. Polygon selection and edge snapping work.
7. Automatic shape detection proposes editable regions.
8. Layers can be renamed, deleted, reordered and hidden.
9. Undo/redo works without corrupting masks.
10. Original shading and transparency remain intact.
11. PNG export produces the expected recolored sprite.
12. The implementation remains responsive with high-resolution images.

**Priority order:**

- P0: Gradient mapping, material masks, layer management.
- P1: Brush, eraser, bucket, magic wand, undo/redo.
- P2: Polygon selection, edge snapping, automatic shape detection.
- P3: Advanced segmentation, batch processing, reusable configurations.

The main objective is a reliable, non-destructive material recoloring workflow for high-resolution fantasy game assets.