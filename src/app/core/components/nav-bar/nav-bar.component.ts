import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { AvatarModule } from '@openng/optimus-ui/avatar';
import { MenubarModule } from '@openng/optimus-ui/menubar';
import { TieredMenu } from '@openng/optimus-ui/tieredmenu';
import { LanguageBusiness } from '../../business/language.business';
import { ProfileBusiness } from '../../business/profile.business';
import { HostOfflineIconComponent } from '../host-offline-icon/host-offline-icon.component';
import { RoomBusiness } from '../../../modules/room/business/room.business';

const CATALOGUES = (prefix: string, names: string[]): MenuItem[] => [
  {
    label: 'nav.itemCatalogue',
    icon: 'pi pi-shopping-bag',
    routerLink: `${prefix}/${names[0]}`,
  },
  {
    label: 'nav.npcCatalogue',
    icon: 'pi pi-users',
    routerLink: `${prefix}/${names[1]}`,
  },
  {
    label: 'nav.skillCatalogue',
    icon: 'pi pi-bolt',
    routerLink: `${prefix}/${names[2]}`,
  },
  {
    label: 'nav.classCatalogue',
    icon: 'pi pi-sitemap',
    routerLink: `${prefix}/${names[3]}`,
  },
];

const SPRITE_COLORIZER: MenuItem = {
  label: 'nav.spriteColorizer',
  icon: 'pi pi-palette',
  routerLink: '/tools/sprite-colorizer',
};
const ITEM_GENERATOR: MenuItem = {
  label: 'nav.itemGenerator',
  icon: 'pi pi-sparkles',
  routerLink: '/tools/item-generator',
};
const EXTERNAL_TOOLS: MenuItem = {
  label: 'nav.externalTools',
  icon: 'pi pi-external-link',
  routerLink: '/tools/links',
};

/** Out of a room: the sandbox character sheet stays; world rules only exist in a world. */
const TOOLS: MenuItem = {
  label: 'nav.tools',
  icon: 'pi pi-wrench',
  items: [
    SPRITE_COLORIZER,
    ITEM_GENERATOR,
    {
      label: 'nav.characterSheet',
      icon: 'pi pi-id-card',
      routerLink: '/tools/character-sheet',
    },
    {
      label: 'nav.combat',
      icon: 'pi pi-shield',
      routerLink: '/tools/combat',
    },
    EXTERNAL_TOOLS,
  ],
};

/** In a room the world has the real sheet and rules, so no sandbox for them. */
const ROOM_TOOLS: MenuItem = {
  label: 'nav.tools',
  icon: 'pi pi-wrench',
  items: [SPRITE_COLORIZER, ITEM_GENERATOR, EXTERNAL_TOOLS],
};

const OUT_OF_ROOM_ITEMS: MenuItem[] = [
  { label: 'nav.worlds', icon: 'pi pi-users', routerLink: '/play' },
  { label: 'nav.dice', icon: 'pi pi-box', routerLink: '/dice' },
  {
    label: 'nav.catalogues',
    icon: 'pi pi-book',
    items: [
      {
        label: 'nav.itemCatalogue',
        icon: 'pi pi-shopping-bag',
        routerLink: '/tools/item-catalogue',
      },
      {
        label: 'nav.npcCatalogue',
        icon: 'pi pi-users',
        routerLink: '/tools/npc-catalogue',
      },
      {
        label: 'nav.skillCatalogue',
        icon: 'pi pi-bolt',
        routerLink: '/tools/skills',
      },
      {
        label: 'nav.classCatalogue',
        icon: 'pi pi-sitemap',
        routerLink: '/tools/classes',
      },
    ],
  },
  TOOLS,
];

const ROOM_ITEMS: MenuItem[] = [
  { label: 'nav.table', icon: 'pi pi-users', routerLink: '/room/table' },
  {
    label: 'nav.catalogues',
    icon: 'pi pi-book',
    items: CATALOGUES('/room', ['items', 'npcs', 'skills', 'classes']),
  },
  ROOM_TOOLS,
  {
    label: 'nav.roomRules',
    icon: 'pi pi-sliders-h',
    routerLink: '/room/rules',
  },
];

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    ButtonModule,
    MenubarModule,
    AvatarModule,
    TieredMenu,
    HostOfflineIconComponent,
  ],
})
export class NavBarComponent {
  protected readonly profileBusiness = inject(ProfileBusiness);
  private readonly languageBusiness = inject(LanguageBusiness);
  private readonly room = inject(RoomBusiness);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);

  /** In a room (hosting, or joined as a player, even when the host is offline) the bar shows the room's world. */
  protected readonly inRoom = computed(() =>
    ['hosting', 'connected', 'host-offline'].includes(this.room.$status()),
  );

  /** Menu labels are translation keys; translate them for the active language. */
  protected readonly items = computed(() =>
    this.translateItems(this.inRoom() ? ROOM_ITEMS : OUT_OF_ROOM_ITEMS),
  );

  protected readonly profileItems = computed<MenuItem[]>(() => [
    {
      label: this.languageBusiness.t('nav.profile'),
      icon: 'pi pi-user',
      routerLink: '/profile',
    },
    { separator: true },
    this.languageItem(),
  ]);

  protected closeWorld(): void {
    const host = this.room.$isHost();
    this.confirmation.confirm({
      header: this.languageBusiness.t(
        host ? 'nav.closeWorldHostTitle' : 'nav.closeWorldPlayerTitle',
      ),
      message: this.languageBusiness.t(
        host ? 'nav.closeWorldHostMessage' : 'nav.closeWorldPlayerMessage',
      ),
      icon: 'pi pi-sign-out',
      acceptButtonProps: {
        label: this.languageBusiness.t('nav.closeWorld'),
        severity: 'danger',
      },
      rejectButtonProps: {
        label: this.languageBusiness.t('common.cancel'),
        severity: 'secondary',
        text: true,
      },
      accept: async () => {
        this.room.leave();
        await this.router.navigate(['/play']);
      },
    });
  }

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
