import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBarComponent } from './core/components/nav-bar/nav-bar.component';
import { OfflineBannerComponent } from './core/components/offline-banner/offline-banner.component';
import { Toast, ToastModule } from '@openng/optimus-ui/toast';
import { ConfirmDialog } from '@openng/optimus-ui/confirmdialog';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavBarComponent, OfflineBannerComponent, ToastModule, Toast, ConfirmDialog],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.scss',
})
export class App {}
