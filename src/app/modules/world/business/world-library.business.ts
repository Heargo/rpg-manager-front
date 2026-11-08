import { computed, inject, Injectable, signal } from '@angular/core';
import { ImageBusiness } from '../../../core/business/image.business';
import { LanguageBusiness } from '../../../core/business/language.business';
import { WordListBusiness } from '../../../core/business/word-list.business';
import { seededRandomSource } from '../../../core/generators/random-source';
import { generateStarterItems } from '../helpers/starter-items';
import { validateWorldDraft, WorldDraftErrors } from '../helpers/world-draft.rules';
import { buildWorldExport, ExportedImage, parseWorldExport, WorldExport } from '../helpers/world-export';
import { createWorld, remapWorldImages, summarizeWorld, worldImageIds } from '../helpers/world.factory';
import { World, WorldDraft, WorldSummary } from '../models/world';
import { WorldStorageService } from '../services/world-storage.service';

export class WorldImportError extends Error {
  constructor(readonly errors: string[]) {
    super(`Invalid world file: ${errors.join('; ')}`);
  }
}

/** The worlds stored on this device (the GM's library). */
@Injectable({ providedIn: 'root' })
export class WorldLibraryBusiness {
  private readonly storage = inject(WorldStorageService);
  private readonly imageBusiness = inject(ImageBusiness);
  private readonly wordLists = inject(WordListBusiness);
  private readonly language = inject(LanguageBusiness);

  private readonly worlds = signal<WorldSummary[]>([]);
  /** Most recently changed first. */
  readonly $worlds = computed(() => [...this.worlds()].sort((a, b) => b.updatedAt - a.updatedAt));

  async load(): Promise<void> {
    this.worlds.set((await this.storage.list()).map(summarizeWorld));
  }

  get(id: string): Promise<World | undefined> {
    return this.storage.get(id);
  }

  /** Creates a world, optionally with the default items and the starter classes and skills built on its own attributes (in the active language). */
  async create(draft: WorldDraft, options: { starterItems?: boolean; starterClasses?: boolean } = {}): Promise<World> {
    let world = createWorld(draft, () => crypto.randomUUID(), Date.now());
    if (options.starterItems) {
      const words = await this.wordLists.itemWords();
      const barIds = [world.barAttributes.life, world.barAttributes.mana];
      const items = generateStarterItems(seededRandomSource(world.id), words, {
        attributes: world.attributes.map((attribute) => attribute.name),
        barAttributes: world.attributes.filter((attribute) => barIds.includes(attribute.id)).map((attribute) => attribute.name),
      });
      world = { ...world, items: items.map((item) => ({ ...item, id: crypto.randomUUID() })) };
    }
    if (options.starterClasses) {
      const { buildStarterClasses } = await import('../helpers/starter-classes');
      world = { ...world, ...buildStarterClasses(world, this.language.$language(), () => crypto.randomUUID()) };
    }
    await this.persist(world);
    return world;
  }

  /** Problems with a wizard draft, as translation keys per field (empty when it can be created). */
  validateDraft(draft: WorldDraft): WorldDraftErrors {
    return validateWorldDraft(draft);
  }

  /** Stores an uploaded picture (world icon…) and returns its image id. */
  uploadImage(file: Blob): Promise<string> {
    return this.imageBusiness.storeUpload(file);
  }

  /** Saves changes and bumps `updatedAt`. */
  async save(world: World): Promise<World> {
    const saved = { ...world, updatedAt: Date.now() };
    await this.persist(saved);
    return saved;
  }

  /** Deletes the world. Its images stay: another world may use the same bytes. */
  async remove(id: string): Promise<void> {
    await this.storage.delete(id);
    this.worlds.update((worlds) => worlds.filter((world) => world.id !== id));
  }

  /** The world and every image it uses, as one JSON file. */
  async exportWorld(id: string): Promise<Blob> {
    const world = await this.storage.get(id);
    if (!world) throw new Error(`World ${id} not found`);
    const images: Record<string, ExportedImage> = {};
    for (const imageId of worldImageIds(world)) {
      const image = await this.imageBusiness.toBase64(imageId);
      if (image) images[imageId] = image;
    }
    const file: WorldExport = buildWorldExport(world, images, Date.now());
    return new Blob([JSON.stringify(file)], { type: 'application/json' });
  }

  /**
   * Imports an exported world as a new copy (new id, so it never overwrites one on this device).
   * Image ids are recomputed from the bytes, so a tampered id can't point at another image.
   */
  async importWorld(text: string): Promise<World> {
    const parsed = parseWorldExport(text);
    if (!parsed.ok) throw new WorldImportError(parsed.errors);
    const { world, images } = parsed.value;

    const idMap = new Map<string, string>();
    for (const [oldId, image] of Object.entries(images)) {
      idMap.set(oldId, await this.imageBusiness.fromBase64(image));
    }
    const now = Date.now();
    const imported: World = { ...remapWorldImages(world, idMap), id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    await this.persist(imported);
    return imported;
  }

  private async persist(world: World): Promise<void> {
    await this.storage.put(world);
    const summary = summarizeWorld(world);
    this.worlds.update((worlds) => [...worlds.filter((existing) => existing.id !== world.id), summary]);
  }
}
