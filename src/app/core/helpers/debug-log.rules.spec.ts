import { appendEntry, DebugLogEntry, formatDebugLog, parseStoredLog, summarize } from './debug-log.rules';

const entry = (t: number, message = `m${t}`): DebugLogEntry => ({ t, level: 'info', scope: 'test', message });

describe('debug log rules', () => {
  it('keeps only the newest entries', () => {
    let entries: DebugLogEntry[] = [];
    for (let t = 0; t < 5; t++) entries = appendEntry(entries, entry(t), 3);
    expect(entries.map((e) => e.t)).toEqual([2, 3, 4]);
  });

  it('cuts long strings and summarises errors', () => {
    const summary = summarize({ portrait: 'A'.repeat(1000), error: Object.assign(new Error('boom'), { code: 'host-offline' }) }) as {
      portrait: string;
      error: { name: string; message: string; code: string };
    };
    expect(summary.portrait.length).toBeLessThan(350);
    expect(summary.portrait).toContain('1000 chars');
    expect(summary.error).toMatchObject({ name: 'Error', message: 'boom', code: 'host-offline' });
  });

  it('survives cycles and deep objects', () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic['self'] = cyclic;
    expect(() => JSON.stringify(summarize(cyclic))).not.toThrow();
  });

  it('reads back what was stored, and nothing from garbage', () => {
    const entries = [entry(1), entry(2)];
    expect(parseStoredLog(JSON.stringify(entries))).toEqual(entries);
    expect(parseStoredLog('not json')).toEqual([]);
    expect(parseStoredLog(null)).toEqual([]);
    expect(parseStoredLog('[{"nope":true}]')).toEqual([]);
  });

  it('formats a header and one line per entry', () => {
    const text = formatDebugLog([{ t: 0, level: 'warn', scope: 'p2p', message: 'channel closed', data: { peer: 'host' } }], {
      userAgent: 'iPhone',
    });
    expect(text).toContain('# userAgent: iPhone');
    expect(text).toContain('1970-01-01T00:00:00.000Z WARN  [p2p] channel closed {"peer":"host"}');
  });
});
