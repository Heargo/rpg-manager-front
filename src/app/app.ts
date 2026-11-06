import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBarComponent } from './core/components/nav-bar/nav-bar.component';
import { Toast, ToastModule } from '@openng/optimus-ui/toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavBarComponent, RouterOutlet, ToastModule, Toast],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.scss',
})
export class App {}
