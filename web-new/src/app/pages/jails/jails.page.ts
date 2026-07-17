import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import {
  ResourceColumn,
  ResourceTableComponent,
} from '../../shared/resource-table/resource-table.component';
import { FilterBarComponent } from '../../shared/filter-bar/filter-bar.component';
import { JailsApi } from '../../core/api/jails.api';
import {
  JailSummary,
  bytesToGiB,
  formatPowerStatus,
  formatUptime,
} from '../../core/protocol/resource.types';

@Component({
  selector: 'app-jails-page',
  standalone: true,
  imports: [PageHeaderComponent, ResourceTableComponent, FilterBarComponent, RouterLink],
  template: `
    <app-page-header title="Jails" subtitle="FreeBSD jail inventory">
      <a
        routerLink="/jails/create"
        class="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-brand-600"
      >
        Create jail
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
        Loading jails…
      </div>
    } @else {
      <app-resource-table
        [columns]="columns"
        [rows]="rows()"
        [trackBy]="track"
        emptyTitle="No jails"
        emptyDescription="Select a cached base from Library when creating a jail (Rule #12)."
        [footer]="footer()"
        (rowClick)="openDetail($event)"
      />
    }
  `,
})
export class JailsPage implements OnInit {
  private readonly api = inject(JailsApi);
  private readonly router = inject(Router);

  readonly chips = [
    { id: 'all', label: 'all' },
    { id: 'running', label: 'running' },
    { id: 'stopped', label: 'stopped' },
    { id: 'frozen', label: 'frozen' },
  ];
  readonly query = signal('');
  readonly statusFilter = signal('all');
  readonly rows = signal<JailSummary[]>([]);
  readonly loading = signal(true);
  readonly footer = signal('');

  readonly columns: ResourceColumn<JailSummary>[] = [
    {
      id: 'status',
      header: 'Status',
      badge: true,
      cell: (j) => formatPowerStatus(j.status),
    },
    { id: 'name', header: 'Name', cell: (j) => j.name },
    { id: 'hostname', header: 'Hostname', cell: (j) => j.hostname },
    { id: 'ip', header: 'IP', cell: (j) => j.ip },
    { id: 'host', header: 'Host', cell: (j) => j.host },
    { id: 'os', header: 'OS', cell: (j) => j.os },
    { id: 'vcpu', header: 'vCPUs', cell: (j) => String(j.vcpus) },
    { id: 'mem', header: 'Memory', cell: (j) => `${bytesToGiB(j.ramBytes)} GiB` },
    { id: 'jid', header: 'JID', cell: (j) => String(j.jailId) },
    { id: 'uptime', header: 'Uptime', cell: (j) => formatUptime(j.uptimeSec) },
  ];

  readonly track = (j: JailSummary) => j.id;

  openDetail(j: JailSummary): void {
    void this.router.navigate(['/jails', j.id]);
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
        `${res.batch.shown} shown · ${s.running} running · ${s.stopped} stopped · ${s.frozen} frozen`,
      );
    } finally {
      this.loading.set(false);
    }
  }
}
