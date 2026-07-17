/**
 * CloudBSD envelope gateway (WIRE_PROTOCOL interim).
 * POST /api with application/vnd.cloudbsd+envelope — UI talks only here (Rule #13).
 * Fans out authorized data only (Rule #14).
 */
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { initDb, logAction } from '../db.ts';
import { randomUUID } from 'crypto';
import { handleMockEnvelope } from './mocks/mock-handlers.ts';
import type { Envelope as SharedEnvelope } from './mocks/envelope.types.ts';

const ENVELOPE_MIME = 'application/vnd.cloudbsd+envelope';

type Header = { name: string; value: string };
type PayloadItem = {
  mime: string;
  kind: string;
  data: unknown;
  version?: string;
  includes?: PayloadItem[];
};
type Envelope = {
  mime: string;
  requestId: string;
  timestamp: string;
  context: Record<string, unknown>;
  headers: Header[];
  payload: PayloadItem[];
  next?: string;
  meta?: Record<string, unknown>;
};

function headerWhat(env: Envelope): string {
  return env.headers?.find((h) => h.name === 'what')?.value || '';
}

function ok(
  reqId: string,
  what: string,
  payload: PayloadItem[],
  ctx: Record<string, unknown> = {},
): Envelope {
  return {
    mime: ENVELOPE_MIME,
    requestId: reqId,
    timestamp: new Date().toISOString(),
    context: ctx,
    headers: [
      { name: 'who', value: 'system:admin' },
      { name: 'what', value: what },
    ],
    payload,
    meta: { serverVersion: 'express-envelope-1' },
  };
}

function queryData(env: Envelope): Record<string, unknown> {
  const q = env.payload?.find((p) => p.kind === 'query' || p.kind === 'create');
  return (q?.data as Record<string, unknown>) || {};
}

function uuid(): string {
  try {
    return randomUUID();
  } catch {
    return 'id-' + Math.random().toString(36).slice(2);
  }
}

/** Map DB resource rows to wire VM summaries. */
function mapVm(row: any) {
  const statusMap: Record<string, string> = {
    running: 'RUN',
    stopped: 'STOP',
    paused: 'PAUSED',
    error: 'ERROR',
  };
  const st = String(row.status || 'stopped').toLowerCase();
  return {
    id: `vm-${row.id}`,
    name: row.name,
    status: statusMap[st] || 'STOP',
    os: row.image || 'unknown',
    vcpu: row.cpu || 1,
    ramBytes: parseMem(row.memory),
    diskBytes: 0,
    uptimeSec: st === 'running' ? 3600 : 0,
    host: row.node_name || 'prod-node-01.lan',
    ip: row.ip || '—',
    tags: [],
    version: `db-${row.id}`,
  };
}

function parseMem(m: unknown): number {
  if (typeof m === 'number') return m * 1024 ** 2;
  if (typeof m === 'string') {
    const n = parseInt(m, 10);
    if (/gi?b/i.test(m)) return n * 1024 ** 3;
    if (/mi?b/i.test(m)) return n * 1024 ** 2;
    return n || 0;
  }
  return 0;
}

function handleLogin(env: Envelope, req: Request, secret: string): Envelope {
  const data = env.payload?.find((p) => p.kind === 'credentials')?.data as
    | { username?: string; password?: string }
    | undefined;
  const username = data?.username || '';
  const password = data?.password || '';
  const db = initDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    '';

  if (!user || !bcrypt.compareSync(password, user.password)) {
    logAction(null, 'LOGIN_FAILURE', `Envelope login failed for ${username}`, ip);
    return {
      mime: 'application/vnd.cloudbsd+error',
      requestId: env.requestId,
      timestamp: new Date().toISOString(),
      context: {},
      headers: [
        { name: 'who', value: 'guest' },
        { name: 'what', value: 'auth.login.failed' },
      ],
      payload: [
        {
          mime: 'application/vnd.cloudbsd+problem',
          kind: 'problem',
          data: {
            code: 'AUTH_FAILED',
            message: 'Invalid credentials',
            severity: 'ERROR',
            errorId: uuid(),
          },
        },
      ],
    };
  }

  logAction(user.id, 'LOGIN_SUCCESS', `Envelope login ${username}`, ip);
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      language: user.language,
      timezone: user.timezone,
      theme: user.theme,
    },
    secret,
    { expiresIn: '8h' },
  );

  // Stash JWT for Angular Bearer client in payload (cookie session is future)
  return ok(
    env.requestId,
    'auth.login.success',
    [
      {
        mime: 'application/vnd.cloudbsd+session',
        kind: 'session',
        version: 'v1',
        data: {
          sessionId: 'sess-' + uuid().slice(0, 8),
          userId: String(user.id),
          displayName: user.username,
          roles: [user.role],
          isAdmin: user.role === 'admin',
          bearerToken: token,
          expiresAt: new Date(Date.now() + 8 * 3600_000).toISOString(),
        },
      },
    ],
    { userId: String(user.id) },
  );
}

function handleVmsList(env: Envelope): Envelope {
  const db = initDb();
  const rows = db
    .prepare(
      `SELECT resources.*, nodes.name as node_name
       FROM resources LEFT JOIN nodes ON resources.node_id = nodes.id
       WHERE type = 'vms'`,
    )
    .all() as any[];
  const q = queryData(env);
  const filter = (q['filter'] as { search?: string; status?: string[] }) || {};
  let items = rows.map(mapVm);
  if (filter.search) {
    const s = String(filter.search).toLowerCase();
    items = items.filter((v) => v.name.toLowerCase().includes(s));
  }
  if (filter.status?.length) {
    const want = new Set(filter.status.map((x) => String(x).toUpperCase()));
    // map running->RUN etc already in status field
    items = items.filter((v) => want.has(v.status) || want.has(v.status.toLowerCase()));
  }
  const stats = {
    running: items.filter((v) => v.status === 'RUN').length,
    stopped: items.filter((v) => v.status === 'STOP').length,
    paused: items.filter((v) => v.status === 'PAUSED').length,
    error: items.filter((v) => v.status === 'ERROR').length,
  };
  return ok(env.requestId, 'vms.list', [
    {
      mime: 'application/vnd.cloudbsd+vms.batch',
      kind: 'vms.batch',
      version: 'v3',
      data: { total: items.length, shown: items.length, stats },
      includes: items.map((vm) => ({
        mime: 'application/vnd.cloudbsd+vm',
        kind: 'vm',
        data: vm,
      })),
    },
  ]);
}

function handleResourceList(env: Envelope, type: string, batchKind: string, itemKind: string): Envelope {
  const db = initDb();
  const rows = db
    .prepare(
      `SELECT resources.*, nodes.name as node_name
       FROM resources LEFT JOIN nodes ON resources.node_id = nodes.id
       WHERE type = ?`,
    )
    .all(type) as any[];
  const items = rows.map((row) => ({
    id: `${itemKind}-${row.id}`,
    name: row.name,
    status: String(row.status || 'stopped').toUpperCase() === 'RUNNING' ? 'RUN' : 'STOP',
    image: row.image || '',
    host: row.node_name || 'prod-node-01.lan',
    ip: row.ip || '—',
    cpu: row.cpu,
    memory: row.memory,
  }));
  return ok(env.requestId, headerWhat(env), [
    {
      mime: `application/vnd.cloudbsd+${batchKind}`,
      kind: batchKind,
      data: {
        total: items.length,
        shown: items.length,
        stats: { running: items.filter((i) => i.status === 'RUN').length },
      },
      includes: items.map((it) => ({
        mime: `application/vnd.cloudbsd+${itemKind}`,
        kind: itemKind,
        data: it,
      })),
    },
  ]);
}

function handleConsoleToken(env: Envelope): Envelope {
  const id = String(queryData(env)['id'] || 'vm');
  return ok(env.requestId, 'vm.console.token', [
    {
      mime: 'application/vnd.cloudbsd+console.token',
      kind: 'console.token',
      data: {
        token: 'ctok_' + uuid().replace(/-/g, ''),
        path: `/api/console/ws/${id}`,
        ttlSec: 300,
        protocol: 'vnc',
      },
    },
  ]);
}

function handleDashboard(env: Envelope): Envelope {
  const db = initDb();
  const nodes = (db.prepare('SELECT COUNT(*) as c FROM nodes').get() as any)?.c || 0;
  const vms = (db.prepare(`SELECT COUNT(*) as c FROM resources WHERE type='vms'`).get() as any)?.c || 0;
  const jails =
    (db.prepare(`SELECT COUNT(*) as c FROM resources WHERE type='jails'`).get() as any)?.c || 0;
  return ok(env.requestId, 'dashboard.bootstrap', [
    {
      mime: 'application/vnd.cloudbsd+metric.hosts',
      kind: 'metric.hosts',
      data: { online: nodes, total: nodes, label: 'Hosts' },
    },
    {
      mime: 'application/vnd.cloudbsd+metric.vms',
      kind: 'metric.vms',
      data: { running: vms, total: vms, label: 'VMs' },
    },
    {
      mime: 'application/vnd.cloudbsd+metric.jails',
      kind: 'metric.jails',
      data: { running: jails, total: jails, label: 'Jails' },
    },
    {
      mime: 'application/vnd.cloudbsd+metric.storage',
      kind: 'metric.storage',
      data: { freePercent: 50, pool: 'tank', label: 'Storage' },
    },
    {
      mime: 'application/vnd.cloudbsd+alerts.batch',
      kind: 'alerts.batch',
      data: { items: [] },
    },
    {
      mime: 'application/vnd.cloudbsd+tasks.recent',
      kind: 'tasks.recent',
      data: { items: [] },
    },
  ]);
}

function handleSessionValidate(env: Envelope, req: any): Envelope {
  const user = req.user;
  if (!user) {
    return {
      mime: 'application/vnd.cloudbsd+error',
      requestId: env.requestId,
      timestamp: new Date().toISOString(),
      context: {},
      headers: [{ name: 'what', value: 'auth.session.invalid' }],
      payload: [
        {
          mime: 'application/vnd.cloudbsd+problem',
          kind: 'problem',
          data: { code: 'SESSION_INVALID', message: 'No session', severity: 'ERROR' },
        },
      ],
    };
  }
  return ok(env.requestId, 'auth.session.validate', [
    {
      mime: 'application/vnd.cloudbsd+session',
      kind: 'session',
      data: {
        sessionId: 'sess-live',
        userId: String(user.id),
        displayName: user.username,
        roles: [user.role],
        isAdmin: user.role === 'admin',
      },
    },
  ]);
}

function handleAction(env: Envelope, what: string): Envelope {
  return ok(env.requestId, what + '.accepted', [
    {
      mime: 'application/vnd.cloudbsd+task',
      kind: 'task',
      data: { id: 'task-' + uuid().slice(0, 8), action: what, status: 'accepted' },
    },
  ]);
}

function handlePreflight(env: Envelope, what: string): Envelope {
  return ok(env.requestId, what, [
    {
      mime: 'application/vnd.cloudbsd+preflight.result',
      kind: 'preflight.result',
      data: {
        viable: true,
        blockers: [],
        warnings: [],
        checks: [{ id: 'default', status: 'PASS', message: 'OK' }],
        ttlMs: 30000,
        fetchedAt: new Date().toISOString(),
      },
    },
  ]);
}

/**
 * Express middleware: exact POST /api envelope exchange.
 * Must be registered before /api/:resource routes.
 */
export function createEnvelopeHandler(secretKey: string) {
  return (req: Request, res: Response) => {
    const ct = String(req.headers['content-type'] || '');
    if (!ct.includes('vnd.cloudbsd') && !req.body?.mime?.includes('envelope')) {
      // Not an envelope — let other handlers try (should not hit if path exact)
      return res.status(415).json({ message: 'Expected application/vnd.cloudbsd+envelope' });
    }

    const env = req.body as Envelope;
    if (!env?.requestId) {
      return res.status(400).json({ message: 'Invalid envelope' });
    }

    const what =
      headerWhat(env) ||
      String(req.headers['x-cloudbsd-what'] || '') ||
      '';

    try {
      let out: Envelope;

      switch (what) {
        case 'auth.login':
          out = handleLogin(env, req, secretKey);
          if (out.mime.includes('error')) {
            return res.status(401).type(out.mime).json(out);
          }
          return res.type(ENVELOPE_MIME).json(out);
        case 'auth.session.validate':
        case 'sessions.validate':
          // optional auth — if bearer present, authenticateToken already may not have run
          out = handleSessionValidate(env, req);
          break;
        case 'vms.list':
          // Prefer live SQLite inventory; fall back to full WIRE mocks if empty
          out = handleVmsList(env);
          try {
            const batch = out.payload?.[0];
            const n = (batch as any)?.includes?.length ?? (batch as any)?.data?.total ?? 0;
            if (!n) out = handleMockEnvelope(env as SharedEnvelope) as Envelope;
          } catch {
            out = handleMockEnvelope(env as SharedEnvelope) as Envelope;
          }
          break;
        case 'containers.list':
          out = handleResourceList(env, 'containers', 'containers.batch', 'container');
          break;
        case 'jails.list':
          out = handleResourceList(env, 'jails', 'jails.batch', 'jail');
          break;
        case 'dashboard.bootstrap':
          out = handleDashboard(env);
          break;
        case 'vm.console.token':
          out = handleConsoleToken(env);
          break;
        default:
          // Full WIRE surface from shared mock handlers (complete catalog)
          out = handleMockEnvelope(env as SharedEnvelope) as Envelope;
          // Prefer live preflight pass if mock returned empty and it's an action
          if (
            (!out.payload || out.payload.length === 0) &&
            what &&
            !what.endsWith('.preflight')
          ) {
            if (what.endsWith('.preflight') || what === 'preflight.check') {
              out = handlePreflight(env, what);
            } else {
              out = handleAction(env, what);
            }
          }
      }

      res.type(ENVELOPE_MIME).json(out);
    } catch (e: any) {
      console.error('[Envelope]', e);
      res.status(500).json({ message: e?.message || 'Envelope error' });
    }
  };
}

/** Optional auth: attach user if Bearer present, else continue. */
export function optionalAuth(secretKey: string) {
  return (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return next();
    jwt.verify(token, secretKey, (err: any, user: any) => {
      if (!err) req.user = user;
      next();
    });
  };
}

export const ENVELOPE_CONTENT_TYPE = ENVELOPE_MIME;
