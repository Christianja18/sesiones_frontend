import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthUserResponse, CsrfTokenResponse, LoginRequest, LoginResponse } from '../../core/models/api.models';

@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/auth`;

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.endpoint}/login`, request, { withCredentials: true });
  }

  me(): Observable<AuthUserResponse> {
    return this.http.get<AuthUserResponse>(`${this.endpoint}/me`, { withCredentials: true });
  }

  csrf(): Observable<CsrfTokenResponse> {
    return this.http.get<CsrfTokenResponse>(`${this.endpoint}/csrf`, { withCredentials: true });
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.endpoint}/logout`, null, { withCredentials: true });
  }
}
