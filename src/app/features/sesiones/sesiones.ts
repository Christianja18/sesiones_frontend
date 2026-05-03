import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import {
  CatalogOptionResponse,
  CurriculumContextResponse,
  DisplayApiError,
  GenerateSesionRequest,
  InstrumentoTipo,
  SaveSesionRequest,
  SesionResponse,
  TextoReferenciaResponse,
  UnidadResponse,
} from '../../core/models/api.models';
import { ApiErrorService } from '../../core/services/api-error.service';
import {
  enumValueValidator,
  integerList,
  notBlankValidator,
  positiveIntegerListValidator,
  positiveIntegerValidator,
  requiredLinesValidator,
  textLines,
} from '../../core/validators/form.validators';
import { CatalogPicker } from '../catalogos/catalog-picker';
import { CatalogosService } from '../catalogos/catalogos.service';
import { AppIcon } from '../../shared/icon/icon';
import { SesionesService } from './sesiones.service';

type GenerationMode = 'plantilla' | 'ia';

@Component({
  selector: 'app-sesiones',
  imports: [CommonModule, ReactiveFormsModule, CatalogPicker, AppIcon],
  templateUrl: './sesiones.html',
  styleUrl: './sesiones.css',
})
export class Sesiones implements OnInit, OnChanges {
  @Input() unidad: UnidadResponse | null = null;
  @Input() curriculum: CurriculumContextResponse | null = null;

  private readonly fb = inject(FormBuilder);
  private readonly sesionesService = inject(SesionesService);
  private readonly catalogosService = inject(CatalogosService);
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  readonly generationModes: { value: GenerationMode; label: string }[] = [
    { value: 'plantilla', label: 'Plantilla local' },
    { value: 'ia', label: 'IA' },
  ];

  readonly generateForm = this.fb.group({
    mode: ['plantilla', [Validators.required, enumValueValidator(['plantilla', 'ia'] as const)]],
    nivelId: ['', [Validators.required, positiveIntegerValidator]],
    gradoId: [{ value: '', disabled: true }, [Validators.required, positiveIntegerValidator]],
    areaId: [{ value: '', disabled: true }, [Validators.required, positiveIntegerValidator]],
    competenciaIds: [{ value: '', disabled: true }, [positiveIntegerListValidator(true)]],
    tema: ['', [Validators.required, notBlankValidator, Validators.minLength(4), Validators.maxLength(180)]],
    contexto: ['', [Validators.required, notBlankValidator, Validators.minLength(10), Validators.maxLength(1200)]],
    duracionMinutos: ['90', [Validators.required, positiveIntegerValidator, Validators.min(1), Validators.max(480)]],
    alternativa: ['', [positiveIntegerValidator, Validators.min(1), Validators.max(20)]],
  });

  readonly saveForm = this.fb.group({
    unidadId: ['', [Validators.required, positiveIntegerValidator]],
    fecha: ['', [Validators.required]],
    titulo: ['', [Validators.required, notBlankValidator, Validators.minLength(4), Validators.maxLength(180)]],
    proposito: ['', [Validators.required, notBlankValidator, Validators.minLength(10), Validators.maxLength(1500)]],
    duracionMinutos: ['90', [Validators.required, positiveIntegerValidator, Validators.min(1), Validators.max(480)]],
    generadoPorIa: [false],
    competenciaIds: ['', [positiveIntegerListValidator(true)]],
    capacidadIds: ['', [positiveIntegerListValidator(false)]],
    desempenoIds: ['', [positiveIntegerListValidator(false)]],
    inicio: ['', [requiredLinesValidator]],
    desarrollo: ['', [requiredLinesValidator]],
    cierre: ['', [requiredLinesValidator]],
    criteriosEvaluacion: ['', [requiredLinesValidator]],
    evidencias: ['', [requiredLinesValidator]],
    instrumentoTipo: ['rubrica', [Validators.required, enumValueValidator(['rubrica', 'lista_cotejo'] as const)]],
    instrumentoDetalle: ['', [requiredLinesValidator]],
  });

  readonly lookupForm = this.fb.group({
    sesionId: ['', [Validators.required, positiveIntegerValidator]],
  });

  generating = false;
  saving = false;
  lookupLoading = false;
  catalogLoading = true;
  niveles: CatalogOptionResponse[] = [];
  grados: CatalogOptionResponse[] = [];
  areas: CatalogOptionResponse[] = [];
  selectedGenerateCompetenciaOptions: CatalogOptionResponse[] = [];
  selectedSaveCompetencias: CatalogOptionResponse[] = [];
  selectedSaveCapacidades: CatalogOptionResponse[] = [];
  selectedSaveDesempenos: CatalogOptionResponse[] = [];
  draft: SesionResponse | null = null;
  generatedPlainText = '';
  saved: SesionResponse | null = null;
  lookupResult: SesionResponse | null = null;
  generateError: DisplayApiError | null = null;
  saveError: DisplayApiError | null = null;
  lookupError: DisplayApiError | null = null;
  catalogError: DisplayApiError | null = null;
  private catalogsReady = false;

  ngOnInit(): void {
    setTimeout(() => this.loadBaseCatalogs());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['unidad'] && this.unidad) {
      this.generateForm.patchValue({
        nivelId: String(this.unidad.nivelId),
        gradoId: String(this.unidad.gradoId),
        areaId: String(this.unidad.areaId),
        contexto: this.unidad.contexto,
      }, { emitEvent: false });
      this.saveForm.patchValue({ unidadId: String(this.unidad.id) });
      this.applyGenerateCatalogControlState();
      if (this.catalogsReady) {
        setTimeout(() => this.loadGrados());
      }
    }

    if (changes['curriculum'] && this.curriculum) {
      this.generateForm.patchValue({
        nivelId: String(this.curriculum.nivelId),
        gradoId: String(this.curriculum.gradoId),
        areaId: String(this.curriculum.areaId),
        competenciaIds: String(this.curriculum.competenciaId),
      }, { emitEvent: false });
      const competencia = {
        id: String(this.curriculum.competenciaId),
        nombre: this.curriculum.competenciaDescripcion,
      };
      this.selectedGenerateCompetenciaOptions = [competencia];
      this.selectedSaveCompetencias = [competencia];
      this.saveForm.patchValue({ competenciaIds: competencia.id });
      this.applyGenerateCatalogControlState();
    }
  }

  onGenerateNivelChange(): void {
    this.selectedGenerateCompetenciaOptions = [];
    this.selectedSaveCompetencias = [];
    this.selectedSaveCapacidades = [];
    this.selectedSaveDesempenos = [];
    this.generateForm.patchValue({ gradoId: '', areaId: '', competenciaIds: '' }, { emitEvent: false });
    this.saveForm.patchValue({ competenciaIds: '', capacidadIds: '', desempenoIds: '' });
    this.grados = [];
    this.applyGenerateCatalogControlState();
    if (this.generateHasSelected('nivelId')) {
      this.loadGrados();
    }
  }

  onGenerateGradoChange(): void {
    this.selectedGenerateCompetenciaOptions = [];
    this.selectedSaveCompetencias = [];
    this.selectedSaveCapacidades = [];
    this.selectedSaveDesempenos = [];
    this.generateForm.patchValue({ areaId: '', competenciaIds: '' }, { emitEvent: false });
    this.saveForm.patchValue({ competenciaIds: '', capacidadIds: '', desempenoIds: '' });
    this.applyGenerateCatalogControlState();
  }

  onGenerateAreaChange(): void {
    this.selectedGenerateCompetenciaOptions = [];
    this.selectedSaveCompetencias = [];
    this.selectedSaveCapacidades = [];
    this.selectedSaveDesempenos = [];
    this.generateForm.patchValue({ competenciaIds: '' }, { emitEvent: false });
    this.saveForm.patchValue({ competenciaIds: '', capacidadIds: '', desempenoIds: '' });
    this.applyGenerateCatalogControlState();
  }

  selectGenerateCompetencia(options: CatalogOptionResponse[]): void {
    this.selectedGenerateCompetenciaOptions = options;
    this.generateForm.patchValue({ competenciaIds: this.catalogIds(options) });
  }

  selectSaveCompetencias(options: CatalogOptionResponse[]): void {
    this.selectedSaveCompetencias = options;
    this.saveForm.patchValue({ competenciaIds: this.catalogIds(options) });
    this.selectedSaveCapacidades = [];
    this.selectedSaveDesempenos = [];
    this.saveForm.patchValue({ capacidadIds: '', desempenoIds: '' });
  }

  selectSaveCapacidades(options: CatalogOptionResponse[]): void {
    this.selectedSaveCapacidades = options;
    this.saveForm.patchValue({ capacidadIds: this.catalogIds(options) });
  }

  selectSaveDesempenos(options: CatalogOptionResponse[]): void {
    this.selectedSaveDesempenos = options;
    this.saveForm.patchValue({ desempenoIds: this.catalogIds(options) });
  }

  generateAreaId(): number | null {
    return this.numberOrNull(this.generateForm.get('areaId')?.value);
  }

  canSearchGenerateCompetencia(): boolean {
    return this.generateHasSelected('areaId') && this.generateForm.get('competenciaIds')?.enabled === true;
  }

  canGenerate(): boolean {
    return this.hasRequiredGenerateCatalogSelection() && this.generateForm.valid;
  }

  primarySaveCompetenciaId(): number | null {
    const option = this.selectedSaveCompetencias[0] ?? this.selectedGenerateCompetenciaOptions[0];
    return this.numberOrNull(option?.id ?? null);
  }

  saveAreaId(): number | null {
    return this.numberOrNull(this.unidad?.areaId ?? this.generateForm.get('areaId')?.value);
  }

  saveGradoId(): number | null {
    return this.numberOrNull(this.unidad?.gradoId ?? this.generateForm.get('gradoId')?.value);
  }

  generate(): void {
    this.generateError = null;
    this.draft = null;
    this.generatedPlainText = '';
    if (!this.hasRequiredGenerateCatalogSelection() || this.generateForm.invalid) {
      this.generateForm.markAllAsTouched();
      return;
    }

    const competenciaIds = integerList(this.generateForm.get('competenciaIds')?.value);
    const request: GenerateSesionRequest = {
      nivelId: this.generateNumberValue('nivelId'),
      gradoId: this.generateNumberValue('gradoId'),
      areaId: this.generateNumberValue('areaId'),
      competenciaId: competenciaIds[0],
      competenciaIds,
      tema: this.generateTextValue('tema'),
      contexto: this.generateTextValue('contexto'),
      duracionMinutos: this.generateNumberValue('duracionMinutos'),
    };

    const alternativa = this.generateTextValue('alternativa');
    if (alternativa) {
      request.alternativa = Number(alternativa);
    }

    const mode = this.generateForm.get('mode')?.value as GenerationMode;
    const request$ = mode === 'ia'
      ? this.sesionesService.generateWithIa(request)
      : this.sesionesService.generateWithTemplate(request);

    this.generating = true;
    request$.subscribe({
      next: (response) => {
        this.commitAsyncState(() => {
          this.draft = response;
          this.applyDraftToSaveForm(response);
          this.selectedGenerateCompetenciaOptions = this.referencesToOptions(response.competencias);
          this.generateForm.patchValue({ competenciaIds: this.referenceIds(response.competencias) }, { emitEvent: false });
          this.generatedPlainText = this.sessionToPlainText(response);
          this.generating = false;
        });
      },
      error: (error: unknown) => {
        this.commitAsyncState(() => {
          this.generateError = this.apiErrorService.toDisplayError(error);
          this.generating = false;
        });
      },
    });
  }

  save(): void {
    this.saveError = null;
    this.saved = null;
    if (this.saveForm.invalid) {
      this.saveForm.markAllAsTouched();
      return;
    }

    const request: SaveSesionRequest = {
      unidadId: this.saveNumberValue('unidadId'),
      fecha: this.saveTextValue('fecha'),
      titulo: this.saveTextValue('titulo'),
      proposito: this.saveTextValue('proposito'),
      duracionMinutos: this.saveNumberValue('duracionMinutos'),
      generadoPorIa: this.saveForm.get('generadoPorIa')?.value === true,
      competenciaIds: integerList(this.saveForm.get('competenciaIds')?.value),
      capacidadIds: integerList(this.saveForm.get('capacidadIds')?.value),
      desempenoIds: integerList(this.saveForm.get('desempenoIds')?.value),
      actividades: {
        inicio: textLines(this.saveForm.get('inicio')?.value),
        desarrollo: textLines(this.saveForm.get('desarrollo')?.value),
        cierre: textLines(this.saveForm.get('cierre')?.value),
      },
      criteriosEvaluacion: textLines(this.saveForm.get('criteriosEvaluacion')?.value),
      evidencias: textLines(this.saveForm.get('evidencias')?.value),
      instrumentoEvaluacion: {
        tipo: this.saveTextValue('instrumentoTipo') as InstrumentoTipo,
        detalle: textLines(this.saveForm.get('instrumentoDetalle')?.value),
      },
    };

    this.saving = true;
    this.sesionesService.save(request).subscribe({
      next: (response) => {
        this.commitAsyncState(() => {
          this.saved = response;
          this.saving = false;
        });
      },
      error: (error: unknown) => {
        this.commitAsyncState(() => {
          this.saveError = this.apiErrorService.toDisplayError(error);
          this.saving = false;
        });
      },
    });
  }

  findSesion(): void {
    this.lookupError = null;
    this.lookupResult = null;
    if (this.lookupForm.invalid) {
      this.lookupForm.markAllAsTouched();
      return;
    }

    this.lookupLoading = true;
    this.sesionesService.findById(Number(this.lookupForm.get('sesionId')?.value)).subscribe({
      next: (response) => {
        this.commitAsyncState(() => {
          this.lookupResult = response;
          this.lookupLoading = false;
        });
      },
      error: (error: unknown) => {
        this.commitAsyncState(() => {
          this.lookupError = this.apiErrorService.toDisplayError(error);
          this.lookupLoading = false;
        });
      },
    });
  }

  generateFieldInvalid(fieldName: string): boolean {
    const field = this.generateForm.get(fieldName);
    return !!field && field.invalid && (field.dirty || field.touched);
  }

  saveFieldInvalid(fieldName: string): boolean {
    const field = this.saveForm.get(fieldName);
    return !!field && field.invalid && (field.dirty || field.touched);
  }

  lookupInvalid(): boolean {
    const field = this.lookupForm.get('sesionId');
    return !!field && field.invalid && (field.dirty || field.touched);
  }

  simpleError(formName: 'generate' | 'save', fieldName: string): string {
    const field = formName === 'generate'
      ? this.generateForm.get(fieldName)
      : this.saveForm.get(fieldName);
    if (!field?.errors) {
      return '';
    }
    if (field.errors['required'] || field.errors['blank'] || field.errors['requiredList']) {
      return 'Campo obligatorio.';
    }
    if (field.errors['positiveInteger'] || field.errors['positiveIntegerList']) {
      return 'Usa numeros enteros mayores a cero.';
    }
    if (field.errors['enumValue']) {
      return 'Selecciona una opcion valida.';
    }
    if (field.errors['min'] || field.errors['max']) {
      return 'Valor fuera del rango permitido.';
    }
    if (field.errors['minlength']) {
      return 'Ingresa mas caracteres.';
    }
    if (field.errors['maxlength']) {
      return 'El texto excede el limite permitido.';
    }
    return 'Valor invalido.';
  }

  totalActivities(session: SesionResponse): number {
    return session.actividades.inicio.length + session.actividades.desarrollo.length + session.actividades.cierre.length;
  }

  private applyDraftToSaveForm(response: SesionResponse): void {
    this.selectedSaveCompetencias = this.referencesToOptions(response.competencias);
    this.selectedSaveCapacidades = this.referencesToOptions(response.capacidades);
    this.selectedSaveDesempenos = this.referencesToOptions(response.desempenos);

    this.saveForm.patchValue({
      titulo: response.titulo,
      proposito: response.proposito,
      duracionMinutos: String(response.duracionMinutos),
      generadoPorIa: response.generadoPorIa,
      competenciaIds: this.referenceIds(response.competencias),
      capacidadIds: this.referenceIds(response.capacidades),
      desempenoIds: this.referenceIds(response.desempenos),
      inicio: response.actividades.inicio.join('\n'),
      desarrollo: response.actividades.desarrollo.join('\n'),
      cierre: response.actividades.cierre.join('\n'),
      criteriosEvaluacion: response.criteriosEvaluacion.join('\n'),
      evidencias: response.evidencias.join('\n'),
      instrumentoTipo: response.instrumentoEvaluacion?.tipo ?? 'rubrica',
      instrumentoDetalle: response.instrumentoEvaluacion?.detalle.join('\n') ?? '',
    });
  }

  private referenceIds(references: TextoReferenciaResponse[]): string {
    return references.map((item) => item.id).join(', ');
  }

  private referencesToOptions(references: TextoReferenciaResponse[]): CatalogOptionResponse[] {
    return references.map((item) => ({
      id: String(item.id),
      nombre: item.descripcion,
    }));
  }

  private sessionToPlainText(session: SesionResponse): string {
    const lines: string[] = [];
    this.pushValue(lines, 'Titulo', session.titulo);
    this.pushValue(lines, 'Proposito', session.proposito);
    this.pushValue(lines, 'Duracion', `${session.duracionMinutos} min`);

    this.pushSection(lines, 'Competencias', this.referenceDescriptions(session.competencias));
    this.pushSection(lines, 'Capacidades', this.referenceDescriptions(session.capacidades));
    this.pushSection(lines, 'Estandares', this.referenceDescriptions(session.estandares));
    this.pushSection(lines, 'Desempeños', this.referenceDescriptions(session.desempenos));
    this.pushSection(lines, 'Inicio', session.actividades.inicio);
    this.pushSection(lines, 'Desarrollo', session.actividades.desarrollo);
    this.pushSection(lines, 'Cierre', session.actividades.cierre);
    this.pushSection(lines, 'Criterios de evaluacion', session.criteriosEvaluacion);
    this.pushSection(lines, 'Evidencias', session.evidencias);

    if (session.instrumentoEvaluacion) {
      this.pushValue(lines, 'Instrumento de evaluacion', this.instrumentoLabel(session.instrumentoEvaluacion.tipo));
      this.pushSection(lines, 'Detalle de instrumento', session.instrumentoEvaluacion.detalle);
    }

    return lines.join('\n').trim();
  }

  private pushValue(lines: string[], label: string, value: string | null | undefined): void {
    const text = String(value ?? '').trim();
    if (!text) {
      return;
    }
    if (lines.length) {
      lines.push('');
    }
    lines.push(`${label}: ${text}`);
  }

  private pushSection(lines: string[], title: string, values: string[]): void {
    const cleanValues = values.map((value) => value.trim()).filter(Boolean);
    if (!cleanValues.length) {
      return;
    }
    if (lines.length) {
      lines.push('');
    }
    lines.push(`${title}:`);
    lines.push(...cleanValues.map((value) => `- ${value}`));
  }

  private referenceDescriptions(references: TextoReferenciaResponse[]): string[] {
    return references.map((item) => item.descripcion);
  }

  private instrumentoLabel(tipo: InstrumentoTipo): string {
    return tipo === 'lista_cotejo' ? 'Lista de cotejo' : 'Rubrica';
  }

  private catalogIds(options: CatalogOptionResponse[]): string {
    return options.map((option) => option.id).join(', ');
  }

  private generateTextValue(fieldName: string): string {
    return String(this.generateForm.get(fieldName)?.value ?? '').trim();
  }

  private generateNumberValue(fieldName: string): number {
    return Number(this.generateForm.get(fieldName)?.value);
  }

  private saveTextValue(fieldName: string): string {
    return String(this.saveForm.get(fieldName)?.value ?? '').trim();
  }

  private saveNumberValue(fieldName: string): number {
    return Number(this.saveForm.get(fieldName)?.value);
  }

  private loadBaseCatalogs(): void {
    this.catalogLoading = true;
    this.catalogError = null;
    forkJoin({
      niveles: this.catalogosService.niveles(),
      areas: this.catalogosService.areas(),
    }).subscribe({
      next: ({ niveles, areas }) => {
        this.commitAsyncState(() => {
          this.niveles = niveles;
          this.areas = areas;
          this.catalogsReady = true;
          this.catalogLoading = false;
          this.applyGenerateCatalogControlState();
          if (this.generateHasSelected('nivelId')) {
            this.loadGrados();
          }
        });
      },
      error: (error: unknown) => {
        this.commitAsyncState(() => {
          this.catalogError = this.apiErrorService.toDisplayError(error);
          this.catalogLoading = false;
          this.applyGenerateCatalogControlState();
        });
      },
    });
  }

  private loadGrados(): void {
    const nivelId = this.numberOrNull(this.generateForm.get('nivelId')?.value);
    if (!nivelId) {
      this.grados = [];
      this.applyGenerateCatalogControlState();
      return;
    }

    this.catalogLoading = true;
    this.setGenerateControlDisabled('gradoId', true);
    this.catalogosService.grados(nivelId).subscribe({
      next: (grados) => {
        this.commitAsyncState(() => {
          if (this.numberOrNull(this.generateForm.get('nivelId')?.value) === nivelId) {
            this.grados = grados;
          }
          this.catalogLoading = false;
          this.applyGenerateCatalogControlState();
        });
      },
      error: (error: unknown) => {
        this.commitAsyncState(() => {
          this.catalogError = this.apiErrorService.toDisplayError(error);
          this.catalogLoading = false;
          this.applyGenerateCatalogControlState();
        });
      },
    });
  }

  private numberOrNull(value: unknown): number | null {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
  }

  private generateHasSelected(fieldName: string): boolean {
    return this.numberOrNull(this.generateForm.get(fieldName)?.value) !== null;
  }

  private hasRequiredGenerateCatalogSelection(): boolean {
    return this.generateHasSelected('nivelId')
      && this.generateHasSelected('gradoId')
      && this.generateHasSelected('areaId')
      && integerList(this.generateForm.get('competenciaIds')?.value).length > 0;
  }

  private applyGenerateCatalogControlState(): void {
    const hasNivel = this.generateHasSelected('nivelId');
    const hasGrado = this.generateHasSelected('gradoId');
    const hasArea = this.generateHasSelected('areaId');

    this.setGenerateControlDisabled('gradoId', !hasNivel || this.catalogLoading);
    this.setGenerateControlDisabled('areaId', !hasNivel || !hasGrado);
    this.setGenerateControlDisabled('competenciaIds', !hasNivel || !hasGrado || !hasArea);
  }

  private setGenerateControlDisabled(fieldName: string, disabled: boolean): void {
    const control = this.generateForm.get(fieldName);
    if (disabled) {
      control?.disable({ emitEvent: false });
      return;
    }
    control?.enable({ emitEvent: false });
  }

  private commitAsyncState(applyState: () => void): void {
    setTimeout(() => {
      applyState();
      this.changeDetectorRef.detectChanges();
    });
  }
}
