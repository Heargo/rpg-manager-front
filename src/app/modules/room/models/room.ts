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
} as const;

export const ROOM_TOPICS = {
  state: 'room/state',
} as const;
