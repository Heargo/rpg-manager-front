import { TestBed } from '@angular/core/testing';
import { MenuService } from './menu.service';

describe('MenuService', () => {
  it('groups every tool under Tools', () => {
    TestBed.configureTestingModule({});
    const items = TestBed.inject(MenuService).getMenuItems()();

    const tools = items.find((item) => item.label === 'nav.tools');
    expect(tools?.items?.map((item) => item.routerLink)).toEqual([
      '/dice',
      '/tools/item-generator',
      '/tools/links',
    ]);
    expect(items.some((item) => item.label === 'nav.dice')).toBe(false);
  });
});
