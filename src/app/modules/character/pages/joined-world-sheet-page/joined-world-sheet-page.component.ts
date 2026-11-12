import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  PendingTasks,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonModule } from '@openng/optimus-ui/button';
import { MessageModule } from '@openng/optimus-ui/message';
import { JoinedWorldsBusiness } from '../../../play/business/joined-worlds.business';
import { Character } from '../../../world/models/world';
import { PlayerCopyBusiness } from '../../business/player-copy.business';
import { CharacterSheetComponent } from '../../components/character-sheet/character-sheet.component';

/** A joined world's character sheet, read-only, from the copy saved on this device (the host may be offline). */
@Component({
  selector: 'app-joined-world-sheet-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonModule,
    MessageModule,
    CharacterSheetComponent,
  ],
  template: `
    <div class="main-container sheet-page">
      <p-button
        icon="pi pi-arrow-left"
        [label]="'play.title' | transloco"
        [text]="true"
        routerLink="/play"
      />
      @if (world(); as joined) {
        @if (character(); as c) {
          <p-message
            severity="info"
            icon="pi pi-lock"
            data-test="joined-readonly"
            >{{
              'play.joined.readOnly' | transloco: { name: joined.name }
            }}</p-message
          >
          <app-character-sheet
            [character]="c"
            [world]="joined.sheetWorld"
            [canPlay]="false"
          />
        } @else if (loaded()) {
          <p class="hint">{{ 'character.sheet.notFound' | transloco }}</p>
        }
      }
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
export class JoinedWorldSheetPageComponent implements OnInit {
  private readonly pending = inject(PendingTasks);
  private readonly joined = inject(JoinedWorldsBusiness);
  private readonly copies = inject(PlayerCopyBusiness);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap, {
    requireSync: true,
  });

  protected readonly world = computed(() =>
    this.joined
      .$worlds()
      .find((w) => w.worldId === this.params().get('worldId')),
  );
  protected readonly character = signal<Character | undefined>(undefined);
  protected readonly loaded = signal(false);

  ngOnInit(): void {
    this.pending.run(async () => {
      await this.joined.load();
      const roomId = this.world()?.roomId;
      this.character.set(
        roomId ? await this.copies.savedCopy(roomId) : undefined,
      );
      this.loaded.set(true);
    });
  }
}
