import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map, switchMap, tap } from 'rxjs';

import { AuthSessionService } from '../../core/auth/auth-session.service';
import { DisplayApiError, LoginRequest } from '../../core/models/api.models';
import { ApiErrorService } from '../../core/services/api-error.service';
import { AppIcon } from '../../shared/icon/icon';
import { notBlankValidator } from '../../core/validators/form.validators';
import { LoginService } from './login.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, AppIcon],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  @Output() loggedIn = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly loginService = inject(LoginService);
  private readonly authSession = inject(AuthSessionService);
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  readonly form = this.fb.group({
    email: ['', [Validators.required, notBlankValidator, Validators.email, Validators.maxLength(160)]],
    password: ['', [Validators.required, notBlankValidator, Validators.minLength(8), Validators.maxLength(72)]],
  });

  loading = false;
  apiError: DisplayApiError | null = null;

  submit(): void {
    this.apiError = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request: LoginRequest = {
      email: this.textValue('email').toLowerCase(),
      password: this.textValue('password'),
    };

    this.loading = true;
    this.loginService.csrf().pipe(
      tap((csrf) => this.authSession.setCsrfToken(csrf)),
      switchMap(() => this.loginService.login(request)),
      switchMap((response) => this.loginService.csrf().pipe(map((csrf) => ({ response, csrf })))),
    ).subscribe({
      next: ({ response, csrf }) => {
        this.commitAsyncState(() => {
          this.authSession.setSession(response);
          this.authSession.setCsrfToken(csrf);
          this.loading = false;
          this.loggedIn.emit();
          this.form.reset();
        });
      },
      error: (error: unknown) => {
        this.commitAsyncState(() => {
          this.apiError = this.apiErrorService.toDisplayError(error);
          this.loading = false;
        });
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
      return 'La clave debe tener al menos 8 caracteres.';
    }
    if (field.errors['maxlength']) {
      return 'La clave no debe exceder 72 caracteres.';
    }
    return 'Valor invalido.';
  }

  private textValue(fieldName: string): string {
    return String(this.form.get(fieldName)?.value ?? '').trim();
  }

  private commitAsyncState(applyState: () => void): void {
    setTimeout(() => {
      applyState();
      this.changeDetectorRef.detectChanges();
    });
  }
}
