import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import {
  ResourceColumn,
  ResourceTableComponent,
} from '../../shared/resource-table/resource-table.component';

interface ApiKeyRow {
  id: string;
  name: string;
  principal: string;
  scopes: string;
  status: 'active' | 'revoked';
  expires: string;
}

/** Access → API keys — always scoped (Rule #10 / #11). */
@Component({
  selector: 'app-api-keys-page',
  standalone: true,
  imports: [PageHeaderComponent, ResourceTableComponent, RouterLink],
  template: `
    <app-page-header
      title="API keys"
      subtitle="Service / CI keys — always scoped; selectable catalogs only"
    >
      <a
        routerLink="/api-keys/create"
        class="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-brand-600"
      >
        Create key
      </a>
    </app-page-header>

    <p class="mb-3 text-xs text-slate-500">
      Personal tokens live under My Account. Service keys cannot exceed the creator’s grants.
    </p>

    <app-resource-table
      [columns]="columns"
      [rows]="rows()"
      [trackBy]="track"
      emptyTitle="No API keys"
    />
  `,
})
export class ApiKeysPage {
  readonly rows = signal<ApiKeyRow[]>([
    {
      id: 'k1',
      name: 'terraform-ci',
      principal: 'ci-bot',
      scopes: 'vm:list,read · jail:list · tag:prod',
      status: 'active',
      expires: '2027-01-01',
    },
    {
      id: 'k2',
      name: 'backup-agent',
      principal: 'backup-svc',
      scopes: 'volume:snapshot.create · host:list',
      status: 'active',
      expires: 'never',
    },
  ]);

  readonly columns: ResourceColumn<ApiKeyRow>[] = [
    { id: 'status', header: 'Status', badge: true, cell: (k) => k.status },
    { id: 'name', header: 'Name', cell: (k) => k.name },
    { id: 'principal', header: 'Principal', cell: (k) => k.principal },
    { id: 'scopes', header: 'Scopes', cell: (k) => k.scopes },
    { id: 'exp', header: 'Expires', cell: (k) => k.expires },
  ];

  readonly track = (k: ApiKeyRow) => k.id;
}
