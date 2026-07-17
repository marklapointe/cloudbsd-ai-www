import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EnvelopeClient } from '../protocol/envelope.client';
import { firstPayload } from '../protocol/envelope.types';
import { SessionData } from '../protocol/resource.types';
import { AuthSessionStore, SessionUser } from './auth-session.store';

export type { SessionUser };

/**
 * Auth client (Rule #2, #13).
 * Prefers WIRE envelope auth.login / session validate (mocks or future backend).
 * Falls back to legacy Express JWT POST /api/login when available.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly store = inject(AuthSessionStore);
  private readonly envelopes = inject(EnvelopeClient);

  private readonly frostedSignal = signal(false);
  private readonly readySignal = signal(false);

  readonly user = this.store.user;
  readonly frosted = this.frostedSignal.asReadonly();
  readonly ready = this.readySignal.asReadonly();
  readonly isAuthenticated = computed(() => this.store.isAuthenticated());

  private get api(): string {
    return `${environment.apiBaseUrl}${environment.apiPath}`;
  }

  async bootstrap(): Promise<void> {
    try {
      if (environment.useMocks) {
        // Restore mock session if we still have a session id from last visit.
        if (this.store.sessionId()) {
          const env = await this.envelopes.exchange({
            what: 'auth.session.validate',
            where: 'app_bootstrap',
          });
          const session = firstPayload<SessionData>(env, 'session')?.data;
          if (session) {
            this.applySession(session);
            return;
          }
        }
        this.store.clear();
        return;
      }

      // Legacy Express: JWT + /api/users/profile
      const token = this.store.bearerToken();
      if (token) {
        const profile = await firstValueFrom(
          this.http.get<{ id: number; username: string; role: string }>(
            `${this.api}/users/profile`,
            {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true,
            },
          ),
        );
        this.store.setUser({
          id: String(profile.id),
          username: profile.username,
          displayName: profile.username,
          role: profile.role,
        });
        return;
      }

      // Future: cookie session /auth/me
      try {
        const me = await firstValueFrom(
          this.http.get<SessionUser>(`${this.api}/auth/me`, { withCredentials: true }),
        );
        this.store.setUser(me);
      } catch {
        this.store.clear();
      }
    } catch {
      this.store.clear();
    } finally {
      this.readySignal.set(true);
    }
  }

  async login(username: string, password: string): Promise<void> {
    // Prefer envelope auth.login (mocks in-process or POST /api gateway)
    try {
      const env = await this.envelopes.exchange({
        what: 'auth.login',
        where: 'login_form',
        payload: [
          {
            mime: 'application/vnd.cloudbsd+credentials',
            kind: 'credentials',
            data: { username, password },
          },
        ],
      });
      if (env.mime?.includes('error')) {
        throw new Error('Login failed');
      }
      const session = firstPayload<SessionData>(env, 'session')?.data;
      if (session) {
        this.applySession(session);
        this.frostedSignal.set(false);
        await this.router.navigateByUrl('/dashboard');
        return;
      }
    } catch {
      /* try legacy */
    }

    // Legacy Express JWT POST /api/login
    try {
      const res = await firstValueFrom(
        this.http.post<{
          token: string;
          user: { id: number; username: string; role: string };
        }>(`${this.api}/login`, { username, password }, { withCredentials: true }),
      );
      this.store.setBearerToken(res.token);
      this.store.setUser({
        id: String(res.user.id),
        username: res.user.username,
        displayName: res.user.username,
        role: res.user.role,
      });
      this.frostedSignal.set(false);
      await this.router.navigateByUrl('/dashboard');
      return;
    } catch {
      throw new Error('Login failed');
    }
  }

  async logout(): Promise<void> {
    try {
      if (!environment.useMocks) {
        await firstValueFrom(
          this.http.post(`${this.api}/auth/logout`, {}, { withCredentials: true }),
        ).catch(() => undefined);
      }
    } finally {
      this.clearSessionAndFrost(false);
      await this.router.navigateByUrl('/login');
    }
  }

  /** Rule #2: session failure → frost → /login. */
  handleSessionFailure(): void {
    this.clearSessionAndFrost(true);
    void this.router.navigateByUrl('/login');
  }

  private applySession(session: SessionData & { bearerToken?: string }): void {
    this.store.setSessionId(session.sessionId);
    if (session.bearerToken) {
      this.store.setBearerToken(session.bearerToken);
    }
    this.store.setUser({
      id: session.userId,
      username: session.userId,
      displayName: session.displayName || session.userId,
      role: session.roles?.[0] || (session.isAdmin ? 'admin' : 'operator'),
    });
  }

  private clearSessionAndFrost(frost: boolean): void {
    this.store.clear();
    this.frostedSignal.set(frost);
  }
}
