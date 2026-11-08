import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/** A link of the board, as drawn: its curve, the rank chip position and its state. */
export interface BoardLink {
  key: string;
  from: string;
  to: string;
  rank: number;
  path: string;
  midX: number;
  midY: number;
  selected: boolean;
  invalid: boolean;
}

/** The links layer of the tree board: arrowed curves (clickable) with a rank chip at their middle. */
@Component({
  selector: 'app-tree-links',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  styleUrl: './tree-links.component.scss',
  template: `
    <svg class="links" [attr.width]="width()" [attr.height]="height()">
      <defs>
        @for (kind of ['', 'selected', 'invalid']; track kind) {
          <marker
            [attr.id]="'arrow' + kind"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0 0 L10 5 L0 10 z" [class]="'arrow ' + kind" />
          </marker>
        }
      </defs>
      @for (link of links(); track link.key) {
        <path
          class="link"
          [class.selected]="link.selected"
          [class.invalid]="link.invalid"
          [attr.d]="link.path"
          [attr.marker-end]="
            'url(#arrow' +
            (link.invalid ? 'invalid' : link.selected ? 'selected' : '') +
            ')'
          "
        />
        <path
          class="link-hit"
          [attr.d]="link.path"
          (click)="$event.stopPropagation(); select(link.from, link.to)"
        />
      }
      @if (wire(); as path) {
        <path class="link wire" [attr.d]="path" />
      }
    </svg>

    @for (link of links(); track link.key) {
      <button
        type="button"
        class="chip"
        [class.selected]="link.selected"
        [class.invalid]="link.invalid"
        [attr.data-link]="link.key"
        [attr.aria-label]="'class.editor.selectLink' | transloco"
        [style.left.px]="link.midX"
        [style.top.px]="link.midY"
        (click)="$event.stopPropagation(); select(link.from, link.to)"
      >
        {{ link.rank }}
      </button>
    }
  `,
})
export class TreeLinksComponent {
  readonly links = input.required<BoardLink[]>();
  /** The curve of a link being dragged. */
  readonly wire = input<string | null>(null);
  readonly width = input.required<number>();
  readonly height = input.required<number>();

  readonly linkSelected = output<{ from: string; to: string }>();

  protected select(from: string, to: string): void {
    this.linkSelected.emit({ from, to });
  }
}
