import { computed, inject, Injectable, signal } from '@angular/core';
import { snapToEdge } from '../helpers/edges';
import { exportConfig, importConfig } from '../helpers/config-export';
import { floodFill, magicWand } from '../helpers/flood-select';
import { renderSprite } from '../helpers/gradient-mapping';
import { Command, History } from '../helpers/history';
import {
  addLayer,
  assignPixels,
  createDocument,
  deleteLayer,
  moveLayer,
  renameLayer,
  setLayerLocked,
  setLayerVisible,
} from '../helpers/layer-manager';
import {
  combineSelection,
  invertMask,
  stampBrushInPlace,
  stampLineInPlace,
} from '../helpers/mask-ops';
import { Point, rasterizePolygon } from '../helpers/polygon';
import { defaultMinSize, detectShapes, DetectedShape } from '../helpers/shape-detection';
import { PRESETS } from '../helpers/presets';
import { DEMO_SPRITE_ID } from '../helpers/sprite-library';
import { PackBusiness } from '../../../core/business/pack.business';
import { SpriteSet, SpriteSetSource, SpriteSetTags } from '../models/sprite-set';
import { SpriteSetStorageService } from '../services/sprite-set-storage.service';
import { ImageStorageService } from '../../../core/services/image-storage.service';
import {
  GradientStop,
  SelectionMode,
  SpriteDocument,
  SpriteImage,
  SpritePreset,
  SpriteTool,
  WandMode,
} from '../models/sprite';
import { SpriteFileService } from '../services/sprite-file.service';
import { SpriteShapeService } from '../services/sprite-shape.service';
import { SpritePresetStorageService } from '../services/sprite-preset-storage.service';

interface Snapshot {
  document: SpriteDocument;
  selection: Uint8Array;
}

interface Stroke {
  before: SpriteDocument;
  layerId: string;
  erase: boolean;
  mask: Uint8Array;
  x: number;
  y: number;
}

/** A gradient edit within this delay on the same material joins the previous history entry. */
const GRADIENT_MERGE_MS = 1000;

export interface ShapeCandidate {
  id: number;
  mask: Uint8Array;
  size: number;
}

/** The sprite colorizer: the document, the selection, the tools and the history. */
@Injectable({ providedIn: 'root' })
export class SpriteColorizerBusiness {
  private readonly presetStorage = inject(SpritePresetStorageService);
  private readonly files = inject(SpriteFileService);
  private readonly shapes = inject(SpriteShapeService);
  private readonly setStorage = inject(SpriteSetStorageService);
  private readonly imageStorage = inject(ImageStorageService);
  private readonly packs = inject(PackBusiness);
  private readonly history = new History();

  private readonly image = signal<SpriteImage | null>(null);
  private readonly document = signal<SpriteDocument | null>(null);
  private readonly selection = signal<Uint8Array>(new Uint8Array(0));
  private readonly activeId = signal<string | null>(null);
  private readonly version = signal(0);
  private readonly customPresets = signal<SpritePreset[]>(
    this.presetStorage.load(),
  );
  private readonly tool = signal<SpriteTool>('brush');
  private readonly brush = signal({ size: 8, hardness: 1 });
  private readonly tolerance = signal(24);
  private readonly wandMode = signal<WandMode>('contiguous');
  private readonly name = signal('sprite');
  private readonly polygon = signal<Point[]>([]);
  private readonly snap = signal({ enabled: false, radius: 6 });
  private readonly candidates = signal<ShapeCandidate[]>([]);
  private readonly selectedCandidates = signal<number[]>([]);
  private readonly detecting = signal(false);
  private readonly detected = signal(false);
  private readonly savedSets = signal<SpriteSet[]>([]);
  private readonly currentSetId = signal<string | null>(null);
  /** Where the open image comes from, to save it with a set; a file is kept as is until it is stored. */
  private source: SpriteSetSource | { kind: 'file'; blob: Blob } | null = null;

  private stroke: Stroke | null = null;
  private gradientEdit: {
    id: string;
    at: number;
    before: SpriteDocument;
  } | null = null;

  readonly $image = this.image.asReadonly();
  readonly $document = this.document.asReadonly();
  readonly $selection = this.selection.asReadonly();
  readonly $tool = this.tool.asReadonly();
  readonly $brush = this.brush.asReadonly();
  readonly $tolerance = this.tolerance.asReadonly();
  readonly $wandMode = this.wandMode.asReadonly();
  readonly $fileName = this.name.asReadonly();
  readonly $polygonVertices = this.polygon.asReadonly();
  readonly $snap = this.snap.asReadonly();
  readonly $candidates = this.candidates.asReadonly();
  readonly $selectedCandidates = this.selectedCandidates.asReadonly();
  readonly $detecting = this.detecting.asReadonly();
  /** True once a detection ran on the current image, even when it found nothing. */
  readonly $detected = this.detected.asReadonly();
  /** The sets saved on this device, the latest changed first (after `refreshSets`). */
  readonly $savedSets = this.savedSets.asReadonly();
  /** The saved set the open document came from or was saved as; saving writes over it. */
  readonly $currentSetId = this.currentSetId.asReadonly();
  readonly $activeLayerId = computed(() => {
    const doc = this.document();
    const id = this.activeId();
    return doc ? (doc.layers.some((l) => l.id === id) ? id : doc.baseId) : null;
  });
  readonly $activeLayer = computed(
    () =>
      this.document()?.layers.find((l) => l.id === this.$activeLayerId()) ??
      null,
  );
  readonly $canUndo = computed(() => (this.version(), this.history.canUndo()));
  readonly $canRedo = computed(() => (this.version(), this.history.canRedo()));
  readonly $presets = computed<SpritePreset[]>(() => [
    ...PRESETS,
    ...this.customPresets(),
  ]);

  /** The sprite with every visible material through its gradient; alpha kept. Computed lazily, once per change. */
  readonly $recolored = computed<SpriteImage | null>(() => {
    const image = this.image();
    const doc = this.document();
    return image && doc ? renderSprite(image, doc) : null;
  });

  loadImage(image: SpriteImage, name = 'sprite'): void {
    this.image.set(image);
    this.document.set(createDocument(image.width, image.height));
    this.selection.set(new Uint8Array(image.width * image.height));
    this.activeId.set(null);
    this.name.set(name);
    this.polygon.set([]);
    this.candidates.set([]);
    this.detected.set(false);
    this.selectedCandidates.set([]);
    this.stroke = null;
    this.gradientEdit = null;
    this.history.clear();
    this.source = null;
    this.currentSetId.set(null);
    this.version.update((v) => v + 1);
  }

  async loadFile(file: File): Promise<void> {
    this.loadImage(
      await this.files.decode(file),
      file.name.replace(/\.[^.]+$/, '') || 'sprite',
    );
    this.source = { kind: 'file', blob: file };
  }

  /** Loads a bundled sprite (from the Base pack) by id, with its ready-made materials when it has some. */
  async loadLibrary(id: string): Promise<void> {
    const sprite = await this.bundledSprite(id);
    if (sprite.kind === 'colored') throw new Error('sprite.coloredRefused');
    const [image, config] = await Promise.all([
      this.files.fetchImage(sprite.imageUrl),
      sprite.materialsUrl && sprite.kind === 'masked'
        ? this.files.fetchText(sprite.materialsUrl).catch(() => null)
        : null,
    ]);
    this.loadImage(image, id);
    this.source = { kind: 'library', spriteId: id };
    if (config) this.replaceDocument(config);
  }

  private async bundledSprite(id: string) {
    const sprite = (await this.packs.sprites()).find((s) => s.id === id);
    if (!sprite) throw new Error(`Unknown sprite "${id}"`);
    return sprite;
  }

  // Saved sets

  async refreshSets(): Promise<void> {
    this.savedSets.set(await this.setStorage.list());
  }

  /** Saves the open sprite and its materials: over the set it came from, or as a new set (bundled ones are copied). */
  async saveSet(name: string): Promise<void> {
    const doc = this.document();
    const image = this.image();
    if (!doc || !image) return;
    let source = this.source;
    if (source?.kind !== 'library' && source?.kind !== 'image') {
      const blob =
        source?.kind === 'file' ? source.blob : await this.files.encodePng(image);
      source = { kind: 'image', imageId: await this.imageStorage.put(blob) };
    }
    const current = this.savedSets().find((s) => s.id === this.currentSetId());
    const bundled =
      source.kind === 'library'
        ? await this.bundledSprite(source.spriteId).catch(() => undefined)
        : undefined;
    const tags: SpriteSetTags | undefined = current
      ? current.tags
      : bundled && { type: bundled.type, slot: bundled.slot };
    const set: SpriteSet = {
      id: this.currentSetId() ?? crypto.randomUUID(),
      name: name.trim() || this.name(),
      source,
      config: exportConfig(doc),
      updatedAt: Date.now(),
      ...(tags ? { tags } : {}),
    };
    await this.setStorage.save(set);
    this.source = source;
    this.currentSetId.set(set.id);
    this.name.set(set.name);
    await this.refreshSets();
  }

  /** Opens a saved set: its image and its materials, with a fresh history. */
  async openSet(id: string): Promise<void> {
    const set =
      this.savedSets().find((s) => s.id === id) ??
      (await this.setStorage.list()).find((s) => s.id === id);
    if (!set) throw new Error('Unknown sprite set');
    let image: SpriteImage;
    if (set.source.kind === 'library') {
      image = await this.files.fetchImage(
        (await this.bundledSprite(set.source.spriteId)).imageUrl,
      );
    } else {
      const blob = await this.imageStorage.get(set.source.imageId);
      if (!blob) throw new Error('Missing sprite image');
      image = await this.files.decode(blob);
    }
    this.loadImage(image, set.name);
    this.replaceDocument(set.config);
    this.source = set.source;
    this.currentSetId.set(set.id);
  }

  async renameSet(id: string, name: string): Promise<void> {
    const set = this.savedSets().find((s) => s.id === id);
    if (!set || !name.trim()) return;
    await this.setStorage.save({ ...set, name: name.trim(), updatedAt: Date.now() });
    if (this.currentSetId() === id) this.name.set(name.trim());
    await this.refreshSets();
  }

  /** The kind of item a saved set can illustrate; none leaves it out of random item images. */
  async setSetTags(id: string, tags: SpriteSetTags | undefined): Promise<void> {
    const set = this.savedSets().find((s) => s.id === id);
    if (!set) return;
    const { tags: _old, ...rest } = set;
    await this.setStorage.save(tags ? { ...rest, tags } : rest);
    await this.refreshSets();
  }

  /** Deletes a saved set; its stored image stays (images are shared by content with the rest of the app). */
  async deleteSet(id: string): Promise<void> {
    await this.setStorage.delete(id);
    if (this.currentSetId() === id) this.currentSetId.set(null);
    await this.refreshSets();
  }

  /** Swaps the materials of the open image without an undo entry (a freshly opened sprite). */
  private replaceDocument(config: string): void {
    const image = this.image();
    if (!image) return;
    this.document.set(
      importConfig(config, { width: image.width, height: image.height }),
    );
    this.version.update((v) => v + 1);
  }

  loadDemo(): Promise<void> {
    return this.loadLibrary(DEMO_SPRITE_ID);
  }

  // Tools

  setTool(tool: SpriteTool): void {
    if (tool !== 'polygon') this.polygon.set([]);
    this.tool.set(tool);
  }
  setBrush(brush: { size: number; hardness: number }): void {
    this.brush.set(brush);
  }
  setTolerance(value: number): void {
    this.tolerance.set(Math.min(255, Math.max(0, value)));
  }
  setWandMode(mode: WandMode): void {
    this.wandMode.set(mode);
  }

  setSnap(snap: { enabled: boolean; radius: number }): void {
    this.snap.set({ enabled: snap.enabled, radius: Math.max(0, snap.radius) });
  }

  // History

  undo(): void {
    this.cancelStroke();
    this.gradientEdit = null;
    this.history.undo();
    this.version.update((v) => v + 1);
  }

  redo(): void {
    this.cancelStroke();
    this.gradientEdit = null;
    this.history.redo();
    this.version.update((v) => v + 1);
  }

  // Materials

  selectMaterial(id: string): void {
    this.activeId.set(id);
  }

  addMaterial(name: string): void {
    const doc = this.document();
    if (!doc) return;
    const next = addLayer(doc, name);
    this.commit(next);
    this.activeId.set(next.layers[next.layers.length - 1].id);
  }

  renameMaterial(id: string, name: string): void {
    this.edit((doc) => renameLayer(doc, id, name));
  }
  setMaterialVisible(id: string, visible: boolean): void {
    this.edit((doc) => setLayerVisible(doc, id, visible));
  }
  setMaterialLocked(id: string, locked: boolean): void {
    this.edit((doc) => setLayerLocked(doc, id, locked));
  }
  moveMaterial(id: string, index: number): void {
    this.edit((doc) => moveLayer(doc, id, index));
  }
  deleteMaterial(id: string): void {
    this.edit((doc) => deleteLayer(doc, id));
  }

  setGradient(id: string, stops: GradientStop[]): void {
    const doc = this.document();
    if (!doc) return;
    const next: SpriteDocument = {
      ...doc,
      layers: doc.layers.map((l) =>
        l.id === id
          ? { ...l, gradient: { stops: stops.map((s) => ({ ...s })) } }
          : l,
      ),
    };
    const now = Date.now();
    const edit = this.gradientEdit;
    if (
      edit &&
      edit.id === id &&
      now - edit.at < GRADIENT_MERGE_MS &&
      this.history.canUndo()
    ) {
      this.gradientEdit = { ...edit, at: now };
      this.history.replaceTop(
        this.command(
          { document: edit.before, selection: this.selection() },
          { document: next, selection: this.selection() },
        ),
      );
      this.version.update((v) => v + 1);
      return;
    }
    this.gradientEdit = { id, at: now, before: doc };
    this.commit(next);
  }

  applyPreset(id: string, presetId: string): void {
    const preset = this.$presets().find((p) => p.id === presetId);
    if (preset) this.setGradient(id, preset.stops);
  }

  saveCustomPreset(id: string, name: string): void {
    const layer = this.document()?.layers.find((l) => l.id === id);
    if (!layer) return;
    const preset: SpritePreset = {
      id: `custom-${Date.now().toString(36)}-${this.customPresets().length}`,
      name,
      stops: layer.gradient.stops.map((s) => ({ ...s })),
    };
    const list = [...this.customPresets(), preset];
    this.customPresets.set(list);
    this.presetStorage.save(list);
  }

  deleteCustomPreset(presetId: string): void {
    const list = this.customPresets().filter((p) => p.id !== presetId);
    this.customPresets.set(list);
    this.presetStorage.save(list);
  }

  // Painting: a stroke is one history entry

  beginStroke(x: number, y: number): void {
    const doc = this.document();
    const tool = this.tool();
    const layer = this.$activeLayer();
    if (!doc || !layer || (tool !== 'brush' && tool !== 'eraser')) return;
    if (layer.locked || (tool === 'eraser' && layer.id === doc.baseId)) return;
    this.stroke = {
      before: doc,
      layerId: layer.id,
      erase: tool === 'eraser',
      mask: new Uint8Array(doc.width * doc.height),
      x,
      y,
    };
    const { size, hardness } = this.brush();
    stampBrushInPlace(
      this.stroke.mask,
      doc.width,
      doc.height,
      x,
      y,
      size,
      hardness,
    );
    this.applyStroke();
  }

  strokeTo(x: number, y: number): void {
    const stroke = this.stroke;
    const doc = this.document();
    if (!stroke || !doc) return;
    const { size, hardness } = this.brush();
    stampLineInPlace(
      stroke.mask,
      doc.width,
      doc.height,
      stroke.x,
      stroke.y,
      x,
      y,
      size,
      hardness,
    );
    stroke.x = x;
    stroke.y = y;
    this.applyStroke();
  }

  endStroke(): void {
    const stroke = this.stroke;
    const doc = this.document();
    this.stroke = null;
    if (!stroke || !doc || doc === stroke.before) return;
    const selection = this.selection();
    this.history.execute(
      this.command(
        { document: stroke.before, selection },
        { document: doc, selection },
      ),
    );
    this.version.update((v) => v + 1);
  }

  // Region tools

  bucketAt(x: number, y: number): void {
    const image = this.image();
    const layer = this.$activeLayer();
    if (!image || !layer || layer.locked) return;
    const region = floodFill(image, x, y, this.tolerance());
    this.edit((doc) => assignPixels(doc, layer.id, region));
  }

  wandAt(x: number, y: number, mode: SelectionMode): void {
    const image = this.image();
    if (!image) return;
    const region = magicWand(image, x, y, this.tolerance(), this.wandMode());
    this.commit(undefined, combineSelection(this.selection(), region, mode));
  }

  applySelection(): void {
    const doc = this.document();
    const layer = this.$activeLayer();
    if (!doc || !layer || layer.locked) return;
    this.commit(
      assignPixels(doc, layer.id, this.selection()),
      new Uint8Array(this.selection().length),
    );
  }

  invertSelection(): void {
    this.commit(undefined, invertMask(this.selection()));
  }

  clearSelection(): void {
    this.commit(undefined, new Uint8Array(this.selection().length));
  }

  // Polygon: vertices are collected, then closing selects the inside as one history entry

  addPolygonVertex(x: number, y: number): void {
    const image = this.image();
    if (!image) return;
    const { enabled, radius } = this.snap();
    const point = enabled ? snapToEdge(image, x, y, radius) : { x, y };
    const last = this.polygon().at(-1);
    if (last && last.x === point.x && last.y === point.y) return;
    this.polygon.update((list) => [...list, point]);
  }

  closePolygon(mode: SelectionMode): void {
    const doc = this.document();
    const vertices = this.polygon();
    this.polygon.set([]);
    if (!doc || vertices.length < 3) return;
    const region = rasterizePolygon(doc.width, doc.height, vertices);
    this.commit(undefined, combineSelection(this.selection(), region, mode));
  }

  cancelPolygon(): void {
    this.polygon.set([]);
  }

  // Shape detection: candidates are only proposals until applied

  /** Detects on the calling thread. */
  detectShapes(): void {
    const image = this.image();
    if (image) this.setCandidates(detectShapes(image, this.detectOptions(image)));
  }

  /** Detects in a Web Worker (inline where there is none), so a large image does not freeze the page. */
  async detectShapesAsync(): Promise<void> {
    const image = this.image();
    if (!image || this.detecting()) return;
    this.detecting.set(true);
    try {
      const found = await this.shapes.detect(image, this.detectOptions(image));
      if (this.image() === image) this.setCandidates(found);
    } finally {
      this.detecting.set(false);
    }
  }

  toggleCandidate(id: number): void {
    this.selectedCandidates.update((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
    );
  }

  /** Gives the pixels of the selected candidates to the active material or to a new one: one history entry. */
  applyCandidates(target: 'active' | 'new', name = 'Shape'): void {
    const doc = this.document();
    const ids = this.selectedCandidates();
    if (!doc || !ids.length) return;
    const union = new Uint8Array(doc.width * doc.height);
    for (const c of this.candidates()) {
      if (ids.includes(c.id))
        for (let p = 0; p < union.length; p++) if (c.mask[p]) union[p] = 1;
    }
    let base = doc;
    let layerId = this.$activeLayerId()!;
    if (target === 'new') {
      base = addLayer(doc, name);
      layerId = base.layers[base.layers.length - 1].id;
    }
    const next = assignPixels(base, layerId, union);
    if (next === doc) return;
    this.commit(next);
    this.activeId.set(layerId);
    this.selectedCandidates.set([]);
  }

  /** Regions smaller than a share of the opaque area are merged into a neighbour. */
  private detectOptions(image: SpriteImage) {
    return { tolerance: this.tolerance(), minSize: defaultMinSize(image) };
  }

  private setCandidates(shapes: DetectedShape[]): void {
    this.detected.set(true);
    this.candidates.set(shapes.map((s, id) => ({ id, ...s })));
    this.selectedCandidates.set([]);
  }

  // Configuration and export

  exportJson(): string {
    return exportConfig(this.document()!);
  }

  /** Throws when the text is not a configuration or is for another image size. */
  importJson(text: string): void {
    const doc = this.document();
    if (!doc) return;
    this.commit(importConfig(text, { width: doc.width, height: doc.height }));
  }

  async downloadPng(): Promise<void> {
    const out = this.$recolored();
    if (out)
      this.files.download(
        await this.files.encodePng(out),
        `${this.name()}-recolored.png`,
      );
  }

  downloadJson(): void {
    if (this.document()) {
      this.files.download(
        new Blob([this.exportJson()], { type: 'application/json' }),
        `${this.name()}-materials.json`,
      );
    }
  }

  async importJsonFile(file: File): Promise<void> {
    this.importJson(await this.files.readText(file));
  }

  // Internals

  private edit(change: (doc: SpriteDocument) => SpriteDocument): void {
    const doc = this.document();
    if (!doc) return;
    const next = change(doc);
    if (next !== doc) this.commit(next);
  }

  /** One undoable change of the document and/or the selection. */
  private commit(document?: SpriteDocument, selection?: Uint8Array): void {
    const current = this.document();
    if (!current) return;
    this.cancelStroke();
    this.gradientEdit = null;
    this.history.execute(
      this.command(
        { document: current, selection: this.selection() },
        {
          document: document ?? current,
          selection: selection ?? this.selection(),
        },
      ),
    );
    this.version.update((v) => v + 1);
  }

  private command(before: Snapshot, after: Snapshot): Command {
    const set = (s: Snapshot) => {
      this.document.set(s.document);
      this.selection.set(s.selection);
    };
    return { redo: () => set(after), undo: () => set(before) };
  }

  private applyStroke(): void {
    const stroke = this.stroke!;
    const before = stroke.before;
    if (stroke.erase) {
      const owned = before.layers.find((l) => l.id === stroke.layerId)!.mask;
      const part = stroke.mask.map((v, p) => (v && owned[p] ? 1 : 0));
      this.document.set(assignPixels(before, before.baseId, part));
    } else {
      this.document.set(assignPixels(before, stroke.layerId, stroke.mask));
    }
  }

  private cancelStroke(): void {
    if (!this.stroke) return;
    this.document.set(this.stroke.before);
    this.stroke = null;
  }
}
