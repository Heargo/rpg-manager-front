import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TagModule } from '@openng/optimus-ui/tag';
import { CardBarComponent } from '../../../../core/components/card-bar/card-bar.component';
import { PortraitCardComponent } from '../../../../core/components/portrait-card/portrait-card.component';
import { levelRarity } from '../../../character/helpers/level.rules';
import { RARITY_SEVERITY } from '../../../item/helpers/item-display';
import { PublicNpc } from '../../../npc/models/npc';

/**
 * The NPC of a story or merchant encounter, as a card like a player's: only the fields the world's rules let the players see.
 * The description, the attributes and the equipment sit under the card, each in its own box.
 */
@Component({
  selector: 'app-table-npc-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoPipe,
    ButtonModule,
    TagModule,
    CardBarComponent,
    PortraitCardComponent,
  ],
  template: `
    @let n = npc();
    <article class="npc" data-testid="table-npc">
      <app-portrait-card
        class="card"
        [name]="n.name"
        [portraitId]="n.portraitId"
        [labelledBy]="'npc-name-' + n.id"
      >
        <div cardTop class="top">
          <h3 [id]="'npc-name-' + n.id">{{ n.name }}</h3>
          <div class="badges">
            @if (n.level !== undefined) {
              <span data-field="level" [attr.data-rarity]="rarity()">
                <p-tag
                  [severity]="severity()"
                  [value]="
                    'character.sheet.levelBadge' | transloco: { level: n.level }
                  "
                />
              </span>
            }
            @if (canView()) {
              <button
                pButton
                type="button"
                class="view"
                data-action="view-sheet"
                icon="pi pi-eye"
                size="small"
                [rounded]="true"
                [text]="true"
                [attr.aria-label]="'npc.catalogue.view' | transloco"
                [attr.title]="'npc.catalogue.view' | transloco"
                (click)="view.emit(n.id)"
              ></button>
            }
          </div>
        </div>
        @if (life(); as bar) {
          <div cardBottom>
            <app-card-bar
              kind="life"
              data-field="life-bar"
              [attr.data-percent]="bar.percent"
              [name]="'npc.card.life' | transloco"
              [percent]="bar.percent"
              [current]="n.life?.current"
              [max]="n.life?.max"
            />
          </div>
        }
      </app-portrait-card>

      @if (n.description) {
        <section class="box" data-field="description">
          <p>{{ n.description }}</p>
        </section>
      }
      @if (n.attributes?.length) {
        <section class="box">
          <h4>{{ 'npc.card.attributes' | transloco }}</h4>
          <ul class="attributes">
            @for (attribute of n.attributes; track attribute.name) {
              <li data-field="attribute">
                <span>{{ attribute.name }}</span>
                <span>{{ attribute.current }} / {{ attribute.max }}</span>
              </li>
            }
          </ul>
        </section>
      }
      @if (n.equipment; as items) {
        <section class="box">
          <h4>{{ 'npc.card.equipment' | transloco }}</h4>
          @if (items.length) {
            <ul data-field="equipment">
              @for (item of items; track $index) {
                <li>{{ item.name }}</li>
              }
            </ul>
          } @else {
            <p class="muted" data-field="equipment">
              {{ 'npc.card.noEquipment' | transloco }}
            </p>
          }
        </section>
      }
      @if (n.merchant && shopOpen()) {
        <button
          pButton
          type="button"
          class="shop"
          data-action="visit-shop"
          icon="pi pi-shop"
          [label]="'merchant.table.visit' | transloco"
          (click)="visitShop.emit(n.id)"
        ></button>
      }
    </article>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      max-width: 24rem;
      margin-inline: auto;
    }
    .npc {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    /* As wide as a player's card (24rem), and never taller than the screen under the nav. */
    .card {
      width: min(100%, calc((100svh - 50px - 2rem) * 5 / 7));
      align-self: center;
    }
    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    h3 {
      margin: 0;
      font-size: 1rem;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .badges {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .view {
      color: #fff;
    }
    .box {
      padding: 0.75rem 1rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: var(--p-content-border-radius, 12px);
      background: var(--p-content-background);
    }
    .box p,
    .box ul,
    h4 {
      margin: 0;
    }
    h4 {
      margin-bottom: 0.4rem;
      font-size: 0.85rem;
      color: var(--p-text-muted-color);
    }
    .box ul {
      padding-left: 1rem;
    }
    .box ul.attributes {
      padding: 0;
      list-style: none;
    }
    .attributes li {
      display: flex;
      justify-content: space-between;
      font-variant-numeric: tabular-nums;
    }
    .muted {
      color: var(--p-text-muted-color);
    }
    .shop {
      align-self: center;
    }
  `,
})
export class TableNpcCardComponent {
  readonly npc = input.required<PublicNpc>();
  /** The world's highest level, for the level badge's colour (as on a player's card). */
  readonly maxLevel = input<number | undefined>();
  /** The merchant's shop is open for this player. */
  readonly shopOpen = input(false);
  /** The game master can open the NPC's full sheet. */
  readonly canView = input(false);
  /** The game master opens the NPC's full sheet. */
  readonly view = output<string>();
  /** A player goes to the open shop. */
  readonly visitShop = output<string>();

  protected readonly rarity = computed(() => {
    const level = this.npc().level;
    const max = this.maxLevel();
    return level !== undefined && max ? levelRarity(level, max) : undefined;
  });
  protected readonly severity = computed(() => {
    const rarity = this.rarity();
    return rarity ? RARITY_SEVERITY[rarity] : 'secondary';
  });
  /** The life bar: its fill when the bar is shown, or from the numbers when only they are. */
  protected readonly life = computed(() => {
    const { lifeBar, life } = this.npc();
    if (lifeBar) return lifeBar;
    if (life)
      return {
        percent: life.max > 0 ? Math.round((life.current / life.max) * 100) : 0,
      };
    return null;
  });
}
