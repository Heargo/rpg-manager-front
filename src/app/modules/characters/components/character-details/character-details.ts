import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { UsersBusiness } from '../../../user/business/users.business';
import { Character } from '../../models/character.interface';
import { Tooltip } from 'primeng/tooltip';
import { EllipsisActiveDirective } from '../../../../core/directives/tooltip-ellipsis.directive';
import { TabsModule } from 'primeng/tabs';
import { ItemSlot } from '../item-slot/item-slot';
import { Slot } from '../../../items/models/slot.enum';
import { Item } from '../../../items/models/item.interface';
import { TextareaModule } from 'primeng/textarea';
import { MenuService } from '../../../../core/services/menu.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-character-details',
  imports: [
    AccordionModule,
    Tooltip,
    EllipsisActiveDirective,
    TabsModule,
    ItemSlot,
    TextareaModule,
  ],
  templateUrl: './character-details.html',
  styleUrl: './character-details.scss',
})
export class CharacterDetails {
  private readonly userBusiness = inject(UsersBusiness);
  public $character = input.required<Character>({ alias: 'character' });

  protected $editMode = signal<boolean>(false);

  protected $isCharacterOwner = computed<boolean>(() => {
    const user = this.userBusiness.$currentUser();
    return user ? user.id === this.$character().user.id : false;
  });

  protected $gameMasterView = computed<boolean>(() => {
    const user = this.userBusiness.$currentUser();
    return user ? user.id === this.$character().game.gameMaster.id : false;
  });

  protected $dynamicAttributes = computed(() => {
    return this.$character()
      ? this.$character().attributes.filter((attr) => attr.attribute.dynamic)
      : [];
  });
  protected SLOT = Slot;

  protected isEllipsisActive = (e: HTMLElement): boolean => {
    return e.offsetWidth < e.scrollWidth;
  };
}
