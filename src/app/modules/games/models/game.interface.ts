import { User } from '../../user/models/user.interface';
import { Attribute } from './attributes.interface';

export interface AppFile {
  id?: string;
  mimeType: string;
  name: string;
}

export interface Game {
  id: string;
  name: string;
  gameMaster: User;
  description?: string;
  startingStatsPoints: number;
  startingMoney: number;
  attributes: Attribute[];
  imageId?: string;
}

export interface CreateGame extends Omit<Game, 'id' | 'gameMaster'> {}
export interface UpdateGame extends Partial<Omit<Game, 'gameMaster'>> {}
