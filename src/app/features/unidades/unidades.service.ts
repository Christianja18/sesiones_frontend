import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CreateUnidadRequest, UnidadResponse } from '../../core/models/api.models';

@Injectable({ providedIn: 'root' })
export class UnidadesService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/unidades`;

  create(request: CreateUnidadRequest): Observable<UnidadResponse> {
    return this.http.post<UnidadResponse>(this.endpoint, request);
  }

  findById(unidadId: number): Observable<UnidadResponse> {
    return this.http.get<UnidadResponse>(`${this.endpoint}/${unidadId}`);
  }
}
