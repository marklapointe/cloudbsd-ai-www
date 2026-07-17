import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DetailShellComponent } from '../../shared/detail-shell/detail-shell.component';
import { ResourcesApi } from '../../core/api/resources.api';
import {
  JailSummary,
  bytesToGiB,
  formatBytes,
  formatPowerStatus,
  formatUptime,
} from '../../core/protocol/resource.types';

@Component({
  selector: 'app-jail-detail-page',
  standalone: true,
  imports: [DetailShellComponent, RouterLink],
  template: `
    @if (loading()) {
      <div class="rounded-shell border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading jail…
      </div>
    } @else if (error()) {
      <div class="rounded-shell border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {{ error() }}
        <a routerLink="/jails" class="ml-2 text-brand-600">Back</a>
      </div>
    } @else if (item(); as j) {
      <app-detail-shell
        [title]="j.name"
        [subtitle]="j.hostname + ' · ' + j.host"
        [badge]="formatStatus(j.status)"
        [badgeClass]="badgeClass(j.status)"
        backLink="/jails"
        backLabel="Jails"
        [tabs]="tabs"
        [(activeTab)]="tab"
      >
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div class="rounded-shell border border-slate-200 bg-white p-4 text-xs">
            <div class="text-[11px] font-medium uppercase text-slate-400">Identity</div>
            <dl class="mt-2 space-y-1">
              <div class="flex justify-between"><dt>JID</dt><dd class="font-medium">{{ j.jailId }}</dd></div>
              <div class="flex justify-between"><dt>OS</dt><dd class="font-medium">{{ j.os }}</dd></div>
              <div class="flex justify-between"><dt>IP</dt><dd class="font-medium">{{ j.ip }}</dd></div>
            </dl>
          </div>
          <div class="rounded-shell border border-slate-200 bg-white p-4 text-xs">
            <div class="text-[11px] font-medium uppercase text-slate-400">Resources</div>
            <dl class="mt-2 space-y-1">
              <div class="flex justify-between"><dt>vCPUs</dt><dd class="font-medium">{{ j.vcpus }}</dd></div>
              <div class="flex justify-between"><dt>Memory</dt><dd class="font-medium">{{ bytesToGiB(j.ramBytes) }} GiB</dd></div>
              <div class="flex justify-between"><dt>Disk</dt><dd class="font-medium">{{ formatBytes(j.diskBytes) }}</dd></div>
            </dl>
          </div>
          <div class="rounded-shell border border-slate-200 bg-white p-4 text-xs">
            <div class="text-[11px] font-medium uppercase text-slate-400">Runtime</div>
            <dl class="mt-2 space-y-1">
              <div class="flex justify-between"><dt>Uptime</dt><dd class="font-medium">{{ formatUptime(j.uptimeSec) }}</dd></div>
              <div class="flex justify-between"><dt>Host</dt><dd class="font-medium">{{ j.host }}</dd></div>
            </dl>
          </div>
        </div>
      </app-detail-shell>
    }
  `,
})
export class JailDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ResourcesApi);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly item = signal<JailSummary | null>(null);
  readonly tab = signal('overview');
  readonly tabs = [{ id: 'overview', label: 'Overview' }];

  readonly bytesToGiB = bytesToGiB;
  readonly formatBytes = formatBytes;
  readonly formatUptime = formatUptime;
  readonly formatStatus = formatPowerStatus;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Missing id');
      this.loading.set(false);
      return;
    }
    void this.load(id);
  }

  badgeClass(status: string): string {
    if (status === 'RUN') return 'bg-emerald-50 text-emerald-700';
    if (status === 'FROZEN') return 'bg-amber-50 text-amber-700';
    return 'bg-slate-100 text-slate-600';
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    try {
      this.item.set(await this.api.getJail(id));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed');
    } finally {
      this.loading.set(false);
    }
  }
}
