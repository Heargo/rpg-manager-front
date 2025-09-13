import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthPayload, TokenPayload } from '../models/payloads.interface';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  async isLoggedIn(): Promise<boolean> {
    const res = await firstValueFrom(
      this.http.get(environment.API_URL + '/auth')
    );
    if (res) return true;
    return false;
  }

  async login(login: string, password: string): Promise<TokenPayload> {
    return firstValueFrom(
      this.http.post<TokenPayload>(environment.API_URL + '/auth/login', {
        login,
        password,
      })
    );
  }

  async register(login: string, password: string): Promise<AuthPayload> {
    return firstValueFrom(
      this.http.post<AuthPayload>(environment.API_URL + '/auth/register', {
        login,
        password,
      })
    );
  }
}
