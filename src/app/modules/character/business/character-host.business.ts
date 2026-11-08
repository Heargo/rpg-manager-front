import { inject, Injectable } from '@angular/core';
import { ImageBusiness } from '../../../core/business/image.business';
import { PeerApiError } from '../../../core/p2p/helpers/peer-api-error';
import { SELF_PEER } from '../../../core/p2p/peer-api.service';
import { PeerId } from '../../../core/p2p/room-transport';
import { RoomHostBusiness } from '../../room/business/room-host.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { giveItem } from '../../item/helpers/item-give.rules';
import { Character } from '../../world/models/world';
import {
  applyCharacterAction,
  CHARACTER_ACTION_KINDS,
  CharacterActionKind,
  GAME_MASTER_ACTIONS,
  parseCharacterAction,
} from '../helpers/character-actions.rules';
import { classBonusesOf, classViewOf } from '../helpers/class-view.rules';
import { parseNotesPayload } from '../helpers/offline-actions.rules';
import {
  createCharacter,
  findCharacterOf,
  validateClassChoice,
  validateCreateCharacter,
} from '../helpers/character.rules';
import { ClassChoice, ClassView, CreateCharacterRequest } from '../models/character-api';
import { CharacterService } from '../services/character.service';
import { PlayerCopyGateBusiness } from './player-copy-gate.business';

/** Host: creates characters for players and publishes the character list. */
@Injectable({ providedIn: 'root' })
export class CharacterHostBusiness {
  private readonly service = inject(CharacterService);
  private readonly session = inject(WorldSessionBusiness);
  private readonly roomHost = inject(RoomHostBusiness);
  private readonly images = inject(ImageBusiness);
  private readonly gate = inject(PlayerCopyGateBusiness);

  /** Starts answering character requests for the open world. Returns a function that stops. */
  start(): () => void {
    this.publish();
    const stops = [
      this.service.serveCreate((payload, { from }) =>
        this.onCreate(payload, from),
      ),
      this.service.serveSaveNotes((payload, { from }) =>
        this.onSaveNotes(payload, from),
      ),
      this.service.serveClassChoices((_payload, { from }) =>
        this.onClassChoices(from),
      ),
      this.service.serveMyClass((_payload, { from }) => this.onMyClass(from)),
      ...CHARACTER_ACTION_KINDS.map((kind) =>
        this.service.serveAction(kind, (payload, { from }) =>
          this.onAction(kind, payload, from),
        ),
      ),
    ];
    return () => stops.forEach((stop) => stop());
  }

  /** A player acts on their own character; the game master on anyone, and alone grants points and sets values. */
  private async onAction(
    kind: CharacterActionKind,
    payload: unknown,
    from: PeerId,
  ): Promise<Character> {
    const action = parseCharacterAction(kind, payload);
    const characterId = (payload as { characterId?: unknown } | null)
      ?.characterId;
    if (!action || typeof characterId !== 'string')
      throw new PeerApiError('invalid', 'character.errors.invalid');
    const isGameMaster = from === SELF_PEER;
    if (!isGameMaster && GAME_MASTER_ACTIONS.includes(kind))
      throw new PeerApiError('forbidden', 'character.errors.gameMasterOnly');
    const playerId = isGameMaster ? undefined : this.roomHost.playerIdOf(from);
    if (!isGameMaster && !playerId)
      throw new PeerApiError('forbidden', 'character.errors.notInRoom');
    if (playerId && this.gate.isHeld(from, playerId))
      throw new PeerApiError('forbidden', 'character.errors.held');

    let changed: Character | undefined;
    await this.session.update((world) => {
      const character = world.characters.find(
        (candidate) => candidate.id === characterId,
      );
      if (!character)
        throw new PeerApiError('invalid', 'character.errors.unknownCharacter');
      if (!isGameMaster && character.playerId !== playerId)
        throw new PeerApiError('forbidden', 'character.errors.notYours');
      const result = applyCharacterAction(
        world.attributes,
        character,
        action,
        world,
        world,
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
          candidate.id === characterId ? changed! : candidate,
        ),
      };
    });
    this.publish();
    return changed!;
  }

  /** The classes a player picks from at creation: name, description, image and bonuses, never the trees. */
  private onClassChoices(from: PeerId): ClassChoice[] {
    const world = this.session.$world();
    if (from !== SELF_PEER && !this.roomHost.playerIdOf(from))
      throw new PeerApiError('forbidden', 'character.errors.notInRoom');
    if (!world) throw new PeerApiError('forbidden', 'character.errors.notInRoom');
    return world.classes.map(
      ({ id, name, description, imageId, bonuses }) => ({
        id,
        name,
        description,
        ...(imageId !== undefined && { imageId }),
        ...(bonuses !== undefined && { bonuses }),
      }),
    );
  }

  /** The requesting player's class, the skills its tree references and the skills on their sheet: nothing else. */
  private onMyClass(from: PeerId): ClassView {
    const world = this.session.$world();
    const playerId =
      from === SELF_PEER ? undefined : this.roomHost.playerIdOf(from);
    if (!world || !playerId)
      throw new PeerApiError('forbidden', 'character.errors.notInRoom');
    const character = findCharacterOf(world, playerId);
    return classViewOf(character ?? { skills: [] }, world);
  }

  /** Only the owner (or the game master) changes a character's notes. */
  private async onSaveNotes(
    payload: unknown,
    from: PeerId,
  ): Promise<Character> {
    const request = parseNotesPayload(payload);
    if (!request) throw new PeerApiError('invalid', 'character.errors.invalid');
    const isGameMaster = from === SELF_PEER;
    const playerId = isGameMaster ? undefined : this.roomHost.playerIdOf(from);
    if (!isGameMaster && !playerId)
      throw new PeerApiError('forbidden', 'character.errors.notInRoom');
    if (playerId && this.gate.isHeld(from, playerId))
      throw new PeerApiError('forbidden', 'character.errors.held');

    let changed: Character | undefined;
    await this.session.update((world) => {
      const character = world.characters.find(
        (candidate) => candidate.id === request.characterId,
      );
      if (!character)
        throw new PeerApiError('invalid', 'character.errors.unknownCharacter');
      if (!isGameMaster && character.playerId !== playerId)
        throw new PeerApiError('forbidden', 'character.errors.notYours');
      changed = {
        ...character,
        notes: request.notes,
        rev: character.rev + 1,
        updatedAt: Date.now(),
      };
      return {
        ...world,
        characters: world.characters.map((candidate) =>
          candidate.id === character.id ? changed! : candidate,
        ),
      };
    });
    this.publish();
    return changed!;
  }

  private async onCreate(payload: unknown, from: PeerId): Promise<Character> {
    // The game master plays the world, not a character.
    if (from === SELF_PEER)
      throw new PeerApiError(
        'forbidden',
        'character.errors.hostHasNoCharacter',
      );
    const playerId = this.roomHost.playerIdOf(from);
    if (!playerId)
      throw new PeerApiError('forbidden', 'character.errors.notInRoom');
    if (this.gate.isHeld(from, playerId))
      throw new PeerApiError('forbidden', 'character.errors.held');
    const problem = validateCreateCharacter(payload);
    if (problem) throw new PeerApiError('invalid', problem);
    const request = payload as CreateCharacterRequest;

    const portraitId = request.portrait
      ? await this.images.fromBase64(request.portrait)
      : undefined;
    let created: Character | undefined;
    await this.session.update((world) => {
      if (findCharacterOf(world, playerId))
        throw new PeerApiError('rejected', 'character.errors.alreadyExists');
      const problem = validateClassChoice(world, request.classId);
      if (problem) throw new PeerApiError('invalid', problem);
      created = createCharacter(
        world,
        { playerId, name: request.name, portraitId, classId: request.classId },
        crypto.randomUUID(),
        Date.now(),
      );
      const chosen = world.classes.find((entry) => entry.id === request.classId);
      for (const itemId of chosen?.startingItems ?? []) {
        const item = world.items.find((entry) => entry.id === itemId);
        if (item) created = giveItem(created, item, crypto.randomUUID());
      }
      return { ...world, characters: [...world.characters, created] };
    });
    this.publish();
    return created!;
  }

  /** Sends the characters to every player. */
  publish(): void {
    const world = this.session.$world();
    // Personal notes stay on the host and with their owner: they are not in the list everyone receives.
    if (world)
      this.service.publishCharacters(
        world.characters.map(({ notes: _notes, ...character }) => {
          const characterClass = world.classes.find(
            (entry) => entry.id === character.classId,
          );
          return characterClass
            ? {
                ...character,
                className: characterClass.name,
                classBonuses: classBonusesOf(character, world.classes),
              }
            : character;
        }),
      );
  }
}
