import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { StoredImageComponent } from '../../../../core/components/stored-image/stored-image.component';
import { CombatBusiness } from '../../business/combat.business';
import { Cell } from '../../helpers/combat-grid.rules';
import { setupTokens, StartSlot } from '../../helpers/combat-start.rules';

/** The start form's placement grid: a token per picked character and NPC copy, dragged to a free cell before the encounter starts. */
@Component({
  selector: 'app-combat-setup-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StoredImageComponent],
  template: `
    @if (grid(); as g) {
      <div
        #board
        class="board"
        data-testid="setup-grid"
        [attr.data-columns]="g.columns"
        [attr.data-rows]="g.rows"
        [style.aspect-ratio]="g.columns + ' / ' + g.rows"
        [style.--columns]="g.columns"
        [style.--rows]="g.rows"
      >
        @if (g.imageId; as imageId) {
          <app-stored-image
            class="map"
            data-testid="grid-map"
            [attr.data-image-id]="imageId"
            [imageId]="imageId"
          />
        }
        <div class="cells">
          @for (cell of cells(); track cell.key) {
            <div
              class="cell"
              data-testid="setup-cell"
              [attr.data-x]="cell.x"
              [attr.data-y]="cell.y"
            ></div>
          }
        </div>
        @for (token of tokens(); track token.key) {
          <div
            class="token"
            data-testid="setup-token"
            [attr.data-key]="token.key"
            [attr.data-name]="token.name"
            [attr.data-x]="token.x"
            [attr.data-y]="token.y"
            [attr.data-enemy]="token.side === 'enemy' ? 'true' : null"
            [class.enemy]="token.side === 'enemy'"
            [class.dragging]="drag()?.key === token.key"
            [title]="token.name"
            [style.left.%]="(token.x / g.columns) * 100"
            [style.top.%]="(token.y / g.rows) * 100"
            [style.width.%]="100 / g.columns"
            [style.height.%]="100 / g.rows"
            [style.transform]="dragOffset(token.key)"
            (pointerdown)="dragStart($event, token.key)"
            (pointermove)="dragMove($event)"
            (pointerup)="dragEnd($event, board)"
            (pointercancel)="drag.set(null)"
          >
            @if (token.portraitId; as portraitId) {
              <app-stored-image
                class="portrait"
                [imageId]="portraitId"
                [alt]="token.name"
              >
                <span>{{ token.name.charAt(0).toUpperCase() }}</span>
              </app-stored-image>
            } @else {
              <span>{{ token.name.charAt(0).toUpperCase() }}</span>
            }
          </div>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .board {
      position: relative;
      width: min(100%, calc(50vh * var(--columns) / var(--rows)));
      margin-inline: auto;
      border: 1px solid var(--p-content-border-color);
      background: var(--p-content-background);
      touch-action: none;
      user-select: none;
    }
    .map {
      position: absolute;
      inset: 0;
      opacity: 0.85;
    }
    .cells {
      position: absolute;
      inset: 0;
      display: grid;
      grid-template-columns: repeat(var(--columns), 1fr);
      grid-template-rows: repeat(var(--rows), 1fr);
    }
    .cell {
      border: 1px solid
        color-mix(in srgb, var(--p-content-border-color) 60%, transparent);
    }
    .token {
      position: absolute;
      display: grid;
      place-items: center;
      cursor: grab;
      transition:
        left 0.15s,
        top 0.15s;
    }
    .token > span,
    .token .portrait {
      width: 80%;
      height: auto;
      aspect-ratio: 1;
      overflow: hidden;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--p-primary-color);
      color: var(--p-primary-contrast-color);
      font-weight: 600;
      font-size: clamp(0.6rem, 2.2vw, 1.1rem);
      box-shadow: 0 0 0 2px var(--p-content-background);
    }
    .token.enemy > span,
    .token.enemy .portrait {
      box-shadow: 0 0 0 3px var(--p-red-500);
    }
    .token.dragging {
      cursor: grabbing;
      transition: none;
      z-index: 2;
    }
  `,
})
export class CombatSetupGridComponent {
  private readonly combat = inject(CombatBusiness);

  readonly slots = input.required<StartSlot[]>();
  /** The cells chosen so far. */
  readonly positions = input<Record<string, Cell>>({});
  /** A cell for every slot, after each successful move. */
  readonly positionsChange = output<Record<string, Cell>>();

  protected readonly grid = this.combat.$grid;
  private readonly chosen = linkedSignal(() => this.positions());

  protected readonly tokens = computed(() => {
    const grid = this.grid();
    return grid ? setupTokens(this.slots(), this.chosen(), grid) : [];
  });

  protected readonly cells = computed(() => {
    const grid = this.grid();
    if (!grid) return [];
    return Array.from({ length: grid.columns * grid.rows }, (_, i) => {
      const x = i % grid.columns;
      const y = Math.floor(i / grid.columns);
      return { x, y, key: `${x},${y}` };
    });
  });

  protected readonly drag = signal<{
    key: string;
    x: number;
    y: number;
    dx: number;
    dy: number;
    moved: boolean;
  } | null>(null);

  /** Moves a token to a free in-bounds cell; anything else changes nothing. */
  place(key: string, cell: Cell): void {
    const grid = this.grid();
    const tokens = this.tokens();
    if (!grid || !tokens.some((t) => t.key === key)) return;
    if (
      !Number.isInteger(cell.x) ||
      !Number.isInteger(cell.y) ||
      cell.x < 0 ||
      cell.y < 0 ||
      cell.x >= grid.columns ||
      cell.y >= grid.rows
    )
      return;
    if (tokens.some((t) => t.x === cell.x && t.y === cell.y)) return;
    const next = Object.fromEntries(
      tokens.map((t) => [
        t.key,
        t.key === key ? { x: cell.x, y: cell.y } : { x: t.x, y: t.y },
      ]),
    );
    this.chosen.set(next);
    this.positionsChange.emit(next);
  }

  protected dragStart(event: PointerEvent, key: string): void {
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.drag.set({
      key,
      x: event.clientX,
      y: event.clientY,
      dx: 0,
      dy: 0,
      moved: false,
    });
  }

  protected dragMove(event: PointerEvent): void {
    const drag = this.drag();
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    this.drag.set({
      ...drag,
      dx,
      dy,
      moved: drag.moved || Math.abs(dx) + Math.abs(dy) > 4,
    });
  }

  protected dragEnd(event: PointerEvent, board: HTMLElement): void {
    const drag = this.drag();
    const grid = this.grid();
    this.drag.set(null);
    if (!drag?.moved || !grid) return;
    const rect = board.getBoundingClientRect();
    this.place(drag.key, {
      x: Math.floor(((event.clientX - rect.left) / rect.width) * grid.columns),
      y: Math.floor(((event.clientY - rect.top) / rect.height) * grid.rows),
    });
  }

  protected dragOffset(key: string): string | null {
    const drag = this.drag();
    return drag?.key === key && drag.moved
      ? `translate(${drag.dx}px, ${drag.dy}px)`
      : null;
  }
}
