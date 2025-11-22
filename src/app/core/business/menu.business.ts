import { effect, inject, Injectable, WritableSignal } from '@angular/core';
import { MenuService } from '../services/menu.service';
import { MenuItem } from 'primeng/api';
import { UsersBusiness } from '../../modules/user/business/users.business';
import { Game } from '../../modules/games/models/game.interface';
import { GamesBusiness } from '../../modules/games/business/games.business';

@Injectable({ providedIn: 'root' })
export class MenuBusiness {
  private readonly menuService = inject(MenuService);
  private readonly usersBusiness = inject(UsersBusiness);
  private readonly gameBusiness = inject(GamesBusiness);

  constructor() {
    effect(() => {
      const currentGame = this.gameBusiness.$currentGame();
      console.log('MenuBusiness: detected currentGame change:', currentGame);
      if (currentGame) {
        this.setInGameMenu(currentGame);
      } else {
        this.setGeneralMenu();
      }
    });
  }

  getMenuItems(): WritableSignal<MenuItem[]> {
    return this.menuService.getMenuItems();
  }

  setGeneralMenu(): void {
    const menuItems: MenuItem[] = [
      {
        label: 'Home',
        icon: 'pi pi-fw pi-home',
        routerLink: ['/home'],
      },
    ];
    menuItems.push({
      label: 'Games',
      icon: 'pi pi-fw pi-play',
      routerLink: ['/games'],
    });

    this.menuService.setMenuItems(menuItems);
  }

  async setInGameMenu(game: Game): Promise<void> {
    let menuItems: MenuItem[] = [];
    const gameMaster =
      game?.gameMaster.id === this.usersBusiness.$currentUser()?.id;

    const menusElements = {
      gmDashboard: {
        label: 'Game Master',
        icon: 'pi pi-fw pi-users',
        routerLink: ['/games', game.id, 'gm'],
      },
      character: {
        label: 'Character',
        icon: 'pi pi-fw pi-user',
        routerLink: ['/games', game.id, 'player'],
      },
      players: {
        label: 'Players',
        icon: 'pi pi-fw pi-users',
        routerLink: ['/games', game.id, 'players'],
      },
      exit: {
        label: 'Exit Game',
        icon: 'pi pi-fw pi-sign-out',
        command: () => {
          this.gameBusiness.exitGame();
          this.setGeneralMenu();
        },
      },
    };
    if (gameMaster) {
      menuItems = [
        menusElements.gmDashboard,
        menusElements.players,
        menusElements.exit,
      ];
    } else {
      menuItems = [
        menusElements.character,
        menusElements.players,
        menusElements.exit,
      ];
    }

    this.menuService.setMenuItems(menuItems);
  }
}
