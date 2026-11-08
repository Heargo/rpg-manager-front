import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TabsModule } from '@openng/optimus-ui/tabs';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { World } from '../../../world/models/world';
import { ClassEditorBusiness } from '../../business/class-editor.business';
import { ClassIssue } from '../../helpers/class.rules';
import { CharacterClass, ClassDraft, TreeNode } from '../../models/class';
import { SkillTreeComponent } from '../skill-tree/skill-tree.component';

/** Creates or edits a class on a world: a form with the grid tree editor and its JSON (kept in sync). */
@Component({
  selector: 'app-class-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslocoPipe,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TabsModule,
    TextareaModule,
    SkillTreeComponent,
  ],
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

            <fieldset class="tree">
              <legend>{{ 'class.editor.fields.tree' | transloco }}</legend>
              <p class="hint">{{ 'class.editor.treeHint' | transloco }}</p>
              <div class="available">
                @for (skill of available(); track skill.id) {
                  <button
                    pButton
                    type="button"
                    data-action="add-node"
                    icon="pi pi-plus"
                    severity="secondary"
                    size="small"
                    [attr.data-skill-id]="skill.id"
                    [label]="skill.name"
                    (click)="addNode(skill.id)"
                  ></button>
                } @empty {
                  <span class="hint">{{
                    'class.editor.noMoreSkills' | transloco
                  }}</span>
                }
              </div>
              <app-skill-tree [tree]="draft().tree" [skills]="world().skills" />
              @for (
                node of draft().tree;
                track node.skillId;
                let index = $index
              ) {
                <div class="node" [attr.data-node]="node.skillId">
                  <div class="head">
                    <strong>{{ nameOf(node.skillId) }}</strong>
                    <button
                      pButton
                      type="button"
                      data-action="remove-node"
                      icon="pi pi-trash"
                      severity="danger"
                      [text]="true"
                      [attr.aria-label]="'class.editor.removeNode' | transloco"
                      (click)="removeNode(index)"
                    ></button>
                  </div>
                  <div class="row">
                    <div class="field">
                      <label>{{
                        'class.editor.fields.column' | transloco
                      }}</label>
                      <p-inputnumber
                        data-field="node-column"
                        [min]="0"
                        [showButtons]="true"
                        [ngModel]="node.column"
                        (ngModelChange)="
                          patchNode(index, { column: $event ?? 0 })
                        "
                      />
                    </div>
                    <div class="field">
                      <label>{{ 'class.editor.fields.row' | transloco }}</label>
                      <p-inputnumber
                        data-field="node-row"
                        [min]="0"
                        [showButtons]="true"
                        [ngModel]="node.row"
                        (ngModelChange)="patchNode(index, { row: $event ?? 0 })"
                      />
                    </div>
                    <div class="field">
                      <label>{{
                        'class.editor.fields.minLevel' | transloco
                      }}</label>
                      <p-inputnumber
                        data-field="node-min-level"
                        [min]="1"
                        [showButtons]="true"
                        [ngModel]="node.minLevel"
                        (ngModelChange)="
                          patchNode(index, { minLevel: $event ?? 0 })
                        "
                      />
                    </div>
                  </div>
                  @for (
                    requirement of node.requires;
                    track $index;
                    let at = $index
                  ) {
                    <div class="row">
                      <div class="field">
                        <label>{{
                          'class.editor.fields.requires' | transloco
                        }}</label>
                        <p-select
                          data-field="requirement-skill"
                          [options]="requirementOptions(node.skillId)"
                          optionLabel="label"
                          optionValue="value"
                          [ngModel]="requirement.skillId"
                          (ngModelChange)="
                            patchRequirement(index, at, { skillId: $event })
                          "
                        />
                      </div>
                      <div class="field">
                        <label>{{
                          'class.editor.fields.rank' | transloco
                        }}</label>
                        <p-inputnumber
                          data-field="requirement-rank"
                          [min]="1"
                          [showButtons]="true"
                          [ngModel]="requirement.rank"
                          (ngModelChange)="
                            patchRequirement(index, at, { rank: $event ?? 0 })
                          "
                        />
                      </div>
                      <button
                        pButton
                        type="button"
                        data-action="remove-requirement"
                        icon="pi pi-times"
                        severity="danger"
                        [text]="true"
                        [attr.aria-label]="
                          'class.editor.removeRequirement' | transloco
                        "
                        (click)="removeRequirement(index, at)"
                      ></button>
                    </div>
                  }
                  <div>
                    <button
                      pButton
                      type="button"
                      data-action="add-requirement"
                      icon="pi pi-link"
                      severity="secondary"
                      size="small"
                      [label]="'class.editor.addRequirement' | transloco"
                      (click)="addRequirement(index)"
                    ></button>
                  </div>
                </div>
              }
            </fieldset>
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
        data-action="save"
        icon="pi pi-save"
        [label]="'class.editor.save' | transloco"
        (click)="submit()"
      ></button>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .form,
    .tree {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .row,
    .available,
    .head {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: flex-end;
    }
    .head {
      justify-content: space-between;
    }
    .node {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.75rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: 0.5rem;
    }
    fieldset {
      border: 1px solid var(--p-content-border-color);
      border-radius: 0.5rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }
    .json {
      font-family: monospace;
    }
    .hint {
      margin: 0;
      color: var(--p-text-muted-color);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
    }
  `,
})
export class ClassEditorComponent {
  private readonly editor = inject(ClassEditorBusiness);

  /** The world whose skills and attributes the class uses. */
  readonly world = input.required<World>();
  /** The class to edit; none to create one. */
  readonly characterClass = input<CharacterClass>();

  /** The class to save; for a new class it has no id yet. */
  readonly save = output<CharacterClass>();

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

  protected readonly issues = computed(() =>
    this.editor.validate(this.draft(), this.world()),
  );
  protected readonly allIssues = computed(() => [
    ...this.issues(),
    ...this.jsonIssues(),
  ]);
  protected readonly available = computed(() => {
    const used = new Set(this.draft().tree.map((node) => node.skillId));
    return this.world().skills.filter((skill) => !used.has(skill.id));
  });

  protected nameOf(skillId: string): string {
    return (
      this.world().skills.find((skill) => skill.id === skillId)?.name ?? skillId
    );
  }

  protected requirementOptions(
    skillId: string,
  ): { value: string; label: string }[] {
    return this.draft()
      .tree.filter((node) => node.skillId !== skillId)
      .map((node) => ({
        value: node.skillId,
        label: this.nameOf(node.skillId),
      }));
  }

  protected patch(change: Partial<ClassDraft>): void {
    this.setDraft({ ...this.draft(), ...change });
  }

  protected addNode(skillId: string): void {
    const tree = this.draft().tree;
    const column = tree.reduce(
      (max, node) => Math.max(max, node.column + 1),
      0,
    );
    this.patch({
      tree: [...tree, { skillId, requires: [], minLevel: 1, column, row: 0 }],
    });
  }

  /** Removes the node and the prerequisites on it. */
  protected removeNode(index: number): void {
    const removed = this.draft().tree[index].skillId;
    this.patch({
      tree: this.draft()
        .tree.filter((_, i) => i !== index)
        .map((node) => ({
          ...node,
          requires: node.requires.filter((r) => r.skillId !== removed),
        })),
    });
  }

  protected patchNode(index: number, change: Partial<TreeNode>): void {
    this.patch({
      tree: this.draft().tree.map((node, i) =>
        i === index ? { ...node, ...change } : node,
      ),
    });
  }

  protected addRequirement(index: number): void {
    const node = this.draft().tree[index];
    const other = this.draft().tree.find(
      (entry) => entry.skillId !== node.skillId,
    );
    this.patchNode(index, {
      requires: [...node.requires, { skillId: other?.skillId ?? '', rank: 1 }],
    });
  }

  protected removeRequirement(index: number, at: number): void {
    this.patchNode(index, {
      requires: this.draft().tree[index].requires.filter((_, i) => i !== at),
    });
  }

  protected patchRequirement(
    index: number,
    at: number,
    change: Partial<TreeNode['requires'][number]>,
  ): void {
    this.patchNode(index, {
      requires: this.draft().tree[index].requires.map((r, i) =>
        i === at ? { ...r, ...change } : r,
      ),
    });
  }

  protected editJson(text: string): void {
    this.jsonText.set(text);
    const result = this.editor.parse(text, this.draft(), this.world());
    this.jsonIssues.set(result.issues);
    if (result.characterClass) this.draft.set(result.characterClass);
  }

  protected submit(): void {
    if (this.issues().length || this.jsonIssues().length) return;
    this.save.emit({
      ...this.draft(),
      id: this.characterClass()?.id,
    } as CharacterClass);
  }

  private setDraft(characterClass: ClassDraft): void {
    this.draft.set(characterClass);
    this.jsonText.set(this.editor.toJson(characterClass));
    this.jsonIssues.set([]);
  }
}
