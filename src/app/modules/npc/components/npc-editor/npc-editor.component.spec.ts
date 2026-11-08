import { TestBed } from '@angular/core/testing';
import npcNames from '../../../../../../public/i18n/generators/en/npcs.json';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { WordListService } from '../../../../core/services/word-list.service';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { Item, World } from '../../../world/models/world';
import { Npc } from '../../models/npc';
import { NpcEditorComponent } from './npc-editor.component';

/**
 * Hooks (all tab panels rendered, hidden or not). Inputs/textarea `[data-field]`: `name`, `description`, `level`,
 * `money` (coin input, copper field inside), `attribute-level-<attribute id>`, `xp-reward`, `buy-ratio`, `sell-ratio`,
 * `json` (textarea), `seed`, `json-error` (only while invalid). `p-multiselect[data-field="roles"]` and
 * `p-select[data-field="add-item"]` (ngModelChange with an item id adds a copy to the inventory). Per inventory
 * entry `[data-field="inventory-entry"]`: `[data-action="toggle-equipped"]`, `[data-action="toggle-loot"]` (enemy only),
 * `[data-action="remove-item"]`. Buttons `[data-action]`: `generate`, `save`. No `[data-field="class"]` yet.
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
  const world: World = {
    ...createSandboxWorld((key) => key),
    attributes: [
      { id: 'wit', name: 'Wit', baseValue: 5, formula: { preset: 'linear', step: 1 } },
      { id: 'grit', name: 'Grit', baseValue: 5, formula: { preset: 'linear', step: 1 } },
    ],
    levelCurve: { preset: 'flat' },
    maxLevel: 10,
    items: [charm, sword],
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
      providers: [...TEST_PROVIDERS, { provide: WordListService, useValue: { loadNpcNames: async () => npcNames } }],
    });
    const fixture = TestBed.createComponent(NpcEditorComponent);
    fixture.componentRef.setInput('world', world);
    if (npc) fixture.componentRef.setInput('npc', npc);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const field = (name: string) =>
      el.querySelector<HTMLInputElement>(
        name === 'money' ? '[data-field="money"] input[name="copper"]' : `[data-field="${name}"]`,
      )!;
    const settleAll = async () => {
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await fixture.whenStable();
      }
    };
    const type = async (name: string, value: string) => {
      const input = field(name);
      input.value = value;
      input.dispatchEvent(new Event('input'));
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

  it('has no class or skills yet', async () => {
    const { el } = await setup(goblin);
    expect(el.querySelector('[data-field="class"]')).toBeNull();
    expect(el.querySelector('[data-field="skills"]')).toBeNull();
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
    await click('[data-action="generate"]');
    const first = field('name').value;
    expect(first).not.toBe('');
    const json = JSON.parse(field('json').value);
    expect(json.level).toBeGreaterThanOrEqual(1);
    expect(json.level).toBeLessThanOrEqual(10);
    expect(Number(field('level').value)).toBe(json.level);
    expect(json.xp).toBe((json.level - 1) * 100);

    await type('name', 'changed');
    await click('[data-action="generate"]');
    expect(field('name').value).toBe(first);

    await click('[data-action="save"]');
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe(first);
  });
});
