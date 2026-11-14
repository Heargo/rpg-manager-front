import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { OnlineBusiness } from '../../business/online.business';

@Component({
  selector: 'app-offline-banner',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './offline-banner.component.html',
  styleUrl: './offline-banner.component.scss',
})
export class OfflineBannerComponent {
  protected readonly online = inject(OnlineBusiness);
}
