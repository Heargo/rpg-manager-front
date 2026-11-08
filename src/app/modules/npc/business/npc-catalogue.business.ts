import { inject, Injectable } from '@angular/core';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { addNpcCopy } from '../helpers/npc.rules';

/** Game master: the NPCs of the hosted world, saved with the world and never sent to players. */
@Injectable({ providedIn: 'root' })
export class NpcCatalogueBusiness {
  private readonly session = inject(WorldSessionBusiness);

  readonly $world = this.session.$world;

  async duplicate(npcId: string): Promise<void> {
    await this.session.update((world) => ({
      ...world,
      npcs: addNpcCopy(world.npcs, npcId, () => crypto.randomUUID()),
    }));
  }

  async remove(npcId: string): Promise<void> {
    await this.session.update((world) => ({
      ...world,
      npcs: world.npcs.filter((npc) => npc.id !== npcId),
    }));
  }
}
