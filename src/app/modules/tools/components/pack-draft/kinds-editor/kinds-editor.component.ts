import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AutoCompleteModule } from '@openng/optimus-ui/autocomplete';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import {
  DraftIssue,
  KnownKeys,
  PackDraftFormBusiness,
} from '../../../../../core/business/pack-draft-form.business';
import { LanguageBusiness } from '../../../../../core/business/language.business';
import {
  Gender,
  KindAdjective,
  KindSuffix,
  Noun,
} from '../../../../../core/generators/word-list';
import {
  EQUIPMENT_SLOTS,
  EquipmentSlot,
  ITEM_RARITIES,
  ITEM_TYPES,
  ItemDraft,
  ItemRarity,
  ItemType,
} from '../../../../../core/models/item';
import { KIND_ID } from '../../../../../core/packs/pack-kinds';
import { kindLabel } from '../../../../../core/packs/kind-label';
import { PackDraft } from '../../../../../core/packs/pack-draft';
import {
  kindTextsOf,
  kindWordsOf,
  removeKind,
  renameKind,
  setKind,
  setKindTexts,
  setKindWords,
} from '../../../../../core/packs/pack-draft-edits';

import {
  AdjectiveForms,
  EMPTY_FORMS,
  adjectiveOf,
  suffixOf,
  wordLine,
} from '../words';

interface NewNoun {
  text: string;
  gender?: Gender;
  plural: boolean;
}

const lines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/** The kinds of the pack's items tree: id, parent, type, slot, and for a pack with a language its nouns and texts. */
@Component({
  selector: 'app-kinds-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    AutoCompleteModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TextareaModule,
  ],
  template: `
    <div class="kinds">
      @for (id of ids(); track id) {
        <div class="row" [attr.data-test]="'kind-row-' + id">
          <div class="line">
            <p-autocomplete
              data-test="kind-id"
              [ngModel]="id"
              [suggestions]="suggestions()"
              (completeMethod)="suggest($event.query)"
              [ariaLabel]="'packs.creator.kinds.id' | translate"
              [placeholder]="'packs.creator.kinds.id' | translate"
              (onBlur)="commitId(id, $event)"
            >
              <ng-template #item let-suggestion>{{
                labelOf(suggestion)
              }}</ng-template>
            </p-autocomplete>
            @if (id) {
              <p-autocomplete
                data-test="kind-parent"
                [ngModel]="draft().kinds[id]?.parent ?? ''"
                [suggestions]="suggestions()"
                (completeMethod)="suggest($event.query)"
                [ariaLabel]="'packs.creator.kinds.parent' | translate"
                [placeholder]="'packs.creator.kinds.parent' | translate"
                (onBlur)="commitParent(id, $event)"
              >
                <ng-template #item let-suggestion>{{
                  labelOf(suggestion)
                }}</ng-template>
              </p-autocomplete>
              @if (!draft().kinds[id]?.parent) {
                <p-select
                  data-test="kind-type"
                  [options]="typeOptions()"
                  optionLabel="label"
                  optionValue="value"
                  [ngModel]="draft().kinds[id]?.type"
                  (ngModelChange)="patch(id, { type: $event ?? undefined })"
                  [showClear]="true"
                  [ariaLabel]="'packs.creator.kinds.type' | translate"
                  [placeholder]="'packs.creator.kinds.type' | translate"
                />
              }
              @if (
                draft().kinds[id]?.parent ||
                draft().kinds[id]?.type === 'equipment'
              ) {
                <p-select
                  data-test="kind-slot"
                  [options]="slotOptions()"
                  optionLabel="label"
                  optionValue="value"
                  [ngModel]="draft().kinds[id]?.slot"
                  (ngModelChange)="patch(id, { slot: $event ?? undefined })"
                  [showClear]="true"
                  [ariaLabel]="'packs.creator.kinds.slot' | translate"
                  [placeholder]="'packs.creator.kinds.slot' | translate"
                />
              }
              <p-button
                data-test="remove-kind"
                severity="danger"
                outlined
                icon="pi pi-trash"
                [ariaLabel]="'packs.creator.kinds.remove' | translate"
                (onClick)="remove(id)"
              />
            }
          </div>
          @if (id && invalidId(id)) {
            <small class="error">{{
              'packs.creator.kinds.kebab' | translate
            }}</small>
          }
          @for (issue of issuesOf(id); track $index) {
            <p-message
              data-test="issue"
              size="small"
              [severity]="issue.level === 'error' ? 'error' : 'warn'"
              >{{ issue.message }}</p-message
            >
          }
          @if (id && !neutral()) {
            <div class="texts">
              <div class="nouns">
                <span class="label">{{
                  'packs.creator.kinds.nouns' | translate
                }}</span>
                @for (noun of nounsOf(id); track $index; let i = $index) {
                  <span class="chip">
                    {{ noun.text
                    }}{{ noun.gender ? ' (' + noun.gender + ')' : ''
                    }}{{ noun.plural ? ' pl.' : '' }}
                    <p-button
                      data-test="remove-noun"
                      severity="secondary"
                      text
                      size="small"
                      icon="pi pi-times"
                      [ariaLabel]="'packs.creator.kinds.remove' | translate"
                      (onClick)="removeNoun(id, i)"
                    />
                  </span>
                }
              </div>
              <div class="line">
                <input
                  pInputText
                  data-test="kind-new-noun"
                  type="text"
                  [attr.aria-label]="'packs.creator.kinds.newNoun' | translate"
                  [placeholder]="'packs.creator.kinds.newNoun' | translate"
                  [ngModel]="noun(id).text"
                  (ngModelChange)="setNewNoun(id, { text: $event })"
                />
                <p-select
                  [options]="genderOptions()"
                  optionLabel="label"
                  optionValue="value"
                  [ngModel]="noun(id).gender"
                  (ngModelChange)="
                    setNewNoun(id, { gender: $event ?? undefined })
                  "
                  [showClear]="true"
                  [ariaLabel]="'packs.creator.kinds.gender' | translate"
                  [placeholder]="'packs.creator.kinds.gender' | translate"
                />
                <label class="check">
                  <p-checkbox
                    [binary]="true"
                    [ngModel]="noun(id).plural"
                    (ngModelChange)="setNewNoun(id, { plural: !!$event })"
                  />
                  {{ 'packs.creator.kinds.plural' | translate }}
                </label>
                <p-button
                  data-test="add-noun"
                  icon="pi pi-plus"
                  severity="secondary"
                  [label]="'packs.creator.kinds.addNoun' | translate"
                  [disabled]="!noun(id).text.trim()"
                  (onClick)="addNoun(id)"
                />
              </div>
              <label class="field">
                {{ 'packs.creator.kinds.descriptions' | translate }}
                <textarea
                  pTextarea
                  rows="3"
                  data-test="kind-descriptions"
                  [value]="descriptionsOf(id)"
                  (change)="setDescriptions(id, $event)"
                ></textarea>
              </label>
              <div class="line">
                <p-button
                  data-test="toggle-names"
                  severity="secondary"
                  text
                  [icon]="
                    namesOpen().has(id)
                      ? 'pi pi-chevron-up'
                      : 'pi pi-chevron-down'
                  "
                  [label]="'packs.creator.kinds.names' | translate"
                  (onClick)="toggleNames(id)"
                />
                <p-button
                  data-test="preview-kind"
                  severity="secondary"
                  icon="pi pi-eye"
                  [label]="'packs.creator.kinds.preview' | translate"
                  (onClick)="preview(id)"
                />
              </div>
              @if (namesOpen().has(id)) {
                <small class="hint">{{
                  'packs.creator.kinds.namesHint' | translate
                }}</small>
                <div class="rarities">
                  @for (rarity of rarities; track rarity) {
                    <label class="field">
                      {{ 'item.rarity.' + rarity | translate }}
                      <textarea
                        pTextarea
                        rows="2"
                        [attr.data-test]="'kind-names-' + rarity"
                        [value]="namesOf(id, rarity)"
                        (change)="setNames(id, rarity, $event)"
                      ></textarea>
                    </label>
                  }
                </div>
              }
              <div class="line">
                <p-button
                  data-test="toggle-words"
                  severity="secondary"
                  text
                  [icon]="
                    wordsOpen().has(id)
                      ? 'pi pi-chevron-up'
                      : 'pi pi-chevron-down'
                  "
                  [label]="'packs.creator.kinds.words' | translate"
                  (onClick)="toggleWords(id)"
                />
              </div>
              @if (wordsOpen().has(id)) {
                <small class="hint">{{
                  'packs.creator.kinds.wordsHint' | translate
                }}</small>
                @for (rarity of rarities; track rarity) {
                  <div class="words">
                    <span class="label">{{
                      'item.rarity.' + rarity | translate
                    }}</span>
                    <div class="nouns">
                      @for (
                        adjective of wordsOf(id).adjectives[rarity] ?? [];
                        track $index;
                        let i = $index
                      ) {
                        <span class="chip">
                          {{ line(adjective) }}
                          <p-button
                            severity="secondary"
                            text
                            size="small"
                            icon="pi pi-times"
                            [ariaLabel]="
                              'packs.creator.kinds.remove' | translate
                            "
                            (onClick)="removeAdjective(id, rarity, i)"
                          />
                        </span>
                      }
                      @for (
                        suffix of wordsOf(id).suffixes[rarity] ?? [];
                        track $index;
                        let i = $index
                      ) {
                        <span class="chip">
                          {{ line(suffix) }}
                          <p-button
                            severity="secondary"
                            text
                            size="small"
                            icon="pi pi-times"
                            [ariaLabel]="
                              'packs.creator.kinds.remove' | translate
                            "
                            (onClick)="removeSuffix(id, rarity, i)"
                          />
                        </span>
                      }
                    </div>
                    <div class="line">
                      @for (form of forms; track form) {
                        <input
                          pInputText
                          type="text"
                          [attr.data-test]="
                            'kind-new-adjective-' + rarity + '-' + form
                          "
                          [attr.aria-label]="
                            'packs.creator.words.' + form | translate
                          "
                          [placeholder]="
                            'packs.creator.words.' + form | translate
                          "
                          [ngModel]="newAdjective(id, rarity)[form]"
                          (ngModelChange)="
                            setNewAdjective(id, rarity, form, $event)
                          "
                        />
                      }
                      <p-button
                        [attr.data-test]="'add-kind-adjective-' + rarity"
                        icon="pi pi-plus"
                        severity="secondary"
                        [label]="'packs.creator.words.addAdjective' | translate"
                        [disabled]="!newAdjective(id, rarity).m.trim()"
                        (onClick)="addAdjective(id, rarity)"
                      />
                    </div>
                    <div class="line">
                      <input
                        pInputText
                        type="text"
                        [attr.data-test]="'kind-new-suffix-' + rarity"
                        [attr.aria-label]="
                          'packs.creator.words.suffix' | translate
                        "
                        [placeholder]="'packs.creator.words.suffix' | translate"
                        [ngModel]="newSuffix(id, rarity)"
                        (ngModelChange)="setNewSuffix(id, rarity, $event)"
                      />
                      <p-button
                        [attr.data-test]="'add-kind-suffix-' + rarity"
                        icon="pi pi-plus"
                        severity="secondary"
                        [label]="'packs.creator.words.addSuffix' | translate"
                        [disabled]="!newSuffix(id, rarity).trim()"
                        (onClick)="addSuffix(id, rarity)"
                      />
                    </div>
                  </div>
                }
              }
              @if (previews()[id]; as drawn) {
                <ul class="preview" data-test="preview-items">
                  @for (item of drawn; track $index) {
                    <li>
                      <strong>{{ item.name }}</strong>
                      <small class="rarity">{{
                        'item.rarity.' + item.rarity | translate
                      }}</small>
                      <div>{{ item.description }}</div>
                    </li>
                  } @empty {
                    <li class="hint">
                      {{ 'packs.creator.kinds.previewEmpty' | translate }}
                    </li>
                  }
                </ul>
              }
            </div>
          }
        </div>
      }
      <div>
        <p-button
          data-test="add-kind"
          icon="pi pi-plus"
          severity="secondary"
          [label]="'packs.creator.kinds.add' | translate"
          [disabled]="adding()"
          (onClick)="adding.set(true)"
        />
      </div>
      @if (uncovered().length) {
        <p-message data-test="coverage" severity="info" size="small">{{
          'packs.creator.kinds.uncovered'
            | translate: { kinds: uncovered().join(', ') }
        }}</p-message>
      }
    </div>
  `,
  styles: `
    .kinds {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .row {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.75rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: 0.5rem;
    }
    .line,
    .nouns {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }
    .texts {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .field textarea {
      width: 100%;
      box-sizing: border-box;
    }
    .rarities {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
      gap: 0.5rem;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding-left: 0.5rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: 1rem;
    }
    .check {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .label {
      font-weight: 600;
    }
    .error {
      color: var(--p-red-500);
    }
    .rarity {
      margin-left: 0.5rem;
    }
    .words {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .preview {
      margin: 0;
      padding-left: 1rem;
    }
  `,
})
export class KindsEditorComponent {
  readonly draft = input.required<PackDraft>();
  readonly issues = input<DraftIssue[]>([]);
  readonly changed = output<PackDraft>();

  private readonly form = inject(PackDraftFormBusiness);
  private readonly language = inject(LanguageBusiness);

  protected readonly rarities = ITEM_RARITIES;
  protected readonly adding = signal(false);
  protected readonly known = signal<KnownKeys>({
    kinds: [],
    tints: [],
    params: [],
    domainKinds: { npcs: [], skills: [], classes: [] },
  });
  protected readonly suggestions = signal<string[]>([]);
  protected readonly uncovered = signal<string[]>([]);
  protected readonly previews = signal<Record<string, ItemDraft[]>>({});
  protected readonly namesOpen = signal<ReadonlySet<string>>(new Set());
  protected readonly wordsOpen = signal<ReadonlySet<string>>(new Set());
  protected readonly forms = ['m', 'f', 'mp', 'fp', 'tint'] as const;
  protected readonly line = wordLine;
  private readonly newAdjectives = signal<Record<string, AdjectiveForms>>({});
  private readonly newSuffixes = signal<Record<string, string>>({});
  private readonly newNouns = signal<Record<string, NewNoun>>({});
  private loads = 0;

  protected readonly neutral = computed(
    () => this.draft().details.language === undefined,
  );
  protected readonly ids = computed(() => [
    ...Object.keys(this.draft().kinds),
    ...(this.adding() ? [''] : []),
  ]);
  protected readonly typeOptions = computed(() =>
    ITEM_TYPES.map((value) => ({
      value,
      label: this.language.t(`item.type.${value}`),
    })),
  );
  protected readonly slotOptions = computed(() =>
    EQUIPMENT_SLOTS.map((value) => ({
      value,
      label: this.language.t(`item.slot.${value}`),
    })),
  );
  protected readonly genderOptions = computed(() => [
    { value: 'm', label: this.language.t('packs.creator.kinds.masculine') },
    { value: 'f', label: this.language.t('packs.creator.kinds.feminine') },
  ]);

  constructor() {
    effect(() => {
      const draft = this.draft();
      const load = ++this.loads;
      void this.form
        .knownKeys(draft)
        .then((known) => load === this.loads && this.known.set(known));
      void this.form
        .coverage(draft)
        .then((missing) => load === this.loads && this.uncovered.set(missing));
    });
  }

  protected issuesOf(id: string): DraftIssue[] {
    return id
      ? this.issues().filter((issue) => issue.kind === id && !issue.domain)
      : [];
  }

  protected invalidId(id: string): boolean {
    return !KIND_ID.test(id);
  }

  protected labelOf(id: string): string {
    const kind = this.known().kinds.find((k) => k.id === id);
    return kind ? kindLabel(kind) : id;
  }

  protected suggest(query: string): void {
    const needle = query.toLowerCase();
    this.suggestions.set(
      this.known()
        .kinds.filter((kind) => kindLabel(kind).toLowerCase().includes(needle))
        .map((kind) => kind.id),
    );
  }

  private emit(draft: PackDraft): void {
    this.changed.emit(draft);
  }

  private valueOf(event: unknown): string {
    return (
      (event as Event).target as HTMLInputElement | HTMLTextAreaElement
    ).value.trim();
  }

  // --- the kind ---------------------------------------------------------------------------------------------

  protected commitId(id: string, event: unknown): void {
    const value = this.valueOf(event);
    if (!value || value === id) return;
    if (id === '') {
      if (value in this.draft().kinds) return;
      this.adding.set(false);
      this.emit(setKind(this.draft(), value, {}));
    } else this.emit(renameKind(this.draft(), id, value));
  }

  protected commitParent(id: string, event: unknown): void {
    const parent = this.valueOf(event) || undefined;
    if (parent === this.draft().kinds[id]?.parent) return;
    this.emit(
      setKind(
        this.draft(),
        id,
        parent ? { parent, type: undefined } : { parent: undefined },
      ),
    );
  }

  protected patch(
    id: string,
    fields: { type?: ItemType; slot?: EquipmentSlot },
  ): void {
    this.emit(setKind(this.draft(), id, fields));
  }

  protected remove(id: string): void {
    this.emit(removeKind(this.draft(), id));
  }

  // --- the texts --------------------------------------------------------------------------------------------

  protected nounsOf(id: string): Noun[] {
    return kindTextsOf(this.draft(), id).nouns;
  }

  protected noun(id: string): NewNoun {
    return this.newNouns()[id] ?? { text: '', plural: false };
  }

  protected setNewNoun(id: string, patch: Partial<NewNoun>): void {
    this.newNouns.update((all) => ({
      ...all,
      [id]: { ...this.noun(id), ...patch },
    }));
  }

  protected addNoun(id: string): void {
    const { text, gender, plural } = this.noun(id);
    if (!text.trim()) return;
    const noun: Noun = {
      text: text.trim(),
      ...(gender ? { gender } : {}),
      ...(plural ? { plural } : {}),
    };
    this.emit(
      setKindTexts(this.draft(), id, { nouns: [...this.nounsOf(id), noun] }),
    );
    this.newNouns.update((all) => ({
      ...all,
      [id]: { text: '', plural: false },
    }));
  }

  protected removeNoun(id: string, index: number): void {
    this.emit(
      setKindTexts(this.draft(), id, {
        nouns: this.nounsOf(id).filter((_, i) => i !== index),
      }),
    );
  }

  protected descriptionsOf(id: string): string {
    return kindTextsOf(this.draft(), id).descriptions.join('\n');
  }

  protected setDescriptions(id: string, event: unknown): void {
    this.emit(
      setKindTexts(this.draft(), id, {
        descriptions: lines(this.valueOf(event)),
      }),
    );
  }

  protected namesOf(id: string, rarity: ItemRarity): string {
    return (kindTextsOf(this.draft(), id).names[rarity] ?? []).join('\n');
  }

  protected setNames(id: string, rarity: ItemRarity, event: unknown): void {
    const names = {
      ...kindTextsOf(this.draft(), id).names,
      [rarity]: lines(this.valueOf(event)),
    };
    this.emit(setKindTexts(this.draft(), id, { names }));
  }

  protected toggleNames(id: string): void {
    this.namesOpen.update((open) => {
      const next = new Set(open);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  // --- the words --------------------------------------------------------------------------------------------

  protected wordsOf(id: string) {
    return kindWordsOf(this.draft(), id);
  }

  protected toggleWords(id: string): void {
    this.wordsOpen.update((open) => {
      const next = new Set(open);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  protected newAdjective(id: string, rarity: ItemRarity): AdjectiveForms {
    return this.newAdjectives()[`${id}|${rarity}`] ?? EMPTY_FORMS;
  }

  protected setNewAdjective(
    id: string,
    rarity: ItemRarity,
    form: keyof AdjectiveForms,
    value: string,
  ): void {
    this.newAdjectives.update((all) => ({
      ...all,
      [`${id}|${rarity}`]: { ...this.newAdjective(id, rarity), [form]: value },
    }));
  }

  protected addAdjective(id: string, rarity: ItemRarity): void {
    const adjective = adjectiveOf(this.newAdjective(id, rarity));
    if (!adjective) return;
    const adjectives = {
      ...this.wordsOf(id).adjectives,
      [rarity]: [
        ...(this.wordsOf(id).adjectives[rarity] ?? []),
        adjective as KindAdjective,
      ],
    };
    this.emit(setKindWords(this.draft(), id, { adjectives }));
    this.newAdjectives.update((all) => ({
      ...all,
      [`${id}|${rarity}`]: EMPTY_FORMS,
    }));
  }

  protected removeAdjective(
    id: string,
    rarity: ItemRarity,
    index: number,
  ): void {
    const adjectives = {
      ...this.wordsOf(id).adjectives,
      [rarity]: (this.wordsOf(id).adjectives[rarity] ?? []).filter(
        (_, i) => i !== index,
      ),
    };
    this.emit(setKindWords(this.draft(), id, { adjectives }));
  }

  protected newSuffix(id: string, rarity: ItemRarity): string {
    return this.newSuffixes()[`${id}|${rarity}`] ?? '';
  }

  protected setNewSuffix(id: string, rarity: ItemRarity, value: string): void {
    this.newSuffixes.update((all) => ({ ...all, [`${id}|${rarity}`]: value }));
  }

  protected addSuffix(id: string, rarity: ItemRarity): void {
    const suffix = suffixOf(this.newSuffix(id, rarity));
    if (!suffix) return;
    const suffixes = {
      ...this.wordsOf(id).suffixes,
      [rarity]: [
        ...(this.wordsOf(id).suffixes[rarity] ?? []),
        suffix as KindSuffix,
      ],
    };
    this.emit(setKindWords(this.draft(), id, { suffixes }));
    this.newSuffixes.update((all) => ({ ...all, [`${id}|${rarity}`]: '' }));
  }

  protected removeSuffix(id: string, rarity: ItemRarity, index: number): void {
    const suffixes = {
      ...this.wordsOf(id).suffixes,
      [rarity]: (this.wordsOf(id).suffixes[rarity] ?? []).filter(
        (_, i) => i !== index,
      ),
    };
    this.emit(setKindWords(this.draft(), id, { suffixes }));
  }

  protected async preview(id: string): Promise<void> {
    const items = await this.form.preview(this.draft(), id);
    this.previews.update((all) => ({ ...all, [id]: items }));
  }
}
