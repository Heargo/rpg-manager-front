import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { Character } from '../../../world/models/world';
import { PlayerCopyConflict } from '../../models/player-copy';
import { PickASaveDialogComponent } from './pick-a-save-dialog.component';

const hostVersion: Character = {
  id: 'c1',
  playerId: 'ada',
  name: 'Ada',
  statPoints: 5,
  money: 20,
  attributes: [],
  inventory: [],
  rev: 2,
  updatedAt: 2000,
};
const playerVersion: Character = { ...hostVersion, statPoints: 3, rev: 1, updatedAt: 1000 };

/**
 * Contract: the content of the dialog. One row per character field (`[data-field]`), with the host's and the
 * player's value in `.host-value` and `.player-value`; rows whose value differs carry the class `differs`.
 */
async function render(conflict: PlayerCopyConflict) {
  TestBed.configureTestingModule({ imports: [PickASaveDialogComponent], providers: TEST_PROVIDERS });
  const fixture = TestBed.createComponent(PickASaveDialogComponent);
  fixture.componentRef.setInput('conflict', conflict);
  await fixture.whenStable();
  return fixture;
}

const conflict = (queued: PlayerCopyConflict['queued'] = []): PlayerCopyConflict => ({
  playerId: 'ada',
  playerName: 'Ada',
  host: hostVersion,
  player: playerVersion,
  queued,
});

describe('PickASaveDialogComponent', () => {
  it('shows both versions side by side and highlights only the fields that differ', async () => {
    const el: HTMLElement = (await render(conflict())).nativeElement;

    const row = (field: string) => el.querySelector(`[data-field="${field}"]`)!;
    expect(row('statPoints').querySelector('.host-value')!.textContent!.trim()).toBe('5');
    expect(row('statPoints').querySelector('.player-value')!.textContent!.trim()).toBe('3');
    expect(row('statPoints').classList).toContain('differs');
    expect(row('name').classList).not.toContain('differs');
    expect(row('money').classList).not.toContain('differs');
    expect(el.querySelectorAll('.differs').length).toBe(1);
  });

  it('lists the actions the player queued while offline, only when there are some', async () => {
    const none: HTMLElement = (await render(conflict())).nativeElement;
    expect(none.querySelector('.queued')).toBeNull();

    TestBed.resetTestingModule();
    const some: HTMLElement = (
      await render(conflict([{ route: 'character/sell', payload: { characterId: 'c1', inventoryId: 'inv-1' } }]))
    ).nativeElement;
    const items = some.querySelectorAll('.queued li');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('character/sell');
  });

  it('emits keepHost and usePlayer from its two buttons', async () => {
    const fixture = await render(conflict());
    const el: HTMLElement = fixture.nativeElement;
    const kept = vi.fn();
    const used = vi.fn();
    fixture.componentInstance.keepHost.subscribe(kept);
    fixture.componentInstance.usePlayer.subscribe(used);

    (el.querySelector('[data-action="keep-host"]') as HTMLElement).click();
    expect(kept).toHaveBeenCalledTimes(1);
    expect(used).not.toHaveBeenCalled();

    (el.querySelector('[data-action="use-player"]') as HTMLElement).click();
    expect(used).toHaveBeenCalledTimes(1);
  });
});
