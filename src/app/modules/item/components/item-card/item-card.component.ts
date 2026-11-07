import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CardModule } from '@openng/optimus-ui/card';
import { TagModule } from '@openng/optimus-ui/tag';
import { ItemDraft } from '../../../../core/models/item';
import { RARITY_SEVERITY } from '../../helpers/item-display';

/** An item at a glance: name, rarity, type and slot, price, modifiers, description. */
@Component({
  selector: 'app-item-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, CardModule, TagModule],
  template: `
    @let item = this.item();
    <p-card styleClass="item-card">
      <div class="head">
        <h2>{{ item.name }}</h2>
        <p-tag
          [value]="'item.rarity.' + item.rarity | transloco"
          [severity]="severity[item.rarity]"
        />
      </div>
      <p class="kind">
        {{ 'item.type.' + item.type | transloco }}
        @if (item.slot !== 'none') {
          · {{ 'item.slot.' + item.slot | transloco }}
        }
      </p>
      @if (item.modifiers.length) {
        <ul class="modifiers" [attr.aria-label]="'item.modifiers' | transloco">
          @for (modifier of item.modifiers; track modifier.attribute) {
            <li [class.malus]="modifier.value < 0">
              <span>{{ modifier.attribute }}</span>
              <strong
                >{{ modifier.value > 0 ? '+' : '' }}{{ modifier.value }}</strong
              >
            </li>
          }
        </ul>
      }
      <p class="description">{{ item.description }}</p>
      <p class="price">
        <i class="pi pi-wallet"></i>
        {{ 'item.price' | transloco: { price: item.price } }}
      </p>
    </p-card>
  `,
  styles: `
    :host {
      display: block;
    }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }
    h2 {
      margin: 0;
      font-size: 1.25rem;
      overflow-wrap: anywhere;
    }
    .kind {
      margin: 0.25rem 0 0.75rem;
      color: var(--p-text-muted-color);
    }
    .modifiers {
      list-style: none;
      margin: 0 0 0.75rem;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .modifiers li {
      display: flex;
      justify-content: space-between;
      color: var(--p-green-700);
    }
    .modifiers li.malus {
      color: var(--p-red-700);
    }
    .description {
      margin: 0 0 0.75rem;
      font-style: italic;
    }
    .price {
      margin: 0;
      font-weight: 600;
    }
  `,
})
export class ItemCardComponent {
  readonly item = input.required<ItemDraft>();
  protected readonly severity = RARITY_SEVERITY;
}
