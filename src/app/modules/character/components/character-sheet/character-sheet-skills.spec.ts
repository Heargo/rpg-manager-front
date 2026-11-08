import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { CharacterClass } from '../../../class/models/class';
import { Skill } from '../../../skill/models/skill';
import { Character } from '../../../world/models/world';
import { CharacterAction } from '../../helpers/character-actions.rules';
import { CharacterSheetComponent } from './character-sheet.component';

const skill = (id: string, maxRank: number, pointCost: number): Skill => ({
  id, name: id.toUpperCase(), description: '', rarity: 'common', type: 'active', maxRank, pointCost,
  target: 'one-enemy', cooldown: 0, effects: [{ kind: 'damage', attribute: 'Life', amount: 'rank' }],
});

const mage: CharacterClass = {
  id: 'mage', name: 'Mage', description: '',
  tree: [
    { skillId: 'bolt', requires: [], minLevel: 1, column: 0, row: 0 },
    { skillId: 'strike', requires: [{ skillId: 'bolt', rank: 2 }], minLevel: 2, column: 1, row: 0 },
    { skillId: 'aura', requires: [{ skillId: 'strike', rank: 1 }], minLevel: 1, column: 2, row: 0 },
  ],
};
/** What `class/mine` returns: the class (null without one) and the skills it references plus the sheet's. */
const classView = {
  characterClass: mage,
  skills: [skill('bolt', 3, 2), skill('strike', 2, 1), skill('aura', 1, 1), skill('taught', 5, 1)],
};

const world = {
  attributes: [{ id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }],
  barAttributes: { life: 'life' },
  levelCurve: { preset: 'growing' },
  maxLevel: 20,
};

const character: Character = {
  id: 'c', playerId: 'p', name: 'Ada', statPoints: 0, xp: 250, level: 2, money: 0,
  attributes: [{ attributeId: 'life', level: 0, current: 10 }],
  inventory: [], rev: 1, updatedAt: 0,
  classId: 'mage', skillPoints: 3,
  skills: [{ skillId: 'bolt', rank: 2 }, { skillId: 'taught', rank: 1 }],
};

async function render(inputs: { gameMaster: boolean; character?: Character }) {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {},
  }));
  TestBed.configureTestingModule({ imports: [CharacterSheetComponent], providers: TEST_PROVIDERS });
  const fixture = TestBed.createComponent(CharacterSheetComponent);
  fixture.componentRef.setInput('character', inputs.character ?? character);
  fixture.componentRef.setInput('world', world);
  fixture.componentRef.setInput('classView', classView);
  fixture.componentRef.setInput('canPlay', true);
  fixture.componentRef.setInput('gameMaster', inputs.gameMaster);
  const actions: CharacterAction[] = [];
  fixture.componentInstance.act.subscribe((action) => actions.push(action));
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const tab = Array.from(el.querySelectorAll('p-tab')).find((t) => t.textContent?.includes('Skills')) as HTMLElement;
  tab.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const click = (selector: string) => {
    const host = el.querySelector(selector) as HTMLElement;
    (host.matches('button') ? host : host.querySelector('button')!).click();
  };
  return { actions, el, click };
}

describe('CharacterSheetComponent Skills tab', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the tree with the state of each node and the unspent points badge', async () => {
    const { el } = await render({ gameMaster: false });

    const state = (id: string) => el.querySelector(`[data-tree-node="${id}"]`)!.getAttribute('data-state');
    expect(state('bolt')).toBe('learned');
    expect(state('strike')).toBe('available');
    expect(state('aura')).toBe('locked');
    expect(el.querySelector('[data-skill-points]')!.textContent).toContain('3');
  });

  it('lists the skills taught outside the tree', async () => {
    const { el } = await render({ gameMaster: false });

    expect(el.querySelector('[data-taught="taught"]')!.textContent).toContain('TAUGHT');
    expect(el.querySelector('[data-taught="bolt"]')).toBeNull();
  });

  it('lets a player learn or rank up what they can afford, and emits learn-skill', async () => {
    const { actions, click, el } = await render({ gameMaster: false });

    expect(el.querySelector('[data-learn="aura"]')).toBeNull();
    click('[data-learn="strike"]');
    click('[data-learn="bolt"]');
    expect(actions).toEqual([
      { kind: 'learn-skill', skillId: 'strike' },
      { kind: 'learn-skill', skillId: 'bolt' },
    ]);
    expect(el.querySelector('[data-refund]')).toBeNull();
  });

  it('offers no learn control without enough points', async () => {
    const { el } = await render({ gameMaster: false, character: { ...character, skillPoints: 0 } });

    expect(el.querySelector('[data-learn]')).toBeNull();
    expect(el.querySelector('[data-skill-points]')!.textContent).toContain('0');
  });

  it('lets the game master refund and remove, and not learn', async () => {
    const { actions, click, el } = await render({ gameMaster: true });

    expect(el.querySelector('[data-learn]')).toBeNull();
    click('[data-refund="bolt"]');
    click('[data-remove-taught="taught"]');
    expect(actions).toEqual([
      { kind: 'refund-skill', skillId: 'bolt' },
      { kind: 'set-skill', skillId: 'taught', rank: 0 },
    ]);
  });
});
