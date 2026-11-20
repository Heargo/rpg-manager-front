import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { neonProviders } from '../../../../../testing/unofficial-pack';
import { PackCreatorBusiness } from '../../../../core/business/pack-creator.business';
import { DraftSprite } from '../../../../core/packs/pack-draft';
import { PackDraftPageComponent } from './pack-draft-page.component';

const sprite = (n: number): DraftSprite => {
  const id = `s${String(n).padStart(2, '0')}`;
  return {
    id,
    label: id,
    kinds: ['item'],
    kind: 'grayscale',
    image: new Blob(['png'], { type: 'image/png' }),
  };
};

/** Renders the editor on a draft of `count` sprites (s01, s02, ...), on its Details tab. */
async function render(
  count: number,
  mutate: (sprites: DraftSprite[]) => DraftSprite[] = (s) => s,
) {
  globalThis.indexedDB = new IDBFactory();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  TestBed.configureTestingModule({
    imports: [PackDraftPageComponent],
    providers: [...TEST_PROVIDERS, ...neonProviders().providers],
  });
  const creator = TestBed.inject(PackCreatorBusiness);
  const draft = await creator.createDraft();
  await creator.saveDraft({
    ...draft,
    sprites: mutate(Array.from({ length: count }, (_, i) => sprite(i + 1))),
  });
  const fixture = TestBed.createComponent(PackDraftPageComponent);
  fixture.componentRef.setInput('draftId', draft.id);
  const el = fixture.nativeElement as HTMLElement;
  const settle = (check: () => void) =>
    vi.waitFor(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      check();
    });
  const rows = () => [
    ...el.querySelectorAll<HTMLElement>('[data-test^="sprite-card-"]'),
  ];
  const rowIds = () =>
    rows().map((r) => r.getAttribute('data-test')!.replace('sprite-card-', ''));
  const doc = (hook: string) =>
    document.querySelector<HTMLElement>(`[data-test="${hook}"]`);
  const press = async (hook: string) => {
    await settle(() => expect(doc(hook)).not.toBeNull());
    const host = doc(hook)!;
    (host.querySelector('button') ?? host).click();
  };
  const openCard = async (id: string) => {
    el.querySelector<HTMLElement>(`[data-test="sprite-card-${id}"]`)!.click();
    await settle(() => expect(doc('sprite-detail')).not.toBeNull());
  };
  const tab = async (label: string) => {
    [...el.querySelectorAll<HTMLElement>('[role="tab"]')]
      .find((t) => t.textContent!.trim() === label)!
      .click();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const goToPage = async (page: number) => {
    const link = [
      ...el.querySelectorAll<HTMLElement>('p-paginator button'),
    ].find((b) => b.textContent!.trim() === String(page));
    link!.click();
    await settle(() => expect(rows().length).toBeGreaterThan(0));
  };
  const saved = async () => (await creator.getDraft(draft.id))!;
  await settle(() => expect(el.querySelector('[role="tab"]')).not.toBeNull());
  return {
    fixture,
    el,
    creator,
    draft,
    settle,
    rows,
    rowIds,
    doc,
    press,
    openCard,
    tab,
    goToPage,
    saved,
  };
}

describe('PackDraftPageComponent: sprites tab on a large draft', () => {
  it('creates no sprite row until the Sprites tab is opened', async () => {
    const { el, rows, tab, settle } = await render(30);

    expect(rows()).toHaveLength(0);
    await tab('Items');
    await tab('Publish');
    expect(rows()).toHaveLength(0);
    expect(el.querySelector('p-paginator')).toBeNull();

    await tab('Sprites');
    await settle(() => expect(rows()).toHaveLength(12));
  });

  it('shows 12 cards and a paginator on the first page', async () => {
    const { el, rows, rowIds, tab, settle } = await render(30);

    await tab('Sprites');

    await settle(() => expect(rows()).toHaveLength(12));
    expect(el.querySelector('p-paginator')).not.toBeNull();
    expect(rowIds()[0]).toBe('s01');
    expect(rowIds()[11]).toBe('s12');
  });

  it('shows the 6 remaining sprites on page 3', async () => {
    const { rows, rowIds, tab, goToPage, settle } = await render(30);
    await tab('Sprites');
    await settle(() => expect(rows()).toHaveLength(12));

    await goToPage(3);

    await settle(() => expect(rows()).toHaveLength(6));
    expect(rowIds()).toEqual(['s25', 's26', 's27', 's28', 's29', 's30']);
  });

  it('edits the right sprite of the draft from page 2 through the drawer', async () => {
    const { rows, tab, goToPage, settle, saved, openCard, press, doc } =
      await render(30);
    await tab('Sprites');
    await settle(() => expect(rows()).toHaveLength(12));
    await goToPage(2);
    await settle(() => expect(rows()[0].getAttribute('data-test')).toBe('sprite-card-s13'));

    await openCard('s14');
    await press('detail-edit');
    await settle(() => expect(doc('sprite-label')).not.toBeNull());
    const host = doc('sprite-label')!;
    const input = host instanceof HTMLInputElement ? host : host.querySelector('input')!;
    input.value = 'Renamed';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await press('form-save');

    await vi.waitFor(
      async () => {
        const sprites = (await saved()).sprites;
        expect(sprites.find((s) => s.id === 's14')!.label).toBe('Renamed');
        expect(sprites.filter((s) => s.label === 'Renamed')).toHaveLength(1);
      },
      { timeout: 3000 },
    );
  });

  it('removes the right sprite from page 2 through the drawer', async () => {
    const { rows, tab, goToPage, settle, creator, draft, openCard, press } =
      await render(30);
    const ask = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
    await tab('Sprites');
    await settle(() => expect(rows()).toHaveLength(12));
    await goToPage(2);
    await settle(() => expect(rows()[0].getAttribute('data-test')).toBe('sprite-card-s13'));

    await openCard('s15');
    await press('detail-delete');
    await settle(() => expect(ask).toHaveBeenCalled());
    (ask.mock.calls[0][0] as { accept: () => void }).accept();

    await vi.waitFor(
      async () => {
        const ids = (await creator.getDraft(draft.id))!.sprites.map((s) => s.id);
        expect(ids).toHaveLength(29);
        expect(ids).not.toContain('s15');
      },
      { timeout: 3000 },
    );
  });

  it('goes back a page when the only sprite of the last page is removed', async () => {
    const { rows, rowIds, tab, goToPage, settle, openCard, press } =
      await render(25);
    const ask = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
    await tab('Sprites');
    await settle(() => expect(rows()).toHaveLength(12));
    await goToPage(3);
    await settle(() => expect(rowIds()).toEqual(['s25']));

    await openCard('s25');
    await press('detail-delete');
    await settle(() => expect(ask).toHaveBeenCalled());
    (ask.mock.calls[0][0] as { accept: () => void }).accept();

    await settle(() => expect(rows()).toHaveLength(12));
    expect(rowIds()[0]).toBe('s13');
  });

  it('shows the last page after a PNG is added', async () => {
    const { el, rows, rowIds, tab, settle, creator, fixture } =
      await render(30);
    vi.spyOn(creator, 'addPng').mockResolvedValue(sprite(31));
    await tab('Sprites');
    await settle(() => expect(rows()).toHaveLength(12));

    // The "Add a PNG image" menu entry drives a hidden file input.
    const input = el.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', {
      value: [new File(['png'], 'new.png', { type: 'image/png' })],
    });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    await settle(() =>
      expect(rowIds()).toEqual([
        's25',
        's26',
        's27',
        's28',
        's29',
        's30',
        's31',
      ]),
    );
  });

  it('keeps the duplicate-id warning against sprites on other pages', async () => {
    const { el, rows, tab, settle } = await render(30, (sprites) =>
      sprites.map((s) => (s.id === 's20' ? { ...s, id: 's01' } : s)),
    );
    await tab('Sprites');
    await settle(() => expect(rows()).toHaveLength(12));

    expect(
      el.querySelectorAll('[data-test="sprite-duplicate-id"]'),
    ).toHaveLength(1);
    expect(
      rows()[0].querySelector('[data-test="sprite-duplicate-id"]'),
    ).not.toBeNull();
  });

  it('has no paginator on a draft of 12 sprites or fewer', async () => {
    const { el, rows, tab, settle } = await render(12);
    expect(rows()).toHaveLength(0);

    await tab('Sprites');

    await settle(() => expect(rows()).toHaveLength(12));
    expect(el.querySelector('p-paginator')).toBeNull();
  });
});
