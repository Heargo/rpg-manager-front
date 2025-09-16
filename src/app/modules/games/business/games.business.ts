import { inject, Injectable } from '@angular/core';
import { CreateGame, Game } from '../models/game.interface';
import { MessageService } from 'primeng/api';
import { GamesService } from '../services/games.service';

@Injectable({
  providedIn: 'root',
})
export class GamesBusiness {
  private readonly messageService = inject(MessageService);
  private readonly gamesService = inject(GamesService);
  public async createGame(
    game: CreateGame,
    image?: File
  ): Promise<CreateGame | null> {
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
}
