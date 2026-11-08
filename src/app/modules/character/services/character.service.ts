import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PeerApi, PeerHandler } from '../../../core/p2p/peer-api.service';
import { Character } from '../../world/models/world';
import {
  CharacterAction,
  CharacterActionKind,
} from '../helpers/character-actions.rules';
import {
  CHARACTER_ROUTES,
  ClassView,
  CHARACTER_TOPICS,
  characterActionRoute,
  CreateCharacterRequest,
} from '../models/character-api';

/** Character calls over PeerApi. */
@Injectable({ providedIn: 'root' })
export class CharacterService {
  private readonly api = inject(PeerApi);

  create(request: CreateCharacterRequest): Promise<Character> {
    return this.api.request(CHARACTER_ROUTES.create, request, 30_000);
  }

  /** Spend a point, equip, use, sell… (players on their own character; the game master on anyone). */
  act(characterId: string, action: CharacterAction): Promise<Character> {
    const { kind, ...fields } = action;
    return this.api.request(characterActionRoute(kind), {
      characterId,
      ...fields,
    });
  }

  /** Saves the player's personal notes with their record on the host. */
  saveNotes(characterId: string, notes: string): Promise<Character> {
    return this.api.request(CHARACTER_ROUTES.saveNotes, { characterId, notes });
  }

  /** The player's own class, its tree and the skills it references (never the catalogues). */
  loadMyClass(): Promise<ClassView> {
    return this.api.request(CHARACTER_ROUTES.myClass, {});
  }

  serveMyClass(handler: PeerHandler<unknown, ClassView>): () => void {
    return this.api.serve(CHARACTER_ROUTES.myClass, handler);
  }

  /** null until the host sends it, and again after leaving. */
  watchCharacters(): Observable<Character[] | null> {
    return this.api.watchCurrent(CHARACTER_TOPICS.list);
  }

  serveCreate(handler: PeerHandler<unknown, Character>): () => void {
    return this.api.serve(CHARACTER_ROUTES.create, handler);
  }

  serveSaveNotes(handler: PeerHandler<unknown, Character>): () => void {
    return this.api.serve(CHARACTER_ROUTES.saveNotes, handler);
  }

  serveAction(
    kind: CharacterActionKind,
    handler: PeerHandler<unknown, Character>,
  ): () => void {
    return this.api.serve(characterActionRoute(kind), handler);
  }

  publishCharacters(characters: Character[]): void {
    this.api.publish(CHARACTER_TOPICS.list, characters);
  }
}
