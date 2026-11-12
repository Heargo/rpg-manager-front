import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { DiceRollBusiness } from '../../../dice/business/dice-roll.business';
import { CharacterClass } from '../../../class/models/class';
import { Skill } from '../../../skill/models/skill';
import { Character } from '../../../world/models/world';
import { CharacterSheetComponent } from './character-sheet.component';

/**
 * Hooks in the Skills tab: `[data-use="<skillId>"]` (Use button, only on a learned active skill) and, once used,
 * `[data-use-result="<skillId>"]` with `data-success="true|false"` whose text contains the amounts.
 * Use rolls through `DiceRollBusiness.rollAtTable(count, faces)` (mocked: values [3, 4], total 7).
 */
const bolt: Skill = {
  id: 'bolt', name: 'Bolt', description: '', rarity: 'common', type: 'active', maxRank: 3, pointCost: 1,
  target: 'one-enemy', cooldown: 0, roll: { count: 2, faces: 6 }, success: { mode: 'threshold', value: 7 },
  effects: [{ kind: 'damage', attribute: 'Life', amount: 'roll + rank' }],
};
const aura: Skill = {
  id: 'aura', name: 'Aura', description: '', rarity: 'common', type: 'passive', maxRank: 1, pointCost: 1,
  effects: [{ kind: 'modify', attribute: 'Life', amount: '1', duration: 0 }],
};
const mage: CharacterClass = {
  id: 'mage', name: 'Mage', description: '',
  tree: [
    { skillId: 'bolt', requires: [], minLevel: 1, column: 0, row: 0 },
    { skillId: 'aura', requires: [], minLevel: 1, column: 1, row: 0 },
  ],
};
const classView = { characterClass: mage, skills: [bolt, aura] };
const worldBase = {
  attributes: [{ id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }],
  barAttributes: { life: 'life' },
  levelCurve: { preset: 'growing' },
  maxLevel: 20,
};
const character: Character = {
  id: 'c', playerId: 'p', name: 'Ada', statPoints: 0, xp: 0, level: 1, money: 0,
  attributes: [{ attributeId: 'life', level: 0, current: 10 }],
  inventory: [], rev: 1, updatedAt: 0, classId: 'mage', skillPoints: 0,
  skills: [{ skillId: 'bolt', rank: 2 }, { skillId: 'aura', rank: 1 }],
};

async function render(options: { skillRollsEnabled: boolean; skill?: Skill } = { skillRollsEnabled: true }) {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {},
  }));
  const rollAtTable = vi.fn(async () => ({ values: [3, 4], total: 7 }));
  TestBed.configureTestingModule({
    imports: [CharacterSheetComponent],
    providers: [...TEST_PROVIDERS, { provide: DiceRollBusiness, useValue: { rollAtTable, roll: rollAtTable } }],
  });
  const fixture = TestBed.createComponent(CharacterSheetComponent);
  fixture.componentRef.setInput('character', character);
  fixture.componentRef.setInput('world', { ...worldBase, skillRollsEnabled: options.skillRollsEnabled });
  fixture.componentRef.setInput('classView', { ...classView, skills: [options.skill ?? bolt, aura] });
  fixture.componentRef.setInput('canPlay', true);
  fixture.componentRef.setInput('gameMaster', false);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  (el.querySelector('p-tab[aria-label="Skills"]') as HTMLElement).click();
  fixture.detectChanges();
  await fixture.whenStable();
  const use = async (id: string) => {
    const host = el.querySelector(`[data-use="${id}"]`) as HTMLElement;
    (host.matches('button') ? host : host.querySelector('button')!).click();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { el, rollAtTable, use };
}

describe('CharacterSheetComponent skill Use', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('offers Use on a learned active skill only', async () => {
    const { el } = await render();
    expect(el.querySelector('[data-use="bolt"]')).not.toBeNull();
    expect(el.querySelector('[data-use="aura"]')).toBeNull();
  });

  it('rolls the skill dice and shows a success with the amounts', async () => {
    const { el, rollAtTable, use } = await render();
    await use('bolt');

    expect(rollAtTable).toHaveBeenCalledWith(2, 6);
    const result = el.querySelector('[data-use-result="bolt"]')!;
    expect(result.getAttribute('data-success')).toBe('true');
    // threshold 7 reached by 3 + 4; damage = roll + rank = 7 + 2
    expect(result.textContent).toContain('9');
  });

  it('shows a failure when the roll does not reach the threshold', async () => {
    const { el, use } = await render({
      skillRollsEnabled: true,
      skill: { ...bolt, success: { mode: 'threshold', value: 8 } },
    });
    await use('bolt');

    expect(el.querySelector('[data-use-result="bolt"]')!.getAttribute('data-success')).toBe('false');
  });

  it('does not roll when the world setting is off: success, with roll as 0', async () => {
    const { el, rollAtTable, use } = await render({ skillRollsEnabled: false });
    await use('bolt');

    expect(rollAtTable).not.toHaveBeenCalled();
    const result = el.querySelector('[data-use-result="bolt"]')!;
    expect(result.getAttribute('data-success')).toBe('true');
    // damage = roll (0) + rank (2)
    expect(result.textContent).toContain('2');
  });
});
