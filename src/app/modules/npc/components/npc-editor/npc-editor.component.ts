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
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { MultiSelectModule } from '@openng/optimus-ui/multiselect';
import { SelectModule } from '@openng/optimus-ui/select';
import { TabsModule } from '@openng/optimus-ui/tabs';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { CoinInputComponent } from '../../../../core/components/coin-input/coin-input.component';
import { World } from '../../../world/models/world';
import { NpcEditorBusiness } from '../../business/npc-editor.business';
import { NpcEditorIssue } from '../../helpers/npc-editor.rules';
import { Npc, NPC_ROLES, NpcRole } from '../../models/npc';

/** Creates or edits an NPC on a world: a form, its JSON (kept in sync) and a random Generate. */
@Component({
  selector: 'app-npc-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslocoPipe,
    ButtonModule,
    InputTextModule,
    MessageModule,
    MultiSelectModule,
    SelectModule,
    TabsModule,
    TextareaModule,
    CoinInputComponent,
  ],
  template: `
    <p-tabs value="form">
      <p-tablist>
        <p-tab value="form">{{ 'npc.editor.tabForm' | transloco }}</p-tab>
        <p-tab value="json">{{ 'npc.editor.tabJson' | transloco }}</p-tab>
        <p-tab value="generate">{{
          'npc.editor.tabGenerate' | transloco
        }}</p-tab>
      </p-tablist>
      <p-tabpanels>
        <p-tabpanel value="form">
          <div class="form">
            <div class="field">
              <label for="npc-name">{{
                'npc.editor.fields.name' | transloco
              }}</label>
              <input
                pInputText
                id="npc-name"
                data-field="name"
                autocomplete="off"
                [value]="draft().name"
                (input)="patch({ name: $any($event.target).value })"
              />
            </div>
            <div class="field">
              <label for="npc-description">{{
                'npc.editor.fields.description' | transloco
              }}</label>
              <textarea
                pTextarea
                id="npc-description"
                data-field="description"
                rows="3"
                [value]="draft().description"
                (input)="patch({ description: $any($event.target).value })"
              ></textarea>
            </div>
            <div class="row">
              <div class="field">
                <label for="npc-roles">{{
                  'npc.editor.fields.roles' | transloco
                }}</label>
                <p-multiselect
                  inputId="npc-roles"
                  data-field="roles"
                  [options]="roleOptions()"
                  optionLabel="label"
                  optionValue="value"
                  [ngModel]="draft().roles"
                  (ngModelChange)="setRoles($event ?? [])"
                  [showToggleAll]="false"
                  display="chip"
                />
              </div>
              <div class="field">
                <label for="npc-level">{{
                  'npc.editor.fields.level' | transloco
                }}</label>
                <input
                  pInputText
                  id="npc-level"
                  data-field="level"
                  type="number"
                  min="1"
                  [max]="world().maxLevel"
                  [value]="draft().level"
                  (input)="setLevel($any($event.target).value)"
                />
              </div>
              <div class="field">
                <label for="npc-money">{{
                  'npc.editor.fields.money' | transloco
                }}</label>
                <app-coin-input
                  id="npc-money"
                  data-field="money"
                  [value]="draft().money"
                  (valueChange)="patch({ money: $event })"
                />
              </div>
            </div>

            <fieldset class="row">
              <legend>{{ 'npc.editor.fields.attributes' | transloco }}</legend>
              @for (attribute of world().attributes; track attribute.id) {
                <div class="field">
                  <label [for]="'npc-attr-' + attribute.id">{{
                    attribute.name
                  }}</label>
                  <input
                    pInputText
                    type="number"
                    min="0"
                    [id]="'npc-attr-' + attribute.id"
                    [attr.data-field]="'attribute-level-' + attribute.id"
                    [value]="attributeLevel(attribute.id)"
                    (input)="
                      setAttributeLevel(attribute.id, $any($event.target).value)
                    "
                  />
                </div>
              }
            </fieldset>

            @if (isEnemy()) {
              <div class="field">
                <label for="npc-xp-reward">{{
                  'npc.editor.fields.xpReward' | transloco
                }}</label>
                <input
                  pInputText
                  id="npc-xp-reward"
                  data-field="xp-reward"
                  type="number"
                  min="0"
                  [value]="draft().xpReward"
                  (input)="
                    patch({ xpReward: numberOr($any($event.target).value, 0) })
                  "
                />
              </div>
            }
            @if (isMerchant()) {
              <div class="row">
                <div class="field">
                  <label for="npc-buy-ratio">{{
                    'npc.editor.fields.buyRatio' | transloco
                  }}</label>
                  <input
                    pInputText
                    id="npc-buy-ratio"
                    data-field="buy-ratio"
                    type="number"
                    min="0"
                    step="0.1"
                    [value]="draft().merchant?.buyRatio ?? ''"
                    (input)="setRatio('buyRatio', $any($event.target).value)"
                  />
                </div>
                <div class="field">
                  <label for="npc-sell-ratio">{{
                    'npc.editor.fields.sellRatio' | transloco
                  }}</label>
                  <input
                    pInputText
                    id="npc-sell-ratio"
                    data-field="sell-ratio"
                    type="number"
                    min="0"
                    step="0.1"
                    [value]="draft().merchant?.sellRatio ?? ''"
                    (input)="setRatio('sellRatio', $any($event.target).value)"
                  />
                </div>
              </div>
            }

            <fieldset class="inventory">
              <legend>{{ 'npc.editor.fields.inventory' | transloco }}</legend>
              <p-select
                data-field="add-item"
                [options]="world().items"
                optionLabel="name"
                optionValue="id"
                [ngModel]="null"
                (ngModelChange)="addItem($event)"
                [placeholder]="'npc.editor.fields.addItem' | transloco"
                [filter]="true"
              />
              @for (entry of draft().inventory; track entry.id) {
                <div class="entry" data-field="inventory-entry">
                  <span class="name">{{ entry.item.name }}</span>
                  <button
                    pButton
                    type="button"
                    data-action="toggle-equipped"
                    icon="pi pi-check-circle"
                    size="small"
                    [severity]="entry.equipped ? 'primary' : 'secondary'"
                    [outlined]="!entry.equipped"
                    [label]="'npc.editor.equipped' | transloco"
                    [attr.aria-pressed]="entry.equipped"
                    (click)="toggleEquipped(entry.id)"
                  ></button>
                  @if (isEnemy()) {
                    <button
                      pButton
                      type="button"
                      data-action="toggle-loot"
                      icon="pi pi-gift"
                      size="small"
                      [severity]="isLoot(entry.id) ? 'primary' : 'secondary'"
                      [outlined]="!isLoot(entry.id)"
                      [label]="'npc.editor.loot' | transloco"
                      [attr.aria-pressed]="isLoot(entry.id)"
                      (click)="toggleLoot(entry.id)"
                    ></button>
                  }
                  <button
                    pButton
                    type="button"
                    data-action="remove-item"
                    icon="pi pi-trash"
                    size="small"
                    severity="danger"
                    [text]="true"
                    [attr.aria-label]="'npc.editor.removeItem' | transloco"
                    (click)="removeEntry(entry.id)"
                  ></button>
                </div>
              }
            </fieldset>
          </div>
        </p-tabpanel>

        <p-tabpanel value="json">
          <div class="form">
            <p class="hint">{{ 'npc.editor.jsonHint' | transloco }}</p>
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

        <p-tabpanel value="generate">
          <div class="form">
            <p class="hint">{{ 'npc.editor.generateHint' | transloco }}</p>
            <div class="seed">
              <div class="field">
                <label for="npc-seed">{{
                  'tools.itemGenerator.seed' | transloco
                }}</label>
                <input
                  pInputText
                  id="npc-seed"
                  data-field="seed"
                  autocomplete="off"
                  spellcheck="false"
                  [value]="seed()"
                  (input)="seed.set($any($event.target).value)"
                />
              </div>
              <button
                pButton
                type="button"
                data-action="generate"
                icon="pi pi-sparkles"
                [label]="'npc.editor.generate' | transloco"
                (click)="generate()"
              ></button>
              <button
                pButton
                type="button"
                data-action="reroll"
                icon="pi pi-refresh"
                severity="secondary"
                [label]="'tools.itemGenerator.reroll' | transloco"
                (click)="reroll()"
              ></button>
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
        data-action="save"
        icon="pi pi-save"
        [label]="'npc.editor.save' | transloco"
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
    .seed,
    .inventory {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: flex-end;
    }
    fieldset {
      border: 1px solid var(--p-content-border-color);
      border-radius: 0.5rem;
    }
    .inventory {
      flex-direction: column;
      align-items: stretch;
    }
    .entry {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }
    .entry .name {
      flex: 1;
      min-width: 8rem;
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
export class NpcEditorComponent {
  private readonly editor = inject(NpcEditorBusiness);
  private readonly language = inject(LanguageBusiness);

  /** The world whose attributes, level rules and item catalogue the NPC is built on. */
  readonly world = input.required<World>();
  /** The NPC to edit; none to create one. */
  readonly npc = input<Npc>();

  /** The NPC to save; for a new NPC it has no id yet. */
  readonly save = output<Npc>();

  private readonly initial = computed(
    () => this.npc() ?? this.editor.empty(this.world()),
  );
  protected readonly draft = linkedSignal(() => this.initial());
  protected readonly jsonText = linkedSignal(() =>
    this.editor.toJson(this.initial()),
  );
  protected readonly jsonIssues = linkedSignal<NpcEditorIssue[]>(() => {
    this.npc();
    return [];
  });
  protected readonly seed = signal(this.editor.newSeed());

  protected readonly issues = computed(() =>
    this.editor.validate(this.draft()),
  );
  protected readonly isEnemy = computed(() =>
    this.draft().roles.includes('enemy'),
  );
  protected readonly isMerchant = computed(() =>
    this.draft().roles.includes('merchant'),
  );
  protected readonly roleOptions = computed(() =>
    NPC_ROLES.map((value) => ({
      value,
      label: this.language.t('npc.role.' + value),
    })),
  );

  protected patch(change: Partial<Npc>): void {
    this.setDraft({ ...this.draft(), ...change });
  }

  protected setRoles(roles: NpcRole[]): void {
    this.setDraft(this.editor.setRoles(this.draft(), roles));
  }

  protected setLevel(text: string): void {
    const level = Math.trunc(+text);
    if (!text.trim() || !Number.isFinite(level)) return;
    const clamped = Math.min(Math.max(level, 1), this.world().maxLevel);
    this.setDraft(this.editor.setLevel(this.draft(), clamped, this.world()));
  }

  protected attributeLevel(attributeId: string): number {
    return (
      this.draft().attributes.find((a) => a.attributeId === attributeId)
        ?.level ?? 0
    );
  }

  protected setAttributeLevel(attributeId: string, text: string): void {
    this.setDraft(
      this.editor.setAttributeLevel(
        this.draft(),
        attributeId,
        Math.max(0, Math.trunc(+text) || 0),
        this.world(),
      ),
    );
  }

  protected numberOr(text: string, fallback: number): number {
    return text.trim() && Number.isFinite(+text) ? +text : fallback;
  }

  /** A blank ratio is removed. */
  protected setRatio(key: 'buyRatio' | 'sellRatio', text: string): void {
    const merchant = { ...this.draft().merchant };
    if (text.trim() && Number.isFinite(+text)) merchant[key] = +text;
    else delete merchant[key];
    this.patch({ merchant });
  }

  protected addItem(itemId: string | null): void {
    const item = this.world().items.find((i) => i.id === itemId);
    if (item) this.setDraft(this.editor.addItem(this.draft(), item));
  }

  protected removeEntry(entryId: string): void {
    this.setDraft(this.editor.removeEntry(this.draft(), entryId));
  }

  protected toggleEquipped(entryId: string): void {
    this.setDraft(this.editor.toggleEquipped(this.draft(), entryId));
  }

  protected toggleLoot(entryId: string): void {
    this.setDraft(this.editor.toggleLoot(this.draft(), entryId));
  }

  protected isLoot(entryId: string): boolean {
    return this.draft().loot.includes(entryId);
  }

  protected editJson(text: string): void {
    this.jsonText.set(text);
    const result = this.editor.parse(text, this.draft());
    this.jsonIssues.set(result.issues);
    if (result.npc) this.draft.set(result.npc);
  }

  protected async generate(): Promise<void> {
    const generated = await this.editor.generate(this.seed(), this.world());
    this.setDraft({ ...generated, id: this.draft().id });
  }

  protected reroll(): Promise<void> {
    this.seed.set(this.editor.newSeed());
    return this.generate();
  }

  protected submit(): void {
    if (this.issues().length || this.jsonIssues().length) return;
    this.save.emit({ ...this.draft(), id: this.npc()?.id } as Npc);
  }

  protected issueText(issues: NpcEditorIssue[]): string {
    return [...new Set(issues.map((issue) => issue.field))]
      .map((field) => this.language.t('npc.editor.issue.' + field))
      .join(' ');
  }

  private setDraft(npc: Npc): void {
    this.draft.set(npc);
    this.jsonText.set(this.editor.toJson(npc));
    this.jsonIssues.set([]);
  }
}
