import { TestBed } from '@angular/core/testing';
import { MenuService } from './menu.service';

describe('MenuService', () => {
  it('puts every tool directly in the nav bar, after Play, with no Tools submenu', () => {
    TestBed.configureTestingModule({});
    const items = TestBed.inject(MenuService).getMenuItems()();

    expect(items.map((item) => item.routerLink)).toEqual([
      '/play',
      '/dice',
      '/tools/item-generator',
      '/tools/character-sheet',
      '/tools/item-catalogue',
      '/tools/item-editor',
      '/tools/world-rules',
      '/tools/npc-catalogue',
      '/tools/npc-editor',
      '/tools/skills',
      '/tools/classes',
      '/tools/links',
    ]);
    expect(items.some((item) => item.label === 'nav.tools')).toBe(false);
    expect(items.every((item) => !item.items)).toBe(true);
  });
});
