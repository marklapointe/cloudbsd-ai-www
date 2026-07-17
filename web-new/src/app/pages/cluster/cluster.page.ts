import { Component, OnInit, inject, signal } from '@angular/core';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { StatCardsComponent, StatCard } from '../../shared/stat-cards/stat-cards.component';
import { EnvelopeClient } from '../../core/protocol/envelope.client';
import { firstPayload } from '../../core/protocol/envelope.types';

@Component({
  selector: 'app-cluster-page',
  standalone: true,
  imports: [PageHeaderComponent, StatCardsComponent],
  template: `
    <app-page-header
      title="Cluster"
      subtitle="HA, jobs, replication — not a second host table (Hosts = inventory)"
    />

    @if (loading()) {
      <div class="rounded-shell border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading cluster…
      </div>
    } @else {
      <app-stat-cards [cards]="cards()" />
      <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section class="rounded-shell border border-slate-200 bg-white p-4">
          <h2 class="m-0 text-sm font-semibold text-slate-800">Services</h2>
          <ul class="mt-2 space-y-1 text-xs text-slate-700">
            @for (s of services(); track s.name) {
              <li class="flex justify-between border-b border-slate-50 py-1.5">
                <span>{{ s.name }}</span>
                <span
                  class="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  [class.bg-emerald-50]="s.status === 'healthy'"
                  [class.text-emerald-700]="s.status === 'healthy'"
                  [class.bg-amber-50]="s.status === 'degraded'"
                  [class.text-amber-800]="s.status === 'degraded'"
                >
                  {{ s.status }}
                </span>
              </li>
            }
          </ul>
        </section>
        <section class="rounded-shell border border-slate-200 bg-white p-4">
          <h2 class="m-0 text-sm font-semibold text-slate-800">Events</h2>
          <ul class="mt-2 space-y-2 text-xs text-slate-600">
            @for (e of events(); track e.id) {
              <li>
                <span class="font-medium text-slate-800">{{ e.title }}</span>
                <div class="text-[11px] text-slate-400">{{ e.ts }}</div>
              </li>
            }
          </ul>
        </section>
      </div>
    }
  `,
})
export class ClusterPage implements OnInit {
  private readonly client = inject(EnvelopeClient);

  readonly loading = signal(true);
  readonly cards = signal<StatCard[]>([]);
  readonly services = signal<{ name: string; status: string }[]>([]);
  readonly events = signal<{ id: string; title: string; ts: string }[]>([]);

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const env = await this.client.exchange({
        what: 'cluster.status',
        where: 'cluster_view',
      });
      const data = firstPayload<{
        cards: StatCard[];
        services: { name: string; status: string }[];
        events: { id: string; title: string; ts: string }[];
      }>(env, 'cluster.status')?.data;

      this.cards.set(
        data?.cards || [
          { label: 'Quorum', value: '3/3', hint: 'Healthy' },
          { label: 'VIP', value: '10.0.10.1', hint: 'CARP' },
          { label: 'Replication', value: 'ok', hint: 'Last 2m ago' },
          { label: 'Jobs', value: '2', hint: 'Running' },
        ],
      );
      this.services.set(
        data?.services || [
          { name: 'control-api', status: 'healthy' },
          { name: 'stream-gateway', status: 'healthy' },
          { name: 'scheduler', status: 'healthy' },
          { name: 'replication', status: 'degraded' },
        ],
      );
      this.events.set(
        data?.events || [
          {
            id: '1',
            title: 'prod-node-02 joined quorum',
            ts: new Date(Date.now() - 3600_000).toISOString(),
          },
          {
            id: '2',
            title: 'edge-node-01 entered drain',
            ts: new Date(Date.now() - 7200_000).toISOString(),
          },
        ],
      );
    } finally {
      this.loading.set(false);
    }
  }
}
