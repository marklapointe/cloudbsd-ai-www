import { Component, input } from '@angular/core';

/** Shared empty / no-match state (catalog §7.2 — one pattern, not N SVGs). */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div
      class="flex flex-col items-center justify-center rounded-shell border border-dashed border-slate-200 bg-white px-6 py-12 text-center"
    >
      <div class="text-sm font-semibold text-slate-800">{{ title() }}</div>
      @if (description()) {
        <p class="mt-1 max-w-md text-xs text-slate-500">{{ description() }}</p>
      }
      <div class="mt-4">
        <ng-content />
      </div>
    </div>
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input<string>('');
}
