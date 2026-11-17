import { computed, inject, Injectable, signal } from '@angular/core';
import { PackBusiness } from '../../../core/business/pack.business';
import { PackAttribute } from '../../../core/packs/pack';
import {
  AttributeMapping,
  CONTENT_DOMAINS,
  ContentDomain,
  mergeById,
  PackEntry,
  planPackImport,
} from '../../../core/packs/pack-content';
import { Item, World } from '../models/world';
import { CharacterClass } from '../../class/models/class';
import { Skill } from '../../skill/models/skill';
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
  private readonly packs = inject(PackBusiness);

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
    const mapping = options.mapping ?? {};
    const domains = options.domains ?? [...CONTENT_DOMAINS];
    const world = this.session.$world();
    if (!world) throw new Error('No world is open');
    const packIds = options.packs ?? world.packs ?? [];

    const sources: {
      packId: string;
      attributes: PackAttribute[];
      content: Record<string, PackEntry[]>;
    }[] = [];
    for (const packId of packIds) {
      const manifest = await this.packs.manifest(packId);
      const content: Record<string, PackEntry[]> = {};
      for (const domain of domains) {
        try {
          content[domain] = (await this.packs.content(
            domain,
            packId,
          )) as PackEntry[];
        } catch {
          // The pack has no fixed content for this domain.
        }
      }
      sources.push({ packId, attributes: manifest.attributes ?? [], content });
    }

    const result: PackContentImportResult = {
      added: 0,
      updated: 0,
      kept: 0,
      needsChoice: [],
    };
    let state = { ...world } as World;
    for (const source of sources) {
      const plan = planPackImport({
        packId: source.packId,
        content: source.content,
        attributes: source.attributes,
        world: {
          items: state.items as unknown as PackEntry[],
          skills: state.skills as unknown as PackEntry[],
          classes: state.classes as unknown as PackEntry[],
          attributes: state.attributes,
        },
        mapping,
        domains,
      });
      for (const need of plan.needsChoice)
        if (!result.needsChoice.some((a) => a.id === need.id))
          result.needsChoice.push(need);
      if (result.needsChoice.length) continue;

      const attributes = [...state.attributes];
      for (const attribute of plan.addAttributes)
        if (!attributes.some((a) => a.name === attribute.name))
          attributes.push({
            id: crypto.randomUUID(),
            name: attribute.name,
            baseValue: attribute.max ?? 10,
            formula: { preset: 'linear', step: 1 },
          });
      const items = mergeById(state.items, plan.items as unknown as Item[]);
      const skills = mergeById(state.skills, plan.skills as unknown as Skill[]);
      const classes = mergeById(
        state.classes,
        plan.classes as unknown as CharacterClass[],
      );
      for (const merged of [items, skills, classes]) {
        result.added += merged.added;
        result.updated += merged.updated;
      }
      result.kept += plan.kept.length;
      state = {
        ...state,
        attributes,
        items: items.entries,
        skills: skills.entries,
        classes: classes.entries,
      };
    }

    if (result.needsChoice.length)
      return { added: 0, updated: 0, kept: 0, needsChoice: result.needsChoice };
    if (result.added || result.updated)
      await this.session.update((current) => ({
        ...current,
        attributes: state.attributes,
        items: state.items,
        skills: state.skills,
        classes: state.classes,
      }));
    return result;
  }
}
