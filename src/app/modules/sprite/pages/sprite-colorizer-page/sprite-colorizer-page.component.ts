import { Pack, SPRITE_KINDS, SpriteKind } from '../../../../core/packs/pack';
import {
  BundledSprite,
  PackBusiness,
} from '../../../../core/business/pack.business';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { ColorPickerModule } from '@openng/optimus-ui/colorpicker';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { SelectModule } from '@openng/optimus-ui/select';
import { EQUIPMENT_SLOTS } from '../../../../core/models/item';
import { SpriteSetTags } from '../../models/sprite-set';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { SelectButtonModule } from '@openng/optimus-ui/selectbutton';
import { SliderModule } from '@openng/optimus-ui/slider';
import { TagModule } from '@openng/optimus-ui/tag';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { MessageLevel } from '../../../../core/models/toast-level';
import { SpriteColorizerBusiness } from '../../business/sprite-colorizer.business';
import { brushCursor } from '../../helpers/brush-cursor';
import {
  groupSpritesByPack,
  searchSprites,
} from '../../helpers/sprite-library';
import { gradientColor } from '../../helpers/gradient-mapping';
import { isBuiltInPreset } from '../../helpers/presets';
import { shapeColor, shapeCss } from '../../helpers/shape-colors';
import {
  GradientStop,
  MaterialLayer,
  SelectionMode,
  SpriteTool,
} from '../../models/sprite';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 40;

interface Frame {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
  overlay: Uint8Array | null;
  selection: Uint8Array;
  shapes: { mask: Uint8Array; color: number[]; selected: boolean }[];
}

const toHex = (rgb: number[]) =>
  '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('');

/** Tool: recolour a grayscale sprite material by material (gradient mapping on masks). */
@Component({
  selector: 'app-sprite-colorizer-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    FormsModule,
    TranslocoPipe,
    ButtonModule,
    ColorPickerModule,
    DialogModule,
    SelectModule,
    InputNumberModule,
    InputTextModule,
    SelectButtonModule,
    SliderModule,
    TagModule,
    ToggleSwitchModule,
    TooltipModule,
  ],
  host: {
    '(document:keydown)': 'onKey($event)',
    '(document:keyup)': 'onKeyUp()',
    '(window:resize)': 'fit()',
  },
  templateUrl: './sprite-colorizer-page.component.html',
  styleUrl: './sprite-colorizer-page.component.scss',
})
export class SpriteColorizerPageComponent {
  protected readonly business = inject(SpriteColorizerBusiness);
  private readonly language = inject(LanguageBusiness);
  private readonly packs = inject(PackBusiness);
  private readonly bundled = signal<BundledSprite[]>([]);
  private readonly bundledPacks = signal<Pack[]>([]);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly injector = inject(Injector);

  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');
  private readonly mainCanvas =
    viewChild<ElementRef<HTMLCanvasElement>>('main');
  private readonly overlayCanvas =
    viewChild<ElementRef<HTMLCanvasElement>>('overlay');

  protected readonly zoom = signal(1);
  protected readonly offset = signal({ x: 0, y: 0 });
  protected readonly showOriginal = signal(false);
  protected readonly showMask = signal(true);
  protected readonly panMode = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly presetName = signal('');
  protected readonly pointer = signal<{ x: number; y: number } | null>(null);
  protected readonly libraryOpen = signal(false);
  protected readonly libraryQuery = signal('');
  protected readonly libraryKind = signal<SpriteKind | null>(null);
  protected readonly libraryKinds = computed(() => [
    { value: null, label: this.language.t('sprite.library.allKinds') },
    ...SPRITE_KINDS.map((kind) => ({
      value: kind,
      label: this.language.t('sprite.kind.' + kind),
    })),
  ]);
  protected readonly libraryView = signal<'bundled' | 'mine'>('bundled');
  protected readonly libraryViews = computed(() => [
    { value: 'bundled', label: this.language.t('sprite.library.bundled') },
    { value: 'mine', label: this.language.t('sprite.library.mine') },
  ]);
  protected readonly renamingSetId = signal<string | null>(null);
  /** What a saved set can illustrate, for the random item images; '' = nothing. */
  protected readonly setKinds = computed(() => [
    { value: '', label: this.language.t('sprite.sets.kindNone') },
    { value: 'item', label: this.language.t('item.type.item') },
    { value: 'consumable', label: this.language.t('item.type.consumable') },
    ...EQUIPMENT_SLOTS.map((slot) => ({
      value: `equipment:${slot}`,
      label: `${this.language.t('item.type.equipment')} · ${this.language.t('item.slot.' + slot)}`,
    })),
  ]);
  /** The saved sets, with their date in the page's language. */
  protected readonly savedSets = computed(() => {
    const format = new Intl.DateTimeFormat(this.language.$language() ?? 'fr', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    return this.business.$savedSets().map((set) => ({
      ...set,
      date: format.format(set.updatedAt),
      kind: !set.tags
        ? ''
        : set.tags.type === 'equipment'
          ? `equipment:${set.tags.slot}`
          : set.tags.type,
    }));
  });
  protected readonly libraryGroups = computed(() => {
    const lang = this.language.$language() ?? 'fr';
    const found = searchSprites(
      this.bundled(),
      this.libraryQuery(),
      lang,
      this.libraryKind(),
    );
    return groupSpritesByPack(found, this.bundledPacks(), lang).map(
      (group) => ({
        packId: group.packId,
        name: group.name,
        sprites: group.sprites.map((sprite) => ({
          id: sprite.id,
          label: lang === 'fr' ? sprite.fr : sprite.en,
          url: sprite.imageUrl,
          kind: sprite.kind,
        })),
      }),
    );
  });
  /** The pixel under a mouse or pen, for the brush outline. */
  private readonly hovered = signal<{ x: number; y: number } | null>(null);
  protected readonly brushCursor = computed(() =>
    this.panMode()
      ? null
      : brushCursor(
          this.business.$tool(),
          this.business.$brush(),
          this.hovered(),
        ),
  );

  protected readonly tools: { id: SpriteTool; icon: string; label: string }[] =
    [
      { id: 'brush', icon: 'pi pi-pencil', label: 'sprite.tools.brush' },
      { id: 'eraser', icon: 'pi pi-eraser', label: 'sprite.tools.eraser' },
      { id: 'bucket', icon: 'pi pi-palette', label: 'sprite.tools.bucket' },
      { id: 'wand', icon: 'pi pi-bolt', label: 'sprite.tools.wand' },
      { id: 'polygon', icon: 'pi pi-slack', label: 'sprite.tools.polygon' },
    ];
  protected readonly wandModes = computed(() => [
    { value: 'contiguous', label: this.language.t('sprite.tools.contiguous') },
    { value: 'global', label: this.language.t('sprite.tools.global') },
  ]);
  protected readonly viewModes = computed(() => [
    { value: false, label: this.language.t('sprite.view.recolored') },
    { value: true, label: this.language.t('sprite.view.original') },
  ]);

  protected readonly transform = computed(
    () =>
      `translate(${this.offset().x}px, ${this.offset().y}px) scale(${this.zoom()})`,
  );
  protected readonly layers = computed(
    () => this.business.$document()?.layers ?? [],
  );

  protected readonly shapeCss = shapeCss;
  protected readonly handleRadius = computed(() => 4 / this.zoom());
  protected readonly polygonLine = computed(() =>
    this.business
      .$polygonVertices()
      .map((p) => `${p.x},${p.y}`)
      .join(' '),
  );
  /** Last vertex, pointer, first vertex: where the polygon would close. */
  protected readonly polygonPreview = computed(() => {
    const vertices = this.business.$polygonVertices();
    const at = this.pointer();
    if (!vertices.length || !at) return '';
    const first = vertices[0];
    const last = vertices[vertices.length - 1];
    return `${last.x},${last.y} ${at.x},${at.y} ${first.x},${first.y}`;
  });

  protected onPointerLeave(): void {
    this.pointer.set(null);
    this.hovered.set(null);
  }

  private drag: { kind: 'pan' | 'paint'; x: number; y: number } | null = null;
  private spaceHeld = false;
  private pending: Frame | null = null;
  private frameRequested = false;
  private overlayBuffer: Uint8ClampedArray | null = null;
  private shownImage: unknown = null;

  constructor() {
    this.packs
      .sprites()
      .then((sprites) => this.bundled.set(sprites))
      .catch(() => undefined);
    this.packs
      .manifest()
      .then((pack) => this.bundledPacks.set([pack]))
      .catch(() => undefined);
    // Fit the sprite in the viewport when a new image arrives.
    effect(() => {
      const image = this.business.$image();
      this.viewport();
      if (image && image !== this.shownImage) {
        this.shownImage = image;
        queueMicrotask(() => this.fit());
      }
    });
    // Collect what to draw; the drawing itself waits for the next animation frame.
    effect(() => {
      const image = this.business.$image();
      if (!image) return;
      const pixels = (this.showOriginal() ? image : this.business.$recolored())
        ?.data;
      const layer = this.business.$activeLayer();
      const selected = new Set(this.business.$selectedCandidates());
      if (!pixels) return;
      this.pending = {
        width: image.width,
        height: image.height,
        pixels,
        overlay: this.showMask() && layer ? layer.mask : null,
        selection: this.business.$selection(),
        shapes: this.business.$candidates().map((c) => ({
          mask: c.mask,
          color: shapeColor(c.id),
          selected: selected.has(c.id),
        })),
      };
      this.mainCanvas();
      this.overlayCanvas();
      this.scheduleDraw();
    });
  }

  // Rendering

  private scheduleDraw(): void {
    if (this.frameRequested) return;
    this.frameRequested = true;
    const raf =
      globalThis.requestAnimationFrame ??
      ((cb: () => void) => setTimeout(cb, 16));
    raf(() => {
      this.frameRequested = false;
      this.draw();
    });
  }

  private draw(): void {
    const frame = this.pending;
    const main = this.mainCanvas()?.nativeElement;
    const overlay = this.overlayCanvas()?.nativeElement;
    if (!frame || !main || !overlay) return;
    for (const canvas of [main, overlay]) {
      if (canvas.width !== frame.width) canvas.width = frame.width;
      if (canvas.height !== frame.height) canvas.height = frame.height;
    }
    const ctx = this.context(main);
    const octx = this.context(overlay);
    if (!ctx || !octx) return;
    ctx.putImageData(
      new ImageData(
        frame.pixels as Uint8ClampedArray<ArrayBuffer>,
        frame.width,
        frame.height,
      ),
      0,
      0,
    );

    const size = frame.width * frame.height * 4;
    if (this.overlayBuffer?.length !== size)
      this.overlayBuffer = new Uint8ClampedArray(size);
    const buffer = this.overlayBuffer;
    for (let p = 0; p < frame.width * frame.height; p++) {
      const i = p * 4;
      const shape = frame.selection[p]
        ? undefined
        : frame.shapes.find((c) => c.mask[p]);
      if (frame.selection[p]) {
        buffer[i] = 250;
        buffer[i + 1] = 204;
        buffer[i + 2] = 21;
        buffer[i + 3] = 150;
      } else if (shape) {
        buffer[i] = shape.color[0];
        buffer[i + 1] = shape.color[1];
        buffer[i + 2] = shape.color[2];
        buffer[i + 3] = shape.selected ? 220 : 100;
      } else if (frame.overlay?.[p] && frame.pixels[i + 3] > 0) {
        buffer[i] = 236;
        buffer[i + 1] = 72;
        buffer[i + 2] = 153;
        buffer[i + 3] = 90;
      } else buffer[i + 3] = 0;
    }
    octx.putImageData(
      new ImageData(
        buffer as Uint8ClampedArray<ArrayBuffer>,
        frame.width,
        frame.height,
      ),
      0,
      0,
    );
  }

  private context(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
    try {
      return canvas.getContext('2d');
    } catch {
      return null;
    }
  }

  // View: zoom and pan

  protected fit(): void {
    const box = this.viewport()?.nativeElement;
    const image = this.business.$image();
    if (!box || !image || !box.clientWidth) return;
    const scale =
      Math.min(
        box.clientWidth / image.width,
        box.clientHeight / image.height,
        8,
      ) * 0.95;
    this.zoom.set(scale);
    this.offset.set({
      x: (box.clientWidth - image.width * scale) / 2,
      y: (box.clientHeight - image.height * scale) / 2,
    });
  }

  protected zoomBy(factor: number, cx?: number, cy?: number): void {
    const box = this.viewport()?.nativeElement;
    const old = this.zoom();
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, old * factor));
    const px = cx ?? (box?.clientWidth ?? 0) / 2;
    const py = cy ?? (box?.clientHeight ?? 0) / 2;
    const k = next / old;
    this.zoom.set(next);
    this.offset.update((o) => ({
      x: px - (px - o.x) * k,
      y: py - (py - o.y) * k,
    }));
  }

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    const rect = this.viewport()!.nativeElement.getBoundingClientRect();
    this.zoomBy(
      event.deltaY < 0 ? 1.15 : 1 / 1.15,
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
  }

  // Pointer

  private pixelAt(event: PointerEvent): { x: number; y: number } | null {
    const canvas = this.overlayCanvas()?.nativeElement;
    const image = this.business.$image();
    if (!canvas || !image) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return null;
    return {
      x: Math.floor(((event.clientX - rect.left) / rect.width) * image.width),
      y: Math.floor(((event.clientY - rect.top) / rect.height) * image.height),
    };
  }

  protected onPointerDown(event: PointerEvent): void {
    this.hovered.set(this.pixelAt(event));
    const target = event.currentTarget as HTMLElement;
    if (event.button === 1 || this.panMode() || this.spaceHeld) {
      this.drag = { kind: 'pan', x: event.clientX, y: event.clientY };
      target.setPointerCapture?.(event.pointerId);
      return;
    }
    if (event.button !== 0) return;
    const at = this.pixelAt(event);
    if (!at) return;
    switch (this.business.$tool()) {
      case 'brush':
      case 'eraser':
        this.drag = { kind: 'paint', x: at.x, y: at.y };
        target.setPointerCapture?.(event.pointerId);
        this.business.beginStroke(at.x, at.y);
        break;
      case 'bucket':
        this.business.bucketAt(at.x, at.y);
        break;
      case 'wand':
        this.business.wandAt(at.x, at.y, this.modeOf(event));
        break;
      case 'polygon': {
        const corner = this.cornerAt(event) ?? at;
        this.business.addPolygonVertex(corner.x, corner.y);
        break;
      }
    }
  }

  /** Shift adds to the selection, Alt removes from it. */
  private modeOf(event: { shiftKey: boolean; altKey: boolean }): SelectionMode {
    return event.shiftKey ? 'add' : event.altKey ? 'remove' : 'replace';
  }

  /** The nearest pixel corner: where a polygon vertex goes. */
  private cornerAt(event: PointerEvent): { x: number; y: number } | null {
    const canvas = this.overlayCanvas()?.nativeElement;
    const image = this.business.$image();
    const rect = canvas?.getBoundingClientRect();
    if (!image || !rect?.width) return null;
    return {
      x: Math.round(((event.clientX - rect.left) / rect.width) * image.width),
      y: Math.round(((event.clientY - rect.top) / rect.height) * image.height),
    };
  }

  protected onDoubleClick(event: MouseEvent): void {
    if (this.business.$tool() === 'polygon')
      this.business.closePolygon(this.modeOf(event));
  }

  protected onPointerMove(event: PointerEvent): void {
    this.hovered.set(this.pixelAt(event));
    if (
      this.business.$tool() === 'polygon' &&
      this.business.$polygonVertices().length
    )
      this.pointer.set(this.cornerAt(event));
    const drag = this.drag;
    if (!drag) return;
    if (drag.kind === 'pan') {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      drag.x = event.clientX;
      drag.y = event.clientY;
      this.offset.update((o) => ({ x: o.x + dx, y: o.y + dy }));
      return;
    }
    const at = this.pixelAt(event);
    if (at) this.business.strokeTo(at.x, at.y);
  }

  protected onPointerUp(event?: PointerEvent): void {
    if (event?.pointerType === 'touch') this.hovered.set(null);
    if (this.drag?.kind === 'paint') this.business.endStroke();
    this.drag = null;
  }

  // Keyboard

  protected onKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
    this.spaceHeld = event.key === ' ' ? true : this.spaceHeld;
    const polygonOpen =
      this.business.$tool() === 'polygon' &&
      this.business.$polygonVertices().length > 0;
    if (polygonOpen && event.key === 'Enter') {
      event.preventDefault();
      this.business.closePolygon(this.modeOf(event));
      return;
    }
    if (polygonOpen && event.key === 'Escape') {
      event.preventDefault();
      this.business.cancelPolygon();
      return;
    }
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (mod && key === 'z') {
      event.preventDefault();
      event.shiftKey ? this.business.redo() : this.business.undo();
    } else if (mod && key === 'y') {
      event.preventDefault();
      this.business.redo();
    } else if (!mod && !event.altKey) {
      const tool = {
        b: 'brush',
        e: 'eraser',
        g: 'bucket',
        w: 'wand',
        p: 'polygon',
      }[key] as SpriteTool | undefined;
      if (tool) this.business.setTool(tool);
    }
  }

  protected onKeyUp(): void {
    this.spaceHeld = false;
  }

  // Files

  protected async openImage(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      await this.business.loadFile(file);
    } catch {
      this.toast(MessageLevel.Error, 'sprite.loadFailed');
    }
  }

  protected openLibrary(): void {
    this.libraryQuery.set('');
    this.libraryKind.set(null);
    this.libraryOpen.set(true);
    this.business.refreshSets().catch(() => undefined);
  }

  protected async saveSet(): Promise<void> {
    try {
      await this.business.saveSet(this.defaultSetName());
      this.toast(MessageLevel.Success, 'sprite.sets.saved');
    } catch {
      this.toast(MessageLevel.Error, 'sprite.sets.saveFailed');
    }
  }

  /** A saved set keeps its name; a bundled sprite is named after its label in the page's language. */
  private defaultSetName(): string {
    const name = this.business.$fileName();
    if (this.business.$currentSetId()) return name;
    const sprite = this.bundled().find((s) => s.id === name);
    if (!sprite) return name;
    return this.language.$language() === 'en' ? sprite.en : sprite.fr;
  }

  protected async openSet(id: string): Promise<void> {
    this.libraryOpen.set(false);
    await this.loadSprite(() => this.business.openSet(id));
  }

  protected startRenameSet(id: string): void {
    this.renamingSetId.set(id);
    afterNextRender(
      () =>
        document.querySelector<HTMLInputElement>('.saved-name-input')?.select(),
      { injector: this.injector },
    );
  }

  protected async renameSet(id: string, name: string): Promise<void> {
    if (this.renamingSetId() !== id) return;
    this.renamingSetId.set(null);
    await this.business.renameSet(id, name);
  }

  protected setKind(id: string, kind: string): void {
    const [type, slot] = kind.split(':');
    const tags: SpriteSetTags | undefined = !kind
      ? undefined
      : type === 'equipment'
        ? { type: 'equipment', slot: slot as SpriteSetTags['slot'] }
        : { type: type as SpriteSetTags['type'], slot: 'none' };
    void this.business.setSetTags(id, tags);
  }

  protected deleteSet(set: { id: string; name: string }): void {
    this.confirmation.confirm({
      header: this.language.t('sprite.sets.deleteTitle'),
      message: this.language.t('sprite.sets.deleteMessage', { name: set.name }),
      icon: 'pi pi-trash',
      acceptButtonProps: {
        label: this.language.t('sprite.sets.delete'),
        severity: 'danger',
      },
      rejectButtonProps: {
        label: this.language.t('common.cancel'),
        severity: 'secondary',
        text: true,
      },
      accept: () => void this.business.deleteSet(set.id),
    });
  }

  protected async pickSprite(id: string): Promise<void> {
    this.libraryOpen.set(false);
    await this.loadSprite(() => this.business.loadLibrary(id));
  }

  protected loadDemo(): Promise<void> {
    return this.loadSprite(() => this.business.loadDemo());
  }

  private async loadSprite(load: () => Promise<void>): Promise<void> {
    try {
      await load();
    } catch (error) {
      const refused =
        error instanceof Error && error.message === 'sprite.coloredRefused';
      this.toast(
        MessageLevel.Error,
        refused ? 'sprite.coloredRefused' : 'sprite.loadFailed',
      );
    }
  }

  protected async importJson(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      await this.business.importJsonFile(file);
    } catch {
      this.toast(MessageLevel.Error, 'sprite.importFailed');
    }
  }

  private toast(severity: MessageLevel, key: string): void {
    this.messages.add({ severity, detail: this.language.t(key) });
  }

  // Shapes

  protected applyShapes(target: 'active' | 'new'): void {
    this.business.applyCandidates(
      target,
      this.language.t('sprite.shapes.newName'),
    );
  }

  protected setSnap(
    patch: Partial<{ enabled: boolean; radius: number }>,
  ): void {
    this.business.setSnap({ ...this.business.$snap(), ...patch });
  }

  // Materials

  protected addMaterial(): void {
    const n = this.layers().length;
    this.business.addMaterial(
      this.language.t('sprite.materials.defaultName', { n }),
    );
  }

  protected materialName(layer: MaterialLayer): string {
    const base =
      layer.id === this.business.$document()?.baseId && layer.name === 'Base';
    return base ? this.language.t('sprite.materials.base') : layer.name;
  }

  protected rename(layer: MaterialLayer, name: string): void {
    this.editingId.set(null);
    const trimmed = name.trim();
    if (trimmed && trimmed !== layer.name)
      this.business.renameMaterial(layer.id, trimmed);
  }

  protected swatch(stops: GradientStop[]): string {
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    return `linear-gradient(to right, ${sorted.map((s) => `${s.color} ${Math.round(s.position * 100)}%`).join(', ')})`;
  }

  // Gradient

  private editStops(change: (stops: GradientStop[]) => GradientStop[]): void {
    const layer = this.business.$activeLayer();
    if (layer)
      this.business.setGradient(layer.id, change(layer.gradient.stops));
  }

  protected setStopColor(index: number, color: string | null): void {
    if (!color) return;
    this.editStops((stops) =>
      stops.map((s, i) => (i === index ? { ...s, color } : s)),
    );
  }

  protected setStopPosition(index: number, percent: number | null): void {
    if (percent === null) return;
    const position = Math.min(1, Math.max(0, percent / 100));
    this.editStops((stops) =>
      stops.map((s, i) => (i === index ? { ...s, position } : s)),
    );
  }

  protected addStop(): void {
    this.editStops((stops) => {
      const sorted = [...stops].sort((a, b) => a.position - b.position);
      let at = 0;
      let widest = -1;
      for (let i = 0; i < sorted.length - 1; i++) {
        const gap = sorted[i + 1].position - sorted[i].position;
        if (gap > widest) {
          widest = gap;
          at = i;
        }
      }
      const position =
        sorted.length > 1
          ? (sorted[at].position + sorted[at + 1].position) / 2
          : 0.5;
      return [
        ...stops,
        { position, color: toHex(gradientColor(stops, position)) },
      ];
    });
  }

  protected removeStop(index: number): void {
    this.editStops((stops) =>
      stops.length > 2 ? stops.filter((_, i) => i !== index) : stops,
    );
  }

  protected presetLabel(id: string, name: string): string {
    return isBuiltInPreset(id) ? this.language.t(`sprite.presets.${id}`) : name;
  }

  protected isBuiltIn = isBuiltInPreset;

  protected applyPreset(presetId: string): void {
    const layer = this.business.$activeLayer();
    if (layer) this.business.applyPreset(layer.id, presetId);
  }

  protected savePreset(): void {
    const layer = this.business.$activeLayer();
    const name = this.presetName().trim();
    if (!layer || !name) return;
    this.business.saveCustomPreset(layer.id, name);
    this.presetName.set('');
  }

  protected setBrush(patch: Partial<{ size: number; hardness: number }>): void {
    this.business.setBrush({ ...this.business.$brush(), ...patch });
  }
}
