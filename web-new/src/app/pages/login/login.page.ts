import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-surface-page px-4">
      <div class="w-full max-w-sm rounded-shell border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-5 flex items-center gap-2">
          <div
            class="flex h-9 w-9 items-center justify-center rounded-md text-sm font-bold text-white"
            style="background: var(--primary-grad)"
          >
            C
          </div>
          <div>
            <div class="text-base font-bold text-slate-900">CloudBSD Admin</div>
            <div class="text-[11px] text-slate-500">Sign in to continue</div>
          </div>
        </div>

        <form class="flex flex-col gap-3" (ngSubmit)="submit()">
          <label class="block text-xs font-medium text-slate-700">
            Username
            <input
              name="username"
              [(ngModel)]="username"
              autocomplete="username"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              required
            />
          </label>
          <label class="block text-xs font-medium text-slate-700">
            Password
            <input
              type="password"
              name="password"
              [(ngModel)]="password"
              autocomplete="current-password"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              required
            />
          </label>

          @if (error()) {
            <p class="m-0 text-xs text-rose-600" role="alert">{{ error() }}</p>
          }

          <button
            type="submit"
            class="mt-1 rounded-md bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            [disabled]="busy()"
          >
            {{ busy() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <p class="mt-4 text-[11px] leading-relaxed text-slate-400">
          Session cookie auth against Admin backend only (Rule #13). Dev shell falls back to a local
          session if the API is unavailable.
        </p>
        <p class="mt-2 text-center text-[11px]">
          <a href="/onboarding" class="text-brand-600 no-underline hover:underline"
            >First-run onboarding</a
          >
        </p>
      </div>
    </div>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);

  username = 'admin';
  password = '';
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.login(this.username, this.password);
    } catch {
      this.error.set('Invalid credentials or backend unavailable.');
    } finally {
      this.busy.set(false);
    }
  }
}
