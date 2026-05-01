import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiErrorService } from '../../core/services/api-error.service';
import { CatalogOptionResponse, CreateUnidadRequest, DisplayApiError, DocenteResponse, UnidadResponse } from '../../core/models/api.models';
import { dateRangeValidator, notBlankValidator, positiveIntegerValidator } from '../../core/validators/form.validators';
import { CatalogPicker } from '../catalogos/catalog-picker';
import { CatalogosService } from '../catalogos/catalogos.service';
import { UnidadesService } from './unidades.service';

@Component({
  selector: 'app-unidades',
  imports: [CommonModule, ReactiveFormsModule, CatalogPicker],
  templateUrl: './unidades.html',
  styleUrl: './unidades.css',
})
export class Unidades implements OnInit, OnChanges {
  @Input() docente: DocenteResponse | null = null;
  @Output() unidadCreated = new EventEmitter<UnidadResponse>();

  private readonly fb = inject(FormBuilder);
  private readonly unidadesService = inject(UnidadesService);
  private readonly catalogosService = inject(CatalogosService);
  private readonly apiErrorService = inject(ApiErrorService);

  readonly form = this.fb.group(
    {
      titulo: ['', [Validators.required, notBlankValidator, Validators.minLength(4), Validators.maxLength(180)]],
      nivelId: ['', [Validators.required, positiveIntegerValidator]],
      gradoId: ['', [Validators.required, positiveIntegerValidator]],
      areaId: ['', [Validators.required, positiveIntegerValidator]],
      docenteId: ['', [Validators.required, positiveIntegerValidator]],
      fechaInicio: ['', [Validators.required]],
      fechaFin: ['', [Validators.required]],
      contexto: ['', [Validators.required, notBlankValidator, Validators.minLength(10), Validators.maxLength(1200)]],
    },
    { validators: [dateRangeValidator('fechaInicio', 'fechaFin')] },
  );

  readonly lookupForm = this.fb.group({
    unidadId: ['', [Validators.required, positiveIntegerValidator]],
  });

  loading = false;
  lookupLoading = false;
  catalogLoading = false;
  niveles: CatalogOptionResponse[] = [];
  grados: CatalogOptionResponse[] = [];
  areas: CatalogOptionResponse[] = [];
  selectedDocenteOptions: CatalogOptionResponse[] = [];
  result: UnidadResponse | null = null;
  lookupResult: UnidadResponse | null = null;
  apiError: DisplayApiError | null = null;
  lookupError: DisplayApiError | null = null;
  catalogError: DisplayApiError | null = null;

  ngOnInit(): void {
    this.loadBaseCatalogs();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['docente'] && this.docente && !this.form.get('docenteId')?.value) {
      this.selectedDocenteOptions = [{ id: String(this.docente.id), nombre: this.docente.nombre }];
      this.form.patchValue({ docenteId: String(this.docente.id) });
    }
  }

  onNivelChange(): void {
    this.form.patchValue({ gradoId: '' });
    this.loadGrados();
  }

  selectDocente(options: CatalogOptionResponse[]): void {
    this.selectedDocenteOptions = options;
    this.form.patchValue({ docenteId: options[0]?.id ?? '' });
  }

  submit(): void {
    this.apiError = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request: CreateUnidadRequest = {
      titulo: this.textValue('titulo'),
      gradoId: this.numberValue('gradoId'),
      areaId: this.numberValue('areaId'),
      docenteId: this.numberValue('docenteId'),
      fechaInicio: this.textValue('fechaInicio'),
      fechaFin: this.textValue('fechaFin'),
      contexto: this.textValue('contexto'),
    };

    this.loading = true;
    this.unidadesService.create(request).subscribe({
      next: (response) => {
        this.result = response;
        this.syncFromUnidad(response);
        this.unidadCreated.emit(response);
        this.loading = false;
      },
      error: (error: unknown) => {
        this.apiError = this.apiErrorService.toDisplayError(error);
        this.loading = false;
      },
    });
  }

  findUnidad(): void {
    this.lookupError = null;
    this.lookupResult = null;
    if (this.lookupForm.invalid) {
      this.lookupForm.markAllAsTouched();
      return;
    }

    this.lookupLoading = true;
    this.unidadesService.findById(Number(this.lookupForm.get('unidadId')?.value)).subscribe({
      next: (response) => {
        this.lookupResult = response;
        this.syncFromUnidad(response);
        this.unidadCreated.emit(response);
        this.lookupLoading = false;
      },
      error: (error: unknown) => {
        this.lookupError = this.apiErrorService.toDisplayError(error);
        this.lookupLoading = false;
      },
    });
  }

  fieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!field && field.invalid && (field.dirty || field.touched);
  }

  lookupInvalid(): boolean {
    const field = this.lookupForm.get('unidadId');
    return !!field && field.invalid && (field.dirty || field.touched);
  }

  formRangeInvalid(): boolean {
    return !!this.form.errors?.['dateRange'] && (this.form.dirty || this.form.touched);
  }

  errorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (!field?.errors) {
      return '';
    }
    if (field.errors['required'] || field.errors['blank']) {
      return 'Campo obligatorio.';
    }
    if (field.errors['positiveInteger']) {
      return 'Ingresa un ID numerico mayor a cero.';
    }
    if (field.errors['minlength']) {
      return 'Ingresa mas caracteres.';
    }
    if (field.errors['maxlength']) {
      return 'El texto excede el limite permitido.';
    }
    return 'Valor invalido.';
  }

  private textValue(fieldName: string): string {
    return String(this.form.get(fieldName)?.value ?? '').trim();
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

  private syncFromUnidad(unidad: UnidadResponse): void {
    this.form.patchValue({
      nivelId: String(unidad.nivelId),
      gradoId: String(unidad.gradoId),
      areaId: String(unidad.areaId),
      docenteId: String(unidad.docenteId),
    });
    this.selectedDocenteOptions = [{ id: String(unidad.docenteId), nombre: unidad.docenteNombre }];
    this.loadGrados();
  }

  private numberOrNull(fieldName: string): number | null {
    const value = Number(this.form.get(fieldName)?.value);
    return Number.isFinite(value) && value > 0 ? value : null;
  }
}
