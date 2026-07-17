import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import {
  ScopeBuilderComponent,
  ScopeDocument,
} from '../../shared/scope-builder/scope-builder.component';
import {
  ResourceColumn,
  ResourceTableComponent,
} from '../../shared/resource-table/resource-table.component';
import { AuthService } from '../../core/auth/auth.service';
import { DensityService, Density } from '../../core/density/density.service';
import { VmsApi } from '../../core/api/vms.api';
import { ResourcesApi } from '../../core/api/resources.api';
import { ToastService } from '../../core/toast/toast.service';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'tokens', label: 'API tokens' },
] as const;

interface PersonalToken {
  id: string;
  name: string;
  scopes: string;
  created: string;
  expires: string;
  status: 'active' | 'revoked';
}

/** My Account — personal only (Rule #9 / #10). */
@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    FormsModule,
    ScopeBuilderComponent,
    ResourceTableComponent,
  ],
  template: `
    <app-page-header title="My Account" subtitle="Profile, security, appearance, personal tokens" />

    <div class="mb-3 flex flex-wrap gap-1 border-b border-slate-200">
      @for (t of tabs; track t.id) {
        <button
          type="button"
          class="-mb-px border-b-2 px-3 py-2 text-xs font-medium"
          [class.border-brand-500]="tab() === t.id"
          [class.text-brand-600]="tab() === t.id"
          [class.border-transparent]="tab() !== t.id"
          [class.text-slate-500]="tab() !== t.id"
          (click)="tab.set(t.id)"
        >
          {{ t.label }}
        </button>
      }
    </div>

    @switch (tab()) {
      @case ('profile') {
        <div class="max-w-lg rounded-shell border border-slate-200 bg-white p-4 text-xs text-slate-700">
          <dl class="space-y-2">
            <div class="flex justify-between">
              <dt class="text-slate-500">Username</dt>
              <dd class="font-medium">{{ auth.user()?.username }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500">Display name</dt>
              <dd class="font-medium">{{ auth.user()?.displayName }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500">Role</dt>
              <dd class="font-medium">{{ auth.user()?.role }}</dd>
            </div>
          </dl>
        </div>
      }
      @case ('security') {
        <div class="max-w-lg space-y-3 rounded-shell border border-slate-200 bg-white p-4 text-xs">
          <p class="m-0 text-slate-600">
            2FA / Passkey enrollment lives here — never in Admin Settings (Rule #9).
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-md border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50"
              (click)="toast.info('Passkey', 'Enrollment flow wires to backend PAM later')"
            >
              Add passkey
            </button>
            <button
              type="button"
              class="rounded-md border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50"
              (click)="toast.info('TOTP', 'QR enrollment via backend')"
            >
              Enable TOTP
            </button>
            <button
              type="button"
              class="rounded-md border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50"
              (click)="toast.info('Recovery codes', 'Generated server-side once')"
            >
              Recovery codes
            </button>
          </div>
        </div>
      }
      @case ('appearance') {
        <div class="max-w-lg rounded-shell border border-slate-200 bg-white p-4 text-xs">
          <label class="block font-medium text-slate-700">
            Density
            <select
              class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5"
              [value]="density.density()"
              (change)="onDensity($event)"
            >
              <option value="cozy">Cozy</option>
              <option value="compact">Compact</option>
              <option value="extra">Extra compact</option>
            </select>
          </label>
        </div>
      }
      @case ('tokens') {
        <div class="space-y-4">
          <p class="m-0 text-xs text-slate-500">
            Personal access tokens use the same scope model as service keys (Rule #10). Service/CI
            keys live under Access → API keys.
          </p>

          <app-resource-table
            [columns]="tokenCols"
            [rows]="tokens()"
            [trackBy]="trackToken"
            emptyTitle="No personal tokens"
            emptyDescription="Create a scoped token for automation under your identity."
          />

          <div class="rounded-shell border border-slate-200 bg-white p-4">
            <h2 class="m-0 text-sm font-semibold text-slate-900">Create personal token</h2>
            <div class="mt-3 grid max-w-xl gap-3 sm:grid-cols-2">
              <label class="block text-xs font-medium text-slate-700">
                Name
                <input
                  class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  [(ngModel)]="tokenName"
                  name="tokenName"
                  placeholder="laptop-cli"
                />
              </label>
              <label class="block text-xs font-medium text-slate-700">
                Expires
                <select
                  class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  [(ngModel)]="tokenExpires"
                  name="tokenExpires"
                >
                  <option value="30d">30 days</option>
                  <option value="90d">90 days</option>
                  <option value="1y">1 year</option>
                </select>
              </label>
            </div>
            <div class="mt-4">
              <app-scope-builder [inventory]="inventory()" [(scope)]="scope" />
            </div>
            <div class="mt-3 flex justify-end">
              <button
                type="button"
                class="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                [disabled]="!canCreateToken() || busy()"
                (click)="createToken()"
              >
                {{ busy() ? 'Creating…' : 'Create token' }}
              </button>
            </div>
          </div>
        </div>
      }
    }
  `,
})
export class AccountPage implements OnInit {
  readonly auth = inject(AuthService);
  readonly density = inject(DensityService);
  readonly toast = inject(ToastService);
  private readonly vms = inject(VmsApi);
  private readonly api = inject(ResourcesApi);

  readonly tabs = TABS;
  readonly tab = signal<(typeof TABS)[number]['id']>('profile');
  readonly tokens = signal<PersonalToken[]>([
    {
      id: 'pt-1',
      name: 'homelab-scripts',
      scopes: 'vm:list,read × all',
      created: '2026-06-01',
      expires: '2026-12-01',
      status: 'active',
    },
  ]);
  readonly inventory = signal<{ id: string; name: string }[]>([]);
  readonly scope = signal<ScopeDocument>({
    resourceTypes: ['vm'],
    actions: ['list', 'read'],
    domain: { kind: 'all', values: [] },
  });
  readonly busy = signal(false);

  tokenName = '';
  tokenExpires = '90d';

  readonly tokenCols: ResourceColumn<PersonalToken>[] = [
    { id: 'status', header: 'Status', badge: true, cell: (t) => t.status },
    { id: 'name', header: 'Name', cell: (t) => t.name },
    { id: 'scopes', header: 'Scopes', cell: (t) => t.scopes },
    { id: 'exp', header: 'Expires', cell: (t) => t.expires },
  ];
  readonly trackToken = (t: PersonalToken) => t.id;

  readonly canCreateToken = computed(() => {
    const s = this.scope();
    return (
      this.tokenName.trim().length >= 2 &&
      s.resourceTypes.length > 0 &&
      s.actions.length > 0
    );
  });

  ngOnInit(): void {
    void this.vms.list().then((r) => {
      this.inventory.set(r.items.map((v) => ({ id: v.id, name: v.name })));
    }).catch(() => undefined);
  }

  onDensity(event: Event): void {
    const v = (event.target as HTMLSelectElement).value as Density;
    this.density.set(v);
  }

  async createToken(): Promise<void> {
    if (!this.canCreateToken()) return;
    this.busy.set(true);
    try {
      const s = this.scope();
      const res = await this.api.create('token.create', 'account_tokens', {
        name: this.tokenName.trim(),
        expires: this.tokenExpires,
        scope: s,
        personal: true,
      });
      const summary = `${s.resourceTypes.join(',')}:${s.actions.join(',')} × ${s.domain.kind}`;
      this.tokens.update((list) => [
        {
          id: res.id,
          name: this.tokenName.trim(),
          scopes: summary,
          created: new Date().toISOString().slice(0, 10),
          expires: this.tokenExpires,
          status: 'active',
        },
        ...list,
      ]);
      this.toast.success('Token created', 'Secret shown once on real backend');
      this.tokenName = '';
    } catch (e) {
      this.toast.error('Create failed', e instanceof Error ? e.message : 'Unknown');
    } finally {
      this.busy.set(false);
    }
  }
}
