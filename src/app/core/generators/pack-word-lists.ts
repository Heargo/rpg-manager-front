import { ClassWordList } from './class-generator';
import { isRecord } from './word-list';

const isList = (value: unknown): boolean =>
  Array.isArray(value) && value.length > 0;

export function isClassWordList(json: unknown): json is ClassWordList {
  return (
    isRecord(json) &&
    ['templates', 'nouns', 'adjectives', 'suffixes', 'descriptions'].every(
      (key) => isList(json[key]),
    )
  );
}
