import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { CHARACTER_NOTES_MAX_LENGTH } from '../../models/character-api';

/** A player's personal notes: edited as text, saved on request. */
@Component({
  selector: 'app-player-notes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, ButtonModule, TextareaModule],
  template: `
    <label for="player-notes">{{ 'character.notes.title' | transloco }}</label>
    <textarea
      pTextarea
      id="player-notes"
      rows="5"
      [attr.maxlength]="maxLength"
      [readOnly]="readOnly()"
      [value]="draft()"
      [placeholder]="'character.notes.placeholder' | transloco"
      (input)="draft.set($any($event.target).value)"
    ></textarea>
    @if (readOnly()) {
      <small class="hint">{{ 'character.notes.readOnly' | transloco }}</small>
    } @else {
      <button
        pButton
        type="button"
        data-action="save-notes"
        icon="pi pi-save"
        [label]="'character.notes.save' | transloco"
        (click)="save.emit(draft())"
      ></button>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }
    textarea {
      width: 100%;
    }
    .hint {
      color: var(--p-text-muted-color);
    }
  `,
})
export class PlayerNotesComponent {
  readonly notes = input('');
  readonly readOnly = input(false);
  readonly save = output<string>();

  protected readonly maxLength = CHARACTER_NOTES_MAX_LENGTH;
  protected readonly draft = linkedSignal(() => this.notes());
}
