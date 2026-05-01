import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiErrorService } from '../../core/services/api-error.service';
import { CatalogOptionResponse, CurriculumContextRequest, CurriculumContextResponse, DisplayApiError, UnidadResponse } from '../../core/models/api.models';
import { positiveIntegerValidator } from '../../core/validators/form.validators';
import { CatalogPicker } from '../catalogos/catalog-picker';
import { CatalogosService } from '../catalogos/catalogos.service';
import { CurriculumService } from './curriculum.service';

@Component({
  selector: 'app-curriculum',
  imports: [CommonModule, ReactiveFormsModule, CatalogPicker],
  templateUrl: './curriculum.html',
  styleUrl: './curriculum.css',
})
export class Curriculum implements OnInit, OnChanges {
  @Input() unidad: UnidadResponse | null = null;
  @Output() contextLoaded = new EventEmitter<CurriculumContextResponse>();

  private readonly fb = inject(FormBuilder);
  private readonly curriculumService = inject(CurriculumService);
  private readonly catalogosService = inject(CatalogosService);
  private readonly apiErrorService = inject(ApiErrorService);

  readonly form = this.fb.group({
    nivelId: ['', [Validators.required, positiveIntegerValidator]],
    gradoId: ['', [Validators.required, positiveIntegerValidator]],
    areaId: ['', [Validators.required, positiveIntegerValidator]],
    competenciaId: ['', [Validators.required, positiveIntegerValidator]],
  });

  loading = false;
  catalogLoading = false;
  niveles: CatalogOptionResponse[] = [];
  grados: CatalogOptionResponse[] = [];
  areas: CatalogOptionResponse[] = [];
  selectedCompetenciaOptions: CatalogOptionResponse[] = [];
  context: CurriculumContextResponse | null = null;
  apiError: DisplayApiError | null = null;
  catalogError: DisplayApiError | null = null;

  ngOnInit(): void {
    this.loadBaseCatalogs();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['unidad'] && this.unidad) {
      this.form.patchValue({
        nivelId: String(this.unidad.nivelId),
        gradoId: String(this.unidad.gradoId),
        areaId: String(this.unidad.areaId),
      });
      this.loadGrados();
    }
  }

  onNivelChange(): void {
    this.form.patchValue({ gradoId: '' });
    this.loadGrados();
  }

  onAreaChange(): void {
    this.selectedCompetenciaOptions = [];
    this.form.patchValue({ competenciaId: '' });
  }

  selectCompetencia(options: CatalogOptionResponse[]): void {
    this.selectedCompetenciaOptions = options;
    this.form.patchValue({ competenciaId: options[0]?.id ?? '' });
  }

  selectedAreaId(): number | null {
    return this.numberOrNull('areaId');
  }

  submit(): void {
    this.apiError = null;
    this.context = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request: CurriculumContextRequest = {
      nivelId: this.numberValue('nivelId'),
      gradoId: this.numberValue('gradoId'),
      areaId: this.numberValue('areaId'),
      competenciaId: this.numberValue('competenciaId'),
    };

    this.loading = true;
    this.curriculumService.getContext(request).subscribe({
      next: (response) => {
        this.context = response;
        this.selectedCompetenciaOptions = [{
          id: String(response.competenciaId),
          nombre: response.competenciaDescripcion,
        }];
        this.contextLoaded.emit(response);
        this.loading = false;
      },
      error: (error: unknown) => {
        this.apiError = this.apiErrorService.toDisplayError(error);
        this.loading = false;
      },
    });
  }

  fieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!field && field.invalid && (field.dirty || field.touched);
  }

  private numberValue(fieldName: string): number {
    return Number(this.form.get(fieldName)?.value);
  }

  private loadBaseCatalogs(): void {
    this.catalogLoading = true;
    this.catalogError = null;
    this.catalogosService.niveles().subscribe({
      next: (niveles) => {
        this.niveles = niveles;
        this.loadAreas();
      },
      error: (error: unknown) => {
        this.catalogError = this.apiErrorService.toDisplayError(error);
        this.catalogLoading = false;
      },
    });
  }

  private loadAreas(): void {
    this.catalogosService.areas().subscribe({
      next: (areas) => {
        this.areas = areas;
        this.loadGrados();
      },
      error: (error: unknown) => {
        this.catalogError = this.apiErrorService.toDisplayError(error);
        this.catalogLoading = false;
      },
    });
  }

  private loadGrados(): void {
    this.catalogLoading = true;
    this.catalogosService.grados(this.numberOrNull('nivelId')).subscribe({
      next: (grados) => {
        this.grados = grados;
        this.catalogLoading = false;
      },
      error: (error: unknown) => {
        this.catalogError = this.apiErrorService.toDisplayError(error);
        this.catalogLoading = false;
      },
    });
  }

  private numberOrNull(fieldName: string): number | null {
    const value = Number(this.form.get(fieldName)?.value);
    return Number.isFinite(value) && value > 0 ? value : null;
  }
}
