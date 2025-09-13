import { effect, inject, Injectable, signal } from '@angular/core';
import { User } from '../models/user.interface';
import { UsersService } from '../services/users.service';
import { AuthentificationBusiness } from '../../authentification/business/authentification.business';

@Injectable({
  providedIn: 'root',
})
export class UsersBusiness {
  private readonly authBusiness = inject(AuthentificationBusiness);
  private readonly usersService = inject(UsersService);
  $currentUser = signal<User | null>(null);
  constructor() {
    effect(() => {
      const connected = this.authBusiness.$connected();
      if (connected) {
        this.loadCurrentUser();
      } else {
        this.$currentUser.set(null);
      }
    });
  }

  async loadCurrentUser() {
    this.$currentUser.set(await this.usersService.getCurrentUser());
  }
}
