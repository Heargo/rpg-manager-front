import {
  ChangeDetectionStrategy,
  Component,
  input,
  effect,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { ChipListComponent } from '../chip-list/chip-list.component';

/** One labelled text of a detail: chips, or lines collapsed to the first few. */
export interface DetailText {
  label: string;
  chips?: string[];
  lines?: string[];
}

const COLLAPSED = 3;

/** The Texts section body of a detail: each text as chips or lines, "None" when there is nothing. */
@Component({
  selector: 'app-detail-texts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, ButtonModule, ChipListComponent],
  template: `
    @for (row of rows(); track row.label) {
      <div class="row" data-test="detail-text">
        <span class="label">{{ row.label }}</span>
        @if (row.chips) {
          <app-chip-list [names]="row.chips" />
        }
        @if (row.lines; as lines) {
          <ul>
            @for (
              line of expanded().has(row.label)
                ? lines
                : lines.slice(0, collapsed);
              track $index
            ) {
              <li data-test="text-line">{{ line }}</li>
            }
          </ul>
          @if (lines.length > collapsed && !expanded().has(row.label)) {
            <p-button
              data-test="show-all"
              variant="text"
              size="small"
              [label]="'packs.creator.kinds.showAll' | translate"
              (click)="expand(row.label)"
            />
          }
        }
      </div>
    } @empty {
      <span class="none" data-test="detail-none">{{
        'packs.creator.kinds.none' | translate
      }}</span>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .row {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }
    .label {
      font-weight: 600;
    }
    ul {
      margin: 0;
      padding-left: 1.1rem;
      overflow-wrap: anywhere;
    }
    .none {
      color: var(--p-text-muted-color);
    }
  `,
})
export class DetailTextsComponent {
  readonly rows = input.required<readonly DetailText[]>();
  protected readonly collapsed = COLLAPSED;
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());

  constructor() {
    // The drawer reuses the instance for another kind or tint: start collapsed again.
    effect(() => {
      this.rows();
      this.expanded.set(new Set());
    });
  }

  protected expand(label: string): void {
    this.expanded.update((set) => new Set(set).add(label));
  }
}
