import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-games-page',
  imports: [ButtonModule, RouterLink],
  templateUrl: './games.page.html',
  styleUrl: './games.page.scss',
})
export class GamesPage {
  protected $games = signal([]);
}
