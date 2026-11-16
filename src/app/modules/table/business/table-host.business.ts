import { effect, inject, Injectable, Injector } from '@angular/core';
import { ImageBusiness } from '../../../core/business/image.business';
import { PeerApiError } from '../../../core/p2p/helpers/peer-api-error';
import { PeerContext, SELF_PEER } from '../../../core/p2p/peer-api.service';
import { MerchantHostBusiness } from '../../npc/business/merchant-host.business';
import { toPublicNpc } from '../../npc/helpers/npc-visibility.rules';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import {
  addQuickImage,
  parseEncounterRequest,
  removeQuickImage,
  requestedImageId,
  saveNotes,
  showIllustration,
  toTableScene,
  validateNotes,
} from '../helpers/table.rules';
import { EncounterKind } from '../models/table';
import { TableService } from '../services/table.service';

/** Host: the game master's table actions (illustration, quick images, notes) and the scene every player sees. */
@Injectable({ providedIn: 'root' })
export class TableHostBusiness {
  private readonly service = inject(TableService);
  private readonly session = inject(WorldSessionBusiness);
  private readonly images = inject(ImageBusiness);
  private readonly injector = inject(Injector);
  private readonly merchants = inject(MerchantHostBusiness);
  /** The running story or merchant encounter, null when there is none. */
  private encounter: { kind: EncounterKind; npcId: string } | null = null;

  /** Starts answering table requests for the open world. Returns a function that stops. */
  start(): () => void {
    this.publish();
    this.stopEncounter();
    this.publishEncounter();
    // Editing or deleting the NPC, changing the visibility rules or starting a combat updates the card.
    const watcher = effect(
      () => {
        this.session.$world();
        this.publishEncounter();
      },
      { injector: this.injector },
    );
    const stops = [
      () => watcher.destroy(),
      this.service.serveStartEncounter((payload, context) =>
        this.onStartEncounter(payload, context),
      ),
      this.service.serveEndEncounter((_payload, context) =>
        this.onEndEncounter(context),
      ),
      this.service.serveShowIllustration((payload, context) =>
        this.onShowIllustration(payload, context),
      ),
      this.service.serveAddQuickImage((payload, context) =>
        this.onAddQuickImage(payload, context),
      ),
      this.service.serveRemoveQuickImage((payload, context) =>
        this.onRemoveQuickImage(payload, context),
      ),
      this.service.serveSaveNotes((payload, context) =>
        this.onSaveNotes(payload, context),
      ),
    ];
    return () => {
      stops.forEach((stop) => stop());
      this.stopEncounter();
    };
  }

  private async onStartEncounter(
    payload: unknown,
    { from }: PeerContext,
  ): Promise<void> {
    assertGameMaster(from);
    const request = parseEncounterRequest(payload);
    if (!request) throw new PeerApiError('invalid', 'table.errors.invalid');
    const world = this.session.$world();
    if (world?.encounter)
      throw new PeerApiError('rejected', 'table.errors.combatRunning');
    const npc = world?.npcs.find((candidate) => candidate.id === request.npcId);
    if (!npc) throw new PeerApiError('invalid', 'table.errors.invalid');
    if (request.kind === 'merchant' && !npc.roles.includes('merchant'))
      throw new PeerApiError('invalid', 'table.errors.notMerchant');
    this.stopEncounter();
    this.encounter = request;
    if (request.kind === 'merchant') this.merchants.openForEveryone(npc.id);
    this.publishEncounter();
  }

  private async onEndEncounter({ from }: PeerContext): Promise<void> {
    assertGameMaster(from);
    this.stopEncounter();
    this.publishEncounter();
  }

  /** Forgets the running encounter and closes its shop. */
  private stopEncounter(): void {
    if (this.encounter?.kind === 'merchant')
      this.merchants.closeForEveryone(this.encounter.npcId);
    this.encounter = null;
  }

  private async onShowIllustration(
    payload: unknown,
    { from }: PeerContext,
  ): Promise<void> {
    assertGameMaster(from);
    const clearing =
      (payload as { imageId?: unknown } | null)?.imageId === null;
    const imageId = clearing ? null : await this.existingImage(payload);
    await this.session.update((world) => showIllustration(world, imageId));
    this.publish();
  }

  private async onAddQuickImage(
    payload: unknown,
    { from }: PeerContext,
  ): Promise<void> {
    assertGameMaster(from);
    const imageId = await this.existingImage(payload);
    await this.session.update((world) => {
      const next = addQuickImage(world, imageId);
      if (next === 'full')
        throw new PeerApiError('rejected', 'table.errors.tooManyImages');
      return next;
    });
  }

  private async onRemoveQuickImage(
    payload: unknown,
    { from }: PeerContext,
  ): Promise<void> {
    assertGameMaster(from);
    const imageId = requestedImageId(payload);
    if (!imageId) throw new PeerApiError('invalid', 'table.errors.invalid');
    await this.session.update((world) => removeQuickImage(world, imageId));
  }

  private async onSaveNotes(
    payload: unknown,
    { from }: PeerContext,
  ): Promise<void> {
    assertGameMaster(from);
    const problem = validateNotes(payload);
    if (problem) throw new PeerApiError('invalid', problem);
    const { notes } = payload as { notes: string };
    await this.session.update((world) => saveNotes(world, notes));
  }

  /** The requested image id, once it's known to be in the host's store (so players can fetch it). */
  private async existingImage(payload: unknown): Promise<string> {
    const imageId = requestedImageId(payload);
    if (!imageId) throw new PeerApiError('invalid', 'table.errors.invalid');
    if (!(await this.images.has(imageId)))
      throw new PeerApiError('invalid', 'table.errors.imageMissing');
    return imageId;
  }

  /** Publishes the encounter's NPC card; the encounter ends when its NPC is gone or a combat starts. */
  private publishEncounter(): void {
    const world = this.session.$world();
    if (!world) return;
    const npc = this.encounter
      ? world.npcs.find((candidate) => candidate.id === this.encounter!.npcId)
      : undefined;
    if (this.encounter && (!npc || world.encounter)) this.stopEncounter();
    this.service.publishEncounter(
      this.encounter && npc
        ? { kind: this.encounter.kind, npc: toPublicNpc(npc, world) }
        : null,
    );
  }

  private publish(): void {
    const world = this.session.$world();
    if (world) this.service.publishScene(toTableScene(world));
  }
}

/** Table actions belong to the game master, whose requests come from the host's own UI. */
function assertGameMaster(from: string): void {
  if (from !== SELF_PEER)
    throw new PeerApiError('forbidden', 'table.errors.gameMasterOnly');
}
