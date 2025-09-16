import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, ButtonModule } from 'primeng/button';
import { GamesBusiness } from '../../business/games.business';
import { Game } from '../../models/game.interface';
import { GamePreview } from '../../components/game-preview/game-preview';

@Component({
  selector: 'app-games-page',
  imports: [ButtonModule, RouterLink, GamePreview],
  templateUrl: './games.page.html',
  styleUrl: './games.page.scss',
})
export class GamesPage implements OnInit {
  private readonly gameBusiness = inject(GamesBusiness);

  protected $games = signal<Game[]>([]);

  ngOnInit() {
    this.loadGames();
  }

  private async loadGames() {
    const games = await this.gameBusiness.getGames();
    this.$games.set(games);
  }
}
