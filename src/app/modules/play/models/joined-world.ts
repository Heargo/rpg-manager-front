import { SheetWorld } from '../../character/business/character.business';

/** What a player keeps about a world they joined, to list it and open their sheet while the host is offline. */
export interface JoinedWorld {
  worldId: string;
  roomId: string;
  name: string;
  hostName: string;
  lastSeenAt: number;
  /** The world rules the sheet needs, as the host last published them. */
  sheetWorld: SheetWorld;
}
