import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { SelectModule } from '@openng/optimus-ui/select';
import { LanguageBusiness } from '../../../../core/business/language.business';

export interface MappingAttribute {
  id: string;
  name: string;
}

/** Asks the game master, for each attribute the packs' content uses and the world lacks: map it, add it or skip it. */
@Component({
  selector: 'app-pack-attribute-mapping',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslatePipe, ButtonModule, SelectModule],
  template: `
    <section class="mapping">
      <h2>{{ 'packImport.title' | translate }}</h2>
      <p class="hint">{{ 'packImport.hint' | translate }}</p>
      @for (attribute of missing(); track attribute.id) {
        <div class="row" data-field="attribute">
          <strong>{{ attribute.name }}</strong>
          <p-select
            data-field="choice"
            [options]="options()"
            optionLabel="label"
            optionValue="value"
            [ngModel]="choice(attribute.id)"
            (ngModelChange)="choose(attribute.id, $event)"
            [attr.aria-label]="'packImport.attribute' | translate"
          />
        </div>
      }
      <div class="actions">
        <button
          pButton
          type="button"
          data-action="cancel"
          severity="secondary"
          [text]="true"
          [label]="'packImport.cancel' | translate"
          (click)="cancelled.emit()"
        ></button>
        <button
          pButton
          type="button"
          data-action="confirm"
          icon="pi pi-check"
          [label]="'packImport.confirm' | translate"
          (click)="confirmed.emit(mapping())"
        ></button>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      /* keeps the panel clear of the sticky nav bar (60px) */
      scroll-margin-top: 5rem;
    }
    .mapping {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    h2,
    .hint {
      margin: 0;
    }
    .hint {
      color: var(--p-text-muted-color);
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .row p-select {
      min-width: 14rem;
      max-width: 100%;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.5rem;
    }
  `,
})
export class PackAttributeMappingComponent {
  private readonly language = inject(LanguageBusiness);

  constructor() {
    // Shown when the GM may be looking elsewhere (the save button at the bottom of the rules page).
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    // One more frame: the page may still be laying out (and anchoring its scroll) when the panel is created.
    afterNextRender(() =>
      requestAnimationFrame(() =>
        host.scrollIntoView?.({ behavior: 'smooth', block: 'start' }),
      ),
    );
  }

  /** The pack attributes the world lacks. */
  readonly missing = input.required<MappingAttribute[]>();
  /** The world's attributes, to map onto. */
  readonly attributes = input<MappingAttribute[]>([]);

  /** `{ <packAttributeId>: 'add' | 'skip' | <worldAttributeId> }` */
  readonly confirmed = output<Record<string, string>>();
  readonly cancelled = output<void>();

  private readonly chosen = signal<Record<string, string>>({});

  protected readonly options = computed(() => [
    { value: 'add', label: this.language.t('packImport.add') },
    { value: 'skip', label: this.language.t('packImport.skip') },
    ...this.attributes().map((a) => ({ value: a.id, label: a.name })),
  ]);

  protected readonly mapping = computed(() =>
    Object.fromEntries(
      this.missing().map((a) => [a.id, this.chosen()[a.id] ?? 'add']),
    ),
  );

  protected choice(id: string): string {
    return this.mapping()[id];
  }

  protected choose(id: string, value: string): void {
    this.chosen.update((current) => ({ ...current, [id]: value }));
  }
}
