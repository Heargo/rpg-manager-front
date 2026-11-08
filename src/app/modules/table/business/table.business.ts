import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ImageBusiness } from '../../../core/business/image.business';
import { LanguageBusiness } from '../../../core/business/language.business';
import { PeerApiError } from '../../../core/p2p/helpers/peer-api-error';
import { RoomBusiness } from '../../room/business/room.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { PublicNpc } from '../../npc/models/npc';
import { TableScene } from '../models/table';
import { TableService } from '../services/table.service';

export const NOTES_SAVE_DELAY_MS = 800;

export type NotesState = 'saved' | 'editing' | 'saving' | 'error';

/** The game table as the pages see it: the scene for everyone, and the game master's tools. */
@Injectable({ providedIn: 'root' })
export class TableBusiness {
  private readonly service = inject(TableService);
  private readonly room = inject(RoomBusiness);
  private readonly session = inject(WorldSessionBusiness);
  private readonly images = inject(ImageBusiness);
  private readonly language = inject(LanguageBusiness);
  private readonly npcs = toSignal(this.service.watchNpcs(), {
    initialValue: null,
  });

  /** null until the host sent it. */
  readonly $scene = toSignal<TableScene | null>(this.service.watchScene(), {
    initialValue: null,
  });
  /** The NPCs shown on the table, as the players see them. */
  readonly $npcs = computed<PublicNpc[]>(() => this.npcs() ?? []);
  readonly $isGameMaster = this.room.$isHost;
  /** Game master only: the strip of pictures ready to show. */
  readonly $quickImageIds = computed(
    () => this.session.$world()?.quickImageIds ?? [],
  );
  /** Game master only: the notes as saved. */
  readonly $savedNotes = computed(() => this.session.$world()?.notes ?? '');

  private readonly notesState = signal<NotesState>('saved');
  readonly $notesState = this.notesState.asReadonly();
  private pendingNotes: string | null = null;
  private notesTimer?: ReturnType<typeof setTimeout>;

  /** Stores the picture, adds it to the quick images and, by default, shows it to everyone. */
  async addQuickImage(file: Blob, show = true): Promise<void> {
    const imageId = await this.images.storeUpload(file);
    await this.service.addQuickImage(imageId);
    if (show) await this.service.showIllustration(imageId);
  }

  showIllustration(imageId: string | null): Promise<void> {
    return this.service.showIllustration(imageId);
  }

  /** Game master: shows an NPC to everyone (4 at most). */
  showNpc(npcId: string): Promise<void> {
    return this.service.setNpc(npcId, true);
  }

  hideNpc(npcId: string): Promise<void> {
    return this.service.setNpc(npcId, false);
  }

  removeQuickImage(imageId: string): Promise<void> {
    return this.service.removeQuickImage(imageId);
  }

  /** Keeps the latest text and saves it once typing pauses. */
  editNotes(notes: string): void {
    this.pendingNotes = notes;
    this.notesState.set('editing');
    clearTimeout(this.notesTimer);
    this.notesTimer = setTimeout(
      () => void this.flushNotes(),
      NOTES_SAVE_DELAY_MS,
    );
  }

  /** Saves notes still waiting for the pause (leaving the page…). */
  async flushNotes(): Promise<void> {
    clearTimeout(this.notesTimer);
    const notes = this.pendingNotes;
    if (notes === null) return;
    this.pendingNotes = null;
    this.notesState.set('saving');
    try {
      await this.service.saveNotes(notes);
      if (this.pendingNotes === null) this.notesState.set('saved');
    } catch (error) {
      console.error('Could not save the notes', error);
      this.pendingNotes ??= notes;
      this.notesState.set('error');
    }
  }

  describeError(error: unknown): string {
    if (error instanceof PeerApiError && error.message.startsWith('table.')) {
      console.error('Table error', error);
      return this.language.t(error.message);
    }
    return this.room.describeError(error);
  }
}
