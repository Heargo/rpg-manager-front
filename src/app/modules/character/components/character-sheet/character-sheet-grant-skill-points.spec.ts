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

async function render(inputs: { gameMaster: boolean }) {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {},
  }));
  TestBed.configureTestingModule({ imports: [CharacterSheetComponent], providers: TEST_PROVIDERS });
  const fixture = TestBed.createComponent(CharacterSheetComponent);
  fixture.componentRef.setInput('character', character);
  fixture.componentRef.setInput('world', world);
  fixture.componentRef.setInput('classView', classView);
  fixture.componentRef.setInput('canPlay', true);
  fixture.componentRef.setInput('gameMaster', inputs.gameMaster);
  const actions: CharacterAction[] = [];
  fixture.componentInstance.act.subscribe((action) => actions.push(action));
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  (el.querySelector('p-tab[aria-label="Skills"]') as HTMLElement).click();
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, actions, el };
}

async function submit(
  { fixture, el }: { fixture: { whenStable(): Promise<unknown> }; el: HTMLElement },
  amount: string,
) {
  const input = el.querySelector('#grant-skill-points') as HTMLInputElement;
  input.focus();
  input.value = amount;
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new Event('blur'));
  await fixture.whenStable();
  const host = el.querySelector('[data-testid="grant-skill-points-button"]')!;
  (host.matches('button') ? (host as HTMLButtonElement) : host.querySelector('button')!).click();
}

describe('CharacterSheetComponent grant skill points', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('gives the game master a grant box on the Skills tab that emits grant-skill-points', async () => {
    const rendered = await render({ gameMaster: true });
    expect(rendered.el.querySelector('.grant-panel #grant-skill-points')).not.toBeNull();
    await submit(rendered, '7');
    expect(rendered.actions).toEqual([{ kind: 'grant-skill-points', amount: 7 }]);
  });

  it('emits nothing for an amount below 1', async () => {
    const rendered = await render({ gameMaster: true });
    await submit(rendered, '0');
    expect(rendered.actions).toEqual([]);
  });

  it('hides the grant box from players', async () => {
    const { el } = await render({ gameMaster: false });
    expect(el.querySelector('#grant-skill-points')).toBeNull();
  });
});
