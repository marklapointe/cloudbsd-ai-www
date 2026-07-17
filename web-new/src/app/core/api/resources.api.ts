import { Injectable, inject } from '@angular/core';
import { EnvelopeClient } from '../protocol/envelope.client';
import { firstPayload } from '../protocol/envelope.types';
import {
  ContainerSummary,
  HostSummary,
  JailSummary,
  VolumeSummary,
} from '../protocol/resource.types';

@Injectable({ providedIn: 'root' })
export class ResourcesApi {
  private readonly client = inject(EnvelopeClient);

  async getContainer(id: string): Promise<ContainerSummary> {
    return this.getOne<ContainerSummary>('container.get', 'container', id, 'container_detail');
  }

  async getJail(id: string): Promise<JailSummary> {
    return this.getOne<JailSummary>('jail.get', 'jail', id, 'jail_detail');
  }

  async getVolume(id: string): Promise<VolumeSummary> {
    return this.getOne<VolumeSummary>('volume.get', 'volume', id, 'volume_detail');
  }

  async getHost(id: string): Promise<HostSummary> {
    return this.getOne<HostSummary>('host.get', 'host', id, 'host_detail');
  }

  async create(
    what: string,
    where: string,
    data: Record<string, unknown>,
  ): Promise<{ id: string; taskId: string }> {
    const env = await this.client.exchange({
      what,
      where,
      why: 'user_requested',
      payload: [
        {
          mime: 'application/vnd.cloudbsd+create',
          kind: 'create',
          data,
        },
      ],
    });
    const created = firstPayload<{ id: string }>(env, 'created');
    const task = firstPayload<{ id: string }>(env, 'task');
    return {
      id: created?.data?.id || String(data['name'] || 'unknown'),
      taskId: task?.data?.id || 'task-local',
    };
  }

  private async getOne<T>(
    what: string,
    kind: string,
    id: string,
    where: string,
  ): Promise<T> {
    const env = await this.client.exchange({
      what,
      where,
      payload: [
        {
          mime: 'application/vnd.cloudbsd+query',
          kind: 'query',
          data: { id },
        },
      ],
    });
    const item = firstPayload<T>(env, kind);
    if (!item) {
      throw new Error(`${kind} not found: ${id}`);
    }
    return item.data;
  }
}
