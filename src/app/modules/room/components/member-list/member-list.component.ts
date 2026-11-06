import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AvatarModule } from '@openng/optimus-ui/avatar';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { RoomMember } from '../../models/room';

@Component({
  selector: 'app-member-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, AvatarModule, ButtonModule, TagModule, TooltipModule],
  template: `
    <ul class="members">
      @for (member of members(); track member.playerId) {
        <li class="member" [class.offline]="!member.online">
          <p-avatar [label]="member.name.charAt(0).toUpperCase()" shape="circle" />
          <span class="name">
            {{ member.name }}
            @if (member.playerId === myPlayerId()) {
              <small>({{ 'room.members.you' | transloco }})</small>
            }
          </span>
          @if (member.isHost) {
            <p-tag [value]="'room.members.host' | transloco" severity="info" />
          }
          <p-tag
            [value]="(member.online ? 'room.members.online' : 'room.members.offline') | transloco"
            [severity]="member.online ? 'success' : 'secondary'"
          />
          @if (canKick() && !member.isHost) {
            <p-button
              icon="pi pi-user-minus"
              severity="danger"
              [text]="true"
              [rounded]="true"
              [ariaLabel]="'room.members.kick' | transloco"
              [pTooltip]="'room.members.kick' | transloco"
              (onClick)="kick.emit(member.playerId)"
            />
          }
        </li>
      }
    </ul>
  `,
  styles: `
    .members { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .member { display: flex; align-items: center; gap: 0.75rem; }
    .member.offline { opacity: 0.6; }
    .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    small { color: var(--p-text-muted-color); }
  `,
})
export class MemberListComponent {
  readonly members = input.required<RoomMember[]>();
  readonly myPlayerId = input<string | undefined>();
  readonly canKick = input(false);
  readonly kick = output<string>();
}
