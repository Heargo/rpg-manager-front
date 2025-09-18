import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBarComponent } from './core/components/nav-bar/nav-bar.component';
import { Toast, ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    NavBarComponent,
    RouterOutlet,
    ToastModule,
    Toast,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
