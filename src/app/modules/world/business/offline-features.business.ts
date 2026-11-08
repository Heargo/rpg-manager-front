import { computed, inject, Injectable } from '@angular/core';
import { OfflineFeatures } from '../models/world';
import { WorldSessionBusiness } from './world-session.business';

/** Host: what players can still do while the host is offline. Saved on the world and published with its info. */
@Injectable({ providedIn: 'root' })
export class OfflineFeaturesBusiness {
  private readonly session = inject(WorldSessionBusiness);

  /** null while no world is open. */
  readonly $features = computed(
    () => this.session.$world()?.offlineFeatures ?? null,
  );

  async set(features: OfflineFeatures): Promise<void> {
    await this.session.update((world) => ({
      ...world,
      offlineFeatures: { ...features },
    }));
  }
}
