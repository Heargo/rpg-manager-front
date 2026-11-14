import { pick } from './random';
import { RandomSource } from './random-source';
import { Gender } from './word-list';

const MAX_DEPTH = 5;
const VALUE_NAMES = ['base', 'adjective', 'suffix'] as const;
type ValueName = (typeof VALUE_NAMES)[number];
const PARAM_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export interface PhraseContext {
  /** Entries per param name, for `{name}`. */
  params?: Record<string, readonly string[]>;
  /** Picks the option of `{g:masc|fem}`. Defaults to `m`. */
  gender?: Gender;
  /** Picks the plural option of `{g:…}`. */
  plural?: boolean;
  /** Replacements for `{base}`, `{adjective}` and `{suffix}`. */
  values?: Partial<Record<ValueName, string>>;
}

type Node =
  | { kind: 'text'; text: string }
  | { kind: 'variant'; options: Node[][] }
  | { kind: 'param'; name: string }
  | { kind: 'value'; name: ValueName }
  | { kind: 'gender'; options: string[] };

interface Parsed {
  nodes: Node[];
  errors: string[];
}

function isValueName(name: string): name is ValueName {
  return (VALUE_NAMES as readonly string[]).includes(name);
}

function parse(phrase: string): Parsed {
  const errors: string[] = [];
  let pos = 0;

  /** Parses a sequence up to the end, or (inside a variant) up to `|` or `]`. */
  function sequence(inVariant: boolean): Node[] {
    const nodes: Node[] = [];
    let text = '';
    const flush = () => {
      if (text) nodes.push({ kind: 'text', text });
      text = '';
    };
    while (pos < phrase.length) {
      const char = phrase[pos];
      if (inVariant && (char === '|' || char === ']')) break;
      if (char === '[') {
        flush();
        pos++;
        nodes.push(variant());
      } else if (char === ']') {
        errors.push(`Unopened bracket at ${pos}`);
        pos++;
      } else if (char === '{') {
        flush();
        const end = phrase.indexOf('}', pos);
        if (end < 0) {
          errors.push(`Unclosed brace at ${pos}`);
          pos = phrase.length;
        } else {
          const node = brace(phrase.slice(pos + 1, end));
          if (node) nodes.push(node);
          pos = end + 1;
        }
      } else if (char === '}') {
        errors.push(`Unopened brace at ${pos}`);
        pos++;
      } else {
        text += char;
        pos++;
      }
    }
    flush();
    return nodes;
  }

  function variant(): Node {
    const start = pos - 1;
    const options: Node[][] = [];
    for (;;) {
      options.push(sequence(true));
      if (pos >= phrase.length) {
        errors.push(`Unclosed bracket at ${start}`);
        break;
      }
      const char = phrase[pos++];
      if (char === ']') break;
    }
    if (options.every((option) => option.length === 0))
      errors.push(`Empty variant at ${start}`);
    return { kind: 'variant', options };
  }

  function brace(content: string): Node | undefined {
    const colon = content.indexOf(':');
    if (colon >= 0) {
      const prefix = content.slice(0, colon);
      if (prefix !== 'g') {
        errors.push(`Unknown prefix "${prefix}:"`);
        return undefined;
      }
      const options = content.slice(colon + 1).split('|');
      if (options.length !== 2 && options.length !== 4) {
        errors.push(`{g:...} needs two or four options, got ${options.length}`);
        return undefined;
      }
      return { kind: 'gender', options };
    }
    if (isValueName(content)) return { kind: 'value', name: content };
    if (!PARAM_NAME.test(content)) {
      errors.push(`Bad param name "${content}"`);
      return undefined;
    }
    return { kind: 'param', name: content };
  }

  const nodes = sequence(false);
  return { nodes, errors };
}

function usedParams(nodes: readonly Node[], found: string[]): void {
  for (const node of nodes) {
    if (node.kind === 'param' && !found.includes(node.name))
      found.push(node.name);
    else if (node.kind === 'variant')
      for (const option of node.options) usedParams(option, found);
  }
}

/** Syntax check for pack validation: the errors, and the params the phrase uses (first use order). */
export function checkPhrase(phrase: string): {
  errors: string[];
  params: string[];
} {
  const { nodes, errors } = parse(phrase);
  const params: string[] = [];
  usedParams(nodes, params);
  return { errors, params };
}

/** Expands a phrase, or returns `undefined` when it fails (missing param or value, depth over 5, syntax error). */
export function expandPhrase(
  source: RandomSource,
  phrase: string,
  context: PhraseContext,
): string | undefined {
  const text = expand(source, phrase, context, 0);
  if (text === undefined) return undefined;
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ +([,.])/g, '$1');
}

function expand(
  source: RandomSource,
  phrase: string,
  context: PhraseContext,
  depth: number,
): string | undefined {
  if (depth > MAX_DEPTH) return undefined;
  const { nodes, errors } = parse(phrase);
  if (errors.length > 0) return undefined;
  return render(source, nodes, context, depth);
}

function render(
  source: RandomSource,
  nodes: readonly Node[],
  context: PhraseContext,
  depth: number,
): string | undefined {
  let out = '';
  for (const node of nodes) {
    let part: string | undefined;
    switch (node.kind) {
      case 'text':
        part = node.text;
        break;
      case 'variant':
        part = render(source, pick(source, node.options), context, depth);
        break;
      case 'gender':
        part = genderOption(node.options, context);
        break;
      case 'value':
        part = context.values?.[node.name];
        break;
      case 'param': {
        const entries = context.params?.[node.name];
        part =
          entries && entries.length > 0
            ? expand(source, pick(source, entries), context, depth + 1)
            : undefined;
        break;
      }
    }
    if (part === undefined) return undefined;
    out += part;
  }
  return out;
}

/** The plural of a singular form: an `s`, unless it already ends in `s` or `x`. */
export function pluralForm(text: string): string {
  return /[sx]$/.test(text) ? text : `${text}s`;
}

function genderOption(options: readonly string[], context: PhraseContext): string {
  const feminine = (context.gender ?? 'm') === 'f';
  if (options.length === 4)
    return options[(context.plural ? 2 : 0) + (feminine ? 1 : 0)];
  const form = feminine ? options[1] : options[0];
  return context.plural ? pluralForm(form) : form;
}
