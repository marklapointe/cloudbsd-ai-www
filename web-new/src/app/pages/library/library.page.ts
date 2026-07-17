import { Component, OnInit, inject, signal } from '@angular/core';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import {
  ResourceColumn,
  ResourceTableComponent,
} from '../../shared/resource-table/resource-table.component';
import { BaseJail, LibraryApi, Repository } from '../../core/api/library.api';
import { formatBytes } from '../../core/protocol/resource.types';

@Component({
  selector: 'app-library-page',
  standalone: true,
  imports: [PageHeaderComponent, ResourceTableComponent],
  template: `
    <app-page-header
      title="Library"
      subtitle="Base jails (cached) + HTTPS repositories — jail create selects cached bases only (Rule #12)"
    />

    <div class="mb-3 flex gap-1 border-b border-slate-200">
      <button
        type="button"
        class="-mb-px border-b-2 px-3 py-2 text-xs font-medium"
        [class.border-brand-500]="tab() === 'bases'"
        [class.text-brand-600]="tab() === 'bases'"
        [class.border-transparent]="tab() !== 'bases'"
        [class.text-slate-500]="tab() !== 'bases'"
        (click)="tab.set('bases')"
      >
        Base jails
      </button>
      <button
        type="button"
        class="-mb-px border-b-2 px-3 py-2 text-xs font-medium"
        [class.border-brand-500]="tab() === 'repos'"
        [class.text-brand-600]="tab() === 'repos'"
        [class.border-transparent]="tab() !== 'repos'"
        [class.text-slate-500]="tab() !== 'repos'"
        (click)="tab.set('repos')"
      >
        Repositories
      </button>
    </div>

    @if (loading()) {
      <div class="rounded-shell border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading library…
      </div>
    } @else if (tab() === 'bases') {
      <app-resource-table
        [columns]="baseCols"
        [rows]="bases()"
        [trackBy]="trackBase"
        emptyTitle="No cached bases"
        emptyDescription="Fetch a base from a configured repository (no freeform URL)."
      />
    } @else {
      <app-resource-table
        [columns]="repoCols"
        [rows]="repos()"
        [trackBy]="trackRepo"
        emptyTitle="No repositories"
        emptyDescription="Add an HTTPS repo with auth: none / basic / bearer / header / mTLS."
      />
    }
  `,
})
export class LibraryPage implements OnInit {
  private readonly api = inject(LibraryApi);

  readonly tab = signal<'bases' | 'repos'>('bases');
  readonly loading = signal(true);
  readonly bases = signal<BaseJail[]>([]);
  readonly repos = signal<Repository[]>([]);

  readonly baseCols: ResourceColumn<BaseJail>[] = [
    { id: 'name', header: 'Name', cell: (b) => b.name },
    { id: 'ver', header: 'Version', cell: (b) => b.version },
    { id: 'arch', header: 'Arch', cell: (b) => b.arch },
    { id: 'size', header: 'Size', cell: (b) => formatBytes(b.sizeBytes) },
    { id: 'repo', header: 'Source', cell: (b) => b.sourceRepo },
    {
      id: 'cached',
      header: 'Cached',
      cell: (b) => new Date(b.cachedAt).toLocaleDateString(),
    },
  ];

  readonly repoCols: ResourceColumn<Repository>[] = [
    { id: 'status', header: 'Status', badge: true, cell: (r) => r.status },
    { id: 'name', header: 'Name', cell: (r) => r.name },
    { id: 'url', header: 'URL', cell: (r) => r.url },
    { id: 'auth', header: 'Auth', cell: (r) => r.auth },
  ];

  readonly trackBase = (b: BaseJail) => b.id;
  readonly trackRepo = (r: Repository) => r.id;

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [bases, repos] = await Promise.all([
        this.api.listBases(),
        this.api.listRepos(),
      ]);
      this.bases.set(bases);
      this.repos.set(repos);
    } finally {
      this.loading.set(false);
    }
  }
}
