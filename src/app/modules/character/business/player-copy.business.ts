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
import { PeerApiError } from '../../../core/p2p/helpers/peer-api-error';
import { Character } from '../../world/models/world';
import { QueuedAction } from '../models/player-copy';
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
  private readonly queue = signal<QueuedAction[]>([]);
  private readonly notes = signal<string | undefined>(undefined);
  private readonly offlineCopy = signal<Character | null>(null);
  /** True while a pick is awaited: when it comes, the player asks the host for their notes again. */
  private pickPending = false;

  private readonly playerId = computed(() => this.profile.$profile().playerId);
  private readonly mine = computed(() =>
    this.characters()?.find(
      (character) => character.playerId === this.playerId(),
    ),
  );
  private readonly roomId = computed(() =>
    this.room.$status() === 'connected' ? this.room.$room()?.id : undefined,
  );

  /** Actions done while the host was offline, waiting to go out with the copy when it is back. */
  readonly $queue = this.queue.asReadonly();
  /** The player's own notes (the host sends them to their owner only). */
  readonly $notes = this.notes.asReadonly();
  /** The copy changed while the host was offline, until the host has dealt with it. */
  readonly $offlineCopy = this.offlineCopy.asReadonly();

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
      // Once the host answered and no pick is waiting, the queue has been dealt with.
      if (this.roomId() && this.checked() && !this.$readOnly())
        untracked(() => {
          this.queue.set([]);
          this.offlineCopy.set(null);
          if (this.pickPending) {
            this.pickPending = false;
            void this.refreshNotes();
          }
        });
    });
    // Back from a reload while offline: the queue and the changed copy are still on this device.
    effect(() => {
      const id = this.room.$room()?.id;
      if (!id) return;
      untracked(() => {
        void this.storage
          .load(id)
          .then((stored) => {
            if (!stored || stored.queue.length === 0 || this.queue().length > 0)
              return;
            this.queue.set(stored.queue);
            this.offlineCopy.set(stored.character);
            this.notes.set(stored.character.notes);
          })
          .catch((error: unknown) =>
            console.error('Could not load the player copy', error),
          );
      });
    });
    effect(() => {
      const roomId = this.roomId();
      const mine = this.mine();
      if (!roomId || !mine || !this.checked() || this.$readOnly()) return;
      const notes = this.notes();
      void this.storage
        .save(
          roomId,
          notes === undefined ? mine : { ...mine, notes },
          this.queue(),
        )
        .catch((error: unknown) =>
          console.error('Could not save the player copy', error),
        );
    });
  }

  /** This device's saved copy of the player's character in a room. */
  async savedCopy(roomId: string): Promise<Character | undefined> {
    return (await this.storage.load(roomId))?.character;
  }

  /** The player's own notes changed on the host (or here, when offline). */
  setNotes(notes: string | undefined): void {
    this.notes.set(notes);
  }

  /** Offline: keeps the changed copy on this device with the queue of what led to it. */
  async recordOffline(
    character: Character,
    queue: QueuedAction[],
  ): Promise<void> {
    const roomId = this.room.$room()?.id;
    if (!roomId)
      throw new PeerApiError(
        'host-offline',
        'character.errors.offlineNotAllowed',
      );
    await this.storage.save(roomId, character, queue);
    this.queue.set(queue);
    this.offlineCopy.set(character);
    this.notes.set(character.notes);
  }

  /** The host waits for this copy (the player is read-only until then): try again rather than stay stuck. */
  private async submitWithRetry(
    copy: Character,
    generation: number,
  ): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      try {
        await this.service.submit({ copy, queued: this.queue() });
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

  private async refreshNotes(): Promise<void> {
    try {
      this.notes.set((await this.service.notes()).notes);
    } catch (error) {
      console.error('Could not get the notes from the host', error);
    }
  }

  private async hello(roomId: string, generation: number): Promise<void> {
    try {
      const stored = await this.storage.load(roomId);
      const saved = stored?.character;
      if (stored && this.queue().length === 0) this.queue.set(stored.queue);
      this.notes.set(saved?.notes);
      const answer = await this.service.hello({
        rev: saved?.rev ?? 0,
        hash: saved ? await hashPlayerRecord(saved) : null,
      });
      if (generation !== this.generation) return;
      if (answer.match) this.notes.set(answer.notes);
      else if (saved) {
        this.pickPending = true;
        await this.submitWithRetry(saved, generation);
      }
      if (generation === this.generation) this.checked.set(true);
    } catch (error) {
      if (generation === this.generation)
        console.error('Could not compare the player copy with the host', error);
    }
  }
}
