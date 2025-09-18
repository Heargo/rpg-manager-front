import { Component, computed, input } from '@angular/core';
import { Slot } from '../../../items/models/slot.enum';

@Component({
  selector: 'app-item-slot',
  imports: [],
  templateUrl: './item-slot.html',
  styleUrl: './item-slot.scss',
})
export class ItemSlot {
  // Inputs
  public $slot = input<Slot>(Slot.OTHER, { alias: 'slot' });
  public $item = input<unknown | null>(null, { alias: 'item' });

  public $placeHolderIconPath = computed<string | null>(() => {
    switch (this.$slot()) {
      case Slot.HEAD:
        return 'assets/icons/rpg/slots/head.png';
      case Slot.BODY:
        return 'assets/icons/rpg/slots/chest.png';
      case Slot.LEGS:
        return 'assets/icons/rpg/slots/legs.png';
      case Slot.FEET:
        return 'assets/icons/rpg/slots/feet.png';
      case Slot.HANDS:
        return 'assets/icons/rpg/slots/hands.png';
      case Slot.WEAPON:
        return 'assets/icons/rpg/slots/weapon.png';
      case Slot.SHIELD:
        return 'assets/icons/rpg/slots/shield.png';
      case Slot.RING:
        return 'assets/icons/rpg/slots/ring.png';
      case Slot.AMULET:
        return 'assets/icons/rpg/slots/amulet.png';
      case Slot.EARING:
        return 'assets/icons/rpg/slots/earings.png';
      default:
        return null;
    }
  });
}
