import { Component } from '@angular/core';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [PageHeaderComponent],
  template: `
    <app-page-header title="About" subtitle="Product version and license" />
    <div class="max-w-lg space-y-3 rounded-shell border border-slate-200 bg-white p-5 text-xs text-slate-700">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-md text-sm font-bold text-white"
          style="background: var(--primary-grad)"
        >
          C
        </div>
        <div>
          <div class="text-base font-bold text-slate-900">CloudBSD Admin</div>
          <div class="text-slate-500">FreeBSD hypervisor control plane</div>
        </div>
      </div>
      <dl class="space-y-1.5">
        <div class="flex justify-between border-t border-slate-100 pt-2">
          <dt class="text-slate-500">UI</dt>
          <dd class="font-medium">web-new · Angular 20</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-slate-500">Wire</dt>
          <dd class="font-medium">envelope mocks (WIRE_PROTOCOL)</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-slate-500">Author</dt>
          <dd class="font-medium">Mark LaPointe</dd>
        </div>
      </dl>
    </div>
  `,
})
export class AboutPage {}
