import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  DisplayApiError,
  DocumentoCurriculoResponse,
  DocumentoCurriculoTipo,
  RegisterDocumentoCurriculoRequest,
} from '../../core/models/api.models';
import { ApiErrorService } from '../../core/services/api-error.service';
import {
  enumValueValidator,
  httpUrlValidator,
  notBlankValidator,
  pdfFileNameValidator,
  positiveIntegerValidator,
} from '../../core/validators/form.validators';
import { DocumentosCurriculoService } from './documentos-curriculo.service';

@Component({
  selector: 'app-documentos-curriculo',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './documentos-curriculo.html',
  styleUrl: './documentos-curriculo.css',
})
export class DocumentosCurriculo {
  private readonly fb = inject(FormBuilder);
  private readonly documentosService = inject(DocumentosCurriculoService);
  private readonly apiErrorService = inject(ApiErrorService);

  readonly form = this.fb.group({
    tipo: ['curriculo', [Validators.required, enumValueValidator(['curriculo', 'programa'] as const)]],
    nombreArchivo: ['', [Validators.required, notBlankValidator, pdfFileNameValidator, Validators.maxLength(255)]],
    archivoUrl: ['', [Validators.required, notBlankValidator, httpUrlValidator, Validators.maxLength(500)]],
  });

  readonly lookupForm = this.fb.group({
    documentoId: ['', [Validators.required, positiveIntegerValidator]],
  });

  loading = false;
  processing = false;
  lookupLoading = false;
  result: DocumentoCurriculoResponse | null = null;
  apiError: DisplayApiError | null = null;
  processError: DisplayApiError | null = null;
  lookupError: DisplayApiError | null = null;

  submit(): void {
    this.apiError = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request: RegisterDocumentoCurriculoRequest = {
      tipo: this.textValue('tipo') as DocumentoCurriculoTipo,
      nombreArchivo: this.textValue('nombreArchivo'),
      archivoUrl: this.textValue('archivoUrl'),
    };

    this.loading = true;
    this.documentosService.create(request).subscribe({
      next: (response) => {
        this.result = response;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.apiError = this.apiErrorService.toDisplayError(error);
        this.loading = false;
      },
    });
  }

  processCurrent(): void {
    this.processError = null;
    if (!this.result?.id) {
      return;
    }

    this.processing = true;
    this.documentosService.process(this.result.id).subscribe({
      next: (response) => {
        this.result = response;
        this.processing = false;
      },
      error: (error: unknown) => {
        this.processError = this.apiErrorService.toDisplayError(error);
        this.processing = false;
      },
    });
  }

  findDocumento(): void {
    this.lookupError = null;
    if (this.lookupForm.invalid) {
      this.lookupForm.markAllAsTouched();
      return;
    }

    this.lookupLoading = true;
    this.documentosService.findById(Number(this.lookupForm.get('documentoId')?.value)).subscribe({
      next: (response) => {
        this.result = response;
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
    const field = this.lookupForm.get('documentoId');
    return !!field && field.invalid && (field.dirty || field.touched);
  }

  errorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (!field?.errors) {
      return '';
    }
    if (field.errors['required'] || field.errors['blank']) {
      return 'Campo obligatorio.';
    }
    if (field.errors['enumValue']) {
      return 'Selecciona una opcion valida.';
    }
    if (field.errors['pdfFileName']) {
      return 'El nombre debe terminar en .pdf.';
    }
    if (field.errors['httpUrl']) {
      return 'Usa una URL http o https valida.';
    }
    if (field.errors['maxlength']) {
      return 'El texto excede el limite permitido.';
    }
    return 'Valor invalido.';
  }

  private textValue(fieldName: string): string {
    return String(this.form.get(fieldName)?.value ?? '').trim();
  }
}
