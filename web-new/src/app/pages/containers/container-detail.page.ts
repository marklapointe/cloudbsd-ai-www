import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DetailShellComponent } from '../../shared/detail-shell/detail-shell.component';
import { ResourcesApi } from '../../core/api/resources.api';
import {
  ContainerSummary,
  formatBytes,
  formatPowerStatus,
  formatUptime,
} from '../../core/protocol/resource.types';

@Component({
  selector: 'app-container-detail-page',
  standalone: true,
  imports: [DetailShellComponent, RouterLink],
  template: `
    @if (loading()) {
      <div class="rounded-shell border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading container…
      </div>
    } @else if (error()) {
      <div class="rounded-shell border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {{ error() }}
        <a routerLink="/containers" class="ml-2 text-brand-600">Back</a>
      </div>
    } @else if (item(); as c) {
      <app-detail-shell
        [title]="c.name"
        [subtitle]="c.image + ' · ' + c.host"
        [badge]="formatStatus(c.status)"
        [badgeClass]="badgeClass(c.status)"
        backLink="/containers"
        backLabel="Containers"
        [tabs]="tabs"
        [(activeTab)]="tab"
      >
        @switch (tab()) {
          @case ('overview') {
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-shell border border-slate-200 bg-white p-4 text-xs">
                <div class="text-[11px] font-medium uppercase text-slate-400">Runtime</div>
                <dl class="mt-2 space-y-1">
                  <div class="flex justify-between"><dt>CPU</dt><dd class="font-medium">{{ c.cpuPercent }}%</dd></div>
                  <div class="flex justify-between"><dt>Memory</dt><dd class="font-medium">{{ formatBytes(c.memBytes) }}</dd></div>
                  <div class="flex justify-between"><dt>Uptime</dt><dd class="font-medium">{{ formatUptime(c.uptimeSec) }}</dd></div>
                </dl>
              </div>
              <div class="rounded-shell border border-slate-200 bg-white p-4 text-xs">
                <div class="text-[11px] font-medium uppercase text-slate-400">Image</div>
                <dl class="mt-2 space-y-1">
                  <div class="flex justify-between"><dt>Registry</dt><dd class="font-medium">{{ c.imageRegistry }}</dd></div>
                  <div class="flex justify-between gap-2"><dt>Image</dt><dd class="font-medium break-all text-right">{{ c.image }}</dd></div>
                </dl>
              </div>
            </div>
          }
          @case ('ports') {
            <div class="overflow-hidden rounded-shell border border-slate-200 bg-white">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-[11px] uppercase text-slate-500">
                  <tr>
                    <th class="px-3 py-2">Host</th>
                    <th class="px-3 py-2">Container</th>
                    <th class="px-3 py-2">Proto</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of c.ports; track p.host + p.container) {
                    <tr class="border-t border-slate-100">
                      <td class="px-3 py-2">{{ p.host }}</td>
                      <td class="px-3 py-2">{{ p.container }}</td>
                      <td class="px-3 py-2">{{ p.protocol }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="3" class="px-3 py-6 text-center text-slate-500">No published ports</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </app-detail-shell>
    }
  `,
})
export class ContainerDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ResourcesApi);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly item = signal<ContainerSummary | null>(null);
  readonly tab = signal('overview');
  readonly tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'ports', label: 'Ports' },
  ];

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
    return status === 'RUN' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600';
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    try {
      this.item.set(await this.api.getContainer(id));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed');
    } finally {
      this.loading.set(false);
    }
  }
}
