import { Adjective } from '../../../../core/generators/word-list';

/** The forms typed for a new adjective: masculine, feminine, plurals, and for a kind adjective its tint. */
export interface AdjectiveForms {
  m: string;
  f: string;
  mp: string;
  fp: string;
  tint: string;
}

export const EMPTY_FORMS: AdjectiveForms = {
  m: '',
  f: '',
  mp: '',
  fp: '',
  tint: '',
};

/** A plain text, a gendered adjective, or a text tied to a tint, from the typed forms; nothing without a masculine form. */
export function adjectiveOf(forms: AdjectiveForms): Adjective | undefined {
  const m = forms.m.trim();
  const f = forms.f.trim();
  const mp = forms.mp.trim();
  const fp = forms.fp.trim();
  const tint = forms.tint.trim();
  if (!m) return undefined;
  if (f)
    return {
      m,
      f,
      ...(mp ? { mp } : {}),
      ...(fp ? { fp } : {}),
      ...(tint ? { tint } : {}),
    } as Adjective;
  return tint ? ({ text: m, tint } as unknown as Adjective) : m;
}

/** A short line for a stored adjective or suffix. */
export function wordLine(word: unknown): string {
  if (typeof word === 'string') return word;
  const w = word as Record<string, string | undefined>;
  const text =
    w['text'] ?? [w['m'], w['f'], w['mp'], w['fp']].filter(Boolean).join('|');
  return w['tint'] ? `${text} [${w['tint']}]` : text;
}

/** The text of a suffix, tied to a tint when one is given. */
export function suffixOf(
  text: string,
  tint = '',
): string | { text: string; tint: string } | undefined {
  const t = text.trim();
  if (!t) return undefined;
  return tint.trim() ? { text: t, tint: tint.trim() } : t;
}
