import { inject, Injectable } from '@angular/core';
import { CreateGame } from '../models/game.interface';
import { MessageService } from 'primeng/api';
import { GamesService } from '../services/games.service';

@Injectable({
  providedIn: 'root',
})
export class GamesBusiness {
  private readonly messageService = inject(MessageService);
  private readonly gamesService = inject(GamesService);
  public async createGame(game: CreateGame): Promise<CreateGame | null> {
    return this.gamesService.createGame(game).catch(() => {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to create game',
        life: 3000,
      });
      return null;
    });
  }
}
