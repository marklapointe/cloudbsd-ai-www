import { Component, OnInit, inject, signal } from '@angular/core';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { StatCardsComponent } from '../../shared/stat-cards/stat-cards.component';
import {
  DashboardApi,
  DashboardAlert,
  DashboardBootstrap,
  DashboardTask,
} from '../../core/api/dashboard.api';
import { StatCard } from '../../shared/stat-cards/stat-cards.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [PageHeaderComponent, StatCardsComponent],
  template: `
    <app-page-header title="Dashboard" subtitle="Cluster capacity and live health" />

    @if (loading()) {
      <div class="rounded-shell border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading dashboard…
      </div>
    } @else if (error()) {
      <div class="rounded-shell border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {{ error() }}
      </div>
    } @else {
      <app-stat-cards [cards]="cards()" />

      <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section class="rounded-shell border border-slate-200 bg-white p-4">
          <h2 class="m-0 text-sm font-semibold text-slate-800">Alerts</h2>
          @if (!alerts().length) {
            <p class="mt-2 text-xs text-slate-500">No active alerts.</p>
          } @else {
            <ul class="mt-2 space-y-2">
              @for (a of alerts(); track a.id) {
                <li class="flex items-start gap-2 text-xs">
                  <span
                    class="mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                    [class.bg-amber-50]="a.severity === 'WARNING'"
                    [class.text-amber-800]="a.severity === 'WARNING'"
                    [class.bg-slate-100]="a.severity === 'INFO'"
                    [class.text-slate-600]="a.severity === 'INFO'"
                    [class.bg-rose-50]="a.severity === 'CRITICAL' || a.severity === 'ERROR'"
                    [class.text-rose-700]="a.severity === 'CRITICAL' || a.severity === 'ERROR'"
                  >
                    {{ a.severity }}
                  </span>
                  <span class="text-slate-700">{{ a.message }}</span>
                </li>
              }
            </ul>
          }
        </section>

        <section class="rounded-shell border border-slate-200 bg-white p-4">
          <h2 class="m-0 text-sm font-semibold text-slate-800">Recent tasks</h2>
          @if (!tasks().length) {
            <p class="mt-2 text-xs text-slate-500">No recent tasks.</p>
          } @else {
            <ul class="mt-2 divide-y divide-slate-100">
              @for (t of tasks(); track t.id) {
                <li class="flex items-center justify-between py-2 text-xs">
                  <span class="font-medium text-slate-800">{{ t.name }}</span>
                  <span
                    class="rounded-full px-2 py-0.5 text-[11px]"
                    [class.bg-emerald-50]="t.status === 'succeeded'"
                    [class.text-emerald-700]="t.status === 'succeeded'"
                    [class.bg-blue-50]="t.status === 'running'"
                    [class.text-blue-700]="t.status === 'running'"
                    [class.bg-slate-100]="t.status !== 'succeeded' && t.status !== 'running'"
                    [class.text-slate-600]="t.status !== 'succeeded' && t.status !== 'running'"
                  >
                    {{ t.status }}
                  </span>
                </li>
              }
            </ul>
          }
        </section>
      </div>
    }
  `,
})
export class DashboardPage implements OnInit {
  private readonly api = inject(DashboardApi);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly cards = signal<StatCard[]>([]);
  readonly alerts = signal<DashboardAlert[]>([]);
  readonly tasks = signal<DashboardTask[]>([]);

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data: DashboardBootstrap = await this.api.bootstrap();
      this.cards.set(data.cards);
      this.alerts.set(data.alerts);
      this.tasks.set(data.tasks);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      this.loading.set(false);
    }
  }
}
