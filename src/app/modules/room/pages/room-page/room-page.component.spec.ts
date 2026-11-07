import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProfileBusiness } from '../../../../core/business/profile.business';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { OfflineFeaturesBusiness } from '../../../world/business/offline-features.business';
import { CharacterListComponent } from '../../../character/components/character-list/character-list.component';
import { InviteCardComponent } from '../../components/invite-card/invite-card.component';
import { MemberListComponent } from '../../components/member-list/member-list.component';
import { OfflineFeaturesPanelComponent } from '../../components/offline-features-panel/offline-features-panel.component';
import { PendingInvite, RoomBusiness } from '../../business/room.business';
import { RoomPageComponent } from './room-page.component';


const invite: PendingInvite = { id: 'i1', offerCode: 'offer', createdAt: 0, state: 'waiting' };

/** Contract: `.pending-invites-note` is in the host lobby only while at least one invite is pending. */
async function render(invites: PendingInvite[]) {
  const $pendingInvites = signal<PendingInvite[]>(invites);
  const room = {
    $status: signal('hosting'),
    $room: signal({ name: 'Friday table', members: [] }),
    $restored: signal(false),
    $pendingInvites,
    whenReady: async () => undefined,
  };
  TestBed.configureTestingModule({
    imports: [RoomPageComponent],
    providers: [
      ...TEST_PROVIDERS,
      { provide: RoomBusiness, useValue: room },
      { provide: ProfileBusiness, useValue: { $profile: signal({ playerId: 'gm', name: 'Gm' }) } },
      { provide: OfflineFeaturesBusiness, useValue: { $features: signal(null) } },
    ],
  }).overrideComponent(RoomPageComponent, {
    remove: { imports: [CharacterListComponent, InviteCardComponent, MemberListComponent, OfflineFeaturesPanelComponent] },
    add: { schemas: [NO_ERRORS_SCHEMA] },
  });
  const fixture = TestBed.createComponent(RoomPageComponent);
  await fixture.whenStable();
  return { el: fixture.nativeElement as HTMLElement, fixture, $pendingInvites };
}

describe('RoomPageComponent pending invites note', () => {
  it('warns that pending invites die on a reload while an invite is pending', async () => {
    const { el } = await render([invite]);
    const note = el.querySelector('.pending-invites-note');
    expect(note).not.toBeNull();
    expect(note!.textContent).toContain('Pending invites are lost if you reload or close this page');
  });

  it('shows no note without pending invites, and drops it when the last one goes', async () => {
    const { el, fixture, $pendingInvites } = await render([]);
    expect(el.querySelector('.pending-invites-note')).toBeNull();

    $pendingInvites.set([invite]);
    await fixture.whenStable();
    expect(el.querySelector('.pending-invites-note')).not.toBeNull();

    $pendingInvites.set([]);
    await fixture.whenStable();
    expect(el.querySelector('.pending-invites-note')).toBeNull();
  });
});
