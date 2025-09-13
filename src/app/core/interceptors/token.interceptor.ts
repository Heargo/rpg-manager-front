import { Observable } from 'rxjs';
import { HttpRequest, HttpEvent, HttpHandlerFn } from '@angular/common/http';

export function tokenInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const token = localStorage.getItem('token');
  if (token) {
    // Clone the request and add the token as an 'Authorization' header
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
  return next(req);
}
