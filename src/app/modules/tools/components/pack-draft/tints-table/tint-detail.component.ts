import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageModule } from '@openng/optimus-ui/message';
import { LanguageBusiness } from '../../../../../core/business/language.business';
import { DraftIssue } from '../../../../../core/business/pack-draft-form.business';
import { ITEM_RARITIES } from '../../../../../core/models/item';
import { PackDraft } from '../../../../../core/packs/pack-draft';
import { tintTextsOf } from '../../../../../core/packs/pack-draft-edits';
import { ChipListComponent } from '../chip-list/chip-list.component';
import {
  DetailText,
  DetailTextsComponent,
} from '../detail-texts/detail-texts.component';
import { TintRow, adjectiveLine, gradientCss } from './tint-fields';

/** The read-only summary of a tint in the drawer: gradient, fits, texts and issues. */
@Component({
  selector: 'app-tint-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    MessageModule,
    ChipListComponent,
    DetailTextsComponent,
  ],
  template: `
    <div class="detail" data-test="tint-detail">
      <section data-test="section-identity">
        <h4 data-test="section-title">
          {{ 'packs.creator.kinds.sectionIdentity' | translate }}
        </h4>
        <dl>
          <dt>{{ 'packs.creator.tints.id' | translate }}</dt>
          <dd>{{ tint().id }}</dd>
        </dl>
      </section>
      <section data-test="section-generation">
        <h4 data-test="section-title">
          {{ 'packs.creator.kinds.sectionGeneration' | translate }}
        </h4>
        <span class="swatch" [attr.style]="'background:' + gradient()"></span>
        <dl>
          <dt>{{ 'packs.creator.tints.fits' | translate }}</dt>
          <dd>
            @if (tint().fits.length) {
              <app-chip-list [names]="tint().fits" />
            } @else {
              <span class="none">{{
                'packs.creator.tints.fitsAny' | translate
              }}</span>
            }
          </dd>
        </dl>
      </section>
      <section data-test="section-texts">
        <h4 data-test="section-title">
          {{ 'packs.creator.kinds.sectionTexts' | translate }}
        </h4>
        <app-detail-texts [rows]="textRows()" />
      </section>
      @for (issue of issues(); track $index) {
        <p-message
          size="small"
          [severity]="issue.level === 'error' ? 'error' : 'warn'"
          >{{ issue.message }}</p-message
        >
      }
    </div>
  `,
  styles: `
    .detail {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--p-content-border-color);
    }
    h4 {
      margin: 0;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--p-text-muted-color);
    }
    .none {
      color: var(--p-text-muted-color);
    }
    .swatch {
      height: 1.5rem;
      border-radius: 0.3rem;
      border: 1px solid var(--p-content-border-color);
    }
    dl {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 0.25rem 1rem;
      margin: 0;
    }
    dt {
      font-weight: 600;
    }
    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
  `,
})
export class TintDetailComponent {
  readonly tint = input.required<TintRow>();
  readonly draft = input.required<PackDraft>();
  readonly issues = input<DraftIssue[]>([]);

  private readonly language = inject(LanguageBusiness);

  protected readonly gradient = computed(() => gradientCss(this.tint().stops));

  /** The texts of the tint as labelled lines; none for a pack without a language. */
  protected readonly textRows = computed((): DetailText[] => {
    const draft = this.draft();
    if (draft.details.language === undefined) return [];
    const texts = tintTextsOf(draft, this.tint().id);
    const rows: DetailText[] = [];
    const add = (key: string, rarity: string, lines: string[]) => {
      if (!lines.length) return;
      const scope = rarity
        ? ` (${this.language.t(`item.rarity.${rarity}`)})`
        : '';
      rows.push({ label: this.language.t(key) + scope, lines });
    };
    for (const rarity of ITEM_RARITIES) {
      add(
        'packs.creator.tints.adjectives',
        rarity,
        (texts.adjectives[rarity] ?? []).map(adjectiveLine),
      );
      add('packs.creator.tints.suffixes', rarity, texts.suffixes[rarity] ?? []);
    }
    add('packs.creator.tints.descriptions', '', texts.descriptions);
    return rows;
  });
}
