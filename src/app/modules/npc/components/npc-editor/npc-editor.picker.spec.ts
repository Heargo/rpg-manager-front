import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import npcNames from '../../../../../../public/packs/base/generators/en/npcs.json';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { ImageBusiness } from '../../../../core/business/image.business';
import { PackBusiness } from '../../../../core/business/pack.business';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { NpcEditorComponent } from './npc-editor.component';

/** The NPC editor uses `app-image-picker`: placeholder and Choose button when empty, hidden file input. */
describe('NpcEditorComponent image picker', () => {
  async function setup() {
    TestBed.configureTestingModule({
      imports: [NpcEditorComponent],
      providers: [
        ...TEST_PROVIDERS,
        { provide: PackBusiness, useValue: { wordList: async () => npcNames } },
        { provide: ImageBusiness, useValue: { storeUpload: async () => 'img-new', url: async () => 'blob:p' } },
      ],
    });
    const fixture = TestBed.createComponent(NpcEditorComponent);
    fixture.componentRef.setInput('world', createSandboxWorld((key) => key));
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the shared picker, empty, with a hidden portrait file input', async () => {
    const el = await setup();
    expect(el.querySelector('app-image-picker [data-testid="image-placeholder"]')).not.toBeNull();
    expect(el.querySelector('app-image-picker [data-action="choose-image"]')!.textContent).toContain('Choose an image');
    expect(el.querySelector<HTMLInputElement>('input[data-field="portrait"]')!.hidden).toBe(true);
  });
});
