import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProfileBusiness } from '../../../../core/business/profile.business';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { OfflineFeaturesBusiness } from '../../../world/business/offline-features.business';
import { CharacterListComponent } from '../../../character/components/character-list/character-list.component';
import { InviteCardComponent } from '../../components/invite-card/invite-card.component';
import { MemberListComponent } from '../../components/member-list/member-list.component';
import { PendingInvite, RoomBusiness } from '../../business/room.business';
import { RoomSizeBusiness } from '../../business/room-size.business';
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
    remove: { imports: [CharacterListComponent, InviteCardComponent, MemberListComponent] },
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

describe('RoomPageComponent room size', () => {
  async function renderSize(size: { max: number; over: boolean; struggling: boolean }) {
    const $over = signal(size.over);
    const $struggling = signal(size.struggling);
    const room = {
      $status: signal('hosting'),
      $room: signal({ name: 'Friday table', members: [] }),
      $restored: signal(false),
      $pendingInvites: signal<PendingInvite[]>([]),
      whenReady: async () => undefined,
    };
    TestBed.configureTestingModule({
      imports: [RoomPageComponent],
      providers: [
        ...TEST_PROVIDERS,
        { provide: RoomBusiness, useValue: room },
        { provide: RoomSizeBusiness, useValue: { $recommendedMax: signal(size.max), $overMax: $over, $struggling } },
        { provide: ProfileBusiness, useValue: { $profile: signal({ playerId: 'gm', name: 'Gm' }) } },
        { provide: OfflineFeaturesBusiness, useValue: { $features: signal(null) } },
      ],
    }).overrideComponent(RoomPageComponent, {
      remove: { imports: [CharacterListComponent, InviteCardComponent, MemberListComponent] },
      add: { schemas: [NO_ERRORS_SCHEMA] },
    });
    const fixture = TestBed.createComponent(RoomPageComponent);
    await fixture.whenStable();
    return { el: fixture.nativeElement as HTMLElement, fixture, $over, $struggling };
  }

  it('shows the recommended maximum in the lobby', async () => {
    const { el } = await renderSize({ max: 6, over: false, struggling: false });

    expect(el.querySelector('.room-size-max')!.textContent).toContain('6');
  });

  it('warns, without blocking, only while the room is over the maximum', async () => {
    const { el, fixture, $over } = await renderSize({ max: 6, over: false, struggling: false });
    expect(el.querySelector('.room-size-warning')).toBeNull();

    $over.set(true);
    await fixture.whenStable();
    expect(el.querySelector('.room-size-warning')).not.toBeNull();
    expect(el.querySelector('.room-size-warning')!.tagName.toLowerCase()).toBe('p-message');
  });

  it("says the host's connection is struggling, whatever the count", async () => {
    const { el, fixture, $struggling } = await renderSize({ max: 6, over: false, struggling: false });
    expect(el.querySelector('.room-size-struggling')).toBeNull();

    $struggling.set(true);
    await fixture.whenStable();
    expect(el.querySelector('.room-size-struggling')!.textContent).toMatch(/connection is struggling/i);
  });
});

describe('RoomPageComponent offline features', () => {
  it('no longer hosts the offline features panel, even when the world has features', async () => {
    const room = {
      $status: signal('hosting'),
      $room: signal({ name: 'Friday table', members: [] }),
      $restored: signal(false),
      $pendingInvites: signal<PendingInvite[]>([]),
      whenReady: async () => undefined,
    };
    const features = { dice: true, notes: true, spendStatPoints: false, equip: false, useConsumables: false, sell: false, learnSkills: false };
    TestBed.configureTestingModule({
      imports: [RoomPageComponent],
      providers: [
        ...TEST_PROVIDERS,
        { provide: RoomBusiness, useValue: room },
        { provide: ProfileBusiness, useValue: { $profile: signal({ playerId: 'gm', name: 'Gm' }) } },
        { provide: OfflineFeaturesBusiness, useValue: { $features: signal(features) } },
      ],
    }).overrideComponent(RoomPageComponent, {
      remove: { imports: [CharacterListComponent, InviteCardComponent, MemberListComponent] },
      add: { schemas: [NO_ERRORS_SCHEMA] },
    });
    const fixture = TestBed.createComponent(RoomPageComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('app-offline-features-panel')).toBeNull();
    expect(el.textContent).not.toContain('Offline');
    expect(el.querySelector('h1')!.textContent).toContain('Friday table');
  });
});
