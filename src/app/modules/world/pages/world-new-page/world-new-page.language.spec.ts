import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import {
  extraPackService,
  provideExtraPack,
} from '../../../../../testing/extra-pack';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { WorldLibraryBusiness } from '../../business/world-library.business';
import { validateWorldDraft } from '../../helpers/world-draft.rules';
import { WorldNewPageComponent } from './world-new-page.component';

describe('WorldNewPageComponent language', () => {
  it('creates the world in the language picked in the Rules step', async () => {
    globalThis.indexedDB = new IDBFactory();
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    const create = vi.fn(async () => undefined);
    TestBed.configureTestingModule({
      imports: [WorldNewPageComponent],
      providers: [
        ...TEST_PROVIDERS,
        provideExtraPack(extraPackService()),
        {
          provide: WorldLibraryBusiness,
          useValue: {
            validateDraft: validateWorldDraft,
            uploadImage: async () => 'img',
            create,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(WorldNewPageComponent);
    const el = fixture.nativeElement as HTMLElement;
    const settle = async () => {
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve));
      await fixture.whenStable();
    };
    await settle();
    const name = el.querySelector('#world-name') as HTMLInputElement;
    name.value = 'Eldoria';
    name.dispatchEvent(new Event('input'));
    await settle();
    const button = (label: string) =>
      Array.from(el.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === label,
      ) as HTMLButtonElement;
    button('Next').click();
    await settle();
    el.querySelector<HTMLButtonElement>(
      '[data-testid="attributes-next"] button',
    )!.click();
    await settle();

    (
      el.querySelector('[data-testid="world-language-select"]') as HTMLElement
    ).click();
    await settle();
    const option = Array.from(
      document.querySelectorAll('li[role="option"]'),
    ).find((item) => item.textContent?.trim() === 'Français') as HTMLElement;
    option.click();
    await settle();
    button('Create')?.click();
    await settle();

    expect(create).toHaveBeenCalledTimes(1);
    expect((create.mock.calls as unknown as [any][])[0][0].language).toBe('fr');
  });
});
