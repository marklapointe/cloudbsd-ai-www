import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';

const TABS = [
  { id: 'backups', label: 'Backups' },
  { id: 'updates', label: 'Updates' },
  { id: 'diagnostics', label: 'Diagnostics' },
  { id: 'exports', label: 'Exports' },
  { id: 'maintenance', label: 'Maintenance' },
] as const;

/** Operate → System (Rule #9). Audit prefers Observe. */
@Component({
  selector: 'app-system-page',
  standalone: true,
  imports: [PageHeaderComponent, RouterLink],
  template: `
    <app-page-header
      title="System"
      subtitle="Backups, updates, diagnostics, exports, maintenance"
    />

    <div class="mb-3 flex flex-wrap gap-1 border-b border-slate-200">
      @for (t of tabs; track t.id) {
        <button
          type="button"
          class="-mb-px border-b-2 px-3 py-2 text-xs font-medium"
          [class.border-brand-500]="tab() === t.id"
          [class.text-brand-600]="tab() === t.id"
          [class.border-transparent]="tab() !== t.id"
          [class.text-slate-500]="tab() !== t.id"
          (click)="tab.set(t.id)"
        >
          {{ t.label }}
        </button>
      }
    </div>

    <div class="rounded-shell border border-slate-200 bg-white p-4 text-xs text-slate-700">
      @switch (tab()) {
        @case ('backups') {
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 class="m-0 text-sm font-semibold">Backup policies & runs</h2>
              <p class="mt-2 text-slate-500">Policies and job history — Task tracking for long runs.</p>
            </div>
            <a
              routerLink="/system/restore"
              class="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white no-underline"
            >
              Restore…
            </a>
          </div>
        }
        @case ('updates') {
          <h2 class="m-0 text-sm font-semibold">Updates</h2>
          <ul class="mt-2 list-disc pl-5">
            <li>Admin UI / backend packages</li>
            <li>Host agents</li>
            <li>MCP server images</li>
            <li>FreeBSD base (coordinated)</li>
          </ul>
        }
        @case ('diagnostics') {
          <h2 class="m-0 text-sm font-semibold">Diagnostics</h2>
          <p class="mt-2 text-slate-500">
            Auth capabilities + preflight diagnostics (merged from legacy Status / 92 / 93).
          </p>
        }
        @case ('exports') {
          <h2 class="m-0 text-sm font-semibold">Support bundle export</h2>
          <p class="mt-2 text-slate-500">Backend builds the bundle; UI only requests + downloads.</p>
        }
        @case ('maintenance') {
          <h2 class="m-0 text-sm font-semibold">Maintenance</h2>
          <p class="mt-2 text-slate-500">Drain-all, maintenance mode — always via preflight + confirm.</p>
        }
      }
    </div>
  `,
})
export class SystemPage {
  readonly tabs = TABS;
  readonly tab = signal<(typeof TABS)[number]['id']>('backups');
}
