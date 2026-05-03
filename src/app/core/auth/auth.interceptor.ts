import {
  HttpBackend,
  HttpClient,
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, switchMap, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CsrfTokenResponse } from '../models/api.models';
import { AuthSessionService } from './auth-session.service';

const CSRF_REFRESHED = new HttpContextToken<boolean>(() => false);
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS', 'TRACE'];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(AuthSessionService);
  const httpBackend = inject(HttpBackend);
  const isApiRequest = request.url.startsWith(environment.apiBaseUrl);
  const isLoginRequest = request.url.endsWith('/auth/login');
  const isCsrfRequest = request.url.endsWith('/auth/csrf');
  const isUnsafeMethod = !SAFE_METHODS.includes(request.method.toUpperCase());

  if (isApiRequest && isUnsafeMethod && !isCsrfRequest && !session.csrfHeader()) {
    return refreshCsrf(httpBackend, session).pipe(
      switchMap(() => next(withApiSession(request, session))),
      catchError((error: unknown) => handleAuthError(error, session, isLoginRequest)),
    );
  }

  const apiRequest = isApiRequest ? withApiSession(request, session) : request;

  return next(apiRequest).pipe(
    catchError((error: unknown) => {
      if (shouldRefreshCsrf(error, request, isApiRequest, isUnsafeMethod, isLoginRequest, isCsrfRequest)) {
        return refreshCsrf(httpBackend, session).pipe(
          switchMap(() => next(withApiSession(request, session, true))),
          catchError((retryError: unknown) => handleAuthError(retryError, session, isLoginRequest)),
        );
      }
      return handleAuthError(error, session, isLoginRequest);
    }),
  );
};

function withApiSession(
  request: HttpRequest<unknown>,
  session: AuthSessionService,
  csrfRefreshed = false,
): HttpRequest<unknown> {
  const csrfHeader = session.csrfHeader();
  const isUnsafeMethod = !SAFE_METHODS.includes(request.method.toUpperCase());
  return request.clone({
    withCredentials: true,
    setHeaders: csrfHeader && isUnsafeMethod ? { [csrfHeader.name]: csrfHeader.token } : {},
    context: csrfRefreshed ? request.context.set(CSRF_REFRESHED, true) : request.context,
  });
}

function refreshCsrf(httpBackend: HttpBackend, session: AuthSessionService): Observable<CsrfTokenResponse> {
  const http = new HttpClient(httpBackend);
  return http.get<CsrfTokenResponse>(`${environment.apiBaseUrl}/auth/csrf`, { withCredentials: true }).pipe(
    tap((csrf) => session.setCsrfToken(csrf)),
  );
}

function shouldRefreshCsrf(
  error: unknown,
  request: HttpRequest<unknown>,
  isApiRequest: boolean,
  isUnsafeMethod: boolean,
  isLoginRequest: boolean,
  isCsrfRequest: boolean,
): boolean {
  return error instanceof HttpErrorResponse
    && error.status === 403
    && isApiRequest
    && isUnsafeMethod
    && !isLoginRequest
    && !isCsrfRequest
    && !request.context.get(CSRF_REFRESHED);
}

function handleAuthError(
  error: unknown,
  session: AuthSessionService,
  isLoginRequest: boolean,
): Observable<never> {
  if (error instanceof HttpErrorResponse && error.status === 401 && !isLoginRequest) {
    session.logout();
  }
  return throwError(() => error);
}
