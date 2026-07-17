/**
 * In-browser mock envelope handlers (WIRE_PROTOCOL §3).
 * Sample hostnames use *.lan (Rule #7).
 */

import {
  ENVELOPE_MIME,
  uuidV4,
} from './envelope.types';
import type { Envelope, PayloadItem } from './envelope.types';
import {
  MOCK_CONTAINERS,
  MOCK_HOSTS,
  MOCK_JAILS,
  MOCK_NOTIFICATIONS,
  MOCK_TASKS,
  MOCK_VMS,
  MOCK_VOLUMES,
} from './mock-data';
import type { PreflightResult } from './preflight.types';
import type {
  ContainersBatch,
  HostsBatch,
  JailsBatch,
  SessionData,
  TasksBatch,
  VmsBatch,
  VolumesBatch,
} from './resource.types';

function okEnvelope(
  requestId: string,
  what: string,
  payload: PayloadItem[],
  next?: string,
): Envelope {
  return {
    mime: ENVELOPE_MIME,
    requestId,
    timestamp: new Date().toISOString(),
    context: { userId: 'admin', sessionId: 'sess-mock' },
    headers: [
      { name: 'who', value: 'system:mock' },
      { name: 'what', value: what },
    ],
    payload,
    next,
    meta: { serverVersion: '0.0.0+mock' },
  };
}

function queryFilter(req: Envelope): {
  search?: string;
  status?: string[];
} {
  const query = req.payload.find((p) => p.kind === 'query')?.data as
    | { filter?: { status?: string[] | null; search?: string } }
    | undefined;
  return {
    search: query?.filter?.search?.trim().toLowerCase() || undefined,
    status: query?.filter?.status || undefined,
  };
}

function handleLogin(req: Envelope): Envelope {
  const creds = req.payload.find((p) => p.kind === 'credentials')?.data as
    | { username?: string; password?: string }
    | undefined;
  const username = creds?.username || 'admin';
  const session: SessionData = {
    sessionId: 'sess-mock-' + uuidV4().slice(0, 8),
    userId: username,
    email: `${username}@example.lan`,
    displayName: username === 'admin' ? 'Admin' : username,
    groups: ['wheel', 'admins'],
    roles: ['admin'],
    isAdmin: true,
    totpEnrolled: false,
    expiresAt: new Date(Date.now() + 8 * 3600_000).toISOString(),
    idleTimeoutSec: 1800,
  };
  return okEnvelope(req.requestId, 'auth.login.success', [
    {
      mime: 'application/vnd.cloudbsd+session',
      kind: 'session',
      version: 'v1',
      data: session,
    },
  ]);
}

function handleSessionValidate(req: Envelope): Envelope {
  return okEnvelope(req.requestId, 'auth.session.validate', [
    {
      mime: 'application/vnd.cloudbsd+session',
      kind: 'session',
      version: 'v1',
      data: {
        sessionId: 'sess-mock',
        userId: 'admin',
        displayName: 'Admin',
        roles: ['admin'],
        isAdmin: true,
        expiresAt: new Date(Date.now() + 8 * 3600_000).toISOString(),
      } satisfies SessionData,
    },
  ]);
}

function handleVmsList(req: Envelope): Envelope {
  const { search, status } = queryFilter(req);
  let rows = [...MOCK_VMS];
  if (search) {
    rows = rows.filter((v) => v.name.toLowerCase().includes(search));
  }
  if (status?.length) {
    const map: Record<string, string> = {
      running: 'RUN',
      stopped: 'STOP',
      paused: 'PAUSED',
      error: 'ERROR',
      RUN: 'RUN',
      STOP: 'STOP',
      PAUSED: 'PAUSED',
      ERROR: 'ERROR',
    };
    const wanted = new Set(status.map((s) => map[s] || s));
    rows = rows.filter((v) => wanted.has(v.status));
  }
  const batch: VmsBatch = {
    total: rows.length,
    shown: rows.length,
    stats: {
      running: MOCK_VMS.filter((v) => v.status === 'RUN').length,
      stopped: MOCK_VMS.filter((v) => v.status === 'STOP').length,
      paused: MOCK_VMS.filter((v) => v.status === 'PAUSED').length,
      error: MOCK_VMS.filter((v) => v.status === 'ERROR').length,
    },
  };
  return okEnvelope(req.requestId, 'vms.list', [
    {
      mime: 'application/vnd.cloudbsd+vms.batch',
      kind: 'vms.batch',
      version: 'v3',
      data: batch,
      includes: rows.map((vm) => ({
        mime: 'application/vnd.cloudbsd+vm',
        kind: 'vm',
        version: 'v1',
        data: vm,
      })),
    },
  ]);
}

function queryId(req: Envelope): string {
  return (
    (req.payload.find((p) => p.kind === 'query')?.data as { id?: string })?.id ||
    (req.payload.find((p) => p.kind === 'create')?.data as { id?: string })?.id ||
    ''
  );
}

function handleVmGet(req: Envelope): Envelope {
  const id = queryId(req);
  const vm = MOCK_VMS.find((v) => v.id === id) || MOCK_VMS[0];
  return okEnvelope(req.requestId, 'vm.get', [
    {
      mime: 'application/vnd.cloudbsd+vm',
      kind: 'vm',
      version: 'v1',
      data: vm,
      includes: [
        {
          mime: 'application/vnd.cloudbsd+vm.disks',
          kind: 'vm.disks',
          data: {
            disks: [
              {
                name: 'disk0',
                path: `tank/vms/${vm.name}`,
                sizeBytes: vm.diskBytes,
                type: 'zvol',
              },
            ],
          },
        },
        {
          mime: 'application/vnd.cloudbsd+vm.nics',
          kind: 'vm.nics',
          data: {
            nics: [{ name: 'vtnet0', bridge: 'vm-public', mac: '58:9c:fc:00:1a:2b', ip: vm.ip }],
          },
        },
        {
          mime: 'application/vnd.cloudbsd+vm.snapshots',
          kind: 'vm.snapshots',
          data: {
            snapshots: [
              {
                id: 'snap-1',
                name: `${vm.name}@daily-2026-07-15`,
                createdAt: '2026-07-15T02:00:00Z',
                sizeBytes: 2_147_483_648,
              },
              {
                id: 'snap-2',
                name: `${vm.name}@pre-upgrade`,
                createdAt: '2026-07-10T18:00:00Z',
                sizeBytes: 1_073_741_824,
              },
            ],
          },
        },
      ],
    },
  ]);
}

function handleResourceGet(
  req: Envelope,
  what: string,
  kind: string,
  list: { id: string }[],
): Envelope {
  const id = queryId(req);
  const row = list.find((r) => r.id === id) || list[0];
  return okEnvelope(req.requestId, what, [
    {
      mime: `application/vnd.cloudbsd+${kind}`,
      kind,
      data: row,
    },
  ]);
}

function handleCreate(req: Envelope, what: string): Envelope {
  const data = (req.payload.find((p) => p.kind === 'create')?.data || {}) as Record<
    string,
    unknown
  >;
  const name = String(data['name'] || 'resource');
  const id = `${what.split('.')[0]}-${name}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  return okEnvelope(req.requestId, what + '.accepted', [
    {
      mime: 'application/vnd.cloudbsd+created',
      kind: 'created',
      data: { id, name, ...data },
    },
    {
      mime: 'application/vnd.cloudbsd+task',
      kind: 'task',
      data: { id: 'task-' + uuidV4().slice(0, 8), action: what, status: 'accepted' },
    },
  ]);
}

function handleConsoleToken(req: Envelope): Envelope {
  const id = queryId(req) || 'vm';
  const token = 'ctok_' + uuidV4().replace(/-/g, '');
  return okEnvelope(req.requestId, 'vm.console.token', [
    {
      mime: 'application/vnd.cloudbsd+console.token',
      kind: 'console.token',
      data: {
        token,
        path: `/api/console/ws/${id}`,
        ttlSec: 300,
        // Backend websockify — never guest IP
        protocol: 'vnc',
      },
    },
  ]);
}

function handleBackupsList(req: Envelope): Envelope {
  return okEnvelope(req.requestId, 'backups.list', [
    {
      mime: 'application/vnd.cloudbsd+backups.batch',
      kind: 'backups.batch',
      data: {
        items: [
          {
            id: 'bk-1',
            name: 'nextcloud-daily',
            resource: 'vm-nextcloud',
            takenAt: '2026-07-15',
            sizeLabel: '12 GiB',
          },
          {
            id: 'bk-2',
            name: 'jellyfin-weekly',
            resource: 'vm-jellyfin',
            takenAt: '2026-07-12',
            sizeLabel: '48 GiB',
          },
          {
            id: 'bk-3',
            name: 'tank-data-snap',
            resource: 'tank/data',
            takenAt: '2026-07-14',
            sizeLabel: '2.1 GiB',
          },
        ],
      },
    },
  ]);
}

function handleContainersList(req: Envelope): Envelope {
  const { search, status } = queryFilter(req);
  let rows = [...MOCK_CONTAINERS];
  if (search) {
    rows = rows.filter((c) => c.name.toLowerCase().includes(search));
  }
  if (status?.length) {
    const map: Record<string, string> = {
      running: 'RUN',
      exited: 'EXITED',
      paused: 'PAUSED',
      RUN: 'RUN',
      EXITED: 'EXITED',
      PAUSED: 'PAUSED',
    };
    const wanted = new Set(status.map((s) => map[s] || s));
    rows = rows.filter((c) => wanted.has(c.status));
  }
  const batch: ContainersBatch = {
    total: rows.length,
    shown: rows.length,
    stats: {
      running: MOCK_CONTAINERS.filter((c) => c.status === 'RUN').length,
      exited: MOCK_CONTAINERS.filter((c) => c.status === 'EXITED').length,
      paused: MOCK_CONTAINERS.filter((c) => c.status === 'PAUSED').length,
    },
  };
  return okEnvelope(req.requestId, 'containers.list', [
    {
      mime: 'application/vnd.cloudbsd+containers.batch',
      kind: 'containers.batch',
      data: batch,
      includes: rows.map((c) => ({
        mime: 'application/vnd.cloudbsd+container',
        kind: 'container',
        data: c,
      })),
    },
  ]);
}

function handleJailsList(req: Envelope): Envelope {
  const { search, status } = queryFilter(req);
  let rows = [...MOCK_JAILS];
  if (search) {
    rows = rows.filter((j) => j.name.toLowerCase().includes(search));
  }
  if (status?.length) {
    const map: Record<string, string> = {
      running: 'RUN',
      stopped: 'STOP',
      frozen: 'FROZEN',
      RUN: 'RUN',
      STOP: 'STOP',
      FROZEN: 'FROZEN',
    };
    const wanted = new Set(status.map((s) => map[s] || s));
    rows = rows.filter((j) => wanted.has(j.status));
  }
  const batch: JailsBatch = {
    total: rows.length,
    shown: rows.length,
    stats: {
      running: MOCK_JAILS.filter((j) => j.status === 'RUN').length,
      stopped: MOCK_JAILS.filter((j) => j.status === 'STOP').length,
      frozen: MOCK_JAILS.filter((j) => j.status === 'FROZEN').length,
    },
  };
  return okEnvelope(req.requestId, 'jails.list', [
    {
      mime: 'application/vnd.cloudbsd+jails.batch',
      kind: 'jails.batch',
      data: batch,
      includes: rows.map((j) => ({
        mime: 'application/vnd.cloudbsd+jail',
        kind: 'jail',
        data: j,
      })),
    },
  ]);
}

function handleVolumesList(req: Envelope): Envelope {
  const { search } = queryFilter(req);
  let rows = [...MOCK_VOLUMES];
  if (search) {
    rows = rows.filter((v) => v.name.toLowerCase().includes(search));
  }
  const batch: VolumesBatch = {
    total: rows.length,
    shown: rows.length,
    stats: {
      healthy: MOCK_VOLUMES.filter((v) => v.health === 'healthy').length,
      watch: MOCK_VOLUMES.filter((v) => v.health === 'watch').length,
      encrypted: MOCK_VOLUMES.filter((v) => v.encryption !== 'off').length,
    },
  };
  return okEnvelope(req.requestId, 'volumes.list', [
    {
      mime: 'application/vnd.cloudbsd+volumes.batch',
      kind: 'volumes.batch',
      data: batch,
      includes: rows.map((v) => ({
        mime: 'application/vnd.cloudbsd+volume',
        kind: 'volume',
        data: v,
      })),
    },
  ]);
}

function handleHostsList(req: Envelope): Envelope {
  const { search, status } = queryFilter(req);
  let rows = [...MOCK_HOSTS];
  if (search) {
    rows = rows.filter((h) => h.name.toLowerCase().includes(search));
  }
  if (status?.length) {
    const wanted = new Set(status.map((s) => s.toLowerCase()));
    rows = rows.filter((h) => wanted.has(h.status));
  }
  const batch: HostsBatch = {
    total: rows.length,
    shown: rows.length,
    stats: {
      online: MOCK_HOSTS.filter((h) => h.status === 'online').length,
      offline: MOCK_HOSTS.filter((h) => h.status === 'offline').length,
      draining: MOCK_HOSTS.filter((h) => h.status === 'draining').length,
    },
  };
  return okEnvelope(req.requestId, 'hosts.list', [
    {
      mime: 'application/vnd.cloudbsd+hosts.batch',
      kind: 'hosts.batch',
      data: batch,
      includes: rows.map((h) => ({
        mime: 'application/vnd.cloudbsd+host',
        kind: 'host',
        data: h,
      })),
    },
  ]);
}

function handleTasksList(req: Envelope): Envelope {
  const { search, status } = queryFilter(req);
  let rows = [...MOCK_TASKS];
  if (search) {
    rows = rows.filter((t) => t.name.toLowerCase().includes(search));
  }
  if (status?.length) {
    const wanted = new Set(status.map((s) => s.toLowerCase()));
    rows = rows.filter((t) => wanted.has(t.status));
  }
  const batch: TasksBatch = {
    total: rows.length,
    shown: rows.length,
    stats: {
      running: MOCK_TASKS.filter((t) => t.status === 'running').length,
      queued: MOCK_TASKS.filter((t) => t.status === 'queued').length,
      failed: MOCK_TASKS.filter((t) => t.status === 'failed').length,
    },
  };
  return okEnvelope(req.requestId, 'tasks.list', [
    {
      mime: 'application/vnd.cloudbsd+tasks.batch',
      kind: 'tasks.batch',
      data: batch,
      includes: rows.map((t) => ({
        mime: 'application/vnd.cloudbsd+task',
        kind: 'task',
        data: t,
      })),
    },
  ]);
}

function handleNotificationsList(req: Envelope): Envelope {
  return okEnvelope(req.requestId, 'notifications.list', [
    {
      mime: 'application/vnd.cloudbsd+notifications.batch',
      kind: 'notifications.batch',
      data: {
        total: MOCK_NOTIFICATIONS.length,
        unread: MOCK_NOTIFICATIONS.filter((n) => !n.read).length,
        items: MOCK_NOTIFICATIONS,
      },
    },
  ]);
}

function handleNetworksList(req: Envelope): Envelope {
  const { search } = queryFilter(req);
  type NetStatus = 'up' | 'down' | 'degraded';
  let items: {
    id: string;
    name: string;
    type: 'bridge' | 'vlan' | 'lagg' | 'pool';
    cidr: string;
    vlan?: number;
    hosts: number;
    status: NetStatus;
  }[] = [
    {
      id: 'net-public',
      name: 'vm-public',
      type: 'bridge',
      cidr: '10.0.10.0/24',
      vlan: 10,
      hosts: 12,
      status: 'up',
    },
    {
      id: 'net-storage',
      name: 'storage',
      type: 'vlan',
      cidr: '10.0.20.0/24',
      vlan: 20,
      hosts: 2,
      status: 'up',
    },
    {
      id: 'net-lagg0',
      name: 'lagg0',
      type: 'lagg',
      cidr: '—',
      hosts: 0,
      status: 'degraded',
    },
    {
      id: 'pool-mgmt',
      name: 'mgmt-pool',
      type: 'pool',
      cidr: '10.0.10.100-10.0.10.200',
      hosts: 8,
      status: 'up',
    },
  ];
  if (search) {
    items = items.filter((n) => n.name.toLowerCase().includes(search));
  }
  return okEnvelope(req.requestId, 'networks.list', [
    {
      mime: 'application/vnd.cloudbsd+networks.batch',
      kind: 'networks.batch',
      data: {
        total: items.length,
        shown: items.length,
        stats: {
          up: items.filter((n) => n.status === 'up').length,
          down: items.filter((n) => n.status === 'down').length,
          pools: items.filter((n) => n.type === 'pool').length,
        },
      },
      includes: items.map((n) => ({
        mime: 'application/vnd.cloudbsd+network',
        kind: 'network',
        data: n,
      })),
    },
  ]);
}

function handleLibraryBases(req: Envelope): Envelope {
  return okEnvelope(req.requestId, 'library.bases.list', [
    {
      mime: 'application/vnd.cloudbsd+library.bases.batch',
      kind: 'library.bases.batch',
      data: {
        items: [
          {
            id: 'base-14.2',
            name: 'base-14.2-RELEASE',
            version: '14.2-RELEASE',
            arch: 'amd64',
            sizeBytes: 2147483648,
            cachedAt: '2026-07-01T12:00:00Z',
            sourceRepo: 'official',
          },
          {
            id: 'base-14.1',
            name: 'base-14.1-RELEASE',
            version: '14.1-RELEASE',
            arch: 'amd64',
            sizeBytes: 2040109465,
            cachedAt: '2026-05-15T12:00:00Z',
            sourceRepo: 'official',
          },
        ],
      },
    },
  ]);
}

function handleLibraryRepos(req: Envelope): Envelope {
  return okEnvelope(req.requestId, 'library.repos.list', [
    {
      mime: 'application/vnd.cloudbsd+library.repos.batch',
      kind: 'library.repos.batch',
      data: {
        items: [
          {
            id: 'repo-official',
            name: 'official',
            url: 'https://download.example.lan/base/',
            auth: 'none',
            status: 'ok',
            lastProbe: new Date().toISOString(),
          },
          {
            id: 'repo-internal',
            name: 'internal-mirror',
            url: 'https://pkg.example.lan/FreeBSD/',
            auth: 'bearer',
            status: 'ok',
            lastProbe: new Date().toISOString(),
          },
        ],
      },
    },
  ]);
}

function handleMcpList(req: Envelope): Envelope {
  return okEnvelope(req.requestId, 'mcp.list', [
    {
      mime: 'application/vnd.cloudbsd+mcp.batch',
      kind: 'mcp.batch',
      data: {
        items: [
          {
            id: 'mcp-fs',
            name: 'filesystem',
            transport: 'stdio',
            endpoint: 'mcp-server-fs',
            status: 'healthy',
            tools: 12,
            lastProbe: new Date().toISOString(),
          },
          {
            id: 'mcp-gh',
            name: 'github',
            transport: 'http',
            endpoint: 'https://mcp.example.lan/github',
            status: 'healthy',
            tools: 28,
            lastProbe: new Date().toISOString(),
          },
          {
            id: 'mcp-custom',
            name: 'ops-tools',
            transport: 'sse',
            endpoint: 'https://ops.example.lan/mcp/sse',
            status: 'degraded',
            tools: 5,
            lastProbe: new Date(Date.now() - 600_000).toISOString(),
          },
        ],
      },
    },
  ]);
}

function handleClusterStatus(req: Envelope): Envelope {
  return okEnvelope(req.requestId, 'cluster.status', [
    {
      mime: 'application/vnd.cloudbsd+cluster.status',
      kind: 'cluster.status',
      data: {
        cards: [
          { label: 'Quorum', value: '3/3', hint: 'Healthy' },
          { label: 'VIP', value: '10.0.10.1', hint: 'CARP master prod-node-01' },
          { label: 'Replication', value: 'ok', hint: 'Last 2m ago' },
          { label: 'Jobs', value: '2', hint: 'Running' },
        ],
        services: [
          { name: 'control-api', status: 'healthy' },
          { name: 'stream-gateway', status: 'healthy' },
          { name: 'scheduler', status: 'healthy' },
          { name: 'replication', status: 'degraded' },
        ],
        events: [
          {
            id: '1',
            title: 'prod-node-02 joined quorum',
            ts: new Date(Date.now() - 3600_000).toISOString(),
          },
          {
            id: '2',
            title: 'edge-node-01 entered drain',
            ts: new Date(Date.now() - 7200_000).toISOString(),
          },
        ],
      },
    },
  ]);
}

function handleUsersList(req: Envelope): Envelope {
  const { search } = queryFilter(req);
  let items = [
    {
      id: 'u1',
      username: 'admin',
      displayName: 'Admin',
      role: 'admin',
      status: 'active' as const,
      lastLogin: new Date().toISOString(),
      mfa: true,
    },
    {
      id: 'u2',
      username: 'operator',
      displayName: 'Ops User',
      role: 'operator',
      status: 'active' as const,
      lastLogin: new Date(Date.now() - 86400_000).toISOString(),
      mfa: false,
    },
    {
      id: 'u3',
      username: 'auditor',
      displayName: 'Auditor',
      role: 'viewer',
      status: 'active' as const,
      lastLogin: new Date(Date.now() - 604800_000).toISOString(),
      mfa: true,
    },
    {
      id: 'u4',
      username: 'ci-bot',
      displayName: 'CI Bot',
      role: 'operator',
      status: 'disabled' as const,
      mfa: false,
    },
  ];
  if (search) {
    items = items.filter(
      (u) =>
        u.username.toLowerCase().includes(search) ||
        u.displayName.toLowerCase().includes(search),
    );
  }
  return okEnvelope(req.requestId, 'users.list', [
    {
      mime: 'application/vnd.cloudbsd+users.batch',
      kind: 'users.batch',
      data: { items },
    },
  ]);
}

function handleDashboard(req: Envelope): Envelope {
  return okEnvelope(req.requestId, 'dashboard.bootstrap', [
    {
      mime: 'application/vnd.cloudbsd+metric.hosts',
      kind: 'metric.hosts',
      data: {
        online: MOCK_HOSTS.filter((h) => h.status === 'online').length,
        total: MOCK_HOSTS.length,
        label: 'Hosts',
      },
    },
    {
      mime: 'application/vnd.cloudbsd+metric.vms',
      kind: 'metric.vms',
      data: {
        running: MOCK_VMS.filter((v) => v.status === 'RUN').length,
        total: MOCK_VMS.length,
        label: 'VMs',
      },
    },
    {
      mime: 'application/vnd.cloudbsd+metric.jails',
      kind: 'metric.jails',
      data: {
        running: MOCK_JAILS.filter((j) => j.status === 'RUN').length,
        total: MOCK_JAILS.length,
        label: 'Jails',
      },
    },
    {
      mime: 'application/vnd.cloudbsd+metric.storage',
      kind: 'metric.storage',
      data: { freePercent: 58, pool: 'tank', label: 'Storage' },
    },
    {
      mime: 'application/vnd.cloudbsd+alerts.batch',
      kind: 'alerts.batch',
      data: {
        items: MOCK_NOTIFICATIONS.filter((n) => !n.read).map((n) => ({
          id: n.id,
          severity: n.severity,
          message: n.message,
          ts: n.ts,
        })),
      },
    },
    {
      mime: 'application/vnd.cloudbsd+tasks.recent',
      kind: 'tasks.recent',
      data: {
        items: MOCK_TASKS.slice(0, 3).map((t) => ({
          id: t.id,
          name: t.name,
          status: t.status,
          finishedAt: t.finishedAt,
        })),
      },
    },
  ]);
}

function handleActionPreflight(req: Envelope, what: string): Envelope {
  const body = req.payload.find((p) => p.kind === 'preflight.request')?.data as
    | { resource?: { type: string; id: string }; action?: string }
    | undefined;
  const action = body?.action || what;
  const resourceId = body?.resource?.id || '';
  let result: PreflightResult;

  if (action.includes('migrate') && resourceId.includes('jellyfin')) {
    result = {
      viable: false,
      blockers: [
        {
          id: 'disk-local-only',
          message: 'VM disk is not on shared storage.',
          detail: 'Dataset tank/vms/jellyfin is local to prod-node-02.lan',
          remediation: 'zfs send/recv to shared pool or use cold migrate.',
        },
      ],
      warnings: [],
      checks: [
        { id: 'cluster-quorum', status: 'PASS', message: 'Quorum ok' },
        { id: 'disk-local-only', status: 'FAIL', message: 'Local dataset' },
      ],
      ttlMs: 30_000,
      fetchedAt: new Date().toISOString(),
    };
  } else if (action.includes('stop') && resourceId.includes('nextcloud')) {
    result = {
      viable: true,
      blockers: [],
      warnings: [
        {
          id: 'active-sessions',
          message:
            'Users may have open Nextcloud sessions; guest ACPI shutdown will disconnect them.',
          impact: 'user_disconnect',
        },
      ],
      checks: [
        { id: 'power-state', status: 'PASS', message: 'VM is running' },
        { id: 'active-sessions', status: 'WARN', message: 'Active guest sessions' },
      ],
      ttlMs: 30_000,
      fetchedAt: new Date().toISOString(),
    };
  } else if (action.includes('drain') && resourceId.includes('edge')) {
    result = {
      viable: true,
      blockers: [],
      warnings: [
        {
          id: 'already-draining',
          message: 'Host is already draining; workloads will not be scheduled.',
        },
      ],
      checks: [{ id: 'default', status: 'WARN', message: 'Already draining' }],
      ttlMs: 30_000,
      fetchedAt: new Date().toISOString(),
    };
  } else {
    result = {
      viable: true,
      blockers: [],
      warnings: [],
      checks: [{ id: 'default', status: 'PASS', message: 'Action allowed' }],
      ttlMs: 30_000,
      fetchedAt: new Date().toISOString(),
    };
  }

  return okEnvelope(req.requestId, what, [
    {
      mime: 'application/vnd.cloudbsd+preflight.result',
      kind: 'preflight.result',
      data: result,
    },
  ]);
}

function handleActionExecute(req: Envelope, what: string): Envelope {
  return okEnvelope(req.requestId, what + '.accepted', [
    {
      mime: 'application/vnd.cloudbsd+task',
      kind: 'task',
      data: {
        id: 'task-' + uuidV4().slice(0, 8),
        action: what,
        status: 'accepted',
      },
    },
  ]);
}

/** Dispatch mock response for an envelope request. */
export function handleMockEnvelope(req: Envelope): Envelope {
  const what =
    req.headers.find((h) => h.name === 'what')?.value ||
    (req.payload[0]?.kind ?? 'unknown');

  switch (what) {
    case 'auth.login':
      return handleLogin(req);
    case 'auth.session.validate':
    case 'sessions.validate':
      return handleSessionValidate(req);
    case 'vms.list':
      return handleVmsList(req);
    case 'vm.get':
      return handleVmGet(req);
    case 'container.get':
      return handleResourceGet(req, what, 'container', MOCK_CONTAINERS);
    case 'jail.get':
      return handleResourceGet(req, what, 'jail', MOCK_JAILS);
    case 'volume.get':
      return handleResourceGet(req, what, 'volume', MOCK_VOLUMES);
    case 'host.get':
      return handleResourceGet(req, what, 'host', MOCK_HOSTS);
    case 'vm.create':
    case 'vms.create':
    case 'container.create':
    case 'containers.create':
    case 'jail.create':
    case 'jails.create':
    case 'volume.create':
    case 'network.create':
    case 'host.create':
    case 'apikey.create':
    case 'token.create':
    case 'mcp.register':
    case 'backup.restore':
      return handleCreate(req, what);
    case 'backups.list':
      return handleBackupsList(req);
    case 'vm.console.token':
      return handleConsoleToken(req);
    case 'containers.list':
      return handleContainersList(req);
    case 'jails.list':
      return handleJailsList(req);
    case 'volumes.list':
    case 'storage.list':
      return handleVolumesList(req);
    case 'hosts.list':
    case 'nodes.list':
      return handleHostsList(req);
    case 'tasks.list':
      return handleTasksList(req);
    case 'notifications.list':
      return handleNotificationsList(req);
    case 'networks.list':
      return handleNetworksList(req);
    case 'library.bases.list':
      return handleLibraryBases(req);
    case 'library.repos.list':
      return handleLibraryRepos(req);
    case 'users.list':
      return handleUsersList(req);
    case 'mcp.list':
      return handleMcpList(req);
    case 'cluster.status':
      return handleClusterStatus(req);
    case 'dashboard.bootstrap':
      return handleDashboard(req);
    default:
      break;
  }

  if (what.endsWith('.preflight') || what === 'preflight.check') {
    return handleActionPreflight(req, what);
  }
  if (
    what.startsWith('vm.') ||
    what.startsWith('vms.') ||
    what.startsWith('container.') ||
    what.startsWith('jail.') ||
    what.startsWith('host.') ||
    what.includes('.stop') ||
    what.includes('.start') ||
    what.includes('.delete')
  ) {
    return handleActionExecute(req, what);
  }

  return okEnvelope(req.requestId, what, []);
}
