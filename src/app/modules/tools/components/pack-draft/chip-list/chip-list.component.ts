import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

/** Up to three chips, then a "+N" chip whose tooltip lists the rest; shared by the tables' list cells. */
@Component({
  selector: 'app-chip-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TagModule, TooltipModule],
  template: `
    <div class="chips">
      @for (name of names().slice(0, 3); track $index) {
        <p-tag data-test="fit-item" severity="secondary" [value]="name" />
      }
      @if (names().length > 3) {
        <p-tag
          data-test="fit-more"
          severity="secondary"
          [value]="'+' + (names().length - 3)"
          [pTooltip]="names().slice(3).join(', ')"
        />
      }
    </div>
  `,
  styles: `
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }
  `,
})
export class ChipListComponent {
  readonly names = input.required<readonly string[]>();
}
