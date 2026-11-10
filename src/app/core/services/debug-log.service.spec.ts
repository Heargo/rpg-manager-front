import { TestBed } from '@angular/core/testing';
import { DebugLogService } from './debug-log.service';

describe('DebugLogService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => vi.useRealTimers());

  const fresh = () => {
    TestBed.resetTestingModule();
    return TestBed.inject(DebugLogService);
  };

  it('keeps the log on the device, so it survives a reload', () => {
    const log = fresh();
    log.log('warn', 'webrtc', 'Peer left', { peer: 'host', reason: 'channel closed' });
    vi.advanceTimersByTime(5000);

    const afterReload = fresh();
    const messages = afterReload.all().map((entry) => entry.message);
    expect(messages).toContain('Peer left');
    expect(messages.filter((message) => message === 'Session start').length).toBe(2);
  });

  it('cuts big payloads instead of storing them', () => {
    const log = fresh();
    log.log('debug', 'peer-api', 'Request', { portrait: 'A'.repeat(100_000) });
    expect(JSON.stringify(log.all()).length).toBeLessThan(2000);
  });

  it('clears everything', () => {
    const log = fresh();
    log.log('info', 'test', 'something');
    log.clear();
    expect(log.all()).toEqual([]);
    expect(fresh().all().map((entry) => entry.message)).toEqual(['Session start']);
  });

  it('exports a header and the lines', () => {
    const log = fresh();
    log.log('error', 'peer-api', 'Request failed', { route: 'character/create' });
    const text = log.toText({ userAgent: 'iPhone' });
    expect(text).toContain('# userAgent: iPhone');
    expect(text).toMatch(/ERROR \[peer-api\] Request failed \{"route":"character\/create"\}/);
  });
});
