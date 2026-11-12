import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { routesTools } from '../../../tools/tools.routes';
import { gray } from '../../helpers/sprite-test-images';
import { SpriteColorizerBusiness } from '../../business/sprite-colorizer.business';
import { SpritePresetStorageService } from '../../services/sprite-preset-storage.service';
import { SpriteColorizerPageComponent } from './sprite-colorizer-page.component';

async function render() {
  TestBed.configureTestingModule({
    imports: [SpriteColorizerPageComponent],
    providers: [
      ...TEST_PROVIDERS,
      { provide: SpritePresetStorageService, useValue: { load: () => [], save: vi.fn() } },
    ],
  });
  const business = TestBed.inject(SpriteColorizerBusiness);
  business.loadImage(gray(2, 2, [10, 20, 30, 40]));
  const fixture = TestBed.createComponent(SpriteColorizerPageComponent);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    el.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  const materials = () => el.querySelectorAll('.material-item').length;
  return { fixture, el, business, button, materials };
}

function key(init: KeyboardEventInit) {
  document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }));
}

describe('SpriteColorizerPageComponent', () => {
  it('shows the tool buttons', async () => {
    const { button } = await render();
    for (const label of ['Brush', 'Eraser', 'Bucket', 'Magic wand']) {
      expect(button(label), label).not.toBeNull();
    }
  });

  it('shows the material panel with the base material and an Add material button', async () => {
    const { button, materials } = await render();
    expect(materials()).toBe(1);
    expect(button('Add material')).not.toBeNull();
  });

  it('adds a material from the button', async () => {
    const { fixture, button, materials } = await render();
    button('Add material')!.click();
    await fixture.whenStable();
    expect(materials()).toBe(2);
  });

  it('lists the seven built-in presets', async () => {
    const { el } = await render();
    const text = el.textContent ?? '';
    for (const name of ['Steel', 'Wood', 'Gold', 'Ice', 'Fire', 'Leaf', 'Arcane']) {
      expect(text).toContain(name);
    }
  });

  it('has undo and redo buttons that follow the history', async () => {
    const { fixture, button } = await render();
    expect(button('Undo')!.disabled).toBe(true);
    button('Add material')!.click();
    await fixture.whenStable();
    expect(button('Undo')!.disabled).toBe(false);

    button('Undo')!.click();
    await fixture.whenStable();
    expect(button('Redo')!.disabled).toBe(false);
  });

  it('undoes with Ctrl+Z and redoes with Ctrl+Shift+Z and Ctrl+Y', async () => {
    const { fixture, button, materials } = await render();
    button('Add material')!.click();
    await fixture.whenStable();
    expect(materials()).toBe(2);

    key({ key: 'z', ctrlKey: true });
    await fixture.whenStable();
    expect(materials()).toBe(1);

    key({ key: 'z', ctrlKey: true, shiftKey: true });
    await fixture.whenStable();
    expect(materials()).toBe(2);

    key({ key: 'z', ctrlKey: true });
    await fixture.whenStable();
    key({ key: 'y', ctrlKey: true });
    await fixture.whenStable();
    expect(materials()).toBe(2);
  });

  it('has the export buttons', async () => {
    const { button } = await render();
    expect(button('Export PNG')).not.toBeNull();
    expect(button('Export JSON')).not.toBeNull();
  });

  it('is routed at /tools/sprite-colorizer', () => {
    expect(routesTools.some((r) => r.path === 'tools/sprite-colorizer')).toBe(true);
  });
});
