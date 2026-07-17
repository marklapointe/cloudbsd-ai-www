import { Injectable, inject } from '@angular/core';
import { ListApi, ListQuery } from './list.api';
import { VolumeSummary, VolumesBatch } from '../protocol/resource.types';

@Injectable({ providedIn: 'root' })
export class StorageApi {
  private readonly lists = inject(ListApi);

  list(query: ListQuery = {}) {
    return this.lists.listBatch<VolumesBatch, VolumeSummary>({
      what: 'volumes.list',
      where: 'storage_view',
      batchKind: 'volumes.batch',
      itemKind: 'volume',
      query,
      emptyBatch: {
        total: 0,
        shown: 0,
        stats: { healthy: 0, watch: 0, encrypted: 0 },
      },
    });
  }
}
