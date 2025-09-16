import { inject, Injectable } from '@angular/core';
import { CreateGame, Game } from '../models/game.interface';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GamesService {
  private readonly http = inject(HttpClient);
  public async createGame(game: CreateGame) {
    // TODO implement create game logic
    return firstValueFrom(
      this.http.post<Game>(`${environment.API_URL}/games`, game)
    );
  }

  // update existing game
  public async updateGame(game: Game) {
    // TODO implement update game logic
    return firstValueFrom(
      this.http.put<Game>(`${environment.API_URL}/games/${game.id}`, game)
    );
  }

  public async getGameById(id: string) {
    return firstValueFrom(
      this.http.get<Game>(`${environment.API_URL}/games/${id}`)
    );
  }

  public async getAllGames() {
    return firstValueFrom(
      this.http.get<Game[]>(`${environment.API_URL}/games`)
    );
  }
}
