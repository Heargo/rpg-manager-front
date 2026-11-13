import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import en from '../../../../../public/packs/base/generators/en/items.json';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { PackBusiness } from '../../../core/business/pack.business';
import { SandboxCatalogueBusiness } from '../../tools/business/sandbox-catalogue.business';
import { WorldLibraryBusiness } from '../../world/business/world-library.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { ItemCatalogueBusiness } from './item-catalogue.business';

const draft = {
  name: 'Moon Charm',
  description: 'Glows.',
  rarity: 'rare' as const,
  type: 'item' as const,
  slot: 'none' as const,
  price: 12,
  modifiers: [{ attribute: 'Life', value: 2 }],
};

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe('saving an item from the editor', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    TestBed.configureTestingModule({
      providers: [
        provideTestTranslations(),
        { provide: PackBusiness, useValue: { wordList: async () => en, packsFor: async () => ['base'], $installed: () => [] } },
      ],
    });
  });

  describe('hosted world', () => {
    async function setup() {
      const world = await TestBed.inject(WorldLibraryBusiness).create({
        name: 'Eldoria',
        attributes: [{ name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }],
      });
      await TestBed.inject(WorldSessionBusiness).open(world.id);
      return { id: world.id, catalogue: TestBed.inject(ItemCatalogueBusiness) };
    }

    it('creates an item with a new id and saves it with the world', async () => {
      const { id, catalogue } = await setup();
      const before = catalogue.$world()!.items.length;
      const saved = await catalogue.save(draft);

      expect(saved.id).toBeTruthy();
      expect(catalogue.$world()!.items).toHaveLength(before + 1);
      const stored = await TestBed.inject(WorldLibraryBusiness).get(id);
      expect(stored!.items.find((item) => item.id === saved.id)).toEqual(saved);
      expect(saved).toMatchObject(draft);
    });

    it('updates an item in place, keeping its id and image', async () => {
      const { id, catalogue } = await setup();
      const created = await catalogue.save({ ...draft, imageId: 'img-1' });
      const count = catalogue.$world()!.items.length;

      const updated = await catalogue.save({ ...created, name: 'Sun Charm', price: 99 });

      expect(updated).toMatchObject({ id: created.id, name: 'Sun Charm', price: 99, imageId: 'img-1' });
      expect(catalogue.$world()!.items).toHaveLength(count);
      const stored = await TestBed.inject(WorldLibraryBusiness).get(id);
      expect(stored!.items.find((item) => item.id === created.id)!.name).toBe('Sun Charm');
    });
  });

  describe('sandbox', () => {
    it('keeps created and updated items in memory', async () => {
      const sandbox = TestBed.inject(SandboxCatalogueBusiness);
      await settle();
      const before = sandbox.$world().items.length;

      const created = sandbox.save(draft);
      expect(created.id).toBeTruthy();
      expect(sandbox.$world().items).toHaveLength(before + 1);

      sandbox.save({ ...created, name: 'Sun Charm' });
      expect(sandbox.$world().items).toHaveLength(before + 1);
      expect(sandbox.$world().items.find((item) => item.id === created.id)!.name).toBe('Sun Charm');
    });
  });
});
