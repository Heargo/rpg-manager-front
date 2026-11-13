import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import en from '../../../../../../public/packs/base-en/generators/items.json';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { ImageBusiness } from '../../../../core/business/image.business';
import { PackBusiness } from '../../../../core/business/pack.business';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { ItemEditorComponent } from './item-editor.component';

/** The item editor uses `app-image-picker`; the hidden input keeps `data-field="image"`. */
describe('ItemEditorComponent image picker', () => {
  const storeUpload = vi.fn(async (_f: Blob) => 'img-new');

  async function setup() {
    TestBed.configureTestingModule({
      imports: [ItemEditorComponent],
      providers: [
        ...TEST_PROVIDERS,
        { provide: PackBusiness, useValue: { wordList: async () => en, packsFor: async () => ['base-en'], $installed: () => [] } },
        { provide: ImageBusiness, useValue: { storeUpload, url: async () => 'blob:i' } },
      ],
    });
    const fixture = TestBed.createComponent(ItemEditorComponent);
    fixture.componentRef.setInput('world', createSandboxWorld((key) => key));
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the shared picker, empty, with a hidden image file input', async () => {
    const el = await setup();
    expect(el.querySelector('app-image-picker [data-testid="image-placeholder"]')).not.toBeNull();
    expect(el.querySelector('app-image-picker [data-action="choose-image"]')!.textContent).toContain('Choose an image');
    expect(el.querySelector<HTMLInputElement>('input[data-field="image"]')!.hidden).toBe(true);
  });

  it('uploads a picked file and then offers Change and Remove', async () => {
    const el = await setup();
    const file = new File(['x'], 'i.png', { type: 'image/png' });
    const input = el.querySelector<HTMLInputElement>('input[data-field="image"]')!;
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
    expect(storeUpload).toHaveBeenCalledWith(file);
    expect(el.querySelector('[data-action="change-image"]')).not.toBeNull();
    el.querySelector<HTMLElement>('[data-action="remove-image"]')!.click();
    for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
    expect(el.querySelector('[data-action="choose-image"]')).not.toBeNull();
  });
});
