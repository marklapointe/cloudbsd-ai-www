import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PreflightResult } from '../../core/protocol/preflight.types';

/**
 * Confirm action modal (Rule #1: describe → preflight → confirm → execute).
 * Shows preflight blockers/warnings; type-to-confirm for destructive ops.
 */
@Component({
  selector: 'app-confirm-action-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
        role="presentation"
        (click)="onBackdrop($event)"
      >
        <div
          class="w-full max-w-md rounded-shell border border-slate-200 bg-white shadow-xl"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 [id]="titleId" class="m-0 text-sm font-semibold text-slate-900">{{ title() }}</h2>
            <button
              type="button"
              class="rounded px-2 py-0.5 text-slate-500 hover:bg-slate-50"
              aria-label="Close"
              (click)="cancel.emit()"
            >
              ×
            </button>
          </div>

          <div class="space-y-3 px-4 py-3 text-xs text-slate-700">
            <p class="m-0 text-sm">{{ description() }}</p>

            @if (preflight(); as pf) {
              @if (pf.blockers.length) {
                <div class="rounded-md border border-rose-200 bg-rose-50 p-2 text-rose-800">
                  <div class="font-semibold">Blocked</div>
                  <ul class="mt-1 list-disc pl-4">
                    @for (b of pf.blockers; track b.id) {
                      <li>
                        {{ b.message }}
                        @if (b.remediation) {
                          <div class="text-rose-700/80">→ {{ b.remediation }}</div>
                        }
                      </li>
                    }
                  </ul>
                </div>
              } @else {
                <div class="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-emerald-800">
                  Preflight: OK — no blockers
                </div>
              }

              @if (pf.warnings.length) {
                <div class="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900">
                  <div class="font-semibold">Warnings</div>
                  <ul class="mt-1 list-disc pl-4">
                    @for (w of pf.warnings; track w.id) {
                      <li>{{ w.message }}</li>
                    }
                  </ul>
                </div>
              }
            } @else if (loadingPreflight()) {
              <div class="text-slate-500">Running preflight…</div>
            }

            @if (requireReason()) {
              <label class="block font-medium text-slate-700">
                Reason (audit)
                <input
                  class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-brand-500"
                  [(ngModel)]="reason"
                  [placeholder]="reasonPlaceholder()"
                />
              </label>
            }

            @if (confirmPhrase()) {
              <label class="block font-medium text-slate-700">
                Type <span class="font-mono text-rose-600">{{ confirmPhrase() }}</span> to confirm
                <input
                  class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs outline-none focus:border-brand-500"
                  [(ngModel)]="typedConfirm"
                />
              </label>
            }
          </div>

          <div class="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
            <button
              type="button"
              class="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              (click)="cancel.emit()"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              [class.bg-brand-500]="!destructive()"
              [class.hover:bg-brand-600]="!destructive()"
              [class.bg-rose-600]="destructive()"
              [class.hover:bg-rose-700]="destructive()"
              [disabled]="!canConfirm()"
              (click)="confirm.emit({ reason: reason })"
            >
              {{ confirmLabel() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmActionModalComponent {
  readonly open = model(false);
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly destructive = input(false);
  readonly requireReason = input(true);
  readonly reasonPlaceholder = input('Optional note for audit log');
  readonly confirmPhrase = input<string | null>(null);
  readonly preflight = input<PreflightResult | null>(null);
  readonly loadingPreflight = input(false);

  readonly cancel = output<void>();
  readonly confirm = output<{ reason: string }>();

  reason = '';
  typedConfirm = '';
  readonly titleId = 'confirm-action-title-' + Math.random().toString(36).slice(2, 8);

  canConfirm(): boolean {
    if (this.loadingPreflight()) {
      return false;
    }
    const pf = this.preflight();
    if (pf && !pf.viable) {
      return false;
    }
    const phrase = this.confirmPhrase();
    if (phrase && this.typedConfirm !== phrase) {
      return false;
    }
    return true;
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cancel.emit();
    }
  }
}
