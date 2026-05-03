import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { finalize, map, switchMap } from 'rxjs';

import { AuthSessionService } from './core/auth/auth-session.service';
import { AuthUserResponse, CurriculumContextResponse, DocenteResponse, UnidadResponse } from './core/models/api.models';
import { Curriculum } from './features/curriculum/curriculum';
import { Docentes } from './features/docentes/docentes';
import { DocumentosCurriculo } from './features/documentos-curriculo/documentos-curriculo';
import { Login } from './features/login/login';
import { LoginService } from './features/login/login.service';
import { Sesiones } from './features/sesiones/sesiones';
import { Unidades } from './features/unidades/unidades';
import { AppIcon, AppIconName } from './shared/icon/icon';

type AppFrameKey = 'docentes' | 'unidades' | 'curriculum' | 'sesiones' | 'documentos';

interface AppFrame {
  key: AppFrameKey;
  label: string;
  marker: string;
  icon: AppIconName;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Login, Docentes, Unidades, Curriculum, Sesiones, DocumentosCurriculo, AppIcon],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly session = inject(AuthSessionService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly loginService = inject(LoginService);
  protected readonly frames: AppFrame[] = [
    { key: 'docentes', label: 'Docente', marker: '01', icon: 'user' },
    { key: 'unidades', label: 'Unidad', marker: '02', icon: 'unit' },
    { key: 'curriculum', label: 'Curriculo', marker: '03', icon: 'book' },
    { key: 'sesiones', label: 'Sesion', marker: '04', icon: 'session' },
    { key: 'documentos', label: 'Documentos', marker: '05', icon: 'files' },
  ];

  protected activeFrame: AppFrameKey = 'docentes';
  protected currentDocente: DocenteResponse | null = null;
  protected currentUnidad: UnidadResponse | null = null;
  protected currentContext: CurriculumContextResponse | null = null;
  protected authChecking = true;

  ngOnInit(): void {
    this.restoreSession();
  }

  protected availableFrames(): AppFrame[] {
    return this.frames.filter((frame) => this.canAccessFrame(frame.key));
  }

  protected canAccessFrame(frame: AppFrameKey): boolean {
    if (frame === 'docentes' || frame === 'documentos') {
      return this.session.isAdmin();
    }
    return this.session.isAuthenticated();
  }

  protected selectFrame(frame: AppFrameKey): void {
    if (this.canAccessFrame(frame)) {
      this.activeFrame = frame;
    }
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

  protected handleLoggedIn(): void {
    this.currentDocente = this.toDocenteResponse(this.session.user());
    this.currentUnidad = null;
    this.currentContext = null;
    this.activeFrame = this.session.isAdmin() ? 'docentes' : 'unidades';
  }

  protected logout(): void {
    this.loginService.logout().pipe(
      finalize(() => this.clearClientSession()),
    ).subscribe({
      error: () => {
        // La salida local no debe quedar bloqueada si el backend no responde.
      },
    });
  }

  private restoreSession(): void {
    this.loginService.me().pipe(
      switchMap((user) => this.loginService.csrf().pipe(map((csrf) => ({ user, csrf })))),
    ).subscribe({
      next: ({ user, csrf }) => {
        this.finishRestoreSession(() => {
          this.session.setUser(user);
          this.session.setCsrfToken(csrf);
          this.handleLoggedIn();
        });
      },
      error: () => {
        this.finishRestoreSession(() => this.clearClientSession());
      },
    });
  }

  private finishRestoreSession(applyState: () => void): void {
    setTimeout(() => {
      applyState();
      this.authChecking = false;
      this.changeDetectorRef.detectChanges();
    });
  }

  private clearClientSession(): void {
    this.session.logout();
    this.currentDocente = null;
    this.currentUnidad = null;
    this.currentContext = null;
    this.activeFrame = 'docentes';
  }

  private toDocenteResponse(user: AuthUserResponse | null): DocenteResponse | null {
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      institucionId: 0,
      institucion: '',
    };
  }
}
