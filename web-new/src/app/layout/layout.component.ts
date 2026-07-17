import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { StreamService } from '../core/stream/stream.service';
import { ToastHostComponent } from '../shared/toast-host/toast-host.component';
import { HeaderComponent } from './header.component';
import { SidebarComponent } from './sidebar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, ToastHostComponent],
  template: `
    <div class="flex min-h-screen flex-col">
      <app-header />
      <div class="flex min-h-0 flex-1">
        <app-sidebar />
        <main class="min-w-0 flex-1 overflow-y-auto px-[18px] py-3.5">
          <router-outlet />
        </main>
      </div>

      <app-toast-host />

      @if (auth.frosted()) {
        <div class="frost-out" role="alertdialog" aria-modal="true" aria-labelledby="frost-title">
          <div class="max-w-sm rounded-shell border border-slate-200 bg-white p-6 shadow-xl">
            <h2 id="frost-title" class="m-0 text-base font-semibold text-slate-900">Session ended</h2>
            <p class="mt-2 text-sm text-slate-600">
              Your session is no longer valid. Sign in again to continue.
            </p>
            <a
              href="/login"
              class="mt-4 inline-flex rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white no-underline"
            >
              Sign in
            </a>
          </div>
        </div>
      }
    </div>
  `,
})
export class LayoutComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly stream = inject(StreamService);

  ngOnInit(): void {
    this.stream.connect();
  }
}
