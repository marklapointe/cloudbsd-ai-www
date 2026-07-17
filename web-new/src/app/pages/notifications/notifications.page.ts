import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { NotificationsApi } from '../../core/api/notifications.api';
import { NotificationItem } from '../../core/protocol/resource.types';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [PageHeaderComponent, RouterLink, DatePipe],
  template: `
    <app-page-header title="Notifications" subtitle="Inbox" />

    @if (loading()) {
      <div class="rounded-shell border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading…
      </div>
    } @else if (!items().length) {
      <div
        class="rounded-shell border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500"
      >
        No notifications
      </div>
    } @else {
      <ul class="space-y-2">
        @for (n of items(); track n.id) {
          <li
            class="rounded-shell border border-slate-200 bg-white p-3"
            [class.border-l-4]="!n.read"
            [class.border-l-brand-500]="!n.read"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <div class="flex items-center gap-2">
                  <span
                    class="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                    [class.bg-amber-50]="n.severity === 'WARNING'"
                    [class.text-amber-800]="n.severity === 'WARNING'"
                    [class.bg-slate-100]="n.severity === 'INFO'"
                    [class.text-slate-600]="n.severity === 'INFO'"
                    [class.bg-rose-50]="n.severity === 'ERROR' || n.severity === 'CRITICAL'"
                    [class.text-rose-700]="n.severity === 'ERROR' || n.severity === 'CRITICAL'"
                  >
                    {{ n.severity }}
                  </span>
                  <span class="text-sm font-semibold text-slate-900">{{ n.title }}</span>
                </div>
                <p class="mt-1 text-xs text-slate-600">{{ n.message }}</p>
                <p class="mt-1 text-[11px] text-slate-400">
                  {{ n.ts | date: 'medium' }}
                </p>
              </div>
              @if (n.href) {
                <a
                  [routerLink]="n.href"
                  class="shrink-0 text-xs font-medium text-brand-600 no-underline hover:underline"
                  >Open</a
                >
              }
            </div>
          </li>
        }
      </ul>
    }
  `,
})
export class NotificationsPage implements OnInit {
  private readonly api = inject(NotificationsApi);

  readonly loading = signal(true);
  readonly items = signal<NotificationItem[]>([]);

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const batch = await this.api.list();
      this.items.set(batch.items);
    } finally {
      this.loading.set(false);
    }
  }
}
