import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { RoomBusiness } from '../../../modules/room/business/room.business';

/** A crossed-out wifi icon, shown only while the host's channel is closed. */
@Component({
  selector: 'app-host-offline-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, TooltipModule],
  template: `
    @if (room.$status() === 'host-offline') {
      <span
        class="host-offline-icon"
        role="img"
        tabindex="0"
        [attr.aria-label]="'room.hostOfflineTooltip' | transloco"
        [pTooltip]="'room.hostOfflineTooltip' | transloco"
        tooltipPosition="bottom"
      >
        <i class="pi pi-wifi" aria-hidden="true"></i>
      </span>
    }
  `,
  styles: `
    .host-offline-icon {
      position: relative;
      display: inline-flex;
      align-items: center;
      color: var(--p-orange-500, orange);
      cursor: help;
    }
    .host-offline-icon::after {
      content: '';
      position: absolute;
      inset-inline: -2px;
      top: 50%;
      border-top: 2px solid currentColor;
      transform: rotate(-45deg);
    }
  `,
})
export class HostOfflineIconComponent {
  protected readonly room = inject(RoomBusiness);
}
