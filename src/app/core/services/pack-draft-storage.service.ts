import { Injectable } from '@angular/core';
import { AppDatabase, openAppDatabase } from '../helpers/app-database';
import { DraftSprite, PackDraft } from '../packs/pack-draft';

/** A draft as stored: images as raw bytes (structured-clone safe everywhere), like the other stores. */
type StoredDraft = Omit<PackDraft, 'sprites'> & {
  sprites: (Omit<DraftSprite, 'image'> & {
    image: { bytes: ArrayBuffer; type: string };
  })[];
};

/** IndexedDB for the pack creator's drafts, whole records by draft id. */
@Injectable({ providedIn: 'root' })
export class PackDraftStorageService {
  private database?: Promise<AppDatabase>;

  async list(): Promise<PackDraft[]> {
    const stored = (await (
      await this.db()
    ).getAll('packDrafts')) as unknown as StoredDraft[];
    return Promise.all(stored.map((s) => this.fromStored(s)));
  }

  async get(id: string): Promise<PackDraft | undefined> {
    const stored = (await (await this.db()).get('packDrafts', id)) as
      StoredDraft | undefined;
    return stored && this.fromStored(stored);
  }

  async save(draft: PackDraft): Promise<void> {
    const sprites = await Promise.all(
      draft.sprites.map(async (sprite) => ({
        ...sprite,
        image: {
          bytes: await sprite.image.arrayBuffer(),
          type: sprite.image.type,
        },
      })),
    );
    await (
      await this.db()
    ).put('packDrafts', { ...draft, sprites } as unknown as {
      id: string;
    } & Record<string, unknown>);
  }

  async delete(id: string): Promise<void> {
    await (await this.db()).delete('packDrafts', id);
  }

  private async fromStored(stored: StoredDraft): Promise<PackDraft> {
    return {
      ...stored,
      sprites: stored.sprites.map((sprite) => ({
        ...sprite,
        image: new Blob([sprite.image.bytes], { type: sprite.image.type }),
      })),
    };
  }

  private db(): Promise<AppDatabase> {
    this.database ??= openAppDatabase();
    return this.database;
  }
}
