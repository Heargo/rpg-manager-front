// the guard use the menu service to set the given menu items (e.g. data from the route)
import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { MenuService } from '../services/menu.service';
@Injectable({
  providedIn: 'root',
})
export class NavigationGuard implements CanActivate {
  constructor(private menuService: MenuService) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (route.data && route.data['menuItems']) {
      this.menuService.setMenuItems(route.data['menuItems']);
    } else {
      // Optionally, you can set a default menu or handle the case where no items are provided
      this.menuService.resetMenuItems();
    }
    return true; // Allow navigation
  }
}
