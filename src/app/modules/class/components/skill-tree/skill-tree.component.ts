import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { Skill } from '../../../skill/models/skill';
import { TreeNode, TreeNodeStatus } from '../../models/class';

const CELL = 96;
const NODE = 64;

/**
 * Draws a class tree: a node per skill (its icon, name, rank / max rank) placed on its grid cell, a line from each
 * prerequisite to the node that needs it. With `states` (from `treeNodeStates`) nodes are locked, available or
 * learned; `ranks` gives the rank a sheet has in each skill.
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
        @for (line of lines(); track $index) {
          <line
            [attr.x1]="line.x1"
            [attr.y1]="line.y1"
            [attr.x2]="line.x2"
            [attr.y2]="line.y2"
          />
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
          [title]="node.hint"
        >
          <i [class]="node.icon"></i>
          <span class="name">{{ node.name }}</span>
          <span class="rank" data-field="rank">{{
            'class.tree.rank'
              | transloco: { rank: node.rank, max: node.maxRank }
          }}</span>
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
      stroke: var(--p-content-border-color);
      stroke-width: 2;
    }
    .node {
      position: absolute;
      width: 64px;
      height: 64px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--p-content-border-color);
      border-radius: 0.5rem;
      background: var(--p-content-background);
      font-size: 0.7rem;
      text-align: center;
      overflow: hidden;
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
    .name {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .rank {
      color: var(--p-text-muted-color);
    }
  `,
})
export class SkillTreeComponent {
  private readonly language = inject(LanguageBusiness);

  readonly tree = input.required<TreeNode[]>();
  readonly skills = input.required<Skill[]>();
  /** Locked / available / learned per node, for a sheet. */
  readonly states = input<TreeNodeStatus[]>();
  /** The sheet's rank per skill id. */
  readonly ranks = input<Record<string, number>>({});

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
        rank: this.ranks()[node.skillId] ?? 0,
        maxRank: skill?.maxRank ?? 0,
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
                    rank: m.rank,
                  }),
            )
            .join(', ') ?? '',
        x: node.column * CELL,
        y: node.row * CELL,
      };
    }),
  );

  protected readonly lines = computed(() => {
    const at = new Map(this.tree().map((node) => [node.skillId, node]));
    return this.tree().flatMap((node) =>
      node.requires.flatMap((requirement) => {
        const from = at.get(requirement.skillId);
        return from
          ? [
              {
                x1: from.column * CELL + NODE / 2,
                y1: from.row * CELL + NODE / 2,
                x2: node.column * CELL + NODE / 2,
                y2: node.row * CELL + NODE / 2,
              },
            ]
          : [];
      }),
    );
  });

  protected readonly size = computed(() => ({
    width: Math.max(0, ...this.tree().map((node) => node.column * CELL + NODE)),
    height: Math.max(0, ...this.tree().map((node) => node.row * CELL + NODE)),
  }));

  private nameOf(skillId: string): string {
    return this.skills().find((entry) => entry.id === skillId)?.name ?? skillId;
  }
}
