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
import { LanguageBusiness } from '../../../../core/business/language.business';
import { ITEM_RARITIES } from '../../../../core/models/item';
import { World } from '../../../world/models/world';
import { SkillEditorBusiness } from '../../business/skill-editor.business';
import { SkillIssue } from '../../helpers/skill.rules';
import {
  Skill,
  SKILL_MAX_RANK,
  SKILL_TARGETS,
  SKILL_TYPES,
  SkillDraft,
  SkillEffect,
} from '../../models/skill';

/** Creates or edits a skill on a world: a form and its JSON (kept in sync), with a live preview of every amount. */
@Component({
  selector: 'app-skill-editor',
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
  ],
  template: `
    <p-tabs value="form">
      <p-tablist>
        <p-tab value="form">{{ 'skill.editor.tabForm' | transloco }}</p-tab>
        <p-tab value="json">{{ 'skill.editor.tabJson' | transloco }}</p-tab>
      </p-tablist>
      <p-tabpanels>
        <p-tabpanel value="form">
          <div class="form">
            <div class="field">
              <label for="skill-name">{{
                'skill.editor.fields.name' | transloco
              }}</label>
              <input
                pInputText
                id="skill-name"
                data-field="name"
                autocomplete="off"
                [value]="draft().name"
                (input)="patch({ name: $any($event.target).value })"
              />
            </div>
            <div class="field">
              <label for="skill-description">{{
                'skill.editor.fields.description' | transloco
              }}</label>
              <textarea
                pTextarea
                id="skill-description"
                data-field="description"
                rows="3"
                [value]="draft().description"
                (input)="patch({ description: $any($event.target).value })"
              ></textarea>
            </div>
            <div class="row">
              <div class="field">
                <label for="skill-type">{{
                  'skill.editor.fields.type' | transloco
                }}</label>
                <p-select
                  inputId="skill-type"
                  data-field="type"
                  [options]="typeOptions()"
                  optionLabel="label"
                  optionValue="value"
                  [ngModel]="draft().type"
                  (ngModelChange)="setType($event)"
                />
              </div>
              <div class="field">
                <label for="skill-rarity">{{
                  'skill.editor.fields.rarity' | transloco
                }}</label>
                <p-select
                  inputId="skill-rarity"
                  data-field="rarity"
                  [options]="rarityOptions()"
                  optionLabel="label"
                  optionValue="value"
                  [ngModel]="draft().rarity"
                  (ngModelChange)="patch({ rarity: $event })"
                />
              </div>
              <div class="field">
                <label for="skill-max-rank">{{
                  'skill.editor.fields.maxRank' | transloco
                }}</label>
                <p-inputnumber
                  inputId="skill-max-rank"
                  data-field="max-rank"
                  [min]="1"
                  [max]="maxRankLimit"
                  [showButtons]="true"
                  [ngModel]="draft().maxRank"
                  (ngModelChange)="patch({ maxRank: $event ?? 0 })"
                />
              </div>
              <div class="field">
                <label for="skill-point-cost">{{
                  'skill.editor.fields.pointCost' | transloco
                }}</label>
                <p-inputnumber
                  inputId="skill-point-cost"
                  data-field="point-cost"
                  [min]="1"
                  [showButtons]="true"
                  [ngModel]="draft().pointCost"
                  (ngModelChange)="patch({ pointCost: $event ?? 0 })"
                />
              </div>
            </div>

            @if (draft().type === 'active') {
              <div class="row">
                <div class="field">
                  <label for="skill-target">{{
                    'skill.editor.fields.target' | transloco
                  }}</label>
                  <p-select
                    inputId="skill-target"
                    data-field="target"
                    [options]="targetOptions()"
                    optionLabel="label"
                    optionValue="value"
                    [ngModel]="draft().target"
                    (ngModelChange)="patch({ target: $event })"
                  />
                </div>
                <div class="field">
                  <label for="skill-cooldown">{{
                    'skill.editor.fields.cooldown' | transloco
                  }}</label>
                  <p-inputnumber
                    inputId="skill-cooldown"
                    data-field="cooldown"
                    [min]="0"
                    [showButtons]="true"
                    [ngModel]="draft().cooldown ?? 0"
                    (ngModelChange)="patch({ cooldown: $event ?? 0 })"
                  />
                </div>
                <div class="field">
                  <label for="skill-cost-attribute">{{
                    'skill.editor.fields.costAttribute' | transloco
                  }}</label>
                  <p-select
                    inputId="skill-cost-attribute"
                    data-field="cost-attribute"
                    [options]="attributeOptions()"
                    optionLabel="label"
                    optionValue="value"
                    [showClear]="true"
                    [ngModel]="draft().cost?.attribute ?? null"
                    (ngModelChange)="setCostAttribute($event)"
                  />
                </div>
                @if (draft().cost; as cost) {
                  <div class="field">
                    <label for="skill-cost-amount">{{
                      'skill.editor.fields.costAmount' | transloco
                    }}</label>
                    <p-inputnumber
                      inputId="skill-cost-amount"
                      data-field="cost-amount"
                      [min]="0"
                      [showButtons]="true"
                      [ngModel]="cost.amount"
                      (ngModelChange)="
                        patch({
                          cost: {
                            attribute: cost.attribute,
                            amount: $event ?? 0,
                          },
                        })
                      "
                    />
                  </div>
                }
              </div>
            }

            <fieldset class="effects">
              <legend>{{ 'skill.editor.fields.effects' | transloco }}</legend>
              <p class="hint">{{ 'skill.editor.formulaHint' | transloco }}</p>
              @for (effect of draft().effects; track $index) {
                <div class="effect" data-field="effect">
                  <p-select
                    data-field="effect-kind"
                    [options]="kindOptions()"
                    optionLabel="label"
                    optionValue="value"
                    [ngModel]="effect.kind"
                    (ngModelChange)="setEffectKind($index, $event)"
                  />
                  <p-select
                    data-field="effect-attribute"
                    [options]="attributeOptions()"
                    optionLabel="label"
                    optionValue="value"
                    [ngModel]="effect.attribute"
                    (ngModelChange)="patchEffect($index, { attribute: $event })"
                  />
                  <input
                    pInputText
                    data-field="effect-amount"
                    autocomplete="off"
                    spellcheck="false"
                    [attr.aria-label]="'skill.editor.fields.amount' | transloco"
                    [value]="effect.amount"
                    (input)="
                      patchEffect($index, { amount: $any($event.target).value })
                    "
                  />
                  @if (effect.kind === 'modify') {
                    <p-inputnumber
                      data-field="effect-duration"
                      [min]="0"
                      [showButtons]="true"
                      [ariaLabel]="'skill.editor.fields.duration' | transloco"
                      [ngModel]="effect.duration"
                      (ngModelChange)="
                        patchEffect($index, { duration: $event ?? 0 })
                      "
                    />
                  }
                  <button
                    pButton
                    type="button"
                    data-action="remove-effect"
                    icon="pi pi-trash"
                    severity="danger"
                    [text]="true"
                    [attr.aria-label]="'skill.editor.removeEffect' | transloco"
                    (click)="removeEffect($index)"
                  ></button>
                  @if (previews()[$index]; as preview) {
                    @if (preview.error) {
                      <p-message severity="error" data-field="effect-error">{{
                        preview.error
                      }}</p-message>
                    } @else {
                      <span class="hint" data-field="effect-preview">{{
                        'skill.editor.preview'
                          | transloco
                            : {
                                max: draft().maxRank,
                                rank1: preview.rank1,
                                maxRank: preview.maxRank,
                              }
                      }}</span>
                    }
                  }
                </div>
              }
              <div>
                <button
                  pButton
                  type="button"
                  data-action="add-effect"
                  icon="pi pi-plus"
                  severity="secondary"
                  [label]="'skill.editor.addEffect' | transloco"
                  (click)="addEffect()"
                ></button>
              </div>
            </fieldset>
          </div>
        </p-tabpanel>

        <p-tabpanel value="json">
          <div class="form">
            <p class="hint">{{ 'skill.editor.jsonHint' | transloco }}</p>
            <textarea
              pTextarea
              data-field="json"
              class="json"
              rows="14"
              spellcheck="false"
              [value]="jsonText()"
              (input)="editJson($any($event.target).value)"
            ></textarea>
            @if (jsonIssues().length) {
              <p-message severity="error" data-field="json-error">{{
                issueText(jsonIssues())
              }}</p-message>
            }
          </div>
        </p-tabpanel>
      </p-tabpanels>
    </p-tabs>

    @if (issues().length) {
      <p-message severity="warn">{{ issueText(issues()) }}</p-message>
    }
    <div class="actions">
      <button
        pButton
        type="button"
        data-action="save"
        icon="pi pi-save"
        [label]="'skill.editor.save' | transloco"
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
    .form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .row,
    .effect {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: flex-end;
    }
    .effects {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
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
export class SkillEditorComponent {
  private readonly editor = inject(SkillEditorBusiness);
  private readonly language = inject(LanguageBusiness);

  /** The world whose attributes the amounts read. */
  readonly world = input.required<World>();
  /** The skill to edit; none to create one. */
  readonly skill = input<Skill>();

  /** The skill to save; for a new skill it has no id yet. */
  readonly save = output<Skill>();

  protected readonly maxRankLimit = SKILL_MAX_RANK;

  private readonly initial = computed<SkillDraft>(
    () => this.skill() ?? this.editor.empty(),
  );
  protected readonly draft = linkedSignal(() => this.initial());
  protected readonly jsonText = linkedSignal(() =>
    this.editor.toJson(this.initial()),
  );
  protected readonly jsonIssues = linkedSignal<SkillIssue[]>(() => {
    this.skill();
    return [];
  });

  protected readonly issues = computed(() =>
    this.editor.validate(this.draft(), this.world()),
  );
  protected readonly previews = computed(() =>
    this.draft().effects.map((effect) => {
      const result = this.editor.preview(
        effect.amount,
        this.world(),
        this.draft().maxRank,
      );
      return result.ok
        ? { rank1: result.rank1, maxRank: result.maxRank, error: undefined }
        : {
            rank1: 0,
            maxRank: 0,
            error: this.language.t(result.error.key, {
              position: result.error.position,
            }),
          };
    }),
  );

  protected readonly typeOptions = computed(() =>
    SKILL_TYPES.map((value) => ({
      value,
      label: this.language.t('skill.type.' + value),
    })),
  );
  protected readonly rarityOptions = computed(() =>
    ITEM_RARITIES.map((value) => ({
      value,
      label: this.language.t('item.rarity.' + value),
    })),
  );
  protected readonly targetOptions = computed(() =>
    SKILL_TARGETS.map((value) => ({
      value,
      label: this.language.t('skill.target.' + value),
    })),
  );
  protected readonly kindOptions = computed(() =>
    (['damage', 'heal', 'modify'] as const).map((value) => ({
      value,
      label: this.language.t('skill.effectKind.' + value),
    })),
  );
  protected readonly attributeOptions = computed(() =>
    this.world().attributes.map((attribute) => ({
      value: attribute.name,
      label: attribute.name,
    })),
  );

  protected patch(change: Partial<SkillDraft>): void {
    this.setDraft({ ...this.draft(), ...change });
  }

  /** A passive skill has no target, cost nor cooldown; an active one starts with a target. */
  protected setType(type: Skill['type']): void {
    const { target, cost, cooldown, ...rest } = this.draft();
    void target;
    void cost;
    void cooldown;
    this.setDraft(
      type === 'active'
        ? { ...rest, type, target: 'one-enemy', cooldown: 0 }
        : { ...rest, type },
    );
  }

  protected setCostAttribute(attribute: string | null): void {
    const { cost, ...rest } = this.draft();
    this.setDraft(
      attribute
        ? { ...rest, cost: { attribute, amount: cost?.amount ?? 0 } }
        : rest,
    );
  }

  protected addEffect(): void {
    const attribute = this.world().attributes[0]?.name ?? '';
    const effect: SkillEffect =
      this.draft().type === 'passive'
        ? { kind: 'modify', attribute, amount: 'rank', duration: 0 }
        : { kind: 'damage', attribute, amount: 'rank' };
    this.patch({ effects: [...this.draft().effects, effect] });
  }

  protected removeEffect(index: number): void {
    this.patch({ effects: this.draft().effects.filter((_, i) => i !== index) });
  }

  protected patchEffect(
    index: number,
    change: Partial<{ attribute: string; amount: string; duration: number }>,
  ): void {
    this.patch({
      effects: this.draft().effects.map((effect, i) =>
        i === index ? ({ ...effect, ...change } as SkillEffect) : effect,
      ),
    });
  }

  protected setEffectKind(index: number, kind: SkillEffect['kind']): void {
    this.patch({
      effects: this.draft().effects.map((effect, i) => {
        if (i !== index) return effect;
        const { attribute, amount } = effect;
        return kind === 'modify'
          ? {
              kind,
              attribute,
              amount,
              duration: 'duration' in effect ? effect.duration : 0,
            }
          : { kind, attribute, amount };
      }),
    });
  }

  protected editJson(text: string): void {
    this.jsonText.set(text);
    const result = this.editor.parse(text, this.draft(), this.world());
    this.jsonIssues.set(result.issues);
    if (result.skill) this.draft.set(result.skill);
  }

  protected submit(): void {
    if (this.issues().length || this.jsonIssues().length) return;
    this.save.emit({ ...this.draft(), id: this.skill()?.id } as Skill);
  }

  protected issueText(issues: SkillIssue[]): string {
    return [
      ...new Set(issues.map((issue) => issue.field.replace(/\.\d+/g, ''))),
    ]
      .map((field) =>
        this.language.t('skill.editor.issue.' + field.replace('.', '_')),
      )
      .join(' ');
  }

  private setDraft(skill: SkillDraft): void {
    this.draft.set(skill);
    this.jsonText.set(this.editor.toJson(skill));
    this.jsonIssues.set([]);
  }
}
