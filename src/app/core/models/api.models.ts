export interface ApiErrorResponse {
  status: number;
  error: string;
  message: string;
  path: string;
  details: string[];
  timestamp: string;
}

export interface DisplayApiError {
  message: string;
  details: string[];
}

export interface TextoReferenciaResponse {
  id: number;
  descripcion: string;
}

export interface CatalogOptionResponse {
  id: string;
  nombre: string;
}

export interface CreateDocenteRequest {
  nombre: string;
  email: string;
  institucion: string;
}

export interface DocenteResponse {
  id: number;
  nombre: string;
  email: string;
  institucionId: number;
  institucion: string;
}

export interface CreateUnidadRequest {
  titulo: string;
  gradoId: number;
  areaId: number;
  docenteId: number;
  fechaInicio: string;
  fechaFin: string;
  contexto: string;
}

export interface UnidadResponse {
  id: number;
  titulo: string;
  gradoId: number;
  gradoNombre: string;
  nivelId: number;
  nivelNombre: string;
  cicloId: string;
  cicloNombre: string;
  areaId: number;
  areaNombre: string;
  docenteId: number;
  docenteNombre: string;
  institucionId: number;
  institucion: string;
  fechaInicio: string;
  fechaFin: string;
  contexto: string;
  createdAt: string;
}

export interface CurriculumContextRequest {
  nivelId: number;
  gradoId: number;
  areaId: number;
  competenciaId: number;
}

export interface CurriculumContextResponse {
  nivelId: number;
  nivelNombre: string;
  cicloId: string | null;
  cicloNombre: string | null;
  gradoId: number;
  gradoNombre: string;
  areaId: number;
  areaNombre: string;
  competenciaId: number;
  competenciaDescripcion: string;
  capacidades: TextoReferenciaResponse[];
  estandares: TextoReferenciaResponse[];
  desempenos: TextoReferenciaResponse[];
}

export interface GenerateSesionRequest {
  nivelId: number;
  gradoId: number;
  areaId: number;
  competenciaId: number;
  tema: string;
  contexto: string;
  duracionMinutos: number;
  alternativa?: number;
}

export interface ActividadesSesionDto {
  inicio: string[];
  desarrollo: string[];
  cierre: string[];
}

export type InstrumentoTipo = 'rubrica' | 'lista_cotejo';

export interface InstrumentoEvaluacionDto {
  tipo: InstrumentoTipo;
  detalle: string[];
}

export interface SaveSesionRequest {
  unidadId: number;
  fecha: string;
  titulo: string;
  proposito: string;
  duracionMinutos: number;
  generadoPorIa: boolean;
  competenciaIds: number[];
  capacidadIds: number[];
  desempenoIds: number[];
  actividades: ActividadesSesionDto;
  criteriosEvaluacion: string[];
  evidencias: string[];
  instrumentoEvaluacion: InstrumentoEvaluacionDto;
}

export interface SesionResponse {
  id?: number;
  unidadId?: number;
  unidadTitulo?: string;
  fecha?: string;
  titulo: string;
  proposito: string;
  duracionMinutos: number;
  generadoPorIa: boolean;
  competencias: TextoReferenciaResponse[];
  capacidades: TextoReferenciaResponse[];
  estandares: TextoReferenciaResponse[];
  desempenos: TextoReferenciaResponse[];
  actividades: ActividadesSesionDto;
  criteriosEvaluacion: string[];
  evidencias: string[];
  instrumentoEvaluacion: InstrumentoEvaluacionDto | null;
}

export type DocumentoCurriculoTipo = 'curriculo' | 'programa';

export interface RegisterDocumentoCurriculoRequest {
  tipo: DocumentoCurriculoTipo;
  nombreArchivo: string;
  archivoUrl: string;
}

export interface DocumentoCurriculoResponse {
  id: number;
  tipo: DocumentoCurriculoTipo;
  nombreArchivo: string;
  archivoUrl: string;
  checksumSha256: string | null;
  estado: string;
  errorDetalle: string | null;
  fechaSubida: string;
  fechaProcesado: string | null;
}
