import {
  computed,
  effect,
  inject,
  Injectable,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProfileBusiness } from '../../../core/business/profile.business';
import { hashPlayerRecord } from '../../room/helpers/player-copy.rules';
import { RoomBusiness } from '../../room/business/room.business';
import { Character } from '../../world/models/world';
import { PlayerCopyService } from '../services/player-copy.service';
import { PlayerCopyStorageService } from '../services/player-copy-storage.service';

const SUBMIT_ATTEMPTS = 5;
export const SUBMIT_RETRY_MS = 100;

/**
 * Player: keeps this device's own copy of their character per room (IndexedDB), compares it with the host's when
 * joining, and stays read-only until the game master picks a save if the two differ.
 */
@Injectable({ providedIn: 'root' })
export class PlayerCopyBusiness {
  private readonly service = inject(PlayerCopyService);
  private readonly storage = inject(PlayerCopyStorageService);
  private readonly room = inject(RoomBusiness);
  private readonly profile = inject(ProfileBusiness);

  private readonly characters = toSignal(this.service.watchCharacters(), {
    initialValue: null,
  });
  private readonly waiting = toSignal(this.service.watchReadOnly(), {
    initialValue: null,
  });
  /** True once the host answered this connection's hello: states can be saved again. */
  private readonly checked = signal(false);
  private generation = 0;

  private readonly playerId = computed(() => this.profile.$profile().playerId);
  private readonly mine = computed(() =>
    this.characters()?.find(
      (character) => character.playerId === this.playerId(),
    ),
  );
  private readonly roomId = computed(() =>
    this.room.$status() === 'connected' ? this.room.$room()?.id : undefined,
  );

  /** True while the host has to pick between the host's and this device's copy: no action goes out. */
  readonly $readOnly = computed(
    () =>
      this.roomId() !== undefined &&
      (this.waiting()?.includes(this.playerId()) ?? false),
  );

  constructor() {
    effect(() => {
      const roomId = this.roomId();
      untracked(() => {
        this.generation++;
        this.checked.set(false);
        if (roomId) void this.hello(roomId, this.generation);
      });
    });
    effect(() => {
      const roomId = this.roomId();
      const mine = this.mine();
      if (!roomId || !mine || !this.checked() || this.$readOnly()) return;
      void this.storage
        .save(roomId, mine)
        .catch((error: unknown) =>
          console.error('Could not save the player copy', error),
        );
    });
  }

  /** This device's saved copy of the player's character in a room. */
  savedCopy(roomId: string): Promise<Character | undefined> {
    return this.storage.load(roomId);
  }

  /** The host waits for this copy (the player is read-only until then): try again rather than stay stuck. */
  private async submitWithRetry(
    copy: Character,
    generation: number,
  ): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      try {
        await this.service.submit({ copy, queued: [] });
        return;
      } catch (error) {
        if (attempt >= SUBMIT_ATTEMPTS || generation !== this.generation)
          throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, SUBMIT_RETRY_MS * attempt),
        );
      }
    }
  }

  private async hello(roomId: string, generation: number): Promise<void> {
    try {
      const saved = await this.storage.load(roomId);
      const answer = await this.service.hello({
        rev: saved?.rev ?? 0,
        hash: saved ? await hashPlayerRecord(saved) : null,
      });
      if (generation !== this.generation) return;
      // Queued offline actions arrive with P10.
      if (!answer.match && saved) await this.submitWithRetry(saved, generation);
      if (generation === this.generation) this.checked.set(true);
    } catch (error) {
      if (generation === this.generation)
        console.error('Could not compare the player copy with the host', error);
    }
  }
}
