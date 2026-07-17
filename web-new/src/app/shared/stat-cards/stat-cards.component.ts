import { Component, input } from '@angular/core';

export interface StatCard {
  label: string;
  value: string;
  hint?: string;
}

@Component({
  selector: 'app-stat-cards',
  standalone: true,
  template: `
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      @for (card of cards(); track card.label) {
        <div class="rounded-shell border border-slate-200 bg-white p-4">
          <div class="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {{ card.label }}
          </div>
          <div class="mt-1 text-2xl font-semibold text-slate-900">{{ card.value }}</div>
          @if (card.hint) {
            <div class="mt-1 text-xs text-slate-500">{{ card.hint }}</div>
          }
        </div>
      }
    </div>
  `,
})
export class StatCardsComponent {
  readonly cards = input.required<StatCard[]>();
}
