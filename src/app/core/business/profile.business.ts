import { computed, inject, Injectable, signal } from '@angular/core';
import { LanguageBusiness } from './language.business';
import {
  defaultProfileName,
  isValidProfileName,
  normalizeProfileName,
  parseStoredProfile,
} from '../helpers/profile.rules';
import { Profile } from '../models/profile';
import { ProfileStorageService } from '../services/profile-storage.service';

@Injectable({ providedIn: 'root' })
export class ProfileBusiness {
  private readonly storage = inject(ProfileStorageService);
  private readonly languageBusiness = inject(LanguageBusiness);

  private readonly profile = signal<Profile>(this.loadOrCreate());

  readonly $profile = this.profile.asReadonly();
  readonly $initial = computed(() => this.profile().name.charAt(0).toUpperCase());

  /** Saves a new name. Returns false if the name is empty once normalized. */
  rename(name: string): boolean {
    if (!isValidProfileName(name)) return false;
    const updated: Profile = { ...this.profile(), name: normalizeProfileName(name) };
    this.profile.set(updated);
    this.storage.write(JSON.stringify(updated));
    return true;
  }

  private loadOrCreate(): Profile {
    const stored = parseStoredProfile(this.storage.read());
    if (stored) return stored;
    const playerId = this.storage.newPlayerId();
    const translated = this.languageBusiness.t('profile.defaultName');
    // If translations aren't loaded yet, t() returns the key: never save that as a name.
    const prefix = translated === 'profile.defaultName' ? 'Adventurer' : translated;
    const created: Profile = { playerId, name: defaultProfileName(prefix, playerId) };
    this.storage.write(JSON.stringify(created));
    return created;
  }
}
