import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RoomBusiness } from '../../room/business/room.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { EncounterPicks } from '../helpers/combat.rules';
import { projectEncounter } from '../helpers/combat-view.rules';
import {
  CombatEdit,
  CombatRewards,
  CombatSide,
  CombatView,
} from '../models/combat';
import { CombatService } from '../services/combat.service';

/** The encounter as the pages see it (the GM sees everything, players what the world's rules show) and the calls to run it. */
@Injectable({ providedIn: 'root' })
export class CombatBusiness {
  private readonly service = inject(CombatService);
  private readonly room = inject(RoomBusiness);
  private readonly session = inject(WorldSessionBusiness);
  private readonly watched = toSignal(this.service.watchState(), {
    initialValue: null,
  });

  /** null while there is no encounter. */
  readonly $state = computed<CombatView | null>(() => {
    if (!this.room.$isHost()) return this.watched();
    const world = this.session.$world();
    return world?.encounter
      ? projectEncounter(world.encounter, world, true)
      : null;
  });

  // GM
  start(picks: EncounterPicks): Promise<void> {
    return this.service.call('start', picks);
  }
  add(npcId: string, side: Exclude<CombatSide, 'party'>): Promise<void> {
    return this.service.call('add', { npcId, side });
  }
  remove(combatantId: string): Promise<void> {
    return this.service.call('remove', { combatantId });
  }
  reorder(ids: string[]): Promise<void> {
    return this.service.call('reorder', { ids });
  }
  edit(combatantId: string, edit: CombatEdit): Promise<void> {
    return this.service.call('edit', { combatantId, edit });
  }
  apply(
    pendingId: string,
    options: { amounts?: number[]; targetId?: string; defence?: boolean } = {},
  ): Promise<void> {
    return this.service.call('apply', { pendingId, ...options });
  }
  dismiss(pendingId: string): Promise<void> {
    return this.service.call('dismiss', { pendingId });
  }
  undo(): Promise<void> {
    return this.service.call('undo');
  }
  end(rewards?: CombatRewards): Promise<void> {
    return this.service.call('end', { rewards });
  }

  // GM or the player of the combatant
  initiative(combatantId: string, value: number): Promise<void> {
    return this.service.call('initiative', { combatantId, value });
  }
  useSkill(use: {
    casterId: string;
    skillId: string;
    targetIds: string[];
  }): Promise<void> {
    return this.service.call('useSkill', use);
  }
  useItem(combatantId: string, inventoryId: string): Promise<void> {
    return this.service.call('useItem', { combatantId, inventoryId });
  }
  move(combatantId: string, position: { x: number; y: number }): Promise<void> {
    return this.service.call('move', { combatantId, position });
  }
  tickAction(combatantId: string, action: string, used: number): Promise<void> {
    return this.service.call('tickAction', { combatantId, action, used });
  }

  // The active combatant's player, or the GM
  endTurn(): Promise<void> {
    return this.service.call('endTurn');
  }
}
