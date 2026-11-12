import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonModule } from '@openng/optimus-ui/button';
import { StoredImageComponent } from '../../../../core/components/stored-image/stored-image.component';
import { PublicNpc } from '../../../npc/models/npc';

/** The NPCs the game master shows on the table: only the fields the world's rules let the players see. */
@Component({
  selector: 'app-table-npcs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, ButtonModule, StoredImageComponent],
  template: `
    @for (npc of npcs(); track npc.id) {
      <article class="npc" data-testid="table-npc">
        <app-stored-image
          class="portrait"
          [imageId]="npc.portraitId"
          [alt]="npc.name"
        >
          <span class="initial">{{ npc.name.charAt(0).toUpperCase() }}</span>
        </app-stored-image>
        <div class="body">
          <h3>{{ npc.name }}</h3>
          @if (npc.level !== undefined) {
            <span data-field="level">{{
              'character.sheet.levelBadge' | transloco: { level: npc.level }
            }}</span>
          }
          @if (npc.lifeBar; as bar) {
            <div
              class="bar"
              data-field="life-bar"
              [attr.data-percent]="bar.percent"
            >
              <div class="fill" [style.width.%]="bar.percent"></div>
            </div>
          }
          @if (npc.life; as life) {
            <span data-field="life-numbers"
              >{{ life.current }} / {{ life.max }}</span
            >
          }
          @if (npc.description) {
            <p data-field="description">{{ npc.description }}</p>
          }
          @for (attribute of npc.attributes ?? []; track attribute.name) {
            <span data-field="attribute"
              >{{ attribute.name }} {{ attribute.current }} /
              {{ attribute.max }}</span
            >
          }
          @if (npc.merchant) {
            @if (gameMaster()) {
              <button
                pButton
                type="button"
                data-action="toggle-shop"
                size="small"
                severity="secondary"
                [icon]="isOpen(npc.id) ? 'pi pi-lock' : 'pi pi-lock-open'"
                [label]="
                  (isOpen(npc.id) ? 'merchant.table.close' : 'merchant.table.open')
                    | transloco
                "
                (click)="setShop.emit({ npcId: npc.id, open: !isOpen(npc.id) })"
              ></button>
            } @else if (isOpen(npc.id)) {
              <button
                pButton
                type="button"
                data-action="visit-shop"
                size="small"
                icon="pi pi-shop"
                [label]="'merchant.table.visit' | transloco"
                (click)="visitShop.emit(npc.id)"
              ></button>
            }
          }
          @if (npc.equipment; as items) {
            <ul data-field="equipment">
              @for (item of items; track $index) {
                <li>{{ item.name }}</li>
              }
            </ul>
          }
        </div>
      </article>
    }
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
      gap: 0.75rem;
    }
    .npc {
      display: flex;
      gap: 0.75rem;
      padding: 0.5rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: 8px;
      background: var(--p-content-background);
    }
    .portrait {
      flex: none;
      width: 4rem;
      height: 5.5rem;
      border-radius: 6px;
      background: var(--p-content-hover-background);
    }
    .initial {
      display: grid;
      place-items: center;
      height: 100%;
      font-size: 1.5rem;
    }
    .body {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }
    h3,
    p,
    ul {
      margin: 0;
    }
    ul {
      padding-left: 1rem;
    }
    .bar {
      height: 0.5rem;
      border-radius: 4px;
      background: var(--p-content-border-color);
      overflow: hidden;
    }
    .fill {
      height: 100%;
      background: var(--p-red-500);
    }
  `,
})
export class TableNpcsComponent {
  readonly npcs = input<PublicNpc[]>([]);
  /** Merchants whose shop is open: for the player, open for them; for the game master, open for anyone. */
  readonly shopsOpen = input<string[]>([]);
  readonly gameMaster = input(false);
  /** A player goes to an open shop. */
  readonly visitShop = output<string>();
  /** The game master opens (open: true) or closes a shop. */
  readonly setShop = output<{ npcId: string; open: boolean }>();

  protected isOpen(npcId: string): boolean {
    return this.shopsOpen().includes(npcId);
  }
}
