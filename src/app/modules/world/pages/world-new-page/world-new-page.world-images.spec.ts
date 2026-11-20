import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { provideBasePack } from '../../../../../testing/base-pack';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { WorldLibraryBusiness } from '../../business/world-library.business';
import { validateWorldDraft } from '../../helpers/world-draft.rules';
import { WorldNewPageComponent } from './world-new-page.component';

describe('WorldNewPageComponent pack world images', () => {
  it('offers each image with a link to its source, opening in a new tab', async () => {
    globalThis.indexedDB = new IDBFactory();
    TestBed.configureTestingModule({
      imports: [WorldNewPageComponent],
      providers: [
        ...TEST_PROVIDERS,
        provideBasePack(),
        { provide: WorldLibraryBusiness, useValue: { validateDraft: validateWorldDraft, uploadImage: async () => 'img', create: async () => undefined } },
      ],
    });
    const fixture = TestBed.createComponent(WorldNewPageComponent);
    const el = fixture.nativeElement as HTMLElement;

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(el.querySelectorAll('[data-test="world-images"] li').length).toBe(9);
    });

    const link = el.querySelector<HTMLAnchorElement>(
      '[data-test="world-images"] a[href="https://www.vecteezy.com/vector-art/273915-ocean-background"]',
    );
    expect(link).not.toBeNull();
    expect(link!.getAttribute('target')).toBe('_blank');
    expect(link!.getAttribute('rel')).toContain('noopener');
    expect(el.querySelectorAll('[data-test="world-images"] a[href^="https://www.vecteezy.com/"]').length).toBe(9);
  });
});
