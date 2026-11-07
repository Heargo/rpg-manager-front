import { inject, Injectable } from '@angular/core';
import { PeerApiError } from '../../../core/p2p/helpers/peer-api-error';
import { SELF_PEER } from '../../../core/p2p/peer-api.service';
import { PeerId } from '../../../core/p2p/room-transport';
import { CharacterHostBusiness } from '../../character/business/character-host.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { Character } from '../../world/models/world';
import { giveItem } from '../helpers/item-give.rules';
import { ItemService } from '../services/item.service';

/** Host: gives catalogue items to players, for the game master only. */
@Injectable({ providedIn: 'root' })
export class ItemHostBusiness {
  private readonly service = inject(ItemService);
  private readonly session = inject(WorldSessionBusiness);
  private readonly characters = inject(CharacterHostBusiness);

  /** Starts answering item requests for the open world. Returns a function that stops. */
  start(): () => void {
    return this.service.serveGive((payload, { from }) =>
      this.onGive(payload, from),
    );
  }

  private async onGive(payload: unknown, from: PeerId): Promise<Character> {
    if (from !== SELF_PEER)
      throw new PeerApiError('forbidden', 'item.errors.gameMasterOnly');
    const request = payload as {
      characterId?: unknown;
      itemId?: unknown;
    } | null;
    if (
      typeof request?.characterId !== 'string' ||
      typeof request.itemId !== 'string'
    ) {
      throw new PeerApiError('invalid', 'item.errors.invalid');
    }
    const { characterId, itemId } = request;
    let changed: Character | undefined;
    await this.session.update((world) => {
      const item = world.items.find((candidate) => candidate.id === itemId);
      if (!item) throw new PeerApiError('invalid', 'item.errors.unknownItem');
      const character = world.characters.find(
        (candidate) => candidate.id === characterId,
      );
      if (!character)
        throw new PeerApiError('invalid', 'item.errors.unknownCharacter');
      changed = {
        ...giveItem(character, item, crypto.randomUUID()),
        rev: character.rev + 1,
        updatedAt: Date.now(),
      };
      return {
        ...world,
        characters: world.characters.map((candidate) =>
          candidate.id === characterId ? changed! : candidate,
        ),
      };
    });
    this.characters.publish();
    return changed!;
  }
}
