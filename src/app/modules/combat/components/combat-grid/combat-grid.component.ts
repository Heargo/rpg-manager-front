import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { StoredImageComponent } from '../../../../core/components/stored-image/stored-image.component';
import { CombatBusiness } from '../../business/combat.business';
import {
  Cell,
  cellsInRange,
  combatantsInRange,
  occupiedCells,
  reachableCells,
} from '../../helpers/combat-grid.rules';

/** The encounter on the world's grid: a token per combatant (enemies ringed), the movement allowance and a skill's range highlighted, not enforced. */
@Component({
  selector: 'app-combat-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, StoredImageComponent],
  template: `
    @if (grid(); as g) {
      <div
        #board
        class="board"
        data-testid="grid"
        role="group"
        [attr.aria-label]="'combat.grid.label' | transloco"
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
              data-testid="cell"
              [attr.data-x]="cell.x"
              [attr.data-y]="cell.y"
              [attr.data-reachable]="reachable().has(cell.key) ? 'true' : null"
              [attr.data-in-range]="inRange().has(cell.key) ? 'true' : null"
              [class.reachable]="reachable().has(cell.key)"
              [class.in-range]="inRange().has(cell.key)"
              (click)="pickCell(cell)"
            ></div>
          }
        </div>
        @for (token of tokens(); track token.id) {
          <div
            class="token"
            data-testid="token"
            [attr.data-name]="token.name"
            [attr.data-x]="token.position.x"
            [attr.data-y]="token.position.y"
            [attr.data-enemy]="token.side === 'enemy' ? 'true' : null"
            [attr.data-in-range]="tokensInRange().has(token.id) ? 'true' : null"
            [class.enemy]="token.side === 'enemy'"
            [class.active]="token.id === activeId()"
            [class.down]="token.down"
            [class.movable]="canMove(token.id)"
            [class.dragging]="drag()?.id === token.id"
            [title]="token.name"
            [style.left.%]="(token.position.x / g.columns) * 100"
            [style.top.%]="(token.position.y / g.rows) * 100"
            [style.width.%]="100 / g.columns"
            [style.height.%]="100 / g.rows"
            [style.transform]="dragOffset(token.id)"
            (pointerdown)="dragStart($event, token.id)"
            (pointermove)="dragMove($event)"
            (pointerup)="dragEnd($event, board)"
            (pointercancel)="drag.set(null)"
            (click)="pickToken(token.id)"
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
      /* Square cells: the board keeps columns / rows and shrinks to fit 70vh. */
      width: min(100%, calc(70vh * var(--columns) / var(--rows)));
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
    .cell.reachable {
      background: color-mix(in srgb, var(--p-primary-color) 28%, transparent);
    }
    .cell.in-range {
      background: color-mix(in srgb, var(--p-red-400) 30%, transparent);
    }
    .token {
      position: absolute;
      display: grid;
      place-items: center;
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
    .token.active > span,
    .token.active .portrait {
      outline: 2px solid var(--p-yellow-400);
    }
    .token[data-in-range='true'] > span,
    .token[data-in-range='true'] .portrait {
      outline: 2px dashed var(--p-red-300);
    }
    .token.down {
      opacity: 0.5;
    }
    .token.movable {
      cursor: grab;
    }
    .token.dragging {
      cursor: grabbing;
      transition: none;
      z-index: 2;
    }
  `,
})
export class CombatGridComponent {
  private readonly combat = inject(CombatBusiness);

  /** The player's own combatant; absent on the game master's device, where every token moves. */
  readonly combatantId = input<string | undefined>();
  /** The skill being targeted: its range is drawn around the active combatant. */
  readonly skillId = input<string | undefined>();
  readonly targetPicked = output<string>();

  private readonly state = this.combat.$state;
  protected readonly grid = computed(() => this.state()?.grid);
  protected readonly activeId = computed(() => this.state()?.activeId);

  /** Every combatant with a cell (the host gives the unplaced ones their default place). */
  protected readonly tokens = computed(() => {
    const state = this.state();
    if (!state?.grid) return [];
    return state.combatants.filter(
      (c): c is typeof c & { position: Cell } => !!c.position,
    );
  });

  protected readonly cells = computed(() => {
    const grid = this.grid();
    if (!grid) return [];
    return Array.from({ length: grid.columns * grid.rows }, (_, i) => {
      const x = i % grid.columns;
      const y = Math.floor(i / grid.columns);
      return { x, y, key: key({ x, y }) };
    });
  });

  /** Where the active combatant's turn began. */
  private readonly turnStart = signal<{ turn: string; cell: Cell } | null>(
    null,
  );
  private readonly turn = computed(
    () => `${this.state()?.round}:${this.activeId()}`,
  );
  private readonly active = computed(() =>
    this.tokens().find((c) => c.id === this.activeId()),
  );

  /** The movement cells show on the active combatant's own device, or on the game master's. */
  protected readonly reachable = computed(() => {
    const grid = this.grid();
    const active = this.active();
    const own = this.combatantId();
    if (!grid || !active || (own !== undefined && own !== active.id))
      return new Set<string>();
    const start = this.turnStart();
    const from = start?.turn === this.turn() ? start.cell : active.position;
    const others = occupiedCells(
      this.tokens().filter((c) => c.id !== active.id),
    );
    return new Set(
      reachableCells(from, active.movement ?? 0, grid, others).map(key),
    );
  });

  private readonly range = computed(
    () => this.combat.$skills().find((s) => s.id === this.skillId())?.range,
  );
  protected readonly inRange = computed(() => {
    const grid = this.grid();
    const active = this.active();
    const range = this.range();
    if (!grid || !active || !range) return new Set<string>();
    return new Set(cellsInRange(active.position, range, grid).map(key));
  });
  protected readonly tokensInRange = computed(() => {
    const active = this.active();
    const range = this.range();
    return new Set(
      active && range ? combatantsInRange(active.id, range, this.tokens()) : [],
    );
  });

  protected readonly drag = signal<{
    id: string;
    x: number;
    y: number;
    dx: number;
    dy: number;
    moved: boolean;
  } | null>(null);
  private dragged = false;

  constructor() {
    effect(() => {
      const turn = this.turn();
      untracked(() => {
        const active = this.active();
        if (active && this.turnStart()?.turn !== turn)
          this.turnStart.set({ turn, cell: active.position });
      });
    });
  }

  protected canMove(id: string): boolean {
    const own = this.combatantId();
    return own === undefined ? this.combat.$isGameMaster() : own === id;
  }

  /** What a token drag calls: a player moves their own token, the game master any. */
  async moveTo(id: string, cell: Cell): Promise<void> {
    if (!this.canMove(id)) return;
    try {
      await this.combat.move(id, cell);
    } catch {
      // The host refused the cell: the token stays where it is.
    }
  }

  protected pickToken(id: string): void {
    if (this.dragged) {
      this.dragged = false;
      return;
    }
    if (this.skillId()) this.targetPicked.emit(id);
  }

  protected pickCell(cell: Cell): void {
    const token = this.tokens().find(
      (c) => c.position.x === cell.x && c.position.y === cell.y,
    );
    if (token && this.skillId()) this.targetPicked.emit(token.id);
  }

  protected dragStart(event: PointerEvent, id: string): void {
    if (!this.canMove(id)) return;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.dragged = false;
    this.drag.set({
      id,
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
    this.dragged = true;
    const rect = board.getBoundingClientRect();
    const x = Math.floor(
      ((event.clientX - rect.left) / rect.width) * grid.columns,
    );
    const y = Math.floor(
      ((event.clientY - rect.top) / rect.height) * grid.rows,
    );
    if (x >= 0 && y >= 0 && x < grid.columns && y < grid.rows)
      void this.moveTo(drag.id, { x, y });
  }

  protected dragOffset(id: string): string | null {
    const drag = this.drag();
    return drag?.id === id && drag.moved
      ? `translate(${drag.dx}px, ${drag.dy}px)`
      : null;
  }
}

const key = (cell: Cell) => `${cell.x},${cell.y}`;
