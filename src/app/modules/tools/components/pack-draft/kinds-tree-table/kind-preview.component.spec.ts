import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { TEST_PROVIDERS } from '../../../../../../testing/test-providers';
import { KindPreviewComponent } from './kind-preview.component';

/** Contract of `app-kind-preview`: `preview-kind` button, `preview-hint` line, `preview-entry` cards with `preview-rarity`. */
function render(entries: unknown = null) {
  TestBed.configureTestingModule({ imports: [KindPreviewComponent], providers: TEST_PROVIDERS });
  const fixture = TestBed.createComponent(KindPreviewComponent);
  fixture.componentRef.setInput('entries', entries);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, $: (hook: string) => el.querySelector<HTMLElement>(`[data-test="${hook}"]`) };
}

describe('KindPreviewComponent', () => {
  it('labels the button "Draw examples"', () => {
    expect(render().$('preview-kind')!.textContent).toContain('Draw examples');
  });

  it('labels the button "Tirer des exemples" in French', () => {
    TestBed.configureTestingModule({ imports: [KindPreviewComponent], providers: TEST_PROVIDERS });
    TestBed.inject(TranslateService).use('fr');
    const fixture = TestBed.createComponent(KindPreviewComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-test="preview-kind"]').textContent).toContain('Tirer des exemples');
  });

  it('explains the button with a hint line', () => {
    expect(render().$('preview-hint')!.textContent!.trim()).toBe(
      'Generates 3 entries of this kind with the current lists, nothing is saved.',
    );
  });

  it('shows each drawn entry as a card with a bold name, a rarity tag and the description', () => {
    const view = render([{ name: 'Rusty Blade', description: 'Eaten by time.', rarity: 'rare' }]);

    const card = view.$('preview-entry')!;
    expect(card.querySelector('strong')!.textContent).toBe('Rusty Blade');
    expect(card.querySelector('[data-test="preview-rarity"]')!.textContent).toContain('Rare');
    expect(card.textContent).toContain('Eaten by time.');
  });
});
