import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { Drawn } from './kind-fields';

/** The Preview button of a kind and the trial entries it draws. */
@Component({
  selector: 'app-kind-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, ButtonModule],
  template: `
    <p-button
      data-test="preview-kind"
      severity="secondary"
      outlined
      icon="pi pi-eye"
      [label]="'packs.creator.kinds.preview' | translate"
      [disabled]="disabled()"
      (onClick)="run.emit()"
    />
    @if (entries(); as list) {
      <ul class="preview" data-test="preview-entries">
        @for (entry of list; track $index) {
          <li data-test="preview-entry">
            <strong>{{ entry.name }}</strong>
            @if (entry.rarity) {
              <small>{{ 'item.rarity.' + entry.rarity | translate }}</small>
            }
            <div>{{ entry.description }}</div>
          </li>
        } @empty {
          <li class="hint">
            {{ 'packs.creator.kinds.previewEmpty' | translate }}
          </li>
        }
      </ul>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }
    .preview {
      margin: 0;
      padding-left: 1rem;
    }
  `,
})
export class KindPreviewComponent {
  readonly entries = input<Drawn[] | null>(null);
  readonly disabled = input(false);
  readonly run = output<void>();
}
