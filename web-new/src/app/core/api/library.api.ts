import { Injectable, inject } from '@angular/core';
import { EnvelopeClient } from '../protocol/envelope.client';
import { firstPayload } from '../protocol/envelope.types';

export interface BaseJail {
  id: string;
  name: string;
  version: string;
  arch: string;
  sizeBytes: number;
  cachedAt: string;
  sourceRepo: string;
}

export interface Repository {
  id: string;
  name: string;
  url: string;
  auth: 'none' | 'basic' | 'bearer' | 'header' | 'mtls';
  status: 'ok' | 'error' | 'unprobed';
  lastProbe?: string;
}

@Injectable({ providedIn: 'root' })
export class LibraryApi {
  private readonly client = inject(EnvelopeClient);

  async listBases(): Promise<BaseJail[]> {
    const env = await this.client.exchange({
      what: 'library.bases.list',
      where: 'library_view',
    });
    const batch = firstPayload<{ items: BaseJail[] }>(env, 'library.bases.batch');
    return batch?.data?.items || [];
  }

  async listRepos(): Promise<Repository[]> {
    const env = await this.client.exchange({
      what: 'library.repos.list',
      where: 'library_view',
    });
    const batch = firstPayload<{ items: Repository[] }>(env, 'library.repos.batch');
    return batch?.data?.items || [];
  }
}
