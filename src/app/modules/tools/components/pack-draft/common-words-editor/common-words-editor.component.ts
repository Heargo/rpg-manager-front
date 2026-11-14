import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { DraftIssue } from '../../../../../core/business/pack-draft-form.business';
import { Adjective } from '../../../../../core/generators/word-list';
import { ITEM_RARITIES, ItemRarity } from '../../../../../core/models/item';
import { PackDraft } from '../../../../../core/packs/pack-draft';
import {
  commonWordsOf,
  setCommonWords,
} from '../../../../../core/packs/pack-draft-edits';
import { AdjectiveForms, EMPTY_FORMS, adjectiveOf, wordLine } from '../words';

/** The adjectives and suffixes any item of the language can take, per rarity (the top level of the items word list). */
@Component({
  selector: 'app-common-words-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslatePipe, ButtonModule, InputTextModule],
  template: `
    @if (!neutral()) {
      <div class="common">
        <div class="line">
          <p-button
            data-test="toggle-common-words"
            severity="secondary"
            text
            [icon]="open() ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
            [label]="'packs.creator.words.common' | translate"
            (onClick)="open.set(!open())"
          />
        </div>
        @if (open()) {
          <small class="hint">{{
            'packs.creator.words.commonHint' | translate
          }}</small>
          @for (rarity of rarities; track rarity) {
            <div class="words">
              <span class="label">{{
                'item.rarity.' + rarity | translate
              }}</span>
              <div class="line">
                @for (
                  adjective of words().adjectives[rarity] ?? [];
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
                      [ariaLabel]="'packs.creator.words.remove' | translate"
                      (onClick)="removeAdjective(rarity, i)"
                    />
                  </span>
                }
                @for (
                  suffix of words().suffixes[rarity] ?? [];
                  track $index;
                  let i = $index
                ) {
                  <span class="chip">
                    {{ suffix }}
                    <p-button
                      severity="secondary"
                      text
                      size="small"
                      icon="pi pi-times"
                      [ariaLabel]="'packs.creator.words.remove' | translate"
                      (onClick)="removeSuffix(rarity, i)"
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
                      'common-new-adjective-' + rarity + '-' + form
                    "
                    [attr.aria-label]="
                      'packs.creator.words.' + form | translate
                    "
                    [placeholder]="'packs.creator.words.' + form | translate"
                    [ngModel]="newAdjective(rarity)[form]"
                    (ngModelChange)="setNewAdjective(rarity, form, $event)"
                  />
                }
                <p-button
                  [attr.data-test]="'add-common-adjective-' + rarity"
                  icon="pi pi-plus"
                  severity="secondary"
                  [label]="'packs.creator.words.addAdjective' | translate"
                  [disabled]="!newAdjective(rarity).m.trim()"
                  (onClick)="addAdjective(rarity)"
                />
              </div>
              <div class="line">
                <input
                  pInputText
                  type="text"
                  [attr.data-test]="'common-new-suffix-' + rarity"
                  [attr.aria-label]="'packs.creator.words.suffix' | translate"
                  [placeholder]="'packs.creator.words.suffix' | translate"
                  [ngModel]="newSuffix(rarity)"
                  (ngModelChange)="setNewSuffix(rarity, $event)"
                />
                <p-button
                  [attr.data-test]="'add-common-suffix-' + rarity"
                  icon="pi pi-plus"
                  severity="secondary"
                  [label]="'packs.creator.words.addSuffix' | translate"
                  [disabled]="!newSuffix(rarity).trim()"
                  (onClick)="addSuffix(rarity)"
                />
              </div>
            </div>
          }
        }
      </div>
    }
  `,
  styles: `
    .common,
    .words {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .line {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
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
    .label {
      font-weight: 600;
    }
  `,
})
export class CommonWordsEditorComponent {
  readonly draft = input.required<PackDraft>();
  readonly issues = input<DraftIssue[]>([]);
  readonly changed = output<PackDraft>();

  protected readonly rarities = ITEM_RARITIES;
  protected readonly forms = ['m', 'f', 'mp', 'fp'] as const;
  protected readonly line = wordLine;
  protected readonly open = signal(false);
  private readonly newAdjectives = signal<
    Partial<Record<ItemRarity, AdjectiveForms>>
  >({});
  private readonly newSuffixes = signal<Partial<Record<ItemRarity, string>>>(
    {},
  );

  protected readonly neutral = computed(
    () => this.draft().details.language === undefined,
  );
  protected readonly words = computed(() => commonWordsOf(this.draft()));

  protected newAdjective(rarity: ItemRarity): AdjectiveForms {
    return this.newAdjectives()[rarity] ?? EMPTY_FORMS;
  }

  protected setNewAdjective(
    rarity: ItemRarity,
    form: keyof AdjectiveForms,
    value: string,
  ): void {
    this.newAdjectives.update((all) => ({
      ...all,
      [rarity]: { ...this.newAdjective(rarity), [form]: value },
    }));
  }

  protected addAdjective(rarity: ItemRarity): void {
    const adjective = adjectiveOf({ ...this.newAdjective(rarity), tint: '' });
    if (!adjective) return;
    const adjectives = {
      ...this.words().adjectives,
      [rarity]: [...(this.words().adjectives[rarity] ?? []), adjective],
    };
    this.changed.emit(setCommonWords(this.draft(), { adjectives }));
    this.newAdjectives.update((all) => ({ ...all, [rarity]: EMPTY_FORMS }));
  }

  protected removeAdjective(rarity: ItemRarity, index: number): void {
    const adjectives = {
      ...this.words().adjectives,
      [rarity]: (this.words().adjectives[rarity] ?? []).filter(
        (_: Adjective, i: number) => i !== index,
      ),
    };
    this.changed.emit(setCommonWords(this.draft(), { adjectives }));
  }

  protected newSuffix(rarity: ItemRarity): string {
    return this.newSuffixes()[rarity] ?? '';
  }

  protected setNewSuffix(rarity: ItemRarity, value: string): void {
    this.newSuffixes.update((all) => ({ ...all, [rarity]: value }));
  }

  protected addSuffix(rarity: ItemRarity): void {
    const text = this.newSuffix(rarity).trim();
    if (!text) return;
    const suffixes = {
      ...this.words().suffixes,
      [rarity]: [...(this.words().suffixes[rarity] ?? []), text],
    };
    this.changed.emit(setCommonWords(this.draft(), { suffixes }));
    this.newSuffixes.update((all) => ({ ...all, [rarity]: '' }));
  }

  protected removeSuffix(rarity: ItemRarity, index: number): void {
    const suffixes = {
      ...this.words().suffixes,
      [rarity]: (this.words().suffixes[rarity] ?? []).filter(
        (_, i) => i !== index,
      ),
    };
    this.changed.emit(setCommonWords(this.draft(), { suffixes }));
  }
}
