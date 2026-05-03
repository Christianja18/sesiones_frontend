import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthSessionService } from './auth-session.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(AuthSessionService);
  const isApiRequest = request.url.startsWith(environment.apiBaseUrl);
  const isLoginRequest = request.url.endsWith('/auth/login');
  const csrfHeader = session.csrfHeader();
  const isUnsafeMethod = !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(request.method.toUpperCase());

  const apiRequest = isApiRequest
    ? request.clone({
        withCredentials: true,
        setHeaders: csrfHeader && isUnsafeMethod ? { [csrfHeader.name]: csrfHeader.token } : {},
      })
    : request;

  return next(apiRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isLoginRequest) {
        session.logout();
      }
      return throwError(() => error);
    }),
  );
};
