import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../testing/test-providers';
import { ImageBusiness } from '../../business/image.business';
import { ImagePickerComponent } from './image-picker.component';

/**
 * Hooks: `[data-testid="image-placeholder"]` (empty tile), `[data-action="choose-image"]`, `[data-action="change-image"]`,
 * `[data-action="remove-image"]`, the hidden `input[type="file"]` (id = `inputId`, `data-field` = `field` input),
 * `[data-testid="image-warning"]`. Labels: `common.image.choose|change|remove`.
 */
async function render(imageId?: string) {
  TestBed.configureTestingModule({
    imports: [ImagePickerComponent],
    providers: [...TEST_PROVIDERS, { provide: ImageBusiness, useValue: { url: async () => 'blob:pic' } }],
  });
  const fixture = TestBed.createComponent(ImagePickerComponent);
  fixture.componentRef.setInput('inputId', 'pic');
  fixture.componentRef.setInput('accept', 'image/png');
  fixture.componentRef.setInput('field', 'picture');
  fixture.componentRef.setInput('imageId', imageId);
  await fixture.whenStable();
  const el: HTMLElement = fixture.nativeElement;
  const picked: File[] = [];
  let removed = 0;
  fixture.componentInstance.picked.subscribe((f: File) => picked.push(f));
  fixture.componentInstance.removed.subscribe(() => removed++);
  return { fixture, el, picked, removed: () => removed };
}

describe('ImagePickerComponent', () => {
  it('shows a placeholder tile with a pi-image icon and no <img> when empty', async () => {
    const { el } = await render();
    expect(el.querySelector('[data-testid="image-placeholder"] .pi-image')).not.toBeNull();
    expect(el.querySelector('img')).toBeNull();
  });

  it('shows a "Choose an image" button and no change or remove button when empty', async () => {
    const { el } = await render();
    const choose = el.querySelector('[data-action="choose-image"]')!;
    expect(choose.textContent).toContain('Choose an image');
    expect(el.querySelector('[data-action="change-image"]')).toBeNull();
    expect(el.querySelector('[data-action="remove-image"]')).toBeNull();
  });

  it('keeps the native file input hidden, with the given id, accept and data-field', async () => {
    const { el } = await render();
    const input = el.querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(input.hidden).toBe(true);
    expect(input.id).toBe('pic');
    expect(input.getAttribute('accept')).toBe('image/png');
    expect(input.getAttribute('data-field')).toBe('picture');
  });

  it('opens the file input when the choose button is clicked', async () => {
    const { el } = await render();
    const input = el.querySelector<HTMLInputElement>('input[type="file"]')!;
    const click = vi.spyOn(input, 'click');
    el.querySelector<HTMLElement>('[data-action="choose-image"]')!.click();
    expect(click).toHaveBeenCalled();
  });

  it('emits picked with the chosen file', async () => {
    const { el, picked } = await render();
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const input = el.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    expect(picked).toEqual([file]);
  });

  it('shows the stored image with Change and Remove buttons when it has an image', async () => {
    const { el } = await render('img-1');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(el.querySelector('img')!.getAttribute('src')).toBe('blob:pic');
    expect(el.querySelector('[data-testid="image-placeholder"]')).toBeNull();
    expect(el.querySelector('[data-action="choose-image"]')).toBeNull();
    expect(el.querySelector('[data-action="change-image"]')!.textContent).toContain('Change');
    expect(el.querySelector('[data-action="remove-image"]')!.textContent).toContain('Remove');
  });

  it('emits removed when Remove is clicked', async () => {
    const { el, removed } = await render('img-1');
    el.querySelector<HTMLElement>('[data-action="remove-image"]')!.click();
    expect(removed()).toBe(1);
  });

  it('shows the human-artists warning', async () => {
    const { el } = await render();
    expect(el.querySelector('[data-testid="image-warning"]')!.textContent).toContain('human artists');
  });
});
