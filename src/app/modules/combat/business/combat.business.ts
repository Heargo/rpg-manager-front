import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { LanguageBusiness } from '../../../core/business/language.business';
import { PeerApiError } from '../../../core/p2p/helpers/peer-api-error';
import { CharacterBusiness } from '../../character/business/character.business';
import { Npc } from '../../npc/models/npc';
import { RoomBusiness } from '../../room/business/room.business';
import { Skill } from '../../skill/models/skill';
import { WorldInfoBusiness } from '../../world/business/world-info.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import {
  Character,
  InitiativeMode,
  InventoryItem,
} from '../../world/models/world';
import {
  EncounterPicks,
  proposeRewards,
  RewardProposal,
  skillAvailability,
} from '../helpers/combat.rules';
import { skillSummary } from '../helpers/combat-skill-summary.rules';
import { projectEncounter } from '../helpers/combat-view.rules';
import {
  CombatAttribute,
  CombatEdit,
  CombatRewards,
  CombatSide,
  CombatView,
  Encounter,
} from '../models/combat';
import { CombatService } from '../services/combat.service';

/** The public members of a class: what the combat pages need, and what the sandbox stand-in must offer too. */
export type CombatTable = { [K in keyof CombatBusiness]: CombatBusiness[K] };

/** The encounter as the pages see it (the GM sees everything, players what the world's rules show) and the calls to run it. */
@Injectable({ providedIn: 'root' })
export class CombatBusiness {
  private readonly service = inject(CombatService);
  private readonly room = inject(RoomBusiness);
  private readonly session = inject(WorldSessionBusiness);
  private readonly characters = inject(CharacterBusiness);
  private readonly info = inject(WorldInfoBusiness);
  private readonly language = inject(LanguageBusiness);
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

  /** True on the game master's device, which runs the encounter. */
  readonly $isGameMaster = this.room.$isHost;

  /** The whole encounter (skills, cooldowns): the game master's device only. */
  readonly $encounter = computed<Encounter | null>(() =>
    this.room.$isHost() ? (this.session.$world()?.encounter ?? null) : null,
  );

  /** The characters of the world: the game master's records, or the list the host published. */
  readonly $characters = computed<Character[]>(() =>
    this.room.$isHost()
      ? (this.session.$world()?.characters ?? [])
      : (this.characters.$characters() ?? []),
  );

  /** The NPC catalogue to pick an encounter from (game master only). */
  readonly $npcs = computed<Npc[]>(() =>
    this.room.$isHost() ? (this.session.$world()?.npcs ?? []) : [],
  );

  /** The skills a device can read: the whole catalogue for the game master, the player's own once loaded. */
  readonly $skills = computed<Skill[]>(() =>
    this.room.$isHost()
      ? (this.session.$world()?.skills ?? [])
      : (this.characters.$classView()?.skills ?? []),
  );

  readonly $initiativeMode = computed<InitiativeMode | undefined>(() =>
    this.room.$isHost()
      ? this.session.$world()?.combat.initiative.mode
      : this.watched()?.initiativeMode,
  );

  private readonly rollsEnabled = computed(() =>
    this.room.$isHost()
      ? this.session.$world()?.skillRollsEnabled !== false
      : this.info.$info()?.skillRollsEnabled !== false,
  );

  /** Asks the host for the player's own skills (the game master already has them all). */
  async loadSkills(): Promise<void> {
    if (this.room.$isHost()) return;
    await this.characters.loadMyClass();
  }

  /** "5 damage, 3 Mana, cooldown 2": what a skill does for a caster of this level and these maxima. */
  skillSummary(
    skill: Skill,
    skillLevel: number,
    caster: { level: number; attributes: CombatAttribute[] },
  ): string {
    return skillSummary(
      skill,
      skillLevel,
      caster,
      this.rollsEnabled(),
      (key, params) => this.language.t(key, params),
    );
  }

  /** Game master: whether a combatant can pay for a skill and whether it is on cooldown. */
  availability(
    combatantId: string,
    skill: Skill,
  ): { affordable: boolean; onCooldown: boolean } {
    const encounter = this.$encounter();
    return encounter
      ? skillAvailability(encounter, combatantId, skill)
      : { affordable: true, onCooldown: false };
  }

  /** The consumables a character carries, which can be used in combat. */
  itemsOf(characterId: string | undefined): InventoryItem[] {
    return (
      this.$characters()
        .find((c) => c.id === characterId)
        ?.inventory.filter((entry) => entry.item.type === 'consumable') ?? []
    );
  }

  /** Game master: what the defeated enemies give. */
  rewards(): RewardProposal | null {
    const encounter = this.$encounter();
    return encounter ? proposeRewards(encounter) : null;
  }

  /** An amount of copper as text. */
  money(amount: number): string {
    return this.characters.money(amount);
  }

  /** The message to show for a failed call. */
  describeError(error: unknown): string {
    if (error instanceof PeerApiError && error.message.startsWith('combat.')) {
      return this.language.t(error.message);
    }
    return this.characters.describeError(error);
  }

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
