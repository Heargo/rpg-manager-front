import { Character } from '../../world/models/world';

/** An action the player queued while offline (P10 fills it). */
export interface QueuedAction {
  route: string;
  payload: unknown;
}

/** A player whose copy differs from the host's: both versions wait for the game master's pick. */
export interface PlayerCopyConflict {
  playerId: string;
  playerName: string;
  host: Character;
  player: Character;
  queued: QueuedAction[];
}

export const PLAYER_COPY_ROUTES = {
  hello: 'player-copy/hello',
  submit: 'player-copy/submit',
} as const;

export const PLAYER_COPY_TOPICS = {
  /** Ids of the players waiting for the game master's pick: they are read-only. */
  readOnly: 'player-copy/read-only',
} as const;

/** `hash` is null when the player has no copy of this room yet. */
export interface PlayerCopyHello {
  rev: number;
  hash: string | null;
}

export interface PlayerCopyHelloAnswer {
  match: boolean;
}

export interface PlayerCopySubmit {
  copy: Character;
  queued: QueuedAction[];
}
