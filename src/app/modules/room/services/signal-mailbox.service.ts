import { Injectable } from '@angular/core';
import {
  MailboxMessage,
  MailboxSide,
} from '../../../core/p2p/helpers/mailbox-handler';

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

  async delete(box: string): Promise<void> {
    await this.call('DELETE', box);
  }

  private async call(
    method: string,
    box: string,
    from?: MailboxSide,
    body?: MailboxMessage,
  ): Promise<Response> {
    const query = new URLSearchParams({ box, ...(from ? { from } : {}) });
    const response = await fetch(`${ENDPOINT}?${query}`, {
      method,
      cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok)
      throw new Error(`Mailbox ${method} failed (${response.status})`);
    return response;
  }
}
