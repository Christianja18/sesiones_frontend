import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CreateDocenteRequest, DocenteResponse } from '../../core/models/api.models';

@Injectable({ providedIn: 'root' })
export class DocentesService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/docentes`;

  create(request: CreateDocenteRequest): Observable<DocenteResponse> {
    return this.http.post<DocenteResponse>(this.endpoint, request);
  }
}
