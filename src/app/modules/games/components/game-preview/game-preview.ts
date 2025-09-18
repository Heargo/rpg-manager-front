import { Component, computed, inject, input, signal } from '@angular/core';
import { Game } from '../../models/game.interface';
import { ButtonModule } from 'primeng/button';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { GamesBusiness } from '../../business/games.business';
import { UsersBusiness } from '../../../user/business/users.business';
import { Router } from '@angular/router';

@Component({
  selector: 'app-game-preview',
  imports: [ButtonModule, TieredMenuModule],
  templateUrl: './game-preview.html',
  styleUrl: './game-preview.scss',
})
export class GamePreview {
  public $game = input.required<Game>({ alias: 'game' });
  private readonly gameBusiness = inject(GamesBusiness);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly userBusiness = inject(UsersBusiness);
  private readonly router = inject(Router);

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
        command: () => this.onDelete(),
      },
    ];
  });
  public $imageUrl = computed(() => {
    return this.gameBusiness.getGameImageUrl(this.$game());
  });

  protected onDelete() {
    this.confirmationService.confirm({
      message:
        'Deleting a game is irreversible. You will lose all related data (characters, items, npc etc...) Are you sure you want to proceed?',
      header: 'Confirmation',
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-exclamation-triangle',

      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      accept: async () => {
        await this.gameBusiness.deleteGame(this.$game().id);
      },
    });
  }

  protected onPlay() {
    const currentUser = this.userBusiness.$currentUser();
    this.router.navigate(['/games', this.$game().id, 'dashboard', 'player']);
    // if (currentUser?.id === this.$game().gameMaster.id) {
    //   this.router.navigate(['/games', this.$game().id, 'dashboard', 'gm']);
    // } else {
    //   this.router.navigate(['/games', this.$game().id, 'dashboard', 'player']);
    // }
  }
}
