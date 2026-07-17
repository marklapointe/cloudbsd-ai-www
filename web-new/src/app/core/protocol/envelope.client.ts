import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CloudBSDHeader,
  ENVELOPE_MIME,
  Envelope,
  EnvelopeContext,
  PayloadItem,
  firstPayload,
  headerValue,
  uuidV4,
} from './envelope.types';
import { handleMockEnvelope } from './mock-handlers';
import { AuthSessionStore } from '../auth/auth-session.store';

export interface ExchangeOptions {
  what: string;
  why?: string;
  where: string;
  payload?: PayloadItem[];
  context?: Partial<EnvelopeContext>;
  /** Force mock even if useMocks is false (tests). */
  forceMock?: boolean;
}

/**
 * Envelope client — POST /api with CloudBSD MIME (WIRE §1).
 * Rule #13: only talks to Admin backend.
 * When useMocks, fulfills in-process (drop-in for future Go backend).
 */
@Injectable({ providedIn: 'root' })
export class EnvelopeClient {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSessionStore);

  async exchange<T = unknown>(opts: ExchangeOptions): Promise<Envelope<T>> {
    const request = this.buildRequest(opts);

    if (environment.useMocks || opts.forceMock) {
      // Simulate a tiny network delay for realism in UI.
      await delay(40);
      return handleMockEnvelope(request) as Envelope<T>;
    }

    const httpHeaders = this.toHttpHeaders(request);
    try {
      const res = await firstValueFrom(
        this.http.post<Envelope<T>>(`${environment.apiBaseUrl}${environment.apiPath}`, request, {
          headers: httpHeaders,
          withCredentials: true,
        }),
      );
      return res;
    } catch (err) {
      // Development fallback: if envelope endpoint is missing, use mocks.
      if (!environment.production) {
        console.warn('[EnvelopeClient] Backend envelope failed; using mocks.', err);
        return handleMockEnvelope(request) as Envelope<T>;
      }
      throw err;
    }
  }

  /** Convenience: first payload item of kind, or throw. */
  async exchangePayload<T>(opts: ExchangeOptions, kind: string): Promise<PayloadItem<T>> {
    const env = await this.exchange(opts);
    const item = firstPayload<T>(env, kind);
    if (!item) {
      throw new Error(`Envelope missing payload kind=${kind} (what=${opts.what})`);
    }
    return item;
  }

  buildRequest(opts: ExchangeOptions): Envelope {
    const user = this.session.user();
    const who = user?.username || user?.displayName || 'anonymous';
    const headers: CloudBSDHeader[] = [
      { name: 'who', value: who },
      { name: 'what', value: opts.what },
      { name: 'why', value: opts.why || 'user_requested' },
      { name: 'where', value: opts.where },
      { name: 'when', value: new Date().toISOString() },
      { name: 'how', value: 'http' },
    ];

    return {
      mime: ENVELOPE_MIME,
      requestId: uuidV4(),
      timestamp: new Date().toISOString(),
      context: {
        userId: user?.id || user?.username,
        sessionId: this.session.sessionId() || undefined,
        ...opts.context,
      },
      headers,
      payload: opts.payload || [],
    };
  }

  private toHttpHeaders(req: Envelope): HttpHeaders {
    let h = new HttpHeaders({
      'Content-Type': ENVELOPE_MIME,
      Accept: ENVELOPE_MIME,
    });
    for (const name of ['who', 'what', 'why', 'where', 'when', 'how'] as const) {
      const v = headerValue(req, name);
      if (v) {
        const title = name
          .split('-')
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join('-');
        h = h.set(`X-CloudBSD-${title}`, v);
      }
    }
    const token = this.session.bearerToken();
    if (token) {
      h = h.set('Authorization', `Bearer ${token}`);
    }
    return h;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
