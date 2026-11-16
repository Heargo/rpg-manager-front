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
import { MultiSelectModule } from '@openng/optimus-ui/multiselect';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { LanguageBusiness } from '../../../../../core/business/language.business';
import {
  DomainPreview,
  DraftIssue,
  KnownKeys,
  PackDraftFormBusiness,
} from '../../../../../core/business/pack-draft-form.business';
import { Gender, Noun } from '../../../../../core/generators/word-list';
import { kindLabel } from '../../../../../core/packs/kind-label';
import { PackDraft } from '../../../../../core/packs/pack-draft';
import {
  domainKindsOf,
  domainKindTextsOf,
  removeDomainKind,
  renameDomainKind,
  setDomainKind,
  setDomainKindTexts,
  StructuredDomain,
} from '../../../../../core/packs/pack-draft-edits';
import {
  KIND_ID,
  SKILL_EFFECT_KINDS,
} from '../../../../../core/packs/pack-kinds';
import { NPC_ROLES } from '../../../../npc/models/npc';
import { SKILL_TYPES } from '../../../../skill/models/skill';
import { AdjectiveForms, EMPTY_FORMS, adjectiveOf, wordLine } from '../words';

interface NewNoun {
  text: string;
  gender?: Gender;
  plural: boolean;
}

type Fields = Record<string, unknown>;

const lines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/** The kinds of the pack's NPC, skill or class tree: id, parent, the domain's own fields and, for a pack with a language, the texts. */
@Component({
  selector: 'app-domain-kinds-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    AutoCompleteModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    MessageModule,
    MultiSelectModule,
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
                [ngModel]="fieldsOf(id)['parent'] ?? ''"
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
              @switch (domain()) {
                @case ('npcs') {
                  <p-multiselect
                    data-test="kind-roles"
                    [options]="roleOptions()"
                    optionLabel="label"
                    optionValue="value"
                    display="chip"
                    [ngModel]="fieldsOf(id)['roles'] ?? []"
                    (onChange)="
                      patch(id, { roles: listOrNothing($event.value) })
                    "
                    [ariaLabel]="'packs.creator.domain.roles' | translate"
                    [placeholder]="'packs.creator.domain.roles' | translate"
                  />
                  @if (!fieldsOf(id)['parent']) {
                    <p-select
                      data-test="kind-person"
                      [options]="personOptions()"
                      optionLabel="label"
                      optionValue="value"
                      [ngModel]="fieldsOf(id)['person']"
                      (onChange)="
                        patch(id, { person: $event.value ?? undefined })
                      "
                      [showClear]="true"
                      [ariaLabel]="'packs.creator.domain.person' | translate"
                      [placeholder]="'packs.creator.domain.person' | translate"
                    />
                  }
                }
                @case ('skills') {
                  @if (!fieldsOf(id)['parent']) {
                    <p-select
                      data-test="kind-type"
                      [options]="typeOptions()"
                      optionLabel="label"
                      optionValue="value"
                      [ngModel]="fieldsOf(id)['type']"
                      (onChange)="
                        patch(id, { type: $event.value ?? undefined })
                      "
                      [showClear]="true"
                      [ariaLabel]="'packs.creator.kinds.type' | translate"
                      [placeholder]="'packs.creator.kinds.type' | translate"
                    />
                  }
                  @if (fieldsOf(id)['type'] !== 'passive') {
                    <p-select
                      data-test="kind-effect"
                      [options]="effectOptions()"
                      optionLabel="label"
                      optionValue="value"
                      [ngModel]="fieldsOf(id)['effect']"
                      (onChange)="
                        patch(id, { effect: $event.value ?? undefined })
                      "
                      [showClear]="true"
                      [ariaLabel]="'packs.creator.domain.effect' | translate"
                      [placeholder]="'packs.creator.domain.effect' | translate"
                    />
                  }
                }
                @case ('classes') {
                  <p-multiselect
                    data-test="kind-skills"
                    [options]="skillOptions()"
                    optionLabel="label"
                    optionValue="value"
                    display="chip"
                    [ngModel]="fieldsOf(id)['skills'] ?? []"
                    (onChange)="
                      patch(id, { skills: listOrNothing($event.value) })
                    "
                    [ariaLabel]="'packs.creator.domain.skills' | translate"
                    [placeholder]="'packs.creator.domain.skills' | translate"
                  />
                }
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
                @for (noun of textsOf(id).nouns; track $index; let i = $index) {
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
                  [value]="
                    textsOf(id).descriptions.join(
                      '
'
                    )
                  "
                  (change)="setDescriptions(id, $event)"
                ></textarea>
              </label>
              <div class="nouns">
                <span class="label">{{
                  'packs.creator.domain.adjectives' | translate
                }}</span>
                @for (
                  adjective of textsOf(id).adjectives;
                  track $index;
                  let i = $index
                ) {
                  <span class="chip">
                    {{ line(adjective) }}
                    <p-button
                      data-test="remove-adjective"
                      severity="secondary"
                      text
                      size="small"
                      icon="pi pi-times"
                      [ariaLabel]="'packs.creator.kinds.remove' | translate"
                      (onClick)="removeAdjective(id, i)"
                    />
                  </span>
                }
              </div>
              <div class="line">
                @for (form of forms; track form) {
                  <input
                    pInputText
                    type="text"
                    [attr.data-test]="'kind-new-adjective-' + form"
                    [attr.aria-label]="
                      'packs.creator.words.' + form | translate
                    "
                    [placeholder]="'packs.creator.words.' + form | translate"
                    [ngModel]="newAdjective(id)[form]"
                    (ngModelChange)="setNewAdjective(id, form, $event)"
                  />
                }
                <p-button
                  data-test="add-kind-adjective"
                  icon="pi pi-plus"
                  severity="secondary"
                  [label]="'packs.creator.words.addAdjective' | translate"
                  [disabled]="!newAdjective(id).m.trim()"
                  (onClick)="addAdjective(id)"
                />
              </div>
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
                  'packs.creator.domain.namesHint' | translate
                }}</small>
                <textarea
                  pTextarea
                  rows="3"
                  data-test="kind-names"
                  [attr.aria-label]="'packs.creator.kinds.names' | translate"
                  [value]="
                    textsOf(id).names.join(
                      '
'
                    )
                  "
                  (change)="setNames(id, $event)"
                ></textarea>
              }
              @if (previews()[id]; as drawn) {
                <ul class="preview" data-test="preview-entries">
                  @for (entry of drawn; track $index) {
                    <li data-test="preview-entry">
                      <strong>{{ entry.name }}</strong>
                      <div>{{ entry.description }}</div>
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
    .field textarea,
    .texts > textarea {
      width: 100%;
      box-sizing: border-box;
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
    .preview {
      margin: 0;
      padding-left: 1rem;
    }
  `,
})
export class DomainKindsEditorComponent {
  readonly draft = input.required<PackDraft>();
  readonly issues = input<DraftIssue[]>([]);
  readonly domain = input.required<StructuredDomain>();
  readonly changed = output<PackDraft>();

  private readonly form = inject(PackDraftFormBusiness);
  private readonly language = inject(LanguageBusiness);

  protected readonly adding = signal(false);
  protected readonly known = signal<KnownKeys | null>(null);
  protected readonly suggestions = signal<string[]>([]);
  protected readonly previews = signal<Record<string, DomainPreview[]>>({});
  protected readonly namesOpen = signal<ReadonlySet<string>>(new Set());
  protected readonly forms = ['m', 'f'] as const;
  protected readonly line = wordLine;
  private readonly newAdjectives = signal<Record<string, AdjectiveForms>>({});
  private readonly newNouns = signal<Record<string, NewNoun>>({});
  private loads = 0;

  protected readonly neutral = computed(
    () => this.draft().details.language === undefined,
  );
  protected readonly ids = computed(() => [
    ...Object.keys(domainKindsOf(this.draft(), this.domain())),
    ...(this.adding() ? [''] : []),
  ]);
  private readonly kindKeys = computed(
    () => this.known()?.domainKinds[this.domain()] ?? [],
  );
  protected readonly roleOptions = computed(() =>
    NPC_ROLES.map((value) => ({
      value,
      label: this.language.t(`npc.role.${value}`),
    })),
  );
  protected readonly personOptions = computed(() => [
    { value: true, label: this.language.t('packs.creator.domain.personYes') },
    { value: false, label: this.language.t('packs.creator.domain.personNo') },
  ]);
  protected readonly typeOptions = computed(() =>
    SKILL_TYPES.map((value) => ({
      value,
      label: this.language.t(`skill.type.${value}`),
    })),
  );
  protected readonly effectOptions = computed(() =>
    SKILL_EFFECT_KINDS.map((value) => ({
      value,
      label: this.language.t(`skill.effectKind.${value}`),
    })),
  );
  protected readonly skillOptions = computed(() => {
    const keys = [...(this.known()?.domainKinds.skills ?? [])];
    for (const id of Object.keys(domainKindsOf(this.draft(), 'skills')))
      if (!keys.some((key) => key.id === id)) keys.push({ id });
    return keys.map((key) => ({ value: key.id, label: kindLabel(key) }));
  });
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
    });
  }

  protected fieldsOf(id: string): Fields {
    return domainKindsOf(this.draft(), this.domain())[id] ?? {};
  }

  protected listOrNothing(value: unknown): unknown[] | undefined {
    return Array.isArray(value) && value.length > 0 ? value : undefined;
  }

  protected issuesOf(id: string): DraftIssue[] {
    return id
      ? this.issues().filter(
          (issue) => issue.domain === this.domain() && issue.kind === id,
        )
      : [];
  }

  protected invalidId(id: string): boolean {
    return !KIND_ID.test(id);
  }

  protected labelOf(id: string): string {
    const kind = this.kindKeys().find((k) => k.id === id);
    return kind ? kindLabel(kind) : id;
  }

  protected suggest(query: string): void {
    const needle = query.toLowerCase();
    this.suggestions.set(
      this.kindKeys()
        .filter((kind) => kindLabel(kind).toLowerCase().includes(needle))
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
      if (value in domainKindsOf(this.draft(), this.domain())) return;
      this.adding.set(false);
      this.emit(setDomainKind(this.draft(), this.domain(), value, {}));
    } else this.emit(renameDomainKind(this.draft(), this.domain(), id, value));
  }

  protected commitParent(id: string, event: unknown): void {
    const parent = this.valueOf(event) || undefined;
    if (parent === this.fieldsOf(id)['parent']) return;
    // A child inherits the fields only a root may carry.
    this.emit(
      setDomainKind(
        this.draft(),
        this.domain(),
        id,
        parent
          ? { parent, type: undefined, person: undefined }
          : { parent: undefined },
      ),
    );
  }

  protected patch(id: string, fields: Fields): void {
    this.emit(setDomainKind(this.draft(), this.domain(), id, fields));
  }

  protected remove(id: string): void {
    this.emit(removeDomainKind(this.draft(), this.domain(), id));
  }

  // --- the texts --------------------------------------------------------------------------------------------

  protected textsOf(id: string) {
    return domainKindTextsOf(this.draft(), this.domain(), id);
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
      setDomainKindTexts(this.draft(), this.domain(), id, {
        nouns: [...this.textsOf(id).nouns, noun],
      }),
    );
    this.newNouns.update((all) => ({
      ...all,
      [id]: { text: '', plural: false },
    }));
  }

  protected removeNoun(id: string, index: number): void {
    this.emit(
      setDomainKindTexts(this.draft(), this.domain(), id, {
        nouns: this.textsOf(id).nouns.filter((_, i) => i !== index),
      }),
    );
  }

  protected setDescriptions(id: string, event: unknown): void {
    this.emit(
      setDomainKindTexts(this.draft(), this.domain(), id, {
        descriptions: lines(this.valueOf(event)),
      }),
    );
  }

  protected setNames(id: string, event: unknown): void {
    this.emit(
      setDomainKindTexts(this.draft(), this.domain(), id, {
        names: lines(this.valueOf(event)),
      }),
    );
  }

  protected toggleNames(id: string): void {
    this.namesOpen.update((open) => {
      const next = new Set(open);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  protected newAdjective(id: string): AdjectiveForms {
    return this.newAdjectives()[id] ?? EMPTY_FORMS;
  }

  protected setNewAdjective(
    id: string,
    form: keyof AdjectiveForms,
    value: string,
  ): void {
    this.newAdjectives.update((all) => ({
      ...all,
      [id]: { ...this.newAdjective(id), [form]: value },
    }));
  }

  protected addAdjective(id: string): void {
    const adjective = adjectiveOf(this.newAdjective(id));
    if (!adjective) return;
    this.emit(
      setDomainKindTexts(this.draft(), this.domain(), id, {
        adjectives: [...this.textsOf(id).adjectives, adjective],
      }),
    );
    this.newAdjectives.update((all) => ({ ...all, [id]: EMPTY_FORMS }));
  }

  protected removeAdjective(id: string, index: number): void {
    this.emit(
      setDomainKindTexts(this.draft(), this.domain(), id, {
        adjectives: this.textsOf(id).adjectives.filter((_, i) => i !== index),
      }),
    );
  }

  protected async preview(id: string): Promise<void> {
    const drawn = await this.form.previewDomain(
      this.draft(),
      this.domain(),
      id,
    );
    this.previews.update((all) => ({ ...all, [id]: drawn }));
  }
}
