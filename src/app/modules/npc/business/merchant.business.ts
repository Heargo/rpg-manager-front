import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { LanguageBusiness } from '../../../core/business/language.business';
import { ProfileBusiness } from '../../../core/business/profile.business';
import { PeerApiError } from '../../../core/p2p/helpers/peer-api-error';
import { RoomBusiness } from '../../room/business/room.business';
import { Character } from '../../world/models/world';
import { isOpenFor } from '../helpers/merchant.rules';
import { PublicShop } from '../models/merchant';
import { MerchantService } from '../services/merchant.service';

/** The shops of the room as this device sees them: a player's open shops, or every open shop for the game master. */
@Injectable({ providedIn: 'root' })
export class MerchantBusiness {
  private readonly service = inject(MerchantService);
  private readonly room = inject(RoomBusiness);
  private readonly profile = inject(ProfileBusiness);
  private readonly language = inject(LanguageBusiness);
  private readonly published = toSignal(this.service.watchShops(), {
    initialValue: null,
  });

  /** The shops open for this device's player (the game master sees every open shop). */
  readonly $shops = computed<PublicShop[]>(() => {
    const playerId = this.profile.$profile().playerId;
    const isHost = this.room.$isHost();
    return (this.published() ?? [])
      .filter((shop) => isHost || isOpenFor(shop.playerIds, playerId))
      .map(({ playerIds: _playerIds, ...shop }) => shop);
  });
  readonly $openNpcIds = computed(() =>
    this.$shops().map((shop) => shop.npcId),
  );

  /** Game master: opens the shop for the given players, or every player. */
  open(npcId: string, playerIds?: string[]): Promise<void> {
    return this.service.open(npcId, playerIds);
  }

  close(npcId: string, playerIds?: string[]): Promise<void> {
    return this.service.close(npcId, playerIds);
  }

  buy(npcId: string, inventoryId: string): Promise<Character> {
    return this.service.buy(npcId, inventoryId);
  }

  sell(npcId: string, inventoryId: string): Promise<Character> {
    return this.service.sell(npcId, inventoryId);
  }

  describeError(error: unknown): string {
    if (error instanceof PeerApiError && error.message.startsWith('merchant.'))
      return this.language.t(error.message);
    return this.room.describeError(error);
  }
}
