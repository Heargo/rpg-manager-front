import 'fake-indexeddb/auto';
import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { TEST_PROVIDERS } from '../../../../testing/test-providers';
import { RoomBusiness, RoomStatus } from '../../../modules/room/business/room.business';
import { LanguageBusiness } from '../../business/language.business';
import { NavBarComponent } from './nav-bar.component';

async function render(status: RoomStatus, isHost = false) {
  const $status = signal<RoomStatus>(status);
  const room = { $status, $isHost: signal(isHost), $room: signal(null), leave: vi.fn() };
  TestBed.configureTestingModule({
    imports: [NavBarComponent],
    providers: [...TEST_PROVIDERS, { provide: RoomBusiness, useValue: room }],
  });
  const fixture = TestBed.createComponent(NavBarComponent);
  await fixture.whenStable();
  return { el: fixture.nativeElement as HTMLElement, fixture, $status, room };
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

const text = (node: Element | null | undefined) => node?.textContent?.trim() ?? '';

function rootItems(el: HTMLElement): Element[] {
  return Array.from(el.querySelectorAll('.p-menubar-root-list > li[role="menuitem"]'));
}

function rootLabels(el: HTMLElement): string[] {
  return rootItems(el).map((li) => text(li.querySelector('.p-menubar-item-label')));
}

function subLabels(el: HTMLElement, label: string): string[] {
  const item = rootItems(el).find((li) => text(li.querySelector('.p-menubar-item-label')) === label);
  const labels = Array.from(item?.querySelectorAll('.p-menubar-submenu .p-menubar-item-label') ?? []);
  return labels.map((node) => text(node));
}

function closeButton(el: HTMLElement): HTMLElement | undefined {
  return Array.from(el.querySelectorAll<HTMLElement>('button')).find((b) =>
    /close the world/i.test(text(b)),
  );
}

describe('NavBarComponent out of a room', () => {
  it('lists Worlds, Dice, Catalogues and Tools in that order, with no Close the world button', async () => {
    const { el } = await render('idle');
    expect(rootLabels(el)).toEqual(['Worlds', 'Dice', 'Catalogues', 'Tools']);
    expect(closeButton(el)).toBeUndefined();
    expect(rootItems(el)[0].querySelector('a')?.getAttribute('href')).toBe('/play');
  });

  it('puts the item, NPC, skill and class catalogues in the Catalogues submenu', async () => {
    const { el } = await render('idle');
    expect(subLabels(el, 'Catalogues')).toEqual([
      'Item catalogue',
      'NPC catalogue',
      'Skill catalogue',
      'Class catalogue',
    ]);
  });

  it('puts the internal tools then External tools in the Tools submenu, without World rules', async () => {
    const { el } = await render('idle');
    expect(subLabels(el, 'Tools')).toEqual([
      'Sprite colorizer',
      'Item generator',
      'Character sheet',
      'External tools',
    ]);
  });
});

describe.each([
  ['GM', true],
  ['player', false],
])('NavBarComponent in a room as %s', (_who, isHost) => {
  const status: RoomStatus = isHost ? 'hosting' : 'connected';

  it('lists Table, Catalogues, Tools, World rules in that order', async () => {
    const { el } = await render(status, isHost);
    expect(rootLabels(el)).toEqual(['Table', 'Catalogues', 'Tools', 'World rules']);
  });

  it('keeps the character sheet and world rules sandboxes out of the Tools submenu', async () => {
    const { el } = await render(status, isHost);
    expect(subLabels(el, 'Tools')).toEqual(['Sprite colorizer', 'Item generator', 'External tools']);
  });

  it('shows the Close the world button after the menu and before the avatar', async () => {
    const { el } = await render(status, isHost);
    const button = closeButton(el);
    expect(button).toBeDefined();
    const last = rootItems(el).at(-1) as Element;
    expect(last.compareDocumentPosition(button as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const avatar = el.querySelector('p-avatar') as Node;
    expect((button as Node).compareDocumentPosition(avatar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('asks for confirmation first, and closes or leaves the room only once accepted', async () => {
    const { el, room } = await render(status, isHost);
    const confirmation = TestBed.inject(ConfirmationService);
    const confirm = vi.spyOn(confirmation, 'confirm').mockImplementation(() => confirmation);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    closeButton(el)?.click();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(room.leave).not.toHaveBeenCalled();

    confirm.mock.calls[0][0].accept?.();
    await Promise.resolve();
    expect(room.leave).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/play']);
  });

  it('does nothing when the confirmation is rejected', async () => {
    const { el, room } = await render(status, isHost);
    const confirmation = TestBed.inject(ConfirmationService);
    const confirm = vi.spyOn(confirmation, 'confirm').mockImplementation(() => confirmation);

    closeButton(el)?.click();
    confirm.mock.calls[0][0].reject?.();
    expect(room.leave).not.toHaveBeenCalled();
  });
});

describe('NavBarComponent submenu markup', () => {
  it('renders submenu items in the DOM', async () => {
    const { el } = await render('idle');
    expect(el.querySelectorAll('.p-menubar-submenu .p-menubar-item-label').length).toBeGreaterThan(0);
  });
});

describe('NavBarComponent room catalogues', () => {
  it('links the GM to the room world catalogues', async () => {
    const { el } = await render('hosting', true);
    expect(subLabels(el, 'Catalogues')).toEqual([
      'Item catalogue',
      'NPC catalogue',
      'Skill catalogue',
      'Class catalogue',
    ]);
    const hrefs = Array.from(
      rootItems(el)[1].querySelectorAll('.p-menubar-submenu a'),
    ).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/room/items', '/room/npcs', '/room/skills', '/room/classes']);
  });

  it('links the World rules item to the room world rules page', async () => {
    const { el } = await render('connected', false);
    expect(rootItems(el)[3].querySelector('a')?.getAttribute('href')).toBe('/room/rules');
  });
});

describe('NavBarComponent French labels', () => {
  it('translates the out-of-room items', async () => {
    const { el } = await render('idle');
    TestBed.inject(LanguageBusiness).setLanguage('fr');
    TestBed.inject(ApplicationRef).tick();
    expect(rootLabels(el)).toEqual(['Mondes', 'Dés', 'Catalogues', 'Outils']);
  });
});
