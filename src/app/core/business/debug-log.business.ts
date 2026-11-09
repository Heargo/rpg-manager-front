import { inject, Injectable, Injector, signal } from '@angular/core';
import { DebugLogService } from '../services/debug-log.service';
import { LanguageBusiness } from './language.business';
import { ProfileBusiness } from './profile.business';

/** The debug log a player exports from their profile when something went wrong, to send it to whoever debugs the app. */
@Injectable({ providedIn: 'root' })
export class DebugLogBusiness {
  private readonly service = inject(DebugLogService);
  /** Read lazily: this business starts before the translations, and the profile's default name needs them. */
  private readonly injector = inject(Injector);
  private readonly language = inject(LanguageBusiness);
  private readonly count = signal(this.service.all().length);

  /** Lines in the log when the profile page opened, or after the last export or clear. */
  readonly $count = this.count.asReadonly();

  /** Starts recording console errors and page events; called once at startup. */
  start(): void {
    this.service.installGlobalHooks();
  }

  refresh(): void {
    this.count.set(this.service.all().length);
  }

  /** Shares or downloads the log as a text file. */
  async export(): Promise<'shared' | 'downloaded' | 'cancelled'> {
    const now = new Date();
    const { name, playerId } = this.injector.get(ProfileBusiness).$profile();
    const header = {
      exportedAt: now.toISOString(),
      player: `${name} (${playerId})`,
      language: this.language.$language(),
      userAgent: globalThis.navigator?.userAgent,
      standalone: globalThis.matchMedia?.('(display-mode: standalone)').matches ?? false,
      online: globalThis.navigator?.onLine,
      screen: globalThis.screen ? `${screen.width}x${screen.height}@${globalThis.devicePixelRatio ?? 1}` : undefined,
      lines: this.service.all().length,
    };
    const stamp = now.toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
    const safeName = name.normalize('NFD').replace(/[^\w-]+/g, '').slice(0, 20) || 'player';
    const result = await this.service.exportFile(this.service.toText(header), `rpg-manager-log-${safeName}-${stamp}.txt`);
    this.refresh();
    return result;
  }

  clear(): void {
    this.service.clear();
    this.refresh();
  }
}
