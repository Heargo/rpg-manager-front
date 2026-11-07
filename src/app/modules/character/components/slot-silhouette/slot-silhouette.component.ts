import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { EquipmentSlot } from '../../../../core/models/item';

/**
 * Faceted silhouettes (bold straight cuts, small gaps), like the logo.
 * One shared viewBox; each slot is a list of polygon paths drawn in currentColor.
 */
export const SLOT_VIEWBOX = '0 0 64 64';

export const SLOT_SHAPES: Record<
  Exclude<EquipmentSlot, 'none'>,
  readonly string[]
> = {
  head: [
    'M10 36V28L17 15L30 9V36Z',
    'M54 36V28L47 15L34 9V36Z',
    'M10 40H54V54H40L32 46L24 54H10Z',
  ],
  earring: [
    'M32 4L38 10L32 16L26 10Z',
    'M30 21L15 33L30 58Z',
    'M34 21L49 33L34 58Z',
  ],
  necklace: [
    'M8 10H16L31 38L28 42L8 16Z',
    'M56 10H48L33 38L36 42L56 16Z',
    'M32 46L40 53L32 60L24 53Z',
  ],
  ring: [
    'M32 4L40 12L32 20L24 12Z',
    'M35 25L50 40H42L35 33Z',
    'M50 44L35 59V51L42 44Z',
    'M29 59L14 44H22L29 51Z',
    'M14 40L29 25V33L22 40Z',
  ],
  chest: ['M6 18L22 8H30V56H16V34L6 30Z', 'M58 18L42 8H34V56H48V34L58 30Z'],
  hand: [
    'M17 6H23V26H17Z',
    'M26 2H32V26H26Z',
    'M35 4H41V26H35Z',
    'M44 10H50V26H44Z',
    'M17 30H51V46L44 56H24L17 46Z',
    'M13 36L5 29L9 23L15 29Z',
  ],
  legs: ['M12 6H30V30L26 58H12Z', 'M34 6H52V58H38L34 30Z'],
  foot: ['M16 6H34V36H16Z', 'M16 40H36L56 50V58H16Z'],
  weapon1: [
    'M31 4L24 14V40H31Z',
    'M33 4L40 14V40H33Z',
    'M14 43H50V49H14Z',
    'M29 52H35V58H29Z',
  ],
  weapon2: [
    'M10 12L30 6V30H10Z',
    'M54 12L34 6V30H54Z',
    'M10 34H30V58L16 46L10 38Z',
    'M54 34H34V58L48 46L54 38Z',
  ],
};

@Component({
  selector: 'app-slot-silhouette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'img',
    '[attr.data-slot-silhouette]': 'slot()',
    '[attr.aria-label]': 'label()',
  },
  template: `
    <svg [attr.viewBox]="viewBox" fill="currentColor" aria-hidden="true">
      @for (d of paths(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
      width: 4rem;
      height: 4rem;
      color: var(--p-text-muted-color);
      opacity: 0.55;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
})
export class SlotSilhouetteComponent {
  readonly slot = input.required<EquipmentSlot>();
  readonly label = input.required<string>();
  protected readonly viewBox = SLOT_VIEWBOX;
  protected readonly paths = computed(() => SLOT_SHAPES[this.slot()]);
}
