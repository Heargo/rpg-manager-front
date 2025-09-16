import { User } from '../../user/models/user.interface';
import { Attribute } from './attributes.interface';

export interface Game {
  id: string;
  name: string;
  gameMaster: User;
  description?: string;
  startingStatsPoints: number;
  startingMoney: number;
  attributes: Attribute[];
  // image: string;
}

export interface CreateGame extends Omit<Game, 'id' | 'gameMaster'> {}
export interface UpdateGame extends Partial<Omit<Game, 'gameMaster'>> {}
