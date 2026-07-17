import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DetailShellComponent } from '../../shared/detail-shell/detail-shell.component';
import { ConfirmActionModalComponent } from '../../shared/confirm-action-modal/confirm-action-modal.component';
import {
  CapabilityAction,
  CapabilityActionMenuComponent,
} from '../../shared/capability-action-menu/capability-action-menu.component';
import { VmsApi, VmDetail } from '../../core/api/vms.api';
import { PreflightService } from '../../core/protocol/preflight.service';
import { PreflightResult } from '../../core/protocol/preflight.types';
import { ToastService } from '../../core/toast/toast.service';
import {
  bytesToGiB,
  formatBytes,
  formatPowerStatus,
  formatUptime,
} from '../../core/protocol/resource.types';

@Component({
  selector: 'app-vm-detail-page',
  standalone: true,
  imports: [
    DetailShellComponent,
    ConfirmActionModalComponent,
    CapabilityActionMenuComponent,
    RouterLink,
    DatePipe,
  ],
  template: `
    @if (loading()) {
      <div class="rounded-shell border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading VM…
      </div>
    } @else if (error()) {
      <div class="rounded-shell border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {{ error() }}
        <a routerLink="/vms" class="ml-2 text-brand-600">Back to VMs</a>
      </div>
    } @else if (detail(); as d) {
      <app-detail-shell
        [title]="d.vm.name"
        [subtitle]="d.vm.host + ' · ' + d.vm.os"
        [badge]="formatStatus(d.vm.status)"
        [badgeClass]="statusClass(d.vm.status)"
        backLink="/vms"
        backLabel="Virtual Machines"
        [tabs]="tabs"
        [(activeTab)]="activeTab"
      >
        <div actions>
          <app-capability-action-menu
            [actions]="actionsFor(d)"
            (actionSelect)="onAction(d, $event)"
          />
        </div>

        @switch (activeTab()) {
          @case ('overview') {
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <div class="rounded-shell border border-slate-200 bg-white p-4 text-xs">
                <div class="text-[11px] font-medium uppercase text-slate-400">Compute</div>
                <dl class="mt-2 space-y-1 text-slate-700">
                  <div class="flex justify-between">
                    <dt>vCPUs</dt>
                    <dd class="font-medium">{{ d.vm.vcpu }}</dd>
                  </div>
                  <div class="flex justify-between">
                    <dt>Memory</dt>
                    <dd class="font-medium">{{ bytesToGiB(d.vm.ramBytes) }} GiB</dd>
                  </div>
                  <div class="flex justify-between">
                    <dt>Uptime</dt>
                    <dd class="font-medium">{{ formatUptime(d.vm.uptimeSec) }}</dd>
                  </div>
                </dl>
              </div>
              <div class="rounded-shell border border-slate-200 bg-white p-4 text-xs">
                <div class="text-[11px] font-medium uppercase text-slate-400">Network</div>
                <dl class="mt-2 space-y-1 text-slate-700">
                  <div class="flex justify-between">
                    <dt>IP</dt>
                    <dd class="font-medium">{{ d.vm.ip }}</dd>
                  </div>
                  <div class="flex justify-between">
                    <dt>Host</dt>
                    <dd class="font-medium">{{ d.vm.host }}</dd>
                  </div>
                  <div class="flex justify-between">
                    <dt>Tags</dt>
                    <dd class="font-medium">{{ d.vm.tags.join(', ') || '—' }}</dd>
                  </div>
                </dl>
              </div>
              <div class="rounded-shell border border-slate-200 bg-white p-4 text-xs">
                <div class="text-[11px] font-medium uppercase text-slate-400">Storage</div>
                <dl class="mt-2 space-y-1 text-slate-700">
                  <div class="flex justify-between">
                    <dt>Disk</dt>
                    <dd class="font-medium">{{ formatBytes(d.vm.diskBytes) }}</dd>
                  </div>
                  <div class="flex justify-between">
                    <dt>Version</dt>
                    <dd class="font-medium">{{ d.vm.version || '—' }}</dd>
                  </div>
                </dl>
              </div>
            </div>
            @if (d.vm.description) {
              <p class="mt-3 text-xs text-slate-600">{{ d.vm.description }}</p>
            }
          }
          @case ('disks') {
            <div class="overflow-hidden rounded-shell border border-slate-200 bg-white">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-[11px] uppercase text-slate-500">
                  <tr>
                    <th class="px-3 py-2">Name</th>
                    <th class="px-3 py-2">Path</th>
                    <th class="px-3 py-2">Type</th>
                    <th class="px-3 py-2">Size</th>
                  </tr>
                </thead>
                <tbody>
                  @for (disk of d.disks; track disk.name) {
                    <tr class="border-t border-slate-100">
                      <td class="px-3 py-2 font-medium">{{ disk.name }}</td>
                      <td class="px-3 py-2 font-mono text-[11px]">{{ disk.path }}</td>
                      <td class="px-3 py-2">{{ disk.type }}</td>
                      <td class="px-3 py-2">{{ formatBytes(disk.sizeBytes) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          @case ('network') {
            <div class="overflow-hidden rounded-shell border border-slate-200 bg-white">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-[11px] uppercase text-slate-500">
                  <tr>
                    <th class="px-3 py-2">NIC</th>
                    <th class="px-3 py-2">Bridge</th>
                    <th class="px-3 py-2">MAC</th>
                    <th class="px-3 py-2">IP</th>
                  </tr>
                </thead>
                <tbody>
                  @for (nic of d.nics; track nic.name) {
                    <tr class="border-t border-slate-100">
                      <td class="px-3 py-2 font-medium">{{ nic.name }}</td>
                      <td class="px-3 py-2">{{ nic.bridge }}</td>
                      <td class="px-3 py-2 font-mono text-[11px]">{{ nic.mac }}</td>
                      <td class="px-3 py-2">{{ nic.ip }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          @case ('snapshots') {
            <div class="overflow-hidden rounded-shell border border-slate-200 bg-white">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-[11px] uppercase text-slate-500">
                  <tr>
                    <th class="px-3 py-2">Name</th>
                    <th class="px-3 py-2">Created</th>
                    <th class="px-3 py-2">Size</th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of d.snapshots; track s.id) {
                    <tr class="border-t border-slate-100">
                      <td class="px-3 py-2 font-medium">{{ s.name }}</td>
                      <td class="px-3 py-2">{{ s.createdAt | date: 'medium' }}</td>
                      <td class="px-3 py-2">{{ formatBytes(s.sizeBytes) }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="3" class="px-3 py-6 text-center text-slate-500">
                        No snapshots
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          @case ('console') {
            <div
              class="flex h-48 flex-col items-center justify-center gap-3 rounded-shell border border-dashed border-slate-200 bg-slate-900 text-sm text-slate-300"
            >
              <p class="m-0">noVNC through backend ticket (Rule #13)</p>
              <a
                [routerLink]="['/vms', d.vm.id, 'console']"
                class="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white no-underline"
              >
                Open console
              </a>
            </div>
          }
        }
      </app-detail-shell>
    }

    <app-confirm-action-modal
      [(open)]="confirmOpen"
      [title]="confirmTitle()"
      [description]="confirmDescription()"
      [confirmLabel]="confirmLabel()"
      [destructive]="confirmDestructive()"
      [preflight]="confirmPreflight()"
      [loadingPreflight]="confirmLoadingPf()"
      [confirmPhrase]="confirmPhrase()"
      (cancel)="closeConfirm()"
      (confirm)="executeConfirm($event)"
    />
  `,
})
export class VmDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(VmsApi);
  private readonly preflight = inject(PreflightService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly detail = signal<VmDetail | null>(null);
  readonly activeTab = signal('overview');

  readonly tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'disks', label: 'Disks' },
    { id: 'network', label: 'Network' },
    { id: 'snapshots', label: 'Snapshots' },
    { id: 'console', label: 'Console' },
  ];

  readonly confirmOpen = signal(false);
  readonly confirmTitle = signal('');
  readonly confirmDescription = signal('');
  readonly confirmLabel = signal('Confirm');
  readonly confirmDestructive = signal(false);
  readonly confirmPreflight = signal<PreflightResult | null>(null);
  readonly confirmLoadingPf = signal(false);
  readonly confirmPhrase = signal<string | null>(null);
  private pendingAction: string | null = null;

  // template helpers
  readonly bytesToGiB = bytesToGiB;
  readonly formatBytes = formatBytes;
  readonly formatUptime = formatUptime;
  readonly formatStatus = formatPowerStatus;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Missing VM id');
      this.loading.set(false);
      return;
    }
    void this.load(id);
  }

  statusClass(status: string): string {
    const s = status.toUpperCase();
    if (s === 'RUN') {
      return 'bg-emerald-50 text-emerald-700';
    }
    if (s === 'STOP') {
      return 'bg-slate-100 text-slate-600';
    }
    if (s === 'PAUSED') {
      return 'bg-amber-50 text-amber-700';
    }
    return 'bg-rose-50 text-rose-700';
  }

  actionsFor(d: VmDetail): CapabilityAction[] {
    const running = d.vm.status === 'RUN';
    return [
      { id: 'start', label: 'Start', visible: !running },
      { id: 'stop', label: 'Stop', visible: running, warning: d.vm.name === 'nextcloud' },
      { id: 'reboot', label: 'Reboot', visible: running },
      {
        id: 'migrate',
        label: 'Live migrate',
        visible: running && !d.vm.id.includes('jellyfin'),
      },
      {
        id: 'migrate',
        label: 'Live migrate',
        visible: running && d.vm.id.includes('jellyfin'),
        disabled: true,
      },
      { id: 'snapshot', label: 'Snapshot', visible: true },
      { id: 'delete', label: 'Delete', destructive: true },
    ];
  }

  async onAction(d: VmDetail, action: CapabilityAction): Promise<void> {
    if (action.disabled) {
      return;
    }
    this.pendingAction = action.id;
    this.confirmTitle.set(`${action.label} virtual machine`);
    this.confirmDescription.set(`${action.label} ${d.vm.name} on ${d.vm.host}?`);
    this.confirmLabel.set(action.label);
    this.confirmDestructive.set(!!action.destructive || action.id === 'stop' || action.id === 'delete');
    this.confirmPhrase.set(action.id === 'delete' ? d.vm.name : null);
    this.confirmPreflight.set(null);
    this.confirmOpen.set(true);
    this.confirmLoadingPf.set(true);
    try {
      const pf = await this.preflight.check('vm', d.vm.id, action.id, 'vm_detail');
      this.confirmPreflight.set(pf);
    } finally {
      this.confirmLoadingPf.set(false);
    }
  }

  closeConfirm(): void {
    this.confirmOpen.set(false);
    this.pendingAction = null;
    this.confirmPreflight.set(null);
  }

  async executeConfirm(ev: { reason: string }): Promise<void> {
    const d = this.detail();
    if (!d || !this.pendingAction) {
      return;
    }
    const pf = this.confirmPreflight();
    if (pf && !pf.viable) {
      return;
    }
    try {
      const res = await this.api.executeAction(d.vm.id, this.pendingAction, ev.reason);
      this.toast.success('Action accepted', `Task ${res.taskId}`);
      this.closeConfirm();
      await this.load(d.vm.id);
    } catch (e) {
      this.toast.error('Action failed', e instanceof Error ? e.message : 'Unknown error');
      this.closeConfirm();
    }
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.detail.set(await this.api.get(id));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed to load VM');
    } finally {
      this.loading.set(false);
    }
  }
}
