import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { Skill } from '../../../skill/models/skill';
import { BoardGeometry, linkRoute } from '../../helpers/tree-board.rules';
import { TreeNode, TreeNodeStatus } from '../../models/class';

const GEOMETRY: BoardGeometry = {
  cellWidth: 152,
  cellHeight: 120,
  nodeWidth: 136,
  nodeHeight: 72,
};
/** Room right of the last column for a link that bulges out. */
const BULGE = 36;

/**
 * Draws a class tree: a node per skill (its icon, name, level / max level) placed on its grid cell, a curve from the
 * bottom of each prerequisite to the top of the node that needs it. With `states` (from `treeNodeStates`) nodes are locked, available or
 * learned; `levels` gives the level a sheet has in each skill.
 */
@Component({
  selector: 'app-skill-tree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    <div
      class="tree"
      [style.width.px]="size().width"
      [style.height.px]="size().height"
    >
      <svg
        class="lines"
        [attr.width]="size().width"
        [attr.height]="size().height"
      >
        <defs>
          <marker
            id="tree-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0 0 L10 5 L0 10 z" class="arrow" />
          </marker>
        </defs>
        @for (line of lines(); track $index) {
          <path [attr.d]="line" marker-end="url(#tree-arrow)" />
        }
      </svg>
      @for (node of nodes(); track node.skillId) {
        <div
          class="node"
          [class.locked]="node.state === 'locked'"
          [class.available]="node.state === 'available'"
          [class.learned]="node.state === 'learned'"
          [attr.data-tree-node]="node.skillId"
          [attr.data-state]="node.state"
          [style.left.px]="node.x"
          [style.top.px]="node.y"
          [title]="node.hint || node.name"
          [style.width.px]="geometry.nodeWidth"
          [style.height.px]="geometry.nodeHeight"
          (click)="nodeSelected.emit(node.skillId)"
        >
          <i class="icon" [class]="node.icon"></i>
          <div class="body">
            <span class="name">{{ node.name }}</span>
            <span class="level" data-field="level">{{
              'class.tree.level'
                | transloco: { level: node.level, max: node.maxLevel }
            }}</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      overflow: auto;
    }
    .tree {
      position: relative;
    }
    .lines {
      position: absolute;
      inset: 0;
      pointer-events: none;
      stroke: var(--p-text-muted-color);
      stroke-width: 2;
      fill: none;
    }
    .arrow {
      fill: var(--p-text-muted-color);
      stroke: none;
    }
    .node {
      position: absolute;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.6rem;
      border: 2px solid var(--p-content-border-color);
      border-radius: 0.75rem;
      background: var(--p-content-background);
      box-shadow: 0 2px 8px rgb(0 0 0 / 0.08);
      font-size: 0.75rem;
      cursor: pointer;
      transition:
        border-color 0.15s,
        box-shadow 0.15s;
    }
    .node:hover {
      box-shadow: 0 4px 14px rgb(0 0 0 / 0.16);
    }
    .node.locked {
      opacity: 0.5;
    }
    .node.available {
      border-color: var(--p-primary-color);
    }
    .node.learned {
      border-color: var(--p-primary-color);
      background: var(--p-highlight-background);
    }
    .icon {
      flex: none;
      color: var(--p-primary-color);
    }
    .body {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .name {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      overflow: hidden;
      font-weight: 600;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }
    .level {
      color: var(--p-text-muted-color);
    }
  `,
})
export class SkillTreeComponent {
  protected readonly geometry = GEOMETRY;
  private readonly language = inject(LanguageBusiness);

  readonly tree = input.required<TreeNode[]>();
  readonly skills = input.required<Skill[]>();
  /** Locked / available / learned per node, for a sheet. */
  readonly states = input<TreeNodeStatus[]>();
  /** The sheet's level per skill id. */
  readonly levels = input<Record<string, number>>({});
  /** A node was tapped: its skill id. */
  readonly nodeSelected = output<string>();

  protected readonly nodes = computed(() =>
    this.tree().map((node) => {
      const skill = this.skills().find((entry) => entry.id === node.skillId);
      const status = this.states()?.find(
        (entry) => entry.skillId === node.skillId,
      );
      return {
        skillId: node.skillId,
        name: skill?.name ?? node.skillId,
        icon: skill?.type === 'passive' ? 'pi pi-shield' : 'pi pi-bolt',
        level: this.levels()[node.skillId] ?? 0,
        maxLevel: skill?.maxLevel ?? 0,
        state: status?.state,
        hint:
          status?.missing
            .map((m) =>
              m.kind === 'level'
                ? this.language.t('class.tree.missingLevel', {
                    level: m.minLevel,
                  })
                : this.language.t('class.tree.missingRequires', {
                    name: this.nameOf(m.skillId),
                    level: m.level,
                  }),
            )
            .join(', ') ?? '',
        x:
          node.column * GEOMETRY.cellWidth +
          (GEOMETRY.cellWidth - GEOMETRY.nodeWidth) / 2,
        y:
          node.row * GEOMETRY.cellHeight +
          (GEOMETRY.cellHeight - GEOMETRY.nodeHeight) / 2,
      };
    }),
  );

  protected readonly lines = computed(() => {
    const at = new Map(this.tree().map((node) => [node.skillId, node]));
    return this.tree().flatMap((node) =>
      node.requires.flatMap((requirement) => {
        const from = at.get(requirement.skillId);
        return from ? [linkRoute(from, node, GEOMETRY).path] : [];
      }),
    );
  });

  protected readonly size = computed(() => ({
    width: this.tree().length
      ? Math.max(...this.tree().map((node) => node.column + 1)) *
          GEOMETRY.cellWidth +
        BULGE
      : 0,
    height: this.tree().length
      ? Math.max(...this.tree().map((node) => node.row + 1)) *
        GEOMETRY.cellHeight
      : 0,
  }));

  private nameOf(skillId: string): string {
    return this.skills().find((entry) => entry.id === skillId)?.name ?? skillId;
  }
}
