import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { CoinDisplayComponent } from '../../../../core/components/coin-display/coin-display.component';
import { StoredImageComponent } from '../../../../core/components/stored-image/stored-image.component';
import { ItemDraft } from '../../../../core/models/item';
import { ItemCardComponent } from '../../../item/components/item-card/item-card.component';
import { InventoryItem } from '../../../world/models/world';
import { PublicShop } from '../../models/merchant';
import { sellPrice } from '../../helpers/merchant.rules';

/** A merchant's open shop for one player: what they can buy, what they can sell, and their money. */
@Component({
  selector: 'app-merchant-shop',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoPipe,
    ButtonModule,
    DialogModule,
    CoinDisplayComponent,
    ItemCardComponent,
    StoredImageComponent,
  ],
  template: `
    <header class="head">
      <h3>{{ shop().name }}</h3>
      <span class="money" data-testid="shop-money">
        {{ 'merchant.shop.money' | transloco }}
        <app-coin-display [copper]="money()" />
      </span>
    </header>

    <section>
      <h4>{{ 'merchant.shop.buy' | transloco }}</h4>
      @for (entry of shop().stock; track entry.id) {
        <div class="row" data-testid="shop-stock-item">
          <app-stored-image
            class="thumb"
            [imageId]="entry.item.imageId"
            [alt]="entry.item.name"
          />
          <span class="name">{{ entry.item.name }}</span>
          <app-coin-display
            class="price"
            data-field="price"
            [copper]="entry.price"
          />
          <button
            pButton
            type="button"
            data-action="details"
            icon="pi pi-eye"
            size="small"
            [text]="true"
            [rounded]="true"
            severity="secondary"
            [attr.aria-label]="'merchant.shop.details' | transloco"
            (click)="viewed.set(entry.item)"
          ></button>
          <button
            pButton
            type="button"
            data-action="buy"
            icon="pi pi-shopping-cart"
            size="small"
            [label]="'merchant.shop.buyAction' | transloco"
            [disabled]="money() < entry.price"
            (click)="buy.emit(entry.id)"
          ></button>
        </div>
      } @empty {
        <p class="empty">{{ 'merchant.shop.noStock' | transloco }}</p>
      }
    </section>

    <section>
      <h4>{{ 'merchant.shop.sell' | transloco }}</h4>
      @for (entry of sellable(); track entry.id) {
        <div class="row" data-testid="shop-sell-item">
          <app-stored-image
            class="thumb"
            [imageId]="entry.item.imageId"
            [alt]="entry.item.name"
          />
          <span class="name">{{ entry.item.name }}</span>
          <app-coin-display
            class="price"
            data-field="price"
            [copper]="entry.pays"
          />
          <button
            pButton
            type="button"
            data-action="details"
            icon="pi pi-eye"
            size="small"
            [text]="true"
            [rounded]="true"
            severity="secondary"
            [attr.aria-label]="'merchant.shop.details' | transloco"
            (click)="viewed.set(entry.item)"
          ></button>
          <button
            pButton
            type="button"
            data-action="sell"
            icon="pi pi-wallet"
            size="small"
            severity="secondary"
            [label]="'merchant.shop.sellAction' | transloco"
            (click)="sell.emit(entry.id)"
          ></button>
        </div>
      } @empty {
        <p class="empty">{{ 'merchant.shop.nothingToSell' | transloco }}</p>
      }
    </section>

    <p-dialog
      [visible]="!!viewed()"
      (visibleChange)="!$event && viewed.set(null)"
      [modal]="true"
      [dismissableMask]="true"
      appendTo="body"
      [header]="'merchant.shop.details' | transloco"
      [style]="{ width: 'min(28rem, calc(100vw - 2rem))' }"
    >
      @if (viewed(); as item) {
        <app-item-card [item]="item" />
      }
    </p-dialog>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    h3,
    h4,
    p {
      margin: 0;
    }
    .money {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.25rem 0;
      border-bottom: 1px solid var(--p-content-border-color);
    }
    .thumb {
      flex: none;
      width: 2.5rem;
      height: 2.5rem;
    }
    .name {
      flex: 1;
      min-width: 0;
    }
    .price {
      white-space: nowrap;
    }
  `,
})
export class MerchantShopComponent {
  readonly shop = input.required<PublicShop>();
  /** The player's copper. */
  readonly money = input.required<number>();
  readonly inventory = input.required<InventoryItem[]>();
  /** Emits the stock id. */
  readonly buy = output<string>();
  /** Emits the inventory id. */
  readonly sell = output<string>();

  /** The item whose details dialog is open, from the stock or the player's bag. */
  protected readonly viewed = signal<ItemDraft | null>(null);

  /** The player's unequipped items, with what the merchant pays for each. */
  protected readonly sellable = computed(() =>
    this.inventory()
      .filter((entry) => !entry.equipped)
      .map((entry) => ({
        ...entry,
        pays: sellPrice(entry.item.price, undefined, {
          merchantSellRatio: this.shop().sellRatio,
        }),
      })),
  );
}
