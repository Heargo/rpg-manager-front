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
import { ChipListComponent } from '../chip-list/chip-list.component';
import {
  DetailText,
  DetailTextsComponent,
} from '../detail-texts/detail-texts.component';
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
  imports: [
    TranslatePipe,
    MessageModule,
    KindPreviewComponent,
    ChipListComponent,
    DetailTextsComponent,
  ],
  template: `
    <div class="detail" data-test="kind-detail">
      <section data-test="section-identity">
        <h4 data-test="section-title">
          {{ 'packs.creator.kinds.sectionIdentity' | translate }}
        </h4>
        <h3>{{ kind().label }}</h3>
        <dl>
          <dt>{{ 'packs.creator.kinds.id' | translate }}</dt>
          <dd>{{ kind().id }}</dd>
          <dt>{{ 'packs.creator.kinds.parent' | translate }}</dt>
          <dd>
            @if (parent()) {
              {{ parent() }}
            } @else {
              <span class="none" data-test="detail-none">{{
                'packs.creator.kinds.none' | translate
              }}</span>
            }
          </dd>
        </dl>
      </section>
      <section data-test="section-generation">
        <h4 data-test="section-title">
          {{ 'packs.creator.kinds.sectionGeneration' | translate }}
        </h4>
        <dl>
          @for (field of fields(); track field) {
            <dt>{{ fieldLabel(field) | translate }}</dt>
            <dd>
              @let values = shown(field);
              @if (values.length > 1 || isList(field)) {
                <app-chip-list [names]="values" />
              } @else if (values.length) {
                {{ values[0] }}
              } @else {
                <span class="none" data-test="detail-none">{{
                  'packs.creator.kinds.none' | translate
                }}</span>
              }
            </dd>
          }
        </dl>
      </section>
      @if (texted()) {
        <section data-test="section-texts">
          <h4 data-test="section-title">
            {{ 'packs.creator.kinds.sectionTexts' | translate }}
          </h4>
          <app-detail-texts [rows]="textRows()" />
        </section>
        <section data-test="section-try">
          <h4 data-test="section-title">
            {{ 'packs.creator.kinds.sectionTry' | translate }}
          </h4>
          <app-kind-preview [entries]="drawn()" (run)="preview.emit()" />
        </section>
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
    section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--p-content-border-color);
    }
    h3 {
      margin: 0;
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

  protected isList(field: string): boolean {
    return Array.isArray(this.kind().fields[field]);
  }

  /** The displayed values of a field: one per list item, none when empty. */
  protected shown(field: string): string[] {
    const value = this.kind().fields[field];
    const one = (v: unknown) =>
      displayField((key) => this.language.t(key), this.domain(), field, v);
    return (Array.isArray(value) ? value : [value])
      .map(one)
      .filter((text) => text !== '');
  }

  /** The texts of the kind as label / value lines; none for a pack without a language. */
  protected readonly textRows = computed((): DetailText[] => {
    if (!this.texted()) return [];
    const domain = this.domain();
    const texts = readTexts(this.draft(), domain, this.kind().id);
    const rows: DetailText[] = [];
    const scoped = (key: string, scope: string) =>
      this.language.t(key) +
      (scope === 'all' ? '' : ` (${this.language.t(`item.rarity.${scope}`)})`);
    const lines = (text: string) => text.split('\n').filter((l) => l.trim());
    if (texts.nouns.length)
      rows.push({
        label: this.language.t('packs.creator.kinds.nouns'),
        chips: texts.nouns.map(
          (n) =>
            n.text +
            (n.gender ? ` (${n.gender})` : '') +
            (n.plural ? ' pl.' : ''),
        ),
      });
    const descriptions = lines(texts.descriptions);
    if (descriptions.length)
      rows.push({
        label: this.language.t('packs.creator.kinds.descriptions'),
        lines: descriptions,
      });
    for (const scope of scopesOf(domain)) {
      const names = lines(texts.names[scope] ?? '');
      if (names.length)
        rows.push({
          label: scoped('packs.creator.kinds.names', scope),
          lines: names,
        });
      const adjectives = (texts.adjectives[scope] ?? []).map(wordLine);
      if (adjectives.length)
        rows.push({
          label: scoped('packs.creator.domain.adjectives', scope),
          lines: adjectives,
        });
      const suffixes = (texts.suffixes[scope] ?? []).map(wordLine);
      if (suffixes.length)
        rows.push({
          label: scoped('packs.creator.domain.top.suffixes', scope),
          lines: suffixes,
        });
    }
    return rows;
  });
}
