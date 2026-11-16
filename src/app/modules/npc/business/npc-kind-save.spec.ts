import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { WorldLibraryBusiness } from '../../world/business/world-library.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { Npc } from '../models/npc';
import { NpcCatalogueBusiness } from './npc-catalogue.business';

const draft: Omit<Npc, 'id'> = {
  name: 'Louve grise', statPoints: 0, xp: 200, level: 3, money: 5, updatedAt: 1, skillPoints: 0, skills: [],
  attributes: [], inventory: [], roles: ['enemy'], description: '', xpReward: 40, loot: [], kind: 'wolf',
};

describe('saving an NPC with its kind', () => {
  it('stores it with the world and keeps it when the NPC is edited', async () => {
    globalThis.indexedDB = new IDBFactory();
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    const world = await TestBed.inject(WorldLibraryBusiness).create({
      name: 'Eldoria',
      attributes: [{ name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }],
    });
    await TestBed.inject(WorldSessionBusiness).open(world.id);
    const catalogue = TestBed.inject(NpcCatalogueBusiness);

    const saved = await catalogue.save(draft);
    expect(saved).toMatchObject({ kind: 'wolf' });
    const stored = await TestBed.inject(WorldLibraryBusiness).get(world.id);
    expect(stored!.npcs.find((npc) => npc.id === saved.id)).toMatchObject({ kind: 'wolf' });

    const edited = await catalogue.save({ ...saved, name: 'Louve blanche' });
    expect(edited).toMatchObject({ id: saved.id, name: 'Louve blanche', kind: 'wolf' });
  });
});
