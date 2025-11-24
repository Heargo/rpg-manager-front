import { inject, Injectable, signal } from '@angular/core';
import { CreateGame, Game, UpdateGame } from '../models/game.interface';
import { MessageService } from 'primeng/api';
import { GamesService } from '../services/games.service';
import { environment } from '../../../../environments/environment';
import { UsersBusiness } from '../../user/business/users.business';
import { Router } from '@angular/router';
import { CharactersBusiness } from '../../characters/business/characters.business';

@Injectable({
  providedIn: 'root',
})
export class GamesBusiness {
  private readonly messageService = inject(MessageService);
  private readonly gamesService = inject(GamesService);
  private readonly userBusiness = inject(UsersBusiness);
  private readonly characterBusiness = inject(CharactersBusiness);
  private readonly router = inject(Router);

  private $_currentGame = signal<Game | null>(
    localStorage.getItem('currentGame')
      ? JSON.parse(localStorage.getItem('currentGame')!)
      : null
  );
  public readonly $currentGame = this.$_currentGame.asReadonly();

  public joinGame(game: Game) {
    this.$_currentGame.set(game);
    localStorage.setItem('currentGame', JSON.stringify(game));
    this.characterBusiness.loadCharacterForGame(
      game.id,
      this.userBusiness.$currentUser()!.id
    );
    this.router.navigate(['/games', game.id, 'dashboard', 'player']);
    if (this.userBusiness.$currentUser()!.id === game.gameMaster.id) {
      this.router.navigate(['/games', game.id, 'dashboard', 'gm']);
    } else {
      this.router.navigate(['/games', game.id, 'dashboard', 'player']);
    }
  }

  public exitGame() {
    this.$_currentGame.set(null);
    localStorage.removeItem('currentGame');
    this.router.navigate(['/games']);
  }

  public async createGame(
    game: CreateGame,
    image?: File
  ): Promise<Game | null> {
    return this.gamesService.createGame(game, image).catch(() => {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to create game',
        life: 3000,
      });
      return null;
    });
  }

  public async getGames(): Promise<Game[]> {
    return this.gamesService.getAllGames().catch(() => {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load games',
        life: 3000,
      });
      return [];
    });
  }

  public async getGameById(id: string): Promise<Game | null> {
    return this.gamesService.getGameById(id).catch(() => {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load the game',
        life: 3000,
      });
      return null;
    });
  }

  public async updateGame(
    id: string,
    game: UpdateGame,
    image?: File
  ): Promise<Game | null> {
    return this.gamesService.updateGame({ id, ...game }, image).catch(() => {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update the game',
        life: 3000,
      });
      return null;
    });
  }

  public async deleteGame(id: string): Promise<boolean> {
    return this.gamesService
      .deleteGame(id)
      .then(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Game deleted successfully',
          life: 3000,
        });
        return true;
      })
      .catch(() => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete the game',
          life: 3000,
        });
        return false;
      });
  }

  public getGameImageUrl(game: Game): string {
    return `${environment.API_URL}/file/${game.imageId}`;
  }
}
