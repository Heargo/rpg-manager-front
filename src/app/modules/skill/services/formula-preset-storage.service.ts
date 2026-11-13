import { Injectable } from '@angular/core';
import { FormulaPreset } from '../models/formula-preset';

const KEY = 'formulaPresets';

/** The formula presets the player saved, in localStorage (on the device, not per world). */
@Injectable({ providedIn: 'root' })
export class FormulaPresetStorageService {
  /** The saved presets; entries that are malformed, repeat an id or claim a built-in id are dropped. */
  load(): FormulaPreset[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      if (!Array.isArray(parsed)) return [];
      const ids = new Set<string>();
      const list: FormulaPreset[] = [];
      for (const p of parsed) {
        if (
          typeof p?.id !== 'string' ||
          p.id.startsWith('builtin-') ||
          ids.has(p.id) ||
          typeof p.name !== 'string' ||
          typeof p.formula !== 'string' ||
          (p.kind !== 'success' && p.kind !== 'effect')
        )
          continue;
        ids.add(p.id);
        list.push({
          id: p.id,
          name: p.name,
          kind: p.kind,
          formula: p.formula,
          description: typeof p.description === 'string' ? p.description : '',
          builtIn: false,
        });
      }
      return list;
    } catch {
      return [];
    }
  }

  save(list: FormulaPreset[]): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* private mode: the presets just last for the session */
    }
  }
}
