import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CatalogOptionResponse } from '../../core/models/api.models';

export interface CatalogFilters {
  areaId?: number | null;
  competenciaId?: number | null;
  gradoId?: number | null;
  nivelId?: number | null;
}

export type SearchCatalogKind = 'docentes' | 'competencias' | 'capacidades' | 'desempenos';

@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/catalogos`;

  niveles(): Observable<CatalogOptionResponse[]> {
    return this.http.get<CatalogOptionResponse[]>(`${this.endpoint}/niveles`);
  }

  grados(nivelId?: number | null): Observable<CatalogOptionResponse[]> {
    let params = new HttpParams();
    if (this.hasPositiveValue(nivelId)) {
      params = params.set('nivelId', String(nivelId));
    }
    return this.http.get<CatalogOptionResponse[]>(`${this.endpoint}/grados`, { params });
  }

  areas(): Observable<CatalogOptionResponse[]> {
    return this.http.get<CatalogOptionResponse[]>(`${this.endpoint}/areas`);
  }

  competencias(areaId?: number | null): Observable<CatalogOptionResponse[]> {
    let params = new HttpParams();
    if (this.hasPositiveValue(areaId)) {
      params = params.set('areaId', String(areaId));
    }
    return this.http.get<CatalogOptionResponse[]>(`${this.endpoint}/competencias`, { params });
  }

  capacidades(competenciaId?: number | null): Observable<CatalogOptionResponse[]> {
    let params = new HttpParams();
    if (this.hasPositiveValue(competenciaId)) {
      params = params.set('competenciaId', String(competenciaId));
    }
    return this.http.get<CatalogOptionResponse[]>(`${this.endpoint}/capacidades`, { params });
  }

  desempenos(gradoId?: number | null, competenciaId?: number | null): Observable<CatalogOptionResponse[]> {
    let params = new HttpParams();
    if (this.hasPositiveValue(gradoId)) {
      params = params.set('gradoId', String(gradoId));
    }
    if (this.hasPositiveValue(competenciaId)) {
      params = params.set('competenciaId', String(competenciaId));
    }
    return this.http.get<CatalogOptionResponse[]>(`${this.endpoint}/desempenos`, { params });
  }

  docentes(): Observable<CatalogOptionResponse[]> {
    return this.http.get<CatalogOptionResponse[]>(`${this.endpoint}/docentes`);
  }

  search(kind: SearchCatalogKind, filters: CatalogFilters = {}): Observable<CatalogOptionResponse[]> {
    if (kind === 'docentes') {
      return this.docentes();
    }
    if (kind === 'competencias') {
      return this.competencias(filters.areaId);
    }
    if (kind === 'capacidades') {
      return this.capacidades(filters.competenciaId);
    }
    return this.desempenos(filters.gradoId, filters.competenciaId);
  }

  private hasPositiveValue(value: number | null | undefined): boolean {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
  }
}
