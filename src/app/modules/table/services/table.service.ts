import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PeerApi, PeerHandler } from '../../../core/p2p/peer-api.service';
import {
  EncounterKind,
  QuickImageRequest,
  SaveNotesRequest,
  StartEncounterRequest,
  ShowIllustrationRequest,
  TABLE_ROUTES,
  TABLE_TOPICS,
  TableEncounter,
  TableScene,
} from '../models/table';

/** Game table calls over PeerApi. Everything but the scene is for the game master. */
@Injectable({ providedIn: 'root' })
export class TableService {
  private readonly api = inject(PeerApi);

  showIllustration(imageId: string | null): Promise<void> {
    return this.api.request<void, ShowIllustrationRequest>(
      TABLE_ROUTES.showIllustration,
      { imageId },
    );
  }

  addQuickImage(imageId: string): Promise<void> {
    return this.api.request<void, QuickImageRequest>(
      TABLE_ROUTES.addQuickImage,
      { imageId },
    );
  }

  removeQuickImage(imageId: string): Promise<void> {
    return this.api.request<void, QuickImageRequest>(
      TABLE_ROUTES.removeQuickImage,
      { imageId },
    );
  }

  saveNotes(notes: string): Promise<void> {
    return this.api.request<void, SaveNotesRequest>(TABLE_ROUTES.saveNotes, {
      notes,
    });
  }

  startEncounter(kind: EncounterKind, npcId: string): Promise<void> {
    return this.api.request<void, StartEncounterRequest>(
      TABLE_ROUTES.startEncounter,
      { kind, npcId },
    );
  }

  endEncounter(): Promise<void> {
    return this.api.request<void, Record<string, never>>(
      TABLE_ROUTES.endEncounter,
      {},
    );
  }

  /** null until the host sends it, and while no story or merchant encounter runs. */
  watchEncounter(): Observable<TableEncounter | null> {
    return this.api.watchCurrent(TABLE_TOPICS.encounter);
  }

  serveStartEncounter(handler: PeerHandler<unknown, void>): () => void {
    return this.api.serve(TABLE_ROUTES.startEncounter, handler);
  }

  serveEndEncounter(handler: PeerHandler<unknown, void>): () => void {
    return this.api.serve(TABLE_ROUTES.endEncounter, handler);
  }

  publishEncounter(encounter: TableEncounter | null): void {
    this.api.publish(TABLE_TOPICS.encounter, encounter);
  }

  /** null until the host sends it, and again after leaving. */
  watchScene(): Observable<TableScene | null> {
    return this.api.watchCurrent(TABLE_TOPICS.scene);
  }

  serveShowIllustration(handler: PeerHandler<unknown, void>): () => void {
    return this.api.serve(TABLE_ROUTES.showIllustration, handler);
  }

  serveAddQuickImage(handler: PeerHandler<unknown, void>): () => void {
    return this.api.serve(TABLE_ROUTES.addQuickImage, handler);
  }

  serveRemoveQuickImage(handler: PeerHandler<unknown, void>): () => void {
    return this.api.serve(TABLE_ROUTES.removeQuickImage, handler);
  }

  serveSaveNotes(handler: PeerHandler<unknown, void>): () => void {
    return this.api.serve(TABLE_ROUTES.saveNotes, handler);
  }

  publishScene(scene: TableScene): void {
    this.api.publish(TABLE_TOPICS.scene, scene);
  }
}
