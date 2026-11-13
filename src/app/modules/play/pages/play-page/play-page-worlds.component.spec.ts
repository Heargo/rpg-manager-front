import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { encodeSignal } from '../../../../core/p2p/helpers/signal-codec';
import { CHROME_OFFER } from '../../../../../testing/sdp-samples';
import { PlayBusiness } from '../../business/play.business';
import { PlayPageComponent } from './play-page.component';

const offerCode = encodeSignal({ type: 'offer', sdp: CHROME_OFFER });

/**
 * Contract: every world (own or joined) is an element `[data-test="world-entry"]` holding a
 * `[data-test="world-badge"]` (GM or Player). A joined entry has `[data-test="rejoin"]`, `[data-test="open-sheet"]`
 * and `[data-test="remove-joined"]` buttons.
 */
describe('PlayPageComponent worlds list', () => {
  const navigate = vi.fn(async () => true);
  const removeJoinedWorld = vi.fn(async () => undefined);

  async function render() {
    const play = {
      load: async () => undefined,
      $worlds: signal([
        { id: 'w1', name: 'My Realm', description: '', characterCount: 2, updatedAt: 0 },
      ]),
      $joinedWorlds: signal([
        {
          worldId: 'w9',
          roomId: 'r9',
          name: 'Harbour',
          hostName: 'Gm Anna',
          invite: `https://app.example/join#${offerCode}`,
          lastSeenAt: 1000,
        },
      ]),
      $joinedRooms: signal([]),
      $roomStatus: signal('idle'),
      $roomName: signal(undefined),
      $hostedWorldId: signal(undefined),
      removeJoinedWorld,
    };
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS, { provide: PlayBusiness, useValue: play }] });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(navigate);
    const fixture = TestBed.createComponent(PlayPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  const el = (fixture: Awaited<ReturnType<typeof render>>) => fixture.nativeElement as HTMLElement;
  const entry = (fixture: Awaited<ReturnType<typeof render>>, name: string) =>
    [...el(fixture).querySelectorAll('[data-test="world-entry"]')].find((e) => e.textContent?.includes(name))!;
  const badge = (e: Element) => e.querySelector('[data-test="world-badge"]')?.textContent?.trim();

  beforeEach(() => {
    navigate.mockClear();
    removeJoinedWorld.mockClear();
  });

  it('is titled "Worlds", and "Mondes" in French', async () => {
    const fixture = await render();
    expect(el(fixture).querySelector('h1')?.textContent?.trim()).toBe('Worlds');
    TestBed.inject(TranslocoService).setActiveLang('fr');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el(fixture).querySelector('h1')?.textContent?.trim()).toBe('Mondes');
  });

  it('lists the own world with a GM badge and the joined world with a Player badge', async () => {
    const fixture = await render();
    expect(badge(entry(fixture, 'My Realm'))).toBe('GM');
    expect(badge(entry(fixture, 'Harbour'))).toBe('Player');
    expect(entry(fixture, 'Harbour').textContent).toContain('Gm Anna');
  });

  it('rejoins a joined world with its saved invite', async () => {
    const fixture = await render();
    (entry(fixture, 'Harbour').querySelector('[data-test="rejoin"]') as HTMLElement).click();
    expect(navigate).toHaveBeenCalledWith(['/join'], { fragment: offerCode });
  });

  it('opens the character read-only from the local copy', async () => {
    const fixture = await render();
    (entry(fixture, 'Harbour').querySelector('[data-test="open-sheet"]') as HTMLElement).click();
    expect(navigate).toHaveBeenCalledWith(['/play/joined', 'w9']);
  });

  it('offers neither rejoin nor remove on the own world', async () => {
    const fixture = await render();
    const own = entry(fixture, 'My Realm');
    expect(own.querySelector('[data-test="rejoin"]')).toBeNull();
    expect(own.querySelector('[data-test="remove-joined"]')).toBeNull();
  });

  it('asks before removing a joined world, then removes it', async () => {
    const fixture = await render();
    const confirm = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
    (entry(fixture, 'Harbour').querySelector('[data-test="remove-joined"]') as HTMLElement).click();
    expect(removeJoinedWorld).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledTimes(1);
    confirm.mock.calls[0][0].accept!();
    expect(removeJoinedWorld).toHaveBeenCalledWith('w9');
  });
});
