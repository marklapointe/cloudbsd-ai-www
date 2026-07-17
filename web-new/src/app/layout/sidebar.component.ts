import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NAV_GROUPS } from '../core/nav/nav.config';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside
      class="flex w-sidebar shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white px-2 pb-3 pt-1.5"
    >
      @for (group of groups; track group.id) {
        <div
          class="px-2.5 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"
        >
          {{ group.label }}
        </div>
        <nav class="flex flex-col">
          @for (item of group.items; track item.id) {
            <a
              [routerLink]="item.path"
              routerLinkActive="!border-brand-500 !bg-gradient-to-r !from-blue-50 !to-blue-100 !font-semibold !text-brand-600"
              class="mb-px flex items-center rounded-md border-l-[3px] border-transparent px-3 py-1.5 text-xs text-slate-700 no-underline hover:bg-slate-50"
            >
              {{ item.label }}
            </a>
          }
        </nav>
      }

      <div class="mt-auto border-t border-slate-100 px-2.5 pt-3 text-[11px] text-slate-400">
        <div>Host: prod-node-01</div>
        <div>Uptime: —</div>
      </div>
    </aside>
  `,
})
export class SidebarComponent {
  readonly groups = NAV_GROUPS;
}
