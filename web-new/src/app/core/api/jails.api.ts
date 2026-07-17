import { Injectable, inject } from '@angular/core';
import { ListApi, ListQuery } from './list.api';
import { JailSummary, JailsBatch } from '../protocol/resource.types';

@Injectable({ providedIn: 'root' })
export class JailsApi {
  private readonly lists = inject(ListApi);

  list(query: ListQuery = {}) {
    return this.lists.listBatch<JailsBatch, JailSummary>({
      what: 'jails.list',
      where: 'jails_view',
      batchKind: 'jails.batch',
      itemKind: 'jail',
      query,
      emptyBatch: {
        total: 0,
        shown: 0,
        stats: { running: 0, stopped: 0, frozen: 0 },
      },
    });
  }
}
