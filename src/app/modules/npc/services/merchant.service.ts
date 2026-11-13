import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PeerApi, PeerHandler } from '../../../core/p2p/peer-api.service';
import { Character } from '../../world/models/world';
import {
  MERCHANT_ROUTES,
  MERCHANT_TOPICS,
  OpenShopRequest,
  PublishedShop,
  TradeRequest,
} from '../models/merchant';

/** Merchant shop calls over PeerApi. Opening and closing are for the game master. */
@Injectable({ providedIn: 'root' })
export class MerchantService {
  private readonly api = inject(PeerApi);

  open(npcId: string, playerIds?: string[]): Promise<void> {
    return this.api.request<void, OpenShopRequest>(MERCHANT_ROUTES.open, {
      npcId,
      ...(playerIds && { playerIds }),
    });
  }

  close(npcId: string, playerIds?: string[]): Promise<void> {
    return this.api.request<void, OpenShopRequest>(MERCHANT_ROUTES.close, {
      npcId,
      ...(playerIds && { playerIds }),
    });
  }

  buy(npcId: string, inventoryId: string): Promise<Character> {
    return this.api.request<Character, TradeRequest>(MERCHANT_ROUTES.buy, {
      npcId,
      inventoryId,
    });
  }

  sell(npcId: string, inventoryId: string): Promise<Character> {
    return this.api.request<Character, TradeRequest>(MERCHANT_ROUTES.sell, {
      npcId,
      inventoryId,
    });
  }

  /** null until the host sends it, and again after leaving. */
  watchShops(): Observable<PublishedShop[] | null> {
    return this.api.watchCurrent(MERCHANT_TOPICS.shops);
  }

  serveOpen(handler: PeerHandler<unknown, void>): () => void {
    return this.api.serve(MERCHANT_ROUTES.open, handler);
  }

  serveClose(handler: PeerHandler<unknown, void>): () => void {
    return this.api.serve(MERCHANT_ROUTES.close, handler);
  }

  serveBuy(handler: PeerHandler<unknown, Character>): () => void {
    return this.api.serve(MERCHANT_ROUTES.buy, handler);
  }

  serveSell(handler: PeerHandler<unknown, Character>): () => void {
    return this.api.serve(MERCHANT_ROUTES.sell, handler);
  }

  publishShops(shops: PublishedShop[]): void {
    this.api.publish(MERCHANT_TOPICS.shops, shops);
  }
}
