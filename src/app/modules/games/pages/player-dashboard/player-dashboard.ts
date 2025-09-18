import { Component } from '@angular/core';
import { CharacterDetails } from '../../../characters/components/character-details/character-details';

@Component({
  selector: 'app-player-dashboard',
  imports: [CharacterDetails],
  templateUrl: './player-dashboard.html',
  styleUrl: './player-dashboard.scss',
})
export class PlayerDashboard {}
