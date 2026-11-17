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
import { TintRow, adjectiveLine, gradientCss } from './tint-fields';

/** The read-only summary of a tint in the drawer: gradient, fits, texts and issues. */
@Component({
  selector: 'app-tint-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, MessageModule],
  template: `
    <div class="detail" data-test="tint-detail">
      <h3>{{ tint().id }}</h3>
      <span class="swatch" [attr.style]="'background:' + gradient()"></span>
      <dl>
        <dt>{{ 'packs.creator.tints.fits' | translate }}</dt>
        <dd>
          @for (fit of tint().fits; track fit) {
            <div>{{ fit }}</div>
          } @empty {
            {{ 'packs.creator.tints.fitsAny' | translate }}
          }
        </dd>
      </dl>
      @if (textRows().length) {
        <h4>{{ 'packs.creator.tints.textsTitle' | translate }}</h4>
        <dl data-test="detail-texts">
          @for (row of textRows(); track $index) {
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          }
        </dl>
      }
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
    h3,
    h4 {
      margin: 0;
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

  /** The texts of the tint as label / value lines; none for a pack without a language. */
  protected readonly textRows = computed(() => {
    const draft = this.draft();
    if (draft.details.language === undefined) return [];
    const texts = tintTextsOf(draft, this.tint().id);
    const rows: { label: string; value: string }[] = [];
    const add = (key: string, rarity: string, value: string) => {
      if (!value) return;
      const scope = rarity
        ? ` (${this.language.t(`item.rarity.${rarity}`)})`
        : '';
      rows.push({ label: this.language.t(key) + scope, value });
    };
    for (const rarity of ITEM_RARITIES) {
      add(
        'packs.creator.tints.adjectives',
        rarity,
        (texts.adjectives[rarity] ?? []).map(adjectiveLine).join(', '),
      );
      add(
        'packs.creator.tints.suffixes',
        rarity,
        (texts.suffixes[rarity] ?? []).join(', '),
      );
    }
    add('packs.creator.tints.descriptions', '', texts.descriptions.join(' / '));
    return rows;
  });
}
