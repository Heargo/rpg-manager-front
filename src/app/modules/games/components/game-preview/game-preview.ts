import { Component, computed, input } from '@angular/core';
import { Game } from '../../models/game.interface';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-game-preview',
  imports: [],
  templateUrl: './game-preview.html',
  styleUrl: './game-preview.scss',
})
export class GamePreview {
  public $game = input.required<Game>({ alias: 'game' });

  public $imageUrl = computed(() => {
    return `${environment.API_URL}/file/${this.$game().imageId}`;
  });
}
