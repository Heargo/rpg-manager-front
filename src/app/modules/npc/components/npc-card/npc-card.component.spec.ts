import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { Npc } from '../../models/npc';
import { NpcCardComponent } from './npc-card.component';

const world = {
  attributes: [{ id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }],
  barAttributes: { life: 'life' },
  levelCurve: { preset: 'growing' },
  maxLevel: 20,
};

const npc: Npc = {
  id: 'n1', name: 'Goblin', statPoints: 0, xp: 0, level: 1, money: 5, updatedAt: 1, skillPoints: 0, skills: [],
  attributes: [], inventory: [], roles: ['enemy', 'merchant'], description: '', xpReward: 20, loot: [],
};

/** Hooks: `card-portrait`, `card-name`, `npc-level` (with `data-rarity`), `[data-role]` per role tag (data-testid). */
async function render(overrides: Partial<Npc> = {}) {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  TestBed.configureTestingModule({ imports: [NpcCardComponent], providers: TEST_PROVIDERS });
  const fixture = TestBed.createComponent(NpcCardComponent);
  fixture.componentRef.setInput('npc', { ...npc, ...overrides });
  fixture.componentRef.setInput('world', world);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('NpcCardComponent', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the name', async () => {
    const el = await render();
    expect(el.querySelector('[data-testid="card-name"]')!.textContent).toContain('Goblin');
  });

  it('shows the initial when there is no portrait, and the sample portrait when there is one', async () => {
    expect((await render()).querySelector('[data-testid="card-portrait"]')!.textContent).toContain('G');
    TestBed.resetTestingModule();
    const el = await render({ samplePortrait: 'images/sample-hero.webp' });
    expect(el.querySelector('[data-testid="card-portrait"] img')!.getAttribute('src')).toBe('images/sample-hero.webp');
  });

  it('shows the level badge on the rarity scale, legendary at the max level', async () => {
    const level = (el: HTMLElement) => el.querySelector('[data-testid="npc-level"]')!;
    const first = level(await render({ level: 1 }));
    expect(first.getAttribute('data-rarity')).toBe('common');
    expect(first.textContent).toContain('1');
    TestBed.resetTestingModule();
    expect(level(await render({ level: 12 })).getAttribute('data-rarity')).toBe('rare');
    TestBed.resetTestingModule();
    expect(level(await render({ level: 20 })).getAttribute('data-rarity')).toBe('legendary');
  });

  it('shows one tag per role', async () => {
    const el = await render();
    const roles = Array.from(el.querySelectorAll('[data-testid="npc-role"]')).map((r) => r.getAttribute('data-role'));
    expect(roles).toEqual(['enemy', 'merchant']);
  });

  it('has no controls of its own', async () => {
    expect((await render()).querySelector('button')).toBeNull();
  });
});
