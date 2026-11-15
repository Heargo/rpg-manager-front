import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { WorldLibraryBusiness } from '../../world/business/world-library.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { CharacterClass, ClassDraft } from '../models/class';
import { ClassCatalogueBusiness } from './class-catalogue.business';

const draft: ClassDraft = {
  name: 'Guerrier',
  description: 'Au combat.',
  kind: 'warrior',
  tree: [{ skillId: 's1', requires: [], minLevel: 1, column: 0, row: 0 }],
};

describe('saving a class with its kind', () => {
  it('stores it with the world and keeps it when the class is edited', async () => {
    globalThis.indexedDB = new IDBFactory();
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    const world = await TestBed.inject(WorldLibraryBusiness).create({
      name: 'Eldoria',
      attributes: [{ name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }],
    });
    await TestBed.inject(WorldSessionBusiness).open(world.id);
    const catalogue = TestBed.inject(ClassCatalogueBusiness);

    const saved = await catalogue.save(draft);
    expect(saved).toMatchObject({ kind: 'warrior' });
    const stored = await TestBed.inject(WorldLibraryBusiness).get(world.id);
    expect(stored!.classes.find((c: CharacterClass) => c.id === saved.id)).toMatchObject({ kind: 'warrior' });

    const edited = await catalogue.save({ ...saved, name: 'Grand guerrier' });
    expect(edited).toMatchObject({ id: saved.id, name: 'Grand guerrier', kind: 'warrior' });
  });
});
