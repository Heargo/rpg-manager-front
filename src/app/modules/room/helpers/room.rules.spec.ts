import { createRoomState, isValidHello, joinRoom, markOffline, removeMember } from './room.rules';

const host = { playerId: 'h', name: 'Gm' };

describe('room rules', () => {
  it('starts with the host as the only member', () => {
    expect(createRoomState('r1', ' Table ', host)).toEqual({
      id: 'r1',
      name: 'Table',
      members: [{ playerId: 'h', name: 'Gm', isHost: true, online: true }],
    });
  });

  it('adds a player, then gives the same seat back with the new name', () => {
    let state = joinRoom(createRoomState('r1', 'T', host), { playerId: 'p1', name: ' Ada ' });
    state = markOffline(state, 'p1');
    expect(state.members[1]).toEqual({ playerId: 'p1', name: 'Ada', isHost: false, online: false });

    state = joinRoom(state, { playerId: 'p1', name: 'Ada Lovelace' });

    expect(state.members).toHaveLength(2);
    expect(state.members[1]).toEqual({ playerId: 'p1', name: 'Ada Lovelace', isHost: false, online: true });
  });

  it('removes players but never the host', () => {
    const state = joinRoom(createRoomState('r1', 'T', host), { playerId: 'p1', name: 'Ada' });
    expect(removeMember(state, 'p1').members.map((m) => m.playerId)).toEqual(['h']);
    expect(removeMember(state, 'h').members.map((m) => m.playerId)).toEqual(['h', 'p1']);
  });

  it('validates hello payloads', () => {
    expect(isValidHello({ playerId: 'p', name: 'Ada' })).toBe(true);
    expect(isValidHello({ playerId: 'p', name: '  ' })).toBe(false);
    expect(isValidHello({ playerId: '', name: 'Ada' })).toBe(false);
    expect(isValidHello('hello')).toBe(false);
  });
});
