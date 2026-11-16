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
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import {
  DraftIssue,
  PackDraftFormBusiness,
} from '../../../../../core/business/pack-draft-form.business';
import { PackDraft } from '../../../../../core/packs/pack-draft';
import {
  paramsOf,
  removeParam,
  renameParam,
  setParam,
} from '../../../../../core/packs/pack-draft-edits';

/** The params shared by every generator of the pack's language: a name and its phrases. */
@Component({
  selector: 'app-params-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    AutoCompleteModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
  ],
  template: `
    @if (neutral()) {
      <p class="hint" data-test="params-neutral">
        {{ 'packs.creator.params.neutral' | translate }}
      </p>
    } @else {
      <div class="params">
        @for (name of names(); track name) {
          <div class="row" [attr.data-test]="'param-row-' + name">
            <div class="line">
              <p-autocomplete
                data-test="param-name"
                [ngModel]="name"
                [suggestions]="suggestions()"
                (completeMethod)="suggest($event.query)"
                [ariaLabel]="'packs.creator.params.name' | translate"
                [placeholder]="'packs.creator.params.name' | translate"
                (onBlur)="commitName(name, $event)"
              />
              @if (name) {
                <p-button
                  data-test="remove-param"
                  severity="danger"
                  outlined
                  icon="pi pi-trash"
                  [ariaLabel]="'packs.creator.params.remove' | translate"
                  (onClick)="remove(name)"
                />
              }
            </div>
            @for (issue of issuesOf(name); track $index) {
              <p-message
                data-test="issue"
                size="small"
                [severity]="issue.level === 'error' ? 'error' : 'warn'"
                >{{ issue.message }}</p-message
              >
            }
            <ul class="entries">
              @for (entry of entriesOf(name); track $index; let i = $index) {
                <li>
                  <span>{{ entry }}</span>
                  <p-button
                    data-test="remove-entry"
                    severity="secondary"
                    text
                    size="small"
                    icon="pi pi-times"
                    [ariaLabel]="'packs.creator.params.removeEntry' | translate"
                    (onClick)="removeEntry(name, i)"
                  />
                </li>
              }
            </ul>
            <div class="line">
              <input
                pInputText
                data-test="param-new-entry"
                type="text"
                [attr.aria-label]="'packs.creator.params.newEntry' | translate"
                [placeholder]="'packs.creator.params.newEntry' | translate"
                [ngModel]="newEntry()[name] ?? ''"
                (ngModelChange)="setNewEntry(name, $event)"
                (keydown.enter)="addEntry(name)"
              />
              <p-button
                data-test="add-entry"
                icon="pi pi-plus"
                severity="secondary"
                [label]="'packs.creator.params.addEntry' | translate"
                [disabled]="!(newEntry()[name] ?? '').trim()"
                (onClick)="addEntry(name)"
              />
            </div>
          </div>
        }
        <div>
          <p-button
            data-test="add-param"
            icon="pi pi-plus"
            severity="secondary"
            [label]="'packs.creator.params.add' | translate"
            [disabled]="adding()"
            (onClick)="adding.set(true)"
          />
        </div>
      </div>
    }
  `,
  styles: `
    .params {
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
      gap: 0.5rem;
    }
    .entries {
      margin: 0;
      padding-left: 1rem;
    }
    .entries li {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
  `,
})
export class ParamsEditorComponent {
  readonly draft = input.required<PackDraft>();
  readonly issues = input<DraftIssue[]>([]);
  readonly changed = output<PackDraft>();

  private readonly form = inject(PackDraftFormBusiness);

  protected readonly adding = signal(false);
  protected readonly suggestions = signal<string[]>([]);
  protected readonly newEntry = signal<Record<string, string>>({});
  /** The name typed in the row being added, which is not in the draft until it has a phrase. */
  private readonly pendingName = signal('');
  private readonly known = signal<string[]>([]);
  private loads = 0;

  protected readonly neutral = computed(
    () => this.draft().details.language === undefined,
  );
  protected readonly names = computed(() => {
    const existing = Object.keys(paramsOf(this.draft()));
    return this.adding() && !existing.includes(this.pendingName())
      ? [...existing, this.pendingName()]
      : existing;
  });

  constructor() {
    effect(() => {
      const draft = this.draft();
      const load = ++this.loads;
      void this.form
        .knownKeys(draft)
        .then((keys) => load === this.loads && this.known.set(keys.params));
    });
  }

  protected issuesOf(name: string): DraftIssue[] {
    return name ? this.issues().filter((issue) => issue.param === name) : [];
  }

  protected suggest(query: string): void {
    const needle = query.toLowerCase();
    this.suggestions.set(this.known().filter((name) => name.includes(needle)));
  }

  protected entriesOf(name: string): string[] {
    return paramsOf(this.draft())[name] ?? [];
  }

  private valueOf(event: unknown): string {
    return ((event as Event).target as HTMLInputElement).value.trim();
  }

  protected commitName(name: string, event: unknown): void {
    const value = this.valueOf(event);
    if (!value || value === name) return;
    if (name === this.pendingName() && !(name in paramsOf(this.draft()))) {
      this.pendingName.set(value);
      return;
    }
    this.changed.emit(renameParam(this.draft(), name, value));
  }

  protected remove(name: string): void {
    if (name in paramsOf(this.draft()))
      this.changed.emit(removeParam(this.draft(), name));
    else this.adding.set(false);
  }

  protected setNewEntry(name: string, text: string): void {
    this.newEntry.update((all) => ({ ...all, [name]: text }));
  }

  protected addEntry(name: string): void {
    const text = (this.newEntry()[name] ?? '').trim();
    if (!text || !name) return;
    this.changed.emit(
      setParam(this.draft(), name, [...this.entriesOf(name), text]),
    );
    this.newEntry.update((all) => ({ ...all, [name]: '' }));
    this.adding.set(false);
    this.pendingName.set('');
  }

  protected removeEntry(name: string, index: number): void {
    this.changed.emit(
      setParam(
        this.draft(),
        name,
        this.entriesOf(name).filter((_, i) => i !== index),
      ),
    );
  }
}
