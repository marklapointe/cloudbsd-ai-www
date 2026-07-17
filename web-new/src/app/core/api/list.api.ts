import { Injectable, inject } from '@angular/core';
import { EnvelopeClient } from '../protocol/envelope.client';
import { firstPayload } from '../protocol/envelope.types';

export interface ListQuery {
  search?: string;
  status?: string[];
  sortField?: string;
  sortDir?: 'asc' | 'desc';
  limit?: number;
  cursor?: string | null;
  id?: string;
}

export interface ListResult<TBatch, TItem> {
  batch: TBatch;
  items: TItem[];
  next?: string;
}

/**
 * Generic list helper for envelope batch + includes patterns.
 */
@Injectable({ providedIn: 'root' })
export class ListApi {
  private readonly client = inject(EnvelopeClient);

  async listBatch<TBatch, TItem>(opts: {
    what: string;
    where: string;
    batchKind: string;
    itemKind: string;
    query?: ListQuery;
    emptyBatch: TBatch;
  }): Promise<ListResult<TBatch, TItem>> {
    const q = opts.query || {};
    const env = await this.client.exchange({
      what: opts.what,
      where: opts.where,
      payload: [
        {
          mime: 'application/vnd.cloudbsd+query',
          kind: 'query',
          data: {
            filter: {
              status: q.status || null,
              search: q.search || '',
            },
            sort: {
              field: q.sortField || 'name',
              direction: q.sortDir || 'asc',
            },
            page: { limit: q.limit || 50, cursor: q.cursor || null },
            id: q.id,
          },
        },
      ],
    });

    const batchItem = firstPayload<TBatch>(env, opts.batchKind);
    if (!batchItem) {
      return { batch: opts.emptyBatch, items: [] };
    }

    const fromIncludes = (batchItem.includes || [])
      .filter((i) => i.kind === opts.itemKind)
      .map((i) => i.data as TItem);

    // Some wire examples put items as sibling payload entries
    const fromPayload = env.payload
      .filter((p) => p.kind === opts.itemKind)
      .map((p) => p.data as TItem);

    const items = fromIncludes.length ? fromIncludes : fromPayload;

    return {
      batch: batchItem.data,
      items,
      next: env.next,
    };
  }
}
