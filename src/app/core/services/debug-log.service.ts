import { Injectable } from '@angular/core';
import { appendEntry, DebugLogEntry, formatDebugLog, LogLevel, parseStoredLog, summarize } from '../helpers/debug-log.rules';

const STORAGE_KEY = 'debug-log';
const SAVE_DELAY_MS = 2000;

/**
 * The device's debug log: kept in memory and in localStorage (so it survives a reload or iOS killing the page), and
 * exported as a text file from the profile. Low level on purpose: `PeerApi` and the WebRTC transport write to it.
 */
@Injectable({ providedIn: 'root' })
export class DebugLogService {
  private entries: DebugLogEntry[] = parseStoredLog(read());
  private saveTimer?: ReturnType<typeof setTimeout>;
  private hooked = false;

  constructor() {
    this.log('info', 'app', 'Session start', { url: globalThis.location?.pathname });
  }

  log(level: LogLevel, scope: string, message: string, data?: unknown): void {
    const entry: DebugLogEntry = { t: Date.now(), level, scope, message };
    if (data !== undefined) entry.data = summarize(data);
    this.entries = appendEntry(this.entries, entry);
    this.scheduleSave();
  }

  /** Every entry, oldest first. */
  all(): readonly DebugLogEntry[] {
    return this.entries;
  }

  clear(): void {
    this.entries = [];
    this.save();
  }

  /** Copies `console.error` / `console.warn` into the log and records page life events (background, network). Once. */
  installGlobalHooks(): void {
    if (this.hooked) return;
    this.hooked = true;
    for (const level of ['error', 'warn'] as const) {
      const original = console[level].bind(console);
      console[level] = (...args: unknown[]) => {
        try {
          const [first, ...rest] = args;
          const message = typeof first === 'string' ? first : 'console';
          const data = typeof first === 'string' ? rest : args;
          this.log(level, 'console', message, data.length === 1 ? data[0] : data.length ? data : undefined);
        } catch {
          // Logging must never break the app.
        }
        original(...args);
      };
    }
    const on = (target: EventTarget | undefined, event: string, handler: () => void) => target?.addEventListener(event, handler);
    on(globalThis.document, 'visibilitychange', () => {
      this.log('info', 'page', `Visibility: ${document.visibilityState}`);
      // iOS may kill a hidden page without warning: write the log now.
      if (document.visibilityState === 'hidden') this.save();
    });
    on(globalThis.window, 'pagehide', () => {
      this.log('info', 'page', 'Page hide');
      this.save();
    });
    on(globalThis.window, 'pageshow', () => this.log('info', 'page', 'Page show'));
    on(globalThis.window, 'online', () => this.log('info', 'page', 'Network online'));
    on(globalThis.window, 'offline', () => this.log('warn', 'page', 'Network offline'));
    on(globalThis.window, 'unhandledrejection', () => this.save());
    on(globalThis.window, 'error', () => this.save());
  }

  /** The log as text, after a header of facts about the device. */
  toText(header: Record<string, unknown>): string {
    return formatDebugLog(this.entries, header);
  }

  /**
   * Hands the text over as a file: the share sheet on phones (mail, messaging…), a download elsewhere.
   * Resolves with how it went; `cancelled` when the player closed the share sheet.
   */
  async exportFile(text: string, fileName: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
    const file = new File([text], fileName, { type: 'text/plain' });
    const touch = globalThis.matchMedia?.('(pointer: coarse)').matches ?? false;
    if (touch && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: fileName });
        return 'shared';
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return 'cancelled';
        // Share refused (no user gesture left, unsupported type…): download instead.
      }
    }
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return 'downloaded';
  }

  private scheduleSave(): void {
    if (this.saveTimer !== undefined) return;
    this.saveTimer = setTimeout(() => this.save(), SAVE_DELAY_MS);
  }

  private save(): void {
    clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
    // Too big for the quota: keep the newest half and try again.
    for (let entries = this.entries; ; entries = entries.slice(Math.floor(entries.length / 2))) {
      if (write(JSON.stringify(entries)) || entries.length < 10) return;
    }
  }
}

function read(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function write(value: string): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, value);
    return true;
  } catch {
    return false;
  }
}
