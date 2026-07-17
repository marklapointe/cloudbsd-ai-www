import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DetailShellComponent } from '../../shared/detail-shell/detail-shell.component';
import { ResourcesApi } from '../../core/api/resources.api';
import { HostSummary, formatUptime } from '../../core/protocol/resource.types';

@Component({
  selector: 'app-host-detail-page',
  standalone: true,
  imports: [DetailShellComponent, RouterLink],
  template: `
    @if (loading()) {
      <div class="rounded-shell border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading host…
      </div>
    } @else if (error()) {
      <div class="rounded-shell border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {{ error() }}
        <a routerLink="/hosts" class="ml-2 text-brand-600">Back</a>
      </div>
    } @else if (item(); as h) {
      <app-detail-shell
        [title]="h.name"
        [subtitle]="h.role + ' · ' + h.version"
        [badge]="h.status"
        [badgeClass]="statusClass(h.status)"
        backLink="/hosts"
        backLabel="Hosts"
        [tabs]="tabs"
        [(activeTab)]="tab"
      >
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-shell border border-slate-200 bg-white p-4 text-xs">
            <div class="text-[11px] text-slate-400">CPU</div>
            <div class="mt-1 text-2xl font-semibold">{{ h.cpuPercent }}%</div>
          </div>
          <div class="rounded-shell border border-slate-200 bg-white p-4 text-xs">
            <div class="text-[11px] text-slate-400">Memory</div>
            <div class="mt-1 text-2xl font-semibold">{{ h.memPercent }}%</div>
          </div>
          <div class="rounded-shell border border-slate-200 bg-white p-4 text-xs">
            <div class="text-[11px] text-slate-400">VMs / Jails</div>
            <div class="mt-1 text-2xl font-semibold">{{ h.vmCount }} / {{ h.jailCount }}</div>
          </div>
          <div class="rounded-shell border border-slate-200 bg-white p-4 text-xs">
            <div class="text-[11px] text-slate-400">Uptime</div>
            <div class="mt-1 text-2xl font-semibold">{{ formatUptime(h.uptimeSec) }}</div>
          </div>
        </div>
        <p class="mt-3 text-xs text-slate-500">
          Hosts = inventory. Cluster services (HA/VIP) live under Cluster, not this table.
        </p>
      </app-detail-shell>
    }
  `,
})
export class HostDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ResourcesApi);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly item = signal<HostSummary | null>(null);
  readonly tab = signal('overview');
  readonly tabs = [{ id: 'overview', label: 'Overview' }];
  readonly formatUptime = formatUptime;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Missing id');
      this.loading.set(false);
      return;
    }
    void this.load(id);
  }

  statusClass(s: string): string {
    if (s === 'online') return 'bg-emerald-50 text-emerald-700';
    if (s === 'draining') return 'bg-amber-50 text-amber-700';
    return 'bg-slate-100 text-slate-600';
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    try {
      this.item.set(await this.api.getHost(id));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed');
    } finally {
      this.loading.set(false);
    }
  }
}
