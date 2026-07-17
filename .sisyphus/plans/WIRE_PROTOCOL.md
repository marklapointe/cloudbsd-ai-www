# CloudBSD Admin — UI ↔ Backend Wire Protocol

**Status**: Canonical wire protocol specification. UI mocks in `web-new/src/app/mocks/`  
**Product IA**: `.sisyphus/drafts/product-ia-esxi-vsphere-2026-07-16.md` (control-plane management UX; view-only is a role).  
**Agent index**: `docs/migration/README.md`
implement these exactly so the future Go backend (in `cloudbsd-admin-backend`) is a drop-in replacement.

---

## 1. Envelope

Every request and response uses the **same envelope shape**. This is what makes the protocol "pluralistic" — payloads are typed arrays, so a single HTTP call can carry any combination of data.

### 1.1 Envelope schema (TypeScript)

```typescript
interface Envelope<P = unknown> {
  /** IANA media type. For CloudBSD envelopes, MUST be `application/vnd.cloudbsd+envelope`. */
  mime: 'application/vnd.cloudbsd+envelope';

  /** CloudBSD-specific headers (mirrored into HTTP headers as `X-CloudBSD-*`). */
  headers: CloudBSDHeader[];

  /** IANA `Request-Id` / `Correlation-Id`. UUID v4. Server echoes for tracing. */
  requestId: string;

  /** ISO-8601 UTC timestamp. */
  timestamp: string;

  /** Tenant/session context. */
  context: {
    userId?: string;
    sessionId?: string;
    traceId?: string;
    idempotencyKey?: string;
  };

  /** Payload items. Always an array — even a single item is `[item]`. */
  payload: PayloadItem[];

  /** Error items (parallel to payload; never both in success response). */
  errors?: ErrorItem[];

  /** Pagination cursor for the *next* payload chunk. */
  next?: string;

  /** Server-set hints. */
  meta?: {
    serverVersion?: string;
    deprecation?: string[];
    cacheHint?: 'no-cache' | 'max-age=60' | 'private';
  };
}

interface CloudBSDHeader {
  /** Header name. Stable enum: `who`, `what`, `why`, `where`, `when`, `how`. */
  name: 'who' | 'what' | 'why' | 'where' | 'when' | 'how' | 'if-match' | 'if-none-match' | 'idempotency-key';
  value: string;
}

interface PayloadItem {
  /** Per-item MIME type. This is the real "what is this data" type. */
  mime: string;

  /** Stable identifier for this payload type (e.g. `vms.list`, `notifications.batch`). */
  kind: string;

  /** Per-item action discriminator. Optional. */
  action?: 'create' | 'read' | 'update' | 'delete' | 'list' | 'stream';

  /** Per-item version (`ETag` semantics). */
  version?: string;

  /** The actual data. Schema depends on `mime`. */
  data: unknown;

  /** Sub-items (for compound payloads like a row with embedded relations). */
  includes?: PayloadItem[];
}

interface ErrorItem {
  /** RFC 7807 problem type URI. */
  type: string;
  /** Severity per UI severity rules. */
  severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';
  /** Short machine-readable code (UPPER_SNAKE). */
  code: string;
  /** Human-readable summary. NEVER includes stack, paths, secrets. */
  message: string;
  /** Opaque server ID for log lookup. */
  errorId: string;
  /** When this error should be retried (RFC 7231 Retry-After equivalent). */
  retryAfter?: number;
  /** Per-item context. */
  context?: Record<string, unknown>;
}
```

### 1.2 HTTP transport

| Aspect | Rule |
|--------|------|
| Method | `POST` for all envelope exchanges (read/write/list/delete) — see §1.4 |
| Request content-type | `application/vnd.cloudbsd+envelope` |
| Response content-type | `application/vnd.cloudbsd+envelope` (success) **or** `application/vnd.cloudbsd+error` (4xx/5xx) |
| CloudBSD headers in HTTP | `headers[*].name` → `X-CloudBSD-<TitleCase>` (e.g. `who` → `X-CloudBSD-Who`) |
| Errors | 4xx/5xx response uses `application/vnd.cloudbsd+error` envelope (NOT the standard envelope) |
| Cookies | `session=<opaque>` HttpOnly Secure SameSite=Strict; session_id is also in `envelope.context.sessionId` for tracing |

### 1.3 Standard CloudBSD headers (in every envelope)

| Name | HTTP header | Required | Meaning | Example |
|------|-------------|----------|---------|---------|
| `who` | `X-CloudBSD-Who` | yes | Identifies the actor | `mlapointe@cloudbsd.org` or `system:discoverer:bhyve` |
| `what` | `X-CloudBSD-What` | yes | Action being performed | `vms.list`, `sessions.validate` |
| `why` | `X-CloudBSD-Why` | yes | Reason/intent (audit) | `user_requested`, `scheduled_sync`, `recovery_retry` |
| `where` | `X-CloudBSD-Where` | yes | Origin/source | `dashboard_view`, `vm_detail_panel`, `discoverer_tick` |
| `when` | `X-CloudBSD-When` | optional | Client timestamp | `2026-07-06T12:34:56.789Z` |
| `how` | `X-CloudBSD-How` | optional | Transport (HTTP/Socket.IO/cli) | `socket.io`, `http` |
| `if-match` | `X-CloudBSD-If-Match` | conditional | Optimistic concurrency | `v3-abc123` |
| `idempotency-key` | `X-CloudBSD-Idempotency-Key` | conditional | UUID, dedupe retries | `550e8400-e29b-41d4-a716-446655440000` |

### 1.4 Why `POST` for everything

GETs cannot have a JSON body in many proxies/CDNs. By using POST + envelope, the wire protocol is uniform. The backend dispatches on `envelope.headers["what"]`. `If-Match` is the cache validator for revalidation reads.

---

## 2. UI ↔ Backend interactions (full inventory)

For each UI screen I built, here is the exact exchange. **All examples use mock data consistent with the SVG mock-ups.**

### 2.1 Dashboard

**Request** (initial load):
```http
POST /api
Content-Type: application/vnd.cloudbsd+envelope
X-CloudBSD-Who: mlapointe
X-CloudBSD-What: dashboard.bootstrap
X-CloudBSD-Why: user_requested
X-CloudBSD-Where: dashboard_view

{
  "mime": "application/vnd.cloudbsd+envelope",
  "requestId": "req-7e8f-4a2b-9c1d",
  "timestamp": "2026-07-06T12:34:56.789Z",
  "context": { "userId": "mlapointe", "sessionId": "sess-abc123" },
  "headers": [
    { "name": "who",  "value": "mlapointe@cloudbsd.org" },
    { "name": "what", "value": "dashboard.bootstrap" },
    { "name": "why",  "value": "user_requested" },
    { "name": "where", "value": "dashboard_view" },
    { "name": "when", "value": "2026-07-06T12:34:56.789Z" },
    { "name": "how",  "value": "http" }
  ],
  "payload": []
}
```

**Response** (200):
```json
{
  "mime": "application/vnd.cloudbsd+envelope",
  "requestId": "req-7e8f-4a2b-9c1d",
  "timestamp": "2026-07-06T12:34:56.812Z",
  "context": { "userId": "mlapointe", "sessionId": "sess-abc123" },
  "headers": [
    { "name": "who",  "value": "mlapointe@cloudbsd.org" },
    { "name": "what", "value": "dashboard.bootstrap" }
  ],
  "meta": { "serverVersion": "1.0.0+go1.24.3" },
  "payload": [
    { "mime": "application/vnd.cloudbsd+metric.cpu",        "kind": "metric.cpu",        "version": "v3-a1b2", "data": { "usagePercent": 42, "cores": 8, "loadAvg": [1.42, 1.38, 1.21], "sparkline": [18,14,16,10,12,8,11,6,9,7,4,8,5] } },
    { "mime": "application/vnd.cloudbsd+metric.memory",     "kind": "metric.memory",     "version": "v3-c3d4", "data": { "usedBytes": 8804682956, "totalBytes": 17179869184, "breakdown": { "used": 6.4, "buffers": 1.2, "cache": 1.8, "arc": 2.4, "swap": 0.064 }, "unit": "GB" } },
    { "mime": "application/vnd.cloudbsd+metric.disk",       "kind": "metric.disk",       "version": "v3-e5f6", "data": { "volumes": [
        { "name": "tank/data",     "usedBytes": 263066746880, "totalBytes": 987842478080, "usagePercent": 27, "status": "healthy" },
        { "name": "tank/media",    "usedBytes": 3518437208883, "totalBytes": 4398046511104, "usagePercent": 80, "status": "watch" },
        { "name": "tank/vms",      "usedBytes": 657666867200,  "totalBytes": 858993459200,  "usagePercent": 76, "status": "watch" },
        { "name": "tank/backups",  "usedBytes": 442381713408,  "totalBytes": 1649267441664, "usagePercent": 27, "status": "healthy" }
      ], "lastScrub": "2026-07-04T00:00:00Z" } },
    { "mime": "application/vnd.cloudbsd+metric.network",    "kind": "metric.network",    "version": "v3-g7h8", "data": { "rxBytesPerSec": 90420335, "txBytesPerSec": 13002342, "interfaces": [
        { "name": "igc0", "status": "up", "speedMbps": 1000, "packetsPerSec": 142500 },
        { "name": "bge0", "status": "up", "speedMbps": 1000, "packetsPerSec": 18432 },
        { "name": "lo0", "status": "up", "speedMbps": 0,    "packetsPerSec": 2143 }
      ] } },
    { "mime": "application/vnd.cloudbsd+metric.temperature","kind": "metric.temperature","version":"v3-i9j0", "data": { "sensors": [
        { "label": "CPU",     "celsius": 47, "status": "normal" },
        { "label": "NVMe",    "celsius": 38, "status": "normal" },
        { "label": "Ambient", "celsius": 41, "status": "normal" }
      ] } },
    { "mime": "application/vnd.cloudbsd+metric.load",       "kind": "metric.load",       "version": "v3-k1l2", "data": { "load1": 1.42, "load5": 1.38, "load15": 1.21, "thresholds": { "normal": 2, "warn": 4, "critical": 8 } } },
    { "mime": "application/vnd.cloudbsd+process.top",      "kind": "process.top",      "version": "v3-m3n4", "data": { "processes": [
        { "pid": 1242, "user": "www",   "cpuPercent": 18, "memPercent": 8.2, "command": "nginx: worker" },
        { "pid": 8821, "user": "pgsql", "cpuPercent": 14, "memPercent": 24,  "command": "postgres: writer" },
        { "pid": 3104, "user": "root",  "cpuPercent": 12, "memPercent": 4.1, "command": "vm-bhyve: nextcloud" },
        { "pid": 9214, "user": "mlap",  "cpuPercent": 8,  "memPercent": 2.1, "command": "sshd" },
        { "pid": 5512, "user": "mlap",  "cpuPercent": 6,  "memPercent": 1.8, "command": "zsh" }
      ] } },
    { "mime": "application/vnd.cloudbsd+zfs.health",      "kind": "zfs.health",       "version": "v3-o5p6", "data": { "pool": "tank", "status": "healthy", "fragmentationPercent": 4, "arcHitPercent": 87.4, "lastScrub": "2026-07-04T00:00:00Z", "lastScrubErrors": 0, "nextScrub": "2026-07-16T00:00:00Z" } },
    { "mime": "application/vnd.cloudbsd+activity.recent",  "kind": "activity.recent",  "version": "v3-q7r8", "data": { "events": [
        { "ts": "2026-07-06T12:42:01Z", "module": "zfs",   "severity": "INFO", "message": "snapshot daily@auto-2026-07-06_03-00 created on tank/data" },
        { "ts": "2026-07-06T12:31:18Z", "module": "jail",  "severity": "INFO", "message": "transmission entered STATE: STARTED" },
        { "ts": "2026-07-06T12:18:44Z", "module": "vm",    "severity": "INFO", "message": "nextcloud guest-agent heartbeat (3s drift)" },
        { "ts": "2026-07-06T11:55:09Z", "module": "scrub", "severity": "INFO", "message": "of tank completed with 0 errors" },
        { "ts": "2026-07-06T11:42:18Z", "module": "alert", "severity": "INFO", "message": "resolved: tank/data < 80%" },
        { "ts": "2026-07-06T11:14:02Z", "module": "ct",    "severity": "INFO", "message": "nginx-proxy restarted (exit 0)" },
        { "ts": "2026-07-06T10:58:33Z", "module": "jail",  "severity": "INFO", "message": "pi-hole blocked 1,204 queries" },
        { "ts": "2026-07-06T10:33:07Z", "module": "vm",    "severity": "INFO", "message": "nextcloud snapshot to offsite OK" },
        { "ts": "2026-07-06T09:48:22Z", "module": "backup","severity": "INFO", "message": "snapshot daily replicated to offsite" },
        { "ts": "2026-07-06T09:14:00Z", "module": "systemd","severity": "INFO", "message": "timer fstrim ran (freed 2.4 GB)" }
      ] } },
    { "mime": "application/vnd.cloudbsd+topconsumers",     "kind": "topconsumers",     "version": "v3-s9t0", "data": { "windowSec": 300, "consumers": [
        { "name": "vm-bhyve/jellyfin",   "rxBytesPerSec": 90420335, "txBytesPerSec": 13002342 },
        { "name": "postgres-16",         "rxBytesPerSec": 44040192, "txBytesPerSec":  2202009 },
        { "name": "jail/syncthing",      "rxBytesPerSec": 29779558, "txBytesPerSec":  1830492 },
        { "name": "vm-bhyve/nextcloud",  "rxBytesPerSec": 22229898, "txBytesPerSec":  13591200 },
        { "name": "jail/transmission",   "rxBytesPerSec": 15518924, "txBytesPerSec":  2049103 }
      ] } }
  ]
}
```

### 2.2 Login (PAM)

**Request**:
```json
{
  "mime": "application/vnd.cloudbsd+envelope",
  "requestId": "req-login-1",
  "timestamp": "2026-07-06T12:00:00Z",
  "context": {},
  "headers": [
    { "name": "who",  "value": "mlapointe" },
    { "name": "what", "value": "auth.login" },
    { "name": "why",  "value": "user_requested" },
    { "name": "where", "value": "login_form" },
    { "name": "how",  "value": "http" },
    { "name": "idempotency-key", "value": "550e8400-e29b-41d4-a716-446655440001" }
  ],
  "payload": [
    { "mime": "application/vnd.cloudbsd+credentials", "kind": "credentials", "data": {
        "username": "mlapointe",
        "password": "<plaintext; sent over WSS only>",
        "otp": "492715",
        "rememberBrowser": true
    } }
  ]
}
```

**Response (success)** — 200 with `Set-Cookie: session=...; HttpOnly; Secure; SameSite=Strict`:
```json
{
  "mime": "application/vnd.cloudbsd+envelope",
  "requestId": "req-login-1",
  "timestamp": "2026-07-06T12:00:01.234Z",
  "headers": [
    { "name": "who",  "value": "system:auth" },
    { "name": "what", "value": "auth.login.success" }
  ],
  "payload": [
    { "mime": "application/vnd.cloudbsd+session", "kind": "session", "version": "v1", "data": {
        "sessionId": "sess-abc123",
        "userId": "mlapointe",
        "email": "mlapointe@cloudbsd.org",
        "displayName": "Mark LaPointe",
        "groups": ["wheel", "admins", "docker"],
        "roles": ["admin"],
        "isAdmin": true,
        "totpEnrolled": true,
        "expiresAt": "2026-07-06T12:30:01Z",
        "idleTimeoutSec": 1800
    } }
  ]
}
```

**Response (locked account)** — 423 (Locked):
```http
HTTP/1.1 423 Locked
Content-Type: application/vnd.cloudbsd+error
```
```json
{
  "mime": "application/vnd.cloudbsd+error",
  "requestId": "req-login-1",
  "timestamp": "2026-07-06T12:00:01.123Z",
  "headers": [
    { "name": "who",  "value": "guest" },
    { "name": "what", "value": "auth.login.locked" }
  ],
  "payload": [
    { "mime": "application/vnd.cloudbsd+problem", "kind": "problem", "data": {
        "type": "https://errors.cloudbsd.org/auth/account-locked",
        "severity": "WARNING",
        "code": "AUTH_ACCOUNT_LOCKED",
        "message": "Account is temporarily locked due to failed attempts. Try again in 14 minutes.",
        "errorId": "err-2026-07-06-lock-7e8f",
        "retryAfter": 840,
        "context": { "unlocksAt": "2026-07-06T12:14:00Z", "failedAttempts": 5, "maxAttempts": 5 }
    } }
  ]
}
```

### 2.3 Session validation (heartbeat)

Called every 60s by `SocketService` and on every page navigation.

**Request**:
```json
{
  "mime": "application/vnd.cloudbsd+envelope",
  "requestId": "req-validate-42",
  "timestamp": "2026-07-06T12:34:00Z",
  "context": { "sessionId": "sess-abc123" },
  "headers": [
    { "name": "who",  "value": "mlapointe@cloudbsd.org" },
    { "name": "what", "value": "auth.session.validate" },
    { "name": "why",  "value": "heartbeat" },
    { "name": "where", "value": "http_or_socket" },
    { "name": "when", "value": "2026-07-06T12:34:00Z" }
  ],
  "payload": []
}
```

**Response** — 200:
```json
{
  "mime": "application/vnd.cloudbsd+envelope",
  "requestId": "req-validate-42",
  "timestamp": "2026-07-06T12:34:00.045Z",
  "headers": [
    { "name": "who",  "value": "system:auth" },
    { "name": "what", "value": "auth.session.valid" }
  ],
  "payload": [
    { "mime": "application/vnd.cloudbsd+session.status", "kind": "session.status", "version": "v1", "data": {
        "sessionId": "sess-abc123",
        "valid": true,
        "expiresInSec": 1620,
        "serverTime": "2026-07-06T12:34:00.045Z",
        "idleRemainingSec": 1740
    } }
  ]
}
```

**Response — expired** — 401 + frost-out trigger:
```json
{
  "mime": "application/vnd.cloudbsd+error",
  "requestId": "req-validate-42",
  "timestamp": "2026-07-06T12:34:00.045Z",
  "headers": [
    { "name": "who",  "value": "system:auth" },
    { "name": "what", "value": "auth.session.expired" }
  ],
  "payload": [
    { "mime": "application/vnd.cloudbsd+problem", "kind": "problem", "data": {
        "type": "https://errors.cloudbsd.org/auth/session-expired",
        "severity": "ERROR",
        "code": "AUTH_SESSION_EXPIRED",
        "message": "Your session has expired. Please sign in again.",
        "errorId": "err-2026-07-06-session-9b1c"
    } }
  ]
}
```

### 2.4 VMs list (with filters, sort, pagination)

**Request**:
```json
{
  "mime": "application/vnd.cloudbsd+envelope",
  "requestId": "req-vms-list-1",
  "timestamp": "2026-07-06T12:35:00Z",
  "context": { "userId": "mlapointe", "sessionId": "sess-abc123" },
  "headers": [
    { "name": "who",  "value": "mlapointe@cloudbsd.org" },
    { "name": "what", "value": "vms.list" },
    { "name": "why",  "value": "user_requested" },
    { "name": "where", "value": "vms_view" }
  ],
  "payload": [
    { "mime": "application/vnd.cloudbsd+query", "kind": "query", "data": {
        "filter": { "status": ["RUN"], "host": null, "os": null, "tag": null, "search": "" },
        "sort": { "field": "name", "direction": "asc" },
        "page": { "limit": 12, "cursor": null }
    } }
  ]
}
```

**Response** — 200:
```json
{
  "mime": "application/vnd.cloudbsd+envelope",
  "requestId": "req-vms-list-1",
  "timestamp": "2026-07-06T12:35:00.082Z",
  "headers": [
    { "name": "who",  "value": "system:vms" },
    { "name": "what", "value": "vms.list" }
  ],
  "payload": [
    { "mime": "application/vnd.cloudbsd+vms.batch", "kind": "vms.batch", "version": "v3", "data": {
        "total": 47, "shown": 12, "stats": { "running": 39, "stopped": 6, "paused": 1, "error": 1 }
    }, "includes": [
        { "mime": "application/vnd.cloudbsd+vm", "kind": "vm", "version": "v1", "data": {
            "id": "vm-nextcloud", "name": "nextcloud", "status": "RUN", "os": "Debian 12",
            "vcpu": 4, "ramBytes": 8589934592, "diskBytes": 128849018880,
            "uptimeSec": 1211670, "host": "cloudbsd-node-01", "ip": "10.0.10.10",
            "tags": ["prod", "files"], "iopsRead": 1200, "iopsWrite": 0,
            "netRxBytesPerSec": 13002342, "netTxBytesPerSec": 4404019,
            "createdAt": "2026-06-22T12:00:00Z", "version": "v1-a7f3"
        } },
        { "mime": "application/vnd.cloudbsd+vm", "kind": "vm", "version": "v1", "data": {
            "id": "vm-homeassistant", "name": "homeassistant", "status": "RUN", "os": "HAOS 12",
            "vcpu": 2, "ramBytes": 4294967296, "diskBytes": 34359738368,
            "uptimeSec": 764520, "host": "cloudbsd-node-01", "ip": "10.0.10.12",
            "tags": ["smarthome"], "iopsRead": 380, "iopsWrite": 0,
            "netRxBytesPerSec": 644245, "netTxBytesPerSec": 212341,
            "createdAt": "2026-06-27T12:00:00Z", "version": "v1-b8c4"
        } },
        { "mime": "application/vnd.cloudbsd+vm", "kind": "vm", "version": "v1", "data": {
            "id": "vm-jellyfin", "name": "jellyfin", "status": "RUN", "os": "Ubuntu 24.04",
            "vcpu": 6, "ramBytes": 12884901888, "diskBytes": 536870912000,
            "uptimeSec": 1911360, "host": "cloudbsd-node-01", "ip": "10.0.10.11",
            "tags": ["media"], "iopsRead": 4800, "iopsWrite": 0,
            "netRxBytesPerSec": 90420335, "netTxBytesPerSec": 13002342,
            "createdAt": "2026-06-14T12:00:00Z", "version": "v1-c9d5"
        } }
    ] }
  ],
  "next": "eyJ2bVMtaWQiOiJ2bS1qb2JiaW5nIiwiYW9yZGVyIjpbIm5hbWUiXX0"
}
```

### 2.5 Containers list

**Request**:
```json
{
  "mime": "application/vnd.cloudbsd+envelope",
  "requestId": "req-ct-list",
  "timestamp": "2026-07-06T12:36:00Z",
  "context": { "userId": "mlapointe", "sessionId": "sess-abc123" },
  "headers": [
    { "name": "who",  "value": "mlapointe@cloudbsd.org" },
    { "name": "what", "value": "containers.list" },
    { "name": "why",  "value": "user_requested" },
    { "name": "where", "value": "containers_view" }
  ],
  "payload": [
    { "mime": "application/vnd.cloudbsd+query", "kind": "query", "data": { "filter": {}, "sort": { "field": "name", "direction": "asc" }, "page": { "limit": 50 } } }
  ]
}
```

**Response**:
```json
{
  "mime": "application/vnd.cloudbsd+envelope",
  "requestId": "req-ct-list",
  "timestamp": "2026-07-06T12:36:00.121Z",
  "headers": [
    { "name": "who", "value": "system:containers" },
    { "name": "what", "value": "containers.list" }
  ],
  "payload": [
    { "mime": "application/vnd.cloudbsd+containers.batch", "kind": "containers.batch", "data": { "total": 62, "shown": 15, "stats": { "running": 58, "exited": 4, "paused": 0 } } },
    { "mime": "application/vnd.cloudbsd+container", "kind": "container", "data": {
        "id": "ct-nginx-proxy", "name": "nginx-proxy", "image": "nginx:1.27-alpine", "imageRegistry": "docker.io",
        "status": "RUN", "ports": [{"container":80,"host":80,"protocol":"tcp"},{"container":443,"host":443,"protocol":"tcp"}],
        "cpuPercent": 3, "memBytes": 148897792, "netRxBytesPerSec": 12976128, "netTxBytesPerSec": 12000000,
        "uptimeSec": 2782620, "createdAt": "2026-06-06T12:00:00Z", "version": "v1-d0e6"
    } },
    { "mime": "application/vnd.cloudbsd+container", "kind": "container", "data": {
        "id": "ct-postgres-16", "name": "postgres-16", "image": "postgres:16.3-alpine", "imageRegistry": "docker.io",
        "status": "RUN", "ports": [{"container":5432,"host":5432,"protocol":"tcp"}],
        "cpuPercent": 18, "memBytes": 1288490188, "netRxBytesPerSec": 8604876, "netTxBytesPerSec": 1024,
        "uptimeSec": 2782620, "createdAt": "2026-06-06T12:00:00Z", "version": "v1-e1f7"
    } }
  ]
}
```

### 2.6 Jails list

**Request/Response** mirrors containers with `jails.batch` and `jail` MIME types.

```json
{
  "mime": "application/vnd.cloudbsd+jails.batch", "kind": "jails.batch", "data": { "total": 12, "stats": { "running": 10, "stopped": 1, "frozen": 1 } } },
{ "mime": "application/vnd.cloudbsd+jail", "kind": "jail", "data": {
    "id": "jail-transmission", "name": "transmission", "status": "RUN", "os": "FreeBSD 14.2",
    "hostname": "transmission.lan", "ip": "10.0.10.21", "vcpus": 2, "ramBytes": 1073741824,
    "diskBytes": 21474836480, "resourceUsagePercent": 64, "uptimeSec": 2782620, "jailId": 3
} }
```

### 2.7 Volumes list

```json
{ "mime": "application/vnd.cloudbsd+volumes.batch", "kind": "volumes.batch", "data": { "total": 13, "stats": { "healthy": 9, "watch": 3, "encrypted": 11 } } },
{ "mime": "application/vnd.cloudbsd+volume", "kind": "volume", "data": {
    "id": "tank-data", "name": "tank/data", "type": "ZFS", "sizeBytes": 987842478080, "usedBytes": 263066746880, "usagePercent": 27,
    "mountpoint": "/mnt/tank/data", "compression": "zstd-3", "encryption": "aes-256-gcm", "lastScrub": "2026-07-04T00:00:00Z", "health": "healthy"
} }
```

### 2.8 Network map topology

```json
{ "mime": "application/vnd.cloudbsd+network.topology", "kind": "network.topology", "data": {
    "subnets": [
        { "cidr": "10.0.10.0/24", "label": "mgmt + workloads", "vlan": 10 },
        { "cidr": "10.0.20.0/24", "label": "storage",         "vlan": 20 },
        { "cidr": "10.0.30.0/24", "label": "cluster",         "vlan": 30 }
    ],
    "nodes": [
        { "id": "internet", "type": "external", "label": "Internet", "ip": "203.0.113.1", "x": 60, "y": 50 },
        { "id": "pfsense",  "type": "router",   "label": "pfsense.local", "ip": "10.0.10.1", "x": 240, "y": 50 },
        { "id": "sw-core",  "type": "switch",   "label": "sw-core.local", "ip": "10.0.10.2", "x": 420, "y": 50 },
        { "id": "vm-nextcloud", "type": "vm", "label": "nextcloud", "subnet": "10.0.10.0/24", "x": 60, "y": 240, "metrics": { "rxBytesPerSec": 13002342 } }
    ],
    "links": [
        { "from": "internet", "to": "pfsense", "bandwidthMbps": 1000, "latencyMs": 0.4 },
        { "from": "pfsense",  "to": "sw-core", "bandwidthMbps": 1000, "latencyMs": 0.1 },
        { "from": "sw-core",  "to": "vm-nextcloud", "bandwidthMbps": 1000, "latencyMs": 0.3, "status": "degraded" }
    ]
} }
```

### 2.9 Cluster status

```json
{ "mime": "application/vnd.cloudbsd+cluster.status", "kind": "cluster.status", "data": {
    "nodesTotal": 6, "nodesOffline": 1, "jobsRunning": 12,
    "aggregates": { "cpuAvgPercent": 22, "memAvgPercent": 37, "diskAvgPercent": 41 }
} },
{ "mime": "application/vnd.cloudbsd+cluster.node", "kind": "cluster.node", "data": {
    "id": "node-cloudbsd-node-01", "hostname": "cloudbsd-node-01", "role": "master", "rack": "A1",
    "status": "healthy", "cpuPercent": 18, "memPercent": 51, "diskPercent": 27,
    "uptimeSec": 1211670
} },
{ "mime": "application/vnd.cloudbsd+cluster.node", "kind": "cluster.node", "data": {
    "id": "node-05", "hostname": "node-05", "role": "worker", "rack": "C1",
    "status": "offline", "lastSeenSec": 14400
} }
```

### 2.10 Users list (admin)

```json
{ "mime": "application/vnd.cloudbsd+users.batch", "kind": "users.batch", "data": { "total": 14, "byPAMStatus": { "active": 10, "locked": 1, "expired": 1, "disabled": 1 } } },
{ "mime": "application/vnd.cloudbsd+user", "kind": "user", "data": {
    "uid": 1000, "username": "mlapointe", "gid": 1000, "pamStatus": "active",
    "lastLoginAt": "2026-07-06T12:34:00Z", "lastLoginIp": "10.0.10.42",
    "groups": ["wheel", "admins", "docker"], "shell": "/bin/zsh", "home": "/home/mlapointe",
    "twoFA": { "enrolled": true, "method": "totp" },
    "activeSessions": 2, "sshKeys": 4, "sudoLast24h": 8
} }
```

### 2.11 Logs (paginated, level-filtered)

```json
{ "mime": "application/vnd.cloudbsd+logs.batch", "kind": "logs.batch", "data": {
    "total": 118, "shown": 18, "levelCounts": { "error": 4, "warn": 12, "info": 118, "debug": 42 },
    "tailMode": true
} },
{ "mime": "application/vnd.cloudbsd+log.entry", "kind": "log.entry", "data": {
    "ts": "2026-07-06T12:42:01.218Z", "level": "INFO", "module": "zfs", "source": "vdev.zpool.daily",
    "message": "snapshot daily@auto-2026-07-06_03-00 created on tank/data (2.1 GB)",
    "requestId": "req-snap-42", "userId": null
} }
```

### 2.12 Notifications list

```json
{ "mime": "application/vnd.cloudbsd+notifications.batch", "kind": "notifications.batch", "data": { "unread": 17, "total": 84 } },
{ "mime": "application/vnd.cloudbsd+notification", "kind": "notification", "data": {
    "id": "notif-84", "ts": "2026-07-06T12:30:00Z", "severity": "ERROR", "source": "disk",
    "title": "tank/media usage > 80%", "message": "Volume tank/media crossed 80% threshold (currently 80.2%)",
    "actions": [{"id":"view","label":"View details","href":"/volumes/tank-media"}],
    "read": false
} }
```

### 2.13 Theme list + apply + custom import/export

```json
{ "mime": "application/vnd.cloudbsd+themes.batch", "kind": "themes.batch", "data": { "count": 15, "active": "cloudbsd-revytech", "customCount": 2 } },
{ "mime": "application/vnd.cloudbsd+theme", "kind": "theme", "data": {
    "id": "phosphor-crt", "name": "Phosphor CRT", "author": "system", "license": "BSD-3-Clause",
    "tags": ["retro", "dark", "green-phosphor"],
    "tokens": { "bg-primary": "#0a0e0a", "fg-primary": "#66ff66", "font-family": "VT323, monospace" },
    "version": "v1"
} }
```

**Theme apply**:
```json
{
  "headers": [
    { "name": "who", "value": "mlapointe@cloudbsd.org" },
    { "name": "what", "value": "theme.apply" },
    { "name": "why", "value": "user_requested" },
    { "name": "where", "value": "settings_theme" }
  ],
  "payload": [{ "mime": "application/vnd.cloudbsd+theme", "kind": "theme", "data": { "id": "phosphor-crt" } }]
}
```

**Theme import**:
```json
{ "mime": "application/vnd.cloudbsd+envelope", "headers": [{ "name": "what", "value": "theme.import" }], "payload": [
    { "mime": "application/vnd.cloudbsd+theme.import", "kind": "theme.import", "data": {
        "format": "cloudbsd-theme-v1",
        "payload": "base64-encoded-theme-json",
        "signature": "ed25519:abcdef...",
        "name": "My Custom Theme"
    } }
] }
```

### 2.14 Settings update

```json
{
  "headers": [
    { "name": "who", "value": "mlapointe@cloudbsd.org" },
    { "name": "what", "value": "settings.update" },
    { "name": "why", "value": "user_requested" },
    { "name": "where", "value": "settings_appearance" },
    { "name": "if-match", "value": "v3-abc123" }
  ],
  "payload": [
    { "mime": "application/vnd.cloudbsd+settings", "kind": "settings", "data": {
        "section": "appearance",
        "values": {
            "theme": "phosphor-crt",
            "density": "compact",
            "fontFamily": "system-ui",
            "baseFontSize": 14,
            "borderRadius": "medium",
            "reduceMotion": true,
            "autoRefreshSec": 15
        }
    } }
  ]
}
```

### 2.15 Plugin manifest fetch

```json
{
  "headers": [{ "name": "what", "value": "plugins.manifest" }, { "name": "where", "value": "app_boot" }],
  "payload": []
}
```

**Response**:
```json
{ "mime": "application/vnd.cloudbsd+plugin.manifest", "kind": "plugin.manifest", "data": {
    "name": "vm-metrics", "version": "1.4.2", "author": "mlapointe", "license": "BSD-3-Clause",
    "sha256": "a1b2c3...", "signature": "ed25519:...",
    "capabilities": ["vms.read", "metrics.read", "menu.add", "page.add"],
    "menuItems": [
        { "id": "vm-metrics", "label": "VM Metrics", "icon": "chart-bar", "route": "/ext/vm-metrics" }
    ],
    "pages": [
        { "id": "vm-metrics-overview", "title": "VM Metrics", "route": "/ext/vm-metrics", "template": "..." }
    ],
    "routes": [{ "method": "POST", "path": "/ext/vm-metrics/api/query", "handler": "..." }]
} }
```

### 2.16 Plugin data request

```json
{ "mime": "application/vnd.cloudbsd+envelope", "headers": [{ "name": "what", "value": "plugin.vm-metrics.query" }], "payload": [
    { "mime": "application/vnd.cloudbsd+plugin.query", "kind": "plugin.query", "data": { "timeRange": "1h", "metrics": ["cpu", "mem"] } }
] }
```

**Response**:
```json
{ "mime": "application/vnd.cloudbsd+plugin.result", "kind": "plugin.result", "data": { "series": [{"name":"cpu","points":[["2026-07-06T12:00:00Z",42],["2026-07-06T12:05:00Z",44]]}] } }
```

### 2.17 Pre-flight check (L1, L2, L3)

```json
{ "mime": "application/vnd.cloudbsd+envelope", "headers": [{ "name": "what", "value": "preflight.check" }], "payload": [
    { "mime": "application/vnd.cloudbsd+preflight.request", "kind": "preflight.request", "data": { "level": "L1" } }
] }
```

**Response**:
```json
{ "mime": "application/vnd.cloudbsd+preflight.result", "kind": "preflight.result", "data": {
    "status": "healthy",
    "checks": [
        { "id": "backend-ping", "status": "PASS", "latencyMs": 18, "message": null },
        { "id": "session-valid", "status": "PASS", "latencyMs": 1, "message": null },
        { "id": "manifest-load", "status": "PASS", "latencyMs": 12, "message": null }
    ]
} }
```

### 2.18 Error envelope (uniform error response)

Used for all 4xx/5xx with `Content-Type: application/vnd.cloudbsd+error`:

```json
{
  "mime": "application/vnd.cloudbsd+error",
  "requestId": "req-abc-123",
  "timestamp": "2026-07-06T12:34:56.789Z",
  "headers": [
    { "name": "who",  "value": "system:api" },
    { "name": "what", "value": "vms.list" }
  ],
  "payload": [
    { "mime": "application/vnd.cloudbsd+problem", "kind": "problem", "data": {
        "type": "https://errors.cloudbsd.org/rate-limit/exceeded",
        "severity": "WARNING",
        "code": "RATE_LIMIT_EXCEEDED",
        "message": "Too many requests. Try again in 60 seconds.",
        "errorId": "err-2026-07-06-rate-7e8f",
        "retryAfter": 60,
        "context": { "limit": 600, "window": "1m", "endpoint": "vms.list" }
    } }
  ]
}
```

### 2.19 Status / health

```json
{ "mime": "application/vnd.cloudbsd+status.aggregate", "kind": "status.aggregate", "data": {
    "backend": { "status": "UP", "latencyMs": 18, "uptimeSec": 1211670 },
    "database": { "status": "HEALTHY", "sizeBytes": 432012800, "tableCount": 142 },
    "plugins": { "enabled": 5, "failed": 0, "total": 5 },
    "config": {
        "port": 3001, "demoMode": false, "logLevel": "info", "retention": "14d",
        "refreshIntervalSec": 15, "theme": "cloudbsd", "locale": "en_US",
        "tz": "America/Montreal", "plugins": 5, "mfa": "required", "sshdPort": 22, "ipv6": true
    }
} }
```

### 2.20 VM console token (noVNC)

```json
{ "mime": "application/vnd.cloudbsd+envelope", "headers": [{ "name": "what", "value": "vms.console.token" }], "payload": [
    { "mime": "application/vnd.cloudbsd+vm.console.request", "kind": "vm.console.request", "data": { "vmId": "vm-nextcloud", "screenSize": "1024x768" } }
] }
```

**Response**:
```json
{ "mime": "application/vnd.cloudbsd+vm.console.token", "kind": "vm.console.token", "data": {
    "token": "eyJhbGciOiJFZERTQSIs...", "expiresInSec": 300, "websocketUrl": "wss://api.cloudbsd.org/api/vms/vm-nextcloud/console/ws?token=...",
    "ticketId": "tkt-7e8f4a2b"
} }
```

### 2.21 Task Schedules (CRUD) — added 2026-07-07 (T77b)

> TaskSchedules are the unified cron/interval/event/on-demand executor for backup, snapshot, replicate, scrub, exec, webhook, and plugin tasks. Shapes validate against `data-structures.md` §5 `interface TaskSchedule`.

All operations use POST envelopes with `what` header routing per §1.4.

**Operations**:

| `what` header | Purpose | Response kind | MIME type |
|---|---|---|---|
| `task-schedules.create` | Create schedule | `task-schedule` | `application/vnd.cloudbsd+task-schedule+json` |
| `task-schedules.list` | List (paginated, filtered) | `task-schedule.list` | `application/vnd.cloudbsd+task-schedule+list` |
| `task-schedules.get` | Single by id | `task-schedule` | `application/vnd.cloudbsd+task-schedule+json` |
| `task-schedules.update` | Full update (PUT) | `task-schedule` | `application/vnd.cloudbsd+task-schedule+json` |
| `task-schedules.patch` | Partial update (PATCH — toggle enabled) | `task-schedule` | `application/vnd.cloudbsd+task-schedule+json` |
| `task-schedules.delete` | Delete (soft-delete to history; physical after 90d) | (empty) | — |
| `task-schedules.run` | Manual trigger (enqueue run) | `task-schedule.run` | `application/vnd.cloudbsd+task-schedule-run+json` |
| `task-schedules.cancel` | Cancel a currently-running task | (empty) | — |
| `task-schedules.runs` | Run history (paginated) | `task-schedule.run.list` | `application/vnd.cloudbsd+task-schedule-run+list` |

**Create request envelope** (T77a SVG mockup: 6 fields per ui-index §7):
```json
{ "mime": "application/vnd.cloudbsd+envelope", "headers": [
    { "name": "who",  "value": "admin@cloudbsd.org" },
    { "name": "what", "value": "task-schedules.create" },
    { "name": "why",  "value": "user_requested" },
    { "name": "where", "value": "system_mgmt_backups_new_schedule" }
], "payload": [
    { "mime": "application/vnd.cloudbsd+task-schedule", "kind": "task-schedule", "data": {
        "name":        "nightly-data-backup",
        "kind":        "backup",
        "source":      "tank/data",
        "destination": "offsite:rsync.net/module",
        "schedule":    { "type": "cron", "expression": "0 2 * * *", "tz": "UTC" },
        "description": "Nightly incremental ZFS backup of tank/data to offsite rsync.net with 14d retention.",
        "retention":   { "maxAgeDays": 14, "maxCount": 0 },
        "danger":      { "dryRun": false, "encryptAtRest": true, "notifyOnFailure": true },
        "enabled":     true
    } }
] }
```

**Create response**:
```json
{ "mime": "application/vnd.cloudbsd+task-schedule", "kind": "task-schedule", "data": {
    "id": "sched-01HQK8M9X4VZ",
    "createdAt": "2026-07-07T17:30:12.789Z",
    "nextRunAt":  "2026-07-08T02:00:00.000Z",
    "owner": "admin@cloudbsd.org",
    "name": "nightly-data-backup",
    "kind": "backup",
    "enabled": true,
    "status": "ACTIVE"
} }
```

**Run-manual envelope** (returns immediately with run id; result is observable via `runs` history):
```json
{ "mime": "application/vnd.cloudbsd+envelope", "headers": [{ "name": "what", "value": "task-schedules.run" }], "payload": [
    { "mime": "application/vnd.cloudbsd+task-schedule.run.request", "kind": "task-schedule.run.request", "data": {
        "scheduleId": "sched-01HQK8M9X4VZ",
        "reason":     "user_requested",
        "override":   { "dryRun": true }
    } }
] }
```

**Run-manual response**:
```json
{ "mime": "application/vnd.cloudbsd+task-schedule-run", "kind": "task-schedule.run", "data": {
    "runId": "run-01HQK8M9X4VZ-9821",
    "scheduleId": "sched-01HQK8M9X4VZ",
    "startedAt": "2026-07-07T17:30:14.122Z",
    "status": "QUEUED",
    "estimatedDurationSec": 240
} }
```

**Headers** (required on every schedule action per §1.3):
- `who` — `user@host` who initiated
- `what` — one of the 9 operations above
- `why` — `user_requested` | `system:scheduler` | `system:retry` | `maintenance:run`
- `where` — UI origin e.g. `system_mgmt_backups_new_schedule`, `system_mgmt_backups_run_now`

**Validation**: All schedule objects validate against `data-structures.md` §5 `interface TaskSchedule` (see `.sisyphus/drafts/data-structures.md`). The wire-protocol does NOT duplicate the TaskSchedule schema — it references the data-structures spec as the single source of truth.

### 2.22 VM detail (single) — added 2026-07-07 (T78b)

> Detail panel for VMs (right-side per `19-vm-detail-panel.svg`). The list endpoint `vms.list` (§2.4) returns summaries; this section adds per-VM detail with sub-resource fan-out.

| `what` header | Purpose | Response kind |
|---|---|---|
| `vms.get` | Single VM by id | `vm` |
| `vms.disks.list` | List disks attached to VM | `vm.disks.list` |
| `vms.network.list` | Network interfaces + IPs (dual-stack) | `vm.network.list` |
| `vms.snapshots.list` | ZFS snapshots for VM | `vm.snapshots.list` |
| `vms.logs.list` | Paginated VM log tail | `vm.logs.list` |
| `vms.console.token` | noVNC websockify token (already §2.20) | `vm.console.token` |

All endpoints return `application/vnd.cloudbsd+vm*` MIME types. Shapes validate against `data-structures.md` `interface VM`, `interface VMDisk`, `interface VMNetwork`, `interface VMSnapshot`.

**VM detail envelope**:
```json
{ "mime": "application/vnd.cloudbsd+envelope", "headers": [{ "name": "what", "value": "vms.get" }], "payload": [
    { "mime": "application/vnd.cloudbsd+vm.detail.request", "kind": "vm.detail.request", "data": { "vmId": "ulid-01HQK8M9X4VZ" } }
] }
```

**Response** (matches `19-vm-detail-panel.svg` Overview tab content):
```json
{ "mime": "application/vnd.cloudbsd+vm", "kind": "vm", "data": {
    "id": "ulid-01HQK8M9X4VZ",
    "name": "jellyfin",
    "description": "Media server for living room + bedroom",
    "status": "RUN",
    "type": "bhyve",
    "os": "Debian 12 (bookworm)",
    "generation": 2,
    "vcpu": 4,
    "ram": { "value": 8, "unit": "GB" },
    "disk": { "value": 80, "unit": "GB", "kind": "zvol" },
    "ipv4": "10.0.10.22",
    "ipv6": "fd00::22",
    "createdAt": "2026-05-20T12:00:00Z",
    "uptimeSec": 1214670,
    "nextBackupAt": "2026-07-08T02:00:00Z",
    "nextBackupScheduleId": "sched-daily-tank-data"
} }
```

**View-only directive**: NO write endpoints (POST create / PUT update / DELETE) for VMs per audit §21.5. Mutations route through TaskSchedule (§2.21).

### 2.23 Container detail (single) — added 2026-07-07 (T79b)

Per `20-container-detail-panel.svg`. 5 sub-tabs: Overview, Disks, Network, Logs, Env vars.

| `what` header | Purpose | Response kind |
|---|---|---|
| `containers.get` | Single container by id | `container` |
| `containers.disks.list` | Mount points + volumes | `container.disks.list` |
| `containers.network.list` | Port mappings + IPs | `container.network.list` |
| `containers.logs.list` | stdout/stderr tail | `container.logs.list` |
| `containers.env.list` | Env vars (sensitive masked) | `container.env.list` |

MIME types: `application/vnd.cloudbsd+container*`. Shapes against `data-structures.md` `interface Container`.

### 2.24 Jail detail (single) — added 2026-07-07 (T80b)

Per `21-jail-detail-panel.svg`. 5 sub-tabs: Overview, IPs, Network, Limits, Logs.

| `what` header | Purpose | Response kind |
|---|---|---|
| `jails.get` | Single jail by id (or hostname) | `jail` |
| `jails.ips.list` | List bound IPs (v4 + v6) | `jail.ips.list` |
| `jails.network.list` | Interfaces + VLANs | `jail.network.list` |
| `jails.limits.list` | rctl rules (CPU%, memory, disk-IO) | `jail.limits.list` |
| `jails.logs.list` | jail.log tail | `jail.logs.list` |

MIME types: `application/vnd.cloudbsd+jail*`. Shapes against `data-structures.md` `interface Jail`.

### 2.25 Volume detail (single) — added 2026-07-07 (T81b)

Per `22-volume-detail-panel.svg`. 6 sub-tabs: Overview, Datasets, Snapshots, Scrubs, Performance, Settings.

| `what` header | Purpose | Response kind |
|---|---|---|
| `volumes.get` | Single volume by id (URL-encoded path) | `volume` |
| `volumes.datasets.list` | Child datasets (inheritance) | `volume.datasets.list` |
| `volumes.snapshots.list` | ZFS snapshots | `volume.snapshots.list` |
| `volumes.scrubs.list` | Scrub history + next-scrub schedule | `volume.scrubs.list` |
| `volumes.performance` | IOPS / throughput / latency | `volume.performance` |

MIME types: `application/vnd.cloudbsd+volume*`. Shapes against `data-structures.md` `interface Volume`.

**View-only directive**: NO write endpoints for volumes per audit §21.5. Mutations route through TaskSchedule (§2.21).

### 2.26 Node detail (single) — added 2026-07-07 (T82b)

Per `23-node-detail-panel.svg`. 7 sub-tabs: Overview, ZFS, GPUs, Network, VMs, Logs, Settings.

| `what` header | Purpose | Response kind |
|---|---|---|
| `nodes.get` | Single node by hostname | `node` |
| `nodes.zfs.list` | ZFS pools (mirror/stripe/raidz) | `node.zfs.list` |
| `nodes.gpus.list` | GPU inventory + vGPU pool (per `17-vgpu-pool.svg`) | `node.gpus.list` |
| `nodes.network.list` | Interfaces + VLANs + bonds | `node.network.list` |
| `nodes.vms.list` | VMs hosted on this node + per-VM load | `node.vms.list` |
| `nodes.logs.list` | node.log tail (cloudbsd-agent output) | `node.logs.list` |

MIME types: `application/vnd.cloudbsd+node*`. Shapes against `data-structures.md` `interface Node`.

### 2.27 Plugin lifecycle (install/uninstall/per-plugin manifest) — added 2026-07-07 (T83b)

> Per-plugin operations. Complements §2.15 (global manifest fetch) and §2.16 (plugin data request) with install/uninstall/manifest-by-id lifecycle actions.

| `what` header | Purpose | Response kind |
|---|---|---|
| `plugins.manifest.get` | Single plugin manifest by id | `plugin.manifest` |
| `plugins.install` | Install from registry/upload | `plugin.install.result` |
| `plugins.uninstall` | Uninstall (with confirmation token) | (empty) |

**Install envelope**:
```json
{ "mime": "application/vnd.cloudbsd+envelope", "headers": [
    { "name": "who",  "value": "admin@cloudbsd.org" },
    { "name": "what", "value": "plugins.install" },
    { "name": "why",  "value": "user_requested" },
    { "name": "where", "value": "plugins_install_modal" }
], "payload": [
    { "mime": "application/vnd.cloudbsd+plugin.install", "kind": "plugin.install", "data": {
        "source": "registry",
        "pluginId": "github-mirrors@1.4.2",
        "signature": "ed25519:abc123...",
        "capabilities": ["mirror", "webhook", "backup"]
    } }
] }
```

**Single-plugin manifest response** (matches `22-plugin-detail.svg` content):
```json
{ "mime": "application/vnd.cloudbsd+plugin.manifest", "kind": "plugin.manifest", "data": {
    "id": "github-mirrors", "version": "1.4.2",
    "name": "github-mirrors", "author": "@cloudbsd", "license": "MIT",
    "size": 28672, "sha256": "a1b2c3...", "signature": "ed25519:...",
    "runtime": "nodejs@22", "api_version": "v2", "entry": "plugin.cjs",
    "capabilities": ["mirror", "webhook", "backup"],
    "permissions": { "declared": ["read:volumes", "read:task-schedules"], "granted": ["read:volumes", "read:task-schedules"] },
    "installedAt": "2026-04-12T18:24:00Z",
    "publishedAt": "2026-06-15T11:00:00Z"
} }
```

**Theme import verification (T84b)**: §2.13 "Theme list + apply + custom import/export" already defines `theme.import` envelope at lines 618-628. The corresponding `what` header value `themes.import` (POST-style envelope) exists for theme import. Verified 2026-07-07 — no gap.

---


### 2.31 — Action viability (per-action pre-flight) — added 2026-07-10

> Distinct from §2.17 (deployment-level pre-flight check used
> during install/upgrade/health). §2.31 is the
> **action-level** pre-flight: "may I run this action on this
> resource right now?" It's called per (resource, action) pair
> before the UI renders the action button.

**Endpoint**:
```
POST /api/<resource>/<id>/<action>/preflight
Content-Type: application/vnd.cloudbsd+envelope
```
With envelope `what` header value `<resource>.<action>.preflight`
(snake-case verb form, e.g. `network.bond.lacp.preflight`,
`vm.migrate.live.preflight`).

**Request**:
```json
{ "mime": "application/vnd.cloudbsd+envelope",
  "headers": [
    { "name": "who", "value": "admin@example.lan" },
    { "name": "what", "value": "network.bond.lacp.preflight" },
    { "name": "where", "value": "node_detail_panel@tabs.network" }
  ],
  "payload": [
    { "mime": "application/vnd.cloudbsd+preflight.request",
      "kind": "preflight.request",
      "data": {
        "resource": { "type": "network-bond", "id": "bond0" },
        "action": "edit-lacp"
      }
    }
  ]
}
```

**Response**:
```json
{ "mime": "application/vnd.cloudbsd+preflight.result",
  "kind": "preflight.result",
  "data": {
    "viable": false,
    "blockers": [
      { "id": "pci-bus-bandwidth",
        "message": "Both NICs must be on the same PCI bus with sufficient lanes.",
        "detail": "ixl0 on bus 0000:01, ixl1 on bus 0000:82 (different NUMA nodes, separated by the chip's UPI link)",
        "remediation": "Move ixl1 to a slot on the same CPU complex or use a software bridge instead." },
      { "id": "switch-partner",
        "message": "No LACP partner detected.",
        "detail": "Upstream switch port eth1/47 does not advertise LACP BPDUs",
        "remediation": "Configure the upstream switch port as a trunk with channel-group mode active." }
    ],
    "warnings": [
      { "id": "running-workloads",
        "message": "2 VMs (nextcloud, mastodon) are using these interfaces as the bridge uplink. Bonding will cause a 30-60s outage.",
        "impact": "outage_seconds", "expectedRange": [30, 60] }
    ],
    "checks": [
      { "id": "nic-speed-match", "status": "PASS",
        "message": "Both interfaces 10 Gbps full-duplex" },
      { "id": "nic-driver", "status": "PASS",
        "message": "ixl 1.0.0 supports LACP" },
      { "id": "pci-bus-bandwidth", "status": "FAIL",
        "message": "Different NUMA nodes" },
      { "id": "switch-partner", "status": "FAIL",
        "message": "No LACP partner on upstream" },
      { "id": "cluster-quorum", "status": "PASS",
        "message": "Cluster has 3 active members, quorum ok" }
    ],
    "ttlMs": 30000,
    "fetchedAt": "2026-07-10T16:32:18Z"
  }
}
```

**Contract**:
- `viable: true`  ⇒ no blockers; warnings may still exist.
- `viable: false` ⇒ at least one entry in `blockers[]`.
- `blockers[].remediation` is **actionable text** — never
  just "blocked". Tells the user what would unblock it.
- `ttlMs` is the **client cache validity window**. Client
  may reuse this response for ≤ `ttlMs` without re-asking,
  unless an invalidating `StreamEvent` arrives first.

**Client caching & invalidation**:
Cache key = `(resource.type, resource.id, action)`. Cached
value is dropped early when any of these StreamEvent topics
fire (§2.29 + data-structures.md §6):

| Resource | Invalidating StreamEvent topics |
|---|---|
| nic / bond | `nic.link.state.changed`, `nic.speed.changed`, `nic.pci-bus.changed`, `bond.member.changed`, `switch.partner.changed` |
| vm | `vm.state.changed`, `vm.resource.changed`, `vm.workload.migrated`, `node.heartbeat.lost` |
| container | `container.state.changed`, `container.resource.changed` |
| jail | `jail.state.changed`, `jail.workload.migrated` |
| volume | `volume.zfs.changed`, `volume.health.changed`, `pool.scrub.started`, `pool.scrub.ended` |
| node | `node.heartbeat.lost`, `node.drain.started`, `node.roles.changed` |
| plugin | `plugin.installed`, `plugin.uninstalled`, `plugin.capabilities.changed` |
| user/session | `session.revoked`, `api-key.rotated`, `user.role.changed` |

**UI behavior (binding to methodology Rule #1 + Rule #8 together)**:

Rule #1 (2026-07-16): **management by default** — describe →
preflight → confirm → execute. View-only is an **auditor role**,
not a permanent product-wide hide of all actions. See
`product-ia-esxi-vsphere-2026-07-16.md` §2.1 and
`angular-migration.md` Rule #1.

- Action menu is rebuilt on every pre-flight response + every
  invalidating StreamEvent (and omitted entirely for auditor role).
- Hidden action (blocker) ⇒ user does not see the option; the
  unanswered case is "why can't I edit this bond?" — answered
  by the diagnostics widget linking to preflight diagnostics
  screens (`92-auth-capabilities-admin` / `93-preflight-diagnostics-admin`)
  under **System → Diagnostics**.
- ⚠ action ⇒ confirm modal says "The following warnings will
  apply: … Acknowledge to proceed."


### 2.32 — Action viability matrix — added 2026-07-10

> Definitive list of every action, the pre-flight checks it
> needs, and which checks are blockers vs. warnings. Backend
> implements these as a `preflight.yaml` registry (§2.32.1
> below); `viability-check.ts` (T125) consumes it client-side.

#### 2.32.1 — Network actions

| Action | Resource | Pre-flight checks (blockers `■`, warnings `⚠`) |
|--------|----------|------------------------------------------------|
| `Edit LACP bond`           | bond | ■ nic-speed-match, ■ nic-driver-supports-lacp, ■ pci-bus-bandwidth, ■ switch-partner, ⚠ running-workloads-on-uplink |
| `Edit static interface`    | nic  | ■ ip-not-in-use-on-subnet, ■ subnet-has-free-address, ⚠ active-streams-on-interface |
| `Add a new bond`           | node | ■ enough-free-nics, ■ permissions, ■ cluster-quorum |
| `Delete bond/interface`    | nic  | ■ not-in-use-by-workloads, ■ role-is-not-primary |
| `Add bridge`               | node | ■ permissions, ■ vlan-id-available, ■ cluster-quorum |
| `Update DHCP range`        | subnet | ⚠ reservations-out-of-range |
| `Change DNS upstream`      | cluster | ⚠ apply-window (cluster-wide), ■ resolvers-reachable |

#### 2.32.2 — VM actions

| Action | Pre-flight checks |
|--------|-------------------|
| `Create VM` | ■ target-node-resources, ■ image-available, ■ network-pool-configured, ■ user-permission, ⚠ data-disk-large |
| `Live migrate VM`         | ■ vm-state-running, ■ target-node-healthy, ■ shared-storage-or-rdma, ■ target-resources, ■ network-bandwidth-sufficient, ■ cpu-pinning-compatible, ⚠ vm-non-undoable-secs |
| `Cold migrate VM`         | ■ target-node-healthy, ■ shared-storage-compatible, ■ target-resources |
| `Snapshot VM`             | ■ pool-disk-space, ■ dataset-writable, ⚠ snapshot-count-near-limit |
| `Restore snapshot to new VM` | ■ snapshot-exists, ■ template-compatible, ■ name-unique |
| `Restore snapshot in place`| ■ vm-stopped, ■ encryption-match |
| `Edit VM hardware (stopped)` | ■ vm-stopped, ■ hardware-supported |
| `Hot-add disk/RAM/CPU`    | ■ hotplug-supported-by-guest, ■ bus-has-free-slot |
| `Start VM`                | ■ vm-stopped, ■ target-node-resources, ■ image-attached |
| `Reboot VM` (soft)        | ■ guest-agent-responsive |
| `Force-stop VM`           | ⚠ vm-write-loss-risk |
| `Delete VM`               | ■ user-confirmed, ■ not-required-as-cert-renewal-source |

#### 2.32.3 — Container actions

| Action | Pre-flight checks |
|--------|-------------------|
| `Create container`        | ■ image-available, ■ target-node-resources, ■ network-pool-configured, ⚠ image-trust-not-verified |
| `Live migrate container`  | ■ target-node-healthy, ■ target-resources |
| `Snapshot container`      | (same as VM) |
| `Edit env-vars`           | ■ container-stopped (or hot-reload-capable), ⚠ restart-required |
| `Delete container`        | ■ no-dependent-services |

#### 2.32.4 — Jail actions

| Action | Pre-flight checks |
|--------|-------------------|
| `Create jail`             | ■ base-jail-available, ■ network-pool-configured |
| `Snapshot jail`           | ■ pool-disk-space, ■ jail-stopped (or snapshot-capable) |

#### 2.32.5 — Volume actions

| Action | Pre-flight checks |
|--------|-------------------|
| `Create dataset`          | ■ parent-pool-writable, ■ name-unique, ■ quota-reasonable |
| `Attach to VM`            | ■ volume-and-vm-bus-compatible, ■ device-name-free |
| `Run scrub`               | ■ pool-not-currently-scrubbing, ■ io-resource-available |
| `Delete dataset`          | ■ user-confirmed, ■ no-children-with-data, ⚠ snapshots-will-be-purged |

#### 2.32.6 — Node actions

| Action | Pre-flight checks |
|--------|-------------------|
| `Add node to cluster`     | ■ mdn-discoverable-or-ip-reachable, ■ credentials-valid, ■ same-cluster-id, ■ same-product-version, ■ agent-version-compatible, ⚠ version-newer (offer upgrade first) |
| `Remove node`             | ■ node-drained, ■ quorum-preserved, ■ user-confirmed |
| `Drain node`              | ■ workloads-migratable, ■ migration-target-has-resources |
| `Update agent`            | ■ node-online, ■ free-space-for-rollback, ■ target-release-reachable |
| `Reboot node`             | ■ workloads-migrated-or-stopped, ■ cluster-quorum-preserved |

#### 2.32.7 — Backup actions

| Action | Pre-flight checks |
|--------|-------------------|
| `Run backup now`          | ■ target-reachable, ■ quota-available, ■ snapshot-retainable, ⚠ bandwidth-contention |
| `Restore backup`          | ■ backup-exists, ■ target-writable, ■ compatible-version, ⚠ will-overwrite-current-data |
| `Edit backup schedule`    | ■ schedule-parses, ⚠ next-run-too-close |

#### 2.32.8 — Auth / user actions

| Action | Pre-flight checks |
|--------|-------------------|
| `Rotate API key`          | ■ caller-has-permission, ⚠ active-integrations-using-this-key, ⚠ last-credential-may-break-agents |
| `Delete user`             | ■ not-last-admin, ■ no-active-sessions, ■ caller-has-permission |
| `Reset MFA for user`      | ■ caller-has-permission, ⚠ forces-reenrollment |
| `Disable MFA globally`    | ■ caller-is-super-admin, ■ additional-mitigations-present, ⚠ weakens-auth-posture |

#### 2.32.9 — System actions

| Action | Pre-flight checks |
|--------|-------------------|
| `Update system`           | ■ free-space-≥-2x-release-size, ■ target-release-reachable, ■ rollback-slot-free, ■ quorum-preserved, ⚠ reboot-required |
| `Rollback system`         | ■ previous-image-available, ■ migrations-since-upgrade-reversible, ⚠ may-lose-some-data |
| `Enable plugin`           | ■ plugin-manifest-signed, ■ dependencies-satisfied, ■ capability-scope-in-policy, ■ not-already-enabled, ⚠ grants-additional-permissions |
| `Disable plugin`          | ■ not-required-by-other-plugin |
| `Update theme`            | ■ theme-manifest-valid, ⚠ dark/light-mode-compatibility |

#### 2.32.10 — Plugin-defined actions

Every plugin MAY add its own actions. Per the plugin
contract (T90), each plugin action MUST include a
`preflight_checks.yaml` in its manifest. Format:

```yaml
action: github-mirrors.sync
checks:
  - id: target-reachable
    type: network
    severity: blocker
  - id: github-token-present
    type: credential
    severity: blocker
  - id: throughput-acceptable
    type: metric
    severity: warning
```

Backend refuses to register any plugin whose
`preflight_checks.yaml` is malformed; this is part of the
plugin manifest validation step (T93).

---

## 3. Mock implementation in the UI

The Angular app's `web-new/src/app/mocks/` directory MUST implement this exact protocol against in-memory data so the future Go backend is a drop-in replacement.

```
web-new/src/app/mocks/
  envelope.ts            # Envelope type + helpers (matches §1.1)
  handlers/
    auth.ts              # auth.login, auth.session.validate, auth.logout
    vms.ts               # vms.list, vms.console.token
    containers.ts        # containers.list
    jails.ts             # jails.list
    volumes.ts           # volumes.list
    network.ts           # network.topology
    cluster.ts           # cluster.status, cluster.node.list
    users.ts             # users.list
    logs.ts              # logs.list, logs.stream (RxJS Subject)
    notifications.ts     # notifications.list, notifications.markRead
    themes.ts            # themes.list, themes.apply, themes.import/export
    settings.ts          # settings.get, settings.update
    plugins.ts           # plugins.manifest, plugins.invoke
    preflight.ts         # preflight.check
    status.ts            # status.aggregate
  http.ts                # MockHttpInterceptor that converts HttpClient calls → envelope exchanges
  socket.ts              # MockSocketService that emits Socket.IO-style events
```

The HTTP interceptor MUST:
1. Convert every `HttpClient.post(...)` into the envelope shape
2. Return `Observable<Envelope<P>>` unwrapped to `P` (the payload data)
3. Translate `application/vnd.cloudbsd+error` envelopes to `ErrorHandlingService.handle()`
4. Inject `X-CloudBSD-Who/What/Why/Where` from current `AuthStore` + route context

---

## 4. Backend (Go) implementation notes

When implementing in Go:

- HTTP server uses `chi` router (lightweight, idiomatic, middleware-friendly)
- All handlers read `*Envelope[P]`, dispatch on `headers["what"]`, return `*Envelope[R]`
- Validation via `go-playground/validator/v10` against per-action struct tags
- PAM via `github.com/msteinert/pam` or local CGO binding
- SQLite via `modernc.org/sqlite` (pure Go, no CGO required for FreeBSD cross-build)
- WebSocket via `github.com/gorilla/websocket`
- Plugin isolation via `plugin.Open()` (Go's native plugin system, requires CGO on FreeBSD)
- Hexagonal architecture: handlers → services → repositories, with interfaces for testability

The Go service lives in `~/git/cloudbsd-admin-backend/` (Go module `github.com/cloudbsdorg/cloudbsd-admin-backend`).

For FreeBSD port: depends on `lang/go124` (most stable, security updates tracked per FreshPorts). NOT `lang/go` meta-port (latest) to avoid Go version drift across rebuilds. The FreeBSD port Makefile should set `GO_VERSION=	1.24`.

---

## 5. Inventory of all UI→backend exchanges (full surface)

| Screen / Component | `what` action(s) | What server returns |
|--------------------|------------------|---------------------|
| Login (T15q) | `auth.login` | `session` |
| App boot (T15c, T18) | `preflight.check` (L1), `auth.session.validate` | `preflight.result`, `session.status` |
| App boot (T7b) | (WebSocket) `subscribe:manifests`, `subscribe:metrics` | Stream events |
| Dashboard (T26) | `dashboard.bootstrap` | 11 payload items (CPU/MEM/Disk/Network/Temp/Load/Proc/ZFS/Activity/Consumers/Stats) |
| VMs (T28) | `vms.list` (paginated) | `vms.batch` + `vm[]` |
| VM detail (T34) | `vms.get` | `vm` + `metrics` + `volumes[]` |
| VM console (T120) | `vms.console.token` → `wss://...` | `vm.console.token` (JWT for websockify) |
| Containers (T29) | `containers.list` | `containers.batch` + `container[]` |
| Jails (T30) | `jails.list` | `jails.batch` + `jail[]` |
| Volumes (T31) | `volumes.list` | `volays.batch` + `volume[]` |
| Network Map (T32) | `network.topology` | `network.topology` |
| Cluster (T33) | `cluster.status`, `cluster.node.list`, `cluster.events` | Multiple items |
| Users (T35) | `users.list` | `users.batch` + `user[]` |
| Logs (T36) | `logs.list` (paginated) + WebSocket `subscribe:logs` | `logs.batch` + `log.entry[]` (REST + stream) |
| Notifications (T37) | `notifications.list`, `notifications.markRead` | `notifications.batch` + `notification[]` |
| Themes (T22a, T22b) | `themes.list`, `themes.apply`, `themes.import`, `themes.export` | `themes.batch` + `theme[]` |
| Settings (T22, T22e) | `settings.get`, `settings.update` | `settings` |
| Plugin page render | `plugins.manifest`, `plugins.invoke` | `plugin.manifest[]`, `plugin.result` |
| Status (T14) | `status.aggregate` | `status.aggregate` + `plugin.health[]` |
| About (T13) | `status.aggregate` (subset) + `version` | Multiple |
| Help (T15m) | `help.search`, `help.topics` | `help.results` |
| Docs (T3s) | `docs.list`, `docs.get` | `docs.batch` + `doc[]` |
| API docs (T3t) | `openapi.spec` | `openapi.spec` |
| Release notes (T3v) | `release-notes.list` | `release-notes.batch` |
| Frost-out trigger (T20) | (response to any 401) | `application/vnd.cloudbsd+error` envelope with `code=AUTH_SESSION_EXPIRED` |
| Error reporting (T15r) | (consumer of all error envelopes) | N/A |

Every `what` action MUST be implemented in the Go backend per the response shape in §2.

---

## 6. Validation: JSON Schema for every object & key

> **Every JSON message (envelope + every payload item) MUST validate against an explicit JSON Schema. Reject (400) anything that doesn't match — never silently coerce.**

### 6.1 Validation principles

1. **Reject unknown fields** at the envelope level (`additionalProperties: false`). Prevents prototype pollution and accidental data leaks.
2. **Reject missing required fields** with a clear problem type (`https://errors.cloudbsd.org/protocol/missing-field`).
3. **Type-strict** — no implicit coercion (string "42" must NOT become number 42).
4. **Length-bounded** — every string has `maxLength`, every array has `maxItems`.
5. **Enum-constrained** — header `name` enum, `what` action enum per route, status values enum, etc.
6. **Pattern-bounded** — IDs, names, IPs, hostnames have regex patterns.
7. **Versioned schemas** — every schema has `$id` and `$version`. Schema changes are versioned; breaking changes require a new schema version.
8. **Format-validated** — strings claiming to be URIs, dates, IPv4/IPv6 are validated via `format` keyword.

### 6.2 Envelope schema (canonical, versioned)

```jsonc
// schemas/envelope.v1.json (draft 2020-12)
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://cloudbsd.org/schemas/envelope.v1.json",
  "$version": "1.0.0",
  "type": "object",
  "additionalProperties": false,
  "required": ["mime", "requestId", "timestamp", "context", "headers", "payload"],
  "properties": {
    "mime":      { "type": "string", "const": "application/vnd.cloudbsd+envelope" },
    "requestId": { "type": "string", "format": "uuid", "maxLength": 36 },
    "timestamp": { "type": "string", "format": "date-time" },
    "context":   { "$ref": "context.v1.json" },
    "headers":   { "type": "array", "minItems": 1, "maxItems": 32, "items": { "$ref": "header.v1.json" } },
    "payload":   { "type": "array", "maxItems": 64, "items": { "$ref": "payload-item.v1.json" } },
    "errors":    { "type": "array", "maxItems": 32, "items": { "$ref": "error-item.v1.json" } },
    "next":      { "type": "string", "maxLength": 4096 },
    "meta":      { "$ref": "meta.v1.json" }
  }
}
```

### 6.3 CloudBSD header schema

```jsonc
// schemas/header.v1.json
{
  "$id": "https://cloudbsd.org/schemas/header.v1.json",
  "$version": "1.0.0",
  "type": "object",
  "additionalProperties": false,
  "required": ["name", "value"],
  "properties": {
    "name": {
      "type": "string",
      "enum": [
        "who", "what", "why", "where",          // required core
        "when", "how",                            // optional
        "if-match", "if-none-match",              // conditional
        "idempotency-key"                          // idempotency
      ]
    },
    "value": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "pattern": "^[\\x20-\\x7E]+$"             // printable ASCII only
    }
  }
}
```

`who` value: `^[a-zA-Z0-9._@-]+$` (max 256) — username OR `system:<component>:<action>`.
`what` value: `^[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]*$` (max 128) — `<resource>.<action>` lowercase, dot-separated.
`why` value: `^[a-z][a-z0-9_]*$` (max 64) — single lowercase snake_case token (e.g. `user_requested`, `scheduled_sync`).
`where` value: `^[a-z][a-z0-9_]*$` (max 64) — same rules as `why`.

### 6.4 Payload item schema

```jsonc
// schemas/payload-item.v1.json
{
  "$id": "https://cloudbsd.org/schemas/payload-item.v1.json",
  "$version": "1.0.0",
  "type": "object",
  "additionalProperties": false,
  "required": ["mime", "kind", "data"],
  "properties": {
    "mime":      { "type": "string", "pattern": "^application/vnd\\.cloudbsd\\+[a-z][a-z0-9._-]*$", "maxLength": 128 },
    "kind":      { "type": "string", "pattern": "^[a-z][a-z0-9._-]*$", "maxLength": 64 },
    "action":    { "type": "string", "enum": ["create", "read", "update", "delete", "list", "stream"] },
    "version":   { "type": "string", "pattern": "^v[0-9]+-[a-f0-9]+$", "maxLength": 64 },
    "data":      { "type": "object" },
    "includes":  { "type": "array", "maxItems": 32, "items": { "$ref": "#" } }
  }
}
```

The `data` field's schema depends on the `mime` value — see §6.5 for per-resource schemas.

### 6.5 Per-resource schemas (required minimum)

| MIME | Schema file | Required keys |
|------|-------------|---------------|
| `application/vnd.cloudbsd+session` | `session.v1.json` | `sessionId`, `userId`, `email`, `groups[]`, `roles[]`, `isAdmin`, `expiresAt` |
| `application/vnd.cloudbsd+vm` | `vm.v1.json` | `id`, `name`, `status`, `vcpu`, `ramBytes`, `diskBytes`, `host`, `ip` |
| `application/vnd.cloudbsd+vms.batch` | `vms.batch.v1.json` | `total`, `shown`, `stats` |
| `application/vnd.cloudbsd+container` | `container.v1.json` | `id`, `name`, `image`, `imageRegistry`, `status`, `ports[]` |
| `application/vnd.cloudbsd+jail` | `jail.v1.json` | `id`, `name`, `status`, `os`, `hostname`, `ip`, `jailId` |
| `application/vnd.cloudbsd+volume` | `volume.v1.json` | `id`, `name`, `type`, `sizeBytes`, `usedBytes`, `mountpoint`, `health` |
| `application/vnd.cloudbsd+network.topology` | `network.topology.v1.json` | `subnets[]`, `nodes[]`, `links[]` |
| `application/vnd.cloudbsd+cluster.node` | `cluster.node.v1.json` | `id`, `hostname`, `role`, `status` |
| `application/vnd.cloudbsd+user` | `user.v1.json` | `uid`, `username`, `gid`, `pamStatus`, `groups[]` |
| `application/vnd.cloudbsd+log.entry` | `log.entry.v1.json` | `ts`, `level`, `module`, `source`, `message` |
| `application/vnd.cloudbsd+notification` | `notification.v1.json` | `id`, `ts`, `severity`, `title`, `message` |
| `application/vnd.cloudbsd+theme` | `theme.v1.json` | `id`, `name`, `author`, `license`, `tokens` |
| `application/vnd.cloudbsd+settings` | `settings.v1.json` | `section`, `values` |
| `application/vnd.cloudbsd+plugin.manifest` | `plugin.manifest.v1.json` | `name`, `version`, `author`, `license`, `sha256`, `signature`, `capabilities[]` |
| `application/vnd.cloudbsd+problem` | `problem.v1.json` | `type`, `severity`, `code`, `message`, `errorId` |
| `application/vnd.cloudbsd+status.aggregate` | `status.aggregate.v1.json` | `backend`, `database`, `plugins`, `config` |
| `application/vnd.cloudbsd+preflight.result` | `preflight.result.v1.json` | `status`, `checks[]` |

Every per-resource schema MUST:
1. Have `$id` = `https://cloudbsd.org/schemas/<resource>.v<N>.json`
2. Have `$version` matching the schema version in the MIME type
3. Use `additionalProperties: false` to reject unknown fields
4. Define `required` array listing all mandatory keys
5. Constrain each string with `maxLength`, each array with `maxItems`, each number with `minimum`/`maximum`
6. Define `enum` for status, role, severity, action discriminator fields

### 6.6 ID validation rules

| Field | Pattern | Max length |
|-------|----------|------------|
| `id` (VM, container, jail, volume, user, notification, etc.) | `^[a-z][a-z0-9_-]*$` | 64 |
| `vmId`, `containerId`, `jailId` | `^vm-\|^ct-\|^jail-\|^vol-\|^user-` | 64 |
| `sessionId` | `^sess-[a-f0-9]{32}$` | 64 |
| `userId` | `^[a-z][a-z0-9._@-]*$` | 256 |
| `errorId` | `^err-[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-f0-9]{6,12}$` | 64 |
| `requestId` | `^req-[a-f0-9-]{36}$` (UUID v4) | 64 |
| `idempotencyKey` | `^[a-f0-9-]{36}$` (UUID v4) | 64 |

### 6.7 Numeric validation

| Field | Type | Range | Unit |
|-------|------|-------|------|
| `vcpu` | int | 1..256 | cores |
| `ramBytes`, `diskBytes`, `sizeBytes`, `usedBytes` | int64 | 0..2^63-1 | bytes |
| `usagePercent`, `cpuPercent`, `memPercent` | int | 0..100 | percent |
| `iopsRead`, `iopsWrite` | int | 0..10^9 | ops/s |
| `netRxBytesPerSec`, `netTxBytesPerSec` | int64 | 0..10^12 | bytes/s |
| `uptimeSec` | int64 | 0..2^63-1 | seconds |
| `latencyMs` | int | 0..60000 | milliseconds |
| `retryAfter` | int | 1..86400 | seconds |
| `expiresInSec`, `idleTimeoutSec` | int | 1..86400 | seconds |

### 6.8 Enum constraints

| Field | Allowed values |
|-------|---------------|
| `status` (VM) | `RUN`, `STOP`, `PAUS`, `ERR` |
| `status` (container) | `RUN`, `EXIT`, `PAUS`, `ERR` |
| `status` (jail) | `RUN`, `STOP`, `FROZEN` |
| `status` (volume) | `healthy`, `watch`, `error` |
| `status` (cluster node) | `healthy`, `degraded`, `offline` |
| `status` (overall backend) | `UP`, `DOWN` |
| `status` (database) | `HEALTHY`, `DEGRADED`, `ERROR` |
| `status` (plugin) | `RUN`, `DISABLED`, `ERROR` |
| `status` (user PAM) | `active`, `locked`, `expired`, `disabled` |
| `severity` (notification) | `ERROR`, `WARN`, `INFO` |
| `severity` (problem) | `CRITICAL`, `ERROR`, `WARNING`, `INFO` |
| `level` (log) | `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL` |
| `role` (cluster node) | `master`, `worker` |
| `action` (payload item) | `create`, `read`, `update`, `delete`, `list`, `stream` |
| `protocol` (port) | `tcp`, `udp` |
| `compression` (volume) | `off`, `lz4`, `zstd-3`, `zstd-9` |
| `encryption` (volume) | `none`, `aes-256-gcm` |
| `mfa` (config) | `none`, `optional`, `required` |

### 6.9 Rejection behavior (server-side)

```
Request validation fails:
  → HTTP 400 BAD_REQUEST
  → Content-Type: application/vnd.cloudbsd+error
  → Body: ErrorItem with code field set to PROBLEM_TYPE:

    PROBLEM_TYPE_VALUES = [
      "https://errors.cloudbsd.org/protocol/missing-header",        # who/what/why/where absent
      "https://errors.cloudbsd.org/protocol/unknown-header",         # header.name not in enum
      "https://errors.cloudbsd.org/protocol/missing-field",         # required field absent
      "https://errors.cloudbsd.org/protocol/unknown-field",          # additionalProperties violation
      "https://errors.cloudbsd.org/protocol/invalid-type",           # type mismatch
      "https://errors.cloudbsd.org/protocol/invalid-enum",           # value not in enum
      "https://errors.cloudbsd.org/protocol/invalid-format",         # format mismatch (UUID, IPv4, etc.)
      "https://errors.cloudbsd.org/protocol/value-too-long",         # maxLength exceeded
      "https://errors.cloudbsd.org/protocol/prototype-pollution",     # __proto__/constructor detected
    ]
```

### 6.10 Validation tooling

**Frontend (Angular mock)** — uses `ajv` (JSON Schema validator, fastest in JS):
```typescript
import Ajv from 'ajv';
const ajv = new Ajv({ allErrors: true, strict: true, removeAdditional: false });

// Compile each schema once at startup
const validateEnvelope = ajv.compile(envelopeSchema);
const validateVm        = ajv.compile(vmSchema);
const validateBatch      = ajv.compile(vmsBatchSchema);
// ...one per resource

// In MockHttpInterceptor:
const envelope = JSON.parse(req.body);
if (!validateEnvelope(envelope)) {
  throw new ErrorHandlingService.handle({
    severity: 'ERROR',
    code: validateEnvelope.errors?.[0]?.keyword ?? 'INVALID',
    message: 'Envelope validation failed',
    context: { errors: validateEnvelope.errors },
  });
}
// Then validate each payload item against its per-MIME schema
for (const item of envelope.payload) {
  const validator = schemaForMime[item.mime];
  if (!validator(item)) { /* same error path */ }
}
```

**Backend (Go)** — uses `github.com/santhosh-tekuri/jsonschema/v5`:
```go
import "github.com/santhosh-tekuri/jsonschema/v5"

var envelopeSchema = loadSchema("envelope.v1.json")
var vmSchema       = loadSchema("vm.v1.json")
// ...

func validateRequest(envelope *Envelope) *Problem {
    if err := envelopeSchema.Validate(envelope); err != nil {
        return &Problem{
            Type:     problemTypeFromKeyword(err.(*jsonschema.ValidationError).Keyword()),
            Severity: "ERROR",
            Code:     "PROTOCOL_INVALID",
            Message:  "Request validation failed",
            Context:  map[string]any{"errors": err.(*jsonschema.ValidationError).BasicOutput()},
        }
    }
    for _, item := range envelope.Payload {
        sch := schemaForMime[item.MIME]
        if sch == nil {
            return unknownMimeProblem(item.MIME)
        }
        if err := sch.Validate(item); err != nil {
            return invalidPayloadProblem(err)
        }
    }
    return nil
}
```

### 6.11 Schema version negotiation

When a client sends `version: "v2-a1b2"` but server only knows `v1`:
- Server returns `application/vnd.cloudbsd+error` with `code=PROTOCOL_VERSION_UNSUPPORTED`
- Server includes `supported_versions: ["v1"]` in error context
- Client falls back to `v1` (highest version both support)

When server introduces `v2`:
- Server accepts BOTH `v1` and `v2` for 90 days (deprecation period)
- During deprecation, `meta.deprecation: ["v1 will be removed 2026-10-01"]`
- After 90 days, only `v2` accepted

### 6.12 Acceptance criteria for validation

1. Every JSON message has a corresponding JSON Schema file in `schemas/` directory
2. Every schema has `$id`, `$version`, `additionalProperties: false`, `required` array
3. Frontend mocks validate EVERY outgoing request envelope + payload items BEFORE logging "request sent"
4. Backend validates EVERY incoming request envelope + payload items BEFORE dispatching to handlers
5. Rejection of malformed requests returns proper `application/vnd.cloudbsd+error` envelope with correct problem type URI
6. Schema changes are versioned; breaking changes ship as new schema version, not in-place edits
7. Unknown headers rejected with `PROTOCOL_UNKNOWN_HEADER`; unknown MIME types rejected with `PROTOCOL_UNKNOWN_MIME`
8. Prototype pollution attempt (`__proto__` key in payload) rejected with `PROTOCOL_PROTOTYPE_POLLUTION`
9. CI runs schema-against-fixtures test: every example in WIRE_PROTOCOL.md must validate against its schema
10. CI runs schema-against-fuzz test: 10k random mutations of valid envelopes must ALL fail validation

---

## 7. Versioning

> **Every message format MUST be versioned. Clients and servers MUST support multiple versions concurrently during deprecation windows. Never break existing clients.**

### Three orthogonal versioning dimensions

| Dimension | Where it appears | Example |
|-----------|------------------|---------|
| **Envelope schema version** | HTTP `Accept`/`Content-Type` header parameter + `meta.envelopeVersion` | `application/vnd.cloudbsd+envelope;v=2` |
| **MIME type schema version** | Inside JSON Schema `$id` and `$version` fields + per-item `version` field | `vm.v1.json`, `vm.v2.json`; `version: "v1-a7f3"` |
| **Wire version (capability negotiation)** | Server-supplied via `X-CloudBSD-Server-Version` header | `v2.3.0+go1.26.3+freebsd16.0-current-amd64` |

### HTTP content negotiation

```
# Client requests a specific envelope version
POST /api
Accept: application/vnd.cloudbsd+envelope;v=2
Content-Type: application/vnd.cloudbsd+envelope;v=2

# Server responds with the version it ACTUALLY used
Content-Type: application/vnd.cloudbsd+envelope;v=2
X-CloudBSD-Envelope-Version: 2
X-CloudBSD-Server-Version: v2.3.0+go1.26.3+freebsd16.0-current-amd64
```

If the client requests `v=2` but server only supports `v=1`:
```
HTTP/1.1 406 Not Acceptable
Content-Type: application/vnd.cloudbsd+error
```
```json
{
  "mime": "application/vnd.cloudbsd+error",
  "payload": [{
    "mime": "application/vnd.cloudbsd+problem",
    "data": {
      "type": "https://errors.cloudbsd.org/protocol/version-unsupported",
      "severity": "ERROR",
      "code": "PROTOCOL_VERSION_UNSUPPORTED",
      "message": "Envelope version 2 requested but server supports 1",
      "errorId": "err-2026-07-06-ver-9b1c",
      "context": { "requestedVersion": 2, "supportedVersions": [1] }
    }
  }]
}
```

### Per-MIME schema versioning

Each per-MIME schema is an independent file with its own version:

```
schemas/resources/
├── vm.v1.json              # current production schema
├── vm.v2.json              # next version (additive, no breaking changes)
├── vm.v3.json              # future breaking version (DRAFT)
```

The MIME type itself does NOT change with schema version (still `application/vnd.cloudbsd+vm`), but the server includes the schema version in each payload item:

```json
{
  "mime": "application/vnd.cloudbsd+vm",
  "kind": "vm",
  "version": "v1-a7f3",            // MAJOR + 8-char content hash
  "data": { ... }
}
```

The `version` field uses the format `v<MAJOR>-<8-char-content-hash>`:
- `MAJOR` = schema version (1, 2, 3, ...)
- `<8-char-content-hash>` = first 8 chars of SHA-256 of the schema file

This allows clients to detect if they understand the schema and supports cache invalidation.

### Compatibility rules (semver-style)

| Schema change | Version bump | Backward compatible? |
|---------------|--------------|----------------------|
| Add new optional field | MINOR (v1 → v1.1, file `vm.v1.json` updated) | ✓ Yes |
| Add new required field | MAJOR (v1 → v2, new file `vm.v2.json`) | ✗ No — breaking |
| Remove field | MAJOR | ✗ No — breaking |
| Rename field | MAJOR | ✗ No — breaking |
| Add new enum value | MINOR | ✓ Yes |
| Remove enum value | MAJOR | ✗ No — breaking |
| Widen type (int → number) | MINOR | ✓ Yes |
| Narrow type (number → int) | MAJOR | ✗ No — breaking |
| Add new MIME type | MINOR (envelope) | ✓ Yes |
| Add new payload item type | MINOR | ✓ Yes |

**Rule**: any change to `additionalProperties: false` is **always** MAJOR (breaking — clients sending old fields will be rejected).

### Deprecation protocol

1. New schema version released (e.g. `vm.v2.json`)
2. Old schema version continues to be served (e.g. `vm.v1.json`)
3. Server sets `meta.deprecation: ["vm.v1 will be removed 2026-10-01"]` in responses
4. Server sends `Warning: 299 cloudbsd.org "vm.v1 deprecated, use v2"` HTTP header
5. Server logs warning when v1 is used
6. After 90 days: v1 removed; v1 requests return `PROTOCOL_VERSION_UNSUPPORTED`

### Client-side version handling

```typescript
// web-new/src/app/protocol/version-negotiator.ts
@Injectable({ providedIn: 'root' })
export class VersionNegotiator {
  private serverVersion: string | null = null;
  private supportedEnvelopeVersions: number[] = [1];  // start with 1
  
  setFromResponse(headers: HttpHeaders): void {
    const v = headers.get('X-CloudBSD-Server-Version');
    if (v) this.serverVersion = v;
  }
  
  buildAcceptHeader(): string {
    const max = Math.max(...this.supportedEnvelopeVersions);
    return `application/vnd.cloudbsd+envelope;v=${max}`;
  }
  
  isSchemaDeprecated(payloadItem: any): boolean {
    return payloadItem.version?.startsWith('v1-') && !this.isOldVersionAllowed();
  }
}
```

### Wire version (full server version)

`X-CloudBSD-Server-Version: <git-describe>+<go-version>+<freebsd-version>`

Example: `v2.3.0+go1.26.3+freebsd16.0-current-amd64`

Components:
- `v2.3.0` — semantic version of cloudbsd-admin-backend
- `go1.26.3` — Go compiler version (per FreshPorts `lang/go126`)
- `freebsd16.0-current-amd64` — FreeBSD build target

This allows debugging "works on my machine" issues: client knows exactly what server version it talks to.

### Per-action version opt-in

Some actions may opt into newer behavior. Client signals via `Accept`:
```
POST /api
Accept: application/vnd.cloudbsd+envelope;v=2;actions=vms.list=v2,theme.apply=v2
```

Server responds with which actions it served at which version in `meta.versions`:
```json
{
  "meta": {
    "versions": {
      "vms.list": "v2",
      "theme.apply": "v1",
      "auth.login": "v1"
    }
  }
}
```

This allows **per-action gradual rollout** without forcing all-or-nothing version upgrades.

### Backward compatibility test matrix

CI runs this matrix on every PR:

```
┌─────────────────────┬──────────┬──────────┬──────────┐
│ Client \ Server     │ Server 1 │ Server 2 │ Server 3 │
├─────────────────────┼──────────┼──────────┼──────────┤
│ Client 1 (envelope) │   ✓      │   ✓      │   ✓      │
│ Client 2 (envelope) │   ✗      │   ✓      │   ✓      │
│ Client 3 (envelope) │   ✗      │   ✗      │   ✓      │
└─────────────────────┴──────────┴──────────┴──────────┘
```

Each cell: 6 representative exchanges (login, list, get, create, update, error) × 3 fixture types (happy path, edge case, error).

### Wire version history (canonical)

| Version | Released | Sunset | Status | Changes |
|---------|----------|--------|--------|---------|
| v1.0.0 | 2026-07-15 | — | **current** | Initial release, 30+ actions, 47 locales, 15 themes |
| v1.1.0 | 2026-09-01 | 2027-01-01 | planned | Add `vms.console.*` actions, noVNC WebSocket |
| v2.0.0 | 2026-12-01 | 2027-06-01 | planned | **breaking**: add required `context.requestFingerprint`, switch to Cursor-based pagination only |
| v2.1.0 | 2027-02-01 | 2027-08-01 | planned | Add plugin marketplace actions, signed plugin bundles |
| v3.0.0 | 2027-06-01 | — | future | **breaking**: switch to streaming-only, no more REST list |

Each version documented in `CHANGELOG.md` with migration path.

### Acceptance criteria for versioning

1. Server returns `X-CloudBSD-Server-Version: v<semver>+go<ver>+freebsd<ver>` on every response
2. Server parses `Accept: application/vnd.cloudbsd+envelope;v=<N>` and uses highest mutually supported version
3. Server returns `406 Not Acceptable` with `PROTOCOL_VERSION_UNSUPPORTED` if no compatible version
4. Per-MIME schema files have `$id` and `$version`; server tracks which versions it supports
5. Per-action version map (`meta.versions`) populated in every response
6. Deprecated schemas emit `Warning: 299 cloudbsd.org "..."` HTTP header
7. CI runs backward compatibility matrix on every PR
8. CI runs schema-against-fixtures per version on every PR
9. `CHANGELOG.md` documents breaking changes with migration path
10. Mock backend supports version negotiation end-to-end

---

## 8. Acceptance criteria (overall)

1. Every UI screen has at least one matching envelope exchange defined here
2. Every envelope request includes `who`, `what`, `why`, `where`
3. Every error response uses `application/vnd.cloudbsd+error` envelope (not standard envelope)
4. All MIME types follow `application/vnd.cloudbsd+<action-or-type>` convention
5. Mock handlers in `web-new/src/app/mocks/` implement all actions listed in §5
6. Switching from mock to real backend requires only changing `environment.apiBaseUrl` in `environment.ts`
7. Go backend (when implemented) MUST validate `who`, `what`, `why`, `where` against allowlist
8. Go backend MUST reject requests missing any required header with `400 BAD_REQUEST` and problem type `https://errors.cloudbsd.org/protocol/missing-header`
9. **Every JSON message validates against an explicit JSON Schema (see §6)**
10. **Prototype pollution attempts rejected with proper problem type**
11. **All string fields have maxLength, arrays have maxItems, numbers have range constraints**
12. **Schema versioning enables graceful fallback when versions mismatch** (see §7)
8. Go backend MUST reject requests missing any required header with `400 BAD_REQUEST` and problem type `https://errors.cloudbsd.org/protocol/missing-header`
### §2.28 — Node network editing endpoints (proposed 2026-07-10)

Companion to the NIC editor modals (32, 33, 34).

#### GET /api/nodes/{id}/ifaces
Returns all physical + virtual interfaces for the node.
```json
[
  {
    "name": "lagg0",
    "driver": "lagg",
    "kind": "bond",
    "speedMbps": 10000,
    "mtu": 1500,
    "mac": "52:54:00:1a:2b:3c",
    "members": ["igb0", "igb1"],
    "enabled": true,
    "role": "primary",
    "bondProto": "lacp"
  },
  {
    "name": "igb1",
    "driver": "igb",
    "kind": "physical",
    "speedMbps": 1000,
    "mtu": 1500,
    "mac": "52:54:00:1a:2b:41",
    "enabled": false,
    "role": "available"
  }
]
```

#### PATCH /api/nodes/{id}/ifaces
Body: array of iface patches (MTU, role, enabled, member-of bond).
Validation: cannot disable the only active member of a bond.
Side-effects: re-handshake lagg (3-7 s admin disconnect).

#### PATCH /api/nodes/{id}/bonds/{name}
Body:
```json
{
  "proto": "lacp",
  "hashPolicy": "l3+l4",
  "lacpRate": "fast",
  "primary": "igb0",
  "members": ["igb0", "igb1"],
  "mtu": 1500
}
```
Validation: members must exist + be available; at most one
primary; switch must support chosen protocol.

#### PATCH /api/nodes/{id}/addresses
Body: array of address patches (cidr, purpose, bonded-to, vlan, enabled).
Validation: cidr not already in use; CTDB pub change triggers 30-60 s cluster failover.
Side-effects: rebind via ifconfig reload; admin session drops if
admin IP changed.

### GET /api/nodes/{id}/bond — single bond (read)
Returns bond config + current hash / member state for live
preview. Used by 33-edit-lacp.svg right rail "Before" card.


### §2.29 — Stream transport (push messaging, added 2026-07-10)

User directive: "we should have messaging being pushed to each
user that will update the views and the data being displayed."

Canonical rule: every view is a passive receiver of pushed
events. NO Refresh / View JSON / "see X tab" affordances.

#### Transport

- **Endpoint**: `wss://<host>/api/stream`
- **Auth**: WebSocket upgrade requires valid session cookie +
  short-lived JWT signed by `/api/auth/stream-token` (60 s TTL).
- **Encoding**: JSON text frames (single message per frame).
- **Heartbeat**: server-sent every 30 s with `kind: 'heartbeat'`;
  client considers the connection dead if no frame in 90 s and
  reconnects with `resumeFrom` set to the last-seen event id.
- **Reconnect**: exponential backoff, max 30 s. After 5 fails
  in a row, show a top banner ("Reconnecting...") with manual
  reconnect button.
- **No SSE fallback in v1**: pure WebSocket. Per-page polling
  fallback is forbidden (the views look broken if the data
  stops updating).

#### Connection lifecycle

```
client → server:  WebSocket upgrade w/ session cookie + JWT
server → client:  HTTP 101 Switching Protocols
client → server:  { "type": "subscribe", "topics": [...], "resumeFrom": "..." }
server → client:  { "type": "ack", "topic": "...", "accepted": true }
server → client:  { "type": "event", "event": <StreamEvent> }
server → client:  { "type": "event", ... }  (steady-state)
                  // every 30 s:
server → client:  { "type": "heartbeat", "ts": 1752184712345 }
```

#### Subscribe shape (canonical)

```json
{
  "type": "subscribe",
  "topics": [
    "cluster.local.health",
    "node.cloudbsd-node-01.metrics.cpu",
    "node.cloudbsd-node-01.metrics.mem",
    "vm.web-server-01.state",
    "vm.web-server-01.metrics.cpu",
    "audit.event.live",
    "logs.cloudbsd-node-01.warn"
  ],
  "resumeFrom": "01HXYZ..."
}
```

#### Event shape (canonical, references data-structures §6)

```json
{
  "type": "event",
  "event": {
    "id": "01HYZABC...",
    "topic": "node.cloudbsd-node-01.metrics.cpu",
    "kind": "delta",
    "ts": 1752184712345,
    "payload": {
      "pctUser": 42.1,
      "pctSystem": 7.2,
      "pctIoWait": 1.4
    },
    "stateHash": "f3c8..."
  }
}
```

#### Topic hierarchy (canonical)

See `data-structures.md §6` for the full topic table. Topics are
hierarchical dot-separated; subscribe uses prefix match by
default. Wildcard subscriptions (`node.*`) require admin role.

#### Topic ACLs (canonical)

| Topic prefix | Required role |
|---|---|
| `cluster.*`, `audit.event.live` | admin (operator+ for audit) |
| `node.*`, `logs.*` | viewer+ (same role as current REST) |
| `vm.*`, `container.*`, `jail.*` | scoped to user (multi-tenant) |
| `plugin.*`, `network.*`, `alert.*` | viewer+ |
| `*.console` (VNC frames) | requires separate VNC JWT |

Wildcards require explicit `subscribe:wildcard` grant. Default
deny for cross-tenant prefixes.

#### Connection-level errors

Server emits `kind: 'error'` for:
- 'auth-failed' — close 4401
- 'quota-exceeded' — close 4429 (too many subscriptions)
- 'parse-error' — frame cannot be parsed as JSON
- 'topic-forbidden' — subscribe included privileged topic

Client logs + retries only auth failures (after re-login);
all others are fatal for that connection.

## §2.30 — PassKey / SSH-key authentication

User retro (2026-07-10): the terminal-paste-signature flow I
proposed earlier is "fucking stupid" because it forces every
admin through a developer-only UX. The right answer is browser
native.

### Corrected approach

The browser UI uses **WebAuthn / PassKeys** (browser-native,
single-click via Touch ID / Windows Hello / YubiKey /
1Password / iCloud Keychain). Server-side, the SSH-key wire
format is preserved for **headless / CLI use only** &mdash;
nothing in the browser makes the user paste a signature.

The cryptographer's view: a PassKey and an SSH key are
interchangeable asymmetric credentials. The browser hides the
challenge/response dance behind a native sheet. Cluster doesn't
care which one you enrolled &mdash; both produce the same kind of
session cookie on success.

### Browser UI flow (PassKey / security key) &mdash; the only path admin UI exposes

```
User lands on /login
         |
         v
Types username, clicks "Use Touch ID / security key"
         |
         v
Browser shows NATIVE sheet (Touch ID / Windows Hello / YubiKey)
         |
         v
Browser performs WebAuthn ceremony locally
  navigator.credentials.get({
    publicKey: {
      challenge: <server-issued random>,
      allowCredentials: <this user's passkeys>,
      userVerification: "required"
    }
  })
         |
         v
Browser POSTs the assertion to /api/auth/webauthn/verify
         |
         v
Server verifies signature with stored passkey public key
         |
         v
303 -> /dashboard + Set-Cookie cloudbsd_session
```

Single click. No terminal. No paste. No signature.

### Endpoints

#### `POST /api/auth/webauthn/init`
```jsonc
// request
{ "username": "mlapointe" }
// response
{
  "challenge": "<random 32B base64url>",
  "rpId":     "prod-cluster.cloudbsd.local",
  "allowCredentials": [
    { "id": "<base64url credential id>", "transports": ["internal","usb","nfc","ble"] }
  ],
  "userVerification": "required",
  "expires_in": 60
}
```

#### `POST /api/auth/webauthn/verify`
Standard WebAuthn `PublicKeyCredential` JSON &mdash; the full
`{id, rawId, type, response: {clientDataJSON, authenticatorData, signature, userHandle}, ...}`.
Server validates with the stored credential.

### Headless SSH-key login (CLI / automation) &mdash; not in the browser UI

Used by:
- CI runners
- Migration scripts
- Headless Ansible / Terraform providers
- Power users with a terminal

Endpoint:
```
POST /api/auth/ssh/verify    (unchanged from prior revision)
{ session_id, signature }
```

Where the user runs:
```
cloudbsd login --user mlapointe --nonce-file /tmp/n
```

The CLI tool handles the terminal mechanics FOR them, then prints a one-time SSO redirect URL or copies a token to clipboard. The CLI invokes `ssh-keygen -Y sign` internally and posts. Users never touch signature blocks or paste back.

This path is documented in `docs/cli/cloudbsd-login.md` and is NOT a screenshot in the Admin UI.

### Browser-side fallback: SSH key imported by the user

For kiosks or shared workstations where the user cannot bring
their own device:
- In Settings &rarr; My Account &rarr; SSH keys, the user may
  "Trust this browser" for an enrolled SSH public key.
- Browser imports the matching private key (PEM, age-encrypted
  with a passphrase) into IndexedDB.
- Login uses `crypto.subtle.sign('Ed25519', ...)` locally.
- Consent screen required at import time.
- Cleared when the user clicks "Forget this browser".

This path is opt-in only and shows a clear warning that the
key is leaving the user's own device.

### Why the UI does NOT show the terminal flow

- 90%+ of admins are not SSH power users.
- The browser already does it better (WebAuthn).
- Pasting signature blocks into textareas is hostile UX.
- WebAuthn is portable: works in every modern browser, every
  OS, every device category.
- The shape of the assertion (challenge + signature) is identical
  so server-side one endpoint covers both.

### Wave 12a plan

The CLI tool (`cloudbsd login`) is built **last** &mdash; it is
a convenience, not a critical path. Headless flows that need it
today can use the existing password + recovery-codes path
(which always works, even when the rest fails &mdash; see
`ui-index.md §26 capability cascade`).

---

## §2.33 — API key scopes & library base-jail repositories (2026-07-16)

> Canonical product rules: `angular-migration.md` **Rules #10–#12** and
> `docs/migration/product-ia-esxi-vsphere-2026-07-16.md` §3.2a / §6.4.

### API keys

- Every key carries a **scope document** (array of entries).
- Entry shape:

```json
{
  "resource": "vm",
  "actions": ["read", "snapshot.create", "snapshot.revert"],
  "domain": { "mode": "pattern", "value": "ci-*" }
}
```

- `domain.mode`: `all` | `list` | `tag` | `pattern`
  - `list`: `{ "mode": "list", "ids": ["…"] }` from inventory multi-select (never freeform paste-only).
  - `tag`: `{ "mode": "tag", "tags": ["ci=true"] }` from known tags.
  - `pattern`: `{ "mode": "pattern", "value": "ci-*" }` only after server returns non-empty preview matches.
- Authorization: deny by default; match resource type + action + domain; **intersect** with principal role.
- Snapshot verbs are **separate**: `snapshot.create`, `snapshot.delete`, `snapshot.revert`.
- Wire: send key as bearer/API header per existing auth; server attaches `X-CloudBSD-Who` = key principal.
- Suggested endpoints (implement with Access / Account surfaces):

| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/api/access/api-keys` | Service keys |
| GET/PATCH/DELETE | `/api/access/api-keys/{id}` | Incl. scope replace |
| POST | `/api/access/api-keys/{id}/rotate` | Rule #8 preflight |
| GET/POST | `/api/account/tokens` | Personal tokens |
| POST | `/api/access/api-keys/preview-domain` | Pattern/tag match preview for UI |

### Library repositories & base jails

| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/api/library/repos` | HTTPS repo config (auth secrets write-only) |
| POST | `/api/library/repos/{id}/probe` | Test connection (TLS + MANIFEST/HEAD) |
| GET | `/api/library/bases` | Cached bases |
| POST | `/api/library/bases/sync` | Body: repo, release, arch, components → **Task** |
| GET | `/api/library/bases/{id}` | Detail |

Auth methods on repo: `none` | `basic` | `bearer` | `header` | `mtls`.  
Path templates expand `${RELEASE}`, `${ARCH}`, `${ABI}`, `${COMPONENT}`.  
Jail create API accepts **base_id** (cached) only — not a raw URL.

### Stream topics (suggested)

- `library.repo.health`, `library.base.sync.progress`, `library.base.ready`
- `api-key.created`, `api-key.rotated`, `api-key.revoked` (in addition to existing `api-key.rotated`)


---

## §2.34 — Client trust boundary & OpenAPI (2026-07-16)

> Plan **Rule #13** (`docs/migration/rules.md`).

1. **Browser clients** (Angular Admin UI) may only call the **Admin backend**:
   - Same-origin HTTP under `/api/*` (and OpenAPI at `/api/openapi.json` when published)
   - Stream: `wss://<host>/api/stream` (or equivalent backend URL)
   - Static UI assets
2. **No** browser-originated connections to databases, host SSH, bhyve, ZFS CLIs, or package registries.
3. Resource operations are always **backend actions** (preflight + MIME + audit). The UI does not “drive” infrastructure APIs itself.
4. **OpenAPI 3.1** is the durable REST contract the backend must serve; until it exists, this WIRE_PROTOCOL document is the interim source of truth for envelopes/actions/stream. OpenAPI generation must not introduce non-backend client paths.

