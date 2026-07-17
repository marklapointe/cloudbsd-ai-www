import { Component, OnInit, inject, signal } from '@angular/core';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import {
  ResourceColumn,
  ResourceTableComponent,
} from '../../shared/resource-table/resource-table.component';
import { FilterBarComponent } from '../../shared/filter-bar/filter-bar.component';
import { TasksApi } from '../../core/api/tasks.api';
import { TaskSummary } from '../../core/protocol/resource.types';

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [PageHeaderComponent, ResourceTableComponent, FilterBarComponent],
  template: `
    <app-page-header
      title="Tasks"
      subtitle="Global long-running operations"
    />

    <app-filter-bar
      placeholder="Filter tasks…"
      [chips]="chips"
      [(query)]="query"
      [(activeChip)]="statusFilter"
      (queryChange)="reload()"
      (chipChange)="reload()"
    />

    @if (loading()) {
      <div class="rounded-shell border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading tasks…
      </div>
    } @else {
      <app-resource-table
        [columns]="columns"
        [rows]="rows()"
        [trackBy]="track"
        emptyTitle="No tasks"
        emptyDescription="Long-running ops (migrate, scrub, backup) appear here."
        [footer]="footer()"
      />
    }
  `,
})
export class TasksPage implements OnInit {
  private readonly api = inject(TasksApi);

  readonly chips = [
    { id: 'all', label: 'all' },
    { id: 'running', label: 'running' },
    { id: 'queued', label: 'queued' },
    { id: 'failed', label: 'failed' },
    { id: 'succeeded', label: 'succeeded' },
  ];
  readonly query = signal('');
  readonly statusFilter = signal('all');
  readonly rows = signal<TaskSummary[]>([]);
  readonly loading = signal(true);
  readonly footer = signal('');

  readonly columns: ResourceColumn<TaskSummary>[] = [
    { id: 'status', header: 'Status', badge: true, cell: (t) => t.status },
    { id: 'name', header: 'Name', cell: (t) => t.name },
    { id: 'type', header: 'Type', cell: (t) => t.type },
    {
      id: 'progress',
      header: 'Progress',
      cell: (t) => `${t.progressPercent}%`,
    },
    { id: 'actor', header: 'Actor', cell: (t) => t.actor },
    {
      id: 'started',
      header: 'Started',
      cell: (t) => new Date(t.startedAt).toLocaleString(),
    },
    {
      id: 'finished',
      header: 'Finished',
      cell: (t) => (t.finishedAt ? new Date(t.finishedAt).toLocaleString() : '—'),
    },
  ];

  readonly track = (t: TaskSummary) => t.id;

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
        `${res.batch.shown} tasks · ${s.running} running · ${s.queued} queued · ${s.failed} failed`,
      );
    } finally {
      this.loading.set(false);
    }
  }
}
