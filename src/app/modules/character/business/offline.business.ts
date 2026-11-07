import {
  computed,
  effect,
  inject,
  Injectable,
  signal,
  untracked,
} from '@angular/core';
import { PeerApiError } from '../../../core/p2p/helpers/peer-api-error';
import { RoomBusiness } from '../../room/business/room.business';
import { DEFAULT_OFFLINE_FEATURES } from '../../world/helpers/world.factory';
import { Character } from '../../world/models/world';
import {
  CharacterAction,
  CharacterActionKind,
} from '../helpers/character-actions.rules';
import {
  applyOffline,
  applyOfflineNotes,
  isOfflineAllowed,
  OfflineResult,
} from '../helpers/offline-actions.rules';
import { CharacterService } from '../services/character.service';
import { CharacterBusiness } from './character.business';
import { PlayerCopyBusiness } from './player-copy.business';

/**
 * Player: acts on their character online (through the host) or, while the host is offline, on the local copy for
 * the features the host allowed. Offline actions are queued and go out with the copy on reconnect.
 */
@Injectable({ providedIn: 'root' })
export class OfflineBusiness {
  private readonly room = inject(RoomBusiness);
  private readonly characters = inject(CharacterBusiness);
  private readonly copy = inject(PlayerCopyBusiness);
  private readonly service = inject(CharacterService);

  readonly $offline = computed(() => this.room.$status() === 'host-offline');
  readonly $features = computed(
    () => this.characters.$world()?.offlineFeatures ?? DEFAULT_OFFLINE_FEATURES,
  );
  readonly $queue = this.copy.$queue;
  /** The player's character: the local copy while offline (once changed), else the host's, with their own notes. */
  readonly $myCharacter = computed(() => {
    const mine = this.$offline()
      ? (this.copy.$offlineCopy() ?? this.characters.$myCharacter())
      : this.characters.$myCharacter();
    const notes = this.copy.$notes();
    return mine && notes !== undefined ? { ...mine, notes } : mine;
  });

  /** Online everything goes through the host; offline only what the host allowed. */
  canAct(kind: CharacterActionKind): boolean {
    return !this.$offline() || isOfflineAllowed(this.$features(), kind);
  }

  canEditNotes(): boolean {
    return !this.$offline() || this.$features().notes;
  }

  async act(characterId: string, action: CharacterAction): Promise<Character> {
    if (!this.$offline()) return this.characters.act(characterId, action);
    const world = this.characters.$world();
    return this.applyLocally(characterId, (mine) =>
      world
        ? applyOffline(
            world.attributes,
            mine,
            this.$queue(),
            action,
            this.$features(),
          )
        : { ok: false, error: 'character.errors.invalid' },
    );
  }

  async saveNotes(notes: string): Promise<Character> {
    const mine = this.$myCharacter();
    if (!mine)
      throw new PeerApiError('invalid', 'character.errors.unknownCharacter');
    if (!this.$offline()) {
      const saved = await this.service.saveNotes(mine.id, notes);
      this.copy.setNotes(saved.notes);
      return saved;
    }
    return this.applyLocally(mine.id, (character) =>
      applyOfflineNotes(character, this.$queue(), notes, this.$features()),
    );
  }

  private async applyLocally(
    characterId: string,
    apply: (mine: Character) => OfflineResult,
  ): Promise<Character> {
    const mine = this.$myCharacter();
    if (!mine || mine.id !== characterId)
      throw new PeerApiError('forbidden', 'character.errors.notYours');
    const result = apply(mine);
    if (!result.ok)
      throw new PeerApiError(
        result.error === 'character.errors.offlineNotAllowed'
          ? 'forbidden'
          : 'rejected',
        result.error,
      );
    await this.copy.recordOffline(result.character, result.queue);
    return result.character;
  }
}
