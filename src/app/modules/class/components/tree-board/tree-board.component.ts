import {
  CdkDrag,
  CdkDragEnd,
  CdkDragMove,
  CdkDragPlaceholder,
  CdkDragPreview,
  CdkDropList,
} from '@angular/cdk/drag-drop';
import { CdkScrollable } from '@angular/cdk/scrolling';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Skill } from '../../../skill/models/skill';
import {
  BoardCell,
  BoardGeometry,
  boardSize,
  cellAt,
  linkRoute,
  nodeBottom,
  wireRoute,
} from '../../helpers/tree-board.rules';
import { TreeNode } from '../../models/class';
import { BoardLink, TreeLinksComponent } from './tree-links.component';

export type BoardSelection =
  | { kind: 'node'; skillId: string }
  | { kind: 'link'; from: string; to: string };

const GEOMETRY: BoardGeometry = {
  cellWidth: 184,
  cellHeight: 136,
  nodeWidth: 168,
  nodeHeight: 88,
};
const MARGIN_X = (GEOMETRY.cellWidth - GEOMETRY.nodeWidth) / 2;
const MARGIN_Y = (GEOMETRY.cellHeight - GEOMETRY.nodeHeight) / 2;

const never = (): boolean => false;
const ARROWS: Record<string, BoardCell> = {
  ArrowLeft: { column: -1, row: 0 },
  ArrowRight: { column: 1, row: 0 },
  ArrowUp: { column: 0, row: -1 },
  ArrowDown: { column: 0, row: 1 },
};

/** The tree board: a dotted grid with node cards you drag, links drawn as curves, and a handle to pull a new link. */
@Component({
  selector: 'app-tree-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoPipe,
    CdkDrag,
    CdkDropList,
    CdkDragPreview,
    CdkDragPlaceholder,
    CdkScrollable,
    TreeLinksComponent,
  ],
  styleUrl: './tree-board.component.scss',
  template: `
    <div class="scroller" cdkScrollable>
      <div
        #surface
        class="surface"
        [style.width.px]="surfaceSize().width"
        [style.height.px]="surfaceSize().height"
        [style.background-size]="cellBackground"
        (click)="selection.set(null)"
      >
        @if (hoverCell(); as target) {
          <div
            class="drop-cell"
            [class.busy]="target.busy"
            [style.width.px]="geometry.cellWidth"
            [style.height.px]="geometry.cellHeight"
            [style.left.px]="target.column * geometry.cellWidth"
            [style.top.px]="target.row * geometry.cellHeight"
          ></div>
        }
        <app-tree-links
          [links]="links()"
          [wire]="wire()"
          [width]="surfaceSize().width"
          [height]="surfaceSize().height"
          (linkSelected)="selectLink($event.from, $event.to)"
        />

        <div
          class="nodes"
          cdkDropList
          cdkDropListSortingDisabled
          [cdkDropListEnterPredicate]="never"
        >
          @for (node of nodes(); track node.skillId) {
            <div
              class="slot"
              [style.left.px]="node.x"
              [style.top.px]="node.y"
              [style.width.px]="geometry.nodeWidth"
              [style.height.px]="geometry.nodeHeight"
            >
              <div
                class="node"
                role="button"
                tabindex="0"
                cdkDrag
                [class.selected]="node.selected"
                [class.link-target]="node.linkTarget"
                [class.invalid]="node.invalid"
                [attr.data-node]="node.skillId"
                [attr.data-column]="node.column"
                [attr.data-row]="node.row"
                [attr.data-invalid]="node.invalid ? 'true' : null"
                [attr.title]="node.name"
                (click)="$event.stopPropagation(); selectNode(node.skillId)"
                (keydown.enter)="selectNode(node.skillId)"
                (keydown)="moveByKey($event, node)"
                (cdkDragMoved)="setHover($event.pointerPosition)"
                (cdkDragEnded)="endNodeDrag($event, node.skillId)"
              >
                <div class="icon"><i [class]="node.icon"></i></div>
                <div class="body">
                  <span class="name">{{ node.name }}</span>
                  <span class="badges">
                    <span class="badge">{{
                      'class.editor.node.maxLevel'
                        | transloco: { count: node.maxLevel }
                    }}</span>
                    <span class="badge level">{{
                      'class.editor.node.level'
                        | transloco: { count: node.minLevel }
                    }}</span>
                  </span>
                </div>
                <div
                  *cdkDragPreview
                  class="node preview"
                  [style.width.px]="geometry.nodeWidth"
                  [style.height.px]="geometry.nodeHeight"
                >
                  <div class="icon"><i [class]="node.icon"></i></div>
                  <div class="body">
                    <span class="name">{{ node.name }}</span>
                  </div>
                </div>
                <div *cdkDragPlaceholder class="node ghost"></div>
              </div>
            </div>
          }
        </div>

        @for (node of nodes(); track node.skillId) {
          <div
            class="connector"
            cdkDrag
            tabindex="-1"
            aria-hidden="true"
            [attr.data-connector]="node.skillId"
            [attr.title]="'class.editor.connectHint' | transloco"
            [style.left.px]="node.x + geometry.nodeWidth / 2 - 22"
            [style.top.px]="node.y + geometry.nodeHeight - 30"
            (cdkDragMoved)="moveLink(node.skillId, $event)"
            (cdkDragEnded)="endLinkDrag(node.skillId, $event)"
          >
            <span class="dot"><i class="pi pi-link"></i></span>
          </div>
        }
      </div>
    </div>
  `,
})
export class TreeBoardComponent {
  readonly tree = input.required<TreeNode[]>();
  readonly skills = input.required<Skill[]>();
  /** Nodes and links (`"from>to"`) that validation points at. */
  readonly invalid = input<{ nodes: Set<string>; links: Set<string> }>({
    nodes: new Set(),
    links: new Set(),
  });
  readonly selection = model<BoardSelection | null>(null);

  /** A node was dropped on a cell, or moved by the arrow keys. */
  readonly nodeDrop = output<{ skillId: string; cell: BoardCell }>();
  /** A connector was dropped on a node: `from` becomes a prerequisite of `to`. */
  readonly linkDrop = output<{ from: string; to: string }>();

  protected readonly geometry = GEOMETRY;
  protected readonly never = never;
  protected readonly cellBackground = `${GEOMETRY.cellWidth}px ${GEOMETRY.cellHeight}px`;

  private readonly surface = viewChild<ElementRef<HTMLElement>>('surface');
  protected readonly hoverCell = signal<(BoardCell & { busy: boolean }) | null>(
    null,
  );
  private readonly linking = signal<{
    from: string;
    x: number;
    y: number;
  } | null>(null);

  protected readonly surfaceSize = computed(() => {
    const size = boardSize(this.tree());
    return {
      width: size.columns * GEOMETRY.cellWidth,
      height: size.rows * GEOMETRY.cellHeight,
    };
  });

  private readonly linkTarget = computed(() => {
    const cell = this.hoverCell();
    if (!cell || !this.linking()) return null;
    return this.nodeAt(cell)?.skillId ?? null;
  });

  protected readonly nodes = computed(() => {
    const selection = this.selection();
    return this.tree().map((node) => {
      const skill = this.skillOf(node.skillId);
      return {
        skillId: node.skillId,
        name: skill?.name ?? node.skillId,
        icon: skill?.type === 'passive' ? 'pi pi-shield' : 'pi pi-bolt',
        maxLevel: skill?.maxLevel ?? 0,
        minLevel: node.minLevel,
        column: node.column,
        row: node.row,
        x: node.column * GEOMETRY.cellWidth + MARGIN_X,
        y: node.row * GEOMETRY.cellHeight + MARGIN_Y,
        selected:
          selection?.kind === 'node' && selection.skillId === node.skillId,
        invalid: this.invalid().nodes.has(node.skillId),
        linkTarget:
          this.linkTarget() === node.skillId &&
          this.linking()?.from !== node.skillId,
      };
    });
  });

  protected readonly links = computed<BoardLink[]>(() => {
    const tree = this.tree();
    const selection = this.selection();
    return tree.flatMap((node) =>
      node.requires.flatMap((requirement) => {
        const from = tree.find(
          (entry) => entry.skillId === requirement.skillId,
        );
        if (!from) return [];
        const key = `${requirement.skillId}>${node.skillId}`;
        return [
          {
            key,
            from: requirement.skillId,
            to: node.skillId,
            level: requirement.level,
            ...linkRoute(from, node, GEOMETRY),
            selected:
              selection?.kind === 'link' &&
              selection.from === requirement.skillId &&
              selection.to === node.skillId,
            invalid: this.invalid().links.has(key),
          },
        ];
      }),
    );
  });

  /** The dashed curve from a connector to the pointer while linking. */
  protected readonly wire = computed(() => {
    const linking = this.linking();
    const from = this.tree().find((n) => n.skillId === linking?.from);
    if (!linking || !from) return null;
    return wireRoute(nodeBottom(from, GEOMETRY), linking);
  });

  /** The board cell under a viewport point, none outside the board. */
  locate(point: { x: number; y: number }): BoardCell | null {
    const rect = this.surface()?.nativeElement.getBoundingClientRect();
    if (!rect) return null;
    const x = point.x - rect.left;
    const y = point.y - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
    return cellAt(
      { x, y },
      { width: GEOMETRY.cellWidth, height: GEOMETRY.cellHeight },
    );
  }

  /** Highlights the cell under a viewport point (a drag in progress); none clears it. */
  setHover(point: { x: number; y: number } | null): void {
    const cell = point ? this.locate(point) : null;
    this.hoverCell.set(cell ? { ...cell, busy: !!this.nodeAt(cell) } : null);
  }

  protected selectNode(skillId: string): void {
    this.selection.set({ kind: 'node', skillId });
  }

  protected selectLink(from: string, to: string): void {
    this.selection.set({ kind: 'link', from, to });
  }

  protected endNodeDrag(event: CdkDragEnd, skillId: string): void {
    const cell = this.locate(event.dropPoint);
    this.setHover(null);
    event.source.reset();
    if (cell) this.nodeDrop.emit({ skillId, cell });
  }

  protected moveLink(from: string, event: CdkDragMove): void {
    const rect = this.surface()?.nativeElement.getBoundingClientRect();
    if (!rect) return;
    this.linking.set({
      from,
      x: event.pointerPosition.x - rect.left,
      y: event.pointerPosition.y - rect.top,
    });
    this.setHover(event.pointerPosition);
  }

  protected endLinkDrag(from: string, event: CdkDragEnd): void {
    const cell = this.locate(event.dropPoint);
    const target = cell ? this.nodeAt(cell) : undefined;
    this.linking.set(null);
    this.setHover(null);
    event.source.reset();
    if (target) this.linkDrop.emit({ from, to: target.skillId });
  }

  /** Arrow keys move the focused node to the neighbouring cell. */
  protected moveByKey(
    event: KeyboardEvent,
    node: { skillId: string; column: number; row: number },
  ): void {
    const step = ARROWS[event.key];
    if (!step || event.target !== event.currentTarget) return;
    event.preventDefault();
    const cell = {
      column: Math.max(0, node.column + step.column),
      row: Math.max(0, node.row + step.row),
    };
    if (cell.column === node.column && cell.row === node.row) return;
    this.selectNode(node.skillId);
    this.nodeDrop.emit({ skillId: node.skillId, cell });
  }

  private skillOf(skillId: string): Skill | undefined {
    return this.skills().find((skill) => skill.id === skillId);
  }

  private nodeAt(cell: BoardCell): TreeNode | undefined {
    return this.tree().find(
      (node) => node.column === cell.column && node.row === cell.row,
    );
  }
}
