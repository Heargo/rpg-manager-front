import {
  Component,
  inject,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenubarModule } from 'primeng/menubar';
import { AvatarModule } from 'primeng/avatar';
import { MenuService } from '../../services/menu.service';
import { ButtonModule } from 'primeng/button';
import { TieredMenu } from 'primeng/tieredmenu';
import { MenuItem } from 'primeng/api';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss'],
  imports: [
    CommonModule,
    MenubarModule,
    AvatarModule,
    ButtonModule,
    TieredMenu,
  ],
})
export class NavBarComponent {
  private readonly authService = inject(AuthService);
  private readonly menuService = inject(MenuService);
  private readonly router = inject(Router);

  public items = this.menuService.getMenuItems();
  public label: string = '';

  public profileItems: WritableSignal<MenuItem[]> = signal([]);

  public loggedIn: WritableSignal<boolean> = signal(false);

  constructor() {
    this.updateNavBarItems();
  }

  async onGoHome() {
    await this.router.navigate(['/']);
  }

  async updateNavBarItems() {
    const isLoggedIn = await this.authService.isLoggedIn();
    const user = { email: 'EMAIL TODO' }; //await this.authService.getUser();

    if (isLoggedIn) {
      console.log('User is logged in:', user);
      this.profileItems.set([
        {
          label: 'Profile',
          icon: 'pi pi-user',
          routerLink: '/user/profile',
        },
        {
          label: 'Logout',
          icon: 'pi pi-sign-out',
          command: () => {
            this.authService.logout();
          },
        },
      ]);
      this.loggedIn.set(true);
      this.label = user?.email ? user.email.charAt(0).toUpperCase() : '?';
    } else {
      this.profileItems.set([
        {
          label: 'Login',
          icon: 'pi pi-sign-in',
          routerLink: '/auth/login',
        },
      ]);
      this.loggedIn.set(false);
    }
  }
}
