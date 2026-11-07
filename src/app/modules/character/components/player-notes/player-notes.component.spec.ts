import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { PlayerNotesComponent } from './player-notes.component';

/** Contract: a `textarea` for the notes and a `[data-action="save-notes"]` button that emits `save` with the text. */
async function render(inputs: { notes: string; readOnly: boolean }) {
  TestBed.configureTestingModule({ imports: [PlayerNotesComponent], providers: TEST_PROVIDERS });
  const fixture = TestBed.createComponent(PlayerNotesComponent);
  fixture.componentRef.setInput('notes', inputs.notes);
  fixture.componentRef.setInput('readOnly', inputs.readOnly);
  const saved: string[] = [];
  fixture.componentInstance.save.subscribe((text) => saved.push(text));
  await fixture.whenStable();
  return { el: fixture.nativeElement as HTMLElement, fixture, saved };
}

describe('PlayerNotesComponent', () => {
  it('shows the notes and emits the edited text on save', async () => {
    const { el, fixture, saved } = await render({ notes: 'Old', readOnly: false });
    const area = el.querySelector('textarea')!;
    expect(area.value).toBe('Old');
    expect(area.readOnly).toBe(false);

    area.value = 'The key is under the mat';
    area.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    (el.querySelector('[data-action="save-notes"]') as HTMLButtonElement).click();

    expect(saved).toEqual(['The key is under the mat']);
  });

  it('is read-only, with no save, when notes are not allowed offline', async () => {
    const { el } = await render({ notes: 'Old', readOnly: true });
    expect(el.querySelector('textarea')!.readOnly).toBe(true);
    const save = el.querySelector('[data-action="save-notes"]') as HTMLButtonElement | null;
    expect(save === null || save.disabled).toBe(true);
  });
});
