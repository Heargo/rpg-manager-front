import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';
import { provideBasePack } from '../../../../../testing/base-pack';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { PackCreatorBusiness } from '../../../../core/business/pack-creator.business';
import { ImageProcessingService } from '../../../../core/services/image-processing.service';
import { PackDraft } from '../../../../core/packs/pack-draft';
import { SpriteColorizerBusiness } from '../../business/sprite-colorizer.business';
import { autoMaterials } from '../../helpers/auto-materials';
import { exportConfig } from '../../helpers/config-export';
import { gray } from '../../helpers/sprite-test-images';
import { SpriteFileService } from '../../services/sprite-file.service';
import { SpritePresetStorageService } from '../../services/sprite-preset-storage.service';
import { SpriteColorizerPageComponent } from './sprite-colorizer-page.component';

const sprite = () => gray(4, 1, [10, 10, 220, 220]);
const png = (content: string) => new Blob([content], { type: 'image/png' });
const named = (draft: PackDraft, name: string): PackDraft => ({
  ...draft,
  details: { ...draft.details, name },
});

/**
 * Hooks: `[data-test="draft-banner"]`, `p-select[data-test="add-draft-select"]` (options `{ label: name, value: draftId }`),
 * `[data-test="add-new-draft"]`, `input[data-test="add-sprite-id"]`, `[data-test="add-confirm"]`; buttons by their English label.
 */
async function render(options: { draft?: string; sprite?: string } = {}) {
  globalThis.indexedDB = new IDBFactory();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  const files = {
    decode: vi.fn(async () => sprite()),
    fetchImage: vi.fn(async () => sprite()),
    fetchText: vi.fn(async () => '{}'),
    encodePng: vi.fn(async () => png('encoded-png')),
  };
  TestBed.configureTestingModule({
    imports: [SpriteColorizerPageComponent],
    providers: [
      ...TEST_PROVIDERS,
      provideBasePack(),
      { provide: SpritePresetStorageService, useValue: { load: () => [], save: vi.fn() } },
      { provide: SpriteFileService, useValue: files },
      { provide: ImageProcessingService, useValue: { dimensions: async () => ({ width: 4, height: 1 }) } },
    ],
  });
  const creator = TestBed.inject(PackCreatorBusiness);
  const business = TestBed.inject(SpriteColorizerBusiness);
  const toast = vi.spyOn(TestBed.inject(MessageService), 'add');
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  let now = 1000;
  vi.spyOn(Date, 'now').mockImplementation(() => (now += 1000));

  const draftOf = async (name: string, sprites: PackDraft['sprites'] = []) => {
    const draft = await creator.createDraft();
    const saved = { ...named(draft, name), sprites };
    await creator.saveDraft(saved);
    return saved;
  };
  const fixture = TestBed.createComponent(SpriteColorizerPageComponent);
  const render = async () => {
    if (options.draft !== undefined) fixture.componentRef.setInput('draft', options.draft);
    if (options.sprite !== undefined) fixture.componentRef.setInput('sprite', options.sprite);
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const settle = (check: () => void) =>
    vi.waitFor(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      check();
    });
  const el = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...document.body.querySelectorAll('button')].find(
      (b) => b.textContent!.trim() === text || b.getAttribute('aria-label') === text,
    ) as HTMLButtonElement | undefined;
  return { fixture, el, creator, business, files, toast, navigate, navigateByUrl, draftOf, render, settle, button };
}
type Page = Awaited<ReturnType<typeof render>>;

const banner = () => document.body.querySelector<HTMLElement>('[data-test="draft-banner"]');
const select = (fixture: Page['fixture']) => fixture.debugElement.query(By.css('p-select[data-test="add-draft-select"]'));
const field = (selector: string) => document.body.querySelector<HTMLInputElement>(selector)!;

describe('SpriteColorizerPageComponent: pack drafts', () => {
  describe('editing a draft sprite', () => {
    const maskedSprite = () => ({
      id: 'axe',
      label: 'Hache',
      type: 'equipment' as const,
      slot: 'weapon1' as const,
      kind: 'masked' as const,
      image: png('axe-image'),
      materials: exportConfig(autoMaterials(sprite())),
    });

    it('opens the sprite with its materials and shows the banner with the sprite and the draft', async () => {
      const p = await render();
      const draft = await p.draftOf('Neon Lights', [maskedSprite()]);
      p.fixture.componentRef.setInput('draft', draft.id);
      p.fixture.componentRef.setInput('sprite', 'axe');

      await p.settle(() => expect(banner()).not.toBeNull());

      expect(banner()!.textContent).toContain('axe');
      expect(banner()!.textContent).toContain('Neon Lights');
      expect(p.business.$document()!.layers.map((l) => l.name)).toEqual(['Base', 'Part 1']);
      expect(p.button('Save to the draft')).toBeDefined();
      expect(p.button('Back to the draft')).toBeDefined();
    });

    it('writes the materials back to the draft sprite from "Save to the draft", with a success toast', async () => {
      const p = await render();
      const draft = await p.draftOf('Neon Lights', [maskedSprite()]);
      p.fixture.componentRef.setInput('draft', draft.id);
      p.fixture.componentRef.setInput('sprite', 'axe');
      await p.settle(() => expect(banner()).not.toBeNull());
      p.business.addMaterial('Blade');
      await p.settle(() => expect(p.business.$document()!.layers.map((l) => l.name)).toContain('Blade'));

      p.button('Save to the draft')!.click();

      await vi.waitFor(async () => {
        const [saved] = (await p.creator.getDraft(draft.id))!.sprites;
        expect(JSON.parse(saved.materials!).layers.map((l: { name: string }) => l.name)).toContain('Blade');
      });
      expect(p.toast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('goes back to the draft editor from "Back to the draft"', async () => {
      const p = await render();
      const draft = await p.draftOf('Neon Lights', [maskedSprite()]);
      p.fixture.componentRef.setInput('draft', draft.id);
      p.fixture.componentRef.setInput('sprite', 'axe');
      await p.settle(() => expect(banner()).not.toBeNull());

      p.button('Back to the draft')!.click();

      const targets = [...p.navigate.mock.calls.map((c) => JSON.stringify(c[0])), ...p.navigateByUrl.mock.calls.map((c) => String(c[0]))];
      expect(targets.some((t) => t.includes(draft.id))).toBe(true);
    });

    it('shows an error toast and opens empty when the sprite is not in the draft', async () => {
      const p = await render();
      const draft = await p.draftOf('Neon Lights');
      p.fixture.componentRef.setInput('draft', draft.id);
      p.fixture.componentRef.setInput('sprite', 'nope');

      await p.settle(() => expect(p.toast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' })));

      expect(banner()).toBeNull();
      expect(p.business.$image()).toBeNull();
    });

    it('shows an error toast and opens empty when the draft does not exist', async () => {
      const p = await render();
      p.fixture.componentRef.setInput('draft', 'no-draft');
      p.fixture.componentRef.setInput('sprite', 'axe');

      await p.settle(() => expect(p.toast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' })));

      expect(banner()).toBeNull();
      expect(p.business.$image()).toBeNull();
    });
  });

  describe('Add to a pack draft', () => {
    const open = async (p: Page) => {
      await p.render();
      p.button('Add to a pack draft')!.click();
      await p.settle(() => expect(document.body.querySelector('[data-test="add-confirm"]')).not.toBeNull());
    };

    it('is disabled until a sprite is open', async () => {
      const p = await render();
      await p.render();
      expect(p.button('Add to a pack draft')!.disabled).toBe(true);

      p.business.loadImage(sprite(), 'axe');
      p.fixture.detectChanges();
      await p.fixture.whenStable();

      expect(p.button('Add to a pack draft')!.disabled).toBe(false);
    });

    it('lists the drafts by name, the latest changed first', async () => {
      const p = await render();
      await p.draftOf('Older pack');
      await p.draftOf('Newer pack');
      await p.creator.loadDrafts();
      p.business.loadImage(sprite(), 'axe');

      await open(p);

      const list = select(p.fixture).componentInstance.options as { label: string }[];
      expect(list.map((o) => o.label)).toEqual(['Newer pack', 'Older pack']);
    });

    it('prefills the sprite id from the sprite name, without underscores', async () => {
      const p = await render();
      await p.draftOf('Pack');
      p.business.loadImage(sprite(), 'Blue_Axe v2');

      await open(p);

      expect(field('input[data-test="add-sprite-id"]').value).toBe('blue-axe-v2');
    });

    it('adds the current sprite with its materials to the chosen draft, with a success toast', async () => {
      const p = await render();
      await p.draftOf('Other pack');
      const target = await p.draftOf('Target pack');
      await p.creator.loadDrafts();
      p.business.loadImage(sprite(), 'axe');
      p.business.addMaterial('Blade');
      await open(p);

      select(p.fixture).triggerEventHandler('ngModelChange', target.id);
      p.fixture.detectChanges();
      document.body.querySelector<HTMLButtonElement>('[data-test="add-confirm"]')!.click();

      await vi.waitFor(async () => {
        const [added] = (await p.creator.getDraft(target.id))!.sprites;
        expect(added).toMatchObject({ id: 'axe', kind: 'masked' });
        expect(JSON.parse(added.materials!).layers.map((l: { name: string }) => l.name)).toContain('Blade');
      });
      expect((await p.creator.getDraft((await p.creator.listDrafts()).find((d) => d.details.name === 'Other pack')!.id))!.sprites).toEqual([]);
      expect(p.toast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('offers to create a first draft when there is none', async () => {
      const p = await render();
      p.business.loadImage(sprite(), 'axe');
      await open(p);

      document.body.querySelector<HTMLButtonElement>('[data-test="add-new-draft"]')!.click();

      await vi.waitFor(async () => expect(await p.creator.listDrafts()).toHaveLength(1));
    });
  });
});
