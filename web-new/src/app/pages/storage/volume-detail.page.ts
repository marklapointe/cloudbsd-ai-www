import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DetailShellComponent } from '../../shared/detail-shell/detail-shell.component';
import { ResourcesApi } from '../../core/api/resources.api';
import { VolumeSummary, formatBytes } from '../../core/protocol/resource.types';

@Component({
  selector: 'app-volume-detail-page',
  standalone: true,
  imports: [DetailShellComponent, RouterLink, DatePipe],
  template: `
    @if (loading()) {
      <div class="rounded-shell border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading volume…
      </div>
    } @else if (error()) {
      <div class="rounded-shell border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {{ error() }}
        <a routerLink="/storage" class="ml-2 text-brand-600">Back</a>
      </div>
    } @else if (item(); as v) {
      <app-detail-shell
        [title]="v.name"
        [subtitle]="v.type + ' · ' + v.mountpoint"
        [badge]="v.health"
        [badgeClass]="healthClass(v.health)"
        backLink="/storage"
        backLabel="Storage"
        [tabs]="tabs"
        [(activeTab)]="tab"
      >
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-shell border border-slate-200 bg-white p-4 text-xs">
            <div class="text-[11px] font-medium uppercase text-slate-400">Capacity</div>
            <dl class="mt-2 space-y-1">
              <div class="flex justify-between"><dt>Used</dt><dd class="font-medium">{{ formatBytes(v.usedBytes) }} ({{ v.usagePercent }}%)</dd></div>
              <div class="flex justify-between"><dt>Size</dt><dd class="font-medium">{{ formatBytes(v.sizeBytes) }}</dd></div>
            </dl>
            <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                class="h-full rounded-full"
                [class.bg-emerald-500]="v.usagePercent < 70"
                [class.bg-amber-500]="v.usagePercent >= 70 && v.usagePercent < 90"
                [class.bg-rose-500]="v.usagePercent >= 90"
                [style.width.%]="v.usagePercent"
              ></div>
            </div>
          </div>
          <div class="rounded-shell border border-slate-200 bg-white p-4 text-xs">
            <div class="text-[11px] font-medium uppercase text-slate-400">Properties</div>
            <dl class="mt-2 space-y-1">
              <div class="flex justify-between"><dt>Compression</dt><dd class="font-medium">{{ v.compression }}</dd></div>
              <div class="flex justify-between"><dt>Encryption</dt><dd class="font-medium">{{ v.encryption }}</dd></div>
              <div class="flex justify-between"><dt>Last scrub</dt><dd class="font-medium">{{ v.lastScrub | date: 'mediumDate' }}</dd></div>
            </dl>
          </div>
        </div>
      </app-detail-shell>
    }
  `,
})
export class VolumeDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ResourcesApi);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly item = signal<VolumeSummary | null>(null);
  readonly tab = signal('overview');
  readonly tabs = [{ id: 'overview', label: 'Overview' }];
  readonly formatBytes = formatBytes;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Missing id');
      this.loading.set(false);
      return;
    }
    void this.load(id);
  }

  healthClass(h: string): string {
    if (h === 'healthy') return 'bg-emerald-50 text-emerald-700';
    if (h === 'watch') return 'bg-amber-50 text-amber-700';
    return 'bg-rose-50 text-rose-700';
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    try {
      this.item.set(await this.api.getVolume(id));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed');
    } finally {
      this.loading.set(false);
    }
  }
}
