import { Injectable, inject } from '@angular/core';
import { EnvelopeClient } from '../protocol/envelope.client';
import { firstPayload } from '../protocol/envelope.types';
import { ListApi, ListQuery } from './list.api';
import { VmSummary, VmsBatch } from '../protocol/resource.types';
import { PayloadItem } from '../protocol/envelope.types';

export type VmsListQuery = ListQuery;

export interface VmsListResult {
  batch: VmsBatch;
  items: VmSummary[];
  next?: string;
}

export interface VmDetail {
  vm: VmSummary;
  disks: { name: string; path: string; sizeBytes: number; type: string }[];
  nics: { name: string; bridge: string; mac: string; ip: string }[];
  snapshots: { id: string; name: string; createdAt: string; sizeBytes: number }[];
}

@Injectable({ providedIn: 'root' })
export class VmsApi {
  private readonly client = inject(EnvelopeClient);
  private readonly lists = inject(ListApi);

  async list(query: VmsListQuery = {}): Promise<VmsListResult> {
    return this.lists.listBatch<VmsBatch, VmSummary>({
      what: 'vms.list',
      where: 'vms_view',
      batchKind: 'vms.batch',
      itemKind: 'vm',
      query,
      emptyBatch: {
        total: 0,
        shown: 0,
        stats: { running: 0, stopped: 0, paused: 0, error: 0 },
      },
    });
  }

  async get(id: string): Promise<VmDetail> {
    const env = await this.client.exchange({
      what: 'vm.get',
      where: 'vm_detail',
      payload: [
        {
          mime: 'application/vnd.cloudbsd+query',
          kind: 'query',
          data: { id },
        },
      ],
    });
    const item = firstPayload<VmSummary>(env, 'vm');
    if (!item) {
      throw new Error(`VM not found: ${id}`);
    }
    return {
      vm: item.data,
      disks: extractInclude(item, 'vm.disks', 'disks') as VmDetail['disks'],
      nics: extractInclude(item, 'vm.nics', 'nics') as VmDetail['nics'],
      snapshots: extractInclude(item, 'vm.snapshots', 'snapshots') as VmDetail['snapshots'],
    };
  }

  async executeAction(
    vmId: string,
    action: string,
    reason: string,
  ): Promise<{ taskId: string }> {
    const what = `vm.${action}`;
    const env = await this.client.exchange({
      what,
      why: reason || 'user_requested',
      where: 'vms_view',
      payload: [
        {
          mime: 'application/vnd.cloudbsd+vm.action',
          kind: 'vm.action',
          data: { id: vmId, action, reason },
        },
      ],
    });
    const task = firstPayload<{ id: string }>(env, 'task');
    return { taskId: task?.data?.id || 'unknown' };
  }
}

function extractInclude(
  item: PayloadItem,
  kind: string,
  key: string,
): unknown[] {
  const inc = item.includes?.find((i) => i.kind === kind);
  if (!inc) {
    return [];
  }
  const data = inc.data as Record<string, unknown>;
  return (data[key] as unknown[]) || [];
}
