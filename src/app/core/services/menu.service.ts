import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { MenuAction } from '../models/menu.interface';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private menuItems: WritableSignal<MenuItem[]> = signal<MenuItem[]>([]);
  private actions: WritableSignal<MenuAction[]> = signal<MenuAction[]>([]);
  private staticItems: MenuItem[] = [];

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
