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
import { ImageBusiness } from '../../../../core/business/image.business';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { CoinInputComponent } from '../../../../core/components/coin-input/coin-input.component';
import { ImageWarningComponent } from '../../../../core/components/image-warning/image-warning.component';
import { StoredImageComponent } from '../../../../core/components/stored-image/stored-image.component';
import {
  EQUIPMENT_SLOTS,
  ITEM_RARITIES,
  ITEM_TYPES,
  ItemDraft,
  ItemRarity,
  ItemSlot,
  ItemType,
} from '../../../../core/models/item';
import { MessageLevel } from '../../../../core/models/toast-level';
import { Item, World } from '../../../world/models/world';
import { ItemEditorBusiness } from '../../business/item-editor.business';
import { ItemIssue } from '../../helpers/item-editor.rules';

const EMPTY_DRAFT: ItemDraft = {
  name: '',
  description: '',
  rarity: 'common',
  type: 'item',
  slot: 'none',
  price: 0,
  modifiers: [],
};

function toDraft(item: Item | undefined): ItemDraft {
  if (!item) return EMPTY_DRAFT;
  const { name, description, rarity, type, slot, price, modifiers } = item;
  return {
    name,
    description,
    rarity,
    type,
    slot,
    price,
    modifiers: modifiers.map((modifier) => ({ ...modifier })),
  };
}

/** Creates or edits an item on a world's attributes: a form, its JSON (kept in sync) and a random Generate. */
@Component({
  selector: 'app-item-editor',
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
    CoinInputComponent,
    StoredImageComponent,
    ImageWarningComponent,
  ],
  template: `
    <p-tabs value="form">
      <p-tablist>
        <p-tab value="form">{{ 'item.editor.tabForm' | transloco }}</p-tab>
        <p-tab value="json">{{ 'item.editor.tabJson' | transloco }}</p-tab>
        <p-tab value="generate">{{
          'item.editor.tabGenerate' | transloco
        }}</p-tab>
      </p-tablist>
      <p-tabpanels>
        <p-tabpanel value="form">
          <div class="form">
            <div class="field image">
              <label for="item-image">{{
                'item.fields.image' | transloco
              }}</label>
              <app-stored-image class="preview" [imageId]="imageId()">
                <span class="pi pi-image"></span>
              </app-stored-image>
              <input
                id="item-image"
                data-field="image"
                type="file"
                accept="image/*"
                (change)="upload($any($event.target))"
              />
              <app-image-warning />
            </div>
            <div class="field">
              <label for="item-name">{{
                'item.fields.name' | transloco
              }}</label>
              <input
                pInputText
                id="item-name"
                data-field="name"
                autocomplete="off"
                [value]="draft().name"
                (input)="patch({ name: $any($event.target).value })"
              />
            </div>
            <div class="field">
              <label for="item-description">{{
                'item.fields.description' | transloco
              }}</label>
              <textarea
                pTextarea
                id="item-description"
                data-field="description"
                rows="3"
                [value]="draft().description"
                (input)="patch({ description: $any($event.target).value })"
              ></textarea>
            </div>
            <div class="row">
              <div class="field">
                <label for="item-rarity">{{
                  'item.fields.rarity' | transloco
                }}</label>
                <p-select
                  inputId="item-rarity"
                  [options]="rarities()"
                  optionLabel="label"
                  optionValue="value"
                  [ngModel]="draft().rarity"
                  (ngModelChange)="patch({ rarity: $event })"
                />
              </div>
              <div class="field">
                <label for="item-type">{{
                  'item.fields.type' | transloco
                }}</label>
                <p-select
                  inputId="item-type"
                  [options]="types()"
                  optionLabel="label"
                  optionValue="value"
                  [ngModel]="draft().type"
                  (ngModelChange)="setType($event)"
                />
              </div>
              @if (draft().type === 'equipment') {
                <div class="field">
                  <label for="item-slot">{{
                    'item.fields.slot' | transloco
                  }}</label>
                  <p-select
                    inputId="item-slot"
                    [options]="slots()"
                    optionLabel="label"
                    optionValue="value"
                    [ngModel]="draft().slot"
                    (ngModelChange)="patch({ slot: $event })"
                  />
                </div>
              }
              <div class="field">
                <label for="item-price">{{
                  'item.fields.price' | transloco
                }}</label>
                <app-coin-input
                  id="item-price"
                  data-field="price"
                  [value]="draft().price"
                  (valueChange)="patch({ price: $event })"
                />
              </div>
            </div>
            <fieldset class="modifiers">
              <legend>{{ 'item.modifiers' | transloco }}</legend>
              @for (name of attributeNames(); track name) {
                <div class="field">
                  <label [for]="'item-mod-' + name">{{ name }}</label>
                  <p-inputnumber
                    [inputId]="'item-mod-' + name"
                    [attr.data-modifier]="name"
                    [showButtons]="true"
                    [ngModel]="modifierValue(name)"
                    (ngModelChange)="setModifier(name, $event)"
                  />
                </div>
              }
            </fieldset>
          </div>
        </p-tabpanel>

        <p-tabpanel value="json">
          <div class="form">
            <p class="hint">{{ 'item.editor.jsonHint' | transloco }}</p>
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
            <p class="hint">{{ 'item.editor.generateHint' | transloco }}</p>
            <div class="seed">
              <div class="field">
                <label for="item-seed">{{
                  'tools.itemGenerator.seed' | transloco
                }}</label>
                <input
                  pInputText
                  id="item-seed"
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
                [label]="'item.editor.generate' | transloco"
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
            <div>
              <button
                pButton
                type="button"
                data-action="copy-prompt"
                icon="pi pi-copy"
                severity="secondary"
                [text]="true"
                [label]="'item.editor.copyPrompt' | transloco"
                (click)="copyPrompt()"
              ></button>
              <small class="hint">{{
                'item.editor.copyPromptHint' | transloco
              }}</small>
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
        [label]="'item.editor.save' | transloco"
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
    .modifiers {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: flex-end;
    }
    .modifiers {
      border: 1px solid var(--p-content-border-color);
      border-radius: 0.5rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }
    .preview {
      width: 6rem;
      height: 6rem;
      border-radius: 0.5rem;
      background: var(--p-content-hover-background);
      display: flex;
      align-items: center;
      justify-content: center;
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
export class ItemEditorComponent {
  private readonly editor = inject(ItemEditorBusiness);
  private readonly images = inject(ImageBusiness);
  private readonly language = inject(LanguageBusiness);
  private readonly messages = inject(MessageService);

  /** The world whose attributes the modifiers are drawn from. */
  readonly world = input.required<World>();
  /** The item to edit; none to create one. */
  readonly item = input<Item>();

  /** The item to save; for a new item it has no id yet. */
  readonly save = output<Item>();

  protected readonly draft = linkedSignal(() => toDraft(this.item()));
  protected readonly jsonText = linkedSignal(() =>
    this.editor.toJson(toDraft(this.item())),
  );
  protected readonly jsonIssues = linkedSignal<ItemIssue[]>(() => {
    this.item();
    return [];
  });
  protected readonly imageId = linkedSignal(() => this.item()?.imageId);
  protected readonly seed = signal(this.editor.newSeed());

  protected readonly attributeNames = computed(() =>
    this.world().attributes.map((attribute) => attribute.name),
  );
  protected readonly issues = computed(() =>
    this.editor.validate(this.draft(), this.attributeNames()),
  );
  protected readonly rarities = computed(() =>
    ITEM_RARITIES.map((value) => ({
      value,
      label: this.language.t('item.rarity.' + value),
    })),
  );
  protected readonly types = computed(() =>
    ITEM_TYPES.map((value) => ({
      value,
      label: this.language.t('item.type.' + value),
    })),
  );
  protected readonly slots = computed(() =>
    EQUIPMENT_SLOTS.map((value) => ({
      value,
      label: this.language.t('item.slot.' + value),
    })),
  );

  protected patch(change: Partial<ItemDraft>): void {
    this.setDraft({ ...this.draft(), ...change });
  }

  protected setType(type: ItemType): void {
    const slot: ItemSlot =
      type !== 'equipment'
        ? 'none'
        : this.draft().slot === 'none'
          ? 'weapon1'
          : this.draft().slot;
    this.patch({ type, slot });
  }

  protected modifierValue(attribute: string): number {
    return (
      this.draft().modifiers.find((m) => m.attribute === attribute)?.value ?? 0
    );
  }

  /** 0 or blank removes the modifier. */
  protected setModifier(attribute: string, amount: number | null): void {
    const value = Math.trunc(amount ?? 0) || 0;
    const others = this.draft().modifiers.filter(
      (m) => m.attribute !== attribute,
    );
    this.patch({
      modifiers: value ? [...others, { attribute, value }] : others,
    });
  }

  protected editJson(text: string): void {
    this.jsonText.set(text);
    const result = this.editor.parse(text, this.attributeNames());
    this.jsonIssues.set(result.issues);
    if (result.draft) this.draft.set(result.draft);
  }

  protected async generate(): Promise<void> {
    const draft = await this.editor.generate(
      this.seed(),
      this.attributeNames(),
    );
    this.setDraft(draft);
  }

  protected reroll(): Promise<void> {
    this.seed.set(this.editor.newSeed());
    return this.generate();
  }

  protected async copyPrompt(): Promise<void> {
    try {
      await navigator.clipboard.writeText(
        this.editor.prompt(this.attributeNames()),
      );
      this.toast(MessageLevel.Success, 'item.editor.promptCopied');
    } catch {
      this.toast(MessageLevel.Error, 'item.editor.copyFailed');
    }
  }

  protected async upload(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;
    try {
      this.imageId.set(await this.images.storeUpload(file));
    } catch {
      this.toast(MessageLevel.Error, 'item.editor.imageFailed');
    }
  }

  protected submit(): void {
    if (this.issues().length || this.jsonIssues().length) return;
    const current = this.item();
    this.save.emit({
      ...this.draft(),
      id: current?.id,
      imageId: this.imageId(),
    } as Item);
  }

  protected issueText(issues: ItemIssue[]): string {
    return [...new Set(issues.map((issue) => issue.field))]
      .map((field) => this.language.t('item.editor.issue.' + field))
      .join(' ');
  }

  private setDraft(draft: ItemDraft): void {
    this.draft.set(draft);
    this.jsonText.set(this.editor.toJson(draft));
    this.jsonIssues.set([]);
  }

  private toast(severity: MessageLevel, key: string): void {
    this.messages.add({
      severity,
      summary: this.language.t(key),
      life: 2500,
    });
  }
}
