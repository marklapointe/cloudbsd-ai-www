import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import {
  ScopeBuilderComponent,
  ScopeDocument,
} from '../../shared/scope-builder/scope-builder.component';
import { VmsApi } from '../../core/api/vms.api';
import { ResourcesApi } from '../../core/api/resources.api';
import { ToastService } from '../../core/toast/toast.service';

@Component({
  selector: 'app-api-key-create-page',
  standalone: true,
  imports: [PageHeaderComponent, ScopeBuilderComponent, FormsModule],
  template: `
    <app-page-header
      title="Create API key"
      subtitle="Service / CI key — scopes required (Rules #10 / #11)"
    />

    <div class="max-w-2xl space-y-4">
      <div class="rounded-shell border border-slate-200 bg-white p-4">
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block text-xs font-medium text-slate-700">
            Name
            <input
              class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
              [(ngModel)]="name"
              name="name"
              placeholder="terraform-ci"
            />
          </label>
          <label class="block text-xs font-medium text-slate-700">
            Principal
            <input
              class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
              [(ngModel)]="principal"
              name="principal"
              placeholder="ci-bot"
            />
          </label>
          <label class="block text-xs font-medium text-slate-700">
            Expires
            <select
              class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
              [(ngModel)]="expires"
              name="expires"
            >
              <option value="90d">90 days</option>
              <option value="1y">1 year</option>
              <option value="never">Never</option>
            </select>
          </label>
        </div>
      </div>

      <div class="rounded-shell border border-slate-200 bg-white p-4">
        <h2 class="m-0 mb-3 text-sm font-semibold text-slate-900">Scope document</h2>
        <app-scope-builder
          [inventory]="inventory()"
          [(scope)]="scope"
        />
      </div>

      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium"
          (click)="router.navigateByUrl('/api-keys')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          [disabled]="!valid() || busy()"
          (click)="submit()"
        >
          {{ busy() ? 'Creating…' : 'Create key' }}
        </button>
      </div>
    </div>
  `,
})
export class ApiKeyCreatePage implements OnInit {
  readonly router = inject(Router);
  private readonly vms = inject(VmsApi);
  private readonly api = inject(ResourcesApi);
  private readonly toast = inject(ToastService);

  name = '';
  principal = '';
  expires = '90d';
  readonly scope = signal<ScopeDocument>({
    resourceTypes: ['vm'],
    actions: ['list', 'read'],
    domain: { kind: 'all', values: [] },
  });
  readonly inventory = signal<{ id: string; name: string }[]>([]);
  readonly busy = signal(false);

  readonly valid = computed(() => {
    const s = this.scope();
    return (
      this.name.trim().length >= 2 &&
      this.principal.trim().length >= 2 &&
      s.resourceTypes.length > 0 &&
      s.actions.length > 0 &&
      (s.domain.kind === 'all' ||
        s.domain.values.length > 0 ||
        (s.domain.kind === 'pattern' && !!s.domain.values[0]))
    );
  });

  ngOnInit(): void {
    void this.loadInventory();
  }

  private async loadInventory(): Promise<void> {
    try {
      const res = await this.vms.list();
      this.inventory.set(res.items.map((v) => ({ id: v.id, name: v.name })));
    } catch {
      this.inventory.set([]);
    }
  }

  async submit(): Promise<void> {
    if (!this.valid()) return;
    this.busy.set(true);
    try {
      const res = await this.api.create('apikey.create', 'api_key_create', {
        name: this.name.trim(),
        principal: this.principal.trim(),
        expires: this.expires,
        scope: this.scope(),
      });
      this.toast.success(
        'API key created',
        `Secret shown once in real backend · id ${res.id}`,
      );
      await this.router.navigateByUrl('/api-keys');
    } catch (e) {
      this.toast.error('Create failed', e instanceof Error ? e.message : 'Unknown');
    } finally {
      this.busy.set(false);
    }
  }
}
