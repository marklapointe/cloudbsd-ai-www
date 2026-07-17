import { Injectable, inject } from '@angular/core';
import { ListApi, ListQuery } from './list.api';
import { ContainerSummary, ContainersBatch } from '../protocol/resource.types';

@Injectable({ providedIn: 'root' })
export class ContainersApi {
  private readonly lists = inject(ListApi);

  list(query: ListQuery = {}) {
    return this.lists.listBatch<ContainersBatch, ContainerSummary>({
      what: 'containers.list',
      where: 'containers_view',
      batchKind: 'containers.batch',
      itemKind: 'container',
      query,
      emptyBatch: {
        total: 0,
        shown: 0,
        stats: { running: 0, exited: 0, paused: 0 },
      },
    });
  }
}
