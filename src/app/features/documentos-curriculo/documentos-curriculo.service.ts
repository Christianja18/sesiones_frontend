import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { DocumentoCurriculoResponse, RegisterDocumentoCurriculoRequest } from '../../core/models/api.models';

@Injectable({ providedIn: 'root' })
export class DocumentosCurriculoService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/documentos-curriculo`;

  create(request: RegisterDocumentoCurriculoRequest): Observable<DocumentoCurriculoResponse> {
    return this.http.post<DocumentoCurriculoResponse>(this.endpoint, request);
  }

  process(documentoCurriculoId: number): Observable<DocumentoCurriculoResponse> {
    return this.http.post<DocumentoCurriculoResponse>(`${this.endpoint}/${documentoCurriculoId}/procesar`, {});
  }

  findById(documentoCurriculoId: number): Observable<DocumentoCurriculoResponse> {
    return this.http.get<DocumentoCurriculoResponse>(`${this.endpoint}/${documentoCurriculoId}`);
  }
}
