import 'fake-indexeddb/auto';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../testing/test-providers';
import { RoomBusiness, RoomStatus } from '../../../modules/room/business/room.business';
import { NavBarComponent } from './nav-bar.component';

async function render(status: RoomStatus) {
  const $status = signal<RoomStatus>(status);
  TestBed.configureTestingModule({
    imports: [NavBarComponent],
    providers: [...TEST_PROVIDERS, { provide: RoomBusiness, useValue: { $status } }],
  });
  const fixture = TestBed.createComponent(NavBarComponent);
  await fixture.whenStable();
  return { el: fixture.nativeElement as HTMLElement, fixture, $status };
}

describe('NavBarComponent host-offline icon', () => {
  it('shows the host-offline icon when the host channel closes, and hides it again when connected', async () => {
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
