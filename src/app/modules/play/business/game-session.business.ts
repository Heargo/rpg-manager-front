import { computed, effect, inject, Injectable } from '@angular/core';
import { ImageBusiness } from '../../../core/business/image.business';
import { CharacterBusiness } from '../../character/business/character.business';
import { CharacterHostBusiness } from '../../character/business/character-host.business';
import { CombatHostBusiness } from '../../combat/business/combat-host.business';
import { DiceHostBusiness } from '../../dice/business/dice-host.business';
import { ItemHostBusiness } from '../../item/business/item-host.business';
import { MerchantHostBusiness } from '../../npc/business/merchant-host.business';
import { TableHostBusiness } from '../../table/business/table-host.business';
import { JoinedWorldsBusiness } from './joined-worlds.business';
import { RoomBusiness } from '../../room/business/room.business';
import { WorldInfoBusiness } from '../../world/business/world-info.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';

/**
 * Host: while this device hosts a world's room (including after a reload), keeps that world open and the game's
 * request handlers running. Player: records the joined world (and refreshes it when the host updates the world).
 * Started at app launch.
 */
@Injectable({ providedIn: 'root' })
export class GameSessionBusiness {
  private readonly room = inject(RoomBusiness);
  private readonly session = inject(WorldSessionBusiness);
  private readonly characters = inject(CharacterHostBusiness);
  private readonly images = inject(ImageBusiness);
  private readonly table = inject(TableHostBusiness);
  private readonly dice = inject(DiceHostBusiness);
  private readonly items = inject(ItemHostBusiness);
  private readonly merchants = inject(MerchantHostBusiness);
  private readonly combat = inject(CombatHostBusiness);
  private readonly joined = inject(JoinedWorldsBusiness);
  private readonly info = inject(WorldInfoBusiness).$info;
  private readonly myCharacter = inject(CharacterBusiness).$myCharacter;
  /** True while a player is connected and has their sheet: the moment the joined world is worth keeping. */
  private readonly hasSheet = computed(() => this.myCharacter() !== undefined);

  private openWorldId: string | undefined;
  private stops: (() => void)[] = [];
  /** Bumped on every start/stop, so a slow open that's no longer wanted doesn't start handlers. */
  private generation = 0;

  constructor() {
    effect(() => {
      const worldId = this.room.$isHost()
        ? this.room.$room()?.worldId
        : undefined;
      if (worldId === this.openWorldId) return;
      this.stop();
      if (worldId) void this.start(worldId);
    });
    effect(() => this.recordJoined());
  }

  /** What the joined world record is made of: only a change here rewrites it (not member or presence changes). */
  private readonly joinedKey = computed(
    () => {
      const info = this.info();
      const room = this.room.$room();
      if (
        !info ||
        !room ||
        !this.hasSheet() ||
        this.room.$isHost() ||
        this.room.$status() !== 'connected'
      )
        return null;
      return {
        info,
        roomId: room.id,
        hostName: room.members.find((member) => member.isHost)?.name ?? '',
      };
    },
    {
      equal: (a, b) =>
        a === b ||
        (!!a &&
          !!b &&
          a.info === b.info &&
          a.roomId === b.roomId &&
          a.hostName === b.hostName),
    },
  );

  /** Player: keeps the world, host name and sheet rules each time the host publishes the world. */
  private recordJoined(): void {
    const key = this.joinedKey();
    if (!key) return;
    const { info } = key;
    const {
      attributes,
      barAttributes,
      levelCurve,
      maxLevel,
      sellAnywhere,
      sellAnywhereRatio,
    } = info;
    void this.joined
      .record({
        worldId: info.id,
        roomId: key.roomId,
        name: info.name,
        hostName: key.hostName,
        sheetWorld: {
          attributes,
          barAttributes,
          levelCurve,
          maxLevel,
          sellAnywhere,
          sellAnywhereRatio,
        },
      })
      .catch((error: unknown) =>
        console.warn('Could not save the joined world', error),
      );
  }

  private async start(worldId: string): Promise<void> {
    this.openWorldId = worldId;
    const generation = ++this.generation;
    try {
      await this.session.open(worldId);
    } catch (error) {
      console.error('Could not open the hosted world', error);
      return;
    }
    if (generation !== this.generation) return;
    this.stops = [
      this.characters.start(),
      this.table.start(),
      this.dice.start(),
      this.items.start(),
      this.merchants.start(),
      this.combat.start(),
      this.images.serveToPlayers(),
    ];
  }

  private stop(): void {
    this.generation++;
    this.stops.forEach((stop) => stop());
    this.stops = [];
    if (this.openWorldId) this.session.close();
    this.openWorldId = undefined;
  }
}
