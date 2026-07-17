import { Component, input, model, output } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface DetailTab {
  id: string;
  label: string;
}

/**
 * Shared detail chrome: title, breadcrumbs, tabs, actions outlet (catalog §7.2).
 */
@Component({
  selector: 'app-detail-shell',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="mb-3">
      @if (backLink()) {
        <a
          [routerLink]="backLink()!"
          class="text-[11px] font-medium text-brand-600 no-underline hover:underline"
        >
          ← {{ backLabel() }}
        </a>
      }
      <div class="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="m-0 text-lg font-semibold text-slate-900">{{ title() }}</h1>
            @if (badge()) {
              <span
                class="rounded-full px-2 py-0.5 text-[11px] font-medium"
                [class]="badgeClass()"
              >
                {{ badge() }}
              </span>
            }
          </div>
          @if (subtitle()) {
            <p class="mt-0.5 text-xs text-slate-500">{{ subtitle() }}</p>
          }
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <ng-content select="[actions]" />
        </div>
      </div>
    </div>

    @if (tabs().length) {
      <div class="mb-3 flex gap-1 border-b border-slate-200">
        @for (tab of tabs(); track tab.id) {
          <button
            type="button"
            class="-mb-px border-b-2 px-3 py-2 text-xs font-medium"
            [class.border-brand-500]="activeTab() === tab.id"
            [class.text-brand-600]="activeTab() === tab.id"
            [class.border-transparent]="activeTab() !== tab.id"
            [class.text-slate-500]="activeTab() !== tab.id"
            [class.hover:text-slate-800]="activeTab() !== tab.id"
            (click)="activeTab.set(tab.id); tabChange.emit(tab.id)"
          >
            {{ tab.label }}
          </button>
        }
      </div>
    }

    <ng-content />
  `,
})
export class DetailShellComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly badge = input('');
  readonly badgeClass = input('bg-slate-100 text-slate-600');
  readonly backLink = input<string | null>(null);
  readonly backLabel = input('Back');
  readonly tabs = input<DetailTab[]>([]);
  readonly activeTab = model('overview');
  readonly tabChange = output<string>();
}
