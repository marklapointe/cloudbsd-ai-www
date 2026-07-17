/**
 * CloudBSD envelope types — WIRE_PROTOCOL §1.
 * Canonical shapes for UI ↔ Admin backend exchanges.
 */

export type CloudBSDHeaderName =
  | 'who'
  | 'what'
  | 'why'
  | 'where'
  | 'when'
  | 'how'
  | 'if-match'
  | 'if-none-match'
  | 'idempotency-key';

export interface CloudBSDHeader {
  name: CloudBSDHeaderName;
  value: string;
}

export interface EnvelopeContext {
  userId?: string;
  sessionId?: string;
  traceId?: string;
  idempotencyKey?: string;
}

export interface PayloadItem<T = unknown> {
  mime: string;
  kind: string;
  action?: 'create' | 'read' | 'update' | 'delete' | 'list' | 'stream';
  version?: string;
  data: T;
  includes?: PayloadItem[];
}

export interface ErrorItem {
  type: string;
  severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';
  code: string;
  message: string;
  errorId: string;
  retryAfter?: number;
  context?: Record<string, unknown>;
}

export interface Envelope<P = unknown> {
  mime: 'application/vnd.cloudbsd+envelope' | 'application/vnd.cloudbsd+error';
  headers: CloudBSDHeader[];
  requestId: string;
  timestamp: string;
  context: EnvelopeContext;
  payload: PayloadItem<P>[];
  errors?: ErrorItem[];
  next?: string;
  meta?: {
    serverVersion?: string;
    deprecation?: string[];
    cacheHint?: 'no-cache' | 'max-age=60' | 'private';
  };
}

export const ENVELOPE_MIME = 'application/vnd.cloudbsd+envelope' as const;
export const ERROR_MIME = 'application/vnd.cloudbsd+error' as const;

export function headerValue(env: Envelope, name: CloudBSDHeaderName): string | undefined {
  return env.headers.find((h) => h.name === name)?.value;
}

export function firstPayload<T = unknown>(env: Envelope, kind?: string): PayloadItem<T> | undefined {
  const items = env.payload as PayloadItem<T>[];
  if (kind) {
    return items.find((p) => p.kind === kind);
  }
  return items[0];
}

export function uuidV4(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
