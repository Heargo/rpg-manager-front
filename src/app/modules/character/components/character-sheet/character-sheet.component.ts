import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { BadgeModule } from '@openng/optimus-ui/badge';
import { ButtonModule } from '@openng/optimus-ui/button';
import { ContextMenu, ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { Menu, MenuModule } from '@openng/optimus-ui/menu';
import { ProgressBarModule } from '@openng/optimus-ui/progressbar';
import { TabsModule } from '@openng/optimus-ui/tabs';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { StoredImageComponent } from '../../../../core/components/stored-image/stored-image.component';
import { EQUIPMENT_SLOTS, EquipmentSlot } from '../../../../core/models/item';
import { ItemCardComponent } from '../../../item/components/item-card/item-card.component';
import { RARITY_SEVERITY } from '../../../item/helpers/item-display';
import { Character, InventoryItem } from '../../../world/models/world';
import {
  CharacterBusiness,
  SheetWorld,
} from '../../business/character.business';
import {
  CharacterAction,
  CharacterActionKind,
  MAX_GRANTED_POINTS,
} from '../../helpers/character-actions.rules';

const ITEM_ICONS: Record<string, string> = {
  item: 'pi pi-box',
  consumable: 'pi pi-heart',
  equipment: 'pi pi-shield',
};

/**
 * A full character sheet: stats, equipment and inventory, with the item actions. It only shows and asks: actions
 * go out through `act`, and the page sends them to the host (in a room) or applies them locally (sandbox).
 */
@Component({
  selector: 'app-character-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    TranslocoPipe,
    BadgeModule,
    ButtonModule,
    ContextMenuModule,
    DialogModule,
    InputNumberModule,
    MenuModule,
    ProgressBarModule,
    TabsModule,
    TagModule,
    TooltipModule,
    StoredImageComponent,
    ItemCardComponent,
  ],
  templateUrl: './character-sheet.component.html',
  styleUrl: './character-sheet.component.scss',
})
export class CharacterSheetComponent {
  protected readonly characters = inject(CharacterBusiness);
  private readonly language = inject(LanguageBusiness);
  private readonly confirm = inject(ConfirmationService);

  readonly character = input.required<Character>();
  readonly world = input.required<SheetWorld>();
  /** Spend points and use the items (the character's player, or the game master). */
  readonly canPlay = input(false);
  /** Grant points and set current values. */
  readonly gameMaster = input(false);
  /** An action is on its way: buttons wait. */
  readonly busy = input(false);
  /** Actions that are off for now (the host is offline and didn't allow them): disabled, with a tooltip. */
  readonly lockedActions = input<CharacterActionKind[]>([]);
  readonly act = output<CharacterAction>();

  protected readonly maxGranted = MAX_GRANTED_POINTS;
  protected readonly severity = RARITY_SEVERITY;
  protected readonly icons = ITEM_ICONS;
  protected readonly grantAmount = signal(1);
  /** The item whose details dialog is open. */
  private readonly openItemId = signal<string | null>(null);
  /** The item the context menu / action menu was opened on. */
  private readonly menuItemId = signal<string | null>(null);

  protected readonly stats = computed(() =>
    this.characters.statsOf(this.character(), this.world()),
  );
  protected readonly bars = computed(() => {
    const { life, mana } = this.characters.barsOf(
      this.character(),
      this.world(),
    );
    return [
      ...(life ? [{ kind: 'life', stat: life }] : []),
      ...(mana ? [{ kind: 'mana', stat: mana }] : []),
    ];
  });
  protected readonly slots = computed(() =>
    EQUIPMENT_SLOTS.map((slot) => ({
      slot,
      entry: this.character().inventory.find(
        (entry) => entry.equipped && entry.item.slot === slot,
      ),
    })),
  );
  protected readonly inventory = computed(() =>
    [...this.character().inventory].sort((a, b) => a.position - b.position),
  );
  protected readonly openItem = computed(() =>
    this.character().inventory.find((entry) => entry.id === this.openItemId()),
  );
  protected readonly menuModel = computed<MenuItem[]>(() => {
    const entry = this.character().inventory.find(
      (candidate) => candidate.id === this.menuItemId(),
    );
    return entry ? this.itemMenu(entry) : [];
  });

  protected isLocked(kind: CharacterActionKind): boolean {
    return this.lockedActions().includes(kind);
  }

  protected money(amount: number): string {
    return this.characters.money(amount, this.world().moneyFormat);
  }

  protected slotLabel(slot: EquipmentSlot): string {
    return `item.slot.${slot}`;
  }

  protected spend(attributeId: string): void {
    this.act.emit({ kind: 'spend-stat-point', attributeId });
  }

  protected grant(): void {
    const amount = this.grantAmount();
    if (amount >= 1) this.act.emit({ kind: 'grant-stat-points', amount });
  }

  protected setCurrent(
    attributeId: string,
    value: number | null | undefined,
    previous: number,
  ): void {
    if (value === null || value === undefined || value === previous) return;
    this.act.emit({ kind: 'set-current', attributeId, value });
  }

  protected showDetails(entry: InventoryItem): void {
    this.openItemId.set(entry.id);
  }

  protected closeDetails(): void {
    this.openItemId.set(null);
  }

  protected openContextMenu(
    event: MouseEvent,
    entry: InventoryItem,
    menu: ContextMenu,
  ): void {
    this.menuItemId.set(entry.id);
    menu.show(event);
    event.preventDefault();
  }

  protected openActionMenu(
    event: Event,
    entry: InventoryItem,
    menu: Menu,
  ): void {
    this.menuItemId.set(entry.id);
    menu.toggle(event);
    event.stopPropagation();
  }

  protected equip(entry: InventoryItem): void {
    this.act.emit({
      kind: entry.equipped ? 'unequip' : 'equip',
      inventoryId: entry.id,
    });
  }

  protected use(entry: InventoryItem): void {
    this.act.emit({ kind: 'use', inventoryId: entry.id });
    this.closeDetails();
  }

  protected sell(entry: InventoryItem): void {
    const price = this.money(entry.item.price);
    this.confirm.confirm({
      header: this.language.t('character.items.sellTitle'),
      message: this.language.t('character.items.sellMessage', {
        name: entry.item.name,
        price,
      }),
      icon: 'pi pi-wallet',
      acceptButtonProps: { label: this.language.t('character.items.sell') },
      rejectButtonProps: {
        label: this.language.t('common.cancel'),
        severity: 'secondary',
        text: true,
      },
      accept: () => {
        this.act.emit({ kind: 'sell', inventoryId: entry.id });
        this.closeDetails();
      },
    });
  }

  private itemMenu(entry: InventoryItem): MenuItem[] {
    const t = (key: string) => this.language.t(key);
    const items: MenuItem[] = [
      {
        label: t('character.items.details'),
        icon: 'pi pi-eye',
        command: () => this.showDetails(entry),
      },
    ];
    if (!this.canPlay()) return items;
    const locked = (kind: CharacterActionKind): Partial<MenuItem> =>
      this.isLocked(kind)
        ? { disabled: true, title: t('character.sheet.lockedOffline') }
        : {};
    if (entry.item.type === 'equipment' && entry.item.slot !== 'none') {
      items.push({
        ...locked(entry.equipped ? 'unequip' : 'equip'),
        label: t(
          entry.equipped ? 'character.items.unequip' : 'character.items.equip',
        ),
        icon: entry.equipped ? 'pi pi-minus-circle' : 'pi pi-plus-circle',
        command: () => this.equip(entry),
      });
    }
    if (entry.item.type === 'consumable') {
      items.push({
        ...locked('use'),
        label: t('character.items.use'),
        icon: 'pi pi-heart',
        command: () => this.use(entry),
      });
    }
    items.push(
      { separator: true },
      {
        ...locked('sell'),
        label: t('character.items.sell'),
        icon: 'pi pi-wallet',
        command: () => this.sell(entry),
      },
    );
    return items;
  }
}
