import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CurriculumContextRequest, CurriculumContextResponse } from '../../core/models/api.models';

@Injectable({ providedIn: 'root' })
export class CurriculumService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/curriculum/contexto`;

  getContext(request: CurriculumContextRequest): Observable<CurriculumContextResponse> {
    const params = new HttpParams()
      .set('nivelId', request.nivelId)
      .set('gradoId', request.gradoId)
      .set('areaId', request.areaId)
      .set('competenciaId', request.competenciaId);

    return this.http.get<CurriculumContextResponse>(this.endpoint, { params });
  }
}
