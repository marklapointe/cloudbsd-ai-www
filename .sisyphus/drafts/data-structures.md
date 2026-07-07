# Data Structures - Patch 2026-07-07 (addresses all 17 review items)

> Direct user feedback applied. Major changes: timestamps as `number` (ms since epoch), all gaps filled, GPU model-specific units abstracted, no more hallucinated 11.

## Universal changes

### 1. Timestamps are `number` (ms since epoch), NOT strings

```ts
type EpochMs = number;  // milliseconds since Unix epoch (1970-01-01T00:00:00Z UTC)
// Never use strings for timestamps. Client renders with timezone:
//   formatTs(epochMs, tz) -> "2026-07-06 12:34:56 UTC" or "12:34:56 EDT"
// Validate at parse: epochMs in range [0, 4_102_444_800_000] (~2100)
function isValidEpochMs(n: number): boolean {
  return typeof n === 'number' && n >= 0 && n < 4_102_444_800_000 && Number.isFinite(n);
}
```

JSON serialization: `number` directly (no string conversion). Wire format unchanged.

### 2. Complete UnitKind enum (replaces earlier)

```ts
type UnitKind =
  | 'bytes'           // storage, memory, file size
  | 'bytes_per_sec'   // throughput
  | 'bits_per_sec'    // network rate (bits)
  | 'bits'            // raw bits
  | 'packets'         // network packets
  | 'packets_per_sec' // PPS
  | 'hz'              // frequency
  | 'seconds'         // duration
  | 'nanoseconds'     // precision timing
  | 'milliseconds'    // mid-precision (same as EpochMs)
  | 'microseconds'    // high-precision timing
  | 'percent'         // 0-100
  | 'percent_signed'  // -100 to +100 (delta, load average)
  | 'celsius'         // temperature
  | 'fahrenheit'      // temperature
  | 'watts'           // power
  | 'volts'           // voltage
  | 'amperes'         // current
  | 'rpm'             // rotational (disk spindles)
  | 'count'           // integers
  | 'fraction'        // 0-1
  | 'percentage_decimal' // 0-1
  | 'currency'        // amount (e.g. cloud billing)
  | 'currency_code'   // ISO 4217 (e.g. "USD")
  | 'ip'              // IPv4/v6 string
  | 'ip_port'         // IPv4:port
  | 'mac'             // MAC address string
  | 'uuid'            // UUID v4
  | 'ulid'            // ULID
  | 'semver'          // version string
  | 'enum'            // typed enum
  | 'boolean'         // true/false
  | 'string'          // opaque
  | 'bytes_size';     // size class (S/M/L/XL)
```

We DO have `currency` even though no payments yet - cloud billing / quota tracking will use it.

### 3. Generic Percentage Type

```ts
type Percentage = number;  // 0-100 always, displayed with % suffix
type Fraction = number;    // 0-1, displayed as % when needed

// GPU/CPU units are VENDOR-SPECIFIC but always presented as fractions
// for slot allocation.
interface ComputeSlice {
  vendor: 'nvidia' | 'amd' | 'intel' | 'mellanox';
  // For NVIDIA: SMs, CUDA cores, tensor cores
  // For AMD: CU (compute units), stream processors
  // For Intel: EUs (execution units)
  // Stored as a unitless fraction (0..1) of full chip; rendered with vendor name
  fraction: Fraction;
  // Optional: vendor-specific detailed breakdown
  detail?: {
    nvidia?: { sms: number; cudaCores: number; tensorCores: number; vramBytes: Quantity };
    amd?:    { computeUnits: number; streamProcessors: number; vramBytes: Quantity };
    intel?:  { executionUnits: number; vramBytes: Quantity };
  };
}
```

**Presentation rule**: convert fraction to "12%" of an "NVIDIA A100" or "4 CUs of an AMD Instinct MI250X" — the percentage is GENERIC across vendors because the user only cares about "% of chip allocated".

### 4. IPAddress fixed (#11 correction)

```ts
interface IPAddress {
  address: string;               // '10.0.10.21' or '2001:db8::1'
  prefix: Quantity;              // CIDR prefix length
  family: 'ipv4' | 'ipv6';
  scope: 'global' | 'link' | 'host' | 'site' | 'deprecated';
  permanent: boolean;
  // Lifetime fields (per RFC 4861/4862 for IPv6, DHCPv4 for IPv4)
  validLifetimeSec: Quantity;     // 0 = forever
  preferredLifetimeSec: Quantity;
  // Ephemeral state
  deprecated: boolean;            // prefer not to use (RFC 4862)
  tentative: boolean;            // duplicate address detection in progress
  // DHCP
  dhcp?: {
    serverId: string;            // DHCP server identifier
    leaseStartEpochMs: number;
    leaseEndEpochMs: number;
  };
}
```

## 5. Generic Task Schedule (replaces #12)

```ts
interface TaskSchedule {
  id: string;                    // ulid
  name: string;                  // 'nightly-tank-snapshot'
  description: string;
  enabled: boolean;
  owner: string;                 // user id
  // Schedule definition (one of)
  schedule:
    | { kind: 'cron'; expression: string; tz: string }                  // '0 2 * * *' UTC
    | { kind: 'interval'; everySec: Quantity; startAtEpochMs: number | null }
    | { kind: 'event'; topic: string; filter?: Record<string, string> } // trigger on event
    | { kind: 'on-demand' };                                           // run only when manually triggered
  // Task type
  task:
    | { kind: 'snapshot'; target: string }                              // VM/container/volume id
    | { kind: 'replicate'; source: string; destination: string }
    | { kind: 'scrub'; pool: string }
    | { kind: 'backup'; scheduleId: string }                              // delegates to backup subsystem
    | { kind: 'exec'; command: string[]; workingDir?: string; env?: Record<string,string> }
    | { kind: 'webhook'; url: string; method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; body?: string }
    | { kind: 'plugin'; pluginId: string; action: string; params?: Record<string, unknown> };
  // Execution
  enabled: boolean;
  timeoutSec: Quantity;            // max runtime
  retryPolicy: {
    maxAttempts: Quantity;        // count
    backoffSec: Quantity;          // initial backoff
    backoffMultiplier: Quantity;   // e.g. 2.0
    maxBackoffSec: Quantity;
  };
  // Concurrency
  mutexKey?: string;              // serialize on this key (e.g. 'pool-tank')
  skipIfRunning: boolean;         // don't run if previous still in flight
  // Status
  status: 'idle' | 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled';
  lastRun?: TaskRun;
  nextRunEpochMs: number;         // calculated
  // Notification
  notifyOn: ('success' | 'failure' | 'always')[];
  // History
  runs: TaskRun[];
  createdEpochMs: number;
  updatedEpochMs: number;
}

interface TaskRun {
  id: string;                    // ulid
  scheduleId: string;
  startedEpochMs: number;
  endedEpochMs?: number;
  status: 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled';
  exitCode?: Quantity;            // 0 = success
  output?: string;                // truncated stdout/stderr
  errorMessage?: string;
  attempt: Quantity;              // 1, 2, 3 ...
  triggeredBy: 'schedule' | 'manual' | 'event' | 'retry';
}
```

This is generic so plugin authors, alerts, and backups all use the same shape.

## 6. Alerts / Rules (backend, but defines the data the frontend shows)

```ts
interface AlertRule {
  id: string;                    // ulid
  name: string;
  description: string;
  enabled: boolean;
  // Trigger condition (predicate tree)
  condition:
    | { kind: 'threshold'; metric: string; op: '>' | '>=' | '<' | '<=' | '==' | '!='; value: Quantity }
    | { kind: 'change'; metric: string; windowSec: Quantity; delta: Quantity } // absolute
    | { kind: 'rate'; metric: string; windowSec: Quantity; rate: Quantity }        // per-second
    | { kind: 'event'; topic: string; filter?: Record<string, string> }
    | { kind: 'composite'; operator: 'AND' | 'OR' | 'NOT'; clauses: AlertRule['condition'][] };
  // Where it applies
  scope: 'global' | 'node' | 'pool' | 'cluster' | 'resource';
  scopeId?: string;               // for non-global
  // What to do when fired
  actions: AlertAction[];
  // Throttling
  cooldownSec: Quantity;          // don't re-fire within N seconds
  // Notification
  notify: ('bell' | 'email' | 'sms' | 'webhook')[];
  severity: 'info' | 'warning' | 'critical';
  // History
  fires: AlertFire[];
  createdEpochMs: number;
  updatedEpochMs: number;
}

interface AlertAction {
  kind: 'webhook' | 'script' | 'email' | 'snapshot' | 'reboot' | 'migrate';
  config: Record<string, unknown>;
}

interface AlertFire {
  id: string;
  ruleId: string;
  firedEpochMs: number;
  resolvedEpochMs?: number;
  metricValues: Record<string, Quantity>;
  triggeredActions: number;        // count of actions executed
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedEpochMs?: number;
}
```

## 7. Secret / Credential (generic, encrypted at rest)

```ts
interface Secret {
  id: string;                    // ulid
  name: string;                  // 'cloud-rsync-net-token'
  kind: 'ssh-key' | 'api-token' | 'password' | 'certificate' | 'oauth-credential' | 'webhook-secret';
  scope: 'global' | 'node' | 'service' | 'plugin';
  scopeId?: string;
  encryptedValue: string;        // KMS-encrypted ciphertext (base64)
  // Metadata (NEVER contains the secret)
  fingerprint?: string;            // SHA256 of plaintext (for dedup)
  lastUsedEpochMs?: number;
  expiresEpochMs?: number;
  rotationPolicy?: {
    everyDays: Quantity;
    notifyBeforeDays: Quantity;
  };
  // Audit
  createdEpochMs: number;
  createdBy: string;
  lastModifiedEpochMs: number;
  lastModifiedBy: string;
  // Display
  lastFour?: string;             // e.g. last 4 chars of API token for ID
}

interface SSHCredential extends Secret {
  kind: 'ssh-key';
  publicKey: string;              // safe to display
  privateKeyEncrypted: string;    // never sent to UI
  fingerprint: string;            // SHA256:abc...
  comment?: string;
}

interface APIToken extends Secret {
  kind: 'api-token';
  service: string;                // 'rsync.net', 'github', etc.
  scopes: string[];
  lastFour: string;               // for display
}
```

## 8. Tag / Label (first-class entity)

```ts
interface Tag {
  id: string;
  key: string;                    // 'env', 'team', 'cost-center'
  value: string;                 // 'prod', 'platform', '1234'
  description?: string;
  colorHex?: string;              // '#3b82f6'
  scope: 'resource' | 'user' | 'node' | 'plugin' | 'cluster';
  // Where applied
  appliedTo: TagApplication[];
  createdEpochMs: number;
  createdBy: string;
}

interface TagApplication {
  resourceId: string;
  resourceType: 'vm' | 'container' | 'jail' | 'volume' | 'node' | 'user';
  appliedEpochMs: number;
  appliedBy: string;
}
```

## 9. Audit Log Entry (immutable, signed, separate from general log)

```ts
interface AuditLogEntry {
  id: string;                    // ulid
  tsEpochMs: number;             // event time
  recordedEpochMs: number;        // when written to log
  // Actor
  actor: {
    userId?: string;
    apiKeyId?: string;
    serviceName?: string;         // 'bhyve-agent', 'cloudbsd-node'
    sourceIp?: string;
    userAgent?: string;
  };
  // Event
  action: string;                // 'vms.create', 'auth.login', etc.
  resourceType: string;           // 'vm', 'user', etc.
  resourceId: string;
  result: 'success' | 'failure' | 'denied';
  // Change tracking
  before?: Record<string, unknown>;  // sanitized snapshot
  after?: Record<string, unknown>;   // sanitized snapshot
  // Integrity
  prevEntryHash?: string;         // hash of previous entry (blockchain-style chain)
  entryHash: string;              // SHA256(prevEntryHash + canonical(this))
  signatureKey: string;          // KMS key id
  // Compliance
  retentionUntil: number;          // epoch ms - when entry can be deleted
  legalHold: boolean;             // if true, never delete (litigation hold)
}
```

UI shows this in a "Compliance" / "Audit Log" tab. Tamper-evident via hash chain.

## 10. Additional Unit fixes (per user)

- **Negative percentages** (delta, load avg): `percent_signed` (-100 to +100)
- **Fraction** (0 to 1) for sparse metrics: uptime ratio, utilization ratio
- **Bytes per second vs bits per second**: separate units, UI labels "MB/s" vs "Mb/s"
- **nanoseconds / microseconds** for high-precision timing (DB query latencies)
- **`ip` and `ip_port`** as string units (not numeric) - addresses are strings
- **`bytes_size`**: 'S' | 'M' | 'L' | 'XL' enum for size classifications
- **`semver`**: '1.0.0' string unit
- **`boolean`**: explicit type
- **`enum`**: typed enum, with `values: string[]` somewhere

## 11. Bandwidth / Throughput types (NetworkInterface)

```ts
interface NetworkInterface {
  // ... existing fields ...
  // Traffic (cumulative)
  rxBytes: Quantity;             // bytes
  txBytes: Quantity;             // bytes
  rxPackets: Quantity;
  txPackets: Quantity;
  rxErrors: Quantity;
  txErrors: Quantity;
  rxDrops: Quantity;
  txDrops: Quantity;
  // Live throughput (last 5 minutes)
  rxBps: Quantity;               // bits per second
  txBps: Quantity;               // bits per second
  // Quotas / SLA
  quotaBps?: Quantity;            // bandwidth cap
  slaBps?: Quantity;             // committed
  // Stats over time windows
  stats: {
    last5min:  { rxBps: Quantity; txBps: Quantity; rxPacketsPerSec: Quantity; txPacketsPerSec: Quantity };
    lastHour:  { rxBytes: Quantity; txBytes: Quantity };
    lastDay:   { rxBytes: Quantity; txBytes: Quantity };
    lastMonth: { rxBytes: Quantity; txBytes: Quantity };
  };
  // Real-time peak
  peakBps: { rx: Quantity; tx: Quantity; sinceEpochMs: number };
}
```

Display:
- Bps: auto-scale to `Gbps` / `Mbps` / `kbps` (note: bits not bytes)
- Bytes: auto-scale to `GB` / `MB` / `KB`
- Packets: whole numbers
- Errors/drops: whole numbers

## 12. GPU fields updated

```ts
interface GPU {
  id: string;
  model: string;                 // 'NVIDIA A100 80GB' or 'AMD Instinct MI250X'
  vendor: 'nvidia' | 'amd' | 'intel' | 'mellanox';
  vendorSubId: string;           // 'a100-80gb' | 'mi250x' | 'flex-170' (for specific SKU)
  driver: 'nvidia' | 'amdgpu' | 'i915' | 'vfio-pci' | 'none';
  driverVersion: string;         // '550.54.15' or '6.7.4'
  pcie: { gen: Quantity; lanes: Quantity; slot: string };
  // VRAM and power
  vramBytes: Quantity;
  usedBytes: Quantity;
  vramBandwidthGBs: Quantity;     // memory bandwidth
  powerDrawW: Quantity;
  powerCapW: Quantity;
  temperatureC: Quantity;
  utilizationPercent: Quantity;   // 0-100 (GPU SM/CU utilization)
  memoryUtilizationPercent: Quantity;
  // Capabilities
  features: {
    mig: boolean;                // Multi-Instance GPU
    nvlink: boolean;
    sriov: boolean;
    virtualization: boolean;       // SR-IOV capable for full GPU
  };
  // Compute slice inventory
  computeSlices: ComputeSlice[]; // see above (vendor-specific units)
  vgpuAllocations: VGPUAllocation[];
  // Health
  ecc: {
    enabled: boolean;
    errorsCorrected: Quantity;
    errorsUncorrected: Quantity;
  };
}
```

**Display rule**: vendor + model + utilization shown compact. CUDA cores / SMs / CUs / EUs are vendor-specific details shown in 'More info' modal only.

## 13. VM `console` field fixed

```ts
interface VM {
  // ... existing fields ...
  console: {
    enabled: boolean;
    device: string | null;         // '/dev/nmdm0A' or null if disabled
    type: 'nmdm' | 'null' | 'tmux';
  };
}
```

`enabled: false` means no console. `enabled: true, type: 'nmdm', device: '/dev/nmdm0A'` means a serial console via nmdm.

## 14. BackupSchedule gets `runs` array

```ts
interface BackupSchedule {
  // ... existing fields ...
  runs: BackupRun[];              // last 50 runs
  totalRuns: Quantity;            // lifetime
  totalBytesTransferred: Quantity;
  totalDuration: Quantity;        // cumulative seconds
  successRate: Quantity;          // 0-100 percent
}
```

## 15. Container/Jail missing fields

```ts
interface Container {
  // ... existing fields ...
  // Real-time metrics (last 60s)
  metrics: {
    cpuPercent: Quantity;          // 0-100
    memoryUsedBytes: Quantity;     // current RSS
    memoryLimitBytes: Quantity;    // cgroup limit
    networkRxBytesPerSec: Quantity;
    networkTxBytesPerSec: Quantity;
    blockReadBytesPerSec: Quantity;
    blockWriteBytesPerSec: Quantity;
    pids: Quantity;                // process count
  };
  // Health
  healthcheck?: {
    enabled: boolean;
    test: string;                 // e.g. 'curl -f http://localhost/'
    intervalSec: Quantity;
    timeoutSec: Quantity;
    retries: Quantity;
    lastCheckEpochMs?: number;
    lastResult?: 'healthy' | 'unhealthy' | 'starting';
  };
  // Restart
  restartCount: Quantity;        // lifetime
  lastRestartEpochMs?: number;
  lastRestartReason?: string;
}

interface Jail {
  // ... existing fields ...
  metrics: {
    cpuPercent: Quantity;          // 0-100
    memoryUsedBytes: Quantity;
    memoryLimitBytes: Quantity;
    networkRxBytesPerSec: Quantity;
    networkTxBytesPerSec: Quantity;
    pids: Quantity;
  };
  // Same healthcheck pattern as container
  healthcheck?: Container['healthcheck'];
  // Jails-specific
  allowRawSockets: boolean;
  allowMount: boolean;
  allowChflags: boolean;
  allowSysvipc: boolean;
}
```

## 16. StoragePool + Dataset enhancements

```ts
interface StoragePool {
  // ... existing fields ...
  // Health and warnings
  healthDetail: {
    state: 'online' | 'degraded' | 'faulted' | 'unavailable';
    errors: string[];             // ['device /dev/da1 slow I/O']
    recommendations: string[];      // ['replace drive /dev/da1', 'run scrub']
    lastScrubErrors: Quantity;
  };
  // Compression stats
  compression: {
    ratio: Quantity;              // 1.45x
    ratioPercent: Quantity;        // 31% saved
    algorithm: string;
  };
  // Performance (last 60s)
  performance: {
    readBytesPerSec: Quantity;
    writeBytesPerSec: Quantity;
    readIops: Quantity;
    writeIops: Quantity;
  };
  // Tiered storage hints
  layout: 'stripe' | 'mirror' | 'raidz1' | 'raidz2' | 'raidz3' | 'dedup' | 'special';
  // Storage tiers
  tiers: StorageTier[];          // hot/warm/cold classification
}

interface StorageTier {
  name: string;                  // 'fast', 'capacity', 'archive'
  devices: string[];              // device names
  totalBytes: Quantity;
  usedBytes: Quantity;
  policy: 'auto' | 'manual';
}

interface Dataset {
  // ... existing fields ...
  // Quota / reservation
  quotaBytes?: Quantity;          // hard limit (null = unlimited)
  reservationBytes?: Quantity;    // reserved
  usedBySnapshotsBytes: Quantity; // space used by snapshots of this DS
  usedByChildrenBytes: Quantity;   // space used by child datasets
  // Properties
  compressionStreams: Quantity;   // zstd stream count (affects perf)
  recordsizeBytes: Quantity;
  atime: 'on' | 'off';
  xattr: 'on' | 'off' | 'sa' | 'dirsa';
  acl: 'on' | 'off' | 'restricted' | 'passthrough';
  readonly: boolean;
  sync: 'standard' | 'always' | 'disabled';
  recordsizeSkewPercent: Quantity; // current avg / target
  fragmentationPercent: Quantity;
  referencedRatioPercent: Quantity;
  // Snapshots
  snapshots: Snapshot[];          // recent first
  holds: Quantity;                // clones/bookmarks
  // Inherited encryption
  inheritedEncryption: boolean;
  // Mount
  mountpoint: string;             // '/', '/boot/efi', 'hidden' (off)
  mountOptions: string[];         // ['noexec', 'nosuid', 'nodev']
  // Children (recursive)
  children: Dataset[];
}
```

## 17. Missing transport encryption + chip-level fields

```ts
interface NetworkInterface {
  // ... existing fields ...
  // Physical layer
  linkSpeedMbps: Quantity;         // negotiated speed (auto-negotiated)
  linkDuplex: 'full' | 'half' | 'unknown';
  // Offload features (negotiated)
  offloads: {
    tso: boolean;                // TCP segmentation offload
    lro: boolean;                // large receive offload
    gro: boolean;                // generic receive offload
    checksum: boolean;            // rx/tx checksum offload
    scatterGather: boolean;      // SG
  };
  // Driver + firmware versions
  driverName: string;            // 'igc'
  driverVersion: string;         // '1.5.3'
  firmwareVersion?: string;       // '1.50'
  // Link state history
  lastLinkDownEpochMs?: number;
  lastLinkUpEpochMs?: number;
  flapCount: Quantity;            // total
}

interface IPAddress {
  // ... existing fields ...
  flags: {
    deprecated: boolean;
    tentative: boolean;
    optimistic: boolean;
    permanent: boolean;
    autoConfigured: boolean;      // SLAAC or DHCP
  };
  // Source
  source: 'static' | 'dhcp' | 'slaac' | 'link-local' | 'manual' | 'iaid';
  // Lifetime
  preferredLifetimeSec: Quantity;
  validLifetimeSec: Quantity;
  // DNS
  reverseDns?: string;           // FQDN from reverse lookup
}
```

## 18. Alert/Rules integration with the Schedule (#5) and Tasks (#12)

```ts
// AlertRules can be the trigger for TaskSchedules
// The frontend shows alerts in a "Rules" tab under System Management
// User can: enable/disable rule, see fire history, mute for N hours
// Each AlertFire is a notification + audit entry
```

## 19. TLS certificate + audit integration

```ts
interface TLSCert {
  id: string;
  cn: string;                    // common name
  san: string[];                 // subject alt names
  issuer: string;
  serial: string;
  notBeforeEpochMs: number;
  notAfterEpochMs: number;
  keyType: 'rsa-2048' | 'rsa-4096' | 'ecdsa-p256' | 'ecdsa-p384' | 'ed25519';
  keyBits: Quantity;
  fingerprintSha256: string;
  chainDepth: Quantity;           // intermediate count
  // Usage
  services: string[];            // ['api.cloudbsd.org', 'web.cloudbsd.org']
  status: 'active' | 'expiring-soon' | 'expired' | 'revoked';
  daysUntilExpiry: Quantity;      // computed
  autoRenew: boolean;
  // Audit
  createdEpochMs: number;
  createdBy: string;
  lastRenewedEpochMs?: number;
  nextRenewalEpochMs?: number;
}
```

## Summary of all changes

1. **Timestamps = `number` (ms since epoch)** everywhere. No strings.
2. **UnitKind** now has 30+ types, all used somewhere
3. **Generic `Percentage` and `Fraction`** with vendor-specific GPU/CPU behind vendor detail object
4. **IPAddress** fully fixed with flags, lifetime, DHCP fields
5. **TaskSchedule** generic - covers cron/interval/event/on-demand/exec/webhook/plugin
6. **AlertRule** with predicate tree
7. **Secret** encrypted at rest with KMS, never sent to UI plaintext
8. **Tag** as first-class entity with applications
9. **AuditLogEntry** separate from LogEntry, hash-chained
10. **StoragePool + Dataset** enhanced with health, performance, compression
11. **NetworkInterface** has full link state, offloads, driver versions
12. **GPU** has vendor-specific compute slice inventory
13. **VM.console** properly typed
14. **BackupSchedule** has runs array, success rate
15. **Container/Jail** have metrics + healthcheck
16. **TLSCert** in the model
17. **ALERTS** defined as first-class with fire history

Implementation tasks (new):
- T256-T280 covering the additions above

Total: 19 data structures, 25+ implementation tasks.
