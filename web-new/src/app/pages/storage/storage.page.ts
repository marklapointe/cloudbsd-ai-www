import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import {
  ResourceColumn,
  ResourceTableComponent,
} from '../../shared/resource-table/resource-table.component';
import { FilterBarComponent } from '../../shared/filter-bar/filter-bar.component';
import { StorageApi } from '../../core/api/storage.api';
import { VolumeSummary, formatBytes } from '../../core/protocol/resource.types';

@Component({
  selector: 'app-storage-page',
  standalone: true,
  imports: [PageHeaderComponent, ResourceTableComponent, FilterBarComponent, RouterLink],
  template: `
    <app-page-header title="Storage" subtitle="ZFS volumes and pools">
      <a
        routerLink="/storage/create"
        class="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-brand-600"
      >
        Create volume
      </a>
    </app-page-header>

    <app-filter-bar
      placeholder="Filter datasets…"
      [(query)]="query"
      (queryChange)="reload()"
    />

    @if (loading()) {
      <div class="rounded-shell border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading storage…
      </div>
    } @else {
      <app-resource-table
        [columns]="columns"
        [rows]="rows()"
        [trackBy]="track"
        emptyTitle="No volumes"
        emptyDescription="No ZFS datasets reported."
        [footer]="footer()"
        (rowClick)="openDetail($event)"
      />
    }
  `,
})
export class StoragePage implements OnInit {
  private readonly api = inject(StorageApi);
  private readonly router = inject(Router);

  readonly query = signal('');
  readonly rows = signal<VolumeSummary[]>([]);
  readonly loading = signal(true);
  readonly footer = signal('');

  readonly columns: ResourceColumn<VolumeSummary>[] = [
    {
      id: 'health',
      header: 'Health',
      badge: true,
      cell: (v) => v.health,
    },
    { id: 'name', header: 'Dataset', cell: (v) => v.name },
    { id: 'type', header: 'Type', cell: (v) => v.type },
    {
      id: 'used',
      header: 'Used',
      cell: (v) => `${formatBytes(v.usedBytes)} (${v.usagePercent}%)`,
    },
    { id: 'size', header: 'Size', cell: (v) => formatBytes(v.sizeBytes) },
    { id: 'mount', header: 'Mount', cell: (v) => v.mountpoint },
    { id: 'comp', header: 'Compression', cell: (v) => v.compression },
    { id: 'enc', header: 'Encryption', cell: (v) => v.encryption },
  ];

  readonly track = (v: VolumeSummary) => v.id;

  openDetail(v: VolumeSummary): void {
    void this.router.navigate(['/storage', v.id]);
  }

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.api.list({ search: this.query() });
      this.rows.set(res.items);
      const s = res.batch.stats;
      this.footer.set(
        `${res.batch.shown} datasets · ${s.healthy} healthy · ${s.watch} watch · ${s.encrypted} encrypted`,
      );
    } finally {
      this.loading.set(false);
    }
  }
}
