/** Action preflight — WIRE_PROTOCOL §2.31 (Rule #8). */

export interface PreflightResource {
  type: string;
  id: string;
}

export interface PreflightRequestData {
  resource: PreflightResource;
  action: string;
}

export interface PreflightBlocker {
  id: string;
  message: string;
  detail?: string;
  remediation?: string;
}

export interface PreflightWarning {
  id: string;
  message: string;
  impact?: string;
  expectedRange?: [number, number];
}

export interface PreflightCheck {
  id: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
  message: string;
}

export interface PreflightResult {
  viable: boolean;
  blockers: PreflightBlocker[];
  warnings: PreflightWarning[];
  checks: PreflightCheck[];
  /** Client may cache ≤ ttlMs unless StreamEvent invalidates. */
  ttlMs: number;
  fetchedAt: string;
}

export type PreflightCacheKey = string;

export function preflightCacheKey(resourceType: string, resourceId: string, action: string): PreflightCacheKey {
  return `${resourceType}:${resourceId}:${action}`;
}
