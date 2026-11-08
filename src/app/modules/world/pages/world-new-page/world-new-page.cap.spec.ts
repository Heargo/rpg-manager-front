import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { WorldLibraryBusiness } from '../../business/world-library.business';
import { validateWorldDraft } from '../../helpers/world-draft.rules';
import { WorldNewPageComponent } from './world-new-page.component';

/**
 * Contract: each attribute row N has `[data-testid="formula-cap-N"]`, a narrow optional input (the element is, or
 * contains, an `input`), empty by default; a valid value is saved in the draft's `attributes[N].cap`; an invalid one
 * shows `[data-testid="formula-cap-error-N"]` (inside the row) and blocks `[data-testid="attributes-next"]`.
 * The preview of the row (`formula-preview-N`) applies the cap.
 */
async function openAttributesStep() {
  const validateDraft = vi.fn(validateWorldDraft);
  TestBed.configureTestingModule({
    imports: [WorldNewPageComponent],
    providers: [
      ...TEST_PROVIDERS,
      { provide: WorldLibraryBusiness, useValue: { validateDraft, uploadImage: async () => 'img', create: async () => undefined } },
    ],
  });
  const fixture = TestBed.createComponent(WorldNewPageComponent);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const flush = async () => {
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };
  const name = el.querySelector('#world-name') as HTMLInputElement;
  name.value = 'Eldoria';
  name.dispatchEvent(new Event('input'));
  await flush();
  Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Next')!.click();
  await flush();

  const byId = (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  const capInput = (n: number) => {
    const host = byId(`formula-cap-${n}`)!;
    return (host.matches('input') ? host : host.querySelector('input')) as HTMLInputElement;
  };
  const typeCap = async (n: number, value: string) => {
    const input = capInput(n);
    input.focus();
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await flush();
  };
  const preview = (n: number) => byId(`formula-preview-${n}`)?.textContent?.trim().replace(/\s+/g, ' ');
  const levels = (n: number) => byId(`formula-preview-${n}`)?.getAttribute('data-levels');
  const nextDisabled = () => {
    const host = el.querySelector('[data-testid="attributes-next"]')!;
    const button = host.matches('button') ? host : host.querySelector('button')!;
    return (button as HTMLButtonElement).disabled;
  };
  const lastDraft = () => validateDraft.mock.calls.at(-1)![0] as { attributes: { cap?: number }[] };
  return { byId, capInput, typeCap, preview, levels, nextDisabled, lastDraft };
}

describe('WorldNewPageComponent attribute cap', () => {
  it('has an empty cap field in each attribute row', async () => {
    const { byId, capInput } = await openAttributesStep();
    for (let n = 0; n < 5; n++) {
      expect(byId(`attribute-row-${n}`)!.contains(byId(`formula-cap-${n}`))).toBe(true);
      expect(capInput(n).value).toBe('');
    }
    expect(byId('formula-cap-5')).toBeNull();
  });

  it('flattens the preview at the cap, and restores it when the cap is cleared', async () => {
    const { typeCap, preview, levels } = await openAttributesStep();
    expect(levels(0)).toBe('10 15 20 25 30 35');
    await typeCap(0, '22');
    expect(levels(0)).toBe('10 15 20 22 22 22');
    expect(preview(0)).toBe('max 10 → 22');
    await typeCap(0, '');
    expect(levels(0)).toBe('10 15 20 25 30 35');
  });

  it('saves a valid cap in the draft, and none by default', async () => {
    const { typeCap, lastDraft, nextDisabled } = await openAttributesStep();
    expect(lastDraft().attributes[0].cap).toBeUndefined();
    await typeCap(0, '1000');
    expect(lastDraft().attributes[0].cap).toBe(1000);
    expect(lastDraft().attributes[1].cap).toBeUndefined();
    expect(nextDisabled()).toBe(false);
  });

  it('shows an error and blocks Next for a cap below the base value', async () => {
    const { byId, typeCap, nextDisabled } = await openAttributesStep();
    expect(byId('formula-cap-error-0')).toBeNull();
    await typeCap(0, '5');
    expect(byId('formula-cap-error-0')?.textContent?.trim()).toBeTruthy();
    expect(byId('attribute-row-0')!.contains(byId('formula-cap-error-0'))).toBe(true);
    expect(byId('formula-cap-error-1')).toBeNull();
    expect(nextDisabled()).toBe(true);
    await typeCap(0, '10');
    expect(byId('formula-cap-error-0')).toBeNull();
    expect(nextDisabled()).toBe(false);
  });
});
