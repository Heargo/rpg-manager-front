import { actionTabs } from './combat-actions.rules';

const actions = [
  { name: 'Action', count: 2, used: 1 },
  { name: 'Movement', count: 1, used: 1 },
];
const strike = { id: 'strike', actionType: 'Action' };
const dash = { id: 'dash', actionType: 'Movement' };
const plain = { id: 'plain' };
const odd = { id: 'odd', actionType: 'Teleport' };

describe('actionTabs', () => {
  it('makes one tab per action type, in order, with what is left', () => {
    expect(actionTabs(actions, []).map(({ name, count, used, left }: { name: string; count: number; used: number; left: number }) => ({ name, count, used, left }))).toEqual([
      { name: 'Action', count: 2, used: 1, left: 1 },
      { name: 'Movement', count: 1, used: 1, left: 0 },
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
});
