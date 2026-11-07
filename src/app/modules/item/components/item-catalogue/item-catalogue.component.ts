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
import { TranslocoPipe } from '@jsverse/transloco';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DataViewModule } from '@openng/optimus-ui/dataview';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MultiSelectModule } from '@openng/optimus-ui/multiselect';
import { SliderModule } from '@openng/optimus-ui/slider';
import { CoinDisplayComponent } from '../../../../core/components/coin-display/coin-display.component';
import { LanguageBusiness } from '../../../../core/business/language.business';
import {
  ITEM_RARITIES,
  ITEM_TYPES,
  ItemRarity,
  ItemType,
} from '../../../../core/models/item';
import { Item, World } from '../../../world/models/world';
import {
  filterCatalogue,
  priceBounds,
} from '../../helpers/item-catalogue.rules';
import { ItemCardComponent } from '../item-card/item-card.component';

/** A world's item catalogue: search and filters, a card per item, with give (when someone can receive), edit and delete. */
@Component({
  selector: 'app-item-catalogue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslocoPipe,
    ButtonModule,
    DataViewModule,
    InputTextModule,
    MultiSelectModule,
    SliderModule,
    CoinDisplayComponent,
    ItemCardComponent,
  ],
  template: `
    <div class="toolbar">
      <input
        pInputText
        data-field="search"
        type="search"
        [attr.aria-label]="'item.catalogue.search' | transloco"
        [placeholder]="'item.catalogue.search' | transloco"
        [value]="search()"
        (input)="search.set($any($event.target).value)"
        autocomplete="off"
      />
      <p-multiselect
        [options]="rarityOptions()"
        optionLabel="label"
        optionValue="value"
        [ngModel]="rarities()"
        (ngModelChange)="rarities.set($event ?? [])"
        [placeholder]="'item.fields.rarity' | transloco"
        [showToggleAll]="false"
        display="chip"
      />
      <p-multiselect
        [options]="typeOptions()"
        optionLabel="label"
        optionValue="value"
        [ngModel]="types()"
        (ngModelChange)="types.set($event ?? [])"
        [placeholder]="'item.fields.type' | transloco"
        [showToggleAll]="false"
        display="chip"
      />
      <div class="price">
        <span class="price-label">
          {{ 'item.catalogue.price' | transloco }}
          <app-coin-display [copper]="range()[0]" />
          {{ 'item.catalogue.priceTo' | transloco }}
          <app-coin-display [copper]="range()[1]" />
        </span>
        <p-slider
          [range]="true"
          [min]="bounds().min"
          [max]="bounds().max"
          [step]="100"
          [ngModel]="range()"
          (ngModelChange)="priceRange.set($event)"
        />
      </div>
      <button
        pButton
        type="button"
        data-action="create"
        icon="pi pi-plus-circle"
        [label]="'item.catalogue.create' | transloco"
        (click)="create.emit()"
      ></button>
      <button
        pButton
        type="button"
        data-action="add-defaults"
        icon="pi pi-plus"
        severity="secondary"
        [label]="'item.catalogue.addDefaults' | transloco"
        (click)="addDefaults.emit()"
      ></button>
    </div>

    <p-dataview [value]="shown()" layout="grid" [emptyMessage]="' '">
      <ng-template #grid let-items>
        <div class="grid">
          @for (item of items; track item.id) {
            <div class="entry">
              <app-item-card [item]="item" />
              <div class="actions">
                @if (canGive()) {
                  <button
                    pButton
                    type="button"
                    data-action="give"
                    icon="pi pi-gift"
                    [label]="'item.catalogue.give' | transloco"
                    (click)="give.emit(item)"
                  ></button>
                }
                <button
                  pButton
                  type="button"
                  data-action="edit"
                  icon="pi pi-pencil"
                  severity="secondary"
                  [text]="true"
                  [label]="'item.catalogue.edit' | transloco"
                  (click)="edit.emit(item)"
                ></button>
                <button
                  pButton
                  type="button"
                  data-action="delete"
                  icon="pi pi-trash"
                  severity="danger"
                  [text]="true"
                  [attr.aria-label]="'item.catalogue.delete' | transloco"
                  (click)="askDelete(item)"
                ></button>
              </div>
            </div>
          }
        </div>
      </ng-template>
      <ng-template #emptymessage>
        <p class="empty">{{ 'item.catalogue.empty' | transloco }}</p>
      </ng-template>
    </p-dataview>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }
    .price {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-width: 12rem;
    }
    .price-label {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
      gap: 1rem;
    }
    .entry {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .actions {
      display: flex;
      justify-content: space-between;
    }
    .empty {
      color: var(--p-text-muted-color);
    }
  `,
})
export class ItemCatalogueComponent {
  private readonly confirmation = inject(ConfirmationService);
  private readonly language = inject(LanguageBusiness);

  readonly world = input.required<World>();
  /** False when nobody can receive an item (the sandbox world). */
  readonly canGive = input(true);

  readonly give = output<Item>();
  readonly edit = output<Item>();
  readonly create = output<void>();
  readonly remove = output<Item>();
  readonly addDefaults = output<void>();

  protected readonly search = signal('');
  protected readonly rarities = signal<ItemRarity[]>([]);
  protected readonly types = signal<ItemType[]>([]);
  /** null until the slider moves: every price. */
  protected readonly priceRange = signal<number[] | null>(null);

  protected readonly bounds = computed(() => priceBounds(this.world().items));
  protected readonly range = computed(() => {
    const { min, max } = this.bounds();
    const picked = this.priceRange();
    return picked
      ? [Math.max(min, picked[0]), Math.min(max, picked[1])]
      : [min, max];
  });
  protected readonly shown = computed(() => {
    const [minPrice, maxPrice] = this.range();
    return filterCatalogue(this.world().items, {
      search: this.search(),
      rarities: this.rarities(),
      types: this.types(),
      minPrice,
      maxPrice,
    });
  });
  protected readonly rarityOptions = computed(() =>
    ITEM_RARITIES.map((value) => ({
      value,
      label: this.language.t('item.rarity.' + value),
    })),
  );
  protected readonly typeOptions = computed(() =>
    ITEM_TYPES.map((value) => ({
      value,
      label: this.language.t('item.type.' + value),
    })),
  );

  protected askDelete(item: Item): void {
    this.confirmation.confirm({
      header: this.language.t('item.catalogue.deleteTitle'),
      message: this.language.t('item.catalogue.deleteMessage', {
        name: item.name,
      }),
      icon: 'pi pi-trash',
      acceptButtonProps: {
        label: this.language.t('item.catalogue.delete'),
        severity: 'danger',
      },
      rejectButtonProps: {
        label: this.language.t('common.cancel'),
        severity: 'secondary',
        text: true,
      },
      accept: () => this.remove.emit(item),
    });
  }
}
