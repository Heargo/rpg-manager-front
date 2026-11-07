import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { DrawerModule } from '@openng/optimus-ui/drawer';
import {
  FileUpload,
  FileUploadHandlerEvent,
  FileUploadModule,
} from '@openng/optimus-ui/fileupload';
import { MessageModule } from '@openng/optimus-ui/message';
import { SplitterModule } from '@openng/optimus-ui/splitter';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { HostOfflineIconComponent } from '../../../../core/components/host-offline-icon/host-offline-icon.component';
import { StoredImageComponent } from '../../../../core/components/stored-image/stored-image.component';
import { MessageLevel } from '../../../../core/models/toast-level';
import { CharacterBusiness } from '../../../character/business/character.business';
import { CharacterSummaryComponent } from '../../../character/components/character-summary/character-summary.component';
import { DiceOverlayComponent } from '../../../dice/components/dice-overlay/dice-overlay.component';
import { DiceRollerComponent } from '../../../dice/components/dice-roller/dice-roller.component';
import { RoomBusiness } from '../../../room/business/room.business';
import { TableBusiness } from '../../business/table.business';
import { NOTES_MAX_LENGTH } from '../../models/table';

/** Below this width the game master's splitter becomes one column, with the players in a drawer. */
const NARROW_QUERY = '(max-width: 960px)';

/** The game table: the game master's tools (players, illustration, quick images, notes, dice) or a player's view. */
@Component({
  selector: 'app-table-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    RouterLink,
    TranslocoPipe,
    ButtonModule,
    CardModule,
    DrawerModule,
    FileUploadModule,
    MessageModule,
    SplitterModule,
    TextareaModule,
    TooltipModule,
    StoredImageComponent,
    HostOfflineIconComponent,
    CharacterSummaryComponent,
    DiceRollerComponent,
    DiceOverlayComponent,
  ],
  templateUrl: './table-page.component.html',
  styleUrl: './table-page.component.scss',
})
export class TablePageComponent {
  protected readonly room = inject(RoomBusiness);
  protected readonly table = inject(TableBusiness);
  protected readonly characters = inject(CharacterBusiness);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  protected readonly notesMaxLength = NOTES_MAX_LENGTH;
  protected readonly narrow = signal(false);
  protected readonly playersOpen = signal(false);
  protected readonly uploading = signal(false);
  private readonly selectedId = signal<string | null>(null);
  /** What the game master typed; null until they type, so the saved notes show first. */
  private readonly notesDraft = signal<string | null>(null);
  protected readonly notes = computed(
    () => this.notesDraft() ?? this.table.$savedNotes(),
  );
  /** The character the game master is looking at: the one picked, or the first. */
  protected readonly selected = computed(() => {
    const list = this.characters.$characters() ?? [];
    return (
      list.find((character) => character.id === this.selectedId()) ?? list[0]
    );
  });
  private readonly ready = signal(false);

  constructor() {
    const media = window.matchMedia(NARROW_QUERY);
    const onMedia = () => this.narrow.set(media.matches);
    onMedia();
    media.addEventListener('change', onMedia);
    inject(DestroyRef).onDestroy(() => {
      media.removeEventListener('change', onMedia);
      void this.table.flushNotes();
    });

    // Wait for a saved room to be reopened before deciding there is none.
    void this.room.whenReady().then(() => this.ready.set(true));
    effect(() => {
      if (this.ready() && this.room.$status() === 'idle')
        void this.router.navigate(['/play']);
    });
  }

  protected select(characterId: string): void {
    this.selectedId.set(characterId);
    this.playersOpen.set(false);
  }

  protected editNotes(notes: string): void {
    this.notesDraft.set(notes);
    this.table.editNotes(notes);
  }

  protected async upload(
    event: FileUploadHandlerEvent,
    uploader: FileUpload,
  ): Promise<void> {
    const file = event.files[0];
    uploader.clear();
    if (!file) return;
    this.uploading.set(true);
    try {
      await this.table.addQuickImage(file);
    } catch (error) {
      this.toastError(error);
    } finally {
      this.uploading.set(false);
    }
  }

  protected show(imageId: string | null): void {
    this.table
      .showIllustration(imageId)
      .catch((error) => this.toastError(error));
  }

  protected remove(imageId: string): void {
    this.table
      .removeQuickImage(imageId)
      .catch((error) => this.toastError(error));
  }

  protected leave(): void {
    this.room.leave();
  }

  private toastError(error: unknown): void {
    this.messages.add({
      severity: MessageLevel.Error,
      summary: this.table.describeError(error),
      life: 4000,
    });
  }
}
