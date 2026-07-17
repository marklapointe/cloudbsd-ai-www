import { Injectable, inject } from '@angular/core';
import { EnvelopeClient } from './envelope.client';
import {
  PreflightRequestData,
  PreflightResult,
  preflightCacheKey,
} from './preflight.types';
import { firstPayload } from './envelope.types';

interface CacheEntry {
  result: PreflightResult;
  expiresAt: number;
}

/**
 * Action preflight (Rule #8, WIRE §2.31).
 * Cache ≤ ttlMs; drop on invalidating StreamEvents later.
 */
@Injectable({ providedIn: 'root' })
export class PreflightService {
  private readonly client = inject(EnvelopeClient);
  private readonly cache = new Map<string, CacheEntry>();

  async check(
    resourceType: string,
    resourceId: string,
    action: string,
    where: string,
  ): Promise<PreflightResult> {
    const key = preflightCacheKey(resourceType, resourceId, action);
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.result;
    }

    const what = `${resourceType}.${action}.preflight`;
    const payloadData: PreflightRequestData = {
      resource: { type: resourceType, id: resourceId },
      action,
    };

    const env = await this.client.exchange({
      what,
      where,
      payload: [
        {
          mime: 'application/vnd.cloudbsd+preflight.request',
          kind: 'preflight.request',
          data: payloadData,
        },
      ],
    });

    const item = firstPayload<PreflightResult>(env, 'preflight.result');
    if (!item) {
      // Fail open only for missing payload in mock gaps — treat as blocked.
      return {
        viable: false,
        blockers: [
          {
            id: 'preflight-missing',
            message: 'Preflight result missing from backend.',
            remediation: 'Retry or contact an administrator.',
          },
        ],
        warnings: [],
        checks: [],
        ttlMs: 5_000,
        fetchedAt: new Date().toISOString(),
      };
    }

    const result = item.data;
    this.cache.set(key, {
      result,
      expiresAt: Date.now() + (result.ttlMs || 30_000),
    });
    return result;
  }

  /** Drop cache (e.g. after StreamEvent). */
  invalidate(resourceType?: string, resourceId?: string, action?: string): void {
    if (!resourceType) {
      this.cache.clear();
      return;
    }
    const prefix = action
      ? preflightCacheKey(resourceType, resourceId || '', action)
      : `${resourceType}:${resourceId || ''}`;
    for (const k of [...this.cache.keys()]) {
      if (k === prefix || k.startsWith(prefix)) {
        this.cache.delete(k);
      }
    }
  }
}
