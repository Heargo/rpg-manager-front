import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PeerApi, PeerHandler } from '../../../core/p2p/peer-api.service';
import { Character } from '../../world/models/world';
import { CHARACTER_ROUTES, CHARACTER_TOPICS, CreateCharacterRequest } from '../models/character-api';

/** Character calls over PeerApi. */
@Injectable({ providedIn: 'root' })
export class CharacterService {
  private readonly api = inject(PeerApi);

  create(request: CreateCharacterRequest): Promise<Character> {
    return this.api.request(CHARACTER_ROUTES.create, request, 30_000);
  }

  /** null until the host sends it, and again after leaving. */
  watchCharacters(): Observable<Character[] | null> {
    return this.api.watchCurrent(CHARACTER_TOPICS.list);
  }

  serveCreate(handler: PeerHandler<unknown, Character>): () => void {
    return this.api.serve(CHARACTER_ROUTES.create, handler);
  }

  publishCharacters(characters: Character[]): void {
    this.api.publish(CHARACTER_TOPICS.list, characters);
  }
}
