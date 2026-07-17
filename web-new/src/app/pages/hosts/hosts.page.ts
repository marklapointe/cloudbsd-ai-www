import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import {
  ResourceColumn,
  ResourceTableComponent,
} from '../../shared/resource-table/resource-table.component';
import { FilterBarComponent } from '../../shared/filter-bar/filter-bar.component';
import { HostsApi } from '../../core/api/hosts.api';
import { HostSummary, formatUptime } from '../../core/protocol/resource.types';

@Component({
  selector: 'app-hosts-page',
  standalone: true,
  imports: [PageHeaderComponent, ResourceTableComponent, FilterBarComponent],
  template: `
    <app-page-header title="Hosts" subtitle="Node inventory">
      <button
        type="button"
        class="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
      >
        Add host
      </button>
    </app-page-header>

    <app-filter-bar
      placeholder="Filter hosts…"
      [chips]="chips"
      [(query)]="query"
      [(activeChip)]="statusFilter"
      (queryChange)="reload()"
      (chipChange)="reload()"
    />

    @if (loading()) {
      <div class="rounded-shell border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading hosts…
      </div>
    } @else {
      <app-resource-table
        [columns]="columns"
        [rows]="rows()"
        [trackBy]="track"
        emptyTitle="No hosts"
        emptyDescription="Join a node with a cluster token."
        [footer]="footer()"
        (rowClick)="openDetail($event)"
      />
    }
  `,
})
export class HostsPage implements OnInit {
  private readonly api = inject(HostsApi);
  private readonly router = inject(Router);

  readonly chips = [
    { id: 'all', label: 'all' },
    { id: 'online', label: 'online' },
    { id: 'draining', label: 'draining' },
    { id: 'offline', label: 'offline' },
  ];
  readonly query = signal('');
  readonly statusFilter = signal('all');
  readonly rows = signal<HostSummary[]>([]);
  readonly loading = signal(true);
  readonly footer = signal('');

  readonly columns: ResourceColumn<HostSummary>[] = [
    { id: 'status', header: 'Status', badge: true, cell: (h) => h.status },
    { id: 'name', header: 'Name', cell: (h) => h.name },
    { id: 'role', header: 'Role', cell: (h) => h.role },
    { id: 'cpu', header: 'CPU', cell: (h) => `${h.cpuPercent}%` },
    { id: 'mem', header: 'Memory', cell: (h) => `${h.memPercent}%` },
    { id: 'vms', header: 'VMs', cell: (h) => String(h.vmCount) },
    { id: 'jails', header: 'Jails', cell: (h) => String(h.jailCount) },
    { id: 'uptime', header: 'Uptime', cell: (h) => formatUptime(h.uptimeSec) },
    { id: 'ver', header: 'Version', cell: (h) => h.version },
  ];

  readonly track = (h: HostSummary) => h.id;

  openDetail(h: HostSummary): void {
    void this.router.navigate(['/hosts', h.id]);
  }

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    try {
      const status =
        this.statusFilter() === 'all' ? undefined : [this.statusFilter()];
      const res = await this.api.list({ search: this.query(), status });
      this.rows.set(res.items);
      const s = res.batch.stats;
      this.footer.set(
        `${res.batch.shown} hosts · ${s.online} online · ${s.draining} draining · ${s.offline} offline`,
      );
    } finally {
      this.loading.set(false);
    }
  }
}
