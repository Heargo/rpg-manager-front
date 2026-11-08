export interface RoomMember {
  /** The player's profile id: the seat. */
  playerId: string;
  name: string;
  isHost: boolean;
  online: boolean;
}

export interface RoomState {
  id: string;
  name: string;
  /** The world this room plays in (stored on the host's device). */
  worldId?: string;
  members: RoomMember[];
}

export interface HelloRequest {
  playerId: string;
  name: string;
}

export interface HelloResponse {
  room: RoomState;
  you: RoomMember;
}

export const ROOM_ROUTES = {
  hello: 'room/hello',
  ping: 'room/ping',
} as const;

export const ROOM_TOPICS = {
  state: 'room/state',
} as const;

/** What the host saves, to reopen the room after a reload. */
export interface HostedRoomRecord {
  state: RoomState;
  savedAt: number;
}

/** What a player keeps about a room they joined: the last state they saw. */
export interface JoinedRoomRecord {
  id: string;
  name: string;
  hostName: string;
  members: RoomMember[];
  lastSeenAt: number;
}
