import 'fake-indexeddb/auto';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Tooltip } from '@openng/optimus-ui/tooltip';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { Character } from '../../../world/models/world';
import { CharacterSheetComponent } from './character-sheet.component';

const world = {
  attributes: [{ id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }],
  barAttributes: { life: 'life' },
  levelCurve: { preset: 'growing' },
  maxLevel: 20,
};

const character: Character = {
  id: 'c', playerId: 'p', name: 'Ada', statPoints: 0, xp: 0, level: 1, money: 0,
  attributes: [{ attributeId: 'life', level: 0, current: 10 }],
  inventory: [], rev: 1, updatedAt: 0, skillPoints: 0, skills: [],
};

const names = {
  en: { stats: 'Stats', equipment: 'Equipment', inventory: 'Inventory', skills: 'Skills' },
  fr: { stats: 'Stats', equipment: 'Équipement', inventory: 'Inventaire', skills: 'Compétences' },
};

async function render() {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {},
  }));
  TestBed.configureTestingModule({ imports: [CharacterSheetComponent], providers: TEST_PROVIDERS });
  const fixture = TestBed.createComponent(CharacterSheetComponent);
  fixture.componentRef.setInput('character', character);
  fixture.componentRef.setInput('world', world);
  fixture.componentRef.setInput('canPlay', false);
  fixture.componentRef.setInput('gameMaster', false);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

const tabs = (el: HTMLElement) => Array.from(el.querySelectorAll('p-tab')) as HTMLElement[];

describe('CharacterSheetComponent icon tabs', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows four tabs, in order, each with an icon and no text label', async () => {
    const { el } = await render();
    const all = tabs(el);
    expect(all.length).toBe(4);
    for (const tab of all) {
      expect(tab.querySelector('i.pi')).not.toBeNull();
      expect(tab.textContent!.replace(/\s+/g, '')).not.toMatch(/[A-Za-zÀ-ÿ]/);
    }
  });

  it('labels each tab with its translated name (EN)', async () => {
    const { el } = await render();
    expect(tabs(el).map((t) => t.getAttribute('aria-label'))).toEqual([
      names.en.stats, names.en.equipment, names.en.inventory, names.en.skills,
    ]);
  });

  it('gives each tab a tooltip with its translated name (EN)', async () => {
    const { fixture } = await render();
    const tips = fixture.debugElement
      .queryAll(By.css('p-tab'))
      .map((d) => d.injector.get(Tooltip).getOption('tooltipLabel'));
    expect(tips).toEqual([names.en.stats, names.en.equipment, names.en.inventory, names.en.skills]);
  });

  it('translates the aria-labels and tooltips in French', async () => {
    const { fixture, el } = await render();
    TestBed.inject(LanguageBusiness).setLanguage('fr');
    TestBed.inject(ApplicationRef).tick();
    await fixture.whenStable();
    const expected = [names.fr.stats, names.fr.equipment, names.fr.inventory, names.fr.skills];
    expect(tabs(el).map((t) => t.getAttribute('aria-label'))).toEqual(expected);
    const tips = fixture.debugElement
      .queryAll(By.css('p-tab'))
      .map((d) => d.injector.get(Tooltip).getOption('tooltipLabel'));
    expect(tips).toEqual(expected);
  });

  it('still opens the equipment panel from its icon tab', async () => {
    const { fixture, el } = await render();
    el.querySelector<HTMLElement>('p-tab[aria-label="Equipment"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.querySelector('.slots')).not.toBeNull();
    expect(el.querySelector('p-tab[aria-label="Equipment"]')!.getAttribute('aria-selected')).toBe('true');
  });

  it('still opens the skills panel from its icon tab', async () => {
    const { fixture, el } = await render();
    el.querySelector<HTMLElement>('p-tab[aria-label="Skills"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.querySelector('p-tab[aria-label="Skills"]')!.getAttribute('aria-selected')).toBe('true');
    expect(el.querySelector('p-tab[aria-label="Stats"]')!.getAttribute('aria-selected')).toBe('false');
  });
});
