import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { OnlineBusiness } from '../../business/online.business';

@Component({
  selector: 'app-offline-banner',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './offline-banner.component.html',
  styleUrl: './offline-banner.component.scss',
})
export class OfflineBannerComponent {
  protected readonly online = inject(OnlineBusiness);
}
