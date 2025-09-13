import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  CanActivateFn,
} from '@angular/router';
import { catchError, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthentificationBusiness } from '../../modules/authentification/business/authentification.business';

export const AuthGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot
) => {
  const router = inject(Router);
  const authBusiness = inject(AuthentificationBusiness);

  return of(authBusiness.$connected()).pipe(
    map((isLoggedIn: boolean) => {
      if (isLoggedIn) {
        return true;
      } else {
        router.navigate(['auth/login']);
        return false;
      }
    }),
    catchError(() => {
      router.navigate(['auth/login']);
      return of(false);
    })
  );
};
