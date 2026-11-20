import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { provideBasePack } from '../../../testing/base-pack';
import { provideTestTranslations } from '../../../testing/test-providers';
import { ActivePacksBusiness } from './active-packs.business';
import { PackBusiness } from './pack.business';

describe('PackBusiness: world images', () => {
  let business: PackBusiness;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    TestBed.configureTestingModule({ providers: [provideTestTranslations(), provideBasePack()] });
    business = TestBed.inject(PackBusiness);
  });

  it('lists the nine base-assets world images, with label, tags, source and a URL in the pack folder', async () => {
    const images = await business.worldImages();

    expect(images).toHaveLength(9);
    expect(images.find((i) => i.id === 'mountains-night')).toMatchObject({
      packId: 'base-assets',
      label: expect.any(String),
      tags: ['mountain', 'night'],
      imageUrl: 'packs/base-assets/worlds/mountains-night.webp',
      source: 'https://www.vecteezy.com/vector-art/7095576-mountains-in-the-night-sky-near-the-clouds-vector-flat-illustration-landscape',
    });
  });

  it('offers none when the open world does not use base-assets', async () => {
    TestBed.inject(ActivePacksBusiness).set(['base-en'], 'en');

    expect(await business.worldImages()).toEqual([]);
  });
});
