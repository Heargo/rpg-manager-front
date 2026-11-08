import { Clipboard } from '@angular/cdk/clipboard';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { RoomBusiness } from '../../business/room.business';
import { JoinPageComponent } from './join-page.component';

describe('JoinPageComponent', () => {
  const joinState = signal<'idle' | 'preparing' | 'waiting' | 'connected' | 'failed'>('waiting');
  const failedWhileAway = signal(false);
  const clipboard = { copy: vi.fn(() => true) };
  let share: ReturnType<typeof vi.fn> | undefined;

  async function render() {
    const room = {
      $joinState: joinState.asReadonly(),
      $failedWhileAway: failedWhileAway.asReadonly(),
      join: vi.fn(async () => ({ answerCode: 'ANSWER-123', joined: new Promise(() => undefined) })),
      qrCode: vi.fn(async () => 'data:image/png;base64,AAAA'),
      describeError: vi.fn(() => 'Some error'),
    };
    TestBed.configureTestingModule({
      providers: [
        ...TEST_PROVIDERS,
        { provide: RoomBusiness, useValue: room },
        { provide: Clipboard, useValue: clipboard },
        { provide: ActivatedRoute, useValue: { fragment: of('offer-code') } },
      ],
    });
    const fixture = TestBed.createComponent(JoinPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  const text = (fixture: { nativeElement: HTMLElement }) => fixture.nativeElement.textContent ?? '';
  const sendButton = (fixture: { nativeElement: HTMLElement }) =>
    [...fixture.nativeElement.querySelectorAll('button')].find((b) => b.textContent?.includes('Send to the host'));

  beforeEach(() => {
    joinState.set('waiting');
    failedWhileAway.set(false);
    clipboard.copy.mockClear();
    share = undefined;
  });

  afterEach(() => {
    delete (navigator as { share?: unknown }).share;
  });

  it('shares the answer code with navigator.share, then shows the come-back step', async () => {
    share = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    const fixture = await render();
    expect(text(fixture)).not.toContain('Come back to this page');

    sendButton(fixture)!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(share).toHaveBeenCalledWith({ text: 'ANSWER-123' });
    expect(text(fixture)).toContain('Come back to this page');
    expect((fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement).value).toBe('ANSWER-123');
  });

  it('copies the code when sharing is unavailable, then shows the come-back step', async () => {
    const fixture = await render();

    sendButton(fixture)!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(clipboard.copy).toHaveBeenCalledWith('ANSWER-123');
    expect(text(fixture)).toContain('Come back to this page');
  });

  it('tells the player the connection timed out while they were away', async () => {
    const fixture = await render();

    failedWhileAway.set(true);
    joinState.set('failed');
    fixture.detectChanges();

    expect(text(fixture)).toContain('timed out while you were away');
  });
});
