import { Injectable } from '@angular/core';
import { SpritePreset } from '../models/sprite';

const KEY = 'spritePresets';

/** The gradient presets the player saved, in localStorage. */
@Injectable({ providedIn: 'root' })
export class SpritePresetStorageService {
  load(): SpritePreset[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      return Array.isArray(parsed)
        ? parsed.filter(
            (p) =>
              typeof p?.id === 'string' &&
              typeof p.name === 'string' &&
              Array.isArray(p.stops),
          )
        : [];
    } catch {
      return [];
    }
  }

  save(list: SpritePreset[]): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* private mode: the presets just last for the session */
    }
  }
}
