import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { StoredImageComponent } from '../../../../core/components/stored-image/stored-image.component';
import { CharacterBusiness } from '../../business/character.business';

/** The room's characters; sends a player without one to the creation page. */
@Component({
  selector: 'app-character-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe, ButtonModule, CardModule, StoredImageComponent],
  template: `
    <p-card [header]="'character.list.title' | transloco">
      @if (characters.$needsCharacter()) {
        <div class="cta">
          <p>{{ 'character.list.needOne' | transloco }}</p>
          <p-button icon="pi pi-user-plus" [label]="'character.create.title' | transloco" routerLink="/room/character" />
        </div>
      }
      @if (characters.$characters(); as list) {
        @if (list.length) {
          <ul class="characters">
            @for (character of list; track character.id) {
              <li>
                <app-stored-image class="portrait" [imageId]="character.portraitId" [alt]="character.name">
                  <span class="initial">{{ character.name.charAt(0).toUpperCase() }}</span>
                </app-stored-image>
                <div class="text">
                  <strong>{{ character.name }}</strong>
                  <small>{{ characters.playerName(character.playerId) ?? '' }}</small>
                </div>
              </li>
            }
          </ul>
        } @else {
          <p class="hint">{{ 'character.list.empty' | transloco }}</p>
        }
      }
    </p-card>
  `,
  styles: `
    .characters { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }
    li { display: flex; align-items: center; gap: 0.75rem; }
    .portrait { width: 3rem; height: 3rem; border-radius: 50%; flex: none; background: var(--p-content-hover-background); }
    .initial { display: grid; place-items: center; height: 100%; font-weight: 600; }
    .text { display: flex; flex-direction: column; min-width: 0; }
    small, .hint { color: var(--p-text-muted-color); }
    .hint { margin: 0; }
    .cta { display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start; margin-bottom: 1rem; }
    .cta p { margin: 0; }
  `,
})
export class CharacterListComponent {
  protected readonly characters = inject(CharacterBusiness);
  private readonly router = inject(Router);

  constructor() {
    // Right after joining, go straight to creating a character (once per room; the button stays after "Later").
    effect(() => {
      if (this.characters.takeCreationOffer()) void this.router.navigate(['/room/character']);
    });
  }
}
