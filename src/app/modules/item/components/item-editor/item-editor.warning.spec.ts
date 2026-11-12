import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import en from '../../../../../../public/i18n/generators/en/items.json';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { WordListService } from '../../../../core/services/word-list.service';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { ItemEditorComponent } from './item-editor.component';

/** New hook: `[data-testid="image-warning"]`, the human-artists warning shown with the image picker. */
describe('ItemEditorComponent image warning', () => {
  it('shows the human-artists warning in English and French', async () => {
    TestBed.configureTestingModule({
      imports: [ItemEditorComponent],
      providers: [...TEST_PROVIDERS, { provide: WordListService, useValue: { loadItemWords: async () => en } }],
    });
    const fixture = TestBed.createComponent(ItemEditorComponent);
    fixture.componentRef.setInput('world', createSandboxWorld((key) => key));
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="image-warning"]')!.textContent).toContain('human artists');
    TestBed.inject(TranslocoService).setActiveLang('fr');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="image-warning"]')!.textContent).toContain('artistes humains');
  });
});
