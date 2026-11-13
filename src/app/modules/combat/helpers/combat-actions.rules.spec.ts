import { actionTabs } from './combat-actions.rules';

const actions = [
  { name: 'Action', count: 2, used: 1, movement: false },
  { name: 'Movement', count: 1, used: 1, movement: true },
];
const strike = { id: 'strike', actionType: 'Action' };
const dash = { id: 'dash', actionType: 'Movement' };
const plain = { id: 'plain' };
const odd = { id: 'odd', actionType: 'Teleport' };

describe('actionTabs', () => {
  it('makes one tab per action type, in order, with what is left', () => {
    expect(actionTabs(actions, []).map(({ name, count, used, left, movement }: { name: string; count: number; used: number; left: number; movement: boolean }) => ({ name, count, used, left, movement }))).toEqual([
      { name: 'Action', count: 2, used: 1, left: 1, movement: false },
      { name: 'Movement', count: 1, used: 1, left: 0, movement: true },
    ]);
  });

  it('puts each skill on the tab named by its action type', () => {
    const tabs = actionTabs(actions, [dash, strike]);
    expect(tabs[0].skills).toEqual([strike]);
    expect(tabs[1].skills).toEqual([dash]);
  });

  it('puts a skill without type or with an unknown type on the first tab', () => {
    const tabs = actionTabs(actions, [plain, odd, dash]);
    expect(tabs[0].skills).toEqual([plain, odd]);
    expect(tabs[1].skills).toEqual([dash]);
  });

  it('makes no tab without action counters', () => {
    expect(actionTabs([], [strike])).toEqual([]);
  });

  it('puts a skill without type or with an unknown type on the first non-movement tab', () => {
    const moveFirst = [
      { name: 'Walk', count: 1, used: 0, movement: true },
      { name: 'Action', count: 1, used: 0, movement: false },
    ];
    const walk = { id: 'walk', actionType: 'Walk' };
    const tabs = actionTabs(moveFirst, [plain, odd, walk, strike]);
    expect(tabs[0].skills).toEqual([walk]);
    expect(tabs[1].skills).toEqual([plain, odd, strike]);
  });

  it('falls back to the first tab when every type is a movement one', () => {
    const allMoves = [
      { name: 'Walk', count: 1, used: 0, movement: true },
      { name: 'Run', count: 1, used: 0, movement: true },
    ];
    const tabs = actionTabs(allMoves, [plain, odd]);
    expect(tabs[0].skills).toEqual([plain, odd]);
    expect(tabs[1].skills).toEqual([]);
  });
});
