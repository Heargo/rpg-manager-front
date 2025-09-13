import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { User } from '../models/user.interface';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly http = inject(HttpClient);
  getCurrentUser(): Promise<User | null> {
    return firstValueFrom(
      this.http.get<User>(environment.API_URL + '/user/profile')
    ).catch(() => {
      return null;
    });
  }
}
