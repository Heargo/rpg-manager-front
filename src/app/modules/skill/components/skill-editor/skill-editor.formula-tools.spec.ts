import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { SkillEditorComponent } from './skill-editor.component';

/**
 * The variables help toggle and the formula presets button share one row, `[data-test="formula-tools"]`: help first,
 * presets second, each keeping an accessible name when its label is shortened to an icon.
 */
describe('SkillEditorComponent formula tools row', () => {
  async function setup() {
    TestBed.configureTestingModule({
      imports: [SkillEditorComponent],
      providers: [...TEST_PROVIDERS],
    });
    const fixture = TestBed.createComponent(SkillEditorComponent);
    fixture.componentRef.setInput('world', createSandboxWorld((key) => key));
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('holds the variables help toggle then the presets control in one row', async () => {
    const el = await setup();
    const row = el.querySelector('[data-test="formula-tools"]');
    expect(row).not.toBeNull();
    const help = row!.querySelector('[data-action="toggle-variables"]');
    const presets = row!.querySelector('[data-action="manage-presets"]');
    expect(help).not.toBeNull();
    expect(presets).not.toBeNull();
    expect(
      help!.compareDocumentPosition(presets!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('keeps an accessible name on both controls', async () => {
    const el = await setup();
    const row = el.querySelector('[data-test="formula-tools"]')!;
    const name = (selector: string) =>
      row.querySelector(selector)?.getAttribute('aria-label') ?? '';
    expect(name('[data-action="toggle-variables"]')).toBe('Variables help');
    expect(name('[data-action="manage-presets"]')).toBe('Manage presets');
  });
});
