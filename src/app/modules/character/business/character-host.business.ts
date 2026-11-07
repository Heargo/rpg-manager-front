import { inject, Injectable } from '@angular/core';
import { ImageBusiness } from '../../../core/business/image.business';
import { PeerApiError } from '../../../core/p2p/helpers/peer-api-error';
import { SELF_PEER } from '../../../core/p2p/peer-api.service';
import { PeerId } from '../../../core/p2p/room-transport';
import { RoomHostBusiness } from '../../room/business/room-host.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { Character } from '../../world/models/world';
import { createCharacter, findCharacterOf, validateCreateCharacter } from '../helpers/character.rules';
import { CreateCharacterRequest } from '../models/character-api';
import { CharacterService } from '../services/character.service';

/** Host: creates characters for players and publishes the character list. */
@Injectable({ providedIn: 'root' })
export class CharacterHostBusiness {
  private readonly service = inject(CharacterService);
  private readonly session = inject(WorldSessionBusiness);
  private readonly roomHost = inject(RoomHostBusiness);
  private readonly images = inject(ImageBusiness);

  /** Starts answering character requests for the open world. Returns a function that stops. */
  start(): () => void {
    this.publish();
    return this.service.serveCreate((payload, { from }) => this.onCreate(payload, from));
  }

  private async onCreate(payload: unknown, from: PeerId): Promise<Character> {
    // The game master plays the world, not a character.
    if (from === SELF_PEER) throw new PeerApiError('forbidden', 'character.errors.hostHasNoCharacter');
    const playerId = this.roomHost.playerIdOf(from);
    if (!playerId) throw new PeerApiError('forbidden', 'character.errors.notInRoom');
    const problem = validateCreateCharacter(payload);
    if (problem) throw new PeerApiError('invalid', problem);
    const request = payload as CreateCharacterRequest;

    const portraitId = request.portrait ? await this.images.fromBase64(request.portrait) : undefined;
    let created: Character | undefined;
    await this.session.update((world) => {
      if (findCharacterOf(world, playerId)) throw new PeerApiError('rejected', 'character.errors.alreadyExists');
      created = createCharacter(world, { playerId, name: request.name, portraitId }, crypto.randomUUID(), Date.now());
      return { ...world, characters: [...world.characters, created] };
    });
    this.publish();
    return created!;
  }

  private publish(): void {
    const world = this.session.$world();
    if (world) this.service.publishCharacters(world.characters);
  }
}
