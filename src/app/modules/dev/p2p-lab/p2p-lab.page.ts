import { ChangeDetectionStrategy, Component, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { HOST_PEER, PeerId } from '../../../core/p2p/room-transport';
import { WebRtcTransport } from '../../../core/p2p/webrtc-transport';

/**
 * TEMPORARY dev-only lab to test the manual WebRTC handshake between two tabs or devices (p2p ticket 02).
 * Breaks the layering on purpose (uses the transport directly) and isn't translated. Delete it in p2p ticket 04.
 */
@Component({
  selector: 'app-p2p-lab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, TextareaModule, InputTextModule],
  template: `
    <div class="main-container lab">
      <h1>P2P lab (dev only)</h1>
      <div class="columns">
        <section>
          <h2>Host</h2>
          <p-button label="Create invite" (onClick)="createInvite()" [loading]="busy()" />
          @for (invite of invites(); track invite.id) {
            <div class="invite">
              <small>Invite {{ invite.id.slice(0, 8) }} · code {{ invite.offerCode.length }} chars</small>
              <textarea pTextarea readonly rows="3" [value]="link(invite.offerCode)"></textarea>
              <input pInputText placeholder="Paste answer code" [(ngModel)]="invite.answer" />
              <p-button label="Accept" size="small" (onClick)="accept(invite)" />
            </div>
          }
        </section>
        <section>
          <h2>Player</h2>
          <textarea pTextarea rows="3" placeholder="Paste invite link or code" [(ngModel)]="offerInput"></textarea>
          <p-button label="Answer" (onClick)="answer()" [loading]="busy()" />
          @if (answerCode()) {
            <small>Answer code · {{ answerCode().length }} chars</small>
            <textarea pTextarea readonly rows="3" [value]="answerCode()"></textarea>
          }
        </section>
      </div>
      <section>
        <h2>Messages · peers: {{ peers().join(', ') || 'none' }}</h2>
        <div class="send">
          <input pInputText placeholder="Message" [(ngModel)]="message" (keyup.enter)="send()" />
          <p-button label="Send" (onClick)="send()" />
        </div>
        <ul>
          @for (line of log(); track $index) {
            <li>{{ line }}</li>
          }
        </ul>
      </section>
    </div>
  `,
  styles: `
    .lab { display: flex; flex-direction: column; gap: 1rem; }
    .columns { display: grid; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); gap: 1rem; }
    section, .invite { display: flex; flex-direction: column; gap: 0.5rem; }
    .invite { border: 1px solid var(--p-content-border-color); padding: 0.5rem; border-radius: 6px; }
    textarea { width: 100%; font-family: monospace; font-size: 0.75rem; }
    .send { display: flex; gap: 0.5rem; }
    ul { font-family: monospace; font-size: 0.8rem; }
  `,
})
export class P2pLabPage implements OnDestroy {
  private readonly transport = new WebRtcTransport();

  protected readonly busy = signal(false);
  protected readonly invites = signal<{ id: string; offerCode: string; answer: string }[]>([]);
  protected readonly peers = signal<PeerId[]>([]);
  protected readonly answerCode = signal('');
  protected readonly log = signal<string[]>([]);
  protected offerInput = location.hash.length > 1 ? location.hash.slice(1) : '';
  protected message = '';

  constructor() {
    this.transport.messages$.subscribe(({ from, data }) => this.write(`← ${from.slice(0, 8)}: ${data}`));
    this.transport.peerJoined$.subscribe((peer) => {
      this.peers.update((peers) => [...peers, peer]);
      this.write(`joined: ${peer.slice(0, 8)}`);
    });
    this.transport.peerLeft$.subscribe((peer) => {
      this.peers.update((peers) => peers.filter((p) => p !== peer));
      this.write(`left: ${peer.slice(0, 8)}`);
    });
  }

  protected link(code: string): string {
    return `${location.origin}/dev/p2p#${code}`;
  }

  protected async createInvite(): Promise<void> {
    await this.run(async () => {
      const started = performance.now();
      const invite = await this.transport.createInvite();
      this.invites.update((invites) => [...invites, { ...invite, answer: '' }]);
      this.write(`invite ready in ${Math.round(performance.now() - started)} ms, ${invite.offerCode.length} chars`);
    });
  }

  protected async accept(invite: { id: string; answer: string }): Promise<void> {
    await this.run(async () => {
      await this.transport.acceptAnswer(invite.id, invite.answer);
      this.invites.update((invites) => invites.filter((i) => i.id !== invite.id));
    });
  }

  protected async answer(): Promise<void> {
    await this.run(async () => {
      const { answerCode, connected } = await this.transport.answerInvite(this.offerInput);
      this.answerCode.set(answerCode);
      this.write(`answer ready, ${answerCode.length} chars`);
      connected.then(
        () => this.write('connected to host'),
        (error) => this.write(`connection failed: ${error.message}`),
      );
    });
  }

  protected send(): void {
    if (!this.message) return;
    try {
      if (this.peers().includes(HOST_PEER)) this.transport.send(HOST_PEER, this.message);
      else this.transport.broadcast(this.message);
      this.write(`→ ${this.message}`);
      this.message = '';
    } catch (error) {
      this.write(`send failed: ${(error as Error).message}`);
    }
  }

  ngOnDestroy(): void {
    this.transport.close();
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await action();
    } catch (error) {
      this.write(`error: ${(error as Error).message}`);
    } finally {
      this.busy.set(false);
    }
  }

  private write(line: string): void {
    this.log.update((log) => [`${new Date().toLocaleTimeString()} ${line}`, ...log]);
  }
}
