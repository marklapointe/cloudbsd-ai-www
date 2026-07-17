import { Component, signal } from '@angular/core';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import {
  ResourceColumn,
  ResourceTableComponent,
} from '../../shared/resource-table/resource-table.component';
import { FilterBarComponent } from '../../shared/filter-bar/filter-bar.component';

interface AuditRow {
  id: string;
  ts: string;
  actor: string;
  action: string;
  target: string;
  result: 'ok' | 'denied' | 'error';
  where: string;
}

@Component({
  selector: 'app-audit-page',
  standalone: true,
  imports: [PageHeaderComponent, ResourceTableComponent, FilterBarComponent],
  template: `
    <app-page-header title="Audit" subtitle="Compliance trail (Observe)" />
    <app-filter-bar placeholder="Filter audit…" [(query)]="query" (queryChange)="apply()" />
    <app-resource-table
      [columns]="columns"
      [rows]="rows()"
      [trackBy]="track"
      emptyTitle="No audit events"
    />
  `,
})
export class AuditPage {
  readonly query = signal('');
  private readonly all: AuditRow[] = [
    {
      id: 'a1',
      ts: new Date(Date.now() - 600_000).toISOString(),
      actor: 'admin',
      action: 'vm.stop',
      target: 'vm-nextcloud',
      result: 'ok',
      where: 'vms_view',
    },
    {
      id: 'a2',
      ts: new Date(Date.now() - 3600_000).toISOString(),
      actor: 'operator',
      action: 'vm.migrate',
      target: 'vm-jellyfin',
      result: 'denied',
      where: 'vm_detail',
    },
    {
      id: 'a3',
      ts: new Date(Date.now() - 7200_000).toISOString(),
      actor: 'admin',
      action: 'auth.login',
      target: 'session',
      result: 'ok',
      where: 'login_form',
    },
  ];
  readonly rows = signal<AuditRow[]>(this.all);

  readonly columns: ResourceColumn<AuditRow>[] = [
    { id: 'result', header: 'Result', badge: true, cell: (r) => r.result },
    {
      id: 'ts',
      header: 'When',
      cell: (r) => new Date(r.ts).toLocaleString(),
    },
    { id: 'actor', header: 'Who', cell: (r) => r.actor },
    { id: 'action', header: 'What', cell: (r) => r.action },
    { id: 'target', header: 'Target', cell: (r) => r.target },
    { id: 'where', header: 'Where', cell: (r) => r.where },
  ];

  readonly track = (r: AuditRow) => r.id;

  apply(): void {
    const q = this.query().toLowerCase();
    this.rows.set(
      this.all.filter(
        (r) =>
          !q ||
          r.actor.includes(q) ||
          r.action.includes(q) ||
          r.target.includes(q),
      ),
    );
  }
}
