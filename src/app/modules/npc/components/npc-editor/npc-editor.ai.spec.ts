import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import npcNames from '../../../../../../public/packs/base/generators/en/npcs.json';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { PackBusiness } from '../../../../core/business/pack.business';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { World } from '../../../world/models/world';
import { NpcEditorComponent } from './npc-editor.component';

/**
 * New hooks: `[data-action="copy-ai-prompt"]` in the JSON tab (clipboard, then a success toast through `MessageService`);
 * `[data-action="random"]` (label "Random" / "Aléatoire", `pi-sparkles` icon) in the same parent as
 * `[data-action="save"]`. `[data-action="generate"]` no longer exists.
 */
describe('NpcEditorComponent AI prompt and Random', () => {
  const world: World = {
    ...createSandboxWorld((key) => key),
    attributes: [
      { id: 'wit', name: 'Wit', baseValue: 5, formula: { preset: 'linear', step: 1 } },
      { id: 'grit', name: 'Grit', baseValue: 5, formula: { preset: 'linear', step: 1 } },
    ],
  };
  const writeText = vi.fn().mockResolvedValue(undefined);

  async function setup() {
    writeText.mockClear();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    TestBed.configureTestingModule({
      imports: [NpcEditorComponent],
      providers: [...TEST_PROVIDERS, { provide: PackBusiness, useValue: { wordList: async () => npcNames, packsFor: async () => ['base'], $installed: () => [] } }],
    });
    const toast = vi.spyOn(TestBed.inject(MessageService), 'add');
    const fixture = TestBed.createComponent(NpcEditorComponent);
    fixture.componentRef.setInput('world', world);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const settle = async () => {
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await fixture.whenStable();
      }
    };
    return { fixture, el, toast, settle };
  }

  it('copies the AI prompt from the JSON tab and toasts', async () => {
    const { el, toast, settle } = await setup();
    el.querySelector<HTMLElement>('[data-action="copy-ai-prompt"]')!.click();
    await settle();
    expect(writeText).toHaveBeenCalledTimes(1);
    const prompt: string = writeText.mock.calls[0][0];
    for (const word of ['JSON only', 'Wit', 'Grit', 'merchant']) expect(prompt).toContain(word);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
  });

  it('copies the prompt in the active language', async () => {
    const { el, fixture, settle } = await setup();
    TestBed.inject(TranslocoService).setActiveLang('fr');
    await settle();
    fixture.detectChanges();
    el.querySelector<HTMLElement>('[data-action="copy-ai-prompt"]')!.click();
    await settle();
    expect(writeText.mock.calls[0][0]).toContain('uniquement');
  });

  it('has a Random button with the sparkles icon next to Save, and no Generate button', async () => {
    const { el, fixture, settle } = await setup();
    const random = el.querySelector<HTMLElement>('[data-action="random"]')!;
    const save = el.querySelector<HTMLElement>('[data-action="save"]')!;
    expect(random.parentElement).toBe(save.parentElement);
    expect(random.textContent).toContain('Random');
    expect(random.querySelector('.pi-sparkles') ?? (random.className.includes('pi-sparkles') ? random : null)).not.toBeNull();
    expect(el.querySelector('[data-action="generate"]')).toBeNull();
    TestBed.inject(TranslocoService).setActiveLang('fr');
    await settle();
    fixture.detectChanges();
    expect(random.textContent).toContain('Aléatoire');
  });
});
