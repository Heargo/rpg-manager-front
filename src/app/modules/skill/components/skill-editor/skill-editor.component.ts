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
import { ITEM_RARITIES } from '../../../../core/models/item';
import { MessageLevel } from '../../../../core/models/toast-level';
import { World } from '../../../world/models/world';
import { SkillEditorBusiness } from '../../business/skill-editor.business';
import { formulaVariables } from '../../helpers/skill-formula-variables';
import { SkillIssue } from '../../helpers/skill.rules';
import {
  Skill,
  DEFAULT_SKILL_ROLL,
  SKILL_MAX_LEVEL,
  SKILL_ROLL_COUNT_MAX,
  SKILL_ROLL_FACES_MAX,
  SKILL_SUCCESS_MODES,
  SkillSuccess,
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
            <div>
              <button
                pButton
                type="button"
                data-action="toggle-variables"
                icon="pi pi-question-circle"
                severity="secondary"
                size="small"
                [text]="true"
                [attr.aria-expanded]="helpOpen()"
                [label]="'skill.variables.toggle' | transloco"
                (click)="helpOpen.set(!helpOpen())"
              ></button>
            </div>
            @if (helpOpen()) {
              <div class="help" data-field="variables-help">
                <h4>{{ 'skill.variables.title' | transloco }}</h4>
                <p>
                  <strong>{{ 'skill.variables.successTitle' | transloco }}</strong>
                  {{ 'skill.variables.successBody' | transloco }}
                  {{ 'skill.variables.exampleLabel' | transloco }}
                  <code data-example="success">{{ successExample() }}</code>
                </p>
                <p>
                  <strong>{{ 'skill.variables.amountTitle' | transloco }}</strong>
                  {{ 'skill.variables.amountBody' | transloco }}
                  {{ 'skill.variables.exampleLabel' | transloco }}
                  <code data-example="amount">{{ amountExample() }}</code>
                </p>
                <ul>
                  @for (variable of variables(); track variable.name) {
                    <li [attr.data-variable]="variable.name">
                      <code>{{ variable.name }}</code>
                      {{ variable.descriptionKey | transloco }}
                    </li>
                  }
                </ul>
              </div>
            }

            <section data-section="identity">
              <h3>{{ 'skill.editor.sections.identity' | transloco }}</h3>
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
                <small class="hint">{{ 'skill.editor.help.description' | transloco }}</small>
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
                  <small class="hint">{{ 'skill.editor.help.type' | transloco }}</small>
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
                  <small class="hint">{{ 'skill.editor.help.rarity' | transloco }}</small>
                </div>
              </div>
            </section>

            <section data-section="cost">
              <h3>{{ 'skill.editor.sections.cost' | transloco }}</h3>
              <div class="row">
                <div class="field">
                  <label for="skill-max-level">{{
                    'skill.editor.fields.maxLevel' | transloco
                  }}</label>
                  <p-inputnumber
                    inputId="skill-max-level"
                    data-field="max-level"
                    [min]="1"
                    [max]="maxLevelLimit"
                    [showButtons]="true"
                    [ngModel]="draft().maxLevel"
                    (ngModelChange)="patch({ maxLevel: $event ?? 0 })"
                  />
                  <small class="hint">{{ 'skill.editor.help.maxLevel' | transloco }}</small>
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
                  <small class="hint">{{ 'skill.editor.help.pointCost' | transloco }}</small>
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
                    <small class="hint">{{ 'skill.editor.help.target' | transloco }}</small>
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
                    <small class="hint">{{ 'skill.editor.help.cooldown' | transloco }}</small>
                  </div>
                </div>
                <div class="row">
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
                    <small class="hint">{{ 'skill.editor.help.costAttribute' | transloco }}</small>
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
                      <small class="hint">{{ 'skill.editor.help.costAmount' | transloco }}</small>
                    </div>
                  }
                </div>
              }
            </section>

            @if (draft().type === 'active') {
              <section data-section="roll">
                <h3>{{ 'skill.editor.sections.roll' | transloco }}</h3>
                <p class="hint">{{ 'skill.editor.help.roll' | transloco }}</p>
                <div class="row">
                  <div class="field">
                    <label for="skill-roll-count">{{
                      'skill.editor.fields.rollCount' | transloco
                    }}</label>
                    <p-inputnumber
                      inputId="skill-roll-count"
                      data-field="roll-count"
                      [min]="1"
                      [max]="rollCountLimit"
                      [showButtons]="true"
                      [ngModel]="roll().count"
                      (ngModelChange)="
                        patch({ roll: { count: $event ?? 0, faces: roll().faces } })
                      "
                    />
                  </div>
                  <div class="field">
                    <label for="skill-roll-faces">{{
                      'skill.editor.fields.rollFaces' | transloco
                    }}</label>
                    <p-inputnumber
                      inputId="skill-roll-faces"
                      data-field="roll-faces"
                      [min]="2"
                      [max]="rollFacesLimit"
                      [showButtons]="true"
                      [ngModel]="roll().faces"
                      (ngModelChange)="
                        patch({ roll: { count: roll().count, faces: $event ?? 0 } })
                      "
                    />
                  </div>
                </div>
                <div class="row">
                  <div class="field">
                    <label for="skill-success-mode">{{
                      'skill.editor.fields.successMode' | transloco
                    }}</label>
                    <p-select
                      inputId="skill-success-mode"
                      data-field="success-mode"
                      [options]="successOptions()"
                      optionLabel="label"
                      optionValue="value"
                      [ngModel]="success().mode"
                      (ngModelChange)="setSuccessMode($event)"
                    />
                    <small class="hint">{{ 'skill.editor.help.successMode' | transloco }}</small>
                  </div>
                  @if (thresholdSuccess(); as threshold) {
                    <div class="field">
                      <label for="skill-success-value">{{
                        'skill.editor.fields.successValue' | transloco
                      }}</label>
                      <p-inputnumber
                        inputId="skill-success-value"
                        data-field="success-value"
                        [showButtons]="true"
                        [ngModel]="threshold.value"
                        (ngModelChange)="
                          patch({
                            success: { mode: 'threshold', value: $event ?? 0 },
                          })
                        "
                      />
                      <small class="hint">{{ 'skill.editor.help.successValue' | transloco }}</small>
                    </div>
                  }
                  @if (formulaSuccess(); as formula) {
                    <div class="field grow">
                      <label for="skill-success-formula">{{
                        'skill.editor.fields.successFormula' | transloco
                      }}</label>
                      <div class="control">
                        <input
                          pInputText
                          id="skill-success-formula"
                          data-field="success-formula"
                          autocomplete="off"
                          spellcheck="false"
                          [value]="formula.formula"
                          (input)="
                            patch({
                              success: {
                                mode: 'formula',
                                formula: $any($event.target).value,
                              },
                            })
                          "
                        />
                      </div>
                      <small class="hint">{{ 'skill.editor.help.successFormula' | transloco }}</small>
                    </div>
                  }
                </div>
                @if (successFormulaError(); as message) {
                  <p-message severity="error" data-field="success-error">{{
                    message
                  }}</p-message>
                }
              </section>
            }

            <section data-section="effects">
              <h3>{{ 'skill.editor.sections.effects' | transloco }}</h3>
              <p class="hint">{{ 'skill.editor.help.effects' | transloco }}</p>
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
                  <div class="control">
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
                  </div>
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
                                max: draft().maxLevel,
                                level1: preview.level1,
                                maxLevel: preview.maxLevel,
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
            </section>
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

    @if (issues().length) {
      <p-message severity="warn">{{ issueText(issues()) }}</p-message>
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
    section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    h3 {
      margin: 0;
      color: var(--p-text-muted-color);
      font-weight: 600;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .grow {
      flex: 1 1 14rem;
    }
    .control {
      display: flex;
      gap: 0.5rem;
      flex: 1 1 12rem;
      min-width: 0;
    }
    .control > input {
      flex: 1;
      min-width: 0;
    }
    .help {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.75rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: 0.5rem;
    }
    .help h4,
    .help p {
      margin: 0;
    }
    .help ul {
      margin: 0;
      padding-left: 1.25rem;
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
      gap: 0.5rem;
    }
  `,
})
export class SkillEditorComponent {
  private readonly messages = inject(MessageService);
  private readonly editor = inject(SkillEditorBusiness);
  private readonly language = inject(LanguageBusiness);

  /** The world whose attributes the amounts read. */
  readonly world = input.required<World>();
  /** The skill to edit; none to create one. */
  readonly skill = input<Skill>();

  /** The skill to save; for a new skill it has no id yet. */
  readonly save = output<Skill>();

  protected readonly maxLevelLimit = SKILL_MAX_LEVEL;
  protected readonly rollCountLimit = SKILL_ROLL_COUNT_MAX;
  protected readonly rollFacesLimit = SKILL_ROLL_FACES_MAX;

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
        this.draft().maxLevel,
      );
      return result.ok
        ? { level1: result.level1, maxLevel: result.maxLevel, error: undefined }
        : {
            level1: 0,
            maxLevel: 0,
            error: this.language.t(result.error.key, {
              position: result.error.position,
            }),
          };
    }),
  );

  protected readonly helpOpen = signal(false);
  protected readonly variables = computed(() => formulaVariables(this.world()));
  protected readonly successExample = computed(() => {
    const first = this.world().attributes[0]?.name;
    return first ? `roll + ${first} - target_${first}` : 'roll - 10';
  });
  protected readonly amountExample = computed(() => {
    const first = this.world().attributes[0]?.name;
    return first ? `skillLevel * 3 + ${first}` : 'skillLevel * 3';
  });

  protected readonly roll = computed(
    () => this.draft().roll ?? DEFAULT_SKILL_ROLL,
  );
  protected readonly success = computed<SkillSuccess>(
    () => this.draft().success ?? { mode: 'always' },
  );
  protected readonly thresholdSuccess = computed(() => {
    const success = this.success();
    return success.mode === 'threshold' ? success : null;
  });
  protected readonly formulaSuccess = computed(() => {
    const success = this.success();
    return success.mode === 'formula' ? success : null;
  });
  protected readonly successOptions = computed(() =>
    SKILL_SUCCESS_MODES.map((value) => ({
      value,
      label: this.language.t('skill.editor.successMode.' + value),
    })),
  );
  /** The live check of the success formula (null while valid or not a formula). */
  protected readonly successFormulaError = computed(() => {
    const issue = this.issues().find(
      (entry) => entry.field === 'success.formula',
    );
    return issue ? this.language.t('skill.editor.issue.success_formula') : null;
  });

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
    const { target, cost, cooldown, roll, success, ...rest } = this.draft();
    void roll;
    void success;
    void target;
    void cost;
    void cooldown;
    this.setDraft(
      type === 'active'
        ? { ...rest, type, target: 'one-enemy', cooldown: 0 }
        : { ...rest, type },
    );
  }

  protected setSuccessMode(mode: SkillSuccess['mode']): void {
    this.patch({
      success:
        mode === 'threshold'
          ? { mode, value: 10 }
          : mode === 'formula'
            ? { mode, formula: 'roll - 10' }
            : { mode },
    });
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
        ? { kind: 'modify', attribute, amount: 'skillLevel', duration: 0 }
        : { kind: 'damage', attribute, amount: 'skillLevel' };
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
