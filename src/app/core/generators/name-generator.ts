import { Adjective, Gender } from './word-list';

export function adjectiveForm(adjective: Adjective, gender: Gender): string {
  return typeof adjective === 'string' ? adjective : adjective[gender];
}

export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}
