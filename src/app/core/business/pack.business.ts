import { computed, inject, Injectable, signal } from '@angular/core';
import {
  Pack,
  packFileUrl,
  PackGenerator,
  PackSprite,
  SPRITE_KINDS,
  SpriteKind,
  validatePack,
} from '../packs/pack';
import { isClassWordList, isSkillWordList } from '../generators/pack-word-lists';
import { validateNpcNameList } from '../generators/npc-name-list';
import { validateWordList } from '../generators/word-list';
import { runLimited } from '../helpers/pool';
import { importConfig } from '../../modules/sprite/helpers/config-export';
import { resolvePackLink } from '../packs/pack-link';
import { PackRegistryEntry, validateRegistry } from '../packs/pack-registry';
import { ImageProcessingService } from '../services/image-processing.service';
import { PackService } from '../services/pack.service';
import {
  PackStorageService,
  StoredPack,
  StoredPackFile,
} from '../services/pack-storage.service';

export const BASE_PACK_ID = 'base';

/** At most this many files are fetched at a time. */
const MAX_FETCHES = 4;
const MAX_MANIFEST_BYTES = 64 * 1024;
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_PACK_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_SIDE = 256;

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
    generators: Record<string, number>;
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
  name: Pack['name'];
  description: Pack['description'];
  author: string;
  license: string;
  licenseUrl: string;
  version: string;
  enabled: boolean;
  builtIn: boolean;
  /** The link an unofficial pack was installed from. */
  link?: string;
  /** The pack's sprites, for the details view. */
  sprites: PackSprite[];
  generators: Pack['generators'];
}

const installedOf = (
  pack: Pack,
  enabled: boolean,
  builtIn: boolean,
  link?: string,
): InstalledPack => ({
  id: pack.id,
  name: pack.name,
  description: pack.description,
  author: pack.author,
  license: pack.license,
  licenseUrl: pack.licenseUrl,
  version: pack.version,
  enabled,
  builtIn,
  sprites: pack.sprites,
  generators: pack.generators,
  ...(link ? { link } : {}),
});

/**
 * The packs: Base (served with the app, always on) and the official packs the user downloads (stored in
 * IndexedDB, usable offline). Gives the sprites of every enabled pack and the word lists.
 */
@Injectable({ providedIn: 'root' })
export class PackBusiness {
  private readonly service = inject(PackService);
  private readonly storage = inject(PackStorageService);
  private readonly images = inject(ImageProcessingService);
  private readonly enabling = new Map<string, Promise<void>>();
  private manifestPromise: Promise<Pack> | null = null;
  private registryPromise: Promise<PackRegistryEntry[]> | null = null;
  private loadPromise: Promise<void> | null = null;
  private readonly stored = signal<StoredPack[]>([]);
  private readonly base = signal<Pack | null>(null);
  private readonly loaded = signal(false);
  private baseEntry?: PackRegistryEntry;
  /** Object URLs of stored packs' files, by pack id then path; created once per pack. */
  private readonly urls = new Map<string, Promise<Map<string, string>>>();
  private order: string[] = [];

  /** Base first, then the downloaded packs; filled once the business has loaded. */
  readonly $installed = computed<InstalledPack[]>(() => {
    if (!this.loaded()) return [];
    return [
      this.installedBase(),
      ...this.sortedStored().map((p) =>
        installedOf(
          p.manifest,
          p.enabled,
          false,
          p.source === 'official' ? undefined : p.source.link,
        ),
      ),
    ];
  });

  /** Base from its manifest, or from its registry entry when the manifest cannot be read. */
  private installedBase(): InstalledPack {
    const base = this.base();
    if (base) return installedOf(base, true, true);
    const entry = this.baseEntry;
    return {
      id: BASE_PACK_ID,
      name: {
        en: entry?.name['en'] ?? 'Base',
        fr: entry?.name['fr'] ?? 'Base',
      },
      description: {
        en: entry?.description['en'] ?? '',
        fr: entry?.description['fr'] ?? '',
      },
      author: entry?.author ?? '',
      license: entry?.license ?? '',
      licenseUrl: entry?.licenseUrl ?? '',
      version: '',
      enabled: true,
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

  /** The Base manifest, loaded and validated once; throws with the errors when it is invalid. */
  manifest(): Promise<Pack> {
    if (!this.manifestPromise) {
      const promise = this.loadManifest();
      this.manifestPromise = promise;
      // A failed load shouldn't stay cached: retry next time.
      promise.catch(() => (this.manifestPromise = null));
    }
    return this.manifestPromise;
  }

  private async loadManifest(): Promise<Pack> {
    const result = validatePack(await this.service.loadManifest(BASE_PACK_ID));
    if (!result.ok)
      throw new Error(
        `Invalid pack "${BASE_PACK_ID}": ${result.errors.join('; ')}`,
      );
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
      this.baseEntry = entries.find((p) => p.id === BASE_PACK_ID);
      this.stored.set(await this.storage.list().catch(() => []));
      // Without a readable Base manifest, Base is listed from the registry and `sprites()` reports the error.
      this.base.set(await this.manifest().catch(() => null));
      this.loaded.set(true);
    })();
    this.loadPromise.catch(() => (this.loadPromise = null));
    return this.loadPromise;
  }

  /** Loads the installed packs so `$installed` is filled; never fails because of the network or the storage. */
  load(): Promise<void> {
    return this.ensureLoaded();
  }

  /** The sprites of every enabled pack, Base first, with their file URLs. */
  async sprites(): Promise<BundledSprite[]> {
    await this.ensureLoaded();
    const enabled = this.sortedStored().filter((p) => p.enabled);
    // Base files ship with the app; a stored pack stays usable when they cannot be read.
    const base = await this.manifest().catch((error) => {
      if (!enabled.length) throw error;
      return null;
    });
    const manifestUrl = `packs/${BASE_PACK_ID}/pack.json`;
    const result: BundledSprite[] = (base?.sprites ?? []).map((sprite) => ({
      ...sprite,
      packId: BASE_PACK_ID,
      imageUrl: packFileUrl(manifestUrl, sprite.image),
      ...(sprite.materials
        ? { materialsUrl: packFileUrl(manifestUrl, sprite.materials) }
        : {}),
    }));
    for (const record of enabled) {
      const urls = await this.objectUrls(record);
      for (const sprite of record.manifest.sprites) {
        const materialsUrl = sprite.materials
          ? urls.get(sprite.materials)
          : undefined;
        result.push({
          ...sprite,
          packId: record.id,
          imageUrl: urls.get(sprite.image) ?? '',
          ...(materialsUrl ? { materialsUrl } : {}),
        });
      }
    }
    return result;
  }

  /** The object URLs of a stored pack's sprite files, created once until the pack is disabled or removed. */
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

  /** Turns an official pack on, downloading it first when it is not on the device. */
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
    const record = this.stored().find((p) => p.id === id);
    const entry = (await this.registry()).find((p) => p.id === id);
    if (!entry && record && record.source !== 'official') {
      await this.storage.setEnabled(id, true);
      this.stored.set(await this.storage.list());
      return;
    }
    if (!entry) throw new Error(`Unknown pack "${id}"`);
    if (entry.builtIn || id === BASE_PACK_ID) return;
    if (this.stored().some((p) => p.id === id)) {
      await this.storage.setEnabled(id, true);
    } else {
      await this.download(entry);
    }
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
    for (const paths of Object.values(manifest.generators))
      for (const path of Object.values(paths ?? {})) if (path) jsons.add(path);

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
        enabled: true,
        installedAt: Date.now(),
        size: entry.size,
      },
      files,
    );
  }

  /** Turns a downloaded pack off; its files stay on the device. */
  async disable(id: string): Promise<void> {
    if (id === BASE_PACK_ID) throw new Error('The Base pack is always on');
    await this.ensureLoaded();
    await this.storage.setEnabled(id, false);
    await this.revokeUrls(id);
    this.stored.set(await this.storage.list());
  }

  /** Deletes a downloaded pack and its files from the device. */
  async remove(id: string): Promise<void> {
    if (id === BASE_PACK_ID) throw new Error('The Base pack cannot be removed');
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
    const dimensions = new Map<string, { width: number; height: number }>();
    let size = 0;

    const images = new Set<string>();
    const lists = new Map<string, (json: unknown) => string[]>();
    const materials = new Set<string>();
    for (const sprite of manifest.sprites) {
      images.add(sprite.image);
      if (sprite.materials) materials.add(sprite.materials);
    }
    for (const files of Object.values(manifest.generators))
      for (const [generator, path] of Object.entries(files ?? {}))
        if (path) lists.set(path, listChecker(generator as PackGenerator));

    const tasks: (() => Promise<void>)[] = [
      ...[...images].map((path) => async () => {
        try {
          const blob = await this.service.loadBlob(fileUrl(path));
          if (blob.size > MAX_FILE_BYTES)
            return void errors.push(`${path}: larger than 1 MB`);
          size += blob.size;
          const dims = await this.images.dimensions(blob).catch(() => null);
          if (!dims)
            return void errors.push(`${path}: not a readable image`);
          if (dims.width > MAX_IMAGE_SIDE || dims.height > MAX_IMAGE_SIDE)
            return void errors.push(
              `${path}: ${dims.width} x ${dims.height}, larger than ${MAX_IMAGE_SIDE} x ${MAX_IMAGE_SIDE}`,
            );
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
          const length = JSON.stringify(value).length;
          if (length > MAX_FILE_BYTES)
            return void errors.push(`${path}: larger than 1 MB`);
          size += length;
          const problems = lists.get(path)?.(value) ?? [];
          for (const problem of problems) errors.push(`${path}: ${problem}`);
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
      try {
        importConfig(JSON.stringify(file.value), dims);
      } catch (error) {
        errors.push(`${sprite.materials}: ${reason(error)}`);
      }
    }
    if (size > MAX_PACK_BYTES) errors.push('pack: larger than 20 MB in total');
    if (errors.length) throw new PackError([...new Set(errors)].sort());

    const counts: PreparedPack['counts'] = { generators: {}, sprites: {} };
    for (const [lang, paths] of Object.entries(manifest.generators)) {
      const n = Object.values(paths ?? {}).filter(Boolean).length;
      if (n) counts.generators[lang] = n;
    }
    for (const kind of SPRITE_KINDS) {
      const n = manifest.sprites.filter((s) => s.kind === kind).length;
      if (n) counts.sprites[kind] = n;
    }
    return { manifest, source, manifestUrl, size, counts, files };
  }

  /** Refuses an id of an official pack, or already installed from another link. */
  private async checkClash(id: string, source: string): Promise<void> {
    // Fail closed: without the registry, an official id cannot be told apart.
    const entries = await this.registryEntries().catch(() => {
      throw new PackError([
        'pack.json: the list of official packs could not be loaded',
      ]);
    });
    const official = entries.some((p) => p.id === id);
    const stored = this.stored().find((p) => p.id === id);
    const storedSource = stored?.source;
    if (official || id === BASE_PACK_ID || storedSource === 'official')
      throw new PackError([`pack.json: id "${id}" is an official pack`]);
    if (storedSource && storedSource.link !== source)
      throw new PackError([
        `pack.json: id "${id}" is already installed from another link`,
      ]);
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
        enabled: true,
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
    if (!record || record.source === 'official')
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
   * The enabled packs (Base first) with content of that kind: word lists in the language for `items`, `npcs`,
   * `skills` and `classes`, or sprites for `sprites`. Base is always listed.
   */
  async packsFor(
    content: PackGenerator | 'sprites',
    lang: string,
  ): Promise<string[]> {
    await this.ensureLoaded();
    const result = [BASE_PACK_ID];
    for (const record of this.sortedStored()) {
      if (!record.enabled) continue;
      const has =
        content === 'sprites'
          ? record.manifest.sprites.length > 0
          : !!record.manifest.generators[lang as 'en' | 'fr']?.[content];
      if (has) result.push(record.id);
    }
    return result;
  }

  /** The raw word list of a generator in a language; rejects when the pack has none. */
  async wordList(
    generator: PackGenerator,
    lang: string,
    packId: string = BASE_PACK_ID,
  ): Promise<unknown> {
    const missing = () =>
      new Error(`Pack "${packId}" has no ${generator} word list for "${lang}"`);
    if (packId !== BASE_PACK_ID) {
      await this.ensureLoaded();
      const record = this.stored().find((p) => p.id === packId);
      const path =
        record?.manifest.generators[lang as 'en' | 'fr']?.[generator];
      const file = path ? await this.storage.getFile(packId, path) : undefined;
      if (file?.kind !== 'json') throw missing();
      return file.value;
    }
    const pack = await this.manifest();
    const path = (
      pack.generators as Record<string, Record<string, string> | undefined>
    )[lang]?.[generator];
    if (!path) throw missing();
    return this.service.loadJson(
      packFileUrl(`packs/${packId}/pack.json`, path),
    );
  }
}

const reason = (error: unknown): string =>
  error instanceof Error ? error.message : 'could not be fetched';

/** The checks of a word list file, by generator; each returns its problems. */
function listChecker(generator: PackGenerator): (json: unknown) => string[] {
  switch (generator) {
    case 'items':
      return (json) => {
        const r = validateWordList(json);
        return r.ok ? [] : r.errors;
      };
    case 'npcs':
      return (json) => {
        const r = validateNpcNameList(json);
        return r.ok ? [] : r.errors;
      };
    case 'skills':
      return (json) => (isSkillWordList(json) ? [] : ['not a skill word list']);
    case 'classes':
      return (json) => (isClassWordList(json) ? [] : ['not a class word list']);
  }
}
