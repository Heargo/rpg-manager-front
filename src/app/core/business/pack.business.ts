import { computed, inject, Injectable, signal } from '@angular/core';
import {
  Pack,
  packFileUrl,
  PackGenerator,
  PackLanguage,
  PackSprite,
  SPRITE_KINDS,
  SpriteKind,
  validatePack,
} from '../packs/pack';
import { runLimited } from '../helpers/pool';
import { ActivePacksBusiness } from './active-packs.business';
import { LanguageBusiness } from './language.business';
import {
  checkImageFile,
  checkJsonFile,
  checkMaterialsFile,
  failureReason as reason,
  ImageSize,
  listChecker,
  MAX_PACK_BYTES,
} from '../packs/pack-files';
import { resolvePackLink } from '../packs/pack-link';
import { PackRegistryEntry, validateRegistry } from '../packs/pack-registry';
import { ImageProcessingService } from '../services/image-processing.service';
import { PackService } from '../services/pack.service';
import {
  PackStorageService,
  StoredPack,
  StoredPackFile,
} from '../services/pack-storage.service';

export const BASE_PACK_IDS = ['base-fr', 'base-en'] as const;

/** The Base pack of a language (English for a language without a Base). */
export const basePackId = (lang: string): string =>
  lang === 'fr' ? 'base-fr' : 'base-en';

export const isBasePack = (id: string): boolean =>
  (BASE_PACK_IDS as readonly string[]).includes(id);

/** At most this many files are fetched at a time. */
const MAX_FETCHES = 4;
const MAX_MANIFEST_BYTES = 64 * 1024;

/** A pack that cannot be installed: `message` is the first problem, `errors` lists them all (file name and reason). */
export class PackError extends Error {
  constructor(readonly errors: string[]) {
    super(errors[0] ?? 'Invalid pack');
  }
}

/** An unofficial pack downloaded and checked, not yet stored. */
export interface PreparedPack {
  manifest: Pack;
  /** The link the user gave. */
  source: string;
  manifestUrl: string;
  size: number;
  counts: {
    generators: number;
    sprites: Partial<Record<SpriteKind, number>>;
  };
  files: Map<string, StoredPackFile>;
}

export interface PackUpdate {
  oldVersion: string;
  newVersion: string;
  prepared: PreparedPack;
}

/** A pack sprite with the pack it comes from and the URLs of its files. */
export interface BundledSprite extends PackSprite {
  packId: string;
  imageUrl: string;
  materialsUrl?: string;
}

/** A pack available on this device: Base, or an official pack that was downloaded. */
export interface InstalledPack {
  id: string;
  language: PackLanguage;
  name: string;
  description: string;
  author: string;
  license: string;
  licenseUrl: string;
  version: string;
  builtIn: boolean;
  /** The link an unofficial pack was installed from. */
  link?: string;
  /** Created with the pack creator on this device. */
  local?: boolean;
  homepage?: string;
  /** The pack's sprites, for the details view. */
  sprites: PackSprite[];
  generators: Pack['generators'];
}

const installedOf = (
  pack: Pack,
  builtIn: boolean,
  link?: string,
  local = false,
): InstalledPack => ({
  id: pack.id,
  language: pack.language,
  name: pack.name,
  description: pack.description,
  author: pack.author,
  license: pack.license,
  licenseUrl: pack.licenseUrl,
  version: pack.version,
  builtIn,
  sprites: pack.sprites,
  generators: pack.generators,
  ...(link ? { link } : {}),
  ...(local ? { local } : {}),
  ...(pack.homepage ? { homepage: pack.homepage } : {}),
});

/**
 * The packs: Base (served with the app, always on) and the official packs the user downloads (stored in
 * IndexedDB, usable offline). Gives the sprites of the active packs and the word lists.
 */
@Injectable({ providedIn: 'root' })
export class PackBusiness {
  private readonly service = inject(PackService);
  private readonly storage = inject(PackStorageService);
  private readonly images = inject(ImageProcessingService);
  private readonly languageBusiness = inject(LanguageBusiness);
  private readonly activePacks = inject(ActivePacksBusiness);
  private readonly enabling = new Map<string, Promise<void>>();
  private readonly manifestPromises = new Map<string, Promise<Pack>>();
  private registryPromise: Promise<PackRegistryEntry[]> | null = null;
  private loadPromise: Promise<void> | null = null;
  private readonly stored = signal<StoredPack[]>([]);
  private readonly bases = signal<Record<string, Pack | null>>({});
  private readonly loaded = signal(false);
  private baseEntries: PackRegistryEntry[] = [];
  /** Object URLs of stored packs' files, by pack id then path; created once per pack. */
  private readonly urls = new Map<string, Promise<Map<string, string>>>();
  private order: string[] = [];

  /** Base first, then the downloaded packs; filled once the business has loaded. */
  readonly $installed = computed<InstalledPack[]>(() => {
    if (!this.loaded()) return [];
    return [
      ...BASE_PACK_IDS.map((id) => this.installedBase(id)),
      ...this.sortedStored().map((p) =>
        installedOf(
          p.manifest,
          false,
          p.source !== 'official' && p.source.kind === 'unofficial'
            ? p.source.link
            : undefined,
          p.source !== 'official' && p.source.kind === 'local',
        ),
      ),
    ];
  });

  /** A Base from its manifest, or from its registry entry when the manifest cannot be read. */
  private installedBase(id: string): InstalledPack {
    const base = this.bases()[id];
    if (base) return installedOf(base, true);
    const entry = this.baseEntries.find((p) => p.id === id);
    return {
      id,
      language: entry?.language ?? (id === 'base-fr' ? 'fr' : 'en'),
      name: entry?.name ?? 'Base',
      description: entry?.description ?? '',
      author: entry?.author ?? '',
      license: entry?.license ?? '',
      licenseUrl: entry?.licenseUrl ?? '',
      version: '',
      builtIn: true,
      sprites: [],
      generators: {},
    };
  }

  private sortedStored(): StoredPack[] {
    const rank = (id: string) => {
      const i = this.order.indexOf(id);
      return i < 0 ? Number.MAX_SAFE_INTEGER : i;
    };
    return [...this.stored()].sort((a, b) => rank(a.id) - rank(b.id));
  }

  /** A Base manifest, loaded and validated once; throws with the errors when it is invalid. */
  manifest(id: string): Promise<Pack> {
    let promise = this.manifestPromises.get(id);
    if (!promise) {
      promise = this.loadManifest(id);
      this.manifestPromises.set(id, promise);
      // A failed load shouldn't stay cached: retry next time.
      const known = promise;
      known.catch(() => {
        if (this.manifestPromises.get(id) === known)
          this.manifestPromises.delete(id);
      });
    }
    return promise;
  }

  private async loadManifest(id: string): Promise<Pack> {
    const result = validatePack(await this.service.loadManifest(id));
    if (!result.ok)
      throw new Error(`Invalid pack "${id}": ${result.errors.join('; ')}`);
    return result.value;
  }

  /** The official packs of the registry (Base included), in order. */
  async registry(): Promise<PackRegistryEntry[]> {
    const entries = await this.registryEntries();
    await this.ensureLoaded();
    return entries;
  }

  private registryEntries(): Promise<PackRegistryEntry[]> {
    if (!this.registryPromise) {
      const promise = this.loadRegistry();
      this.registryPromise = promise;
      promise.catch(() => (this.registryPromise = null));
    }
    return this.registryPromise;
  }

  private async loadRegistry(): Promise<PackRegistryEntry[]> {
    const result = validateRegistry(await this.service.loadRegistry());
    if (!result.ok)
      throw new Error(`Invalid pack registry: ${result.errors.join('; ')}`);
    return result.value.packs;
  }

  /**
   * Loads Base and the stored packs once. Neither the registry nor the device storage is required for Base:
   * when they are unavailable, only Base is listed.
   */
  private ensureLoaded(): Promise<void> {
    this.loadPromise ??= (async () => {
      const entries = await this.registryEntries().catch(() => []);
      this.order = entries.map((p) => p.id);
      this.baseEntries = entries.filter((p) => isBasePack(p.id));
      this.stored.set(await this.storage.list().catch(() => []));
      // Without a readable Base manifest, the Base is listed from the registry and `sprites()` reports the error.
      const bases: Record<string, Pack | null> = {};
      for (const id of BASE_PACK_IDS)
        bases[id] = await this.manifest(id).catch(() => null);
      this.bases.set(bases);
      this.loaded.set(true);
    })();
    this.loadPromise.catch(() => (this.loadPromise = null));
    return this.loadPromise;
  }

  /** Loads the installed packs so `$installed` is filled; never fails because of the network or the storage. */
  load(): Promise<void> {
    return this.ensureLoaded();
  }

  /**
   * The pack ids to draw from: the packs of the open world (or the Base of the app language without one) that are
   * installed, in order; an id that is not installed is skipped.
   */
  private activeIds(): string[] {
    const world = this.activePacks.$worldPacks();
    if (!world) return [basePackId(this.languageBusiness.$language())];
    const stored = new Set(this.stored().map((p) => p.id));
    return world.filter((id) => isBasePack(id) || stored.has(id));
  }

  /** The sprites of the active packs, with their file URLs; the Base of the app language when none has sprites. */
  async sprites(): Promise<BundledSprite[]> {
    await this.ensureLoaded();
    const result: BundledSprite[] = [];
    for (const id of this.activeIds()) result.push(...(await this.spritesOfActive(id)));
    if (result.length) return result;
    const baseId = basePackId(this.languageBusiness.$language());
    return this.baseSprites(baseId);
  }

  private async spritesOfActive(id: string): Promise<BundledSprite[]> {
    if (isBasePack(id)) return this.baseSprites(id).catch(() => []);
    const record = this.stored().find((p) => p.id === id);
    return record ? this.storedSprites(record) : [];
  }

  private async baseSprites(baseId: string): Promise<BundledSprite[]> {
    const base = await this.manifest(baseId);
    const manifestUrl = `packs/${baseId}/pack.json`;
    return base.sprites.map((sprite) => ({
      ...sprite,
      packId: baseId,
      imageUrl: packFileUrl(manifestUrl, sprite.image),
      ...(sprite.materials
        ? { materialsUrl: packFileUrl(manifestUrl, sprite.materials) }
        : {}),
    }));
  }

  private async storedSprites(record: StoredPack): Promise<BundledSprite[]> {
    const urls = await this.objectUrls(record);
    return record.manifest.sprites.map((sprite) => {
      const materialsUrl = sprite.materials
        ? urls.get(sprite.materials)
        : undefined;
      return {
        ...sprite,
        packId: record.id,
        imageUrl: urls.get(sprite.image) ?? '',
        ...(materialsUrl ? { materialsUrl } : {}),
      };
    });
  }

  /** The sprites of one installed pack, whatever its language, for its details. */
  async spritesOf(packId: string): Promise<BundledSprite[]> {
    await this.ensureLoaded();
    if (isBasePack(packId)) {
      const base = await this.manifest(packId);
      const manifestUrl = `packs/${packId}/pack.json`;
      return base.sprites.map((sprite) => ({
        ...sprite,
        packId,
        imageUrl: packFileUrl(manifestUrl, sprite.image),
        ...(sprite.materials
          ? { materialsUrl: packFileUrl(manifestUrl, sprite.materials) }
          : {}),
      }));
    }
    const record = this.stored().find((p) => p.id === packId);
    return record ? this.storedSprites(record) : [];
  }

  /** The object URLs of a stored pack's sprite files, created once until the pack is replaced or removed. */
  private objectUrls(record: StoredPack): Promise<Map<string, string>> {
    let known = this.urls.get(record.id);
    if (!known) {
      known = this.createUrls(record);
      this.urls.set(record.id, known);
      known.catch(() => this.urls.delete(record.id));
    }
    return known;
  }

  private async createUrls(record: StoredPack): Promise<Map<string, string>> {
    const urls = new Map<string, string>();
    for (const sprite of record.manifest.sprites) {
      for (const path of [sprite.image, sprite.materials]) {
        if (!path || urls.has(path)) continue;
        const file = await this.storage.getFile(record.id, path);
        if (!file) continue;
        const blob =
          file.kind === 'blob'
            ? new Blob([file.bytes], { type: file.type })
            : new Blob([JSON.stringify(file.value)], {
                type: 'application/json',
              });
        urls.set(path, URL.createObjectURL(blob));
      }
    }
    return urls;
  }

  private async revokeUrls(id: string): Promise<void> {
    const pending = this.urls.get(id);
    this.urls.delete(id);
    const urls = await pending?.catch(() => undefined);
    for (const url of urls?.values() ?? []) URL.revokeObjectURL(url);
  }

  /** Downloads an official pack onto the device; does nothing when it is already there. */
  enable(id: string): Promise<void> {
    let running = this.enabling.get(id);
    if (!running) {
      running = this.doEnable(id);
      this.enabling.set(id, running);
      const clear = () => this.enabling.delete(id);
      running.then(clear, clear);
    }
    return running;
  }

  private async doEnable(id: string): Promise<void> {
    await this.ensureLoaded();
    if (this.stored().some((p) => p.id === id)) return;
    const entry = (await this.registry()).find((p) => p.id === id);
    if (!entry) throw new Error(`Unknown pack "${id}"`);
    if (entry.builtIn || isBasePack(id)) return;
    await this.download(entry);
    this.stored.set(await this.storage.list());
  }

  /** Fetches the manifest and every file it lists, then stores them all in one go. */
  private async download(entry: PackRegistryEntry): Promise<void> {
    const id = entry.id;
    const result = validatePack(await this.service.loadManifest(id));
    if (!result.ok)
      throw new Error(`Invalid pack "${id}": ${result.errors.join('; ')}`);
    const manifest = result.value;
    if (manifest.id !== id)
      throw new Error(`Invalid pack "${id}": id does not match the registry`);

    const images = new Set<string>();
    const jsons = new Set<string>();
    for (const sprite of manifest.sprites) {
      images.add(sprite.image);
      if (sprite.materials) jsons.add(sprite.materials);
    }
    for (const path of Object.values(manifest.generators))
      if (path) jsons.add(path);

    const url = (path: string) => `packs/${id}/${path}`;
    const files = new Map<string, StoredPackFile>();
    const tasks = [
      ...[...images].map((path) => async () => {
        const blob = await this.service.loadBlob(url(path));
        files.set(path, {
          kind: 'blob',
          bytes: await blob.arrayBuffer(),
          type: blob.type,
        });
      }),
      ...[...jsons].map((path) => async () => {
        files.set(path, {
          kind: 'json',
          value: await this.service.loadJson(url(path)),
        });
      }),
    ];
    await runLimited(tasks, MAX_FETCHES, (task) => task());
    await this.storage.install(
      {
        id,
        manifest,
        source: 'official',
        installedAt: Date.now(),
        size: entry.size,
      },
      files,
    );
  }

  /** Deletes a downloaded pack and its files from the device. */
  async remove(id: string): Promise<void> {
    if (isBasePack(id)) throw new Error('A Base pack cannot be removed');
    await this.ensureLoaded();
    await this.storage.remove(id);
    await this.revokeUrls(id);
    this.stored.set(await this.storage.list());
  }

  /**
   * Resolves the link, downloads the pack and checks everything (manifest, word lists, images, materials). Stores
   * nothing; rejects with a `PackError` listing every problem.
   */
  async prepare(link: string): Promise<PreparedPack> {
    const resolved = resolvePackLink(link);
    if (!resolved.ok) throw new PackError([resolved.error]);
    const { manifestUrl, source } = resolved;
    await this.ensureLoaded();

    let json: unknown;
    try {
      json = await this.service.loadJson(manifestUrl);
    } catch (error) {
      throw new PackError([`pack.json: ${reason(error)}`]);
    }
    if (JSON.stringify(json).length > MAX_MANIFEST_BYTES)
      throw new PackError(['pack.json: larger than 64 KB']);
    const result = validatePack(json);
    if (!result.ok)
      throw new PackError(result.errors.map((e) => `pack.json: ${e}`));
    const manifest = result.value;
    await this.checkClash(manifest.id, source);

    const fileUrl = (path: string) => new URL(path, manifestUrl).href;
    const files = new Map<string, StoredPackFile>();
    const errors: string[] = [];
    const dimensions = new Map<string, ImageSize>();
    let size = 0;

    const images = new Set<string>();
    const lists = new Map<string, (json: unknown) => string[]>();
    const materials = new Set<string>();
    for (const sprite of manifest.sprites) {
      images.add(sprite.image);
      if (sprite.materials) materials.add(sprite.materials);
    }
    for (const [generator, path] of Object.entries(manifest.generators))
      if (path) lists.set(path, listChecker(generator as PackGenerator));

    const tasks: (() => Promise<void>)[] = [
      ...[...images].map((path) => async () => {
        try {
          const blob = await this.service.loadBlob(fileUrl(path));
          size += blob.size;
          const checked = await checkImageFile(path, blob, (b) =>
            this.images.dimensions(b),
          );
          if ('error' in checked) return void errors.push(checked.error);
          const dims = checked.dims;
          dimensions.set(path, dims);
          files.set(path, {
            kind: 'blob',
            bytes: await blob.arrayBuffer(),
            type: blob.type,
          });
        } catch (error) {
          errors.push(`${path}: ${reason(error)}`);
        }
      }),
      ...[...new Set([...lists.keys(), ...materials])].map((path) => async () => {
        try {
          const value = await this.service.loadJson(fileUrl(path));
          size += JSON.stringify(value).length;
          errors.push(...checkJsonFile(path, value, lists.get(path)));
          files.set(path, { kind: 'json', value });
        } catch (error) {
          errors.push(`${path}: ${reason(error)}`);
        }
      }),
    ];
    await runLimited(tasks, MAX_FETCHES, (task) => task());

    for (const sprite of manifest.sprites) {
      const file = sprite.materials ? files.get(sprite.materials) : undefined;
      const dims = dimensions.get(sprite.image);
      if (!sprite.materials || file?.kind !== 'json' || !dims) continue;
      const problem = checkMaterialsFile(sprite.materials, file.value, dims);
      if (problem) errors.push(problem);
    }
    if (size > MAX_PACK_BYTES) errors.push('pack: larger than 20 MB in total');
    if (errors.length) throw new PackError([...new Set(errors)].sort());

    const counts: PreparedPack['counts'] = {
      generators: Object.values(manifest.generators).filter(Boolean).length,
      sprites: {},
    };
    for (const kind of SPRITE_KINDS) {
      const n = manifest.sprites.filter((s) => s.kind === kind).length;
      if (n) counts.sprites[kind] = n;
    }
    return { manifest, source, manifestUrl, size, counts, files };
  }

  /** Refuses an id of an official pack, or already installed from another link (`source` null: created here). */
  private async checkClash(id: string, source: string | null): Promise<void> {
    // Fail closed: without the registry, an official id cannot be told apart.
    const entries = await this.registryEntries().catch(() => {
      throw new PackError([
        'pack.json: the list of official packs could not be loaded',
      ]);
    });
    const official = entries.some((p) => p.id === id);
    const stored = this.stored().find((p) => p.id === id);
    const storedSource = stored?.source;
    if (official || isBasePack(id) || storedSource === 'official')
      throw new PackError([`pack.json: id "${id}" is an official pack`]);
    if (storedSource && storedSource.kind === 'unofficial') {
      if (storedSource.link !== source)
        throw new PackError([
          `pack.json: id "${id}" is already installed from another link`,
        ]);
    } else if (storedSource && source !== null)
      throw new PackError([
        `pack.json: id "${id}" is already installed from this device`,
      ]);
  }

  /** Refuses an id an official pack or a pack from a link already has; rejects with a `PackError`. */
  async checkLocalId(id: string): Promise<void> {
    await this.ensureLoaded();
    await this.checkClash(id, null);
  }

  /** Stores a pack made on this device, enabled; the same id replaces the pack that is there. */
  async installLocal(
    manifest: Pack,
    files: Map<string, StoredPackFile>,
    size: number,
  ): Promise<void> {
    await this.checkLocalId(manifest.id);
    await this.storage.install(
      {
        id: manifest.id,
        manifest,
        source: { kind: 'local' },
        installedAt: Date.now(),
        size,
      },
      files,
    );
    await this.revokeUrls(manifest.id);
    this.stored.set(await this.storage.list());
  }

  /** A file of an installed pack as stored. */
  async readFile(
    packId: string,
    path: string,
  ): Promise<StoredPackFile | undefined> {
    return this.storage.getFile(packId, path);
  }

  /** Stores a prepared pack, enabled; the same link replaces the pack that is there. */
  async install(prepared: PreparedPack): Promise<void> {
    await this.ensureLoaded();
    const { manifest, source, manifestUrl } = prepared;
    await this.checkClash(manifest.id, source);
    await this.storage.install(
      {
        id: manifest.id,
        manifest,
        source: { kind: 'unofficial', link: source, manifestUrl },
        installedAt: Date.now(),
        size: prepared.size,
      },
      prepared.files,
    );
    await this.revokeUrls(manifest.id);
    this.stored.set(await this.storage.list());
  }

  /** Downloads the installed unofficial pack again from its link; installing the result replaces it. */
  async checkUpdate(id: string): Promise<PackUpdate> {
    await this.ensureLoaded();
    const record = this.stored().find((p) => p.id === id);
    if (
      !record ||
      record.source === 'official' ||
      record.source.kind !== 'unofficial'
    )
      throw new Error(`"${id}" is not an unofficial pack`);
    const prepared = await this.prepare(record.source.link);
    if (prepared.manifest.id !== id)
      throw new PackError([`pack.json: id is not "${id}" any more`]);
    return {
      oldVersion: record.manifest.version,
      newVersion: prepared.manifest.version,
      prepared,
    };
  }

  /**
   * The active packs with content of that kind, in the world's order: a word list for the generator (`items`,
   * `npcs`, `skills`, `classes`) or sprites (`sprites`). When none has any, the Base of the app language.
   */
  async packsFor(content: PackGenerator | 'sprites'): Promise<string[]> {
    await this.ensureLoaded();
    const result: string[] = [];
    for (const id of this.activeIds()) {
      const manifest = isBasePack(id)
        ? this.bases()[id]
        : this.stored().find((p) => p.id === id)?.manifest;
      if (!manifest) continue;
      const has =
        content === 'sprites'
          ? manifest.sprites.length > 0
          : !!manifest.generators[content];
      if (has) result.push(id);
    }
    return result.length
      ? result
      : [basePackId(this.languageBusiness.$language())];
  }

  /** The raw word list of a generator in a pack; rejects when the pack has none. */
  async wordList(generator: PackGenerator, packId: string): Promise<unknown> {
    const missing = () =>
      new Error(`Pack "${packId}" has no ${generator} word list`);
    if (!isBasePack(packId)) {
      await this.ensureLoaded();
      const record = this.stored().find((p) => p.id === packId);
      const path = record?.manifest.generators[generator];
      const file = path ? await this.storage.getFile(packId, path) : undefined;
      if (file?.kind !== 'json') throw missing();
      return file.value;
    }
    const pack = await this.manifest(packId);
    const path = pack.generators[generator];
    if (!path) throw missing();
    return this.service.loadJson(
      packFileUrl(`packs/${packId}/pack.json`, path),
    );
  }
}
