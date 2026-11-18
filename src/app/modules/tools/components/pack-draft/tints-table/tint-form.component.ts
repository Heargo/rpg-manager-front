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
import { AutoCompleteModule } from '@openng/optimus-ui/autocomplete';
import { ColorPickerModule } from '@openng/optimus-ui/colorpicker';
import { MultiSelectModule } from '@openng/optimus-ui/multiselect';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { LanguageBusiness } from '../../../../../core/business/language.business';
import { ITEM_RARITIES } from '../../../../../core/models/item';
import { TintForm, TintFormError, gradientCss } from './tint-fields';

type Stop = 'shadow' | 'mid' | 'light';

/** The form of a tint in the drawer: one column, titled sections General, Gradient, Fits and Texts. */
@Component({
  selector: 'app-tint-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    ColorPickerModule,
    AutoCompleteModule,
    SelectModule,
    MultiSelectModule,
    TextareaModule,
  ],
  template: `
    <div class="form" data-test="tint-form">
      <section data-test="section-identity">
        <h4 data-test="section-title">
          {{ 'packs.creator.kinds.sectionIdentity' | translate }}
        </h4>
        <div class="field">
          <label for="tint-id-input">{{
            'packs.creator.tints.id' | translate
          }}</label>
          <p-autocomplete
            data-test="tint-id"
            inputId="tint-id-input"
            [ngModel]="form().id"
            (ngModelChange)="patch({ id: $event ?? '' })"
            [suggestions]="suggestions()"
            (completeMethod)="suggest($event.query)"
            [ariaLabel]="'packs.creator.tints.id' | translate"
            [fluid]="true"
          />
          @if (error() === 'kebab') {
            <small class="error">{{
              'packs.creator.kinds.kebab' | translate
            }}</small>
          } @else if (error() === 'duplicate') {
            <small class="error">{{
              'packs.creator.kinds.duplicate' | translate
            }}</small>
          }
        </div>
      </section>
      <section data-test="section-generation">
        <h4 data-test="section-title">
          {{ 'packs.creator.kinds.sectionGeneration' | translate }}
        </h4>
        <span class="label">{{
          'packs.creator.tints.gradientTitle' | translate
        }}</span>
        <span class="swatch" [attr.style]="'background:' + gradient()"></span>
        <div class="colors">
          @for (which of whiches(); track which) {
            <label class="color">
              <p-colorpicker
                [attr.data-test]="'tint-color-' + which"
                format="hex"
                [ngModel]="color(which)"
                (ngModelChange)="setColor(which, $event)"
                [attr.aria-label]="'packs.creator.tints.' + which | translate"
              />
              {{ 'packs.creator.tints.' + which | translate }}
            </label>
          }
        </div>
        <div class="field">
          <span class="label">{{
            'packs.creator.tints.fitsTitle' | translate
          }}</span>
          <p-multiselect
            data-test="tint-fits"
            [options]="fitOptions()"
            optionLabel="label"
            optionValue="value"
            [ngModel]="form().fits"
            (onChange)="patch({ fits: $event.value ?? [] })"
            [showToggleAll]="false"
            [selectedItemsLabel]="
              'packs.creator.tints.selectedItems' | translate
            "
            [maxSelectedLabels]="2"
            [filter]="true"
            [placeholder]="'packs.creator.tints.fitsAny' | translate"
            [ariaLabel]="'packs.creator.tints.fits' | translate"
            [fluid]="true"
          />
        </div>
      </section>
      @if (form().texts; as texts) {
        <section data-test="section-texts">
          <h4 data-test="section-title">
            {{ 'packs.creator.kinds.sectionTexts' | translate }}
          </h4>
          <small class="hint">{{
            'packs.creator.tints.adjectivesHint' | translate
          }}</small>
          <div class="field">
            <label for="tint-rarity-input">{{
              'packs.creator.kinds.rarity' | translate
            }}</label>
            <p-select
              data-test="texts-rarity"
              inputId="tint-rarity-input"
              [options]="rarityOptions()"
              optionLabel="label"
              optionValue="value"
              [ngModel]="rarity()"
              (ngModelChange)="rarity.set($event)"
              [ariaLabel]="'packs.creator.kinds.rarity' | translate"
              [fluid]="true"
            />
            <small class="hint">{{
              'packs.creator.tints.rarityHint' | translate
            }}</small>
          </div>
          <div class="field">
            <label [for]="'tint-adjective-' + rarity()">{{
              'packs.creator.tints.adjectives' | translate
            }}</label>
            <textarea
              pTextarea
              rows="3"
              [id]="'tint-adjective-' + rarity()"
              [attr.data-test]="'tint-adjective-' + rarity()"
              [value]="texts.adjectives[rarity()] ?? ''"
              (input)="setText('adjectives', rarity(), $event)"
            ></textarea>
          </div>
          <div class="field">
            <label [for]="'tint-suffix-' + rarity()">{{
              'packs.creator.tints.suffixes' | translate
            }}</label>
            <textarea
              pTextarea
              rows="3"
              [id]="'tint-suffix-' + rarity()"
              [attr.data-test]="'tint-suffix-' + rarity()"
              [value]="texts.suffixes[rarity()] ?? ''"
              (input)="setText('suffixes', rarity(), $event)"
            ></textarea>
          </div>
          <div class="field">
            <label for="tint-descriptions">{{
              'packs.creator.tints.descriptions' | translate
            }}</label>
            <textarea
              pTextarea
              rows="3"
              id="tint-descriptions"
              data-test="tint-descriptions"
              [value]="texts.descriptions"
              (input)="setText('descriptions', '', $event)"
            ></textarea>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
      max-width: 100%;
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    h4 {
      margin: 0;
      padding-bottom: 0.25rem;
      border-bottom: 1px solid var(--p-content-border-color);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--p-text-muted-color);
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .field label,
    .label {
      font-weight: 600;
    }
    .field input,
    .field textarea,
    .field > span {
      width: 100%;
      box-sizing: border-box;
    }
    .swatch {
      height: 1.5rem;
      border-radius: 0.3rem;
      border: 1px solid var(--p-content-border-color);
    }
    .colors {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .color {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .error {
      color: var(--p-red-500);
    }
  `,
})
export class TintFormComponent {
  readonly form = input.required<TintForm>();
  readonly error = input<TintFormError>(null);
  readonly fitOptions = input<{ value: string; label: string }[]>([]);
  readonly formChange = output<TintForm>();

  private readonly language = inject(LanguageBusiness);
  readonly known = input<string[]>([]);

  protected readonly suggestions = signal<string[]>([]);
  /** The rarity whose adjectives and suffixes are shown. */
  protected readonly rarity = signal<string>('common');
  protected readonly rarityOptions = computed(() =>
    ITEM_RARITIES.map((value) => ({
      value,
      label: this.language.t(`item.rarity.${value}`),
    })),
  );
  protected readonly gradient = computed(() => gradientCss(this.form().stops));
  protected readonly whiches = computed<Stop[]>(() =>
    this.form().stops.length > 2
      ? ['shadow', 'mid', 'light']
      : ['shadow', 'light'],
  );

  protected suggest(query: string): void {
    const needle = query.toLowerCase();
    this.suggestions.set(this.known().filter((id) => id.includes(needle)));
  }

  protected patch(change: Partial<TintForm>): void {
    this.formChange.emit({ ...this.form(), ...change });
  }

  private index(which: Stop): number {
    const last = this.form().stops.length - 1;
    return which === 'shadow' ? 0 : which === 'light' ? last : 1;
  }

  protected color(which: Stop): string {
    return this.form().stops[this.index(which)]?.color ?? '#000000';
  }

  protected setColor(which: Stop, value: unknown): void {
    if (typeof value !== 'string' || !value) return;
    const color = value.startsWith('#') ? value : `#${value}`;
    const at = this.index(which);
    const stops = this.form().stops.map((stop) => ({ ...stop }));
    if (!stops[at] || stops[at].color === color) return;
    stops[at].color = color;
    this.patch({ stops });
  }

  protected setText(
    field: 'adjectives' | 'suffixes' | 'descriptions',
    rarity: string,
    event: Event,
  ): void {
    const texts = this.form().texts;
    if (!texts) return;
    const value = (event.target as HTMLTextAreaElement).value;
    this.patch({
      texts:
        field === 'descriptions'
          ? { ...texts, descriptions: value }
          : { ...texts, [field]: { ...texts[field], [rarity]: value } },
    });
  }
}
