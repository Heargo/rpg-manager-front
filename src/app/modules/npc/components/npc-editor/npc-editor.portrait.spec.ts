import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import npcNames from '../../../../../../public/i18n/generators/en/npcs.json';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { ImageBusiness } from '../../../../core/business/image.business';
import { WordListService } from '../../../../core/services/word-list.service';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { Npc } from '../../models/npc';
import { NpcEditorComponent } from './npc-editor.component';

/**
 * New hooks: `input[data-field="portrait"]` (file input, accepts PNG, JPEG, WebP, GIF), `[data-action="remove-portrait"]`,
 * `[data-testid="portrait-preview"]` (the stored image), `[data-testid="image-warning"]` (the human-artists warning). The NPC's image id is its `portraitId`.
 */
describe('NpcEditorComponent portrait', () => {
  const goblin: Npc = {
    id: 'n1', name: 'Goblin', description: '', roles: ['enemy'], level: 1, xp: 0, statPoints: 0, money: 0,
    updatedAt: 1, skillPoints: 0, skills: [], xpReward: 0, loot: [], attributes: [], inventory: [],
  };
  const storeUpload = vi.fn(async (_file: Blob) => 'img-new');

  async function setup(npc: Npc = goblin) {
    storeUpload.mockClear();
    TestBed.configureTestingModule({
      imports: [NpcEditorComponent],
      providers: [
        ...TEST_PROVIDERS,
        { provide: WordListService, useValue: { loadNpcNames: async () => npcNames } },
        { provide: ImageBusiness, useValue: { storeUpload, url: async () => 'blob:portrait' } },
      ],
    });
    const fixture = TestBed.createComponent(NpcEditorComponent);
    fixture.componentRef.setInput('world', createSandboxWorld((key) => key));
    fixture.componentRef.setInput('npc', npc);
    await fixture.whenStable();
    const saved: Npc[] = [];
    fixture.componentInstance.save.subscribe((n: Npc) => saved.push(n));
    const el: HTMLElement = fixture.nativeElement;
    const settle = async () => {
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await fixture.whenStable();
      }
    };
    return { fixture, el, saved, settle };
  }

  it('accepts PNG, JPEG, WebP and GIF files', async () => {
    const { el } = await setup();
    const accept = el.querySelector('input[data-field="portrait"]')!.getAttribute('accept')!;
    for (const type of ['image/png', 'image/jpeg', 'image/webp', 'image/gif']) expect(accept).toContain(type);
  });

  it('stores the picked file through ImageBusiness and emits the NPC with its portrait id', async () => {
    const { el, saved, settle } = await setup();
    const file = new File(['x'], 'goblin.png', { type: 'image/png' });
    const input = el.querySelector<HTMLInputElement>('input[data-field="portrait"]')!;
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    await settle();
    expect(storeUpload).toHaveBeenCalledWith(file);

    el.querySelector<HTMLElement>('[data-action="save"]')!.click();
    await settle();
    expect(saved).toHaveLength(1);
    expect(saved[0].portraitId).toBe('img-new');
  });

  it('shows the existing portrait and clears it on remove', async () => {
    const { el, saved, settle } = await setup({ ...goblin, portraitId: 'img-old' });
    expect(el.querySelector('[data-testid="portrait-preview"] img')!.getAttribute('src')).toBe('blob:portrait');

    el.querySelector<HTMLElement>('[data-action="remove-portrait"]')!.click();
    await settle();
    el.querySelector<HTMLElement>('[data-action="save"]')!.click();
    await settle();
    expect(saved[0].portraitId).toBeUndefined();
  });

  it('shows the human-artists warning next to the picker, in English and French', async () => {
    const { el, fixture, settle } = await setup();
    expect(el.querySelector('[data-testid="image-warning"]')!.textContent).toContain('human artists');
    TestBed.inject(TranslocoService).setActiveLang('fr');
    await settle();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="image-warning"]')!.textContent).toContain('artistes humains');
  });
});
