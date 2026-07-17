import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WizardShellComponent, WizardStep } from '../../shared/wizard-shell/wizard-shell.component';
import { ResourcesApi } from '../../core/api/resources.api';
import { LibraryApi, BaseJail } from '../../core/api/library.api';
import { ToastService } from '../../core/toast/toast.service';

/**
 * Jail create — cached bases only (Rule #12). No freeform base URL.
 */
@Component({
  selector: 'app-jail-create-page',
  standalone: true,
  imports: [WizardShellComponent, FormsModule],
  template: `
    <app-wizard-shell
      title="Create jail"
      subtitle="FreeBSD jail · select cached base only (Rule #12)"
      [steps]="steps"
      cancelLink="/jails"
      finishLabel="Create jail"
      [canNext]="canNext()"
      [submitting]="submitting()"
      [(index)]="step"
      (finish)="submit()"
    >
      @switch (step()) {
        @case (0) {
          <h2 class="m-0 text-sm font-semibold text-slate-900">Base jail</h2>
          <p class="mt-1 text-xs text-slate-500">
            Choose a base from Library cache. Fetch from a configured repository if missing — never
            paste a freeform download URL.
          </p>
          @if (loadingBases()) {
            <p class="mt-3 text-xs text-slate-500">Loading cached bases…</p>
          } @else if (!bases().length) {
            <div class="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              No cached bases. Add a repository under Library and fetch a base first.
            </div>
          } @else {
            <div class="mt-3 space-y-2">
              @for (b of bases(); track b.id) {
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs"
                  [class.border-brand-500]="baseId() === b.id"
                  [class.bg-brand-50]="baseId() === b.id"
                  [class.border-slate-200]="baseId() !== b.id"
                  (click)="baseId.set(b.id)"
                >
                  <span>
                    <span class="font-semibold text-slate-800">{{ b.name }}</span>
                    <span class="ml-2 text-slate-500">{{ b.arch }} · {{ b.sourceRepo }}</span>
                  </span>
                </button>
              }
            </div>
          }
        }
        @case (1) {
          <h2 class="m-0 text-sm font-semibold text-slate-900">Identity</h2>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="block text-xs font-medium text-slate-700">
              Name
              <input
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                [(ngModel)]="name"
                name="name"
              />
            </label>
            <label class="block text-xs font-medium text-slate-700">
              Hostname
              <input
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                [(ngModel)]="hostname"
                name="hostname"
                placeholder="svc.example.lan"
              />
            </label>
            <label class="block text-xs font-medium text-slate-700">
              Host
              <select
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                [(ngModel)]="host"
                name="host"
              >
                <option value="prod-node-01.lan">prod-node-01.lan</option>
                <option value="prod-node-02.lan">prod-node-02.lan</option>
              </select>
            </label>
            <label class="block text-xs font-medium text-slate-700">
              IP
              <input
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                [(ngModel)]="ip"
                name="ip"
                placeholder="10.0.10.x"
              />
            </label>
          </div>
        }
        @case (2) {
          <h2 class="m-0 text-sm font-semibold text-slate-900">Resources</h2>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="block text-xs font-medium text-slate-700">
              vCPUs
              <input
                type="number"
                min="1"
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                [(ngModel)]="vcpus"
                name="vcpus"
              />
            </label>
            <label class="block text-xs font-medium text-slate-700">
              Memory (GiB)
              <input
                type="number"
                min="1"
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                [(ngModel)]="memGiB"
                name="mem"
              />
            </label>
          </div>
        }
        @case (3) {
          <h2 class="m-0 text-sm font-semibold text-slate-900">Review</h2>
          <dl class="mt-3 space-y-1 text-xs">
            <div class="flex justify-between border-b border-slate-50 py-1">
              <dt class="text-slate-500">Base</dt>
              <dd class="font-medium">{{ selectedBase()?.name || '—' }}</dd>
            </div>
            <div class="flex justify-between border-b border-slate-50 py-1">
              <dt class="text-slate-500">Name / host</dt>
              <dd class="font-medium">{{ name }} @ {{ host }}</dd>
            </div>
            <div class="flex justify-between border-b border-slate-50 py-1">
              <dt class="text-slate-500">Hostname / IP</dt>
              <dd class="font-medium">{{ hostname }} · {{ ip }}</dd>
            </div>
            <div class="flex justify-between py-1">
              <dt class="text-slate-500">Resources</dt>
              <dd class="font-medium">{{ vcpus }} vCPU · {{ memGiB }} GiB</dd>
            </div>
          </dl>
        }
      }
    </app-wizard-shell>
  `,
})
export class JailCreatePage implements OnInit {
  private readonly api = inject(ResourcesApi);
  private readonly library = inject(LibraryApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly steps: WizardStep[] = [
    { id: 'base', label: 'Base' },
    { id: 'identity', label: 'Identity' },
    { id: 'resources', label: 'Resources' },
    { id: 'review', label: 'Review' },
  ];

  readonly step = signal(0);
  readonly bases = signal<BaseJail[]>([]);
  readonly baseId = signal('');
  readonly loadingBases = signal(true);
  readonly submitting = signal(false);

  name = '';
  hostname = '';
  host = 'prod-node-01.lan';
  ip = '10.0.10.50';
  vcpus = 2;
  memGiB = 1;

  readonly selectedBase = computed(() =>
    this.bases().find((b) => b.id === this.baseId()),
  );

  readonly canNext = computed(() => {
    switch (this.step()) {
      case 0:
        return !!this.baseId();
      case 1:
        return this.name.trim().length >= 2 && !!this.hostname.trim();
      default:
        return true;
    }
  });

  ngOnInit(): void {
    void this.loadBases();
  }

  private async loadBases(): Promise<void> {
    this.loadingBases.set(true);
    try {
      const bases = await this.library.listBases();
      this.bases.set(bases);
      if (bases[0]) {
        this.baseId.set(bases[0].id);
      }
    } finally {
      this.loadingBases.set(false);
    }
  }

  async submit(): Promise<void> {
    this.submitting.set(true);
    try {
      const res = await this.api.create('jail.create', 'jail_create_wizard', {
        name: this.name.trim(),
        hostname: this.hostname.trim(),
        host: this.host,
        ip: this.ip,
        vcpus: this.vcpus,
        memGiB: this.memGiB,
        baseId: this.baseId(),
      });
      this.toast.success('Jail create accepted', `Task ${res.taskId}`);
      await this.router.navigateByUrl('/jails');
    } catch (e) {
      this.toast.error('Create failed', e instanceof Error ? e.message : 'Unknown');
    } finally {
      this.submitting.set(false);
    }
  }
}
