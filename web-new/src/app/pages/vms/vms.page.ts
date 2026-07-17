import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import {
  ResourceColumn,
  ResourceTableComponent,
} from '../../shared/resource-table/resource-table.component';
import { FilterBarComponent } from '../../shared/filter-bar/filter-bar.component';
import { ConfirmActionModalComponent } from '../../shared/confirm-action-modal/confirm-action-modal.component';
import {
  CapabilityAction,
  CapabilityActionMenuComponent,
} from '../../shared/capability-action-menu/capability-action-menu.component';
import { VmsApi } from '../../core/api/vms.api';
import { PreflightService } from '../../core/protocol/preflight.service';
import { PreflightResult } from '../../core/protocol/preflight.types';
import { ToastService } from '../../core/toast/toast.service';
import {
  VmSummary,
  bytesToGiB,
  formatVmStatus,
} from '../../core/protocol/resource.types';

@Component({
  selector: 'app-vms-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    ResourceTableComponent,
    FilterBarComponent,
    ConfirmActionModalComponent,
    CapabilityActionMenuComponent,
    RouterLink,
  ],
  template: `
    <app-page-header title="Virtual Machines" subtitle="bhyve inventory">
      <a
        routerLink="/vms/create"
        class="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-brand-600"
      >
        Create VM
      </a>
    </app-page-header>

    <app-filter-bar
      placeholder="Filter by name…"
      [chips]="statusChips"
      [(query)]="query"
      [(activeChip)]="statusFilter"
      (queryChange)="reload()"
      (chipChange)="reload()"
    >
      @if (batchFooter()) {
        <span class="text-[11px] text-slate-500">{{ batchFooter() }}</span>
      }
    </app-filter-bar>

    @if (loading()) {
      <div class="rounded-shell border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading VMs…
      </div>
    } @else if (error()) {
      <div class="rounded-shell border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {{ error() }}
      </div>
    } @else {
      <app-resource-table
        [columns]="columns"
        [rows]="rows()"
        [trackBy]="trackVm"
        [selectable]="true"
        [selectedIds]="selected()"
        [sortColumn]="sortField()"
        [sortDir]="sortDir()"
        emptyTitle="No virtual machines"
        emptyDescription="Create a VM to get started, or clear filters."
        [footer]="batchFooter()"
        (sort)="onSort($event)"
        (rowClick)="openDetail($event)"
        (selectionChange)="selected.set($event)"
      >
        <ng-template #rowActions let-vm>
          <app-capability-action-menu
            [actions]="actionsFor(vm)"
            (actionSelect)="onAction(vm, $event)"
          />
        </ng-template>
      </app-resource-table>
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
export class VmsPage implements OnInit {
  private readonly api = inject(VmsApi);
  private readonly preflight = inject(PreflightService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly statusChips = [
    { id: 'all', label: 'all' },
    { id: 'running', label: 'running' },
    { id: 'stopped', label: 'stopped' },
    { id: 'paused', label: 'paused' },
  ];

  readonly query = signal('');
  readonly statusFilter = signal('all');
  readonly rows = signal<VmSummary[]>([]);
  readonly selected = signal<Set<string>>(new Set());
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly sortField = signal('name');
  readonly sortDir = signal<'asc' | 'desc'>('asc');
  readonly batchFooter = signal('');

  readonly confirmOpen = signal(false);
  readonly confirmTitle = signal('');
  readonly confirmDescription = signal('');
  readonly confirmLabel = signal('Confirm');
  readonly confirmDestructive = signal(false);
  readonly confirmPreflight = signal<PreflightResult | null>(null);
  readonly confirmLoadingPf = signal(false);
  readonly confirmPhrase = signal<string | null>(null);
  private pendingVm: VmSummary | null = null;
  private pendingAction: string | null = null;

  readonly columns: ResourceColumn<VmSummary>[] = [
    {
      id: 'status',
      header: 'Status',
      badge: true,
      cell: (vm) => formatVmStatus(vm.status),
    },
    { id: 'name', header: 'Name', sortable: true, cell: (vm) => vm.name },
    { id: 'host', header: 'Host', sortable: true, cell: (vm) => vm.host },
    { id: 'os', header: 'OS', cell: (vm) => vm.os },
    { id: 'vcpu', header: 'vCPUs', cell: (vm) => String(vm.vcpu) },
    {
      id: 'memory',
      header: 'Memory',
      cell: (vm) => `${bytesToGiB(vm.ramBytes)} GiB`,
    },
    { id: 'ip', header: 'IP', cell: (vm) => vm.ip },
  ];

  readonly trackVm = (vm: VmSummary) => vm.id;

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const status =
        this.statusFilter() === 'all'
          ? undefined
          : [this.statusFilter()];
      const result = await this.api.list({
        search: this.query(),
        status,
        sortField: this.sortField(),
        sortDir: this.sortDir(),
      });
      this.rows.set(result.items);
      const s = result.batch.stats;
      this.batchFooter.set(
        `${result.batch.shown} shown · ${s.running} running · ${s.stopped} stopped · ${s.paused} paused`,
      );
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed to load VMs');
      this.rows.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  onSort(col: string): void {
    if (this.sortField() === col) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(col);
      this.sortDir.set('asc');
    }
    void this.reload();
  }

  openDetail(vm: VmSummary): void {
    void this.router.navigate(['/vms', vm.id]);
  }

  actionsFor(vm: VmSummary): CapabilityAction[] {
    const running = vm.status === 'RUN';
    return [
      { id: 'start', label: 'Start', visible: !running },
      { id: 'stop', label: 'Stop', visible: running, warning: vm.name === 'nextcloud' },
      { id: 'reboot', label: 'Reboot', visible: running },
      {
        id: 'migrate',
        label: 'Live migrate',
        // Rule #8: hide when known non-viable (jellyfin demo)
        visible: running && !vm.id.includes('jellyfin'),
      },
      {
        id: 'migrate-blocked',
        label: 'Live migrate',
        visible: running && vm.id.includes('jellyfin'),
        disabled: true,
      },
      { id: 'delete', label: 'Delete', destructive: true },
    ];
  }

  async onAction(vm: VmSummary, action: CapabilityAction): Promise<void> {
    if (action.disabled) {
      return;
    }
    this.pendingVm = vm;
    this.pendingAction = action.id === 'migrate-blocked' ? 'migrate' : action.id;

    const act = this.pendingAction;
    this.confirmTitle.set(`${action.label} virtual machine`);
    this.confirmDescription.set(
      `${action.label} ${vm.name} on ${vm.host}?`,
    );
    this.confirmLabel.set(action.label);
    this.confirmDestructive.set(!!action.destructive || act === 'stop' || act === 'delete');
    this.confirmPhrase.set(act === 'delete' ? vm.name : null);
    this.confirmPreflight.set(null);
    this.confirmOpen.set(true);
    this.confirmLoadingPf.set(true);

    try {
      const pf = await this.preflight.check('vm', vm.id, act, 'vms_view');
      this.confirmPreflight.set(pf);
      // Hide path already applied for migrate-blocked; still honor viable=false.
      if (!pf.viable && act === 'migrate') {
        // keep modal open so user sees blockers
      }
    } finally {
      this.confirmLoadingPf.set(false);
    }
  }

  closeConfirm(): void {
    this.confirmOpen.set(false);
    this.pendingVm = null;
    this.pendingAction = null;
    this.confirmPreflight.set(null);
  }

  async executeConfirm(ev: { reason: string }): Promise<void> {
    if (!this.pendingVm || !this.pendingAction) {
      return;
    }
    const pf = this.confirmPreflight();
    if (pf && !pf.viable) {
      return;
    }
    try {
      const res = await this.api.executeAction(
        this.pendingVm.id,
        this.pendingAction,
        ev.reason,
      );
      this.toast.success('Action accepted', `Task ${res.taskId}`);
      this.closeConfirm();
      await this.reload();
    } catch (e) {
      this.toast.error('Action failed', e instanceof Error ? e.message : 'Unknown error');
      this.closeConfirm();
    }
  }
}
