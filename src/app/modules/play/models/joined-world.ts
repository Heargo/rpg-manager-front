import { SheetWorld } from '../../character/business/character.business';

/** What a player keeps about a world they joined, to list it and open their sheet while the host is offline. */
export interface JoinedWorld {
  worldId: string;
  roomId: string;
  name: string;
  hostName: string;
  /** The invite link fragment (what follows `#`), to rejoin. */
  invite: string;
  lastSeenAt: number;
  /** The world rules the sheet needs, as the host last published them. */
  sheetWorld: SheetWorld;
}
