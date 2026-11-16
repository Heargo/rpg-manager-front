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
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { DraftIssue } from '../../../../../core/business/pack-draft-form.business';
import { PackDraft } from '../../../../../core/packs/pack-draft';
import {
  domainTopOf,
  setDomainTexts,
  StructuredDomain,
} from '../../../../../core/packs/pack-draft-edits';
import { AdjectiveForms, EMPTY_FORMS, adjectiveOf, wordLine } from '../words';

type ListType = 'given' | 'adjective' | 'phrase';

interface ListDef {
  name: string;
  type: ListType;
}

/** The top-level lists of each domain's language file. */
const LISTS: Record<StructuredDomain, ListDef[]> = {
  npcs: [
    { name: 'given', type: 'given' },
    { name: 'epithets', type: 'adjective' },
    { name: 'templates', type: 'phrase' },
  ],
  skills: [
    { name: 'templates', type: 'phrase' },
    { name: 'adjectives', type: 'adjective' },
    { name: 'suffixes', type: 'phrase' },
  ],
  classes: [
    { name: 'templates', type: 'phrase' },
    { name: 'adjectives', type: 'adjective' },
    { name: 'suffixes', type: 'phrase' },
  ],
};

/** The language lists of the NPC, skill or class file (given names, epithets, templates, adjectives, suffixes); only for a pack with a language. */
@Component({
  selector: 'app-domain-texts-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    ButtonModule,
    InputTextModule,
    MessageModule,
    SelectModule,
  ],
  template: `
    @if (!neutral()) {
      <div class="lists">
        @for (list of lists(); track list.name) {
          <div class="list">
            <span class="label">{{
              'packs.creator.domain.top.' + list.name | translate
            }}</span>
            <div class="entries" [attr.data-test]="'top-' + list.name">
              @for (
                entry of entriesOf(list.name);
                track $index;
                let i = $index
              ) {
                <span class="chip">
                  {{ show(entry) }}
                  <p-button
                    [attr.data-test]="'remove-top-' + list.name + '-' + i"
                    severity="secondary"
                    text
                    size="small"
                    icon="pi pi-times"
                    [ariaLabel]="'packs.creator.kinds.remove' | translate"
                    (onClick)="remove(list.name, i)"
                  />
                </span>
              }
            </div>
            <div class="line">
              @if (list.type === 'adjective') {
                @for (form of forms; track form) {
                  <input
                    pInputText
                    type="text"
                    [attr.data-test]="
                      form === 'm'
                        ? 'top-new-' + list.name
                        : 'top-new-' + list.name + '-' + form
                    "
                    [attr.aria-label]="
                      'packs.creator.words.' + form | translate
                    "
                    [placeholder]="'packs.creator.words.' + form | translate"
                    [ngModel]="adjective(list.name)[form]"
                    (ngModelChange)="setAdjective(list.name, form, $event)"
                  />
                }
              } @else {
                <input
                  pInputText
                  type="text"
                  [attr.data-test]="'top-new-' + list.name"
                  [attr.aria-label]="
                    'packs.creator.domain.top.' + list.name | translate
                  "
                  [placeholder]="
                    'packs.creator.domain.top.' + list.name | translate
                  "
                  [ngModel]="typed()[list.name] ?? ''"
                  (ngModelChange)="setTyped(list.name, $event)"
                />
              }
              @if (list.type === 'given') {
                <p-select
                  [options]="genderOptions"
                  optionLabel="label"
                  optionValue="value"
                  [ngModel]="gender()"
                  (ngModelChange)="gender.set($event ?? 'm')"
                  [ariaLabel]="'packs.creator.kinds.gender' | translate"
                />
              }
              <p-button
                [attr.data-test]="'add-top-' + list.name"
                icon="pi pi-plus"
                severity="secondary"
                [label]="'packs.creator.kinds.addNoun' | translate"
                [disabled]="!canAdd(list)"
                (onClick)="add(list)"
              />
            </div>
          </div>
        }
        @for (issue of ownIssues(); track $index) {
          <p-message
            data-test="issue"
            size="small"
            [severity]="issue.level === 'error' ? 'error' : 'warn'"
            >{{ issue.message }}</p-message
          >
        }
      </div>
    }
  `,
  styles: `
    .lists {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .line,
    .entries {
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
export class DomainTextsEditorComponent {
  readonly draft = input.required<PackDraft>();
  readonly issues = input<DraftIssue[]>([]);
  readonly domain = input.required<StructuredDomain>();
  readonly changed = output<PackDraft>();

  protected readonly forms = ['m', 'f'] as const;
  protected readonly genderOptions = [
    { value: 'm', label: 'm' },
    { value: 'f', label: 'f' },
  ];
  protected readonly gender = signal<'m' | 'f'>('m');
  protected readonly typed = signal<Record<string, string>>({});
  private readonly adjectives = signal<Record<string, AdjectiveForms>>({});

  protected readonly neutral = computed(
    () => this.draft().details.language === undefined,
  );
  protected readonly lists = computed(() => LISTS[this.domain()]);
  /** The issues of the language file itself: a kind issue shows next to its row in the kinds editor. */
  protected readonly ownIssues = computed(() =>
    this.issues().filter(
      (issue) => issue.domain === this.domain() && issue.kind === undefined,
    ),
  );

  protected entriesOf(name: string): unknown[] {
    return domainTopOf(this.draft(), this.domain(), name);
  }

  protected show(entry: unknown): string {
    const given = entry as { text?: string; gender?: string };
    return typeof entry === 'object' && given.gender && given.text
      ? `${given.text} (${given.gender})`
      : wordLine(entry);
  }

  protected adjective(name: string): AdjectiveForms {
    return this.adjectives()[name] ?? EMPTY_FORMS;
  }

  protected setAdjective(
    name: string,
    form: keyof AdjectiveForms,
    value: string,
  ): void {
    this.adjectives.update((all) => ({
      ...all,
      [name]: { ...this.adjective(name), [form]: value },
    }));
  }

  protected setTyped(name: string, value: string): void {
    this.typed.update((all) => ({ ...all, [name]: value }));
  }

  protected canAdd(list: ListDef): boolean {
    return list.type === 'adjective'
      ? !!this.adjective(list.name).m.trim()
      : !!(this.typed()[list.name] ?? '').trim();
  }

  protected add(list: ListDef): void {
    let entry: unknown;
    if (list.type === 'adjective') {
      entry = adjectiveOf(this.adjective(list.name));
      this.adjectives.update((all) => ({ ...all, [list.name]: EMPTY_FORMS }));
    } else {
      const text = (this.typed()[list.name] ?? '').trim();
      entry = list.type === 'given' ? { text, gender: this.gender() } : text;
      this.typed.update((all) => ({ ...all, [list.name]: '' }));
    }
    if (!entry) return;
    this.changed.emit(
      setDomainTexts(this.draft(), this.domain(), {
        [list.name]: [...this.entriesOf(list.name), entry],
      }),
    );
  }

  protected remove(name: string, index: number): void {
    this.changed.emit(
      setDomainTexts(this.draft(), this.domain(), {
        [name]: this.entriesOf(name).filter((_, i) => i !== index),
      }),
    );
  }
}
