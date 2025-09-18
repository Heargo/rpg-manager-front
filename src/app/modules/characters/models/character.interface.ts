import { Attribute } from "../../games/models/attributes.interface";
import { Game } from "../../games/models/game.interface";
import { User } from "../../user/models/user.interface";

export interface Character {
  id: string;
  name: string;
  description?: string;
  game: Game;
  user: User;
  attributes: CharacterAttribute[];
}

export interface CharacterAttribute {
  id: string;
  attribute: Attribute;
  investedStatPoints: number;
  dynamicValue?: number;
}
