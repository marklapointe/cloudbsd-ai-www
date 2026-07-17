import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <div class="mb-3 flex items-start justify-between gap-3">
      <div>
        <h1 class="m-0 text-lg font-semibold text-slate-900">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="mt-0.5 text-xs text-slate-500">{{ subtitle() }}</p>
        }
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <ng-content />
      </div>
    </div>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
