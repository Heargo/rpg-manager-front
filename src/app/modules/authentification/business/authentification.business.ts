import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthentificationBusiness {
  private authService = inject(AuthService);
  public $token = signal<string | null>(null);
  public $connected = signal<boolean>(false);

  constructor() {
    this.setupFromLocalStorage();
  }

  private async setupFromLocalStorage(): Promise<void> {
    this.$token.set(localStorage.getItem('token') || '');
    const connected = await this.authService.isLoggedIn();
    this.$connected.set(connected);
  }

  public async register(login: string, password: string) {
    return this.authService.register(login, password);
  }

  public async login(login: string, password: string): Promise<boolean> {
    const loginResponse = await this.authService
      .login(login, password)
      .then((response) => {
        this.$token.set(response.token);
        this.$connected.set(true);
        localStorage.setItem('token', response.token);
        return response;
      })
      .catch(() => null);
    return !!loginResponse;
  }

  public logout(): void {
    this.$token.set(null);
    localStorage.removeItem('token');
    this.$connected.set(false);
  }
}
