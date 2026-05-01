import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorResponse, DisplayApiError } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiErrorService {
  toDisplayError(error: unknown): DisplayApiError {
    if (!(error instanceof HttpErrorResponse)) {
      return {
        message: 'No se pudo completar la solicitud.',
        details: [],
      };
    }

    if (error.status === 0) {
      return {
        message: 'No se pudo conectar con el backend.',
        details: ['Verifica que el backend este disponible en el puerto 8082.'],
      };
    }

    const payload = this.readPayload(error.error);
    const message = payload?.message?.trim() || this.defaultMessage(error.status);
    const details = Array.isArray(payload?.details)
      ? payload.details
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .map((item) => item.trim())
          .slice(0, 5)
      : [];

    return { message, details };
  }

  private readPayload(errorBody: unknown): Partial<ApiErrorResponse> | null {
    if (errorBody && typeof errorBody === 'object') {
      return errorBody as Partial<ApiErrorResponse>;
    }
    return null;
  }

  private defaultMessage(status: number): string {
    if (status >= 500) {
      return 'El backend no pudo procesar la solicitud.';
    }
    if (status === 404) {
      return 'No se encontro el registro solicitado.';
    }
    if (status === 400) {
      return 'La solicitud contiene datos invalidos.';
    }
    return 'La solicitud no pudo completarse.';
  }
}
