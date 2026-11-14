import { NpcNameList } from './npc-name-list';
import { pick } from './random';
import { RandomSource } from './random-source';
import { Adjective, Gender } from './word-list';

/** Builds a person's name: a template, a given name, and an epithet agreeing with the given name's gender. */
export function generateNpcName(source: RandomSource, names: NpcNameList): string {
  const template = pick(source, names.templates);
  const given = pick(source, names.given);
  const name = template
    .replace('{given}', capitalize(given.text))
    .replace('{epithet}', () => adjectiveForm(pick(source, names.epithets), given.gender));
  return capitalize(name.replace(/\s+/g, ' ').trim());
}

export function adjectiveForm(adjective: Adjective, gender: Gender): string {
  return typeof adjective === 'string' ? adjective : adjective[gender];
}

export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}
