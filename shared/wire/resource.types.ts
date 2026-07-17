/** Domain resource shapes used by list pages (subset of WIRE payloads). */

export type PowerStatus = 'RUN' | 'STOP' | 'PAUSED' | 'ERROR' | 'EXITED' | 'FROZEN';

export type VmStatus = 'RUN' | 'STOP' | 'PAUSED' | 'ERROR';

export interface VmSummary {
  id: string;
  name: string;
  status: VmStatus;
  os: string;
  vcpu: number;
  ramBytes: number;
  diskBytes: number;
  uptimeSec: number;
  host: string;
  ip: string;
  tags: string[];
  version?: string;
  createdAt?: string;
  description?: string;
}

export interface VmsBatch {
  total: number;
  shown: number;
  stats: {
    running: number;
    stopped: number;
    paused: number;
    error: number;
  };
}

export interface ContainerSummary {
  id: string;
  name: string;
  image: string;
  imageRegistry: string;
  status: 'RUN' | 'EXITED' | 'PAUSED';
  ports: { container: number; host: number; protocol: string }[];
  cpuPercent: number;
  memBytes: number;
  uptimeSec: number;
  host: string;
  createdAt?: string;
  version?: string;
}

export interface ContainersBatch {
  total: number;
  shown: number;
  stats: { running: number; exited: number; paused: number };
}

export interface JailSummary {
  id: string;
  name: string;
  status: 'RUN' | 'STOP' | 'FROZEN';
  os: string;
  hostname: string;
  ip: string;
  vcpus: number;
  ramBytes: number;
  diskBytes: number;
  host: string;
  jailId: number;
  uptimeSec: number;
  version?: string;
}

export interface JailsBatch {
  total: number;
  shown: number;
  stats: { running: number; stopped: number; frozen: number };
}

export interface VolumeSummary {
  id: string;
  name: string;
  type: string;
  sizeBytes: number;
  usedBytes: number;
  usagePercent: number;
  mountpoint: string;
  compression: string;
  encryption: string;
  lastScrub: string;
  health: 'healthy' | 'watch' | 'degraded';
}

export interface VolumesBatch {
  total: number;
  shown: number;
  stats: { healthy: number; watch: number; encrypted: number };
}

export interface HostSummary {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'draining' | 'maintenance';
  role: string;
  cpuPercent: number;
  memPercent: number;
  vmCount: number;
  jailCount: number;
  uptimeSec: number;
  version: string;
}

export interface HostsBatch {
  total: number;
  shown: number;
  stats: { online: number; offline: number; draining: number };
}

export interface TaskSummary {
  id: string;
  name: string;
  type: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  progressPercent: number;
  resourceType?: string;
  resourceId?: string;
  startedAt: string;
  finishedAt: string | null;
  actor: string;
}

export interface TasksBatch {
  total: number;
  shown: number;
  stats: { running: number; queued: number; failed: number };
}

export interface NotificationItem {
  id: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
  read: boolean;
  ts: string;
  href?: string;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  email?: string;
  displayName: string;
  groups?: string[];
  roles: string[];
  isAdmin: boolean;
  totpEnrolled?: boolean;
  expiresAt?: string;
  idleTimeoutSec?: number;
  /** Present when backend returns JWT for Bearer clients (envelope login). */
  bearerToken?: string;
}

/** StreamEvent — backend-issued only (Rule #14). */
export interface StreamEvent {
  type: string;
  topic: string;
  id: string;
  ts: string;
  resourceType?: string;
  resourceId?: string;
  payload?: unknown;
}

export function bytesToGiB(bytes: number): number {
  return Math.round(bytes / 1024 ** 3 * 10) / 10;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 4) {
    return `${(bytes / 1024 ** 4).toFixed(1)} TiB`;
  }
  if (bytes >= 1024 ** 3) {
    return `${(bytes / 1024 ** 3).toFixed(1)} GiB`;
  }
  if (bytes >= 1024 ** 2) {
    return `${(bytes / 1024 ** 2).toFixed(0)} MiB`;
  }
  return `${bytes} B`;
}

export function formatPowerStatus(status: string): string {
  switch (status) {
    case 'RUN':
      return 'running';
    case 'STOP':
      return 'stopped';
    case 'PAUSED':
      return 'paused';
    case 'EXITED':
      return 'exited';
    case 'FROZEN':
      return 'frozen';
    case 'ERROR':
      return 'error';
    default:
      return status.toLowerCase();
  }
}

export function formatVmStatus(status: VmStatus): string {
  return formatPowerStatus(status);
}

export function formatUptime(sec: number): string {
  if (sec <= 0) {
    return '—';
  }
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) {
    return `${d}d ${h}h`;
  }
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}
