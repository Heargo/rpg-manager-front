import { Component, inject, OnInit, signal } from '@angular/core';
import { CharacterBusiness } from '../../business/characters.business';
import { Character } from '../../models/character.interface';
import { GamesBusiness } from '../../../games/business/games.business';

@Component({
  selector: 'app-character-list',
  imports: [],
  templateUrl: './character-list.html',
  styleUrl: './character-list.scss',
})
export class CharacterList implements OnInit {
  private readonly characterBusiness = inject(CharacterBusiness);
  private readonly gameBusiness = inject(GamesBusiness);

  protected $characters = signal<Character[]>([]);
  ngOnInit(): void {
    // Initialization logic here
    const currentGame = this.gameBusiness.$currentGame();
    if (currentGame) {
      this.characterBusiness
        .getCharactersByGameId(currentGame.id)
        .then((characters) => {
          this.$characters.set(characters || []);
        });
    } else {
      this.$characters.set([]);
    }
  }
}
