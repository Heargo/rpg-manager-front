import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { Character } from '../../../world/models/world';
import { CharacterAction } from '../../helpers/character-actions.rules';
import { CharacterSheetComponent } from './character-sheet.component';

const world = {
  attributes: [
    { id: 'life', name: 'Life', baseValue: 10 },
    { id: 'str', name: 'Strength', baseValue: 2 },
  ],
  barAttributes: { life: 'life' },
  moneyFormat: { kind: 'coins' as const },
};

const character: Character = {
  id: 'c',
  playerId: 'p',
  name: 'Ada',
  statPoints: 2,
  money: 40,
  attributes: [
    { attributeId: 'life', points: 0, current: 6 },
    { attributeId: 'str', points: 0, current: 2 },
  ],
  inventory: [
    {
      id: 'inv-1',
      equipped: true,
      position: 0,
      item: {
        id: 'i1',
        name: 'Iron helm',
        description: '',
        rarity: 'common',
        type: 'equipment',
        slot: 'head',
        price: 10,
        modifiers: [{ attribute: 'Life', value: 2 }],
      },
    },
  ],
  rev: 1,
  updatedAt: 0,
};

async function render(inputs: { canPlay: boolean; gameMaster: boolean }) {
  // jsdom has no matchMedia nor ResizeObserver; the tabs use them.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
  TestBed.configureTestingModule({
    imports: [CharacterSheetComponent],
    providers: TEST_PROVIDERS,
  });
  const fixture = TestBed.createComponent(CharacterSheetComponent);
  fixture.componentRef.setInput('character', character);
  fixture.componentRef.setInput('world', world);
  fixture.componentRef.setInput('canPlay', inputs.canPlay);
  fixture.componentRef.setInput('gameMaster', inputs.gameMaster);
  const actions: CharacterAction[] = [];
  fixture.componentInstance.act.subscribe((action) => actions.push(action));
  await fixture.whenStable();
  return { fixture, actions, el: fixture.nativeElement as HTMLElement };
}

describe('CharacterSheetComponent', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows stats with equipment bonus, the life bar and money', async () => {
    const { el } = await render({ canPlay: false, gameMaster: false });
    expect(el.textContent).toContain('Ada');
    expect(el.textContent).toContain('40 coins');
    expect(el.textContent).toContain('6 / 12');
    expect(el.querySelector('[aria-label="Spend a point on Life"]')).toBeNull();
    expect(el.querySelector('#grant-points')).toBeNull();
  });

  it('lets the player spend a point', async () => {
    const { el, actions } = await render({ canPlay: true, gameMaster: false });
    (
      el.querySelector(
        '[aria-label="Spend a point on Strength"]',
      ) as HTMLButtonElement
    ).click();
    expect(actions).toEqual([{ kind: 'spend-stat-point', attributeId: 'str' }]);
  });

  it('gives the game master the grant form', async () => {
    const { el } = await render({ canPlay: true, gameMaster: true });
    expect(el.querySelector('#grant-points')).not.toBeNull();
  });
});
