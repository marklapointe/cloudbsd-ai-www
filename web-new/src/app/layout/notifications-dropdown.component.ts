import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationsApi } from '../core/api/notifications.api';
import { NotificationItem } from '../core/protocol/resource.types';

@Component({
  selector: 'app-notifications-dropdown',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="relative">
      <button
        type="button"
        class="relative rounded px-1.5 py-0.5 hover:bg-slate-50"
        title="Notifications"
        aria-label="Notifications"
        [attr.aria-expanded]="open()"
        (click)="toggle()"
      >
        🔔
        @if (unread() > 0) {
          <span
            class="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white"
          >
            {{ unread() }}
          </span>
        }
      </button>

      @if (open()) {
        <div
          class="absolute right-0 z-30 mt-1 w-80 rounded-lg border border-slate-200 bg-white shadow-lg"
          role="menu"
        >
          <div class="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span class="text-xs font-semibold text-slate-800">Notifications</span>
            <a
              routerLink="/notifications"
              class="text-[11px] text-brand-600 no-underline hover:underline"
              (click)="open.set(false)"
              >Inbox</a
            >
          </div>
          <div class="max-h-72 overflow-y-auto">
            @if (!items().length) {
              <p class="px-3 py-4 text-center text-xs text-slate-500">No notifications</p>
            } @else {
              @for (n of items(); track n.id) {
                <a
                  [routerLink]="n.href || '/notifications'"
                  class="block border-b border-slate-50 px-3 py-2 no-underline hover:bg-slate-50"
                  [class.bg-blue-50/40]="!n.read"
                  (click)="open.set(false)"
                >
                  <div class="flex items-center gap-2">
                    <span
                      class="rounded px-1 py-0.5 text-[9px] font-bold uppercase"
                      [class.bg-amber-50]="n.severity === 'WARNING'"
                      [class.text-amber-800]="n.severity === 'WARNING'"
                      [class.bg-slate-100]="n.severity === 'INFO'"
                      [class.text-slate-600]="n.severity === 'INFO'"
                      [class.bg-rose-50]="n.severity === 'ERROR' || n.severity === 'CRITICAL'"
                      [class.text-rose-700]="n.severity === 'ERROR' || n.severity === 'CRITICAL'"
                    >
                      {{ n.severity }}
                    </span>
                    <span class="text-xs font-medium text-slate-800">{{ n.title }}</span>
                  </div>
                  <p class="mt-0.5 text-[11px] text-slate-600">{{ n.message }}</p>
                </a>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class NotificationsDropdownComponent implements OnInit {
  private readonly api = inject(NotificationsApi);

  readonly open = signal(false);
  readonly items = signal<NotificationItem[]>([]);
  readonly unread = signal(0);

  ngOnInit(): void {
    void this.load();
  }

  toggle(): void {
    this.open.update((v) => !v);
    if (this.open()) {
      void this.load();
    }
  }

  private async load(): Promise<void> {
    try {
      const batch = await this.api.list();
      this.items.set(batch.items);
      this.unread.set(batch.unread);
    } catch {
      this.items.set([]);
      this.unread.set(0);
    }
  }
}
