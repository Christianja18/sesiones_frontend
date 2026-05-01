import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiErrorService } from '../../core/services/api-error.service';
import { CreateDocenteRequest, DisplayApiError, DocenteResponse } from '../../core/models/api.models';
import { notBlankValidator } from '../../core/validators/form.validators';
import { DocentesService } from './docentes.service';

@Component({
  selector: 'app-docentes',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './docentes.html',
  styleUrl: './docentes.css',
})
export class Docentes {
  @Output() docenteCreated = new EventEmitter<DocenteResponse>();

  private readonly fb = inject(FormBuilder);
  private readonly docentesService = inject(DocentesService);
  private readonly apiErrorService = inject(ApiErrorService);

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, notBlankValidator, Validators.minLength(3), Validators.maxLength(120)]],
    email: ['', [Validators.required, notBlankValidator, Validators.email, Validators.maxLength(160)]],
    institucion: ['', [Validators.required, notBlankValidator, Validators.minLength(3), Validators.maxLength(180)]],
  });

  loading = false;
  result: DocenteResponse | null = null;
  apiError: DisplayApiError | null = null;

  submit(): void {
    this.apiError = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request: CreateDocenteRequest = {
      nombre: this.textValue('nombre'),
      email: this.textValue('email').toLowerCase(),
      institucion: this.textValue('institucion'),
    };

    this.loading = true;
    this.docentesService.create(request).subscribe({
      next: (response) => {
        this.result = response;
        this.docenteCreated.emit(response);
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

  errorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (!field?.errors) {
      return '';
    }
    if (field.errors['required'] || field.errors['blank']) {
      return 'Campo obligatorio.';
    }
    if (field.errors['email']) {
      return 'Ingresa un email valido.';
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
}
