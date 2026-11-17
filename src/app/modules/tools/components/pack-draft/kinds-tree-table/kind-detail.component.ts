import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageModule } from '@openng/optimus-ui/message';
import { LanguageBusiness } from '../../../../../core/business/language.business';
import { DraftIssue } from '../../../../../core/business/pack-draft-form.business';
import { domainKindsOf } from '../../../../../core/packs/pack-draft-edits';
import { PackDraft } from '../../../../../core/packs/pack-draft';
import { wordLine } from '../words';
import {
  Domain,
  Drawn,
  FIELDS,
  FIELD_LABEL,
  Row,
  displayField,
} from './kind-fields';
import { KindPreviewComponent } from './kind-preview.component';
import { readTexts, scopesOf } from './kind-texts';

/** The read-only summary of a kind in the drawer: its fields, texts, sprite coverage and issues. */
@Component({
  selector: 'app-kind-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, MessageModule, KindPreviewComponent],
  template: `
    <div class="detail" data-test="kind-detail">
      <h3>{{ kind().label }}</h3>
      <dl>
        <dt>{{ 'packs.creator.kinds.id' | translate }}</dt>
        <dd>{{ kind().id }}</dd>
        <dt>{{ 'packs.creator.kinds.parent' | translate }}</dt>
        <dd>
          {{ parent() || ('packs.creator.kinds.none' | translate) }}
        </dd>
        @for (field of fields(); track field) {
          <dt>{{ fieldLabel(field) | translate }}</dt>
          <dd>
            {{ shown(field) || ('packs.creator.kinds.none' | translate) }}
          </dd>
        }
      </dl>
      @if (texted()) {
        <h4>{{ 'packs.creator.kinds.texts' | translate }}</h4>
        @if (textRows().length) {
          <dl data-test="detail-texts">
            @for (row of textRows(); track $index) {
              <dt>{{ row.label }}</dt>
              <dd>{{ row.value }}</dd>
            }
          </dl>
        }
        <app-kind-preview [entries]="drawn()" (run)="preview.emit()" />
      }
      @if (uncovered()) {
        <p-message data-test="kind-coverage" severity="info" size="small">{{
          'packs.creator.kinds.uncovered' | translate: { kinds: kind().id }
        }}</p-message>
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
export class KindDetailComponent {
  readonly kind = input.required<Row>();
  readonly draft = input.required<PackDraft>();
  readonly domain = input.required<Domain>();
  readonly parent = input('');
  readonly issues = input<DraftIssue[]>([]);
  readonly uncovered = input(false);
  readonly drawn = input<Drawn[] | null>(null);
  readonly preview = output<void>();

  private readonly language = inject(LanguageBusiness);

  protected readonly texted = computed(
    () => this.draft().details.language !== undefined,
  );
  protected readonly fields = computed(() => FIELDS[this.domain()]);

  protected fieldLabel(field: string): string {
    return FIELD_LABEL[field];
  }

  protected shown(field: string): string {
    return displayField(
      (key) => this.language.t(key),
      this.domain(),
      field,
      this.kind().fields[field],
    );
  }

  /** The texts of the kind as label / value lines; none for a pack without a language. */
  protected readonly textRows = computed(() => {
    if (!this.texted()) return [];
    const domain = this.domain();
    const texts = readTexts(this.draft(), domain, this.kind().id);
    const rows: { label: string; value: string }[] = [];
    const add = (key: string, scope: string, value: string) => {
      if (!value) return;
      const rarity =
        scope === 'all' ? '' : ` (${this.language.t(`item.rarity.${scope}`)})`;
      rows.push({ label: this.language.t(key) + rarity, value });
    };
    add(
      'packs.creator.kinds.nouns',
      'all',
      texts.nouns
        .map(
          (n) =>
            n.text +
            (n.gender ? ` (${n.gender})` : '') +
            (n.plural ? ' pl.' : ''),
        )
        .join(', '),
    );
    add(
      'packs.creator.kinds.descriptions',
      'all',
      texts.descriptions.split('\n').join(' / '),
    );
    for (const scope of scopesOf(domain)) {
      add(
        'packs.creator.kinds.names',
        scope,
        (texts.names[scope] ?? '').split('\n').join(' / '),
      );
      add(
        'packs.creator.domain.adjectives',
        scope,
        (texts.adjectives[scope] ?? []).map(wordLine).join(', '),
      );
      add(
        'packs.creator.domain.top.suffixes',
        scope,
        (texts.suffixes[scope] ?? []).map(wordLine).join(', '),
      );
    }
    return rows;
  });
}
