import { inject, Injectable } from '@angular/core';
import { PackBusiness } from '../../../core/business/pack.business';
import { PackAttribute } from '../../../core/packs/pack';
import {
  CONTENT_DOMAINS,
  mergeById,
  PackEntry,
  planPackImport,
} from '../../../core/packs/pack-content';
import { CharacterClass } from '../../class/models/class';
import { Skill } from '../../skill/models/skill';
import { Item, World } from '../models/world';
import type {
  PackContentImportOptions,
  PackContentImportResult,
} from './pack-content-import.business';

/** Copies the fixed content of packs into a world value (nothing is stored here): the import, the new worlds and the sandbox share it. */
@Injectable({ providedIn: 'root' })
export class PackContentApplier {
  private readonly packs = inject(PackBusiness);

  /** The world with the content written; when attributes need a choice, nothing is written and `needsChoice` lists them. */
  async apply(
    world: World,
    options: PackContentImportOptions = {},
  ): Promise<{ world: World; result: PackContentImportResult }> {
    const mapping = options.mapping ?? {};
    const domains = options.domains ?? [...CONTENT_DOMAINS];
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
          actionTypes: state.combat?.actionTypes ?? [],
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
      return {
        world,
        result: {
          added: 0,
          updated: 0,
          kept: 0,
          needsChoice: result.needsChoice,
        },
      };
    return { world: state, result };
  }

  /**
   * The world with the content of its packs written, skipping every attribute the world lacks (a renamed or missing
   * one: the skills that need it are left out). For new worlds and the sandbox, where there is nobody to ask.
   */
  async applyAndSkipMissing(
    world: World,
    options: PackContentImportOptions = {},
  ): Promise<World> {
    const first = await this.apply(world, options);
    if (!first.result.needsChoice.length) return first.world;
    const mapping = { ...(options.mapping ?? {}) };
    for (const attribute of first.result.needsChoice)
      mapping[attribute.id] = 'skip';
    return (await this.apply(world, { ...options, mapping })).world;
  }
}
