import { ClassWordList } from './class-generator';
import { SkillWordList } from './skill-generator';
import { isRecord } from './word-list';

const isList = (value: unknown): boolean =>
  Array.isArray(value) && value.length > 0;

export function isSkillWordList(json: unknown): json is SkillWordList {
  if (
    !isRecord(json) ||
    !isRecord(json['nouns']) ||
    !isRecord(json['descriptions'])
  )
    return false;
  const { nouns, descriptions } = json;
  return (
    isList(json['templates']) &&
    isList(json['adjectives']) &&
    isList(json['suffixes']) &&
    ['active', 'passive'].every(
      (type) =>
        isList((nouns as Record<string, unknown>)[type]) &&
        isList((descriptions as Record<string, unknown>)[type]),
    )
  );
}

export function isClassWordList(json: unknown): json is ClassWordList {
  return (
    isRecord(json) &&
    ['templates', 'nouns', 'adjectives', 'suffixes', 'descriptions'].every(
      (key) => isList(json[key]),
    )
  );
}
