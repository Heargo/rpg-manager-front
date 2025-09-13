import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenubarModule } from 'primeng/menubar';
import { AvatarModule } from 'primeng/avatar';
import { MenuService } from '../../services/menu.service';
import { ButtonModule } from 'primeng/button';
import { TieredMenu } from 'primeng/tieredmenu';
import { MenuItem } from 'primeng/api';
import { Router } from '@angular/router';
import { AuthentificationBusiness } from '../../../modules/authentification/business/authentification.business';
import { User } from '../../../modules/user/models/user.interface';
import { UsersBusiness } from '../../../modules/user/business/users.business';

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
  protected readonly authBusiness = inject(AuthentificationBusiness);
  private readonly menuService = inject(MenuService);
  private readonly usersBusiness = inject(UsersBusiness);
  private readonly router = inject(Router);

  public items = this.menuService.getMenuItems();
  public $label = computed(() => {
    const user = this.usersBusiness.$currentUser();
    return user?.login ? user.login.charAt(0).toUpperCase() : '?';
  });

  protected profileItems = computed<MenuItem[]>(() => {
    return this.calculateNavBarItems(null, this.authBusiness.$connected());
  });

  async onGoHome() {
    await this.router.navigate(['/']);
  }

  calculateNavBarItems(user: User | null, isLoggedIn: boolean) {
    let profileItems: MenuItem[] = [];
    if (isLoggedIn) {
      profileItems = [
        {
          label: 'Profile',
          icon: 'pi pi-user',
          routerLink: '/user/profile',
        },
        {
          label: 'Logout',
          icon: 'pi pi-sign-out',
          command: () => {
            this.authBusiness.logout();
          },
        },
      ];
    } else {
      profileItems = [
        {
          label: 'Login',
          icon: 'pi pi-sign-in',
          routerLink: '/auth/login',
        },
        {
          label: 'Register',
          icon: 'pi pi-register',
          routerLink: '/auth/register',
        },
      ];
    }
    return profileItems;
  }
}
