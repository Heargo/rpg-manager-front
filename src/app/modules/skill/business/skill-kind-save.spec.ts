import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { WorldLibraryBusiness } from '../../world/business/world-library.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { Skill, SkillDraft } from '../models/skill';
import { SkillCatalogueBusiness } from './skill-catalogue.business';

const draft: SkillDraft = {
  name: 'Coup',
  description: 'Un coup.',
  rarity: 'common',
  type: 'active',
  maxLevel: 2,
  pointCost: 1,
  target: 'one-enemy',
  cooldown: 0,
  effects: [{ kind: 'damage', attribute: 'Life', amount: 'skillLevel * 3' }],
  kind: 'strike',
};

describe('saving a skill with its kind', () => {
  it('stores it with the world and keeps it when the skill is edited', async () => {
    globalThis.indexedDB = new IDBFactory();
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    const world = await TestBed.inject(WorldLibraryBusiness).create({
      name: 'Eldoria',
      attributes: [{ name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }],
    });
    await TestBed.inject(WorldSessionBusiness).open(world.id);
    const catalogue = TestBed.inject(SkillCatalogueBusiness);

    const saved = await catalogue.save(draft);
    expect(saved).toMatchObject({ kind: 'strike' });
    const stored = await TestBed.inject(WorldLibraryBusiness).get(world.id);
    expect(stored!.skills.find((skill: Skill) => skill.id === saved.id)).toMatchObject({ kind: 'strike' });

    const edited = await catalogue.save({ ...saved, name: 'Grand coup' });
    expect(edited).toMatchObject({ id: saved.id, name: 'Grand coup', kind: 'strike' });
  });
});
