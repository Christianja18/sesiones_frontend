import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';

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
    gradoId: [{ value: '', disabled: true }, [Validators.required, positiveIntegerValidator]],
    areaId: [{ value: '', disabled: true }, [Validators.required, positiveIntegerValidator]],
    competenciaId: [{ value: '', disabled: true }, [Validators.required, positiveIntegerValidator]],
  });

  loading = false;
  catalogLoading = true;
  niveles: CatalogOptionResponse[] = [];
  grados: CatalogOptionResponse[] = [];
  areas: CatalogOptionResponse[] = [];
  selectedCompetenciaOptions: CatalogOptionResponse[] = [];
  context: CurriculumContextResponse | null = null;
  apiError: DisplayApiError | null = null;
  catalogError: DisplayApiError | null = null;
  private catalogsReady = false;

  ngOnInit(): void {
    setTimeout(() => this.loadBaseCatalogs());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['unidad'] && this.unidad) {
      this.form.patchValue({
        nivelId: String(this.unidad.nivelId),
        gradoId: String(this.unidad.gradoId),
        areaId: String(this.unidad.areaId),
      }, { emitEvent: false });
      this.applyCatalogControlState();
      if (this.catalogsReady) {
        setTimeout(() => this.loadGrados());
      }
    }
  }

  onNivelChange(): void {
    this.selectedCompetenciaOptions = [];
    this.form.patchValue({ gradoId: '', areaId: '', competenciaId: '' }, { emitEvent: false });
    this.grados = [];
    this.applyCatalogControlState();
    if (this.hasSelected('nivelId')) {
      this.loadGrados();
    }
  }

  onGradoChange(): void {
    this.selectedCompetenciaOptions = [];
    this.form.patchValue({ areaId: '', competenciaId: '' }, { emitEvent: false });
    this.applyCatalogControlState();
  }

  onAreaChange(): void {
    this.selectedCompetenciaOptions = [];
    this.form.patchValue({ competenciaId: '' }, { emitEvent: false });
    this.applyCatalogControlState();
  }

  selectCompetencia(options: CatalogOptionResponse[]): void {
    this.selectedCompetenciaOptions = options;
    this.form.patchValue({ competenciaId: options[0]?.id ?? '' });
  }

  selectedAreaId(): number | null {
    return this.numberOrNull('areaId');
  }

  canSearchCompetencia(): boolean {
    return this.hasSelected('areaId') && this.form.get('competenciaId')?.enabled === true;
  }

  canSubmit(): boolean {
    return this.hasRequiredCatalogSelection() && this.form.valid;
  }

  submit(): void {
    this.apiError = null;
    this.context = null;
    if (!this.hasRequiredCatalogSelection() || this.form.invalid) {
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
    forkJoin({
      niveles: this.catalogosService.niveles(),
      areas: this.catalogosService.areas(),
    }).subscribe({
      next: ({ niveles, areas }) => {
        this.niveles = niveles;
        this.areas = areas;
        this.catalogsReady = true;
        this.catalogLoading = false;
        this.applyCatalogControlState();
        if (this.hasSelected('nivelId')) {
          this.loadGrados();
        }
      },
      error: (error: unknown) => {
        this.catalogError = this.apiErrorService.toDisplayError(error);
        this.catalogLoading = false;
        this.applyCatalogControlState();
      },
    });
  }

  private loadGrados(): void {
    const nivelId = this.numberOrNull('nivelId');
    if (!nivelId) {
      this.grados = [];
      this.applyCatalogControlState();
      return;
    }

    this.catalogLoading = true;
    this.setControlDisabled('gradoId', true);
    this.catalogosService.grados(nivelId).pipe(
      finalize(() => {
        this.catalogLoading = false;
        this.applyCatalogControlState();
      }),
    ).subscribe({
      next: (grados) => {
        if (this.numberOrNull('nivelId') !== nivelId) {
          return;
        }
        this.grados = grados;
      },
      error: (error: unknown) => {
        this.catalogError = this.apiErrorService.toDisplayError(error);
      },
    });
  }

  private numberOrNull(fieldName: string): number | null {
    const value = Number(this.form.get(fieldName)?.value);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  private hasSelected(fieldName: string): boolean {
    return this.numberOrNull(fieldName) !== null;
  }

  private hasRequiredCatalogSelection(): boolean {
    return this.hasSelected('nivelId')
      && this.hasSelected('gradoId')
      && this.hasSelected('areaId')
      && this.hasSelected('competenciaId');
  }

  private applyCatalogControlState(): void {
    const hasNivel = this.hasSelected('nivelId');
    const hasGrado = this.hasSelected('gradoId');
    const hasArea = this.hasSelected('areaId');

    this.setControlDisabled('gradoId', !hasNivel || this.catalogLoading);
    this.setControlDisabled('areaId', !hasNivel || !hasGrado);
    this.setControlDisabled('competenciaId', !hasNivel || !hasGrado || !hasArea);
  }

  private setControlDisabled(fieldName: string, disabled: boolean): void {
    const control = this.form.get(fieldName);
    if (disabled) {
      control?.disable({ emitEvent: false });
      return;
    }
    control?.enable({ emitEvent: false });
  }
}
