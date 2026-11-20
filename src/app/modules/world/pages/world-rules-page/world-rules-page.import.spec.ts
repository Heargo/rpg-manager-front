import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { contentPackProvider } from '../../../../../testing/content-pack';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { PackBusiness } from '../../../../core/business/pack.business';
import { WorldLibraryBusiness } from '../../business/world-library.business';
import { WorldSessionBusiness } from '../../business/world-session.business';
import { WorldRulesPageComponent } from './world-rules-page.component';

/**
 * Contract: saving rules that activate a pack whose content needs an attribute choice shows `app-pack-attribute-mapping` on
 * the page; confirm imports and toasts the counts, cancel imports nothing (the rules stay saved). A failing import shows an
 * error toast.
 */
describe('WorldRulesPageComponent pack activation', () => {
  const session = () => TestBed.inject(WorldSessionBusiness);

  async function setup(attributeName = 'Life') {
    globalThis.indexedDB = new IDBFactory();
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      imports: [WorldRulesPageComponent],
      providers: [...TEST_PROVIDERS, contentPackProvider()],
    });
    await TestBed.inject(PackBusiness).enable('extra');
    const created = await TestBed.inject(WorldLibraryBusiness).create({
      name: 'Eldoria',
      attributes: [{ name: attributeName, baseValue: 10, formula: { preset: 'linear', step: 1 } }],
      packs: [],
    });
    await session().open(created.id);
    const toasts: any[] = [];
    vi.spyOn(TestBed.inject(MessageService), 'add').mockImplementation((m: any) => void toasts.push(m));
    const fixture = TestBed.createComponent(WorldRulesPageComponent);
    const el: HTMLElement = fixture.nativeElement;
    const settle = async () => {
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve, 20));
      await fixture.whenStable();
    };
    await settle();
    const press = async (selector: string) => {
      const host = el.querySelector<HTMLElement>(selector)!;
      (host.matches('button') ? host : host.querySelector('button')!).click();
      await settle();
    };
    /** Activates the pack in the edited rule fields, then saves. */
    const activateAndSave = async () => {
      (fixture.componentInstance as any).fields.update((draft: any) => ({ ...draft, packs: ['extra'] }));
      await settle();
      await press('[data-testid="rules-save"]');
    };
    return { el, press, toasts, activateAndSave };
  }

  it('asks about the missing attributes, then imports on confirm and shows a toast', async () => {
    const { el, press, toasts, activateAndSave } = await setup();

    await activateAndSave();
    expect(session().$world()!.packs).toEqual(['extra']);
    expect(el.querySelector('app-pack-attribute-mapping')).not.toBeNull();
    expect(session().$world()!.items).toEqual([]);

    await press('app-pack-attribute-mapping [data-action="confirm"]');

    expect(session().$world()!.items.map((i) => i.id)).toEqual(['extra:sword']);
    expect(session().$world()!.attributes.map((a) => a.name)).toEqual(['Life', 'Force']);
    expect(el.querySelector('app-pack-attribute-mapping')).toBeNull();
    expect(toasts.some((t) => t.severity === 'success' && /3/.test(t.summary))).toBe(true);
  });

  it('imports nothing on cancel and keeps the saved rules', async () => {
    const { el, press, activateAndSave } = await setup();

    await activateAndSave();
    await press('app-pack-attribute-mapping [data-action="cancel"]');

    expect(el.querySelector('app-pack-attribute-mapping')).toBeNull();
    expect(session().$world()!.packs).toEqual(['extra']);
    expect(session().$world()!.items).toEqual([]);
    expect(session().$world()!.attributes.map((a) => a.name)).toEqual(['Life']);
  });

  it('imports at once, with a toast, when the world already has the attributes', async () => {
    const { el, toasts, activateAndSave } = await setup('Force');

    await activateAndSave();

    expect(el.querySelector('app-pack-attribute-mapping')).toBeNull();
    expect(session().$world()!.items.map((i) => i.id)).toEqual(['extra:sword']);
    expect(toasts.some((t) => t.severity === 'success' && /3/.test(t.summary))).toBe(true);
  });

  it('shows an error toast when the import on activation fails, the rules staying saved', async () => {
    const { toasts, activateAndSave } = await setup('Force');
    vi.spyOn(TestBed.inject(PackBusiness), 'manifest').mockRejectedValue(new Error('boom'));

    await activateAndSave();

    expect(session().$world()!.packs).toEqual(['extra']);
    expect(toasts.some((t) => t.severity === 'error')).toBe(true);
  });
});
