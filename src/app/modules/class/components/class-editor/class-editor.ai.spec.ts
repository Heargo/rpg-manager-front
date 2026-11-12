import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { World } from '../../../world/models/world';
import { ClassEditorComponent } from './class-editor.component';

/**
 * New hook: `[data-action="copy-ai-prompt"]` in the JSON tab (clipboard, then a success toast through `MessageService`).
 */
describe('ClassEditorComponent AI prompt', () => {
  const world: World = {
    ...createSandboxWorld((key) => key),
    attributes: [
      { id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
      { id: 'mana', name: 'Mana', baseValue: 5, formula: { preset: 'linear', step: 1 } },
    ],
  };
  const writeText = vi.fn().mockResolvedValue(undefined);

  async function setup() {
    writeText.mockClear();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    TestBed.configureTestingModule({ imports: [ClassEditorComponent], providers: [...TEST_PROVIDERS] });
    const toast = vi.spyOn(TestBed.inject(MessageService), 'add');
    const fixture = TestBed.createComponent(ClassEditorComponent);
    fixture.componentRef.setInput('world', world);
    await fixture.whenStable();
    const settle = async () => {
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await fixture.whenStable();
      }
    };
    return { fixture, el: fixture.nativeElement as HTMLElement, toast, settle };
  }

  it('copies the AI prompt from the JSON tab and toasts', async () => {
    const { el, toast, settle } = await setup();
    el.querySelector<HTMLElement>('[data-action="copy-ai-prompt"]')!.click();
    await settle();
    expect(writeText).toHaveBeenCalledTimes(1);
    const prompt: string = writeText.mock.calls[0][0];
    for (const word of ['JSON only', 'Life', 'Mana', 'skillId']) expect(prompt).toContain(word);
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
});
