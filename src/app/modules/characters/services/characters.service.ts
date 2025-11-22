import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  Character,
  CharacterCreationPayload,
} from '../models/character.interface';
import { environment } from '../../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { FormsHelper } from '../../../core/helper/forms.helper';

@Injectable({
  providedIn: 'root',
})
export class CharactersService {
  private readonly http = inject(HttpClient);
  async getCharacterById(id: string): Promise<Character | null> {
    return firstValueFrom(
      this.http.get<Character>(`${environment.API_URL}/characters/${id}`)
    );
  }

  async getCharactersByGameId(gameId: string): Promise<Character[]> {
    return firstValueFrom(
      this.http.get<Character[]>(
        `${environment.API_URL}/characters?gameId=${gameId}`
      )
    );
  }

  async createCharacter(
    character: CharacterCreationPayload,
    profilePicture: File | undefined
  ): Promise<Character> {
    const formData = FormsHelper.toFormData(character);
    console.log('Creating character with data:', formData);

    if (profilePicture) {
      formData.append('image', profilePicture);
    }

    return firstValueFrom(
      this.http.post<Character>(`${environment.API_URL}/characters`, formData)
    );
  }
}
