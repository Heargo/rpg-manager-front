import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { NEON_LINK, neonProviders } from '../../../testing/unofficial-pack';
import { PackStorageService } from '../services/pack-storage.service';
import { PackBusiness } from './pack.business';

describe('PackBusiness update atomicity', () => {
  it('keeps the installed pack and its files when the write of the update fails', async () => {
    globalThis.indexedDB = new IDBFactory();
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: neonProviders().providers });
    const business = TestBed.inject(PackBusiness);
    const storage = TestBed.inject(PackStorageService);
    await business.install(await business.prepare(NEON_LINK));

    const update = await business.checkUpdate('neon');
    update.prepared.files.set('sprites/spark.png', {
      kind: 'json',
      value: () => 1,
    });

    await expect(business.install(update.prepared)).rejects.toBeDefined();

    const [stored] = await storage.list();
    expect(stored.manifest.version).toBe('1.0.0');
    expect(await storage.getFile('neon', 'sprites/tint.png')).toBeDefined();
  });
});
