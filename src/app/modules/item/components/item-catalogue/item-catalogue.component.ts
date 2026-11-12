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
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MultiSelectModule } from '@openng/optimus-ui/multiselect';
import { SliderModule } from '@openng/optimus-ui/slider';
import { StoredImageComponent } from '../../../../core/components/stored-image/stored-image.component';
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

/** A world's item catalogue: search and filters, an inventory grid of slots; the selected one gets give (when someone can receive), edit and delete. */
@Component({
  selector: 'app-item-catalogue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslocoPipe,
    ButtonModule,
    InputTextModule,
    MultiSelectModule,
    SliderModule,
    CoinDisplayComponent,
    StoredImageComponent,
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

    <div class="inventory">
      @if (shown().length) {
        <div class="grid" role="listbox">
          @for (item of shown(); track item.id) {
            <button
              type="button"
              class="slot"
              data-field="slot"
              role="option"
              [attr.data-rarity]="item.rarity"
              [attr.aria-selected]="selected()?.id === item.id"
              [class.selected]="selected()?.id === item.id"
              (click)="select(item)"
            >
              <span class="art">
                @if (item.imageId) {
                  <app-stored-image
                    class="image"
                    [imageId]="item.imageId"
                    [alt]="item.name"
                  />
                } @else {
                  <i
                    data-field="slot-kind-icon"
                    [class]="kindIcons[item.type]"
                    aria-hidden="true"
                  ></i>
                }
              </span>
              <span class="name">{{ item.name }}</span>
              <span class="price" data-field="slot-price">
                <app-coin-display [copper]="item.price" />
              </span>
            </button>
          }
        </div>
      } @else {
        <p class="empty">{{ 'item.catalogue.empty' | transloco }}</p>
      }

      @if (selected(); as current) {
        <aside
          class="panel"
          data-field="slot-actions"
          [attr.aria-label]="'item.catalogue.selected' | transloco"
        >
          <strong class="panel-name">{{ current.name }}</strong>
          <div class="actions">
            <button
              pButton
              type="button"
              data-action="view"
              icon="pi pi-eye"
              severity="secondary"
              [label]="'item.catalogue.view' | transloco"
              (click)="viewing.set(!viewing())"
            ></button>
            @if (canGive()) {
              <button
                pButton
                type="button"
                data-action="give"
                icon="pi pi-gift"
                [label]="'item.catalogue.give' | transloco"
                (click)="give.emit(current)"
              ></button>
            }
            <button
              pButton
              type="button"
              data-action="edit"
              icon="pi pi-pencil"
              severity="secondary"
              [label]="'item.catalogue.edit' | transloco"
              (click)="edit.emit(current)"
            ></button>
            <button
              pButton
              type="button"
              data-action="delete"
              icon="pi pi-trash"
              severity="danger"
              [text]="true"
              [attr.aria-label]="'item.catalogue.delete' | transloco"
              (click)="askDelete(current)"
            ></button>
          </div>
          @if (viewing()) {
            <app-item-card [item]="current" />
          }
        </aside>
      }
    </div>
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
    .inventory {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: flex-start;
    }
    .grid {
      flex: 1 1 24rem;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
      gap: 0.5rem;
    }
    .panel {
      flex: 1 1 16rem;
      max-width: 24rem;
      position: sticky;
      top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 0.75rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: 0.5rem;
      background: var(--p-content-background);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .slot {
      --rarity: var(--p-surface-400);
      aspect-ratio: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      gap: 0.15rem;
      padding: 0.25rem;
      overflow: hidden;
      border: 2px solid var(--rarity);
      border-radius: 0.5rem;
      background: var(--p-content-background);
      color: var(--p-text-color);
      font: inherit;
      font-size: 0.75rem;
      cursor: pointer;
    }
    .slot[data-rarity='uncommon'] {
      --rarity: var(--p-green-500);
    }
    .slot[data-rarity='rare'] {
      --rarity: var(--p-blue-500);
    }
    .slot[data-rarity='mythic'] {
      --rarity: var(--p-orange-500);
    }
    .slot[data-rarity='legendary'] {
      --rarity: var(--p-red-500);
    }
    .slot:hover {
      background: var(--p-content-hover-background);
    }
    .slot.selected {
      background: var(--p-highlight-background);
      box-shadow: 0 0 0 2px var(--p-primary-color);
    }
    .slot:focus-visible {
      outline: 2px solid var(--p-primary-color);
      outline-offset: 2px;
    }
    .art {
      flex: 1;
      min-height: 0;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: clamp(2rem, 4vw, 3rem);
      color: var(--rarity);
    }
    .image {
      width: 100%;
      height: 100%;
    }
    .name {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
    }
    .price {
      display: block;
      max-width: 100%;
      min-width: 0;
      color: var(--p-text-muted-color);
      font-size: 0.65rem;
      line-height: 1.1;
    }
    // Coins wrap and stay inside the slot (the display is nowrap by default).
    .price ::ng-deep app-coin-display {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0 0.3rem;
      white-space: normal;
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

  protected readonly kindIcons: Record<ItemType, string> = {
    item: 'pi pi-box',
    consumable: 'pi pi-heart',
    equipment: 'pi pi-shield',
  };
  protected readonly selectedId = signal<string | null>(null);
  protected readonly viewing = signal(false);
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

  /** The selected item, as long as it is still in the catalogue. */
  protected readonly selected = computed(
    () => this.world().items.find((i) => i.id === this.selectedId()) ?? null,
  );

  protected select(item: Item): void {
    if (this.selectedId() !== item.id) this.viewing.set(false);
    this.selectedId.set(item.id);
  }

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
