import {
  computed,
  effect,
  inject,
  Injectable,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { LanguageBusiness } from '../../../core/business/language.business';
import { ProfileBusiness } from '../../../core/business/profile.business';
import { cryptoRandomSource } from '../../../core/generators/random-source';
import { applyCharacterAction } from '../../character/helpers/character-actions.rules';
import { attributeStats } from '../../character/helpers/character-stats';
import { CombatTable } from '../../combat/business/combat.business';
import {
  addCombatant,
  addStatus,
  applyPending,
  damageCombatant,
  dismissPending,
  editAttribute,
  EncounterPicks,
  healCombatant,
  moveCombatant,
  nextTurn,
  combatRewards,
  removeCombatant,
  removeStatus,
  reorderCombatants,
  rollInitiative,
  setActionUsed,
  setCombatantCurrents,
  setInitiative,
  skillAvailability,
  startEncounter,
  syncCharacters,
  undo,
  useSkill,
  withoutUndo,
} from '../../combat/helpers/combat.rules';
import { CombatRollsBusiness } from '../../combat/business/combat-rolls.business';
import { skillUseRoll } from '../../combat/helpers/combat-roll.rules';
import { skillSummary } from '../../combat/helpers/combat-skill-summary.rules';
import { projectEncounter } from '../../combat/helpers/combat-view.rules';
import {
  CombatEdit,
  CombatRewards,
  CombatSide,
  CombatView,
  Encounter,
} from '../../combat/models/combat';
import { sampleNpcs } from '../../npc/helpers/npc.rules';
import { Skill } from '../../skill/models/skill';
import { SandboxWorldBusiness } from '../../world/business/sandbox-world.business';
import { effectiveInitiativeMode } from '../../world/helpers/world-combat.rules';
import { Character, InventoryItem, World } from '../../world/models/world';
import { SandboxCharacterBusiness } from './sandbox-character.business';

/**
 * The combat pages' stand-in for `CombatBusiness` in the Tools: the sample character against the sandbox NPCs, the GM and
 * the player views on one screen, everything in memory with the same rules as a hosted game. Provided by the tool route.
 */
@Injectable()
export class SandboxCombatBusiness implements CombatTable {
  private readonly sandbox = inject(SandboxWorldBusiness);
  private readonly hero = inject(SandboxCharacterBusiness);
  private readonly language = inject(LanguageBusiness);
  private readonly random = cryptoRandomSource();
  private readonly rolls = inject(CombatRollsBusiness);
  private readonly profile = inject(ProfileBusiness);

  /** The hero with the active skills of their class (a fresh sheet knows none), changed by combat. */
  private readonly sheet = linkedSignal<Character | undefined>(() => {
    const character = this.hero.$character();
    const world = this.sandbox.$world();
    if (!character) return undefined;
    const tree =
      world.classes.find((c) => c.id === character.classId)?.tree ?? [];
    const skills = tree
      .map((node) => world.skills.find((s) => s.id === node.skillId))
      .filter((s): s is Skill => s?.type === 'active')
      .map((s) => ({ skillId: s.id, level: 1 }));
    return { ...character, skills };
  });
  private readonly encounter = signal<Encounter | null>(null);

  private readonly world = computed<World>(() => {
    const world = this.sandbox.$world();
    const sheet = this.sheet();
    return {
      ...world,
      // The sandbox always shows the encounter on a grid, so the tool lets you try it.
      combat: {
        ...world.combat,
        grid: { ...world.combat.grid, enabled: true },
      },
      characters: sheet ? [sheet] : [],
      encounter: this.encounter() ?? undefined,
    };
  });

  readonly $isGameMaster = signal(true).asReadonly();
  readonly $state = computed<CombatView | null>(() => {
    const world = this.world();
    return world.encounter
      ? projectEncounter(world.encounter, world, true)
      : null;
  });
  readonly $encounter = this.encounter.asReadonly();
  readonly $characters = computed(() => this.world().characters);
  readonly $npcs = computed(() => this.world().npcs);
  readonly $skills = computed(() => this.world().skills);
  readonly $grid = computed(() => this.world().combat.grid);
  readonly $initiativeMode = computed(() =>
    effectiveInitiativeMode(this.world().combat),
  );

  constructor() {
    // The sandbox world starts without NPCs: seed the examples, like the NPC catalogue tool does.
    effect(() => {
      this.language.$language();
      untracked(() => {
        if (this.sandbox.$world().npcs.length) return;
        this.sandbox.updateNpcs(() =>
          sampleNpcs((key) => this.language.t(key)),
        );
      });
    });
  }

  async loadSkills(): Promise<void> {}

  skillSummary(
    skill: Skill,
    skillLevel: number,
    caster: Parameters<CombatTable['skillSummary']>[2],
  ): string {
    return skillSummary(
      skill,
      skillLevel,
      caster,
      this.world().skillRollsEnabled !== false,
      (key, params) => this.language.t(key, params),
    );
  }

  availability(combatantId: string, skill: Skill) {
    const encounter = this.encounter();
    return encounter
      ? skillAvailability(encounter, combatantId, skill)
      : { affordable: true, onCooldown: false };
  }

  itemsOf(characterId: string | undefined): InventoryItem[] {
    return (
      this.world()
        .characters.find((c) => c.id === characterId)
        ?.inventory.filter((entry) => entry.item.type === 'consumable') ?? []
    );
  }

  rewards() {
    const encounter = this.encounter();
    return encounter ? combatRewards(encounter, this.world().combat) : null;
  }

  money(amount: number): string {
    return String(amount);
  }

  describeError(error: unknown): string {
    return error instanceof Error
      ? this.language.t(error.message)
      : String(error);
  }

  async start(picks: EncounterPicks): Promise<void> {
    const world = this.world();
    if (world.encounter) throw new Error('combat.errors.alreadyStarted');
    const result = startEncounter(world, picks, () => crypto.randomUUID());
    if (!result.ok) throw new Error(`combat.errors.${result.error}`);
    this.encounter.set(
      withoutUndo(
        effectiveInitiativeMode(world.combat) === 'rolled'
          ? rollInitiative(result.encounter, world.combat, this.random)
          : result.encounter,
      ),
    );
  }

  async add(npcId: string, side: Exclude<CombatSide, 'party'>): Promise<void> {
    this.change((enc, world) =>
      addCombatant(enc, world, { npcId, side }, () => crypto.randomUUID()),
    );
  }
  async remove(combatantId: string): Promise<void> {
    this.change((enc) => removeCombatant(enc, combatantId));
  }
  async reorder(ids: string[]): Promise<void> {
    this.change((enc) => reorderCombatants(enc, ids));
  }
  async edit(combatantId: string, edit: CombatEdit): Promise<void> {
    this.change((enc) => {
      switch (edit.kind) {
        case 'damage':
          return damageCombatant(enc, combatantId, edit.amount);
        case 'heal':
          return healCombatant(enc, combatantId, edit.amount);
        case 'add-status':
          return addStatus(enc, combatantId, edit.status);
        case 'remove-status':
          return removeStatus(enc, combatantId, edit.status);
        case 'attribute':
          return editAttribute(enc, combatantId, edit.attribute, {
            current: edit.current,
            max: edit.max,
          });
      }
    });
  }
  async apply(
    pendingId: string,
    options: { amounts?: number[]; targetId?: string; defence?: boolean } = {},
  ): Promise<void> {
    this.change((enc, world) =>
      applyPending(enc, pendingId, { ...options, rules: world.combat }),
    );
  }
  async dismiss(pendingId: string): Promise<void> {
    this.change((enc) => dismissPending(enc, pendingId));
  }
  async undo(): Promise<void> {
    this.change((enc) => undo(enc));
  }
  async end(rewards?: CombatRewards): Promise<void> {
    const world = this.world();
    let sheet = this.sheet();
    for (const { characterId, amount } of world.combat.steps.rewards
      ? (rewards?.xp ?? [])
      : []) {
      if (!sheet || sheet.id !== characterId || amount < 1) continue;
      const result = applyCharacterAction(
        world.attributes,
        sheet,
        { kind: 'grant-xp', amount },
        world,
        world,
      );
      if (result.ok) sheet = { ...result.character, rev: sheet.rev + 1 };
    }
    this.sheet.set(sheet);
    this.encounter.set(null);
  }

  async initiative(combatantId: string, value: number): Promise<void> {
    this.change((enc) => setInitiative(enc, combatantId, value));
  }
  async useSkill(use: {
    casterId: string;
    skillId: string;
    targetIds: string[];
  }): Promise<void> {
    this.change((enc, world) => {
      const result = useSkill(
        enc,
        use,
        world.skills,
        world.skillRollsEnabled ?? true,
        this.random,
        world.combat,
      );
      if (!result.ok) throw new Error(`combat.errors.${result.error}`);
      const roll = skillUseRoll(enc, result.encounter, use, world.skills);
      if (roll)
        this.rolls.present({
          id: crypto.randomUUID(),
          by: {
            playerId: this.profile.$profile().playerId,
            name: roll.combat.casterName,
          },
          count: roll.values.length,
          sides: roll.sides,
          values: roll.values,
          seed: crypto.randomUUID(),
          at: Date.now(),
          combat: roll.combat,
        });
      return result.encounter;
    });
  }
  async useItem(combatantId: string, inventoryId: string): Promise<void> {
    const world = this.world();
    const enc = this.encounter();
    const sheet = this.sheet();
    const combatant = enc?.combatants.find((c) => c.id === combatantId);
    if (!enc || !sheet || combatant?.characterId !== sheet.id)
      throw new Error('combat.errors.invalid');
    const result = applyCharacterAction(
      world.attributes,
      sheet,
      { kind: 'use', inventoryId },
      world,
      world,
    );
    if (!result.ok) throw new Error(result.error);
    const changed = { ...result.character, rev: sheet.rev + 1 };
    const currents = attributeStats(
      world.attributes,
      changed,
      world.barAttributes,
    )
      .filter((s) => s.isBar)
      .map((s) => ({ name: s.name, current: s.current }));
    this.sheet.set(changed);
    this.encounter.set(setCombatantCurrents(enc, combatantId, currents));
  }
  async move(
    combatantId: string,
    position: { x: number; y: number },
  ): Promise<void> {
    this.change((enc) => moveCombatant(enc, combatantId, position));
  }
  async tickAction(
    combatantId: string,
    action: string,
    used: number,
  ): Promise<void> {
    this.change((enc) => setActionUsed(enc, combatantId, action, used));
  }
  async endTurn(): Promise<void> {
    this.change((enc) => nextTurn(enc));
  }

  /** Applies a change to the encounter and lets the character follow it. */
  private change(run: (enc: Encounter, world: World) => Encounter): void {
    const world = this.world();
    const enc = this.encounter();
    if (!enc) throw new Error('combat.errors.noEncounter');
    const next = run(enc, world);
    this.encounter.set(next);
    const synced = syncCharacters({ ...world, encounter: next }, next);
    const sheet = synced.characters[0];
    if (sheet && sheet !== this.sheet()) this.sheet.set(sheet);
  }
}
