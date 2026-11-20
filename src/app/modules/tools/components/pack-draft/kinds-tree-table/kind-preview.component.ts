import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TagModule } from '@openng/optimus-ui/tag';
import { Drawn } from './kind-fields';

/** The Preview button of a kind and the trial entries it draws. */
@Component({
  selector: 'app-kind-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, ButtonModule, TagModule],
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
    <small class="hint" data-test="preview-hint">{{
      'packs.creator.kinds.previewHint' | translate
    }}</small>
    @if (entries(); as list) {
      <ul class="preview" data-test="preview-entries">
        @for (entry of list; track $index) {
          <li data-test="preview-entry">
            <strong>{{ entry.name }}</strong>
            @if (entry.rarity) {
              <p-tag
                data-test="preview-rarity"
                severity="secondary"
                [value]="'item.rarity.' + entry.rarity | translate"
              />
            }
            @if (entry.source) {
              <small class="muted" data-test="preview-source">{{
                'packs.creator.kinds.previewFrom'
                  | translate: { kind: entry.source }
              }}</small>
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
    .muted {
      color: var(--p-text-muted-color);
      display: block;
    }
    .hint {
      color: var(--p-text-muted-color);
    }
    .preview {
      list-style: none;
      margin: 0;
      padding: 0;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .preview li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem 0.5rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: 0.5rem;
      overflow-wrap: anywhere;
    }
    .preview li > div {
      flex-basis: 100%;
    }
  `,
})
export class KindPreviewComponent {
  readonly entries = input<Drawn[] | null>(null);
  readonly disabled = input(false);
  readonly run = output<void>();
}
