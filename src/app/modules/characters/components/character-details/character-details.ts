import { Component, computed, inject } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { UsersBusiness } from '../../../user/business/users.business';
import { Character } from '../../models/character.interface';
import { Tooltip } from 'primeng/tooltip';
import { EllipsisActiveDirective } from '../../../../core/directives/tooltip-ellipsis.directive';
@Component({
  selector: 'app-character-details',
  imports: [AccordionModule, Tooltip, EllipsisActiveDirective],
  templateUrl: './character-details.html',
  styleUrl: './character-details.scss',
})
export class CharacterDetails {
  private readonly userBusiness = inject(UsersBusiness);
  protected $character = computed<Character>(() => {
    const user = this.userBusiness.$currentUser();
    //TODO CALL API
    const c: Character = {
      id: '1',
      name: 'Character Name',
      game: {
        id: '1',
        name: 'Game Name',
        gameMaster: user!,
        startingStatsPoints: 10,
        startingMoney: 100,
        attributes: [],
      },
      user: user!,
      description:
        'This is a detailed description of the character. It can include background story, personality traits, and other relevant information that adds depth to the character within the game world.',
      attributes: [
        {
          id: '0',
          dynamicValue: 32,
          investedStatPoints: 20,
          attribute: {
            name: 'Life',
            dynamic: true,
            color: 'red',
            statsPointCost: 0.2,
          },
        },
        {
          id: '02',
          dynamicValue: 12,
          investedStatPoints: 20,
          attribute: {
            name: 'mana with a very ',
            dynamic: true,
            color: 'blue',
            statsPointCost: 0.2,
          },
        },
        {
          id: '1',
          dynamicValue: 15,
          investedStatPoints: 5,
          attribute: {
            name: 'Strength',
            dynamic: false,
            statsPointCost: 1,
          },
        },
      ],
    };
    return c;
  });

  protected $dynamicAttributes = computed(() => {
    return this.$character()
      ? this.$character().attributes.filter((attr) => attr.attribute.dynamic)
      : [];
  });

  protected isEllipsisActive = (e: HTMLElement): boolean => {
    return e.offsetWidth < e.scrollWidth;
  };
}
