import { Component, contentChild, input, output, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

export interface ResourceColumn<T = unknown> {
  id: string;
  header: string;
  /** Optional width class e.g. w-32 */
  class?: string;
  sortable?: boolean;
  cell: (row: T) => string;
  /** Optional status-like badge styling key from cell value */
  badge?: boolean;
}

/**
 * Shared inventory table (catalog §7.2).
 * One component for lists — density via CSS vars, not N SVG forks.
 */
@Component({
  selector: 'app-resource-table',
  standalone: true,
  imports: [NgTemplateOutlet, EmptyStateComponent],
  template: `
    @if (rows().length === 0) {
      <app-empty-state [title]="emptyTitle()" [description]="emptyDescription()">
        <ng-content select="[emptyActions]" />
      </app-empty-state>
    } @else {
      <div class="overflow-hidden rounded-shell border border-slate-200 bg-white">
        <table class="w-full border-collapse text-left text-xs">
          <thead class="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              @if (selectable()) {
                <th class="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    class="rounded border-slate-300"
                    [checked]="allSelected()"
                    (change)="toggleAll($event)"
                    [attr.aria-label]="'Select all'"
                  />
                </th>
              }
              @for (col of columns(); track col.id) {
                <th class="px-3 py-2 font-medium" [class]="col.class || ''">
                  @if (col.sortable) {
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 hover:text-slate-800"
                      (click)="sort.emit(col.id)"
                    >
                      {{ col.header }}
                      @if (sortColumn() === col.id) {
                        <span aria-hidden="true">{{ sortDir() === 'asc' ? '↑' : '↓' }}</span>
                      }
                    </button>
                  } @else {
                    {{ col.header }}
                  }
                </th>
              }
              @if (rowActions()) {
                <th class="px-3 py-2 font-medium text-right">Actions</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track trackBy()(row)) {
              <tr
                class="border-t border-slate-100 hover:bg-slate-50"
                [class.bg-blue-50]="isSelected(row)"
                (click)="rowClick.emit(row)"
              >
                @if (selectable()) {
                  <td class="px-3 py-2" (click)="$event.stopPropagation()">
                    <input
                      type="checkbox"
                      class="rounded border-slate-300"
                      [checked]="isSelected(row)"
                      (change)="toggleRow(row, $event)"
                      [attr.aria-label]="'Select row'"
                    />
                  </td>
                }
                @for (col of columns(); track col.id) {
                  <td class="px-3 py-2" [class]="col.class || ''">
                    @if (col.badge) {
                      <span
                        class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                        [class]="badgeClass(col.cell(row))"
                      >
                        {{ col.cell(row) }}
                      </span>
                    } @else {
                      <span [class.font-medium]="col.id === 'name'" [class.text-slate-900]="col.id === 'name'">
                        {{ col.cell(row) }}
                      </span>
                    }
                  </td>
                }
                @if (rowActions(); as actionsTpl) {
                  <td class="px-3 py-2 text-right" (click)="$event.stopPropagation()">
                    <ng-container
                      [ngTemplateOutlet]="actionsTpl"
                      [ngTemplateOutletContext]="{ $implicit: row }"
                    />
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
        @if (footer()) {
          <div class="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
            {{ footer() }}
          </div>
        }
      </div>
    }
  `,
})
export class ResourceTableComponent<T = unknown> {
  readonly columns = input.required<ResourceColumn<T>[]>();
  readonly rows = input.required<T[]>();
  readonly trackBy = input<(row: T) => string>((row) =>
    String((row as { id?: string }).id ?? JSON.stringify(row)),
  );
  readonly selectable = input(false);
  readonly selectedIds = input<Set<string>>(new Set());
  readonly sortColumn = input<string | null>(null);
  readonly sortDir = input<'asc' | 'desc'>('asc');
  readonly emptyTitle = input('No items');
  readonly emptyDescription = input('');
  readonly footer = input<string>('');

  readonly rowActions = contentChild<TemplateRef<{ $implicit: T }>>('rowActions');

  readonly sort = output<string>();
  readonly rowClick = output<T>();
  readonly selectionChange = output<Set<string>>();

  allSelected(): boolean {
    const rows = this.rows();
    if (!rows.length) {
      return false;
    }
    const sel = this.selectedIds();
    return rows.every((r) => sel.has(this.trackBy()(r)));
  }

  isSelected(row: T): boolean {
    return this.selectedIds().has(this.trackBy()(row));
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set<string>();
    if (checked) {
      for (const r of this.rows()) {
        next.add(this.trackBy()(r));
      }
    }
    this.selectionChange.emit(next);
  }

  toggleRow(row: T, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.selectedIds());
    const id = this.trackBy()(row);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.selectionChange.emit(next);
  }

  badgeClass(value: string): string {
    const v = value.toLowerCase();
    if (v === 'running' || v === 'run' || v === 'online' || v === 'healthy') {
      return 'bg-emerald-50 text-emerald-700';
    }
    if (v === 'stopped' || v === 'stop' || v === 'offline') {
      return 'bg-slate-100 text-slate-600';
    }
    if (v === 'paused' || v === 'warning' || v === 'watch') {
      return 'bg-amber-50 text-amber-700';
    }
    if (v === 'error' || v === 'critical') {
      return 'bg-rose-50 text-rose-700';
    }
    return 'bg-slate-100 text-slate-600';
  }
}
