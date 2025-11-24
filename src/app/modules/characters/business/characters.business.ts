import { inject, Injectable, signal } from '@angular/core';
import {
  Character,
  CharacterCreationPayload,
} from '../models/character.interface';
import { CharactersService } from '../services/characters.service';

@Injectable({
  providedIn: 'root',
})
export class CharactersBusiness {
  private readonly charactersService = inject(CharactersService);
  public $_currentCharacter = signal<Character | null>(null);
  public readonly $currentCharacter = this.$_currentCharacter.asReadonly();

  async loadCharacterForGame(gameId: string, userId: string): Promise<void> {
    const characters = await this.getCharactersByGameId(gameId);
    const character = characters.find((char) => char.user.id === userId);
    if (character) {
      this.$_currentCharacter.set(character);
    }
  }

  async getCharactersByGameId(gameId: string): Promise<Character[]> {
    try {
      return this.charactersService.getCharactersByGameId(gameId);
    } catch {
      return [];
    }
  }

  async getCharacterById(id: string): Promise<Character | null> {
    return this.charactersService.getCharacterById(id);
  }

  async createCharacter(
    character: CharacterCreationPayload,
    profilePicture: File | undefined
  ): Promise<Character> {
    return this.charactersService.createCharacter(character, profilePicture);
  }
}
