import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { provideBasePackOnDisk, baseContent } from '../../../../testing/base-pack-on-disk';
import { baseManifest } from '../../../../testing/base-pack';
import { STARTER_SNAPSHOT } from '../../../../testing/starter-snapshot';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { LanguageBusiness } from '../../../core/business/language.business';
import { validatePackContent } from '../../../core/packs/pack-content';
import { WorldLibraryBusiness } from './world-library.business';
import { WorldSessionBusiness } from './world-session.business';
import { PackContentImportBusiness } from './pack-content-import.business';

const linear = { preset: 'linear', step: 1 } as const;

const NAMES = {
  en: ['Life', 'Mana', 'Strength', 'Agility', 'Intelligence'],
  fr: ['Vie', 'Mana', 'Force', 'Agilité', 'Intelligence'],
} as const;

describe.each(['en', 'fr'] as const)('the starter classes and skills Base ships (%s)', (lang) => {
  const packId = `base-${lang}`;
  const session = () => TestBed.inject(WorldSessionBusiness);
  const world = () => session().$world()!;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({ providers: [provideTestTranslations(), provideBasePackOnDisk()] });
    TestBed.inject(LanguageBusiness).setLanguage(lang);
  });

  async function open(names: readonly string[]) {
    const created = await TestBed.inject(WorldLibraryBusiness).create({
      name: 'Eldoria',
      attributes: names.map((name) => ({ name, baseValue: 5, formula: linear })),
      barAttributes: { life: names[0], ...(names.includes('Mana') ? { mana: 'Mana' } : {}) },
      packs: [packId],
    });
    await session().open(created.id);
  }

  const imported = () => {
    const skills = world().skills;
    const nameOf = (id: string) => skills.find((s) => s.id === id)?.name;
    return {
      skills: skills
        .map(({ id: _id, packHash: _hash, ...rest }: any) => rest)
        .sort((a, b) => a.name.localeCompare(b.name)),
      classes: world().classes.map((c) => ({
        name: c.name,
        description: c.description,
        kind: c.kind,
        tree: c.tree.map((n) => ({
          ...n,
          skillId: nameOf(n.skillId),
          requires: n.requires.map((r) => ({ ...r, skillId: nameOf(r.skillId) })),
        })),
      })),
    };
  };
  const expected = (key: 'full' | 'noMana') => {
    const snapshot = STARTER_SNAPSHOT[`${lang}-${key}`];
    return {
      skills: [...snapshot.skills].sort((a, b) => a.name.localeCompare(b.name)),
      classes: snapshot.classes.map(({ name, description, kind, tree }) => ({ name, description, kind, tree })),
    };
  };

  it('declares the default attributes of a world on the manifest', () => {
    const declared = ((baseManifest(packId) as any).attributes ?? []).map((a: { name: string }) => a.name);

    expect(declared).toEqual([...NAMES[lang]]);
  });

  it('ships a valid skills file and a valid classes file', () => {
    const manifest = baseManifest(packId) as any;
    const context = {
      attributeIds: (manifest.attributes ?? []).map((a: any) => a.id),
      attributeNames: (manifest.attributes ?? []).map((a: any) => a.name),
      skillIds: baseContent(packId, 'skills').map((s) => s.id),
    };

    const skills = validatePackContent('skills', baseContent(packId, 'skills'), context);
    const classes = validatePackContent('classes', baseContent(packId, 'classes'), context);

    expect(skills.ok, ((skills as any).errors ?? []).join(' | ')).toBe(true);
    expect(classes.ok, ((classes as any).errors ?? []).join(' | ')).toBe(true);
  });

  it('gives a default world the same skills and classes the old starter built', async () => {
    await open(NAMES[lang]);

    const result = await TestBed.inject(PackContentImportBusiness).importFromPacks({ domains: ['skills', 'classes'] });

    expect(result.needsChoice).toEqual([]);
    expect(imported()).toEqual(expected('full'));
  });

  it('gives a world without a Mana attribute no mana skill and no cost', async () => {
    await open(NAMES[lang].filter((name) => name !== 'Mana'));
    const mana = ((baseManifest(packId) as any).attributes ?? []).find((a: any) => a.name === 'Mana')?.id;

    const result = await TestBed.inject(PackContentImportBusiness).importFromPacks({
      domains: ['skills', 'classes'],
      mapping: { [mana]: 'skip' },
    });

    expect(result.needsChoice).toEqual([]);
    expect(imported()).toEqual(expected('noMana'));
    expect(world().skills.some((s) => s.cost)).toBe(false);
  });
});
