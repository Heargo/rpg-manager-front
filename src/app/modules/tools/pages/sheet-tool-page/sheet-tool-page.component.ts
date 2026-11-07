import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { CharacterBusiness } from '../../../character/business/character.business';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { MessageLevel } from '../../../../core/models/toast-level';
import { CharacterSheetComponent } from '../../../character/components/character-sheet/character-sheet.component';
import { CharacterAction } from '../../../character/helpers/character-actions.rules';
import { SandboxCharacterBusiness } from '../../business/sandbox-character.business';

/** Tool: try the character sheet on a sample character, without a game. */
@Component({
  selector: 'app-sheet-tool-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoPipe,
    ButtonModule,
    CardModule,
    SkeletonModule,
    CharacterSheetComponent,
  ],
  template: `
    <div class="main-container sheet-tool">
      <header>
        <div>
          <h1>{{ 'tools.sheet.title' | transloco }}</h1>
          <p class="hint">{{ 'tools.sheet.intro' | transloco }}</p>
        </div>
        <p-button
          icon="pi pi-refresh"
          [label]="'tools.sheet.reset' | transloco"
          severity="secondary"
          [text]="true"
          (onClick)="sandbox.reset()"
        />
      </header>
      <p-card>
        @if (sandbox.$character(); as character) {
          <app-character-sheet
            [character]="character"
            [world]="sandbox.$world()"
            [canPlay]="true"
            [gameMaster]="true"
            (act)="act($event)"
          />
        } @else {
          <p-skeleton height="20rem" />
        }
      </p-card>
    </div>
  `,
  styles: `
    .sheet-tool {
      max-width: 56rem;
      margin-inline: auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
    }
    h1 {
      margin: 0;
    }
    .hint {
      margin: 0;
      color: var(--p-text-muted-color);
    }
  `,
})
export class SheetToolPageComponent {
  protected readonly sandbox = inject(SandboxCharacterBusiness);
  private readonly language = inject(LanguageBusiness);
  private readonly messages = inject(MessageService);
  private readonly characters = inject(CharacterBusiness);

  protected act(action: CharacterAction): void {
    try {
      const before = this.sandbox.$character();
      this.sandbox.act(action);
      const after = this.sandbox.$character();
      const message = before && after && this.characters.levelUpMessage(before, after);
      if (message)
        this.messages.add({ severity: MessageLevel.Success, summary: message, life: 4000 });
    } catch (error) {
      const key =
        error instanceof Error ? error.message : 'room.errors.generic';
      this.messages.add({
        severity: MessageLevel.Error,
        summary: this.language.t(key),
        life: 4000,
      });
    }
  }
}
