import { Component, computed, inject, input, signal } from '@angular/core';
import { Game } from '../../models/game.interface';
import { environment } from '../../../../../environments/environment';
import { ButtonModule } from 'primeng/button';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { MenuItem } from 'primeng/api';
import { GamesBusiness } from '../../business/games.business';

@Component({
  selector: 'app-game-preview',
  imports: [ButtonModule, TieredMenuModule],
  templateUrl: './game-preview.html',
  styleUrl: './game-preview.scss',
})
export class GamePreview {
  public $game = input.required<Game>({ alias: 'game' });
  private readonly gameBusiness = inject(GamesBusiness);

  public $items = computed<MenuItem[]>(() => {
    return [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        routerLink: ['/games', this.$game().id, 'edit'],
      },
      {
        label: 'Delete',
        icon: 'pi pi-trash',
        routerLink: ['/games', this.$game().id, 'delete'],
      },
    ];
  });
  public $imageUrl = computed(() => {
    return this.gameBusiness.getGameImageUrl(this.$game());
  });
}
