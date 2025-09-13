import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBarComponent } from './core/components/nav-bar/nav-bar.component';
import { Toast, ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavBarComponent, RouterOutlet, ToastModule, Toast],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  // private readonly authService: AuthService = inject(AuthService);

  ngOnInit(): void {
    // this.authService
    //   .isTokenValid()
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe((res) => {
    //     if (!res) {
    //       this.authService.logout();
    //     }
    //   });
  }
}
