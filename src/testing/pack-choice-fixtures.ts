import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { DebugElement } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { NgModel } from '@angular/forms';
import enItems from '../../public/packs/base-en/generators/items.json';
import frItems from '../../public/packs/base-fr/generators/items.json';
import enNpcs from '../../public/packs/base-en/generators/npcs.json';
import frNpcs from '../../public/packs/base-fr/generators/npcs.json';
import { baseManifest } from './base-pack';
import { EXTRA_ITEMS, EXTRA_MANIFEST, EXTRA_NPCS, extraPackService, provideExtraPack } from './extra-pack';

/**
 * `PackService` fake for the generator components: real Base word lists (items and NPC names, `base-en` and `base-fr`) and
 * the French `extra` pack, whose items are all "Zircon" and NPCs all "Zorg".
 */
export function packChoiceProviders() {
  globalThis.indexedDB = new IDBFactory();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  const files: Record<string, unknown> = {
    'packs/base-en/generators/items.json': enItems,
    'packs/base-fr/generators/items.json': frItems,
    'packs/base-en/generators/npcs.json': enNpcs,
    'packs/base-fr/generators/npcs.json': frNpcs,
    'packs/extra/generators/items.json': EXTRA_ITEMS,
    'packs/extra/generators/npcs.json': EXTRA_NPCS,
  };
  const fake = extraPackService();
  fake.loadJson = vi.fn(async (url: string) => (url in files ? files[url] : { url }));
  fake.loadManifest = vi.fn(async (id: string) =>
    id === 'extra'
      ? {
          ...structuredClone(EXTRA_MANIFEST),
          generators: { items: 'generators/items.json', npcs: 'generators/npcs.json' },
        }
      : baseManifest(id),
  );
  return provideExtraPack(fake);
}

/** The values of the options of the `p-select[data-field="pack"]` of a fixture, in order. */
export function packOptionValues(fixture: ComponentFixture<unknown>): string[] {
  const select = packSelect(fixture);
  const options = select.componentInstance.options;
  const list = (typeof options === 'function' ? options() : options) as Array<string | { value: string }>;
  return list.map((o) => (typeof o === 'string' ? o : o.value));
}

/** The value currently bound to the pack select. */
export function packSelected(fixture: ComponentFixture<unknown>): unknown {
  return packSelect(fixture).injector.get(NgModel).model;
}

export function packSelect(fixture: ComponentFixture<unknown>): DebugElement {
  const target = fixture.nativeElement.querySelector('p-select[data-field="pack"]');
  expect(target).not.toBeNull();
  return fixture.debugElement.query((d) => d.nativeElement === target);
}
