import { Injectable, computed, signal } from '@angular/core';

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
}

const TOKEN_KEY = 'cloudbsd.token';
const SESSION_KEY = 'cloudbsd.sessionId';

/**
 * Holds session identity + optional legacy JWT.
 * Separated from AuthService so EnvelopeClient can inject without cycles.
 */
@Injectable({ providedIn: 'root' })
export class AuthSessionStore {
  private readonly userSignal = signal<SessionUser | null>(null);
  private readonly sessionIdSignal = signal<string | null>(this.read(SESSION_KEY));
  private readonly tokenSignal = signal<string | null>(this.read(TOKEN_KEY));

  readonly user = this.userSignal.asReadonly();
  readonly sessionId = this.sessionIdSignal.asReadonly();
  readonly bearerToken = this.tokenSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);

  setUser(user: SessionUser | null): void {
    this.userSignal.set(user);
  }

  setSessionId(id: string | null): void {
    this.sessionIdSignal.set(id);
    this.write(SESSION_KEY, id);
  }

  setBearerToken(token: string | null): void {
    this.tokenSignal.set(token);
    this.write(TOKEN_KEY, token);
  }

  clear(): void {
    this.userSignal.set(null);
    this.sessionIdSignal.set(null);
    this.tokenSignal.set(null);
    this.write(SESSION_KEY, null);
    this.write(TOKEN_KEY, null);
  }

  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private write(key: string, value: string | null): void {
    try {
      if (value) {
        localStorage.setItem(key, value);
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      // private mode
    }
  }
}
