import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { DEFAULT_OFFLINE_FEATURES } from '../../../world/helpers/world.factory';
import { OfflineFeatures } from '../../../world/models/world';

/** The host's switches for what players can still do while the host is offline. */
@Component({
  selector: 'app-offline-features-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoPipe, ToggleSwitchModule],
  template: `
    <p class="hint">{{ 'world.fields.offlineHint' | transloco }}</p>
    @for (feature of keys; track feature) {
      <div class="toggle" [attr.data-feature]="feature">
        <p-toggleswitch
          [inputId]="'lobby-offline-' + feature"
          [ngModel]="features()[feature]"
          (ngModelChange)="toggle(feature, $event)"
        />
        <label [for]="'lobby-offline-' + feature">{{
          'world.offline.' + feature | transloco
        }}</label>
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .toggle {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .hint {
      margin: 0;
      color: var(--p-text-muted-color);
    }
  `,
})
export class OfflineFeaturesPanelComponent {
  readonly features = input.required<OfflineFeatures>();
  readonly featuresChange = output<OfflineFeatures>();

  protected readonly keys = Object.keys(
    DEFAULT_OFFLINE_FEATURES,
  ) as (keyof OfflineFeatures)[];

  protected toggle(feature: keyof OfflineFeatures, enabled: boolean): void {
    this.featuresChange.emit({ ...this.features(), [feature]: enabled });
  }
}
