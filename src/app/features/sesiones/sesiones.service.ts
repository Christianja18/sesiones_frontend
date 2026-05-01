import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { GenerateSesionRequest, SaveSesionRequest, SesionResponse } from '../../core/models/api.models';

@Injectable({ providedIn: 'root' })
export class SesionesService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/sesiones`;

  generateWithIa(request: GenerateSesionRequest): Observable<SesionResponse> {
    return this.http.post<SesionResponse>(`${this.endpoint}/generar`, request);
  }

  generateWithTemplate(request: GenerateSesionRequest): Observable<SesionResponse> {
    return this.http.post<SesionResponse>(`${this.endpoint}/generar-plantilla`, request);
  }

  save(request: SaveSesionRequest): Observable<SesionResponse> {
    return this.http.post<SesionResponse>(this.endpoint, request);
  }

  findById(sesionId: number): Observable<SesionResponse> {
    return this.http.get<SesionResponse>(`${this.endpoint}/${sesionId}`);
  }
}
