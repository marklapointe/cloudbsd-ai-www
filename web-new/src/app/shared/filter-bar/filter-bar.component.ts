import { Component, input, model, output } from '@angular/core';

export interface FilterChip {
  id: string;
  label: string;
}

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  template: `
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <input
        type="search"
        class="w-56 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-brand-500"
        [placeholder]="placeholder()"
        [value]="query()"
        (input)="onQuery($event)"
      />
      @if (chips().length) {
        <div class="flex flex-wrap gap-1">
          @for (chip of chips(); track chip.id) {
            <button
              type="button"
              class="rounded-full border px-2.5 py-0.5 text-[11px]"
              [class.border-brand-500]="activeChip() === chip.id"
              [class.bg-brand-50]="activeChip() === chip.id"
              [class.text-brand-600]="activeChip() === chip.id"
              [class.border-slate-200]="activeChip() !== chip.id"
              [class.text-slate-600]="activeChip() !== chip.id"
              (click)="activeChip.set(chip.id); chipChange.emit(chip.id)"
            >
              {{ chip.label }}
            </button>
          }
        </div>
      }
      <div class="ml-auto flex items-center gap-2">
        <ng-content />
      </div>
    </div>
  `,
})
export class FilterBarComponent {
  readonly placeholder = input('Filter…');
  readonly chips = input<FilterChip[]>([]);
  readonly query = model('');
  readonly activeChip = model('all');

  readonly queryChange = output<string>();
  readonly chipChange = output<string>();

  onQuery(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.queryChange.emit(value);
  }
}
