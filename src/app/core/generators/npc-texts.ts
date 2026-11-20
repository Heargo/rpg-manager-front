import { adjectiveForm, capitalize } from './name-generator';
import { NpcVocabulary } from './npc-vocabulary';
import { expandPhrase } from './phrase';
import { pick } from './random';
import { RandomSource } from './random-source';
import { Gender, Noun } from './word-list';

type Values = Partial<
  Record<'given' | 'epithet' | 'noun' | 'adjective', string>
>;

/** A name and a description for an NPC of this kind: a person from a given name, a creature from its noun. */
export function drawNpcTexts(
  random: RandomSource,
  vocabulary: NpcVocabulary,
  kindId: string,
): { name: string; description: string } {
  const person = vocabulary.kind(kindId)?.person ?? true;
  const params = vocabulary.params;
  const nouns = vocabulary.nouns(kindId);
  const adjectives = vocabulary.adjectives(kindId);
  const epithets = vocabulary.epithets();
  const gender = (noun: Noun | undefined): Gender => noun?.gender ?? 'm';

  const givenName = person ? pick(random, vocabulary.given()) : undefined;
  const sameGender = nouns.filter((n) => gender(n) === givenName?.gender);
  const noun =
    nouns.length === 0
      ? undefined
      : pick(random, person && sameGender.length ? sameGender : nouns);
  const speaker: Gender = givenName?.gender ?? gender(noun);
  const kindWord = vocabulary.refs.resolver(random, speaker, false);

  const usable = (template: string): boolean =>
    (nouns.length > 0 || !template.includes('{noun}')) &&
    (adjectives.length > 0 || !template.includes('{adjective}')) &&
    (epithets.length > 0 || !template.includes('{epithet}')) &&
    (!!givenName || !template.includes('{given}')) &&
    vocabulary.refs.usable(template, params);
  const fromKind = vocabulary.names(kindId).filter(usable);
  const fallback = person ? vocabulary.templates().filter(usable) : [];
  const templates = fromKind.length > 0 ? fromKind : fallback;
  const template =
    templates.length > 0
      ? pick(random, templates)
      : person
        ? '{given}'
        : '{noun}';

  const values: Values = {};
  if (givenName) values.given = capitalize(givenName.text);
  if (noun) values.noun = noun.text;
  if (template.includes('{epithet}'))
    values.epithet = adjectiveForm(pick(random, epithets), speaker);
  if (template.includes('{adjective}'))
    values.adjective = adjectiveForm(pick(random, adjectives), speaker);

  const context = {
    params,
    gender: speaker,
    values,
    kindWord,
  };
  const name =
    expandPhrase(random, template, context) ??
    values.given ??
    values.noun ??
    '';
  let description = '';
  const descriptions = vocabulary.descriptions(kindId);
  if (descriptions.length > 0)
    description =
      expandPhrase(random, pick(random, descriptions), context) ?? '';
  return { name: capitalize(name), description };
}
