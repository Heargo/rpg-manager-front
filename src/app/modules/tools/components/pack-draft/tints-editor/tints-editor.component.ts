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
import { ColorPickerModule } from '@openng/optimus-ui/colorpicker';
import { MessageModule } from '@openng/optimus-ui/message';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import {
  DraftIssue,
  PackDraftFormBusiness,
} from '../../../../../core/business/pack-draft-form.business';
import { Adjective } from '../../../../../core/generators/word-list';
import { ITEM_RARITIES, ItemRarity } from '../../../../../core/models/item';
import { GradientStop } from '../../../../../core/packs/pack';
import { KIND_ID } from '../../../../../core/packs/pack-kinds';
import { PackDraft } from '../../../../../core/packs/pack-draft';
import {
  removeTint,
  renameTint,
  setTint,
  setTintTexts,
  tintTextsOf,
} from '../../../../../core/packs/pack-draft-edits';

/** A new tint: dark red, orange, yellow. */
const DEFAULT_GRADIENT: GradientStop[] = [
  { position: 0, color: '#5a0a0a' },
  { position: 0.5, color: '#c2410c' },
  { position: 1, color: '#fde047' },
];

const lines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/** "Ardent|Ardente|Ardents|Ardentes" is a gendered adjective (m|f|mp|fp), anything else a plain one. */
function parseAdjective(line: string): Adjective {
  const [m, f, mp, fp] = line.split('|').map((part) => part.trim());
  if (!f) return m;
  return { m, f, ...(mp ? { mp } : {}), ...(fp ? { fp } : {}) };
}

const adjectiveLine = (adjective: Adjective): string =>
  typeof adjective === 'string'
    ? adjective
    : [adjective.m, adjective.f, adjective.mp, adjective.fp]
        .join('|')
        .replace(/\|+$/, '');

/** The tints of the pack: id, a 3 colour gradient, and for a pack with a language their adjectives, suffixes and descriptions. */
@Component({
  selector: 'app-tints-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    AutoCompleteModule,
    ButtonModule,
    ColorPickerModule,
    MessageModule,
    TextareaModule,
  ],
  template: `
    <div class="tints">
      @for (id of ids(); track id) {
        <div class="row" [attr.data-test]="'tint-row-' + id">
          <div class="line">
            <p-autocomplete
              data-test="tint-id"
              [ngModel]="id"
              [suggestions]="suggestions()"
              (completeMethod)="suggest($event.query)"
              [ariaLabel]="'packs.creator.tints.id' | translate"
              [placeholder]="'packs.creator.tints.id' | translate"
              (onBlur)="commitId(id, $event)"
            />
            @if (id) {
              <span class="swatch" [style.background]="swatch(id)"></span>
              <label class="color">
                <p-colorpicker
                  data-test="tint-color-shadow"
                  format="hex"
                  [ngModel]="color(id, 'shadow')"
                  (ngModelChange)="setColor(id, 'shadow', $event)"
                  [attr.aria-label]="'packs.creator.tints.shadow' | translate"
                />
                {{ 'packs.creator.tints.shadow' | translate }}
              </label>
              @if (stops(id).length > 2) {
                <label class="color">
                  <p-colorpicker
                    data-test="tint-color-mid"
                    format="hex"
                    [ngModel]="color(id, 'mid')"
                    (ngModelChange)="setColor(id, 'mid', $event)"
                    [attr.aria-label]="'packs.creator.tints.mid' | translate"
                  />
                  {{ 'packs.creator.tints.mid' | translate }}
                </label>
              }
              <label class="color">
                <p-colorpicker
                  data-test="tint-color-light"
                  format="hex"
                  [ngModel]="color(id, 'light')"
                  (ngModelChange)="setColor(id, 'light', $event)"
                  [attr.aria-label]="'packs.creator.tints.light' | translate"
                />
                {{ 'packs.creator.tints.light' | translate }}
              </label>
              <p-button
                data-test="remove-tint"
                severity="danger"
                outlined
                icon="pi pi-trash"
                [ariaLabel]="'packs.creator.tints.remove' | translate"
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
            <small class="hint">{{
              'packs.creator.tints.adjectivesHint' | translate
            }}</small>
            <div class="rarities">
              @for (rarity of rarities; track rarity) {
                <label class="field">
                  {{ 'packs.creator.tints.adjectives' | translate }} ·
                  {{ 'item.rarity.' + rarity | translate }}
                  <textarea
                    pTextarea
                    rows="2"
                    [attr.data-test]="'tint-adjective-' + rarity"
                    [value]="adjectivesOf(id, rarity)"
                    (change)="setAdjectives(id, rarity, $event)"
                  ></textarea>
                </label>
              }
            </div>
            <div class="rarities">
              @for (rarity of rarities; track rarity) {
                <label class="field">
                  {{ 'packs.creator.tints.suffixes' | translate }} ·
                  {{ 'item.rarity.' + rarity | translate }}
                  <textarea
                    pTextarea
                    rows="2"
                    [attr.data-test]="'tint-suffix-' + rarity"
                    [value]="suffixesOf(id, rarity)"
                    (change)="setSuffixes(id, rarity, $event)"
                  ></textarea>
                </label>
              }
            </div>
            <label class="field">
              {{ 'packs.creator.tints.descriptions' | translate }}
              <textarea
                pTextarea
                rows="2"
                data-test="tint-descriptions"
                [value]="descriptionsOf(id)"
                (change)="setDescriptions(id, $event)"
              ></textarea>
            </label>
          }
        </div>
      }
      <div>
        <p-button
          data-test="add-tint"
          icon="pi pi-plus"
          severity="secondary"
          [label]="'packs.creator.tints.add' | translate"
          [disabled]="adding()"
          (onClick)="adding.set(true)"
        />
      </div>
    </div>
  `,
  styles: `
    .tints {
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
    .line {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
    }
    .color {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .swatch {
      width: 6rem;
      height: 1.25rem;
      border-radius: 0.3rem;
      border: 1px solid var(--p-content-border-color);
    }
    .rarities {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
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
    .error {
      color: var(--p-red-500);
    }
  `,
})
export class TintsEditorComponent {
  readonly draft = input.required<PackDraft>();
  readonly issues = input<DraftIssue[]>([]);
  readonly changed = output<PackDraft>();

  private readonly form = inject(PackDraftFormBusiness);

  protected readonly rarities = ITEM_RARITIES;
  protected readonly adding = signal(false);
  protected readonly suggestions = signal<string[]>([]);
  private readonly known = signal<string[]>([]);
  private loads = 0;

  protected readonly neutral = computed(
    () => this.draft().details.language === undefined,
  );
  protected readonly ids = computed(() => [
    ...Object.keys(this.draft().tints),
    ...(this.adding() ? [''] : []),
  ]);

  constructor() {
    effect(() => {
      const draft = this.draft();
      const load = ++this.loads;
      void this.form
        .knownKeys(draft)
        .then((keys) => load === this.loads && this.known.set(keys.tints));
    });
  }

  protected issuesOf(id: string): DraftIssue[] {
    return id ? this.issues().filter((issue) => issue.tint === id) : [];
  }

  protected invalidId(id: string): boolean {
    return !KIND_ID.test(id);
  }

  protected suggest(query: string): void {
    const needle = query.toLowerCase();
    this.suggestions.set(this.known().filter((id) => id.includes(needle)));
  }

  private emit(draft: PackDraft): void {
    this.changed.emit(draft);
  }

  private valueOf(event: unknown): string {
    return (
      (event as Event).target as HTMLInputElement | HTMLTextAreaElement
    ).value.trim();
  }

  // --- the tint ---------------------------------------------------------------------------------------------

  protected commitId(id: string, event: unknown): void {
    const value = this.valueOf(event);
    if (!value || value === id) return;
    if (id === '') {
      if (value in this.draft().tints) return;
      this.adding.set(false);
      this.emit(
        setTint(
          this.draft(),
          value,
          DEFAULT_GRADIENT.map((stop) => ({ ...stop })),
        ),
      );
    } else this.emit(renameTint(this.draft(), id, value));
  }

  protected remove(id: string): void {
    this.emit(removeTint(this.draft(), id));
  }

  protected stops(id: string): GradientStop[] {
    return this.draft().tints[id]?.gradient ?? [];
  }

  protected swatch(id: string): string {
    const stops = [...this.stops(id)].sort((a, b) => a.position - b.position);
    return `linear-gradient(to right, ${stops.map((s) => `${s.color} ${Math.round(s.position * 100)}%`).join(', ')})`;
  }

  protected color(id: string, which: 'shadow' | 'mid' | 'light'): string {
    const stops = this.stops(id);
    const stop =
      which === 'shadow'
        ? stops[0]
        : which === 'light'
          ? stops[stops.length - 1]
          : stops[1];
    return stop?.color ?? '#000000';
  }

  protected setColor(
    id: string,
    which: 'shadow' | 'mid' | 'light',
    value: unknown,
  ): void {
    if (typeof value !== 'string' || !value) return;
    const color = value.startsWith('#') ? value : `#${value}`;
    const stops = this.stops(id).map((stop) => ({ ...stop }));
    const at =
      which === 'shadow' ? 0 : which === 'light' ? stops.length - 1 : 1;
    if (!stops[at] || stops[at].color === color) return;
    stops[at].color = color;
    this.emit(setTint(this.draft(), id, stops));
  }

  // --- the texts --------------------------------------------------------------------------------------------

  protected adjectivesOf(id: string, rarity: ItemRarity): string {
    return (tintTextsOf(this.draft(), id).adjectives[rarity] ?? [])
      .map(adjectiveLine)
      .join('\n');
  }

  protected setAdjectives(
    id: string,
    rarity: ItemRarity,
    event: unknown,
  ): void {
    const adjectives = {
      ...tintTextsOf(this.draft(), id).adjectives,
      [rarity]: lines(this.valueOf(event)).map(parseAdjective),
    };
    this.emit(setTintTexts(this.draft(), id, { adjectives }));
  }

  protected suffixesOf(id: string, rarity: ItemRarity): string {
    return (tintTextsOf(this.draft(), id).suffixes[rarity] ?? []).join('\n');
  }

  protected setSuffixes(id: string, rarity: ItemRarity, event: unknown): void {
    const suffixes = {
      ...tintTextsOf(this.draft(), id).suffixes,
      [rarity]: lines(this.valueOf(event)),
    };
    this.emit(setTintTexts(this.draft(), id, { suffixes }));
  }

  protected descriptionsOf(id: string): string {
    return tintTextsOf(this.draft(), id).descriptions.join('\n');
  }

  protected setDescriptions(id: string, event: unknown): void {
    this.emit(
      setTintTexts(this.draft(), id, {
        descriptions: lines(this.valueOf(event)),
      }),
    );
  }
}
