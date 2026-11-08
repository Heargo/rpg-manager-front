import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ImageBusiness } from '../../../core/business/image.business';
import { LanguageBusiness } from '../../../core/business/language.business';
import { ProfileBusiness } from '../../../core/business/profile.business';
import { PeerApiError } from '../../../core/p2p/helpers/peer-api-error';
import { RoomBusiness } from '../../room/business/room.business';
import { WorldInfoBusiness } from '../../world/business/world-info.business';
import { Character, WorldInfo } from '../../world/models/world';

/** What a character sheet needs from its world (the room's, or the sandbox's). */
export type SheetWorld = Pick<WorldInfo, 'attributes' | 'barAttributes' | 'levelCurve' | 'maxLevel'>;
import { coinDisplayParts } from '../../../core/helpers/money.rules';
import { levelProgress, LevelProgress } from '../helpers/level.rules';
import { CharacterAction } from '../helpers/character-actions.rules';
import { attributeStats, AttributeStat, barStats, BarStat } from '../helpers/character-stats';
import { CharacterService } from '../services/character.service';

/** Characters of the room this device is in, and creating one's own. */
@Injectable({ providedIn: 'root' })
export class CharacterBusiness {
  private readonly service = inject(CharacterService);
  private readonly room = inject(RoomBusiness);
  private readonly profile = inject(ProfileBusiness);
  private readonly images = inject(ImageBusiness);
  private readonly language = inject(LanguageBusiness);

  readonly $world = inject(WorldInfoBusiness).$info;
  /** null until the host sent the list. */
  readonly $characters = toSignal<Character[] | null>(this.service.watchCharacters(), { initialValue: null });
  readonly $myCharacter = computed(() => {
    const playerId = this.profile.$profile().playerId;
    return this.$characters()?.find((character) => character.playerId === playerId);
  });
  /** A connected player whose seat has no character yet. */
  readonly $needsCharacter = computed(
    () => this.room.$status() === 'connected' && this.$characters() !== null && !this.$myCharacter(),
  );

  private creationOffered = false;

  /**
   * True the first time a player needs a character in this room, so the app sends them to the creation page once;
   * after "Later" they use the button instead. Resets when they're no longer in a room.
   */
  takeCreationOffer(): boolean {
    if (this.$characters() === null) this.creationOffered = false;
    if (!this.$needsCharacter() || this.creationOffered) return false;
    this.creationOffered = true;
    return true;
  }

  /** True on the game master's device: may act on any character, grant points and set current values. */
  readonly $isGameMaster = this.room.$isHost;

  /** Whether this device may spend points and use the items of a character: its player, or the game master. */
  canPlay(character: Character): boolean {
    return this.$isGameMaster() || character.playerId === this.profile.$profile().playerId;
  }

  /** Sends an action on a character to the host; resolves with the character as the host saved it. */
  act(characterId: string, action: CharacterAction): Promise<Character> {
    return this.service.act(characterId, action);
  }

  /** Shrinks the portrait, keeps a copy here and sends it with the name to the host. */
  async create(name: string, portrait?: Blob): Promise<Character> {
    let image: { type: string; data: string } | undefined;
    if (portrait) {
      const id = await this.images.storeUpload(portrait);
      image = await this.images.toBase64(id);
    }
    return this.service.create({ name, portrait: image });
  }

  /** Every attribute of a character with its max (base + points + equipment) and current value. */
  statsOf(character: Character, world: SheetWorld | null = this.$world()): AttributeStat[] {
    return attributeStats(world?.attributes ?? [], character);
  }

  /** The character's level and progress towards the next one, from the world's level curve. */
  progressOf(character: Character, world: Pick<WorldInfo, 'levelCurve' | 'maxLevel'> | null = this.$world()): LevelProgress | null {
    return world ? levelProgress(world.levelCurve, character.xp, world.maxLevel) : null;
  }

  /** "Level 3! +3 stat points" when a change raised the level, else null. */
  levelUpMessage(before: Character, after: Character): string | null {
    if (after.level <= before.level) return null;
    return this.language.t('character.sheet.levelUp', {
      level: after.level,
      points: after.statPoints - before.statPoints,
    });
  }

  /** The world's life and mana bars for a character. */
  barsOf(character: Character, world: SheetWorld | null = this.$world()): { life?: BarStat; mana?: BarStat } {
    return world ? barStats(this.statsOf(character, world), world.barAttributes) : {};
  }

  /** An amount of copper as text ("1 gold 12 silver 3 copper"), for confirmations and toasts. */
  money(amount: number): string {
    return coinDisplayParts(amount)
      .map(({ coin, amount: count }) => `${count} ${this.language.t('coin.' + coin).toLowerCase()}`)
      .join(' ');
  }

  /** Name of the player behind a character, from the room's seats. */
  playerName(playerId: string): string | undefined {
    return this.room.$room()?.members.find((member) => member.playerId === playerId)?.name;
  }

  describeError(error: unknown): string {
    if (error instanceof PeerApiError && error.message.startsWith('character.')) {
      console.error('Character error', error);
      return this.language.t(error.message);
    }
    return this.room.describeError(error);
  }
}
