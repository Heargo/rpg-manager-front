export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Writes one line in the debug log. `data` is summarised: long strings are cut, so payloads never fill the log. */
export type LogFn = (level: LogLevel, scope: string, message: string, data?: unknown) => void;

export interface DebugLogEntry {
  /** Epoch ms. */
  t: number;
  level: LogLevel;
  scope: string;
  message: string;
  data?: unknown;
}

/** Lines kept on the device (the oldest go first). */
export const DEBUG_LOG_MAX_ENTRIES = 3000;
const MAX_STRING = 300;
const MAX_DEPTH = 4;
const MAX_KEYS = 30;

/** Adds an entry and drops the oldest ones past `max`. Returns a new array. */
export function appendEntry(entries: DebugLogEntry[], entry: DebugLogEntry, max = DEBUG_LOG_MAX_ENTRIES): DebugLogEntry[] {
  const next = [...entries, entry];
  return next.length > max ? next.slice(next.length - max) : next;
}

/** A small, JSON-safe copy of anything: errors become `{ name, message, code }`, long strings and lists are cut. */
export function summarize(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}… (${value.length} chars)` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function' || typeof value === 'symbol') return String(value);
  if (value instanceof Error) {
    const code = (value as { code?: unknown; reason?: unknown }).code ?? (value as { reason?: unknown }).reason;
    return {
      name: value.name,
      message: summarize(value.message),
      ...(code !== undefined ? { code: summarize(code) } : {}),
      ...(value.stack ? { stack: summarize(value.stack.split('\n').slice(0, 4).join(' | ')) } : {}),
    };
  }
  if (depth >= MAX_DEPTH) return '…';
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_KEYS).map((item) => summarize(item, depth + 1));
    return value.length > MAX_KEYS ? [...items, `… (${value.length} items)`] : items;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    const keys = Object.keys(value);
    for (const key of keys.slice(0, MAX_KEYS)) out[key] = summarize((value as Record<string, unknown>)[key], depth + 1);
    if (keys.length > MAX_KEYS) out['…'] = `${keys.length} keys`;
    return out;
  }
  return String(value);
}

/** Parses the stored log; anything unreadable gives an empty log. */
export function parseStoredLog(raw: string | null): DebugLogEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is DebugLogEntry =>
        !!entry && typeof entry === 'object' && typeof entry.t === 'number' && typeof entry.message === 'string',
    );
  } catch {
    return [];
  }
}

/** The exported file: a header of facts about the device, then one line per entry, oldest first. */
export function formatDebugLog(entries: DebugLogEntry[], header: Record<string, unknown>): string {
  const lines = ['# RPG Manager debug log', ...Object.entries(header).map(([key, value]) => `# ${key}: ${formatData(value)}`), ''];
  for (const entry of entries) {
    const data = entry.data === undefined ? '' : ` ${formatData(entry.data)}`;
    lines.push(`${new Date(entry.t).toISOString()} ${entry.level.toUpperCase().padEnd(5)} [${entry.scope}] ${entry.message}${data}`);
  }
  return lines.join('\n') + '\n';
}

function formatData(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
