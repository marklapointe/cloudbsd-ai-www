import { Injectable, inject } from '@angular/core';
import { EnvelopeClient } from '../protocol/envelope.client';
import { firstPayload } from '../protocol/envelope.types';

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  role: string;
  status: 'active' | 'disabled' | 'locked';
  lastLogin?: string;
  mfa: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly client = inject(EnvelopeClient);

  async list(search = ''): Promise<UserSummary[]> {
    const env = await this.client.exchange({
      what: 'users.list',
      where: 'users_view',
      payload: [
        {
          mime: 'application/vnd.cloudbsd+query',
          kind: 'query',
          data: { filter: { search } },
        },
      ],
    });
    const batch = firstPayload<{ items: UserSummary[] }>(env, 'users.batch');
    return batch?.data?.items || [];
  }
}
