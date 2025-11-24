import { Component, inject, OnInit } from '@angular/core';
import { CharactersBusiness } from '../../../characters/business/characters.business';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-player-dashboard',
  imports: [RouterLink, ButtonModule],
  templateUrl: './player-dashboard.html',
  styleUrl: './player-dashboard.scss',
})
export class PlayerDashboard implements OnInit {
  protected characterBusiness = inject(CharactersBusiness);
  private readonly route = inject(ActivatedRoute);

  ngOnInit() {
    this.loadCharacter();
  }

  async loadCharacter() {
    const gameId = this.route.snapshot.paramMap.get('gameId');
    if (!gameId) {
      console.error('PlayerDashboard: No gameId found in route');
      return;
    }
    const characters = await this.characterBusiness.getCharactersByGameId(
      gameId
    );
    if (!characters || characters.length === 0) {
      console.log('PlayerDashboard: No characters found for this game');
      return;
    }
    const character = await this.characterBusiness.getCharacterById(
      characters[0].id
    );
  }
}
