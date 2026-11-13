import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { JoinedWorldsBusiness } from '../../../play/business/joined-worlds.business';
import { Character } from '../../../world/models/world';
import { PlayerCopyBusiness } from '../../business/player-copy.business';
import { JoinedWorldSheetPageComponent } from './joined-world-sheet-page.component';

const sheetWorld = {
  attributes: [{ id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }],
  barAttributes: { life: 'life' },
  levelCurve: { preset: 'growing' },
  maxLevel: 20,
};

const copy: Character = {
  id: 'c1',
  playerId: 'ada',
  name: 'Ada the Bold',
  statPoints: 3,
  xp: 250,
  level: 2,
  money: 40,
  attributes: [{ attributeId: 'life', level: 0, current: 6 }],
  inventory: [],
  rev: 4,
  updatedAt: 0,
  skillPoints: 0,
  skills: [],
};

/** Contract: the page is at `/play/joined/:worldId`; the read-only notice is `[data-test="joined-readonly"]`. */
describe('JoinedWorldSheetPageComponent (host offline)', () => {
  const savedCopy = vi.fn(async (roomId: string) => (roomId === 'r9' ? copy : undefined));

  async function render(worldId: string) {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }));
    TestBed.configureTestingModule({
      providers: [
        ...TEST_PROVIDERS,
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ worldId })) } },
        {
          provide: JoinedWorldsBusiness,
          useValue: {
            load: async () => undefined,
            $worlds: signal([
              { worldId: 'w9', roomId: 'r9', name: 'Harbour', hostName: 'Gm', invite: 'x', lastSeenAt: 1, sheetWorld },
            ]),
          },
        },
        { provide: PlayerCopyBusiness, useValue: { savedCopy } },
      ],
    });
    const fixture = TestBed.createComponent(JoinedWorldSheetPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => vi.unstubAllGlobals());

  it('shows the character sheet from the saved player copy, without the host', async () => {
    const el = await render('w9');
    expect(savedCopy).toHaveBeenCalledWith('r9');
    expect(el.textContent).toContain('Ada the Bold');
    expect(el.querySelector('[data-test="joined-readonly"]')).not.toBeNull();
  });

  it('is read-only: no action can be played', async () => {
    const el = await render('w9');
    expect(el.querySelector('[data-test="joined-readonly"]')?.textContent?.trim()).not.toBe('');
    // A playable sheet shows spend-point buttons; read-only shows none.
    expect(el.querySelectorAll('button[aria-label*="Increase"], button[data-test="spend"]').length).toBe(0);
  });

  it('shows nothing of a world that was not joined', async () => {
    const el = await render('unknown');
    expect(el.textContent).not.toContain('Ada the Bold');
  });
});
