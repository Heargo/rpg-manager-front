import { computed, inject, Injectable, signal } from '@angular/core';
import { PackAttribute } from '../../../core/packs/pack';
import { AttributeMapping, ContentDomain } from '../../../core/packs/pack-content';
import { PackContentApplier } from './pack-content-applier.business';
import { WorldSessionBusiness } from './world-session.business';

export interface PackContentImportOptions {
  /** What to do with each pack attribute the world lacks (`add`, `skip` or a world attribute id). */
  mapping?: AttributeMapping;
  /** The domains to import; all by default. */
  domains?: ContentDomain[];
  /** The packs to import; the world's active packs by default. */
  packs?: string[];
}

export interface PackContentImportResult {
  added: number;
  updated: number;
  kept: number;
  /** The pack attributes the GM must decide on; nothing is written while there are some. */
  needsChoice: PackAttribute[];
}

interface PendingChoice {
  worldId: string;
  options: PackContentImportOptions;
  missing: PackAttribute[];
}

/** Game master: copies the fixed content of the active packs into the world's catalogues. */
@Injectable({ providedIn: 'root' })
export class PackContentImportBusiness {
  private readonly session = inject(WorldSessionBusiness);
  private readonly applier = inject(PackContentApplier);

  private readonly pending = signal<PendingChoice | null>(null);
  private activation: PackContentImportResult | null = null;

  /** An import waiting for the GM's choice on attributes (the open world's only); the page shows the dialog. */
  readonly $pending = computed(() => {
    const pending = this.pending();
    return pending && pending.worldId === this.session.$world()?.id
      ? pending
      : null;
  });

  /** Imports; when attributes need a choice, nothing is written and the choice is kept in `$pending`. */
  async request(
    options: PackContentImportOptions = {},
  ): Promise<PackContentImportResult> {
    const result = await this.importFromPacks(options);
    const world = this.session.$world();
    this.pending.set(
      result.needsChoice.length && world
        ? { worldId: world.id, options, missing: result.needsChoice }
        : null,
    );
    return result;
  }

  /** Imports the content of packs the GM just activated; remembers the result for the page. */
  async importActivated(packs: string[]): Promise<PackContentImportResult> {
    // No world open in this session (a second device's injector): nothing to import into.
    if (!this.session.$world())
      return { added: 0, updated: 0, kept: 0, needsChoice: [] };
    const result = await this.request({ packs });
    if (!result.needsChoice.length) this.activation = result;
    return result;
  }

  /** The result of the last import done on activation, once. */
  takeActivation(): PackContentImportResult | null {
    const result = this.activation;
    this.activation = null;
    return result;
  }

  /** The GM answered the dialog: imports with the mapping. */
  async confirmPending(
    mapping: AttributeMapping,
  ): Promise<PackContentImportResult | null> {
    const pending = this.$pending();
    this.pending.set(null);
    if (!pending) return null;
    return this.importFromPacks({ ...pending.options, mapping });
  }

  cancelPending(): void {
    this.pending.set(null);
  }

  async importFromPacks(
    options: PackContentImportOptions = {},
  ): Promise<PackContentImportResult> {
    const world = this.session.$world();
    if (!world) throw new Error('No world is open');
    const { world: next, result } = await this.applier.apply(world, options);
    if (result.needsChoice.length) return result;
    if (result.added || result.updated)
      await this.session.update((current) => ({
        ...current,
        attributes: next.attributes,
        items: next.items,
        skills: next.skills,
        classes: next.classes,
      }));
    return result;
  }
}
