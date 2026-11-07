import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../testing/test-providers';
import { RoomBusiness, RoomStatus } from '../../../modules/room/business/room.business';
import { HostOfflineIconComponent } from './host-offline-icon.component';

const TOOLTIP = 'Host offline: some features still work; ask the host for a new invite to reconnect';

/** Contract: `.host-offline-icon` exists only while the room status is `host-offline`; its `aria-label` is the tooltip text. */
async function render(status: RoomStatus) {
  const $status = signal<RoomStatus>(status);
  TestBed.configureTestingModule({
    imports: [HostOfflineIconComponent],
    providers: [...TEST_PROVIDERS, { provide: RoomBusiness, useValue: { $status } }],
  });
  const fixture = TestBed.createComponent(HostOfflineIconComponent);
  await fixture.whenStable();
  return { el: fixture.nativeElement as HTMLElement, fixture, $status };
}

describe('HostOfflineIconComponent', () => {
  it('shows the crossed-out wifi icon with its tooltip when the host is offline', async () => {
    const { el } = await render('host-offline');
    const icon = el.querySelector('.host-offline-icon')!;
    expect(icon).not.toBeNull();
    expect(icon.getAttribute('aria-label')).toBe(TOOLTIP);
  });

  it('is absent while connected, and appears when the channel closes', async () => {
    const { el, fixture, $status } = await render('connected');
    expect(el.querySelector('.host-offline-icon')).toBeNull();
    $status.set('host-offline');
    await fixture.whenStable();
    expect(el.querySelector('.host-offline-icon')).not.toBeNull();
  });
});
