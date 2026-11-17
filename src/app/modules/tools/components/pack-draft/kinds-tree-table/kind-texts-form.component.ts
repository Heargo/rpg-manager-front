import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { AccordionModule } from '@openng/optimus-ui/accordion';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { LanguageBusiness } from '../../../../../core/business/language.business';
import { Gender, Noun } from '../../../../../core/generators/word-list';
import {
  AdjectiveForms,
  EMPTY_FORMS,
  adjectiveOf,
  suffixOf,
  wordLine,
} from '../words';
import { ITEM_RARITIES } from '../../../../../core/models/item';
import { ALL, KindTexts, TextsDomain } from './kind-texts';

/** The texts of a kind in the drawer form: nouns, descriptions, name templates, adjectives and suffixes. */
@Component({
  selector: 'app-kind-texts-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    AccordionModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
  ],
  template: `
    <div class="texts" data-test="kind-texts">
      @if (domain() === 'items') {
        <label class="field">
          {{ 'packs.creator.kinds.rarity' | translate }}
          <p-select
            data-test="texts-rarity"
            [options]="rarityOptions()"
            optionLabel="label"
            optionValue="value"
            [ngModel]="rarity()"
            (ngModelChange)="rarity.set($event)"
            [ariaLabel]="'packs.creator.kinds.rarity' | translate"
            [fluid]="true"
          />
          <small class="hint">{{
            'packs.creator.kinds.rarityHint' | translate
          }}</small>
        </label>
      }
      <p-accordion value="words">
        <p-accordion-panel value="words">
          <p-accordion-header>{{
            'packs.creator.kinds.nounsAndDescriptions' | translate
          }}</p-accordion-header>
          <p-accordion-content>
            <div class="section">
              <div class="chips">
                @for (noun of value().nouns; track $index; let i = $index) {
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
                      (onClick)="removeNoun(i)"
                    />
                  </span>
                }
              </div>
              <label class="field">
                {{ 'packs.creator.kinds.newNoun' | translate }}
                <input
                  pInputText
                  data-test="kind-new-noun"
                  type="text"
                  [ngModel]="noun().text"
                  (ngModelChange)="noun.set({ ...noun(), text: $event })"
                />
              </label>
              <label class="field">
                {{ 'packs.creator.kinds.gender' | translate }}
                <p-select
                  [options]="genderOptions()"
                  optionLabel="label"
                  optionValue="value"
                  [ngModel]="noun().gender"
                  (ngModelChange)="
                    noun.set({ ...noun(), gender: $event ?? undefined })
                  "
                  [showClear]="true"
                  [ariaLabel]="'packs.creator.kinds.gender' | translate"
                  [fluid]="true"
                />
              </label>
              <label class="check">
                <p-checkbox
                  [binary]="true"
                  [ngModel]="noun().plural"
                  (ngModelChange)="noun.set({ ...noun(), plural: !!$event })"
                />
                {{ 'packs.creator.kinds.plural' | translate }}
              </label>
              <div>
                <p-button
                  data-test="add-noun"
                  icon="pi pi-plus"
                  severity="secondary"
                  [label]="'packs.creator.kinds.addNoun' | translate"
                  [disabled]="!noun().text.trim()"
                  (onClick)="addNoun()"
                />
              </div>
              <label class="field">
                {{ 'packs.creator.kinds.descriptions' | translate }}
                <textarea
                  pTextarea
                  rows="4"
                  data-test="kind-descriptions"
                  [value]="value().descriptions"
                  (input)="patch({ descriptions: $any($event.target).value })"
                ></textarea>
              </label>
            </div>
          </p-accordion-content>
        </p-accordion-panel>
        @if (domain() !== 'shared') {
          <p-accordion-panel value="names">
            <p-accordion-header>{{
              'packs.creator.kinds.names' | translate
            }}</p-accordion-header>
            <p-accordion-content>
              <div class="section">
                <small class="hint">{{ namesHint() | translate }}</small>
                <label class="field">
                  {{ 'packs.creator.kinds.names' | translate }}
                  <textarea
                    pTextarea
                    rows="3"
                    [attr.data-test]="'kind-names-' + scope()"
                    [value]="value().names[scope()] ?? ''"
                    (input)="setName($any($event.target).value)"
                  ></textarea>
                </label>
              </div>
            </p-accordion-content>
          </p-accordion-panel>
        }
        <p-accordion-panel value="adjectives">
          <p-accordion-header>{{
            'packs.creator.domain.adjectives' | translate
          }}</p-accordion-header>
          <p-accordion-content>
            <div class="section">
              <div class="chips">
                @for (
                  adjective of value().adjectives[scope()] ?? [];
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
                      (onClick)="removeWord('adjectives', i)"
                    />
                  </span>
                }
              </div>
              @for (form of forms(); track form) {
                <label class="field">
                  {{ 'packs.creator.words.' + form | translate }}
                  <input
                    pInputText
                    type="text"
                    [attr.data-test]="
                      'kind-new-adjective-' + scope() + '-' + form
                    "
                    [ngModel]="newAdjective()[form]"
                    (ngModelChange)="setNewAdjective(form, $event)"
                  />
                </label>
              }
              <div>
                <p-button
                  [attr.data-test]="'add-kind-adjective-' + scope()"
                  icon="pi pi-plus"
                  severity="secondary"
                  [label]="'packs.creator.words.addAdjective' | translate"
                  [disabled]="!newAdjective().m.trim()"
                  (onClick)="addAdjective()"
                />
              </div>
            </div>
          </p-accordion-content>
        </p-accordion-panel>
        @if (domain() !== 'npcs' && domain() !== 'shared') {
          <p-accordion-panel value="suffixes">
            <p-accordion-header>{{
              'packs.creator.domain.top.suffixes' | translate
            }}</p-accordion-header>
            <p-accordion-content>
              <div class="section">
                <div class="chips">
                  @for (
                    suffix of value().suffixes[scope()] ?? [];
                    track $index;
                    let i = $index
                  ) {
                    <span class="chip">
                      {{ line(suffix) }}
                      <p-button
                        data-test="remove-suffix"
                        severity="secondary"
                        text
                        size="small"
                        icon="pi pi-times"
                        [ariaLabel]="'packs.creator.kinds.remove' | translate"
                        (onClick)="removeWord('suffixes', i)"
                      />
                    </span>
                  }
                </div>
                <label class="field">
                  {{ 'packs.creator.words.suffix' | translate }}
                  <input
                    pInputText
                    type="text"
                    [attr.data-test]="'kind-new-suffix-' + scope()"
                    [ngModel]="newSuffix()"
                    (ngModelChange)="setNewSuffix($event)"
                  />
                </label>
                <div>
                  <p-button
                    [attr.data-test]="'add-kind-suffix-' + scope()"
                    icon="pi pi-plus"
                    severity="secondary"
                    [label]="'packs.creator.words.addSuffix' | translate"
                    [disabled]="!newSuffix().trim()"
                    (onClick)="addSuffix()"
                  />
                </div>
              </div>
            </p-accordion-content>
          </p-accordion-panel>
        }
      </p-accordion>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
      max-width: 100%;
    }
    .texts,
    .section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-weight: 600;
    }
    .field input,
    .field textarea {
      width: 100%;
      box-sizing: border-box;
      font-weight: normal;
    }
    .hint {
      font-weight: normal;
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
      gap: 0.5rem;
    }
  `,
})
export class KindTextsFormComponent {
  readonly value = input.required<KindTexts>();
  readonly domain = input.required<TextsDomain>();
  readonly valueChange = output<KindTexts>();

  private readonly language = inject(LanguageBusiness);

  protected readonly noun = signal<{
    text: string;
    gender?: Gender;
    plural: boolean;
  }>({ text: '', plural: false });
  private readonly newAdjectives = signal<Record<string, AdjectiveForms>>({});
  private readonly newSuffixes = signal<Record<string, string>>({});
  protected readonly line = wordLine;
  /** The rarity whose names and words the sections show (items only). */
  protected readonly rarity = signal<string>('common');

  protected readonly scope = computed(() =>
    this.domain() === 'items' ? this.rarity() : ALL,
  );
  protected readonly forms = computed(() =>
    this.domain() === 'items'
      ? (['m', 'f', 'mp', 'fp', 'tint'] as const)
      : (['m', 'f'] as const),
  );
  protected readonly namesHint = computed(() =>
    this.domain() === 'items'
      ? 'packs.creator.kinds.namesHint'
      : 'packs.creator.domain.namesHint',
  );
  protected readonly rarityOptions = computed(() =>
    ITEM_RARITIES.map((value) => ({
      value,
      label: this.language.t(`item.rarity.${value}`),
    })),
  );
  protected readonly genderOptions = computed(() => [
    { value: 'm', label: this.language.t('packs.creator.kinds.masculine') },
    { value: 'f', label: this.language.t('packs.creator.kinds.feminine') },
  ]);

  protected patch(patch: Partial<KindTexts>): void {
    this.valueChange.emit({ ...this.value(), ...patch });
  }

  protected addNoun(): void {
    const { text, gender, plural } = this.noun();
    if (!text.trim()) return;
    const added: Noun = {
      text: text.trim(),
      ...(gender ? { gender } : {}),
      ...(plural ? { plural } : {}),
    };
    this.patch({ nouns: [...this.value().nouns, added] });
    this.noun.set({ text: '', plural: false });
  }

  protected removeNoun(index: number): void {
    this.patch({ nouns: this.value().nouns.filter((_, i) => i !== index) });
  }

  protected setName(text: string): void {
    this.patch({ names: { ...this.value().names, [this.scope()]: text } });
  }

  protected newAdjective(): AdjectiveForms {
    return this.newAdjectives()[this.scope()] ?? EMPTY_FORMS;
  }

  protected setNewAdjective(form: keyof AdjectiveForms, text: string): void {
    this.newAdjectives.update((all) => ({
      ...all,
      [this.scope()]: { ...this.newAdjective(), [form]: text },
    }));
  }

  protected addAdjective(): void {
    const scope = this.scope();
    const adjective = adjectiveOf(this.newAdjective());
    if (!adjective) return;
    this.patch({
      adjectives: {
        ...this.value().adjectives,
        [scope]: [...(this.value().adjectives[scope] ?? []), adjective],
      },
    });
    this.newAdjectives.update((all) => ({ ...all, [scope]: EMPTY_FORMS }));
  }

  protected newSuffix(): string {
    return this.newSuffixes()[this.scope()] ?? '';
  }

  protected setNewSuffix(text: string): void {
    this.newSuffixes.update((all) => ({ ...all, [this.scope()]: text }));
  }

  protected addSuffix(): void {
    const scope = this.scope();
    const suffix = suffixOf(this.newSuffix());
    if (!suffix) return;
    this.patch({
      suffixes: {
        ...this.value().suffixes,
        [scope]: [...(this.value().suffixes[scope] ?? []), suffix],
      },
    });
    this.newSuffixes.update((all) => ({ ...all, [scope]: '' }));
  }

  protected removeWord(field: 'adjectives' | 'suffixes', index: number): void {
    const scope = this.scope();
    this.patch({
      [field]: {
        ...this.value()[field],
        [scope]: (this.value()[field][scope] ?? []).filter(
          (_, i) => i !== index,
        ),
      },
    });
  }
}
