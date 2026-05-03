import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
    return this.getCatalog(`${this.endpoint}/niveles`);
  }

  grados(nivelId?: number | null): Observable<CatalogOptionResponse[]> {
    let params = new HttpParams();
    if (this.hasPositiveValue(nivelId)) {
      params = params.set('nivelId', String(nivelId));
    }
    return this.getCatalog(`${this.endpoint}/grados`, params);
  }

  areas(): Observable<CatalogOptionResponse[]> {
    return this.getCatalog(`${this.endpoint}/areas`);
  }

  competencias(areaId?: number | null): Observable<CatalogOptionResponse[]> {
    let params = new HttpParams();
    if (this.hasPositiveValue(areaId)) {
      params = params.set('areaId', String(areaId));
    }
    return this.getCatalog(`${this.endpoint}/competencias`, params);
  }

  capacidades(competenciaId?: number | null): Observable<CatalogOptionResponse[]> {
    let params = new HttpParams();
    if (this.hasPositiveValue(competenciaId)) {
      params = params.set('competenciaId', String(competenciaId));
    }
    return this.getCatalog(`${this.endpoint}/capacidades`, params);
  }

  desempenos(gradoId?: number | null, competenciaId?: number | null): Observable<CatalogOptionResponse[]> {
    let params = new HttpParams();
    if (this.hasPositiveValue(gradoId)) {
      params = params.set('gradoId', String(gradoId));
    }
    if (this.hasPositiveValue(competenciaId)) {
      params = params.set('competenciaId', String(competenciaId));
    }
    return this.getCatalog(`${this.endpoint}/desempenos`, params);
  }

  docentes(): Observable<CatalogOptionResponse[]> {
    return this.getCatalog(`${this.endpoint}/docentes`);
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

  private getCatalog(url: string, params?: HttpParams): Observable<CatalogOptionResponse[]> {
    return this.http.get<unknown>(url, { params }).pipe(
      map((response) => this.normalizeCatalogOptions(response)),
    );
  }

  private normalizeCatalogOptions(response: unknown): CatalogOptionResponse[] {
    return this.extractList(response)
      .map((item) => this.normalizeCatalogOption(item))
      .filter((item): item is CatalogOptionResponse => item !== null);
  }

  private extractList(response: unknown): unknown[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (!this.isRecord(response)) {
      return [];
    }

    for (const key of ['data', 'items', 'content', 'results', 'catalogos']) {
      const value = response[key];
      if (Array.isArray(value)) {
        return value;
      }
    }
    return [];
  }

  private normalizeCatalogOption(item: unknown): CatalogOptionResponse | null {
    if (!this.isRecord(item)) {
      return null;
    }

    const id = this.textValue(item['id'] ?? item['value']);
    const nombre = this.textValue(item['nombre'] ?? item['descripcion'] ?? item['label'] ?? item['text']);
    if (!id || !nombre) {
      return null;
    }

    return { id, nombre };
  }

  private textValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).trim();
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
