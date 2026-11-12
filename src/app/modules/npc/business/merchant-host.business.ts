import { effect, inject, Injectable, Injector } from '@angular/core';
import { PeerApiError } from '../../../core/p2p/helpers/peer-api-error';
import { PeerContext, SELF_PEER } from '../../../core/p2p/peer-api.service';
import { CharacterHostBusiness } from '../../character/business/character-host.business';
import { PlayerCopyGateBusiness } from '../../character/business/player-copy-gate.business';
import { RoomHostBusiness } from '../../room/business/room-host.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { Character } from '../../world/models/world';
import {
  applyBuy,
  applySell,
  closeFor,
  isOpenFor,
  openFor,
  parseOpenRequest,
  parseTradeRequest,
  ratiosOf,
  toPublicShop,
  TradeResult,
  TradeState,
} from '../helpers/merchant.rules';
import { PublishedShop } from '../models/merchant';
import { MerchantService } from '../services/merchant.service';

/** Host: which shops are open for whom, and the players' purchases and sales, validated against the world. */
@Injectable({ providedIn: 'root' })
export class MerchantHostBusiness {
  private readonly service = inject(MerchantService);
  private readonly session = inject(WorldSessionBusiness);
  private readonly roomHost = inject(RoomHostBusiness);
  private readonly characters = inject(CharacterHostBusiness);
  private readonly gate = inject(PlayerCopyGateBusiness);
  private readonly injector = inject(Injector);
  /** Merchant id → the players the shop is open for (null: every player). A closed shop has no entry. */
  private opens = new Map<string, string[] | null>();

  /** Starts answering merchant requests for the open world. Returns a function that stops. */
  start(): () => void {
    this.opens = new Map();
    this.publish();
    // Editing a merchant (stock, ratios, name) or the world's ratios republishes the shops.
    const watcher = effect(
      () => {
        this.session.$world();
        this.publish();
      },
      { injector: this.injector },
    );
    const stops = [
      () => watcher.destroy(),
      this.service.serveOpen((payload, context) =>
        this.onOpen(payload, context),
      ),
      this.service.serveClose((payload, context) =>
        this.onClose(payload, context),
      ),
      this.service.serveBuy((payload, context) =>
        this.onTrade(applyBuy, payload, context),
      ),
      this.service.serveSell((payload, context) =>
        this.onTrade(applySell, payload, context),
      ),
    ];
    return () => stops.forEach((stop) => stop());
  }

  private async onOpen(payload: unknown, { from }: PeerContext): Promise<void> {
    assertGameMaster(from);
    const request = parseOpenRequest(payload);
    if (!request) throw new PeerApiError('invalid', 'merchant.errors.invalid');
    const merchant = this.session
      .$world()
      ?.npcs.find((npc) => npc.id === request.npcId);
    if (!merchant?.roles.includes('merchant'))
      throw new PeerApiError('invalid', 'merchant.errors.invalid');
    this.opens.set(
      request.npcId,
      openFor(this.opens.get(request.npcId), request.playerIds),
    );
    this.publish();
  }

  private async onClose(
    payload: unknown,
    { from }: PeerContext,
  ): Promise<void> {
    assertGameMaster(from);
    const request = parseOpenRequest(payload);
    if (!request) throw new PeerApiError('invalid', 'merchant.errors.invalid');
    const everyPlayer = (this.session.$world()?.characters ?? []).map(
      (character) => character.playerId,
    );
    const next = closeFor(
      this.opens.get(request.npcId),
      request.playerIds,
      everyPlayer,
    );
    if (next === undefined) this.opens.delete(request.npcId);
    else this.opens.set(request.npcId, next);
    this.publish();
  }

  private async onTrade(
    apply: (state: TradeState, inventoryId: string) => TradeResult,
    payload: unknown,
    { from }: PeerContext,
  ): Promise<Character> {
    const request = parseTradeRequest(payload);
    if (!request) throw new PeerApiError('invalid', 'merchant.errors.invalid');
    if (from === SELF_PEER)
      throw new PeerApiError('forbidden', 'merchant.errors.playerOnly');
    const playerId = this.roomHost.playerIdOf(from);
    if (!playerId)
      throw new PeerApiError('forbidden', 'character.errors.notInRoom');
    if (this.gate.isHeld(from, playerId))
      throw new PeerApiError('forbidden', 'character.errors.held');

    let changed: Character | undefined;
    await this.session.update((world) => {
      const merchant = world.npcs.find((npc) => npc.id === request.npcId);
      const character = world.characters.find(
        (candidate) => candidate.playerId === playerId,
      );
      if (!character)
        throw new PeerApiError('invalid', 'character.errors.unknownCharacter');
      if (!merchant?.roles.includes('merchant'))
        throw new PeerApiError('rejected', 'merchant.errors.closed');
      const result = apply(
        {
          character,
          merchant,
          open: isOpenFor(this.opens.get(merchant.id), playerId),
          ratios: ratiosOf(world),
        },
        request.inventoryId,
      );
      if (!result.ok) throw new PeerApiError('rejected', result.error);
      changed = {
        ...result.character,
        rev: character.rev + 1,
        updatedAt: Date.now(),
      };
      return {
        ...world,
        characters: world.characters.map((candidate) =>
          candidate.id === character.id ? changed! : candidate,
        ),
        npcs: world.npcs.map((npc) =>
          npc.id === merchant.id ? result.merchant : npc,
        ),
      };
    });
    this.characters.publish();
    this.publish();
    return changed!;
  }

  /** Sends every open shop (merchants that no longer exist close). */
  private publish(): void {
    const world = this.session.$world();
    if (!world) return;
    const ratios = ratiosOf(world);
    const shops: PublishedShop[] = [];
    for (const [npcId, playerIds] of [...this.opens]) {
      const merchant = world.npcs.find((npc) => npc.id === npcId);
      if (!merchant?.roles.includes('merchant')) this.opens.delete(npcId);
      else shops.push({ ...toPublicShop(merchant, ratios), playerIds });
    }
    this.service.publishShops(shops);
  }
}

function assertGameMaster(from: string): void {
  if (from !== SELF_PEER)
    throw new PeerApiError('forbidden', 'merchant.errors.gameMasterOnly');
}
