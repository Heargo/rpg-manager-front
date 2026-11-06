import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';

import { MenubarModule } from '@openng/optimus-ui/menubar';
import { AvatarModule } from '@openng/optimus-ui/avatar';
import { MenuService } from '../../services/menu.service';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TieredMenu } from '@openng/optimus-ui/tieredmenu';
import { MenuItem } from '@openng/optimus-ui/api';
import { Router } from '@angular/router';
import { AuthentificationBusiness } from '../../../modules/authentification/business/authentification.business';
import { User } from '../../../modules/user/models/user.interface';
import { UsersBusiness } from '../../../modules/user/business/users.business';
import { LanguageBusiness } from '../../business/language.business';

@Component({
  standalone: true,
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    MenubarModule,
    AvatarModule,
    ButtonModule,
    TieredMenu
],
})
export class NavBarComponent {
  protected readonly authBusiness = inject(AuthentificationBusiness);
  private readonly menuService = inject(MenuService);
  private readonly usersBusiness = inject(UsersBusiness);
  private readonly router = inject(Router);
  private readonly languageBusiness = inject(LanguageBusiness);

  private readonly rawItems = this.menuService.getMenuItems();
  /** Menu labels are translation keys; translate them for the active language. */
  public items = computed(() => this.translateItems(this.rawItems()));
  public $label = computed(() => {
    const user = this.usersBusiness.$currentUser();
    return user?.login ? user.login.charAt(0).toUpperCase() : '?';
  });

  protected profileItems = computed<MenuItem[]>(() => {
    return [
      ...this.calculateNavBarItems(null, this.authBusiness.$connected()),
      { separator: true },
      this.languageItem(),
    ];
  });

  private languageItem(): MenuItem {
    const active = this.languageBusiness.$language();
    return {
      label: this.languageBusiness.t('nav.language'),
      icon: 'pi pi-language',
      items: this.languageBusiness.languages.map((language) => ({
        label: language.label,
        icon: language.code === active ? 'pi pi-check' : undefined,
        command: () => this.languageBusiness.setLanguage(language.code),
      })),
    };
  }

  private translateItems(items: MenuItem[]): MenuItem[] {
    return items.map((item) => ({
      ...item,
      label: item.label ? this.languageBusiness.t(item.label) : item.label,
      items: item.items ? this.translateItems(item.items) : item.items,
    }));
  }

  async onGoHome() {
    await this.router.navigate(['/']);
  }

  calculateNavBarItems(user: User | null, isLoggedIn: boolean) {
    let profileItems: MenuItem[] = [];
    if (isLoggedIn) {
      profileItems = [
        {
          label: this.languageBusiness.t('nav.profile'),
          icon: 'pi pi-user',
          routerLink: '/user/profile',
        },
        {
          label: this.languageBusiness.t('nav.logout'),
          icon: 'pi pi-sign-out',
          command: () => {
            this.authBusiness.logout();
          },
        },
      ];
    } else {
      profileItems = [
        {
          label: this.languageBusiness.t('nav.login'),
          icon: 'pi pi-sign-in',
          routerLink: '/auth/login',
        },
        {
          label: this.languageBusiness.t('nav.register'),
          icon: 'pi pi-user-plus',
          routerLink: '/auth/register',
        },
      ];
    }
    return profileItems;
  }
}
