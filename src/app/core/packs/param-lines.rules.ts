import { checkPhrase } from '../generators/phrase';

/** One problem found on a line of a param's textarea. */
export interface ParamLineProblem {
  /** 1-based, counted on the raw text. */
  line: number;
  /** `syntax` is a `checkPhrase` error; `unknown-param` is a `{param}` that is not defined (yet). */
  kind: 'syntax' | 'unknown-param';
  param?: string;
}

/**
 * The problems of each line of a param's textarea. A syntax error blocks Save; an unknown param does not (it may be added
 * next). A line with a syntax error reports nothing else.
 */
export function checkParamLines(
  text: string,
  knownParams: readonly string[],
): { problems: ParamLineProblem[]; blocksSave: boolean } {
  const problems: ParamLineProblem[] = [];
  text.split('\n').forEach((raw, index) => {
    const phrase = raw.trim();
    if (!phrase) return;
    const line = index + 1;
    const { errors, params } = checkPhrase(phrase);
    if (errors.length > 0) {
      problems.push({ line, kind: 'syntax' });
      return;
    }
    for (const param of params)
      if (!knownParams.includes(param))
        problems.push({ line, kind: 'unknown-param', param });
  });
  return { problems, blocksSave: problems.some((p) => p.kind === 'syntax') };
}
