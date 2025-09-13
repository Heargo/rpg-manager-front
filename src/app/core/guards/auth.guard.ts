import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  CanActivateFn,
} from '@angular/router';
import { catchError, from, of } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const AuthGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return from(authService.isLoggedIn()).pipe(
    take(1),
    map((isLoggedIn) => {
      if (isLoggedIn) {
        return true;
      }
      router.navigate(['auth/login']);
      return false;
    }),
    catchError((err) => {
      router.navigate(['auth/login']);
      return of(false);
    })
  );
};
