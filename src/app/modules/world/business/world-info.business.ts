import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { WorldInfo } from '../models/world';
import { WorldService } from '../services/world.service';

/** The world of the room this device is in (host or player), as published by the host. */
@Injectable({ providedIn: 'root' })
export class WorldInfoBusiness {
  private readonly service = inject(WorldService);

  readonly $info = toSignal<WorldInfo | null>(this.service.watchInfo(), { initialValue: null });
}
