import { inject, Injectable } from '@angular/core';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { LanguageBusiness } from '../../../core/business/language.business';
import { addNpcCopy, npcSheetView, NpcSheetView } from '../helpers/npc.rules';
import { upsertNpc } from '../helpers/npc-editor.rules';
import { Npc } from '../models/npc';

/** Game master: the NPCs of the hosted world, saved with the world and never sent to players. */
@Injectable({ providedIn: 'root' })
export class NpcCatalogueBusiness {
  private readonly session = inject(WorldSessionBusiness);

  private readonly language = inject(LanguageBusiness);

  readonly $world = this.session.$world;

  /** Game master: a catalogue NPC as a read-only character sheet (bars full), with its class and skills; null when it is gone. */
  sheetOf(npcId: string): NpcSheetView | null {
    const world = this.$world();
    return world ? npcSheetView(world, npcId) : null;
  }

  async duplicate(npcId: string): Promise<void> {
    await this.session.update((world) => ({
      ...world,
      npcs: addNpcCopy(
        world.npcs,
        npcId,
        () => crypto.randomUUID(),
        ` ${this.language.t('npc.catalogue.copySuffix')}`,
      ),
    }));
  }

  async remove(npcId: string): Promise<void> {
    await this.session.update((world) => ({
      ...world,
      npcs: world.npcs.filter((npc) => npc.id !== npcId),
    }));
  }

  /** Adds the NPC (new id) or replaces it (same id), and saves the world. */
  async save(input: Omit<Npc, 'id'> & { id?: string }): Promise<Npc> {
    let saved: Npc | undefined;
    await this.session.update((world) => {
      const result = upsertNpc(world.npcs, input, () => crypto.randomUUID());
      saved = result.npc;
      return { ...world, npcs: result.npcs };
    });
    return saved!;
  }
}
