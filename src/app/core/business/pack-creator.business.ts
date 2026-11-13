import { inject, Injectable, signal } from '@angular/core';
import { strToU8, zipSync } from 'fflate';
import { SpriteSet } from '../../modules/sprite/models/sprite-set';
import { SpriteSetBusiness } from '../../modules/sprite/business/sprite-set.business';
import { ItemSlot, ItemType } from '../models/item';
import {
  Pack,
  PACK_GENERATORS,
  PackGenerator,
  packFileUrl,
  SpriteKind,
  validatePack,
} from '../packs/pack';
import {
  buildPack,
  DraftSprite,
  PackDraft,
  slugifyPackId,
} from '../packs/pack-draft';
import {
  checkImageFile,
  checkJsonFile,
  checkMaterialsFile,
  ImageSize,
  listChecker,
  MAX_PACK_BYTES,
} from '../packs/pack-files';
import { ImageProcessingService } from '../services/image-processing.service';
import { PackDraftStorageService } from '../services/pack-draft-storage.service';
import { PackService } from '../services/pack.service';
import { StoredPackFile } from '../services/pack-storage.service';
import { runLimited } from '../helpers/pool';
import { ImageBusiness } from './image.business';
import { LanguageBusiness } from './language.business';
import { basePackId, isBasePack, PackBusiness, PackError } from './pack.business';

/** What a sprite needs besides its image. */
export type SpriteMeta = Omit<DraftSprite, 'image' | 'materials'>;

/** A draft built, checked and ready to be stored or zipped. */
interface BuiltPack {
  manifest: Pack;
  files: Map<string, StoredPackFile>;
  /** The files as built, to zip. */
  raw: Map<string, Blob | unknown>;
  size: number;
}

/** Sprite files read at once when copying Base. */
const MAX_FETCHES = 4;

/** The word added to a copy's id and name, in the language of the pack. */
const COPY_WORDS = { en: 'copy', fr: 'copie' } as const;

const uniqueId = (wanted: string, taken: Set<string>): string => {
  const base = wanted || 'sprite';
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
};

/** The pack creator: drafts on the device, and building them into a pack that is installed or exported. */
@Injectable({ providedIn: 'root' })
export class PackCreatorBusiness {
  private readonly storage = inject(PackDraftStorageService);
  private readonly packs = inject(PackBusiness);
  private readonly service = inject(PackService);
  private readonly images = inject(ImageProcessingService);
  private readonly imageStore = inject(ImageBusiness);
  private readonly sets = inject(SpriteSetBusiness);
  private readonly language = inject(LanguageBusiness);

  private readonly drafts = signal<PackDraft[]>([]);
  /** Bumped by every write, so a list read before a write is not shown after it. */
  private writes = 0;

  /** The drafts on this device, the latest changed first; filled by `loadDrafts` and kept up to date by the writes. */
  readonly $drafts = this.drafts.asReadonly();

  /** Reads the drafts into `$drafts`. */
  async loadDrafts(): Promise<void> {
    for (;;) {
      const seen = this.writes;
      const list = await this.listDrafts();
      if (seen === this.writes) {
        this.drafts.set(list);
        return;
      }
    }
  }

  private wrote(draft: PackDraft): void {
    this.writes++;
    this.drafts.update((list) =>
      [draft, ...list.filter((d) => d.id !== draft.id)].sort(
        (a, b) => b.updatedAt - a.updatedAt,
      ),
    );
  }

  /** The saved drafts, the latest changed first. */
  async listDrafts(): Promise<PackDraft[]> {
    return (await this.storage.list()).sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
  }

  getDraft(id: string): Promise<PackDraft | undefined> {
    return this.storage.get(id);
  }

  /** Saves a new empty draft. */
  async createDraft(): Promise<PackDraft> {
    const draft: PackDraft = {
      id: crypto.randomUUID(),
      updatedAt: Date.now(),
      details: {
        id: '',
        language: this.language.$language() === 'fr' ? 'fr' : 'en',
        name: '',
        description: '',
        version: '1.0.0',
        author: '',
        license: '',
        licenseUrl: '',
      },
      generators: {},
      sprites: [],
    };
    await this.storage.save(draft);
    this.wrote(draft);
    return draft;
  }

  /** Saves the draft, stamping the time of the change. */
  async saveDraft(draft: PackDraft): Promise<PackDraft> {
    const saved = { ...draft, updatedAt: Date.now() };
    await this.storage.save(saved);
    this.wrote(saved);
    return saved;
  }

  async deleteDraft(id: string): Promise<void> {
    await this.storage.delete(id);
    this.writes++;
    this.drafts.update((list) => list.filter((d) => d.id !== id));
  }

  private async draftOrThrow(id: string): Promise<PackDraft> {
    const draft = await this.storage.get(id);
    if (!draft) throw new PackError([`draft "${id}" does not exist`]);
    return draft;
  }

  private async addSprite(
    draftId: string,
    sprite: DraftSprite,
  ): Promise<DraftSprite> {
    const draft = await this.draftOrThrow(draftId);
    if (draft.sprites.some((s) => s.id === sprite.id))
      throw new PackError([`sprite "${sprite.id}": id is used twice`]);
    await this.saveDraft({ ...draft, sprites: [...draft.sprites, sprite] });
    return sprite;
  }

  /** Adds an uploaded PNG as a sprite: at most 1 MB, readable, at most 256 x 256. Rejects with the reason. */
  async addPng(
    draftId: string,
    file: Blob,
    meta: SpriteMeta,
  ): Promise<DraftSprite> {
    if (meta.kind === 'masked')
      throw new PackError(['an uploaded image has no materials yet']);
    const checked = await checkImageFile(`sprites/${meta.id}.png`, file, (b) =>
      this.images.dimensions(b),
    );
    if ('error' in checked) throw new PackError([checked.error]);
    return this.addSprite(draftId, { ...meta, image: file });
  }

  /** Adds the colorizer's sprite as a masked sprite, with its materials; same limits as `addPng`. */
  async addFromColorizer(
    draftId: string,
    sprite: Omit<DraftSprite, 'kind' | 'materials'> & { materials: string },
  ): Promise<DraftSprite> {
    const checked = await checkImageFile(
      `sprites/${sprite.id}.png`,
      sprite.image,
      (b) => this.images.dimensions(b),
    );
    if ('error' in checked) throw new PackError([checked.error]);
    return this.addSprite(draftId, { ...sprite, kind: 'masked' });
  }

  /** Replaces the materials of a sprite and keeps its image; a grayscale sprite becomes masked, a colored one is refused. */
  async updateSpriteMaterials(
    draftId: string,
    spriteId: string,
    materials: string,
  ): Promise<DraftSprite> {
    const draft = await this.draftOrThrow(draftId);
    const sprite = draft.sprites.find((s) => s.id === spriteId);
    if (!sprite) throw new PackError([`sprite "${spriteId}" does not exist`]);
    if (sprite.kind === 'colored')
      throw new PackError([`sprite "${spriteId}": a colored sprite has no materials`]);
    const updated: DraftSprite = { ...sprite, kind: 'masked', materials };
    await this.saveDraft({
      ...draft,
      sprites: draft.sprites.map((s) => (s === sprite ? updated : s)),
    });
    return updated;
  }

  /** The sprite sets saved in the colorizer, to add as sprites. */
  listSpriteSets(): Promise<SpriteSet[]> {
    return this.sets.list();
  }

  /** Adds a saved sprite set as a masked sprite, with its materials; its tags prefill the type and slot. */
  async addFromSpriteSet(draftId: string, setId: string): Promise<DraftSprite> {
    const set = (await this.sets.list()).find((s) => s.id === setId);
    if (!set) throw new PackError([`sprite "${setId}" does not exist`]);
    const draft = await this.draftOrThrow(draftId);
    const image = await this.setImage(set.source);
    const id = uniqueId(
      slugifyPackId(set.name),
      new Set(draft.sprites.map((s) => s.id)),
    );
    return this.addSprite(draftId, {
      id,
      label: set.name,
      type: set.tags?.type ?? 'item',
      slot: set.tags?.slot ?? 'none',
      kind: 'masked',
      image,
      materials: set.config,
    });
  }

  private async setImage(
    source:
      | { kind: 'library'; spriteId: string }
      | { kind: 'image'; imageId: string },
  ): Promise<Blob> {
    if (source.kind === 'image') {
      const blob = await this.imageStore.blob(source.imageId);
      if (!blob) throw new PackError(['the image of this sprite is missing']);
      return blob;
    }
    const sprite = (await this.packs.sprites()).find(
      (s) => s.id === source.spriteId,
    );
    if (!sprite) throw new PackError(['the image of this sprite is missing']);
    return this.service.loadBlob(sprite.imageUrl);
  }

  /** Copies the word list of a generator from the Base of the draft's language into the draft. */
  async copyBaseList(
    draftId: string,
    generator: PackGenerator,
  ): Promise<unknown> {
    const draft = await this.draftOrThrow(draftId);
    const value = await this.packs.wordList(
      generator,
      basePackId(draft.details.language),
    );
    const latest = await this.draftOrThrow(draftId);
    await this.saveDraft({
      ...latest,
      generators: { ...latest.generators, [generator]: value },
    });
    return value;
  }

  /** The problems of a word list value (an unparsed text is a string), as the validators word them. */
  wordListErrors(generator: PackGenerator, value: unknown): string[] {
    return listChecker(generator)(value);
  }

  /** A warning for the pack id: it is an official pack's, or already installed from a link. */
  async idWarning(id: string): Promise<'official' | 'link' | null> {
    if (!id) return null;
    const entries = await this.packs.registry().catch(() => []);
    if (isBasePack(id) || entries.some((p) => p.id === id))
      return 'official';
    const installed = this.packs.$installed().find((p) => p.id === id);
    return installed?.link ? 'link' : null;
  }

  /** Builds the draft and runs the checks of "Add a pack"; rejects with a `PackError` listing every problem. */
  private async build(draftId: string): Promise<BuiltPack> {
    const draft = await this.draftOrThrow(draftId);
    const { manifest, files: raw } = buildPack(draft);
    const errors: string[] = [];
    const result = validatePack(manifest);
    if (!result.ok) errors.push(...result.errors.map((e) => `pack.json: ${e}`));

    const lists = new Map<string, (json: unknown) => string[]>();
    for (const generator of PACK_GENERATORS) {
      const path = manifest.generators[generator];
      if (path) lists.set(path, listChecker(generator));
    }
    const dimensions = new Map<string, ImageSize>();
    const files = new Map<string, StoredPackFile>();
    let size = 0;
    for (const [path, file] of raw) {
      if (file instanceof Blob) {
        size += file.size;
        const checked = await checkImageFile(path, file, (b) =>
          this.images.dimensions(b),
        );
        if ('error' in checked) errors.push(checked.error);
        else dimensions.set(path, checked.dims);
        files.set(path, {
          kind: 'blob',
          bytes: await file.arrayBuffer(),
          type: file.type || 'image/png',
        });
      } else {
        size += JSON.stringify(file ?? null).length;
        errors.push(...checkJsonFile(path, file, lists.get(path)));
        files.set(path, { kind: 'json', value: file });
      }
    }
    for (const sprite of manifest.sprites) {
      const dims = dimensions.get(sprite.image);
      if (!sprite.materials || !dims) continue;
      const problem = checkMaterialsFile(
        sprite.materials,
        raw.get(sprite.materials),
        dims,
      );
      if (problem) errors.push(problem);
    }
    if (size > MAX_PACK_BYTES) errors.push('pack: larger than 20 MB in total');
    if (errors.length) throw new PackError([...new Set(errors)].sort());
    return { manifest, files, raw, size };
  }

  /** Installs the draft on this device as a local pack, enabled; installing again replaces it. */
  async install(draftId: string): Promise<void> {
    const built = await this.build(draftId);
    await this.packs.installLocal(built.manifest, built.files, built.size);
  }

  /** The draft as a `.zip` in the documented layout, after the same checks as the installation. */
  async exportZip(
    draftId: string,
  ): Promise<{ fileName: string; bytes: Uint8Array }> {
    const { manifest, raw } = await this.build(draftId);
    const entries: Record<string, Uint8Array> = {
      'pack.json': strToU8(JSON.stringify(manifest, null, 2)),
    };
    for (const [path, file] of raw)
      entries[path] =
        file instanceof Blob
          ? new Uint8Array(await file.arrayBuffer())
          : strToU8(JSON.stringify(file, null, 2));
    return {
      fileName: `${manifest.id}-${manifest.version}.zip`,
      bytes: zipSync(entries),
    };
  }

  /** Copies an installed unofficial or local pack into a new saved draft; official packs are refused. */
  async draftFromInstalled(packId: string): Promise<PackDraft> {
    await this.packs.load();
    const pack = this.packs.$installed().find((p) => p.id === packId);
    if (!pack || pack.builtIn || (!pack.link && !pack.local))
      throw new PackError([`"${packId}" cannot be edited as a draft`]);

    const generators: PackDraft['generators'] = {};
    for (const generator of PACK_GENERATORS) {
      if (!pack.generators[generator]) continue;
      generators[generator] = await this.packs.wordList(generator, packId);
    }

    const sprites = await this.copySprites(pack.id, pack.sprites);

    const draft: PackDraft = {
      id: crypto.randomUUID(),
      updatedAt: Date.now(),
      details: {
        id: pack.id,
        language: pack.language,
        name: pack.name,
        description: pack.description,
        version: pack.version,
        author: pack.author,
        license: pack.license,
        licenseUrl: pack.licenseUrl,
        ...(pack.homepage ? { homepage: pack.homepage } : {}),
      },
      generators,
      sprites,
    };
    await this.storage.save(draft);
    this.wrote(draft);
    return draft;
  }

  private async copySprites(
    packId: string,
    list: Pack['sprites'],
  ): Promise<DraftSprite[]> {
    const base = isBasePack(packId);
    const manifestUrl = `packs/${packId}/pack.json`;
    const sprites: DraftSprite[] = new Array(list.length);
    const indexes = list.map((_, i) => i);
    await runLimited(indexes, MAX_FETCHES, async (i) => {
      const sprite = list[i];
      let image: Blob;
      let materials: string | undefined;
      if (base) {
        image = await this.service.loadBlob(
          packFileUrl(manifestUrl, sprite.image),
        );
        if (sprite.materials)
          materials = JSON.stringify(
            await this.service.loadJson(
              packFileUrl(manifestUrl, sprite.materials),
            ),
          );
      } else {
        const file = await this.packs.readFile(packId, sprite.image);
        if (file?.kind !== 'blob')
          throw new PackError([`${sprite.image}: file is missing`]);
        image = new Blob([file.bytes], { type: file.type });
        const json = sprite.materials
          ? await this.packs.readFile(packId, sprite.materials)
          : undefined;
        if (json?.kind === 'json') materials = JSON.stringify(json.value);
      }
      sprites[i] = {
        id: sprite.id,
        label: sprite.label,
        type: sprite.type as ItemType,
        slot: sprite.slot as ItemSlot,
        kind: sprite.kind as SpriteKind,
        image,
        ...(materials ? { materials } : {}),
      };
    });
    return sprites;
  }

  /** Copies an available pack (Base, downloaded official, link or local) into a new saved draft with a free id. */
  async duplicate(packId: string): Promise<PackDraft> {
    await this.packs.load();
    const pack = this.packs.$installed().find((p) => p.id === packId);
    if (!pack) throw new PackError([`"${packId}" cannot be duplicated`]);

    const generators: PackDraft['generators'] = {};
    for (const generator of PACK_GENERATORS) {
      if (!pack.generators[generator]) continue;
      generators[generator] = await this.packs.wordList(generator, packId);
    }
    const sprites = await this.copySprites(pack.id, pack.sprites);

    const suffix = COPY_WORDS[pack.language];
    const taken = new Set<string>([
      ...(await this.packs.registry().catch(() => [])).map((p) => p.id),
      ...this.packs.$installed().map((p) => p.id),
      ...(await this.storage.list()).map((d) => d.details.id),
    ]);
    const id = uniqueId(`${pack.id}-${suffix}`, taken);

    const draft: PackDraft = {
      id: crypto.randomUUID(),
      updatedAt: Date.now(),
      details: {
        id,
        language: pack.language,
        name: `${pack.name} (${suffix})`,
        description: pack.description,
        version: pack.version,
        author: pack.author,
        license: pack.license,
        licenseUrl: pack.licenseUrl,
        ...(pack.homepage ? { homepage: pack.homepage } : {}),
      },
      generators,
      sprites,
    };
    await this.storage.save(draft);
    this.wrote(draft);
    return draft;
  }
}
