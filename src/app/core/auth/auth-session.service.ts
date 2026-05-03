import { Injectable, computed, signal } from '@angular/core';

import { AuthUserResponse, CsrfTokenResponse, LoginResponse } from '../models/api.models';

interface AuthSessionState {
  expiresAt: number | null;
  docente: AuthUserResponse;
}

interface CsrfHeaderState {
  name: string;
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly state = signal<AuthSessionState | null>(null);
  private readonly csrfState = signal<CsrfHeaderState | null>(null);
  private logoutTimer: ReturnType<typeof setTimeout> | null = null;

  readonly user = computed(() => this.state()?.docente ?? null);
  readonly isAuthenticated = computed(() => this.state() !== null);
  readonly isAdmin = computed(() => this.user()?.rol === 'ADMIN');

  setSession(response: LoginResponse): void {
    const expiresInMs = Math.max(response.expiresInSeconds, 1) * 1000;

    this.clearLogoutTimer();
    this.state.set({
      expiresAt: Date.now() + expiresInMs,
      docente: response.docente,
    });
    this.logoutTimer = setTimeout(() => this.logout(), expiresInMs);
  }

  setUser(docente: AuthUserResponse): void {
    this.clearLogoutTimer();
    this.state.set({
      expiresAt: null,
      docente,
    });
  }

  setCsrfToken(response: CsrfTokenResponse): void {
    const name = response.headerName?.trim();
    const token = response.token?.trim();
    if (!name || !token) {
      this.csrfState.set(null);
      return;
    }
    this.csrfState.set({ name, token });
  }

  csrfHeader(): CsrfHeaderState | null {
    return this.csrfState();
  }

  ensureActiveSession(): boolean {
    const expiresAt = this.state()?.expiresAt;
    if (expiresAt !== null && expiresAt !== undefined && Date.now() >= expiresAt) {
      this.logout();
      return false;
    }
    return this.state() !== null;
  }

  hasRole(role: string): boolean {
    return this.user()?.rol === role;
  }

  logout(): void {
    this.clearLogoutTimer();
    this.state.set(null);
    this.csrfState.set(null);
  }

  private clearLogoutTimer(): void {
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }
  }
}
