import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { CurriculumContextResponse, DocenteResponse, UnidadResponse } from './core/models/api.models';
import { Curriculum } from './features/curriculum/curriculum';
import { Docentes } from './features/docentes/docentes';
import { DocumentosCurriculo } from './features/documentos-curriculo/documentos-curriculo';
import { Sesiones } from './features/sesiones/sesiones';
import { Unidades } from './features/unidades/unidades';

type AppFrameKey = 'docentes' | 'unidades' | 'curriculum' | 'sesiones' | 'documentos';

interface AppFrame {
  key: AppFrameKey;
  label: string;
  marker: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Docentes, Unidades, Curriculum, Sesiones, DocumentosCurriculo],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly frames: AppFrame[] = [
    { key: 'docentes', label: 'Docente', marker: '01' },
    { key: 'unidades', label: 'Unidad', marker: '02' },
    { key: 'curriculum', label: 'Curriculo', marker: '03' },
    { key: 'sesiones', label: 'Sesion', marker: '04' },
    { key: 'documentos', label: 'Documentos', marker: '05' },
  ];

  protected activeFrame: AppFrameKey = 'docentes';
  protected currentDocente: DocenteResponse | null = null;
  protected currentUnidad: UnidadResponse | null = null;
  protected currentContext: CurriculumContextResponse | null = null;

  protected selectFrame(frame: AppFrameKey): void {
    this.activeFrame = frame;
  }

  protected isActiveFrame(frame: AppFrameKey): boolean {
    return this.activeFrame === frame;
  }

  protected setDocente(docente: DocenteResponse): void {
    this.currentDocente = docente;
    this.activeFrame = 'unidades';
  }

  protected setUnidad(unidad: UnidadResponse): void {
    this.currentUnidad = unidad;
    this.activeFrame = 'curriculum';
  }

  protected setContext(context: CurriculumContextResponse): void {
    this.currentContext = context;
    this.activeFrame = 'sesiones';
  }
}
