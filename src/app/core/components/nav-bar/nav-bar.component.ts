import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from '@openng/optimus-ui/api';
import { AvatarModule } from '@openng/optimus-ui/avatar';
import { MenubarModule } from '@openng/optimus-ui/menubar';
import { TieredMenu } from '@openng/optimus-ui/tieredmenu';
import { LanguageBusiness } from '../../business/language.business';
import { ProfileBusiness } from '../../business/profile.business';
import { MenuService } from '../../services/menu.service';

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MenubarModule, AvatarModule, TieredMenu],
})
export class NavBarComponent {
  protected readonly profileBusiness = inject(ProfileBusiness);
  private readonly languageBusiness = inject(LanguageBusiness);
  private readonly menuService = inject(MenuService);
  private readonly router = inject(Router);

  private readonly rawItems = this.menuService.getMenuItems();
  /** Menu labels are translation keys; translate them for the active language. */
  protected readonly items = computed(() => this.translateItems(this.rawItems()));

  protected readonly profileItems = computed<MenuItem[]>(() => [
    {
      label: this.languageBusiness.t('nav.profile'),
      icon: 'pi pi-user',
      routerLink: '/profile',
    },
    { separator: true },
    this.languageItem(),
  ]);

  protected async onGoHome(): Promise<void> {
    await this.router.navigate(['/']);
  }

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
}
