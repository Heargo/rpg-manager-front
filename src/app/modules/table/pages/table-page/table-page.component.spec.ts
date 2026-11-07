import 'fake-indexeddb/auto';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { RoomBusiness, RoomStatus } from '../../../room/business/room.business';
import { TablePageComponent } from './table-page.component';

async function render(status: RoomStatus) {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
  }));
  const room = {
    $status: signal<RoomStatus>(status),
    $room: signal(null),
    $isHost: signal(false),
    whenReady: () => Promise.resolve(),
    describeError: (e: unknown) => String(e),
  };
  TestBed.configureTestingModule({ imports: [TablePageComponent], providers: [...TEST_PROVIDERS, { provide: RoomBusiness, useValue: room }] });
  const fixture = TestBed.createComponent(TablePageComponent);
  await fixture.whenStable();
  return { el: fixture.nativeElement as HTMLElement, fixture, $status: room.$status };
}

describe('TablePageComponent host-offline icon', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the host-offline icon on the table when the host channel closes, and hides it when connected', async () => {
    const { el, fixture, $status } = await render('connected');
    expect(el.querySelector('.host-offline-icon')).toBeNull();

    $status.set('host-offline');
    await fixture.whenStable();
    expect(el.querySelector('.host-offline-icon')).not.toBeNull();

    $status.set('connected');
    await fixture.whenStable();
    expect(el.querySelector('.host-offline-icon')).toBeNull();
  });
});
