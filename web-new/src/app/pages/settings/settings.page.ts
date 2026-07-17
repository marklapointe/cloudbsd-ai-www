import { Component, signal } from '@angular/core';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';

const TABS = [
  { id: 'cluster', label: 'Cluster identity' },
  { id: 'auth', label: 'Auth methods' },
  { id: 'hosts', label: 'Host defaults' },
  { id: 'network', label: 'Networking' },
  { id: 'storage', label: 'Storage defaults' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'licensing', label: 'Licensing' },
] as const;

/** Admin Settings only — not My Account (Rule #9). */
@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [PageHeaderComponent],
  template: `
    <app-page-header
      title="Settings"
      subtitle="Admin cluster configuration (not personal account)"
    />

    <div class="flex flex-col gap-3 lg:flex-row">
      <nav class="w-full shrink-0 lg:w-48">
        <ul class="space-y-0.5">
          @for (t of tabs; track t.id) {
            <li>
              <button
                type="button"
                class="w-full rounded-md px-3 py-1.5 text-left text-xs"
                [class.bg-brand-50]="tab() === t.id"
                [class.font-semibold]="tab() === t.id"
                [class.text-brand-600]="tab() === t.id"
                [class.text-slate-600]="tab() !== t.id"
                [class.hover:bg-slate-50]="tab() !== t.id"
                (click)="tab.set(t.id)"
              >
                {{ t.label }}
              </button>
            </li>
          }
        </ul>
      </nav>
      <div class="min-w-0 flex-1 rounded-shell border border-slate-200 bg-white p-4 text-xs text-slate-700">
        <h2 class="m-0 text-sm font-semibold text-slate-900">{{ currentLabel() }}</h2>
        <p class="mt-2 text-slate-500">
          Form fields bind to envelope actions later. Personal 2FA / theme live under
          <strong>My Account</strong>, never here.
        </p>
        @switch (tab()) {
          @case ('cluster') {
            <dl class="mt-4 space-y-2">
              <div>
                <dt class="font-medium text-slate-500">Cluster name</dt>
                <dd class="mt-0.5 rounded border border-slate-200 px-2 py-1.5">prod-lan</dd>
              </div>
              <div>
                <dt class="font-medium text-slate-500">VIP</dt>
                <dd class="mt-0.5 rounded border border-slate-200 px-2 py-1.5">10.0.10.1</dd>
              </div>
            </dl>
          }
          @case ('auth') {
            <ul class="mt-4 list-disc space-y-1 pl-5">
              <li>Local (PAM) — enabled</li>
              <li>Passkey — enabled</li>
              <li>TOTP — enabled</li>
              <li>LDAP / SAML — configure</li>
            </ul>
          }
          @case ('licensing') {
            <p class="mt-4">License status surfaces from backend; no browser-side license crypto.</p>
          }
          @default {
            <p class="mt-4 text-slate-500">Section scaffold — wire to Settings envelope actions in a later slice.</p>
          }
        }
      </div>
    </div>
  `,
})
export class SettingsPage {
  readonly tabs = TABS;
  readonly tab = signal<(typeof TABS)[number]['id']>('cluster');

  currentLabel(): string {
    return this.tabs.find((t) => t.id === this.tab())?.label || '';
  }
}
