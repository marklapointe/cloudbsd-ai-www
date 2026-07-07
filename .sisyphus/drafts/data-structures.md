# CloudBSD Admin — Data Structures (Units & Types)

> Reference for all backend data models and UI presentation. Every numerical field with units must be stored with the unit type and presented in human-readable form. SVGs use uniform column order (Status, Name, OS/Type, Host, Resources, Network, Uptime).

## Unit System (universal)

```ts
type UnitKind = 'bytes' | 'hz' | 'percent' | 'seconds' | 'operations' | 'bytes_per_sec' | 'celsius' | 'watts' | 'volts' | 'rpm' | 'ip' | 'version' | 'count' | 'packets' | 'boolean' | 'enum' | 'string' | 'timestamp' | 'ip_port' | 'uuid';

interface Unit {
  kind: UnitKind;
  // For display: standard base (bytes -> B, KB, MB, GB, TB, PB)
  baseScale: 1 | 1024; // 1024 for bytes, 1 for ratios/Hz/temps
  preferredUnit?: string; // hint: "MB" vs "MiB"
}
```

Display rules:
- All `bytes` values: auto-scale to TB/GB/MB/KB based on magnitude
- Always present as integer where possible, max 1 decimal for very large values
- Show full value on hover (title attribute), e.g. `title="2,198,934,032 bytes"`
- Never show "1.7 GB" for memory - show "1.7 GB" (1 decimal max) or "2 GB" rounded

## 1. Node (physical or virtual host)

```ts
interface Node {
  id: string;                    // 'node-abc123' (uuid v4)
  hostname: string;               // 'cloudbsd-node-01.cloudbsd.org'
  displayLabel: string;           // user-editable, default = hostname
  role: 'master' | 'worker' | 'observer';
  status: 'joining' | 'syncing' | 'online' | 'draining' | 'offline' | 'removed';
  
  // === CPU (physical + per-CPU details) ===
  cpu: {
    count: Quantity;              // socket count
    cores: Quantity;              // physical cores total (count)
    threads: Quantity;            // logical threads (count)
    model: string;                 // 'Intel Xeon Gold 6248R'
    vendor: 'intel' | 'amd' | 'arm' | 'risc-v' | 'unknown';
    baseClockHz: Quantity;         // base frequency (hz)
    boostClockHz: Quantity;         // max turbo (hz)
    features: string[];            // CPU flags: 'AES-NI', 'AVX2', 'SSE4.2', 'VT-x', 'AMD-V'
    cache: {
      l1dBytes: Quantity;          // L1 data cache (bytes)
      l1iBytes: Quantity;          // L1 instruction cache (bytes)
      l2Bytes: Quantity;            // L2 cache (bytes, per core)
      l3Bytes: Quantity;            // L3 cache (bytes, shared)
    };
    microcode: string;             // CPU microcode version
  };

  // === RAM (slots + installed) ===
  memory: {
    totalBytes: Quantity;          // total installed (bytes)
    usableBytes: Quantity;         // available to OS (bytes)
    type: 'ddr4' | 'ddr5' | 'ddr3' | 'ecc-ddr4' | 'ecc-ddr5' | 'lpddr4' | 'lpddr5' | 'unknown';
    speedMTs: Quantity;            // memory bus speed (mega-transfers/sec, count)
    slots: {
      total: Quantity;             // physical DIMM slots (count)
      populated: Quantity;          // populated slots (count)
      eachBytes: Quantity;          // per-slot capacity (bytes)
    };
    ecc: boolean;                  // ECC enabled
  };

  // === Storage (physical disks + pools) ===
  storage: {
    disks: Disk[];                  // physical block devices
    pools: StoragePool[];          // ZFS pools
  };

  // === Network interfaces ===
  interfaces: NetworkInterface[];

  // === GPU (when showVgpuResources flag is on) ===
  gpus: GPU[];

  // === System info ===
  baseSystem: 'FreeBSD 14.2-RELEASE-p1';
  kernel: string;                 // '14.2-RELEASE-p1'
  arch: 'amd64' | 'arm64' | 'riscv64';
  uptimeSec: Quantity;
  rack: string;                   // 'A1'
  zone: string;                   // 'us-east-1a'
  labels: Record<string, string>;  // {zone: 'us-east-1a', rack: 'r3'}
  
  // === Health ===
  health: 'healthy' | 'watch' | 'error';
  lastHeartbeat: string;          // ISO timestamp
}

interface Quantity {
  value: number;                  // raw number (always in SI base unit for the kind)
  unit: UnitKind;                  // what the value represents
  // Optional: preferred display unit hint (server tells client "I want TB")
  displayUnit?: string;
}
```

### Display rules
- `node.cpu.count` -> show as "2 sockets" (count, no decimal)
- `node.cpu.cores` -> "40 cores" (no decimal)
- `node.cpu.threads` -> "80 threads" (no decimal)
- `node.cpu.model` -> "Intel Xeon Gold 6248R" (string, no transform)
- `node.cpu.baseClockHz` -> auto-scale: 2.4 GHz / 2400 MHz / 2,400,000,000 Hz
- `node.cpu.features` -> "AES-NI, AVX2, SSE4.2, VT-x" (comma-separated, 3-5 visible, rest in 'More info' modal)
- `node.cpu.cache.l3Bytes` -> "35 MB" or "35.7 MB" (1 decimal if not whole)
- `node.memory.totalBytes` -> auto-scale: 128 GB (whole) / 127.5 GB (decimal)
- `node.memory.slots.total/populated` -> "8 / 8 slots" (count)
- `node.memory.slots.eachBytes` -> "16 GB per slot"
- `node.uptimeSec` -> "14d 02:11" (days+hours+minutes, no seconds)

## 2. Disk (physical block device)

```ts
interface Disk {
  id: string;                    // 'disk-0' (per-node index)
  model: string;                 // 'Samsung SSD 980 PRO 2TB'
  vendor: string;
  serial: string;                // 'S6XXNX0T123456'
  type: 'ssd' | 'nvme' | 'hdd' | 'hybrid' | 'raid-vd' | 'usb' | 'sd-card' | 'mmc' | 'unknown';
  bus: 'sata' | 'nvme' | 'sas' | 'usb' | 'mmc' | 'pcie' | 'virtual';
  sizeBytes: Quantity;             // advertised capacity
  sectorSizeBytes: Quantity;       // 512 or 4096
  rpm: Quantity;                   // 0 for SSD, 5400/7200/10000/15000 for HDD
  smart: {
    health: 'ok' | 'warn' | 'fail';
    temperatureC: Quantity;        // celsius
    powerOnHours: Quantity;        // count
    reallocatedSectors: Quantity;  // count
  };
  // For NVMe: PCIe gen + lanes
  pcie?: { gen: Quantity; lanes: Quantity; };
  // For RAID: virtual disk info
  parentRaid?: string;            // 'raidz1-tank'
}
```

## 3. Storage Pool (ZFS / btrfs / etc.)

```ts
interface StoragePool {
  id: string;                    // 'tank'
  name: string;                  // 'tank'
  type: 'zfs-raidz1' | 'zfs-raidz2' | 'zfs-raidz3' | 'zfs-mirror' | 'zfs-stripe' | 'zfs-raid10' | 'btrfs-raid0' | 'btrfs-raid1' | 'btrfs-raid10' | 'mdadm-raid0' | 'mdadm-raid1' | 'mdadm-raid5' | 'mdadm-raid6' | 'mdadm-raid10' | 'lvm-thin' | 'lvm-linear' | 'zvol' | 'raw';
  totalBytes: Quantity;           // raw capacity
  allocatedBytes: Quantity;       // used by datasets
  freeBytes: Quantity;            // available
  fragmentation: Quantity;        // 0-100 percent
  health: 'healthy' | 'degraded' | 'faulted';
  lastScrub: string;             // ISO timestamp
  nextScrub: string;             // ISO timestamp
  devices: PoolDevice[];          // physical/logical devices
  datasets: Dataset[];           // child datasets
}

interface PoolDevice {
  name: string;                  // 'da0p2'
  type: 'disk' | 'partition' | 'log' | 'cache' | 'spare' | 'log-mirror';
  state: 'online' | 'degraded' | 'faulted' | 'offline' | 'removed';
  readBytes: Quantity;            // lifetime
  writeBytes: Quantity;           // lifetime
  readErrors: Quantity;           // count
  writeErrors: Quantity;          // count
  checksumErrors: Quantity;       // count
}

interface Dataset {
  id: string;                    // 'tank/data'
  name: string;                  // 'tank/data'
  mountpoint: string;            // '/mnt/tank/data' or 'hidden'
  type: 'filesystem' | 'volume' | 'snapshot' | 'bookmark';
  usedBytes: Quantity;
  referencedBytes: Quantity;     // space dataset + descendants use
  compression: 'off' | 'lz4' | 'lzjb' | 'zle' | 'gzip' | 'gzip-fast' | 'gzip-best' | 'zstd' | 'zstd-fast' | 'zstd-best';
  compressionRatio: Quantity;    // achieved compression ratio
  encryption: 'off' | 'aes-128-gcm' | 'aes-192-gcm' | 'aes-256-gcm' | 'chacha20-poly1305';
  encryptionKeyLoaded: boolean;  // key loaded in memory?
  quotaBytes?: Quantity;          // enforced max
  reservationBytes?: Quantity;    // reserved min
  recordsize: Quantity;           // default record size (bytes)
  compressionStreams: Quantity;   // count of zstd streams
  atime: 'on' | 'off';
  xattr: 'on' | 'off' | 'sa' | 'dirsa';
  acl: 'on' | 'off' | 'restricted' | 'passthrough';
  readonly: boolean;
  sync: 'standard' | 'always' | 'disabled';
  recordsizeSkew: Quantity;       // current average record / target ratio
  fragmentation: Quantity;        // 0-100 percent
  referencedRatio: Quantity;      // 0-100 percent
  children: Dataset[];            // nested
  snapshots: Snapshot[];          // recent
  inheritedEncryption: boolean;
  mountOptions: string[];         // ['noexec', 'nosuid', 'nodev']
}

interface Snapshot {
  id: string;                    // '@auto-2026-07-06-03-00'
  name: string;
  creation: string;              // ISO timestamp
  usedBytes: Quantity;            // space referenced by snapshot
  creationSizeBytes: Quantity;    // space snapshot itself occupies
  user: 'system' | 'user' | 'cron' | string;
  holds: Quantity;               // count of clones/bookmarks
  isAuto: boolean;
}
```

## 4. CPU (Physical processor — separate from node.cpu which is aggregate)

```ts
interface PhysicalCPU {
  socket: Quantity;              // socket number
  model: string;                 // 'AMD EPYC 7763 64-Core'
  vendor: 'intel' | 'amd' | 'arm' | 'risc-v' | 'unknown';
  microcode: string;             // '0x0a0011d'
  cores: Quantity;              // physical cores (count)
  threads: Quantity;            // logical threads (count)
  baseClockHz: Quantity;         // base frequency
  boostClockHz?: Quantity;        // max turbo
  l1dBytes: Quantity;
  l1iBytes: Quantity;
  l2Bytes: Quantity;             // per core
  l3Bytes: Quantity;             // shared
  features: string[];            // CPU flags
  // Per-CPU usage
  usage: {
    userPercent: Quantity;       // user-space
    systemPercent: Quantity;     // kernel-space
    idlePercent: Quantity;       // idle
    iowaitPercent: Quantity;     // I/O wait (Linux semantics, often 0 on FreeBSD)
    irqPercent: Quantity;        // interrupt
    stealPercent: Quantity;      // stolen (VM hypervisor)
    nicePercent: Quantity;       // nice
    temperatureC: Quantity;      // if sensor available
    frequencyHz: Quantity;       // current actual frequency
  };
}
```

## 5. Memory Slot (Physical DIMM)

```ts
interface MemorySlot {
  slot: Quantity;                // slot number (1-based)
  sizeBytes: Quantity;           // 0 if empty
  speedMTs: Quantity;            // MT/s
  type: 'ddr4' | 'ddr5' | 'ddr3' | 'ecc-ddr4' | 'ecc-ddr5' | 'lpddr4' | 'lpddr5' | 'unknown';
  manufacturer: string;          // 'Samsung'
  partNumber: string;            // 'M393A4K40CB1-CRC'
  serialNumber: string;
  speedNs: Quantity;             // nanoseconds (latency, count)
  voltageVolt: Quantity;         // operating voltage
  rank: Quantity;                // 1, 2, 4
  channel: Quantity;             // memory channel
  empty: boolean;                // slot is unpopulated
  speedReduced: boolean;         // running slower than rated
}
```

## 6. GPU (Physical or vGPU)

```ts
interface GPU {
  id: string;                    // 'gpu-0' (per-node)
  model: string;                 // 'NVIDIA RTX A5000'
  vendor: 'nvidia' | 'amd' | 'intel' | 'mellanox';
  driver: 'nvidia' | 'amdgpu' | 'i915' | 'vfio-pci' | 'none';
  vramBytes: Quantity;           // total VRAM
  usedBytes: Quantity;            // allocated
  temperatureC: Quantity;        // GPU temperature
  powerDrawW: Quantity;          // current watts
  powerCapW: Quantity;           // TDP
  utilizationPercent: Quantity;   // 0-100
  memoryUtilizationPercent: Quantity;
  // Physical: list of slots, each can be sliced into multiple vGPUs
  // vGPU: just shows the vGPU info directly
  pcie: { gen: Quantity; lanes: Quantity; slot: string };
  allocations: VGPUAllocation[];
  features: {
    mig: boolean;                // Multi-Instance GPU (Hopper/Blackwell)
    nvlink: boolean;
    sriov: boolean;               // SR-IOV capable
  };
}

interface VGPUAllocation {
  vm: string;                    // VM name
  vramBytes: Quantity;           // allocated
  type: 'whole' | 'slice-1-2' | 'slice-1-3' | 'slice-1-4' | 'slice-1-6' | 'slice-1-8';
  pdevice: string;               // physical GPU
  mdevType: string;              // 'nvidia-256' (MIG), 'vgpu-8q' etc.
}
```

## 7. Network Interface

```ts
interface NetworkInterface {
  name: string;                  // 'igc0'
  type: 'ethernet' | 'wifi' | 'loopback' | 'bridge' | 'vlan' | 'lagg' | 'tunnel' | 'epair' | 'tun' | 'tap' | 'vxlan' | 'gre';
  state: 'up' | 'down' | 'unknown';
  macAddress: string;            // 'aa:bb:cc:dd:ee:ff'
  mtu: Quantity;                 // 1500 default
  speedMbps: Quantity;           // 0 if not applicable
  duplex: 'full' | 'half' | 'unknown';
  driver: string;                // 'igc0', 'bge0', etc
  // IPv4 + IPv6 addresses
  addresses: IPAddress[];
  // Traffic counters
  rxBytes: Quantity;             // total
  txBytes: Quantity;             // total
  rxPackets: Quantity;
  txPackets: Quantity;
  rxErrors: Quantity;            // CRC, framing, etc
  txErrors: Quantity;
  rxDrops: Quantity;
  txDrops: Quantity;
  // For bridges/vlans
  members: string[];             // interface names in bridge/vlan
  vlanId?: Quantity;             // for vlan type
  parent?: string;               // for vlan: parent interface
  bridge?: string;               // for bridge members
  // Live throughput (last 5 minutes)
  rxBps: Quantity;
  txBps: Quantity;
}

interface IPAddress {
  address: string;               // '10.0.10.21' or '2001:db8::1'
  prefix: Quantity;              // CIDR prefix length
  family: 'ipv4' | 'ipv6';
  scope: 'global' | 'link' | 'host' | 'site' | 'deprecated';
  permanent: boolean;
  validLifetimeSec: Quantity;    // 0 = forever
  preferredLifetimeSec: Quantity;
}
```

## 8. VM (Virtual Machine - bhyve)

```ts
interface VM {
  id: string;                    // 'vm-nextcloud'
  name: string;                  // 'nextcloud'
  status: 'running' | 'stopped' | 'paused' | 'errored' | 'starting' | 'stopping';
  os: string;                    // 'Debian 12'
  vcpu: Quantity;                // virtual CPUs
  memoryBytes: Quantity;         // RAM
  diskBytes: Quantity;           // provisioned disk
  uptimeSec: Quantity;           // current uptime (0 if stopped)
  host: string;                  // node hostname
  ips: IPAddress[];              // sorted alphabetically
  tags: string[];                // ['prod', 'files']
  vgpu: VGPUAllocation | null;   // null if no vGPU
  // Configuration
  bhyve: {
    grub: boolean;               // grub-bhyve
    acpi: boolean;               // ACPI enabled
    console: 'none' | 'com1' | 'com2' | 'auto';
    wire: 'vmxnet3' | 'e1000' | 'virtio-net';
    destroyOnPoweroff: boolean;
    restartOnReboot: boolean;
    priority: Quantity;           // -20 to 20
    cpus: Quantity;              // vCPU count
    memoryBytes: Quantity;       // RAM
    cputype: 'host' | 'qemu64' | 'qemu32' | 'custom';
  };
  // State
  pid: Quantity;                 // bhyve PID (0 if not running)
  // Snapshots
  snapshots: VMSnapshot[];
  created: string;               // ISO timestamp
  updated: string;               // ISO timestamp
  startCount: Quantity;          // boot count for lifetime
  totalUptimeSec: Quantity;      // cumulative uptime
}

interface VMSnapshot {
  id: string;
  name: string;
  created: string;
  createdBy: string;            // user who took it
  description: string;
  sizeBytes: Quantity;           // snapshot size
  // VM must be stopped to restore (unless live snapshot)
  liveSnapshot: boolean;
}
```

## 9. Container (Podman/Docker)

```ts
interface Container {
  id: string;                    // 'ct-abc123'
  name: string;                  // 'nginx-proxy'
  status: 'running' | 'exited' | 'paused' | 'restarting' | 'dead' | 'created' | 'removing';
  image: string;                 // 'nginx:1.27-alpine'
  imageDigest: string;           // 'sha256:abc...'
  imageRegistry: string;         // 'docker.io'
  ports: ContainerPort[];
  networkMode: 'bridge' | 'host' | 'none' | 'overlay' | 'macvlan' | 'ipvlan';
  hostname: string;
  domainname: string;
  user: string;                  // 'nginx'
  env: Record<string, string>;
  command: string[];
  args: string[];
  workingDir: string;
  mounts: Mount[];
  network: string;               // bridge name
  ipAddress: string;
  macAddress: string;
  restartPolicy: 'no' | 'always' | 'unless-stopped' | 'on-failure';
  resources: {
    cpuLimit: Quantity;          // CPU shares
    memLimitBytes: Quantity;     // memory limit
    cpuUsedPercent: Quantity;    // current
    memUsedBytes: Quantity;      // current
  };
  created: string;               // ISO timestamp
  started: string;               // ISO timestamp
  uptimeSec: Quantity;
  node: string;                  // 'cloudbsd-node-01'
}

interface ContainerPort {
  containerPort: Quantity;
  hostPort: Quantity;
  protocol: 'tcp' | 'udp' | 'sctp';
  hostIp: string;                // '0.0.0.0' or specific
}

interface Mount {
  type: 'bind' | 'volume' | 'tmpfs' | 'npipe';
  source: string;
  destination: string;
  mode: 'ro' | 'rw' | 'z' | 'Z';
}
```

## 10. Jail (FreeBSD)

```ts
interface Jail {
  id: string;                    // 'jail-0'
  name: string;                  // 'transmission'
  status: 'running' | 'stopped' | 'frozen' | 'starting' | 'stopping';
  hostname: string;              // 'transmission.lan'
  os: string;                    // 'FreeBSD 14.2'
  ip: IPAddress;                 // primary IP
  ips: IPAddress[];              // all IPs
  vcpus: Quantity;               // CPU shares (Fair Share Scheduler)
  memoryBytes: Quantity;         // memory limit
  diskBytes: Quantity;           // quota
  usagePercent: Quantity;        // 0-100, shown as bar
  network: string;               // bridge/interface name
  flags: string[];               // allow.chflags, allow.sysvipc, etc
  vnet: boolean;                  // virtual network
  linuxCompat: boolean;          // linuxulator enabled
  jailId: Quantity;              // FreeBSD jail ID
  host: string;                  // node hostname
  created: string;
  uptimeSec: Quantity;
  // ZFS dataset
  dataset: string;               // 'zroot/jails/transmission'
  // User
  user: { username: string; uid: Quantity; gid: Quantity };
  // Services running inside (discovered via ps)
  services: { name: string; pid: Quantity }[];
}
```

## 11. Volume (ZFS dataset / NFS / iSCSI / etc.)

```ts
interface Volume {
  id: string;                    // 'tank-data' or 'iscsi-lun0'
  name: string;
  type: 'zfs' | 'zfs-slog' | 'zfs-cache' | 'zfs-log-mirror' | 'zfs-enc' | 'zfs-root' | 'zfs-boot' | 'nfs' | 'iscsi' | 'lvm' | 'raw' | 'swap' | 'efi';
  isSystem: boolean;             // OS/EFI/swap = true, user data = false
  systemReason?: 'os' | 'efi' | 'swap' | 'boot' | 'recovery';
  mountpoint: string;            // '/', '/boot/efi', '/mnt/tank/data', 'hidden'
  sizeBytes: Quantity;
  usedBytes: Quantity;
  freeBytes: Quantity;
  usagePercent: Quantity;        // 0-100
  hosts: string[];               // 'cloudbsd-node-01', 'cloudbsd-node-02'
  compression: 'off' | 'lz4' | 'lzjb' | 'zle' | 'gzip' | 'gzip-fast' | 'gzip-best' | 'zstd' | 'zstd-fast' | 'zstd-best' | null;
  compressionRatio: Quantity;     // e.g. 1.45x
  encryption: 'off' | 'aes-128-gcm' | 'aes-192-gcm' | 'aes-256-gcm' | 'chacha20-poly1305' | null;
  encryptionKeyLoaded: boolean;
  recordsize: Quantity;          // default record size
  mountOptions: string[];
  health: 'healthy' | 'watch' | 'error';
  lastScrub: string;             // ISO timestamp
  compressionStreams: Quantity;
  // For NFS
  exports?: NFSExport[];
  // For iSCSI
  target?: ISCSITarget;
}

interface NFSExport {
  path: string;
  clients: string[];             // CIDRs allowed
  options: string[];             // rw, sync, no_root_squash
  enabled: boolean;
}

interface ISCSITarget {
  iqn: string;                    // iqn.2026-01.com.cloudbsd:disk01
  portal: string;                 // '10.0.20.21:3260'
  lun: Quantity;
  sizeBytes: Quantity;
  type: 'disk' | 'tape';
  sessions: Quantity;
}
```

## 12. Cluster (group of nodes)

```ts
interface Cluster {
  id: string;                    // 'default'
  name: string;                  // 'default'
  nodes: string[];               // node ids
  healthyNodes: Quantity;
  totalNodes: Quantity;
  totalVCPU: Quantity;           // aggregate
  totalMemoryBytes: Quantity;
  totalDiskBytes: Quantity;
  jobs: ClusterJob[];            // running migrations
  recentEvents: ClusterEvent[];
}

interface ClusterJob {
  id: string;
  type: 'migration' | 'replication' | 'scrub' | 'update' | 'snapshot';
  source: string;                // node id or 'pool-name'
  destination?: string;
  progressPercent: Quantity;
  started: string;
  estimatedComplete: string;
}

interface ClusterEvent {
  ts: string;
  type: 'node-joined' | 'node-left' | 'node-failed' | 'migrate-started' | 'migrate-completed' | 'migrate-failed' | 'scrub-completed' | 'replication-lag';
  message: string;
  node?: string;
  severity: 'info' | 'warn' | 'error';
}
```

## 13. User (PAM)

```ts
interface User {
  uid: Quantity;                  // POSIX UID
  username: string;                // 'mlapointe'
  gid: Quantity;                  // primary GID
  fullName: string;
  email: string;
  home: string;                   // '/home/mlapointe'
  shell: string;                  // '/bin/zsh' or '/usr/sbin/nologin'
  groups: string[];               // supplementary groups
  pamStatus: 'active' | 'locked' | 'expired' | 'disabled';
  pamLockedUntil?: string;        // ISO timestamp
  passwordLastChanged: string;    // ISO timestamp
  passwordAgeDays: Quantity;
  twoFA: {
    enabled: boolean;
    method: 'totp' | 'webauthn' | 'sms' | 'email' | 'none';
    enrolledAt?: string;
    backupCodes: Quantity;         // remaining
  };
  sshKeys: SSHKey[];
  lastLogin: LastLogin[];
  created: string;                // ISO timestamp
  expiresAt?: string;             // if password has expiry
}

interface SSHKey {
  id: string;
  name: string;                   // 'work-laptop'
  type: 'ssh-rsa' | 'ssh-ed25519' | 'ecdsa-sha2-nistp256' | 'ssh-dss';
  fingerprint: string;            // SHA256:abc...
  bits: Quantity;                 // 4096
  added: string;                  // ISO timestamp
  lastUsed?: string;
  comment: string;                // 'user@host'
}

interface LastLogin {
  ts: string;                     // ISO timestamp
  sourceIp: string;               // '10.0.10.42'
  userAgent: string;
  networkClass: 'rfc1918' | 'public' | 'link-local' | 'loopback' | 'ula' | 'corporate' | 'unknown';
  asn?: string;                    // 'AS64512' for public IPs
  geoCountry?: string;            // 'US' (NEVER city/region - privacy)
  success: boolean;
  mfaUsed: boolean;
}
```

## 14. Notification

```ts
interface Notification {
  id: string;
  ts: string;                     // ISO timestamp
  severity: 'error' | 'warning' | 'info' | 'success';
  type: string;                   // 'disk-full', 'vm-down', 'auth-failed', etc.
  source: string;                 // 'node-01', 'zfs-monitor', etc.
  sourceKind: 'system' | 'node' | 'plugin' | 'vm' | 'container' | 'jail' | 'volume' | 'auth' | 'network' | 'storage';
  title: string;                   // 'tank/media usage > 80%'
  message: string;
  target: string;                 // resource ref
  actions: NotificationAction[];
  read: boolean;
  readAt?: string;
  dismissedAt?: string;
  expiresAt?: string;
}

interface NotificationAction {
  id: string;                     // 'view' | 'dismiss' | 'snooze-1h'
  label: string;
  primary: boolean;
  href?: string;                  // deep link
  method?: 'GET' | 'POST' | 'DELETE';
  body?: Record<string, unknown>;
}
```

## 15. Activity Event (audit/activity feed)

```ts
interface ActivityEvent {
  id: string;
  ts: string;                     // ISO timestamp
  module: string;                 // 'zfs', 'jail', 'auth', 'vm', 'net', 'plugin'
  sourceKind: string;              // 'zfs', 'jail', 'auth', etc.
  type: string;                   // 'snapshot', 'migrate', 'login', etc.
  action: 'create' | 'update' | 'delete' | 'start' | 'stop' | 'migrate' | 'snapshot' | 'login' | 'logout' | 'reboot' | 'scrub';
  target: string;                 // resource ref
  message: string;                 // human-readable
  user?: string;                   // who triggered
  sourceIp?: string;
  details?: Record<string, unknown>;
  // Searchable metadata
  tags?: string[];
}
```

## 16. Log Entry

```ts
interface LogEntry {
  id: string;                     // ulid
  ts: string;                     // ISO timestamp with microseconds
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  module: string;                 // 'zfs', 'auth', 'jail', etc.
  source: string;                 // 'zfs-monitor', 'cloudbsd-node-01', etc.
  user?: string;                  // if user-initiated
  requestId?: string;             // for correlating with API calls
  message: string;                // single-line, human-readable
  structured: Record<string, unknown>;  // machine-parseable details
  durationNs?: Quantity;          // for operation timings
  errorCode?: string;             // 'ZFS_IO_FAILURE', 'AUTH_LOCKED', etc.
  errorStack?: string;             // for 'error'/'fatal' levels
}
```

## 17. Backup (schedule + recent runs)

```ts
interface BackupSchedule {
  id: string;
  name: string;                   // 'daily-tank-data'
  target: string;                 // 'tank-data', or vm name, etc.
  type: 'snapshot' | 'replicate' | 'archive' | 'sync';
  cronExpression: string;          // '0 2 * * *'
  timezone: string;               // 'UTC'
  destination: {
    type: 'local' | 'nfs' | 's3' | 'rsync' | 'rsync.net' | 'sftp';
    config: Record<string, string>;
  };
  retention: {
    keepCount: Quantity;          // keep last N
    keepDays: Quantity;           // or last N days
    compression: 'off' | 'gzip' | 'zstd' | 'lz4';
    encryption: 'off' | 'aes-256-gcm';
  };
  enabled: boolean;
  lastRun?: BackupRun;
  nextRun: string;                // ISO timestamp
}

interface BackupRun {
  id: string;
  scheduleId: string;
  started: string;
  duration: Quantity;              // seconds
  sizeBytes: Quantity;
  bytesTransferred: Quantity;
  status: 'success' | 'failed' | 'partial' | 'running' | 'cancelled';
  errorMessage?: string;
}
```

## 18. Plugin (manifest)

```ts
interface Plugin {
  id: string;                    // reverse-DNS, e.g. 'com.cloudbsd.vm-metrics'
  name: string;                  // 'VM Metrics'
  version: string;               // '1.4.2' semver
  author: string;                // 'mlapointe@cloudbsd.org'
  license: string;               // SPDX identifier
  homepage?: string;
  description: string;
  sha256: string;                // 'abc123...' content hash
  signature: string;             // ed25519:abc...
  status: 'discovered' | 'verified' | 'enabled' | 'disabled' | 'errored';
  capabilities: PluginCapability[];
  menuItems: PluginMenuItem[];
  pages: PluginPage[];
  routes: PluginRoute[];
  permissions: PluginPermission[];
  // Resource limits (sandbox)
  limits: {
    cpuPercent: Quantity;         // max CPU share
    memoryBytes: Quantity;
    networkBytesPerSec: Quantity;
    fileDescriptors: Quantity;
    storageBytes: Quantity;
    maxConcurrentRequests: Quantity;
  };
}

interface PluginCapability {
  name: string;                   // 'vms.read', 'logs.write', 'metrics.collect'
  scope: 'read' | 'write' | 'admin';
  resources: string[];            // ['vms/*', 'jails/*']
}

interface PluginMenuItem {
  id: string;
  label: string;
  icon: string;                   // 'chart-bar', 'activity'
  route: string;                  // '/ext/vm-metrics'
  position: 'sidebar' | 'topbar' | 'context';
  parentMenuId?: string;          // for submenus
  order: Quantity;                // sort order
}

interface PluginPage {
  id: string;
  title: string;
  route: string;                  // '/ext/vm-metrics'
  template: string;               // HTML template (sandbox-validated)
  permissions: string[];          // capabilities required
  size: 'small' | 'medium' | 'large' | 'fullscreen';
  refreshIntervalSec: Quantity;
}

interface PluginRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;                   // '/ext/vm-metrics/api/query'
  handler: string;                // function name in plugin bundle
  permissions: string[];          // required capabilities
  bodySchema?: string;            // JSON schema
  responseSchema?: string;        // JSON schema
}

interface PluginPermission {
  name: string;                   // 'network.outbound'
  description: string;
  granted: boolean;
  grantedBy: string;              // user who granted
  grantedAt: string;              // ISO timestamp
  expiresAt?: string;             // optional expiry
}
```

## 19. System Stats (for dashboard stats card)

```ts
interface SystemStats {
  vms: { total: Quantity; running: Quantity; stopped: Quantity; paused: Quantity; error: Quantity };
  containers: { total: Quantity; running: Quantity; exited: Quantity; paused: Quantity; error: Quantity };
  jails: { total: Quantity; running: Quantity; stopped: Quantity; frozen: Quantity; error: Quantity };
  volumes: { total: Quantity; healthy: Quantity; watch: Quantity; error: Quantity; systemRO: Quantity };
  nodes: { total: Quantity; online: Quantity; offline: Quantity };
  plugins: { enabled: Quantity; failed: Quantity; total: Quantity };
  locales: { supported: Quantity; inReview: Quantity; total: Quantity };
  themes: { installed: Quantity; custom: Quantity; total: Quantity };
  apiCallsPerMin: Quantity;
  dataBackedUp: ByteSize;          // 2.3 TB
  dataBackedUpLast24h: ByteSize;
  securityIncidents: { open: Quantity; totalLast90d: Quantity };
  uptimeSLA: { days: Quantity; percent: Quantity; targetPercent: Quantity };
}
```

## Display transformation utility

```ts
function formatQty(q: Quantity): string {
  if (q.unit === 'bytes') {
    return formatBytes(q.value);  // auto-scales to TB/GB/MB/KB
  }
  if (q.unit === 'hz') {
    return formatHz(q.value);  // auto-scales to GHz/MHz/kHz/Hz
  }
  if (q.unit === 'percent') {
    return q.value.toFixed(0) + '%';  // 95% (whole number for percentages)
  }
  if (q.unit === 'count') {
    return q.value.toLocaleString();  // 1,234 (thousands separator)
  }
  if (q.unit === 'seconds') {
    return formatDuration(q.value);  // '14d 02:11'
  }
  if (q.unit === 'celsius') {
    return q.value.toFixed(0) + '\u00b0C';  // 47\u00b0C
  }
  if (q.unit === 'watts') {
    return q.value.toFixed(0) + ' W';
  }
  if (q.unit === 'bytes_per_sec') {
    return formatBytesPerSec(q.value);  // 86.1 MB/s
  }
  if (q.unit === 'ip' || q.unit === 'ip_port') {
    return q.value.toString();  // '10.0.10.21' or '10.0.10.21:3260'
  }
  return q.value.toString() + ' ' + q.unit;
}

function formatBytes(b: number): string {
  if (b === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(Math.abs(b)) / Math.log(k));
  const v = b / Math.pow(k, i);
  return (v >= 100 || i === 0 ? v.toFixed(0) : v.toFixed(1)) + ' ' + units[i];
}
```

## UI Rules (from user feedback)
1. Every quantity with units uses `Quantity` type with explicit `unit` field
2. Storage sizes: round to 1 decimal if <100 of the unit (e.g. 86.1 GB, 4.7 TB)
3. Counts: always whole numbers (no decimals)
4. Percentages: whole numbers
5. CPU info: brand, model, cores, threads shown in compact form; CPU flags in 'More info' modal
6. RAM: total + slots (used/total) + each slot size; full slot details in 'More info'
7. Disk: model + size + bus + RPM/NVMe + health status; SMART details in 'More info'
8. GPU: model + VRAM + utilization; full driver/capabilities in 'More info'
9. Network: state + speed + IP (truncated if too long); full MAC/stats in detail
10. NO geolocation: 'US' (country) for public IPs, never city/region
11. Show as integer where possible: "8 cores" not "8.0 cores", "2 sockets" not "2.0"
12. NEVER show "1.7 GB" - use "1.7 GB" only when not whole, else "2 GB"
