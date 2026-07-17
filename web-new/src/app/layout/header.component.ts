import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { LiveIndicatorComponent } from './live-indicator.component';
import { NotificationsDropdownComponent } from './notifications-dropdown.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, LiveIndicatorComponent, NotificationsDropdownComponent],
  template: `
    <header
      class="sticky top-0 z-20 flex h-header items-center gap-2 border-b border-slate-200 bg-white px-4"
    >
      <div
        class="flex h-[30px] w-[30px] items-center justify-center rounded-md text-sm font-bold text-white"
        style="background: var(--primary-grad)"
        aria-hidden="true"
      >
        C
      </div>
      <span class="text-base font-bold text-slate-900">CloudBSD Admin</span>
      <span class="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
        >prod-node-01.lan</span
      >

      <div class="ml-auto flex items-center gap-3 text-xs text-slate-500">
        <app-live-indicator />
        <app-notifications-dropdown />

        <div class="relative">
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
            style="background: var(--primary-grad)"
            [attr.aria-expanded]="menuOpen()"
            aria-haspopup="menu"
            (click)="menuOpen.set(!menuOpen())"
          >
            {{ initial() }}
          </button>

          @if (menuOpen()) {
            <div
              class="absolute right-0 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              role="menu"
            >
              <a
                routerLink="/account"
                role="menuitem"
                class="block px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                (click)="menuOpen.set(false)"
                >Profile</a
              >
              <a
                routerLink="/account"
                role="menuitem"
                class="block px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                (click)="menuOpen.set(false)"
                >Preferences</a
              >
              <a
                routerLink="/account"
                role="menuitem"
                class="block px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                (click)="menuOpen.set(false)"
                >API tokens</a
              >
              <a
                routerLink="/about"
                role="menuitem"
                class="block px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                (click)="menuOpen.set(false)"
                >About</a
              >
              <div class="my-1 border-t border-slate-100"></div>
              <button
                type="button"
                role="menuitem"
                class="block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                (click)="signOut()"
              >
                Sign out
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  private readonly auth = inject(AuthService);

  readonly menuOpen = signal(false);

  initial(): string {
    const name = this.auth.user()?.displayName || this.auth.user()?.username || '?';
    return name.charAt(0).toUpperCase();
  }

  signOut(): void {
    this.menuOpen.set(false);
    void this.auth.logout();
  }
}
