import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import {
  ResourceColumn,
  ResourceTableComponent,
} from '../../shared/resource-table/resource-table.component';
import { FilterBarComponent } from '../../shared/filter-bar/filter-bar.component';
import { NetworkSummary, NetworksApi } from '../../core/api/networks.api';

@Component({
  selector: 'app-networks-page',
  standalone: true,
  imports: [PageHeaderComponent, ResourceTableComponent, FilterBarComponent, RouterLink],
  template: `
    <app-page-header title="Networks" subtitle="Inventory + IP pools (map is a view mode)">
      <div class="flex gap-1 rounded-md border border-slate-200 p-0.5 text-[11px]">
        <button
          type="button"
          class="rounded px-2 py-1 font-medium"
          [class.bg-brand-50]="view() === 'list'"
          [class.text-brand-600]="view() === 'list'"
          (click)="view.set('list')"
        >
          List
        </button>
        <button
          type="button"
          class="rounded px-2 py-1 font-medium"
          [class.bg-brand-50]="view() === 'map'"
          [class.text-brand-600]="view() === 'map'"
          (click)="view.set('map')"
        >
          Map
        </button>
      </div>
      <a
        routerLink="/networks/create"
        class="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-brand-600"
      >
        Create network
      </a>
    </app-page-header>

    <app-filter-bar placeholder="Filter networks…" [(query)]="query" (queryChange)="reload()" />

    @if (loading()) {
      <div class="rounded-shell border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading networks…
      </div>
    } @else if (view() === 'map') {
      <div
        class="flex h-72 items-center justify-center rounded-shell border border-dashed border-slate-200 bg-white text-sm text-slate-500"
      >
        Network map view — topology from envelope later
      </div>
    } @else {
      <app-resource-table
        [columns]="columns"
        [rows]="rows()"
        [trackBy]="track"
        emptyTitle="No networks"
        [footer]="footer()"
      />
    }
  `,
})
export class NetworksPage implements OnInit {
  private readonly api = inject(NetworksApi);

  readonly query = signal('');
  readonly view = signal<'list' | 'map'>('list');
  readonly rows = signal<NetworkSummary[]>([]);
  readonly loading = signal(true);
  readonly footer = signal('');

  readonly columns: ResourceColumn<NetworkSummary>[] = [
    { id: 'status', header: 'Status', badge: true, cell: (n) => n.status },
    { id: 'name', header: 'Name', cell: (n) => n.name },
    { id: 'type', header: 'Type', cell: (n) => n.type },
    { id: 'cidr', header: 'CIDR / range', cell: (n) => n.cidr },
    {
      id: 'vlan',
      header: 'VLAN',
      cell: (n) => (n.vlan != null ? String(n.vlan) : '—'),
    },
    { id: 'hosts', header: 'Hosts', cell: (n) => String(n.hosts) },
  ];

  readonly track = (n: NetworkSummary) => n.id;

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.api.list(this.query());
      this.rows.set(res.items);
      const s = res.batch.stats;
      this.footer.set(
        `${res.batch.shown} networks · ${s.up} up · ${s.pools} pools`,
      );
    } finally {
      this.loading.set(false);
    }
  }
}
