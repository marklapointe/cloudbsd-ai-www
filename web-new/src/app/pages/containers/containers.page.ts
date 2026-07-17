import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import {
  ResourceColumn,
  ResourceTableComponent,
} from '../../shared/resource-table/resource-table.component';
import { FilterBarComponent } from '../../shared/filter-bar/filter-bar.component';
import { ContainersApi } from '../../core/api/containers.api';
import {
  ContainerSummary,
  formatBytes,
  formatPowerStatus,
  formatUptime,
} from '../../core/protocol/resource.types';

@Component({
  selector: 'app-containers-page',
  standalone: true,
  imports: [PageHeaderComponent, ResourceTableComponent, FilterBarComponent, RouterLink],
  template: `
    <app-page-header title="Containers" subtitle="OCI workload inventory">
      <a
        routerLink="/containers/create"
        class="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-brand-600"
      >
        Create container
      </a>
    </app-page-header>

    <app-filter-bar
      placeholder="Filter by name…"
      [chips]="chips"
      [(query)]="query"
      [(activeChip)]="statusFilter"
      (queryChange)="reload()"
      (chipChange)="reload()"
    />

    @if (loading()) {
      <div class="rounded-shell border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading containers…
      </div>
    } @else {
      <app-resource-table
        [columns]="columns"
        [rows]="rows()"
        [trackBy]="track"
        emptyTitle="No containers"
        emptyDescription="Create a container or clear filters."
        [footer]="footer()"
        (rowClick)="openDetail($event)"
      />
    }
  `,
})
export class ContainersPage implements OnInit {
  private readonly api = inject(ContainersApi);
  private readonly router = inject(Router);

  readonly chips = [
    { id: 'all', label: 'all' },
    { id: 'running', label: 'running' },
    { id: 'exited', label: 'exited' },
    { id: 'paused', label: 'paused' },
  ];
  readonly query = signal('');
  readonly statusFilter = signal('all');
  readonly rows = signal<ContainerSummary[]>([]);
  readonly loading = signal(true);
  readonly footer = signal('');

  readonly columns: ResourceColumn<ContainerSummary>[] = [
    {
      id: 'status',
      header: 'Status',
      badge: true,
      cell: (c) => formatPowerStatus(c.status),
    },
    { id: 'name', header: 'Name', cell: (c) => c.name },
    { id: 'image', header: 'Image', cell: (c) => c.image },
    { id: 'host', header: 'Host', cell: (c) => c.host },
    {
      id: 'ports',
      header: 'Ports',
      cell: (c) =>
        c.ports.length
          ? c.ports.map((p) => `${p.host}→${p.container}/${p.protocol}`).join(', ')
          : '—',
    },
    { id: 'cpu', header: 'CPU', cell: (c) => `${c.cpuPercent}%` },
    { id: 'mem', header: 'Memory', cell: (c) => formatBytes(c.memBytes) },
    { id: 'uptime', header: 'Uptime', cell: (c) => formatUptime(c.uptimeSec) },
  ];

  readonly track = (c: ContainerSummary) => c.id;

  openDetail(c: ContainerSummary): void {
    void this.router.navigate(['/containers', c.id]);
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
        `${res.batch.shown} shown · ${s.running} running · ${s.exited} exited · ${s.paused} paused`,
      );
    } finally {
      this.loading.set(false);
    }
  }
}
