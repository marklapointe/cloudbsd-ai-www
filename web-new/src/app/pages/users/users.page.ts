import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import {
  ResourceColumn,
  ResourceTableComponent,
} from '../../shared/resource-table/resource-table.component';
import { FilterBarComponent } from '../../shared/filter-bar/filter-bar.component';
import { UserSummary, UsersApi } from '../../core/api/users.api';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [PageHeaderComponent, ResourceTableComponent, FilterBarComponent, RouterLink],
  template: `
    <app-page-header
      title="Users"
      subtitle="Control-plane identities (not OS accounts)"
    >
      <a
        routerLink="/roles/capabilities"
        class="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 no-underline hover:bg-slate-50"
      >
        Capability catalog
      </a>
      <button
        type="button"
        class="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        (click)="tab.set('roles')"
      >
        Roles
      </button>
      <button
        type="button"
        class="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
      >
        Create user
      </button>
    </app-page-header>

    <div class="mb-3 flex gap-1 border-b border-slate-200">
      <button
        type="button"
        class="-mb-px border-b-2 px-3 py-2 text-xs font-medium"
        [class.border-brand-500]="tab() === 'users'"
        [class.text-brand-600]="tab() === 'users'"
        [class.border-transparent]="tab() !== 'users'"
        [class.text-slate-500]="tab() !== 'users'"
        (click)="tab.set('users')"
      >
        Users
      </button>
      <button
        type="button"
        class="-mb-px border-b-2 px-3 py-2 text-xs font-medium"
        [class.border-brand-500]="tab() === 'roles'"
        [class.text-brand-600]="tab() === 'roles'"
        [class.border-transparent]="tab() !== 'roles'"
        [class.text-slate-500]="tab() !== 'roles'"
        (click)="tab.set('roles')"
      >
        Roles
      </button>
    </div>

    @if (tab() === 'roles') {
      <div class="rounded-shell border border-slate-200 bg-white p-4 text-xs text-slate-600">
        <p class="m-0 font-medium text-slate-800">v1 roles as sub-tabs</p>
        <ul class="mt-2 list-disc pl-5">
          <li><strong>admin</strong> — full control plane</li>
          <li><strong>operator</strong> — manage workloads; no user admin</li>
          <li><strong>viewer</strong> — auditor / view-only role (not product default)</li>
        </ul>
        <p class="mt-2 text-slate-500">
          Capabilities use selectable catalogs only (Rule #11) — no freeform capability text.
        </p>
      </div>
    } @else {
      <app-filter-bar
        placeholder="Filter users…"
        [(query)]="query"
        (queryChange)="reload()"
      />
      @if (loading()) {
        <div
          class="rounded-shell border border-slate-200 bg-white p-8 text-center text-sm text-slate-500"
        >
          Loading users…
        </div>
      } @else {
        <app-resource-table
          [columns]="columns"
          [rows]="rows()"
          [trackBy]="track"
          emptyTitle="No users"
        />
      }
    }
  `,
})
export class UsersPage implements OnInit {
  private readonly api = inject(UsersApi);

  readonly tab = signal<'users' | 'roles'>('users');
  readonly query = signal('');
  readonly rows = signal<UserSummary[]>([]);
  readonly loading = signal(true);

  readonly columns: ResourceColumn<UserSummary>[] = [
    { id: 'status', header: 'Status', badge: true, cell: (u) => u.status },
    { id: 'username', header: 'Username', cell: (u) => u.username },
    { id: 'display', header: 'Display name', cell: (u) => u.displayName },
    { id: 'role', header: 'Role', cell: (u) => u.role },
    { id: 'mfa', header: 'MFA', cell: (u) => (u.mfa ? 'yes' : 'no') },
    {
      id: 'login',
      header: 'Last login',
      cell: (u) => (u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '—'),
    },
  ];

  readonly track = (u: UserSummary) => u.id;

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    try {
      this.rows.set(await this.api.list(this.query()));
    } finally {
      this.loading.set(false);
    }
  }
}
