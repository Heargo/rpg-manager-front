import { inject, Injectable } from '@angular/core';
import { SpriteSet } from '../models/sprite-set';
import { SpriteSetStorageService } from '../services/sprite-set-storage.service';

/** The sprite sets saved on this device, for the other features that reuse them. */
@Injectable({ providedIn: 'root' })
export class SpriteSetBusiness {
  private readonly storage = inject(SpriteSetStorageService);

  /** Every saved set, the latest changed first. */
  list(): Promise<SpriteSet[]> {
    return this.storage.list();
  }
}
