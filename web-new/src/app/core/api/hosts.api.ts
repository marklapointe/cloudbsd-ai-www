import { Injectable, inject } from '@angular/core';
import { ListApi, ListQuery } from './list.api';
import { HostSummary, HostsBatch } from '../protocol/resource.types';

@Injectable({ providedIn: 'root' })
export class HostsApi {
  private readonly lists = inject(ListApi);

  list(query: ListQuery = {}) {
    return this.lists.listBatch<HostsBatch, HostSummary>({
      what: 'hosts.list',
      where: 'hosts_view',
      batchKind: 'hosts.batch',
      itemKind: 'host',
      query,
      emptyBatch: {
        total: 0,
        shown: 0,
        stats: { online: 0, offline: 0, draining: 0 },
      },
    });
  }
}
