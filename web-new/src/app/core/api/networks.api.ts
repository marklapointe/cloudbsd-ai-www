import { Injectable, inject } from '@angular/core';
import { EnvelopeClient } from '../protocol/envelope.client';
import { firstPayload } from '../protocol/envelope.types';

export interface NetworkSummary {
  id: string;
  name: string;
  type: 'bridge' | 'vlan' | 'lagg' | 'pool';
  cidr: string;
  vlan?: number;
  hosts: number;
  status: 'up' | 'down' | 'degraded';
}

export interface NetworksBatch {
  total: number;
  shown: number;
  stats: { up: number; down: number; pools: number };
}

@Injectable({ providedIn: 'root' })
export class NetworksApi {
  private readonly client = inject(EnvelopeClient);

  async list(search = ''): Promise<{ batch: NetworksBatch; items: NetworkSummary[] }> {
    const env = await this.client.exchange({
      what: 'networks.list',
      where: 'networks_view',
      payload: [
        {
          mime: 'application/vnd.cloudbsd+query',
          kind: 'query',
          data: { filter: { search } },
        },
      ],
    });
    const batch = firstPayload<NetworksBatch>(env, 'networks.batch');
    if (!batch) {
      return {
        batch: { total: 0, shown: 0, stats: { up: 0, down: 0, pools: 0 } },
        items: [],
      };
    }
    const items = (batch.includes || [])
      .filter((i) => i.kind === 'network')
      .map((i) => i.data as NetworkSummary);
    return { batch: batch.data, items };
  }
}
