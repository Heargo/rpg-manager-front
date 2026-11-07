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
import { CardModule } from '@openng/optimus-ui/card';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { MessageLevel } from '../../../../core/models/toast-level';
import { RoomBusiness } from '../../../room/business/room.business';
import { CharacterBusiness } from '../../business/character.business';
import { CharacterSheetComponent } from '../../components/character-sheet/character-sheet.component';
import { CharacterAction } from '../../helpers/character-actions.rules';

/** A character's sheet in the room: the player acts on their own, the game master on anyone's. */
@Component({
  selector: 'app-character-sheet-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonModule,
    CardModule,
    SkeletonModule,
    CharacterSheetComponent,
  ],
  template: `
    <div class="main-container sheet-page">
      <p-button
        icon="pi pi-arrow-left"
        [label]="'table.title' | transloco"
        [text]="true"
        routerLink="/room/table"
      />
      <p-card>
        @if (character(); as c) {
          @if (characters.$world(); as world) {
            <app-character-sheet
              [character]="c"
              [world]="world"
              [canPlay]="characters.canPlay(c)"
              [gameMaster]="characters.$isGameMaster()"
              [busy]="busy()"
              (act)="act(c.id, $event)"
            />
          }
        } @else if (characters.$characters() === null) {
          <p-skeleton height="20rem" />
        } @else {
          <p class="hint">{{ 'character.sheet.notFound' | transloco }}</p>
        }
      </p-card>
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
    .hint {
      margin: 0;
      color: var(--p-text-muted-color);
    }
  `,
})
export class CharacterSheetPageComponent {
  protected readonly characters = inject(CharacterBusiness);
  private readonly room = inject(RoomBusiness);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  private readonly params = toSignal(inject(ActivatedRoute).paramMap, {
    requireSync: true,
  });
  protected readonly character = computed(() => {
    const id = this.params().get('characterId');
    return this.characters
      .$characters()
      ?.find((character) => character.id === id);
  });
  protected readonly busy = signal(false);
  private readonly ready = signal(false);

  constructor() {
    void this.room.whenReady().then(() => this.ready.set(true));
    effect(() => {
      if (this.ready() && this.room.$status() === 'idle')
        void this.router.navigate(['/play']);
    });
  }

  protected async act(
    characterId: string,
    action: CharacterAction,
  ): Promise<void> {
    this.busy.set(true);
    try {
      await this.characters.act(characterId, action);
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
