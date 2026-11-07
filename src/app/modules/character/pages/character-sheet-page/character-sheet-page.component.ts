import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { MessageModule } from '@openng/optimus-ui/message';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { MessageLevel } from '../../../../core/models/toast-level';
import { Character } from '../../../world/models/world';
import { RoomBusiness } from '../../../room/business/room.business';
import { CharacterBusiness } from '../../business/character.business';
import { OfflineBusiness } from '../../business/offline.business';
import { PlayerCopyBusiness } from '../../business/player-copy.business';
import { PlayerNotesComponent } from '../../components/player-notes/player-notes.component';
import { CharacterSheetComponent } from '../../components/character-sheet/character-sheet.component';
import { CHARACTER_ACTION_KINDS, CharacterAction } from '../../helpers/character-actions.rules';

/** A character's sheet in the room: the player acts on their own, the game master on anyone's. */
@Component({
  selector: 'app-character-sheet-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonModule,
    MessageModule,
    SkeletonModule,
    CharacterSheetComponent,
    PlayerNotesComponent,
  ],
  template: `
    <div class="main-container sheet-page">
      <p-button
        icon="pi pi-arrow-left"
        [label]="'table.title' | transloco"
        [text]="true"
        routerLink="/room/table"
      />
      <div class="sheet-body">
        @if (character(); as c) {
          @if (copy.$readOnly()) {
            <p-message
              severity="warn"
              icon="pi pi-lock"
              styleClass="read-only"
              >{{ 'character.readOnly' | transloco }}</p-message
            >
          }
          @if (characters.$world(); as world) {
            <app-character-sheet
              [character]="c"
              [world]="world"
              [canPlay]="characters.canPlay(c) && !copy.$readOnly()"
              [gameMaster]="characters.$isGameMaster()"
              [busy]="busy() || copy.$readOnly()"
              [lockedActions]="locked()"
              (act)="act(c.id, $event)"
            />
            @if (isMine(c)) {
              <app-player-notes
                class="notes"
                [notes]="c.notes ?? ''"
                [readOnly]="!offline.canEditNotes() || copy.$readOnly()"
                (save)="saveNotes($event)"
              />
            }
          }
        } @else if (characters.$characters() === null) {
          <p-skeleton height="20rem" />
        } @else {
          <p class="hint">{{ 'character.sheet.notFound' | transloco }}</p>
        }
      </div>
    </div>
  `,
  styles: `
    .sheet-page {
      max-width: 56rem;
      margin-inline: auto;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: stretch;
    }
    .sheet-page > p-button {
      align-self: flex-start;
    }
    .notes {
      display: block;
      margin-top: 1rem;
      padding: 1.25rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: var(--p-content-border-radius, 12px);
      background: var(--p-content-background);
    }
    .hint {
      margin: 0;
      color: var(--p-text-muted-color);
    }
  `,
})
export class CharacterSheetPageComponent {
  protected readonly characters = inject(CharacterBusiness);
  protected readonly copy = inject(PlayerCopyBusiness);
  protected readonly offline = inject(OfflineBusiness);
  private readonly room = inject(RoomBusiness);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  private readonly params = toSignal(inject(ActivatedRoute).paramMap, {
    requireSync: true,
  });
  protected readonly character = computed(() => {
    const id = this.params().get('characterId');
    const found = this.characters
      .$characters()
      ?.find((character) => character.id === id);
    // Offline, a player sees their local copy.
    const mine = this.offline.$myCharacter();
    return found && mine?.id === found.id ? mine : found;
  });
  /** Actions that are off while the host is offline. */
  protected readonly locked = computed(() =>
    CHARACTER_ACTION_KINDS.filter((kind) => !this.offline.canAct(kind)),
  );
  protected readonly busy = signal(false);
  private readonly ready = signal(false);

  constructor() {
    void this.room.whenReady().then(() => this.ready.set(true));
    effect(() => {
      if (this.ready() && this.room.$status() === 'idle')
        void this.router.navigate(['/play']);
    });
  }

  protected isMine(character: Character): boolean {
    return this.offline.$myCharacter()?.id === character.id;
  }

  protected async saveNotes(notes: string): Promise<void> {
    try {
      await this.offline.saveNotes(notes);
    } catch (error) {
      this.messages.add({
        severity: MessageLevel.Error,
        summary: this.characters.describeError(error),
        life: 4000,
      });
    }
  }

  protected async act(
    characterId: string,
    action: CharacterAction,
  ): Promise<void> {
    this.busy.set(true);
    try {
      const before = this.characters
        .$characters()
        ?.find((character) => character.id === characterId);
      const after = await this.offline.act(characterId, action);
      const message = before && this.characters.levelUpMessage(before, after);
      if (message)
        this.messages.add({ severity: MessageLevel.Success, summary: message, life: 4000 });
    } catch (error) {
      this.messages.add({
        severity: MessageLevel.Error,
        summary: this.characters.describeError(error),
        life: 4000,
      });
    } finally {
      this.busy.set(false);
    }
  }
}
