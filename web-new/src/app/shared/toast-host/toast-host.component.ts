import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/toast/toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    <div
      class="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-80 flex-col gap-2"
      aria-live="polite"
    >
      @for (t of toasts.toasts(); track t.id) {
        <div
          class="pointer-events-auto rounded-shell border bg-white px-3 py-2 shadow-lg"
          [class.border-slate-200]="t.severity === 'info'"
          [class.border-emerald-200]="t.severity === 'success'"
          [class.border-amber-200]="t.severity === 'warning'"
          [class.border-rose-200]="t.severity === 'error'"
          role="status"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <div
                class="text-xs font-semibold"
                [class.text-slate-800]="t.severity === 'info'"
                [class.text-emerald-800]="t.severity === 'success'"
                [class.text-amber-900]="t.severity === 'warning'"
                [class.text-rose-800]="t.severity === 'error'"
              >
                {{ t.title }}
              </div>
              @if (t.message) {
                <div class="mt-0.5 text-[11px] text-slate-600">{{ t.message }}</div>
              }
            </div>
            <button
              type="button"
              class="text-slate-400 hover:text-slate-700"
              aria-label="Dismiss"
              (click)="toasts.dismiss(t.id)"
            >
              ×
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ToastHostComponent {
  readonly toasts = inject(ToastService);
}
