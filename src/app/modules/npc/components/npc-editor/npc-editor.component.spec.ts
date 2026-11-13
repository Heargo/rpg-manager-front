import { TestBed } from '@angular/core/testing';
import npcNames from '../../../../../../public/packs/base/generators/en/npcs.json';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { PackBusiness } from '../../../../core/business/pack.business';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { Item, World } from '../../../world/models/world';
import { CharacterClass } from '../../../class/models/class';
import { Skill } from '../../../skill/models/skill';
import { Npc } from '../../models/npc';
import { NpcEditorComponent } from './npc-editor.component';

/**
 * Hooks (all tab panels rendered, hidden or not). Inputs/textarea `[data-field]`: `name`, `description`, `level`,
 * `money` (coin input, copper field inside), `attribute-level-<attribute id>`, `xp-reward`, `buy-ratio`, `sell-ratio`,
 * `json` (textarea), `seed`, `json-error` (only while invalid). `p-multiselect[data-field="roles"]` and
 * `p-select[data-field="add-item"]` (ngModelChange with an item id adds a copy to the inventory). Per inventory
 * entry `[data-field="inventory-entry"]`: `[data-action="toggle-equipped"]`, `[data-action="toggle-loot"]` (enemy only),
 * `[data-action="remove-item"]`. Buttons `[data-action]`: `generate-seed` (from the visible seed), `random` (fresh seed), `save`. Class and skills (new hooks):
 * `p-select[data-field="class"]` (ngModelChange with a class id, or null to clear), `[data-action="learn-from-class"]`,
 * `p-select[data-field="add-skill"]` (ngModelChange with a skill id adds it at level 1), per skill `[data-field="skill-entry"]`
 * holding `[data-field="skill-level"]` (p-inputnumber) and `[data-action="remove-skill"]`, and in the Generate tab
 * `p-select[data-field="generate-class"]` (class id, or null for a random one).
 */
describe('NpcEditorComponent', () => {
  const charm: Item = {
    id: 'charm', name: 'Moon Charm', description: '', rarity: 'rare', type: 'item', slot: 'none', price: 12,
    modifiers: [],
  };
  const sword: Item = {
    id: 'sword', name: 'Iron Sword', description: '', rarity: 'common', type: 'equipment', slot: 'weapon1', price: 5,
    modifiers: [{ attribute: 'Wit', value: 1 }],
  };
  const mkSkill = (id: string, maxLevel: number): Skill => ({
    id, name: `Skill ${id}`, description: '', rarity: 'common', type: 'passive', maxLevel, pointCost: 1, effects: [],
  });
  const warrior: CharacterClass = {
    id: 'warrior', name: 'Warrior', description: '',
    tree: [
      { skillId: 'a', requires: [], minLevel: 1, column: 0, row: 0 },
      { skillId: 'b', requires: [{ skillId: 'a', level: 1 }], minLevel: 1, column: 0, row: 1 },
    ],
  };
  const brute: CharacterClass = {
    id: 'brute', name: 'Brute', description: '',
    tree: [{ skillId: 'free', requires: [], minLevel: 1, column: 0, row: 0 }],
  };
  const world: World = {
    ...createSandboxWorld((key) => key),
    attributes: [
      { id: 'wit', name: 'Wit', baseValue: 5, formula: { preset: 'linear', step: 1 } },
      { id: 'grit', name: 'Grit', baseValue: 5, formula: { preset: 'linear', step: 1 } },
    ],
    levelCurve: { preset: 'flat' },
    maxLevel: 10,
    items: [charm, sword],
    startingSkillPoints: 2,
    skillPointsPerLevel: 1,
    skills: [mkSkill('a', 2), mkSkill('b', 1), mkSkill('free', 3)],
    classes: [warrior, brute],
  };
  const goblin: Npc = {
    id: 'n1', name: 'Goblin', description: 'Sneaky.', roles: ['enemy'], level: 2, xp: 100, statPoints: 0, money: 15,
    updatedAt: 1, skillPoints: 0, skills: [], xpReward: 30, loot: [],
    attributes: [{ attributeId: 'wit', level: 3, current: 8 }],
    inventory: [],
  };

  async function setup(npc?: Npc) {
    TestBed.configureTestingModule({
      imports: [NpcEditorComponent],
      providers: [...TEST_PROVIDERS, { provide: PackBusiness, useValue: { wordList: async () => npcNames, packsFor: async () => ['base'], $installed: () => [] } }],
    });
    const fixture = TestBed.createComponent(NpcEditorComponent);
    fixture.componentRef.setInput('world', world);
    if (npc) fixture.componentRef.setInput('npc', npc);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    // Number fields are p-inputnumber hosts: resolve them to their inner input.
    const field = (name: string) => {
      const host = el.querySelector<HTMLInputElement>(
        name === 'money' ? '[data-field="money"] input[name="copper"]' : `[data-field="${name}"]`,
      )!;
      return host.tagName === 'P-INPUTNUMBER' ? (host.querySelector('input') as HTMLInputElement) : host;
    };
    const settleAll = async () => {
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await fixture.whenStable();
      }
    };
    const type = async (name: string, value: string) => {
      const host = field(name);
      // Number fields are p-inputnumber hosts: drive the inner input and commit on blur.
      const input = host.matches('input') ? host : ((host as HTMLElement).querySelector('input') ?? host);
      input.focus();
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
      await fixture.whenStable();
    };
    const click = async (selector: string, index = 0) => {
      el.querySelectorAll<HTMLElement>(selector)[index].click();
      await settleAll();
    };
    const emit = async (selector: string, value: unknown) => {
      const target = el.querySelector(selector);
      expect(target).not.toBeNull();
      fixture.debugElement.query((d) => d.nativeElement === target).triggerEventHandler('ngModelChange', value);
      await settleAll();
    };
    const saved: Npc[] = [];
    fixture.componentInstance.save.subscribe((n: Npc) => saved.push(n));
    return { fixture, el, field, type, click, emit, saved };
  }

  it('fills the form and the JSON from the NPC being edited', async () => {
    const { field } = await setup(goblin);
    expect(field('name').value).toBe('Goblin');
    expect(field('description').value).toBe('Sneaky.');
    expect(field('level').value).toBe('2');
    expect(field('money').value).toBe('15');
    expect(field('attribute-level-wit').value).toBe('3');
    expect(field('attribute-level-grit').value).toBe('0');
    expect(JSON.parse(field('json').value)).toMatchObject({ name: 'Goblin', level: 2, xpReward: 30 });
  });

  it('offers the world classes and puts the chosen one in the saved NPC and the JSON', async () => {
    const { field, click, emit, saved } = await setup(goblin);
    await emit('p-select[data-field="class"]', 'warrior');
    expect(JSON.parse(field('json').value).classId).toBe('warrior');
    await click('[data-action="save"]');
    expect(saved[0].classId).toBe('warrior');

    await emit('p-select[data-field="class"]', null);
    await click('[data-action="save"]');
    expect(saved[1].classId).toBeUndefined();
  });

  it('learns from the class: level 2 gives 3 skill points, spent along the tree', async () => {
    const { el, field, click, emit, saved } = await setup(goblin);
    await emit('p-select[data-field="class"]', 'warrior');
    await click('[data-action="learn-from-class"]');
    expect(el.querySelectorAll('[data-field="skill-entry"]')).toHaveLength(2);
    await click('[data-action="save"]');

    expect(saved[0].classId).toBe('warrior');
    expect(saved[0].skills).toEqual([
      { skillId: 'a', level: 2 },
      { skillId: 'b', level: 1 },
    ]);
    expect(saved[0].skillPoints).toBe(0);
    expect(JSON.parse(field('json').value).skills).toEqual(saved[0].skills);
  });

  it('adds any catalogue skill, re-levels it and removes it', async () => {
    const { el, type, click, emit, saved } = await setup(goblin);
    await emit('p-select[data-field="add-skill"]', 'free');
    expect(el.querySelectorAll('[data-field="skill-entry"]')).toHaveLength(1);
    await click('[data-action="save"]');
    expect(saved[0].skills).toEqual([{ skillId: 'free', level: 1 }]);

    const level = el.querySelector<HTMLInputElement>('[data-field="skill-level"] input')!;
    level.focus();
    level.value = '3';
    level.dispatchEvent(new Event('input'));
    level.dispatchEvent(new Event('blur'));
    await type('name', 'Goblin');
    await click('[data-action="save"]');
    expect(saved[1].skills).toEqual([{ skillId: 'free', level: 3 }]);

    await click('[data-action="remove-skill"]');
    expect(el.querySelectorAll('[data-field="skill-entry"]')).toHaveLength(0);
    await click('[data-action="save"]');
    expect(saved[2].skills).toEqual([]);
  });

  it('reads classId and skills from valid JSON', async () => {
    const { el, field, type } = await setup(goblin);
    await type('json', JSON.stringify({ ...JSON.parse(field('json').value), classId: 'brute', skills: [{ skillId: 'free', level: 2 }] }));
    expect(el.querySelectorAll('[data-field="skill-entry"]')).toHaveLength(1);
  });

  it('generates with the chosen class and keeps it in the saved NPC', async () => {
    const { field, type, click, emit, saved } = await setup();
    await type('seed', 'fixed-seed');
    await emit('p-select[data-field="generate-class"]', 'brute');
    await click('[data-action="generate-seed"]');
    const json = JSON.parse(field('json').value);
    expect(json.classId).toBe('brute');
    expect(json.skills.every((s: { skillId: string }) => s.skillId === 'free')).toBe(true);
    expect(json.skills.length).toBeGreaterThan(0);
    await click('[data-action="save"]');
    expect(saved[0].classId).toBe('brute');
    expect(saved[0].skills).toEqual(json.skills);
  });

  it('keeps the JSON in sync with the form, and the form with valid JSON', async () => {
    const { field, type } = await setup(goblin);
    await type('name', 'Hobgoblin');
    expect(JSON.parse(field('json').value).name).toBe('Hobgoblin');

    await type('json', JSON.stringify({ ...JSON.parse(field('json').value), name: 'Orc', description: 'Big.' }));
    expect(field('name').value).toBe('Orc');
    expect(field('description').value).toBe('Big.');
  });

  it('shows the enemy fields with the enemy role and the merchant ratios with the merchant role', async () => {
    const { el, emit } = await setup({ ...goblin, roles: ['story'] });
    expect(el.querySelector('[data-field="xp-reward"]')).toBeNull();
    expect(el.querySelector('[data-field="buy-ratio"]')).toBeNull();
    expect(el.querySelector('[data-field="sell-ratio"]')).toBeNull();

    await emit('p-multiselect[data-field="roles"]', ['story', 'enemy']);
    expect(el.querySelector('[data-field="xp-reward"]')).not.toBeNull();
    expect(el.querySelector('[data-field="buy-ratio"]')).toBeNull();

    await emit('p-multiselect[data-field="roles"]', ['merchant']);
    expect(el.querySelector('[data-field="xp-reward"]')).toBeNull();
    expect(el.querySelector('[data-field="buy-ratio"]')).not.toBeNull();
    expect(el.querySelector('[data-field="sell-ratio"]')).not.toBeNull();
  });

  it('emits the edited NPC with its id: level sets the XP, attribute levels, money, enemy fields', async () => {
    const { type, click, saved } = await setup(goblin);
    await type('name', 'Hobgoblin');
    await type('level', '4');
    await type('attribute-level-grit', '6');
    await type('money', '250');
    await type('xp-reward', '75');
    await click('[data-action="save"]');

    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      id: 'n1', name: 'Hobgoblin', level: 4, xp: 300, money: 250, xpReward: 75, roles: ['enemy'],
    });
    expect(saved[0].attributes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ attributeId: 'wit', level: 3 }),
        expect.objectContaining({ attributeId: 'grit', level: 6 }),
      ]),
    );
  });

  it('emits a new NPC without an id when creating', async () => {
    const { type, click, emit, saved } = await setup();
    await type('name', 'Baker');
    await emit('p-multiselect[data-field="roles"]', ['story', 'merchant']);
    await type('buy-ratio', '1.5');
    await click('[data-action="save"]');

    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ name: 'Baker', roles: ['story', 'merchant'], merchant: { buyRatio: 1.5 } });
    expect(saved[0].id).toBeUndefined();
  });

  it('picks equipment and inventory from the item catalogue, with loot marked for enemies', async () => {
    const { el, click, emit, saved } = await setup(goblin);
    await emit('p-select[data-field="add-item"]', 'sword');
    await emit('p-select[data-field="add-item"]', 'charm');
    expect(el.querySelectorAll('[data-field="inventory-entry"]')).toHaveLength(2);

    await click('[data-action="toggle-equipped"]', 0);
    await click('[data-action="toggle-loot"]', 1);
    await click('[data-action="save"]');

    const npc = saved[0];
    expect(npc.inventory.map((e) => [e.item.id, e.equipped])).toEqual([
      ['sword', true],
      ['charm', false],
    ]);
    expect(npc.loot).toEqual([npc.inventory[1].id]);
  });

  it('removes an inventory entry', async () => {
    const { el, click, emit } = await setup(goblin);
    await emit('p-select[data-field="add-item"]', 'sword');
    await click('[data-action="remove-item"]');
    expect(el.querySelectorAll('[data-field="inventory-entry"]')).toHaveLength(0);
  });

  it('only offers loot marking to enemies', async () => {
    const { el, emit } = await setup({ ...goblin, roles: ['story'] });
    await emit('p-select[data-field="add-item"]', 'sword');
    expect(el.querySelectorAll('[data-field="inventory-entry"]')).toHaveLength(1);
    expect(el.querySelector('[data-action="toggle-loot"]')).toBeNull();
  });

  it('blocks saving while the JSON is invalid', async () => {
    const { field, type, click, el, saved } = await setup(goblin);
    await type('json', '{ nope');
    expect(el.querySelector('[data-field="json-error"]')).not.toBeNull();
    await click('[data-action="save"]');
    expect(saved).toEqual([]);

    await type('json', JSON.stringify({ ...goblin, id: undefined }));
    expect(el.querySelector('[data-field="json-error"]')).toBeNull();
    expect(field('name').value).toBe('Goblin');
  });

  it('blocks saving an invalid NPC (blank name, no role)', async () => {
    const { type, click, emit, saved } = await setup(goblin);
    await type('name', '  ');
    await click('[data-action="save"]');
    expect(saved).toEqual([]);

    await type('name', 'Goblin');
    await emit('p-multiselect[data-field="roles"]', []);
    await click('[data-action="save"]');
    expect(saved).toEqual([]);
  });

  it('generates an NPC from the visible seed and fills the form', async () => {
    const { field, type, click, saved } = await setup();
    await type('seed', 'fixed-seed');
    await click('[data-action="generate-seed"]');
    const first = field('name').value;
    expect(first).not.toBe('');
    const json = JSON.parse(field('json').value);
    expect(json.level).toBeGreaterThanOrEqual(1);
    expect(json.level).toBeLessThanOrEqual(10);
    expect(Number(field('level').value)).toBe(json.level);
    expect(json.xp).toBe((json.level - 1) * 100);

    await type('name', 'changed');
    await click('[data-action="generate-seed"]');
    expect(field('name').value).toBe(first);

    await click('[data-action="save"]');
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe(first);
  });
});
