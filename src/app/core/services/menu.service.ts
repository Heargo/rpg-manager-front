import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { MenuItem } from '@openng/optimus-ui/api';
import { MenuAction } from '../models/menu.interface';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private menuItems: WritableSignal<MenuItem[]> = signal<MenuItem[]>([]);
  private actions: WritableSignal<MenuAction[]> = signal<MenuAction[]>([]);
  private actionByRoute: Record<string, MenuAction> = {};

  private staticItems: MenuItem[] = [
    {
      label: 'nav.play',
      icon: 'pi pi-users',
      routerLink: '/play',
    },
    {
      label: 'nav.tools',
      icon: 'pi pi-wrench',
      // Every tool works without a world or a room.
      items: [
        { label: 'nav.dice', icon: 'pi pi-box', routerLink: '/dice' },
        { label: 'nav.itemGenerator', icon: 'pi pi-sparkles', routerLink: '/tools/item-generator' },
        { label: 'nav.characterSheet', icon: 'pi pi-id-card', routerLink: '/tools/character-sheet' },
        { label: 'nav.itemCatalogue', icon: 'pi pi-shopping-bag', routerLink: '/tools/item-catalogue' },
        { label: 'nav.itemEditor', icon: 'pi pi-pencil', routerLink: '/tools/item-editor' },
        { label: 'nav.externalTools', icon: 'pi pi-external-link', routerLink: '/tools/links' },
      ],
    },
  ];

  constructor() {
    this.menuItems.set([...this.staticItems]);
  }

  setStaticItems(items: MenuItem[]): void {
    this.staticItems = items;
    this.menuItems.set([...this.staticItems, ...this.menuItems()]);
  }

  getMenuItems(): WritableSignal<MenuItem[]> {
    return this.menuItems;
  }

  setMenuItems(items: MenuItem[]): void {
    this.menuItems.set([...this.staticItems, ...items]);
  }

  resetMenuItems(): void {
    this.menuItems.set([...this.staticItems]);
  }

  getActions(): WritableSignal<MenuAction[]> {
    return this.actions;
  }
}
