import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthSessionStore } from './auth-session.store';

/**
 * Attach credentials + optional Bearer JWT.
 * On 401, frost-out and route to login (Rule #2).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const store = inject(AuthSessionStore);

  let nextReq = req.clone({ withCredentials: true });
  const token = store.bearerToken();
  if (token && !nextReq.headers.has('Authorization')) {
    nextReq = nextReq.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(nextReq).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        const url = req.url;
        if (
          !url.includes('/login') &&
          !url.includes('/auth/login') &&
          !url.includes('/auth/me') &&
          !url.includes('/users/profile')
        ) {
          auth.handleSessionFailure();
        }
      }
      return throwError(() => err);
    }),
  );
};
