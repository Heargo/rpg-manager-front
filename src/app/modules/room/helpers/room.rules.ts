import { normalizeProfileName, isValidProfileName } from '../../../core/helpers/profile.rules';
import { HelloRequest, RoomMember, RoomState } from '../models/room';

export function createRoomState(id: string, name: string, host: { playerId: string; name: string }): RoomState {
  return { id, name: name.trim(), members: [{ playerId: host.playerId, name: host.name, isHost: true, online: true }] };
}

/** Checks a hello payload from the wire. */
export function isValidHello(payload: unknown): payload is HelloRequest {
  if (typeof payload !== 'object' || payload === null) return false;
  const { playerId, name } = payload as Record<string, unknown>;
  return typeof playerId === 'string' && playerId.length > 0 && typeof name === 'string' && isValidProfileName(name);
}

/** Adds the player, or gives them their seat back (same playerId) with their current name. */
export function joinRoom(state: RoomState, hello: HelloRequest): RoomState {
  const name = normalizeProfileName(hello.name);
  const existing = state.members.find((member) => member.playerId === hello.playerId);
  const member: RoomMember = { playerId: hello.playerId, name, isHost: existing?.isHost ?? false, online: true };
  return {
    ...state,
    members: existing
      ? state.members.map((m) => (m.playerId === hello.playerId ? member : m))
      : [...state.members, member],
  };
}

export function markOffline(state: RoomState, playerId: string): RoomState {
  return { ...state, members: state.members.map((m) => (m.playerId === playerId ? { ...m, online: false } : m)) };
}

export function removeMember(state: RoomState, playerId: string): RoomState {
  return { ...state, members: state.members.filter((m) => m.playerId !== playerId || m.isHost) };
}

export function findMember(state: RoomState, playerId: string): RoomMember | undefined {
  return state.members.find((member) => member.playerId === playerId);
}

/**
 * A saved room reopened after a reload: connections are gone, so every player is offline until they rejoin;
 * the host is online with their current name.
 */
export function resumeRoom(state: RoomState, host: { playerId: string; name: string }): RoomState {
  return {
    ...state,
    members: state.members.map((member) =>
      member.isHost ? { ...member, playerId: host.playerId, name: host.name, online: true } : { ...member, online: false },
    ),
  };
}

/** True when a saved room belongs to this host (another profile on the same device must not reopen it). */
export function isHostedBy(state: RoomState, playerId: string): boolean {
  return state.members.some((member) => member.isHost && member.playerId === playerId);
}
