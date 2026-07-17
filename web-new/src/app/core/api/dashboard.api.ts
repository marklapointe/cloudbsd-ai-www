import { Injectable, inject } from '@angular/core';
import { EnvelopeClient } from '../protocol/envelope.client';
import { StatCard } from '../../shared/stat-cards/stat-cards.component';

export interface DashboardAlert {
  id: string;
  severity: string;
  message: string;
  ts: string;
}

export interface DashboardTask {
  id: string;
  name: string;
  status: string;
  finishedAt: string | null;
}

export interface DashboardBootstrap {
  cards: StatCard[];
  alerts: DashboardAlert[];
  tasks: DashboardTask[];
}

@Injectable({ providedIn: 'root' })
export class DashboardApi {
  private readonly client = inject(EnvelopeClient);

  async bootstrap(): Promise<DashboardBootstrap> {
    const env = await this.client.exchange({
      what: 'dashboard.bootstrap',
      where: 'dashboard_view',
    });

    const cards: StatCard[] = [];
    let alerts: DashboardAlert[] = [];
    let tasks: DashboardTask[] = [];

    for (const item of env.payload) {
      const data = item.data as Record<string, unknown>;
      switch (item.kind) {
        case 'metric.hosts':
          cards.push({
            label: 'Hosts',
            value: `${data['online'] ?? '—'} / ${data['total'] ?? '—'}`,
            hint: 'Online / total',
          });
          break;
        case 'metric.vms':
          cards.push({
            label: 'VMs',
            value: String(data['running'] ?? '—'),
            hint: `${data['total'] ?? '—'} total`,
          });
          break;
        case 'metric.jails':
          cards.push({
            label: 'Jails',
            value: String(data['running'] ?? '—'),
            hint: `${data['total'] ?? '—'} total`,
          });
          break;
        case 'metric.storage':
          cards.push({
            label: 'Storage',
            value: data['freePercent'] != null ? `${data['freePercent']}% free` : '—',
            hint: String(data['pool'] || 'pool'),
          });
          break;
        case 'alerts.batch':
          alerts = (data['items'] as DashboardAlert[]) || [];
          break;
        case 'tasks.recent':
          tasks = (data['items'] as DashboardTask[]) || [];
          break;
      }
    }

    if (!cards.length) {
      cards.push(
        { label: 'Hosts', value: '—', hint: 'Online / total' },
        { label: 'VMs', value: '—', hint: 'Running' },
        { label: 'Jails', value: '—', hint: 'Running' },
        { label: 'Storage', value: '—', hint: 'Pool free' },
      );
    }

    return { cards, alerts, tasks };
  }
}
