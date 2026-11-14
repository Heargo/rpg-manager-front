import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IDBFactory } from 'fake-indexeddb';
import baseEnCommon from '../../public/packs/base-en/generators/common.json';
import baseEnItems from '../../public/packs/base-en/generators/items.json';
import { PackDraft } from '../app/core/packs/pack-draft';
import { provideBasePack } from './base-pack';
import { TEST_PROVIDERS } from './test-providers';

export const GRADIENT = [
  { position: 0, color: '#5a0a0a' },
  { position: 1, color: '#fde047' },
];

export function draftOf(over: Record<string, unknown> = {}, ...rest: [language?: string]): PackDraft {
  /** No second argument: English; an explicit `undefined`: a neutral draft. */
  const language = rest.length ? rest[0] : 'en';
  return {
    id: 'draft-1',
    updatedAt: 1000,
    details: {
      id: 'mine',
      language,
      name: 'Mine',
      description: 'My pack',
      version: '1.0.0',
      author: 'Ann Author',
      license: 'CC-BY-4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    },
    generators: {},
    kinds: {},
    tints: {},
    sprites: [],
    ...over,
  } as unknown as PackDraft;
}

/**
 * Renders a pack draft child editor (`draft` input, `changed` output, optional `issues` input). Every emitted draft is fed
 * back as the new `draft`, like the page container does; `last()` is the latest one emitted.
 */
export async function renderEditor(component: Type<unknown>, draft: PackDraft, issues: unknown[] = []) {
  globalThis.indexedDB = new IDBFactory();
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      ...TEST_PROVIDERS,
      provideBasePack({
        'packs/base-en/generators/items.json': baseEnItems,
        'packs/base-en/generators/common.json': baseEnCommon,
      }),
    ],
  });
  const fixture = TestBed.createComponent(component as Type<any>);
  const emitted: PackDraft[] = [];
  fixture.componentRef.setInput('draft', draft);
  fixture.componentRef.setInput('issues', issues);
  fixture.componentInstance.changed.subscribe((next: PackDraft) => {
    emitted.push(next);
    fixture.componentRef.setInput('draft', next);
  });
  const el = fixture.nativeElement as HTMLElement;
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  await settle();
  const $ = (selector: string) => el.querySelector<HTMLElement>(`[data-test="${selector}"]`);
  const $$ = (selector: string) => [...el.querySelectorAll<HTMLElement>(`[data-test="${selector}"]`)];
  const field = (selector: string) => {
    const host = $(selector);
    if (!host) throw new Error(`no [data-test="${selector}"]`);
    return host instanceof HTMLInputElement || host instanceof HTMLTextAreaElement
      ? host
      : host.querySelector<HTMLInputElement>('input, textarea')!;
  };
  return {
    fixture,
    el,
    $,
    $$,
    emitted,
    last: () => emitted[emitted.length - 1],
    async click(selector: string) {
      const host = $(selector);
      if (!host) throw new Error(`no [data-test="${selector}"]`);
      (host instanceof HTMLButtonElement ? host : (host.querySelector('button') ?? host)).click();
      await settle();
    },
    async type(selector: string, value: string) {
      const input = field(selector);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('blur'));
      await settle();
    },
  };
}
