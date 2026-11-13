import { computed, inject, Injectable, signal } from '@angular/core';
import {
  Pack,
  packFileUrl,
  PackGenerator,
  PackSprite,
  validatePack,
} from '../packs/pack';
import { PackRegistryEntry, validateRegistry } from '../packs/pack-registry';
import { PackService } from '../services/pack.service';
import {
  PackStorageService,
  StoredPack,
  StoredPackFile,
} from '../services/pack-storage.service';

export const BASE_PACK_ID = 'base';

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
  enabled: boolean;
  builtIn: boolean;
  /** The pack's sprites, for the details view. */
  sprites: PackSprite[];
  generators: Pack['generators'];
}

const installedOf = (
  pack: Pack,
  enabled: boolean,
  builtIn: boolean,
): InstalledPack => ({
  id: pack.id,
  name: pack.name,
  description: pack.description,
  author: pack.author,
  license: pack.license,
  licenseUrl: pack.licenseUrl,
  enabled,
  builtIn,
  sprites: pack.sprites,
  generators: pack.generators,
});

/**
 * The packs: Base (served with the app, always on) and the official packs the user downloads (stored in
 * IndexedDB, usable offline). Gives the sprites of every enabled pack and the word lists.
 */
@Injectable({ providedIn: 'root' })
export class PackBusiness {
  private readonly service = inject(PackService);
  private readonly storage = inject(PackStorageService);
  private manifestPromise: Promise<Pack> | null = null;
  private registryPromise: Promise<PackRegistryEntry[]> | null = null;
  private loadPromise: Promise<void> | null = null;
  private readonly stored = signal<StoredPack[]>([]);
  private readonly base = signal<Pack | null>(null);
  private readonly loaded = signal(false);
  private baseEntry?: PackRegistryEntry;
  /** Object URLs of stored packs' files, by pack id then path; created once per pack. */
  private readonly urls = new Map<string, Map<string, string>>();
  private order: string[] = [];

  /** Base first, then the downloaded packs; filled once the business has loaded. */
  readonly $installed = computed<InstalledPack[]>(() => {
    if (!this.loaded()) return [];
    return [
      this.installedBase(),
      ...this.sortedStored().map((p) =>
        installedOf(p.manifest, p.enabled, false),
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
  private async objectUrls(record: StoredPack): Promise<Map<string, string>> {
    const known = this.urls.get(record.id);
    if (known) return known;
    const urls = new Map<string, string>();
    this.urls.set(record.id, urls);
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

  private revokeUrls(id: string): void {
    for (const url of this.urls.get(id)?.values() ?? [])
      URL.revokeObjectURL(url);
    this.urls.delete(id);
  }

  /** Turns an official pack on, downloading it first when it is not on the device. */
  async enable(id: string): Promise<void> {
    const entry = (await this.registry()).find((p) => p.id === id);
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
    await Promise.all([
      ...[...images].map(async (path) => {
        const blob = await this.service.loadBlob(url(path));
        files.set(path, {
          kind: 'blob',
          bytes: await blob.arrayBuffer(),
          type: blob.type,
        });
      }),
      ...[...jsons].map(async (path) => {
        files.set(path, {
          kind: 'json',
          value: await this.service.loadJson(url(path)),
        });
      }),
    ]);
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
    this.revokeUrls(id);
    this.stored.set(await this.storage.list());
  }

  /** Deletes a downloaded pack and its files from the device. */
  async remove(id: string): Promise<void> {
    if (id === BASE_PACK_ID) throw new Error('The Base pack cannot be removed');
    await this.ensureLoaded();
    await this.storage.remove(id);
    this.revokeUrls(id);
    this.stored.set(await this.storage.list());
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
