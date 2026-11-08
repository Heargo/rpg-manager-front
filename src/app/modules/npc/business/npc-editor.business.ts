import { inject, Injectable } from '@angular/core';
import {
  createSeed,
  seededRandomSource,
} from '../../../core/generators/random-source';
import { NpcNamesBusiness } from './npc-names.business';
import { Item, World } from '../../world/models/world';
import {
  addNpcItem,
  emptyNpc,
  generateNpc,
  learnNpcSkillsFromClass,
  NpcEditorIssue,
  npcToJson,
  ParsedNpc,
  parseNpcJson,
  removeNpcEntry,
  setNpcAttributeLevel,
  setNpcClass,
  setNpcSkill,
  setNpcLevel,
  setNpcRoles,
  toggleNpcEquipped,
  toggleNpcLoot,
} from '../helpers/npc-editor.rules';
import { validateNpc } from '../helpers/npc.rules';
import { Npc, NpcRole } from '../models/npc';

/** What the NPC editor needs: checks, JSON, form edits and the random Generate. */
@Injectable({ providedIn: 'root' })
export class NpcEditorBusiness {
  private readonly names = inject(NpcNamesBusiness);

  empty(world: World): Npc {
    return emptyNpc(world);
  }

  validate(npc: Npc): NpcEditorIssue[] {
    return validateNpc(npc);
  }

  toJson(npc: Npc): string {
    return npcToJson(npc);
  }

  parse(text: string, base: Npc): ParsedNpc {
    return parseNpcJson(text, base);
  }

  setLevel(npc: Npc, level: number, world: World): Npc {
    return setNpcLevel(npc, level, world);
  }

  setAttributeLevel(
    npc: Npc,
    attributeId: string,
    level: number,
    world: World,
  ): Npc {
    return setNpcAttributeLevel(npc, attributeId, level, world);
  }

  setRoles(npc: Npc, roles: NpcRole[]): Npc {
    return setNpcRoles(npc, roles);
  }

  setClass(npc: Npc, classId: string | null): Npc {
    return setNpcClass(npc, classId ?? undefined);
  }

  learnFromClass(npc: Npc, world: World): Npc {
    return learnNpcSkillsFromClass(npc, world);
  }

  setSkill(npc: Npc, skillId: string, rank: number, world: World): Npc {
    return setNpcSkill(npc, skillId, rank, world);
  }

  addItem(npc: Npc, item: Item): Npc {
    return addNpcItem(npc, item, crypto.randomUUID());
  }

  removeEntry(npc: Npc, entryId: string): Npc {
    return removeNpcEntry(npc, entryId);
  }

  toggleEquipped(npc: Npc, entryId: string): Npc {
    return toggleNpcEquipped(npc, entryId);
  }

  toggleLoot(npc: Npc, entryId: string): Npc {
    return toggleNpcLoot(npc, entryId);
  }

  newSeed(): string {
    return createSeed();
  }

  async generate(
    seed: string,
    world: World,
    classId?: string,
  ): Promise<Omit<Npc, 'id'>> {
    return generateNpc(
      world,
      seededRandomSource(seed),
      await this.names.names(),
      classId,
    );
  }
}
