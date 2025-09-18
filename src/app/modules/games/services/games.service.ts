import { inject, Injectable } from '@angular/core';
import { CreateGame, Game, UpdateGame } from '../models/game.interface';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { FormsHelper } from '../../../core/helper/forms.helper';

@Injectable({
  providedIn: 'root',
})
export class GamesService {
  private readonly http = inject(HttpClient);
  public async createGame(game: CreateGame, image?: File) {
    const formData = FormsHelper.toFormData(game);

    if (image) {
      formData.append('image', image);
    }

    return firstValueFrom(
      this.http.post<Game>(`${environment.API_URL}/games`, formData)
    );
  }

  // update existing game
  public async updateGame(game: UpdateGame, image?: File): Promise<Game> {
    const formData = FormsHelper.toFormData(game);

    if (image) {
      formData.append('image', image);
    }
    console.log('Updating game with data:', formData);
    return firstValueFrom(
      this.http.patch<Game>(`${environment.API_URL}/games/${game.id}`, formData)
    );
  }

  public async getGameById(id: string): Promise<Game> {
    return firstValueFrom(
      this.http.get<Game>(`${environment.API_URL}/games/${id}`)
    );
  }

  public async getAllGames(): Promise<Game[]> {
    return firstValueFrom(
      this.http.get<Game[]>(`${environment.API_URL}/games`)
    );
  }

  public async deleteGame(id: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${environment.API_URL}/games/${id}`)
    );
  }
}
