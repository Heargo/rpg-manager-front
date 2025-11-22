import { inject, Injectable, signal } from '@angular/core';
import {
  Character,
  CharacterCreationPayload,
} from '../models/character.interface';
import { CharactersService } from '../services/characters.service';

@Injectable({
  providedIn: 'root',
})
export class CharacterBusiness {
  private readonly charactersService = inject(CharactersService);
  public $currentCharacter = signal<Character | null>(null);

  async getCharactersByGameId(gameId: string): Promise<Character[] | null> {
    return this.charactersService.getCharactersByGameId(gameId);
  }

  async getCharacterById(id: string): Promise<Character | null> {
    const character = await this.charactersService.getCharacterById(id);
    this.$currentCharacter.set(character);
    return character;
  }

  async createCharacter(
    character: CharacterCreationPayload,
    profilePicture: File | undefined
  ): Promise<Character> {
    return this.charactersService.createCharacter(character, profilePicture);
  }
}
