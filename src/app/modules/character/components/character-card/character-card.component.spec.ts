import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { Character } from '../../../world/models/world';
import { CharacterCardComponent } from './character-card.component';

const world = {
  attributes: [
    { id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
    { id: 'mana', name: 'Mana', baseValue: 5, formula: { preset: 'linear', step: 1 } },
  ],
  barAttributes: { life: 'life', mana: 'mana' },
  levelCurve: { preset: 'growing' },
};

const character: Character = {
  id: 'c',
  playerId: 'p',
  name: 'Ada',
  statPoints: 3,
  xp: 250,
  level: 2,
  money: 40,
  attributes: [
    { attributeId: 'life', level: 0, current: 6 },
    { attributeId: 'mana', level: 0, current: 4 },
  ],
  inventory: [],
  rev: 1,
  updatedAt: 0,
};

async function render(overrides: Partial<Character> = {}) {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  TestBed.configureTestingModule({
    imports: [CharacterCardComponent],
    providers: TEST_PROVIDERS,
  });
  const fixture = TestBed.createComponent(CharacterCardComponent);
  fixture.componentRef.setInput('character', { ...character, ...overrides });
  fixture.componentRef.setInput('world', world);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('CharacterCardComponent', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the name and the level badge', async () => {
    const { el } = await render();
    expect(el.querySelector('[data-testid="card-name"]')!.textContent).toContain('Ada');
    expect(el.querySelector('[data-testid="character-level"]')!.textContent).toContain('2');
  });

  it('shows the initial when there is no portrait', async () => {
    const { el } = await render();
    expect(el.querySelector('[data-testid="card-portrait"]')!.textContent).toContain('A');
  });

  it('shows the bundled sample portrait when the character has one', async () => {
    const { el } = await render({ samplePortrait: 'images/sample-hero.webp' });
    const img = el.querySelector('[data-testid="card-portrait"] img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('images/sample-hero.webp');
  });

  it('shows the money', async () => {
    const { el } = await render();
    expect(el.querySelector('[data-coin="copper"]')!.textContent).toContain('40');
  });

  it('does not show the stat points', async () => {
    const { el } = await render();
    expect(el.querySelector('[data-testid="card-stat-points"]')).toBeNull();
  });

  it('shows the XP progress and text', async () => {
    const { el } = await render();
    const bar = el.querySelector('[data-testid="xp-progress"]')!;
    expect(bar.tagName.toLowerCase()).toBe('p-progressbar');
    expect(bar.getAttribute('aria-valuenow') ?? bar.querySelector('[aria-valuenow]')?.getAttribute('aria-valuenow')).toBe('17');
    expect(el.querySelector('[data-testid="xp-text"]')!.textContent).toContain('50 / 300');
  });

  it('shows the life and mana bars as current / max', async () => {
    const { el } = await render();
    const strip = el.querySelector('[data-testid="card-bars"]')!;
    expect(strip.textContent).toContain('Life');
    expect(strip.textContent).toContain('6 / 10');
    expect(strip.textContent).toContain('Mana');
    expect(strip.textContent).toContain('4 / 5');
  });

  it('has no game master controls', async () => {
    const { el } = await render();
    expect(el.querySelector('#grant-points')).toBeNull();
    expect(el.querySelector('#grant-xp')).toBeNull();
    expect(el.querySelector('button')).toBeNull();
  });
});
