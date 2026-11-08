import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PeerApi, PeerHandler } from '../../../core/p2p/peer-api.service';
import { Character } from '../../world/models/world';
import { CHARACTER_TOPICS } from '../models/character-api';
import {
  PLAYER_COPY_ROUTES,
  PLAYER_COPY_TOPICS,
  PlayerCopyHello,
  PlayerCopyHelloAnswer,
  PlayerCopySubmit,
} from '../models/player-copy';

/** Player copy calls over PeerApi. */
@Injectable({ providedIn: 'root' })
export class PlayerCopyService {
  private readonly api = inject(PeerApi);

  hello(hello: PlayerCopyHello): Promise<PlayerCopyHelloAnswer> {
    return this.api.request(PLAYER_COPY_ROUTES.hello, hello, 30_000);
  }

  submit(submit: PlayerCopySubmit): Promise<void> {
    return this.api.request(PLAYER_COPY_ROUTES.submit, submit, 30_000);
  }

  /** The player's own notes, as the host has them. */
  notes(): Promise<{ notes?: string }> {
    return this.api.request(PLAYER_COPY_ROUTES.notes, {});
  }

  /** null until the host sends the characters, and again after leaving. */
  watchCharacters(): Observable<Character[] | null> {
    return this.api.watchCurrent(CHARACTER_TOPICS.list);
  }

  /** Ids of the players waiting for a pick; null until the host sends it. */
  watchReadOnly(): Observable<string[] | null> {
    return this.api.watchCurrent(PLAYER_COPY_TOPICS.readOnly);
  }

  serveHello(handler: PeerHandler<unknown, PlayerCopyHelloAnswer>): () => void {
    return this.api.serve(PLAYER_COPY_ROUTES.hello, handler);
  }

  serveSubmit(handler: PeerHandler<unknown, void>): () => void {
    return this.api.serve(PLAYER_COPY_ROUTES.submit, handler);
  }

  serveNotes(handler: PeerHandler<unknown, { notes?: string }>): () => void {
    return this.api.serve(PLAYER_COPY_ROUTES.notes, handler);
  }

  publishReadOnly(playerIds: string[]): void {
    this.api.publish(PLAYER_COPY_TOPICS.readOnly, playerIds);
  }
}
