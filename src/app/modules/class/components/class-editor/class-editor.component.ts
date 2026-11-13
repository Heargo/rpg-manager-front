import {
  CdkDrag,
  CdkDragEnd,
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDragPreview,
  CdkDropList,
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TabsModule } from '@openng/optimus-ui/tabs';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { Skill } from '../../../skill/models/skill';
import { MessageLevel } from '../../../../core/models/toast-level';
import { World } from '../../../world/models/world';
import { ClassEditorBusiness } from '../../business/class-editor.business';
import { ClassIssue } from '../../helpers/class.rules';
import {
  addNodeAt,
  BoardCell,
  boardSize,
  involvedInIssues,
  linkPrerequisite,
  moveNode,
  removeNode,
  unlinkPrerequisite,
} from '../../helpers/tree-board.rules';
import { CharacterClass, ClassDraft, TreeNode } from '../../models/class';
import {
  BoardSelection,
  TreeBoardComponent,
} from '../tree-board/tree-board.component';

const never = (): boolean => false;

/** Creates or edits a class on a world: a form with the tree board (drag and drop) and its JSON (kept in sync). */
@Component({
  selector: 'app-class-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslocoPipe,
    CdkDrag,
    CdkDragHandle,
    CdkDropList,
    CdkDragPreview,
    CdkDragPlaceholder,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TabsModule,
    TextareaModule,
    TreeBoardComponent,
  ],
  styleUrl: './class-editor.component.scss',
  template: `
    <p-tabs value="form">
      <p-tablist>
        <p-tab value="form">{{ 'class.editor.tabForm' | transloco }}</p-tab>
        <p-tab value="json">{{ 'class.editor.tabJson' | transloco }}</p-tab>
      </p-tablist>
      <p-tabpanels>
        <p-tabpanel value="form">
          <div class="form">
            <div class="field">
              <label for="class-name">{{
                'class.editor.fields.name' | transloco
              }}</label>
              <input
                pInputText
                id="class-name"
                data-field="name"
                autocomplete="off"
                [value]="draft().name"
                (input)="patch({ name: $any($event.target).value })"
              />
            </div>
            <div class="field">
              <label for="class-description">{{
                'class.editor.fields.description' | transloco
              }}</label>
              <textarea
                pTextarea
                id="class-description"
                data-field="description"
                rows="3"
                [value]="draft().description"
                (input)="patch({ description: $any($event.target).value })"
              ></textarea>
            </div>

            <section class="tree">
              <h3>{{ 'class.editor.fields.tree' | transloco }}</h3>
              <p class="hint">{{ 'class.editor.treeHint' | transloco }}</p>

              <div class="workbench">
                <aside class="panel palette">
                  <h4>{{ 'class.editor.palette.title' | transloco }}</h4>
                  <input
                    pInputText
                    data-field="palette-search"
                    type="search"
                    autocomplete="off"
                    [attr.aria-label]="
                      'class.editor.palette.search' | transloco
                    "
                    [placeholder]="'class.editor.palette.search' | transloco"
                    [value]="paletteSearch()"
                    (input)="paletteSearch.set($any($event.target).value)"
                  />
                  <div
                    class="palette-list"
                    cdkDropList
                    cdkDropListSortingDisabled
                    [cdkDropListEnterPredicate]="never"
                  >
                    @for (skill of palette(); track skill.id) {
                      <div
                        class="palette-item"
                        cdkDrag
                        [attr.data-palette-item]="skill.id"
                        (cdkDragMoved)="
                          board().setHover($event.pointerPosition)
                        "
                        (cdkDragEnded)="endPaletteDrag($event, skill.id)"
                      >
                        <i
                          class="pi pi-arrows-alt grip"
                          cdkDragHandle
                          aria-hidden="true"
                        ></i>
                        <i [class]="iconOf(skill)"></i>
                        <span class="label">{{ skill.name }}</span>
                        <button
                          pButton
                          type="button"
                          data-action="add-node"
                          icon="pi pi-plus"
                          severity="secondary"
                          size="small"
                          [text]="true"
                          [rounded]="true"
                          [attr.aria-label]="
                            'class.editor.palette.add' | transloco
                          "
                          (click)="addFirstFree(skill.id)"
                        ></button>
                        <div *cdkDragPreview class="palette-item preview">
                          <i [class]="iconOf(skill)"></i>
                          <span class="label">{{ skill.name }}</span>
                        </div>
                        <div
                          *cdkDragPlaceholder
                          class="palette-item ghost"
                        ></div>
                      </div>
                    } @empty {
                      <p class="hint">
                        {{
                          (paletteSearch()
                            ? 'class.editor.palette.noMatch'
                            : 'class.editor.noMoreSkills'
                          ) | transloco
                        }}
                      </p>
                    }
                  </div>
                </aside>

                <app-tree-board
                  data-board
                  [tree]="draft().tree"
                  [skills]="world().skills"
                  [invalid]="involved()"
                  [(selection)]="selection"
                  (nodeDrop)="onNodeDrop($event.skillId, $event.cell)"
                  (linkDrop)="onLinkDrop($event.from, $event.to)"
                />

                <aside class="panel inspector-panel">
                  @if (inspected(); as target) {
                    <div class="inspector" data-inspector>
                      @if (target.kind === 'node') {
                        <h4>
                          <i [class]="iconOf(target.skill)"></i>
                          {{ target.skill.name }}
                        </h4>
                        <div class="field">
                          <label>{{
                            'class.editor.fields.minLevel' | transloco
                          }}</label>
                          <p-inputnumber
                            data-field="node-min-level"
                            [min]="1"
                            [showButtons]="true"
                            [ngModel]="target.node.minLevel"
                            (ngModelChange)="
                              patchNode(target.node.skillId, {
                                minLevel: $event ?? 0,
                              })
                            "
                          />
                        </div>
                        <h5>
                          {{ 'class.editor.fields.requires' | transloco }}
                        </h5>
                        @for (
                          requirement of target.requirements;
                          track requirement.skillId
                        ) {
                          <div class="requirement">
                            <span class="req-name">{{ requirement.name }}</span>
                            <p-inputnumber
                              data-field="requirement-level"
                              [min]="1"
                              [max]="requirement.maxLevel"
                              [showButtons]="true"
                              [ngModel]="requirement.level"
                              (ngModelChange)="
                                setLevel(
                                  target.node.skillId,
                                  requirement.skillId,
                                  $event ?? 0
                                )
                              "
                            />
                            <button
                              pButton
                              type="button"
                              data-action="remove-requirement"
                              icon="pi pi-times"
                              severity="danger"
                              [text]="true"
                              [rounded]="true"
                              [attr.aria-label]="
                                'class.editor.removeRequirement' | transloco
                              "
                              (click)="
                                unlink(requirement.skillId, target.node.skillId)
                              "
                            ></button>
                          </div>
                        } @empty {
                          <p class="hint">
                            {{
                              'class.editor.inspector.noPrerequisites'
                                | transloco
                            }}
                          </p>
                        }
                        @if (candidates().length) {
                          <div class="add-requirement">
                            <p-select
                              data-field="add-requirement"
                              [options]="candidates()"
                              optionLabel="label"
                              optionValue="value"
                              [ngModel]="null"
                              [placeholder]="
                                'class.editor.addRequirement' | transloco
                              "
                              (ngModelChange)="
                                $event &&
                                  addRequirement($event, target.node.skillId)
                              "
                            />
                            <p-inputnumber
                              data-field="new-requirement-level"
                              [min]="1"
                              [showButtons]="true"
                              [ngModel]="newLevel()"
                              (ngModelChange)="newLevel.set($event ?? 1)"
                            />
                          </div>
                        }
                        <button
                          pButton
                          type="button"
                          data-action="remove-node"
                          icon="pi pi-trash"
                          severity="danger"
                          size="small"
                          [outlined]="true"
                          [label]="'class.editor.removeNode' | transloco"
                          (click)="remove(target.node.skillId)"
                        ></button>
                      } @else {
                        <h4>
                          <i class="pi pi-link"></i>
                          {{ 'class.editor.inspector.link' | transloco }}
                        </h4>
                        <p class="hint">
                          {{ target.fromName }}
                          <i class="pi pi-arrow-right"></i>
                          {{ target.toName }}
                        </p>
                        <div class="field">
                          <label>{{
                            'class.editor.fields.level' | transloco
                          }}</label>
                          <p-inputnumber
                            data-field="requirement-level"
                            [min]="1"
                            [max]="target.maxLevel"
                            [showButtons]="true"
                            [ngModel]="target.level"
                            (ngModelChange)="
                              setLevel(target.to, target.from, $event ?? 0)
                            "
                          />
                        </div>
                        <button
                          pButton
                          type="button"
                          data-action="delete-link"
                          icon="pi pi-trash"
                          severity="danger"
                          size="small"
                          [outlined]="true"
                          [label]="'class.editor.deleteLink' | transloco"
                          (click)="unlink(target.from, target.to)"
                        ></button>
                      }
                    </div>
                  } @else {
                    <div class="inspector-empty">
                      <i class="pi pi-info-circle"></i>
                      <p class="hint">
                        {{ 'class.editor.inspector.empty' | transloco }}
                      </p>
                    </div>
                  }
                </aside>
              </div>
            </section>
          </div>
        </p-tabpanel>

        <p-tabpanel value="json">
          <div class="form">
            <p class="hint">{{ 'class.editor.jsonHint' | transloco }}</p>
            <textarea
              pTextarea
              data-field="json"
              class="json"
              rows="14"
              spellcheck="false"
              [value]="jsonText()"
              (input)="editJson($any($event.target).value)"
            ></textarea>
            <div>
              <button
                pButton
                type="button"
                data-action="copy-ai-prompt"
                icon="pi pi-copy"
                severity="secondary"
                [text]="true"
                [label]="'ai.copyPrompt' | transloco"
                (click)="copyAiPrompt()"
              ></button>
              <small class="hint">{{ 'ai.copyPromptHint' | transloco }}</small>
            </div>
          </div>
        </p-tabpanel>
      </p-tabpanels>
    </p-tabs>

    @for (issue of allIssues(); track $index) {
      <p-message severity="warn" data-field="error">{{
        'class.editor.issue.' + issue.code | transloco
      }}</p-message>
    }
    <div class="actions">
      <button
        pButton
        type="button"
        data-action="random"
        icon="pi pi-sparkles"
        severity="secondary"
        [label]="'common.random' | transloco"
        (click)="random()"
      ></button>
      <button
        pButton
        type="button"
        data-action="save"
        icon="pi pi-save"
        [label]="'class.editor.save' | transloco"
        (click)="submit()"
      ></button>
    </div>
  `,
})
export class ClassEditorComponent {
  private readonly messages = inject(MessageService);
  private readonly editor = inject(ClassEditorBusiness);
  private readonly language = inject(LanguageBusiness);

  /** The world whose skills and attributes the class uses. */
  readonly world = input.required<World>();
  /** The class to edit; none to create one. */
  readonly characterClass = input<CharacterClass>();

  /** The class to save; for a new class it has no id yet. */
  readonly save = output<CharacterClass>();

  protected readonly never = never;

  protected readonly board = viewChild.required(TreeBoardComponent);

  private readonly initial = computed<ClassDraft>(
    () => this.characterClass() ?? this.editor.empty(),
  );
  protected readonly draft = linkedSignal(() => this.initial());
  protected readonly jsonText = linkedSignal(() =>
    this.editor.toJson(this.initial()),
  );
  protected readonly jsonIssues = linkedSignal<ClassIssue[]>(() => {
    this.characterClass();
    return [];
  });
  protected readonly selection = linkedSignal<BoardSelection | null>(() => {
    this.characterClass();
    return null;
  });
  protected readonly paletteSearch = signal('');
  protected readonly newLevel = signal(1);

  protected readonly issues = computed(() =>
    this.editor.validate(this.draft(), this.world()),
  );
  protected readonly allIssues = computed(() => [
    ...this.issues(),
    ...this.jsonIssues(),
  ]);
  protected readonly involved = computed(() =>
    involvedInIssues(this.draft().tree, this.issues()),
  );

  protected readonly palette = computed(() => {
    const used = new Set(this.draft().tree.map((node) => node.skillId));
    const search = this.paletteSearch().trim().toLowerCase();
    return this.world().skills.filter(
      (skill) =>
        !used.has(skill.id) && skill.name.toLowerCase().includes(search),
    );
  });

  /** The other nodes that can still become a prerequisite of the selected node. */
  protected readonly candidates = computed(() => {
    const selection = this.selection();
    const tree = this.draft().tree;
    const node =
      selection?.kind === 'node'
        ? tree.find((entry) => entry.skillId === selection.skillId)
        : undefined;
    if (!node) return [];
    return tree
      .filter(
        (other) =>
          other.skillId !== node.skillId &&
          !node.requires.some((r) => r.skillId === other.skillId),
      )
      .map((other) => ({
        value: other.skillId,
        label: this.nameOf(other.skillId),
      }));
  });

  /** What the inspector shows: the selected node with its prerequisites, or the selected link. */
  protected readonly inspected = computed(() => {
    const selection = this.selection();
    const tree = this.draft().tree;
    if (selection?.kind === 'node') {
      const node = tree.find((entry) => entry.skillId === selection.skillId);
      const skill = this.skillOf(selection.skillId);
      if (!node || !skill) return null;
      return {
        kind: 'node' as const,
        node,
        skill,
        requirements: node.requires.map((requirement) => ({
          ...requirement,
          name: this.nameOf(requirement.skillId),
          maxLevel: this.skillOf(requirement.skillId)?.maxLevel ?? 99,
        })),
      };
    }
    if (selection?.kind === 'link') {
      const requirement = tree
        .find((entry) => entry.skillId === selection.to)
        ?.requires.find((r) => r.skillId === selection.from);
      if (!requirement) return null;
      return {
        kind: 'link' as const,
        from: selection.from,
        to: selection.to,
        fromName: this.nameOf(selection.from),
        toName: this.nameOf(selection.to),
        level: requirement.level,
        maxLevel: this.skillOf(selection.from)?.maxLevel ?? 99,
      };
    }
    return null;
  });

  protected nameOf(skillId: string): string {
    return this.skillOf(skillId)?.name ?? skillId;
  }

  protected iconOf(skill: Skill | undefined): string {
    return skill?.type === 'passive' ? 'pi pi-shield' : 'pi pi-bolt';
  }

  protected patch(change: Partial<ClassDraft>): void {
    this.setDraft({ ...this.draft(), ...change });
  }

  // ---- Drops (fed by the CDK events below, public for tests)

  /** A catalogue skill dropped on a cell: adds it there. */
  onPaletteDrop(skillId: string, cell: BoardCell): void {
    const tree = addNodeAt(this.draft().tree, skillId, cell);
    if (tree === this.draft().tree) return;
    this.setTree(tree);
    this.selection.set({ kind: 'node', skillId });
  }

  /** A node dropped on a cell: moves it, or swaps with the node there. */
  onNodeDrop(skillId: string, cell: BoardCell): void {
    this.setTree(moveNode(this.draft().tree, skillId, cell));
  }

  /** A connector dropped on a node: the first skill becomes a prerequisite of the second. */
  onLinkDrop(fromSkillId: string, toSkillId: string): void {
    const tree = linkPrerequisite(this.draft().tree, fromSkillId, toSkillId);
    if (tree === this.draft().tree) return;
    this.setTree(tree);
    this.selection.set({ kind: 'link', from: fromSkillId, to: toSkillId });
  }

  protected endPaletteDrag(event: CdkDragEnd, skillId: string): void {
    const cell = this.board().locate(event.dropPoint);
    this.board().setHover(null);
    event.source.reset();
    if (cell) this.onPaletteDrop(skillId, cell);
  }

  protected addRequirement(prerequisiteId: string, skillId: string): void {
    this.onLinkDrop(prerequisiteId, skillId);
    const level = this.newLevel();
    if (level > 1) this.setLevel(skillId, prerequisiteId, level);
    this.selection.set({ kind: 'node', skillId });
    this.newLevel.set(1);
  }

  /** Adds a palette skill at the first free cell (button, keyboard and touch alternative to dragging). */
  protected addFirstFree(skillId: string): void {
    const tree = this.draft().tree;
    const size = boardSize(tree);
    for (let row = 0; row < size.rows; row++) {
      for (let column = 0; column < size.columns; column++) {
        if (!tree.some((n) => n.column === column && n.row === row))
          return this.onPaletteDrop(skillId, { column, row });
      }
    }
  }

  protected remove(skillId: string): void {
    this.setTree(removeNode(this.draft().tree, skillId));
    this.selection.set(null);
  }

  protected unlink(prerequisiteId: string, skillId: string): void {
    this.setTree(
      unlinkPrerequisite(this.draft().tree, prerequisiteId, skillId),
    );
    if (this.selection()?.kind === 'link') this.selection.set(null);
  }

  protected patchNode(skillId: string, change: Partial<TreeNode>): void {
    this.setTree(
      this.draft().tree.map((node) =>
        node.skillId === skillId ? { ...node, ...change } : node,
      ),
    );
  }

  protected setLevel(
    skillId: string,
    prerequisiteId: string,
    level: number,
  ): void {
    this.setTree(
      this.draft().tree.map((node) =>
        node.skillId === skillId
          ? {
              ...node,
              requires: node.requires.map((r) =>
                r.skillId === prerequisiteId ? { ...r, level } : r,
              ),
            }
          : node,
      ),
    );
  }

  protected editJson(text: string): void {
    this.jsonText.set(text);
    const result = this.editor.parse(text, this.draft(), this.world());
    this.jsonIssues.set(result.issues);
    if (result.characterClass) this.draft.set(result.characterClass);
  }

  protected async copyAiPrompt(): Promise<void> {
    try {
      await navigator.clipboard.writeText(
        this.editor.prompt(
          this.world().attributes.map((attribute) => attribute.name),
          this.language.$language() as 'en' | 'fr',
        ),
      );
      this.messages.add({
        severity: MessageLevel.Success,
        summary: this.language.t('ai.promptCopied'),
        life: 2500,
      });
    } catch {
      this.messages.add({
        severity: MessageLevel.Error,
        summary: this.language.t('ai.copyFailed'),
        life: 2500,
      });
    }
  }

  protected async random(): Promise<void> {
    this.setDraft(await this.editor.random(this.world()));
  }

  protected submit(): void {
    if (this.issues().length || this.jsonIssues().length) return;
    this.save.emit({
      ...this.draft(),
      id: this.characterClass()?.id,
    } as CharacterClass);
  }

  private skillOf(skillId: string): Skill | undefined {
    return this.world().skills.find((skill) => skill.id === skillId);
  }

  private setTree(tree: TreeNode[]): void {
    this.patch({ tree });
  }

  private setDraft(characterClass: ClassDraft): void {
    this.draft.set(characterClass);
    this.jsonText.set(this.editor.toJson(characterClass));
    this.jsonIssues.set([]);
  }
}
