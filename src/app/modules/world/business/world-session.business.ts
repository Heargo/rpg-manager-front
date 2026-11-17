import { inject, Injectable, Injector, signal } from '@angular/core';
import { ActivePacksBusiness } from '../../../core/business/active-packs.business';
import { CharacterHostBusiness } from '../../character/business/character-host.business';
import {
  applyWorldRules,
  validateWorldRules,
} from '../helpers/world-rules.rules';
import { toWorldInfo } from '../helpers/world.factory';
import { World, WorldRules } from '../models/world';
import { WorldService } from '../services/world.service';
import { PackContentImportBusiness } from './pack-content-import.business';
import { WorldLibraryBusiness } from './world-library.business';

/** The rules were saved but importing the content of a newly activated pack failed. */
export class PackImportError extends Error {}

/**
 * Host: the world being played, in memory. Changes go through `update()`, one at a time (requests from several
 * players can arrive together), are saved, and the world's public info is published.
 */
@Injectable({ providedIn: 'root' })
export class WorldSessionBusiness {
  private readonly library = inject(WorldLibraryBusiness);
  private readonly service = inject(WorldService);
  private readonly injector = inject(Injector);
  private readonly activePacks = inject(ActivePacksBusiness);

  private readonly world = signal<World | null>(null);
  private opening = 0;
  private queue: Promise<unknown> = Promise.resolve();

  readonly $world = this.world.asReadonly();

  async open(worldId: string): Promise<World> {
    const attempt = ++this.opening;
    const world = await this.library.get(worldId);
    if (!world) throw new Error(`World ${worldId} not found`);
    // Closed (or another world opened) while loading: this open is out of date.
    if (attempt !== this.opening) return world;
    this.world.set(world);
    this.activePacks.set(world.packs ?? [], world.language);
    this.service.publishInfo(toWorldInfo(world));
    return world;
  }

  close(): void {
    this.opening++;
    this.world.set(null);
    this.activePacks.set(null, null);
  }

  /** Applies a change to the open world and saves it. Runs after any change already in progress. */
  update(change: (world: World) => World | Promise<World>): Promise<World> {
    const run = this.queue.then(async () => {
      const current = this.world();
      if (!current) throw new Error('No world is open');
      const saved = await this.library.save(await change(current));
      // The world may have been closed while saving.
      if (this.world()?.id === saved.id) {
        this.world.set(saved);
        this.activePacks.set(saved.packs ?? [], saved.language);
        this.service.publishInfo(toWorldInfo(saved));
      }
      return saved;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  /** GM: validates and stores edited rules, republishes `world/info` and the sheets the change touched. */
  async saveRules(rules: WorldRules): Promise<World> {
    if (Object.keys(validateWorldRules(rules)).length)
      throw new Error('Invalid world rules');
    const before = this.world()?.packs ?? [];
    const saved = await this.update((world) => {
      const next = applyWorldRules(world, rules, () => crypto.randomUUID());
      const now = Date.now();
      return {
        ...next,
        characters: next.characters.map((character, i) =>
          JSON.stringify(character) === JSON.stringify(world.characters[i])
            ? character
            : { ...character, rev: character.rev + 1, updatedAt: now },
        ),
      };
    });
    // Looked up when needed: the character host itself depends on this session.
    this.injector.get(CharacterHostBusiness).publish();
    const activated = (saved.packs ?? []).filter((id) => !before.includes(id));
    if (activated.length)
      // A pack that needs a choice of attributes is left pending: the rules page asks the GM.
      try {
        await this.injector
          .get(PackContentImportBusiness)
          .importActivated(activated);
      } catch (error) {
        throw new PackImportError('Pack import failed', { cause: error });
      }
    return saved;
  }
}
