import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { contentPackProvider } from '../../../../../testing/content-pack';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { PackBusiness } from '../../../../core/business/pack.business';
import { WorldLibraryBusiness } from '../../../world/business/world-library.business';
import { WorldSessionBusiness } from '../../../world/business/world-session.business';
import { SkillCataloguePageComponent } from './skill-catalogue-page.component';

/**
 * Contract: the page's "Import from the packs" button (`[data-action="import-packs"]`) runs the import of the active packs.
 * When attributes need a choice it shows `app-pack-attribute-mapping` (confirm imports, cancel imports nothing); either way
 * it then shows a toast (MessageService) with the counts.
 */
describe('SkillCataloguePageComponent import from the packs', () => {
  const session = () => TestBed.inject(WorldSessionBusiness);

  async function setup(attributes = [{ name: 'Life' }]) {
    globalThis.indexedDB = new IDBFactory();
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      imports: [SkillCataloguePageComponent],
      providers: [...TEST_PROVIDERS, contentPackProvider()],
    });
    await TestBed.inject(PackBusiness).enable('extra');
    const created = await TestBed.inject(WorldLibraryBusiness).create({
      name: 'Eldoria',
      attributes: attributes.map((a) => ({ ...a, baseValue: 10, formula: { preset: 'linear' as const, step: 1 } })),
      packs: ['extra'],
    });
    await session().open(created.id);
    const toasts: any[] = [];
    vi.spyOn(TestBed.inject(MessageService), 'add').mockImplementation((m: any) => void toasts.push(m));
    const fixture = TestBed.createComponent(SkillCataloguePageComponent);
    const el: HTMLElement = fixture.nativeElement;
    const settle = async () => {
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve, 20));
      await fixture.whenStable();
    };
    await settle();
    const press = async (selector: string) => {
      el.querySelector<HTMLElement>(selector)!.click();
      await settle();
    };
    return { el, press, toasts };
  }

  it('asks what to do with an attribute the world lacks, and imports on confirm', async () => {
    const { el, press, toasts } = await setup();

    await press('[data-action="import-packs"]');
    expect(el.querySelector('app-pack-attribute-mapping')).not.toBeNull();
    expect(session().$world()!.items).toEqual([]);

    await press('app-pack-attribute-mapping [data-action="confirm"]');

    expect(session().$world()!.items.map((i) => i.id)).toEqual(['extra:sword']);
    expect(session().$world()!.attributes.map((a) => a.name)).toEqual(['Life', 'Force']);
    expect(el.querySelector('app-pack-attribute-mapping')).toBeNull();
    expect(toasts).toHaveLength(1);
  });

  it('imports nothing when the dialog is cancelled', async () => {
    const { el, press, toasts } = await setup();

    await press('[data-action="import-packs"]');
    await press('app-pack-attribute-mapping [data-action="cancel"]');

    expect(session().$world()!.items).toEqual([]);
    expect(session().$world()!.attributes.map((a) => a.name)).toEqual(['Life']);
    expect(el.querySelector('app-pack-attribute-mapping')).toBeNull();
    expect(toasts).toHaveLength(0);
  });

  it('imports at once and shows a toast with the counts when no attribute needs a choice', async () => {
    const { el, press, toasts } = await setup([{ name: 'Force' }]);

    await press('[data-action="import-packs"]');

    expect(el.querySelector('app-pack-attribute-mapping')).toBeNull();
    expect(session().$world()!.classes.map((c) => c.id)).toEqual(['extra:warrior']);
    expect(session().$world()!.items.map((i) => i.id)).toEqual(['extra:sword']);
    expect(session().$world()!.skills.map((s) => s.id)).toEqual(['extra:strike']);
    expect(toasts).toHaveLength(1);
    expect(toasts[0].severity).toBe('success');
    expect(toasts[0].summary).toMatch(/3/);
  });

  it('shows an error toast when the import fails', async () => {
    const { press, toasts } = await setup([{ name: 'Force' }]);
    vi.spyOn(TestBed.inject(PackBusiness), 'manifest').mockRejectedValue(new Error('boom'));

    await press('[data-action="import-packs"]');

    expect(toasts).toHaveLength(1);
    expect(toasts[0].severity).toBe('error');
  });
});
