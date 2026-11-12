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

  describe('polygon and shape detection', () => {
    const square = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ];

    it('has a Polygon tool button that selects the polygon tool', async () => {
      const { fixture, button, business } = await render();
      button('Polygon')!.click();
      await fixture.whenStable();
      expect(business.$tool()).toBe('polygon');
    });

    it('shows the snap option for the polygon tool', async () => {
      const { fixture, button, el } = await render();
      button('Polygon')!.click();
      await fixture.whenStable();
      expect(el.textContent).toContain('Snap to edges');
    });

    it('closes the polygon with Enter and cancels it with Escape', async () => {
      const { fixture, button, business } = await render();
      button('Polygon')!.click();
      await fixture.whenStable();

      square.forEach(([x, y]) => business.addPolygonVertex(x, y));
      key({ key: 'Escape' });
      await fixture.whenStable();
      expect(business.$polygonVertices()).toEqual([]);
      expect(business.$selection().every((v) => v === 0)).toBe(true);

      square.forEach(([x, y]) => business.addPolygonVertex(x, y));
      key({ key: 'Enter' });
      await fixture.whenStable();
      expect(Array.from(business.$selection())).toEqual([1, 1, 1, 1]);
    });

    it('detects shapes, lists the candidates and applies the chosen one to a new material', async () => {
      const { fixture, el, button, materials } = await render();
      button('Detect shapes')!.click();
      await fixture.whenStable();
      const candidates = el.querySelectorAll<HTMLElement>('.candidate');
      expect(candidates.length).toBeGreaterThan(0);

      candidates[0].click();
      await fixture.whenStable();
      button('Apply to new layer')!.click();
      await fixture.whenStable();
      expect(materials()).toBe(2);
    });

    it('has an Apply to layer button for the active material', async () => {
      const { fixture, el, button } = await render();
      button('Detect shapes')!.click();
      await fixture.whenStable();
      el.querySelector<HTMLElement>('.candidate')!.click();
      await fixture.whenStable();
      expect(button('Apply to layer')).not.toBeNull();
    });
  });
});
