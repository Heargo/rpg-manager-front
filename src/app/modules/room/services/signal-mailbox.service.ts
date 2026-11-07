import { Injectable } from '@angular/core';
import {
  MailboxMessage,
  MailboxSide,
  MAILBOX_EXPIRED_STATUS,
  MAILBOX_USED_STATUS,
  MailboxGoneReason,
} from '../../../core/p2p/helpers/mailbox-handler';
import { TransportError } from '../../../core/p2p/room-transport';

const ENDPOINT = '/.netlify/functions/signal';
const TIMEOUT_MS = 5000;

/** Client of the signalling mailbox function (docs/adr/0004-signal-mailbox.md). Every failure rejects. */
@Injectable({ providedIn: 'root' })
export class SignalMailboxService {
  /** Leaves the message for the other side. */
  async put(
    box: string,
    from: MailboxSide,
    message: MailboxMessage,
  ): Promise<void> {
    await this.call('PUT', box, from, message);
  }

  /** The other side's latest message, or null when there is none. */
  async get(box: string, from: MailboxSide): Promise<MailboxMessage | null> {
    const response = await this.call('GET', box, from);
    return response.status === 204
      ? null
      : ((await response.json()) as MailboxMessage);
  }

  /** Closes the box; the reason lets a player opening the link later know why it is gone. */
  async delete(box: string, reason?: MailboxGoneReason): Promise<void> {
    await this.call('DELETE', box, undefined, undefined, reason);
  }

  private async call(
    method: string,
    box: string,
    from?: MailboxSide,
    body?: MailboxMessage,
    reason?: MailboxGoneReason,
  ): Promise<Response> {
    const query = new URLSearchParams({ box, ...(from ? { from } : {}), ...(reason ? { reason } : {}) });
    const response = await fetch(`${ENDPOINT}?${query}`, {
      method,
      cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status === MAILBOX_USED_STATUS) throw new TransportError('invite-used');
    if (response.status === MAILBOX_EXPIRED_STATUS) throw new TransportError('invite-expired');
    if (!response.ok)
      throw new Error(`Mailbox ${method} failed (${response.status})`);
    return response;
  }
}
