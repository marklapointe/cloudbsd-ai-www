import { Component, computed, signal } from '@angular/core';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { RouterLink } from '@angular/router';

/** Selectable capability catalog only (Rule #11) — no freeform capability text. */
const CAPABILITY_CATALOG = [
  { id: 'vm.list', group: 'VM', label: 'List VMs' },
  { id: 'vm.read', group: 'VM', label: 'View VM detail' },
  { id: 'vm.power', group: 'VM', label: 'Power operations' },
  { id: 'vm.create', group: 'VM', label: 'Create VM' },
  { id: 'vm.delete', group: 'VM', label: 'Delete VM' },
  { id: 'vm.migrate', group: 'VM', label: 'Migrate VM' },
  { id: 'vm.console', group: 'VM', label: 'Console' },
  { id: 'jail.list', group: 'Jail', label: 'List jails' },
  { id: 'jail.create', group: 'Jail', label: 'Create jail' },
  { id: 'jail.power', group: 'Jail', label: 'Jail start/stop' },
  { id: 'container.list', group: 'Container', label: 'List containers' },
  { id: 'container.create', group: 'Container', label: 'Create container' },
  { id: 'volume.list', group: 'Storage', label: 'List volumes' },
  { id: 'volume.snapshot', group: 'Storage', label: 'Snapshots' },
  { id: 'host.list', group: 'Host', label: 'List hosts' },
  { id: 'host.drain', group: 'Host', label: 'Drain host' },
  { id: 'cluster.read', group: 'Cluster', label: 'View cluster' },
  { id: 'users.admin', group: 'Access', label: 'Manage users' },
  { id: 'apikeys.admin', group: 'Access', label: 'Manage API keys' },
  { id: 'audit.read', group: 'Observe', label: 'Read audit log' },
  { id: 'settings.admin', group: 'Configure', label: 'Edit settings' },
  { id: 'mcp.admin', group: 'Configure', label: 'Manage MCP' },
] as const;

interface RoleDef {
  id: string;
  name: string;
  description: string;
  capabilities: Set<string>;
}

@Component({
  selector: 'app-roles-capabilities-page',
  standalone: true,
  imports: [PageHeaderComponent, RouterLink],
  template: `
    <app-page-header
      title="Roles & capabilities"
      subtitle="Selectable catalogs only — no freeform capability text (Rule #11)"
    >
      <a routerLink="/users" class="text-xs text-brand-600 no-underline hover:underline">← Users</a>
    </app-page-header>

    <div class="flex flex-col gap-3 lg:flex-row">
      <nav class="w-full shrink-0 space-y-1 lg:w-44">
        @for (r of roles(); track r.id) {
          <button
            type="button"
            class="w-full rounded-md px-3 py-2 text-left text-xs"
            [class.bg-brand-50]="selectedId() === r.id"
            [class.font-semibold]="selectedId() === r.id"
            [class.text-brand-700]="selectedId() === r.id"
            (click)="selectedId.set(r.id)"
          >
            {{ r.name }}
          </button>
        }
      </nav>

      @if (selected(); as role) {
        <div class="min-w-0 flex-1 rounded-shell border border-slate-200 bg-white p-4">
          <h2 class="m-0 text-sm font-semibold text-slate-900">{{ role.name }}</h2>
          <p class="mt-1 text-xs text-slate-500">{{ role.description }}</p>

          @for (group of groups; track group) {
            <div class="mt-4">
              <div class="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {{ group }}
              </div>
              <div class="mt-2 flex flex-wrap gap-2">
                @for (cap of capsInGroup(group); track cap.id) {
                  <label
                    class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                    [class.border-brand-500]="role.capabilities.has(cap.id)"
                    [class.bg-brand-50]="role.capabilities.has(cap.id)"
                    [class.border-slate-200]="!role.capabilities.has(cap.id)"
                  >
                    <input
                      type="checkbox"
                      class="rounded border-slate-300"
                      [checked]="role.capabilities.has(cap.id)"
                      (change)="toggle(role.id, cap.id)"
                    />
                    {{ cap.label }}
                  </label>
                }
              </div>
            </div>
          }

          <p class="mt-4 text-[11px] text-slate-400">
            Changes are local until envelope roles.update is wired to the backend.
            Selected: {{ role.capabilities.size }} capabilities.
          </p>
        </div>
      }
    </div>
  `,
})
export class RolesCapabilitiesPage {
  readonly catalog = CAPABILITY_CATALOG;
  readonly groups = [...new Set(CAPABILITY_CATALOG.map((c) => c.group))];

  readonly roles = signal<RoleDef[]>([
    {
      id: 'admin',
      name: 'admin',
      description: 'Full control plane',
      capabilities: new Set(CAPABILITY_CATALOG.map((c) => c.id)),
    },
    {
      id: 'operator',
      name: 'operator',
      description: 'Manage workloads; no user admin',
      capabilities: new Set(
        CAPABILITY_CATALOG.filter((c) => !c.id.startsWith('users') && c.id !== 'settings.admin').map(
          (c) => c.id,
        ),
      ),
    },
    {
      id: 'viewer',
      name: 'viewer',
      description: 'Auditor / view-only role (not product default)',
      capabilities: new Set(
        CAPABILITY_CATALOG.filter((c) => c.id.endsWith('.list') || c.id.endsWith('.read') || c.id === 'audit.read').map(
          (c) => c.id,
        ),
      ),
    },
  ]);

  readonly selectedId = signal('admin');
  readonly selected = computed(() => this.roles().find((r) => r.id === this.selectedId()));

  capsInGroup(group: string) {
    return CAPABILITY_CATALOG.filter((c) => c.group === group);
  }

  toggle(roleId: string, capId: string): void {
    this.roles.update((list) =>
      list.map((r) => {
        if (r.id !== roleId) return r;
        const next = new Set(r.capabilities);
        if (next.has(capId)) next.delete(capId);
        else next.add(capId);
        return { ...r, capabilities: next };
      }),
    );
  }
}
