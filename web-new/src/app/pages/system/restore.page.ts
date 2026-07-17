import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WizardShellComponent, WizardStep } from '../../shared/wizard-shell/wizard-shell.component';
import { ResourcesApi } from '../../core/api/resources.api';
import { EnvelopeClient } from '../../core/protocol/envelope.client';
import { firstPayload } from '../../core/protocol/envelope.types';
import { ToastService } from '../../core/toast/toast.service';

interface BackupPick {
  id: string;
  name: string;
  resource: string;
  takenAt: string;
  sizeLabel: string;
}

@Component({
  selector: 'app-restore-page',
  standalone: true,
  imports: [WizardShellComponent, FormsModule],
  template: `
    <app-wizard-shell
      title="Restore from backup"
      subtitle="Pick backup → target → review → Task"
      [steps]="steps"
      cancelLink="/system"
      finishLabel="Start restore"
      [canNext]="canNext()"
      [submitting]="submitting()"
      [(index)]="step"
      (finish)="submit()"
    >
      @switch (step()) {
        @case (0) {
          <h2 class="m-0 text-sm font-semibold">Pick backup</h2>
          @if (loading()) {
            <p class="mt-3 text-xs text-slate-500">Loading backups…</p>
          } @else {
            <div class="mt-3 space-y-2">
              @for (b of backups(); track b.id) {
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs"
                  [class.border-brand-500]="backupId() === b.id"
                  [class.bg-brand-50]="backupId() === b.id"
                  [class.border-slate-200]="backupId() !== b.id"
                  (click)="backupId.set(b.id)"
                >
                  <span>
                    <span class="font-semibold">{{ b.name }}</span>
                    <span class="ml-2 text-slate-500">{{ b.resource }}</span>
                  </span>
                  <span class="text-slate-400">{{ b.sizeLabel }} · {{ b.takenAt }}</span>
                </button>
              }
            </div>
          }
        }
        @case (1) {
          <h2 class="m-0 text-sm font-semibold">Target</h2>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="block text-xs font-medium text-slate-700">
              Mode
              <select
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                [(ngModel)]="mode"
                name="mode"
              >
                <option value="inplace">In-place overwrite</option>
                <option value="new">Restore as new resource</option>
              </select>
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
            @if (mode === 'new') {
              <label class="block text-xs font-medium text-slate-700 sm:col-span-2">
                New name
                <input
                  class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  [(ngModel)]="newName"
                  name="newName"
                />
              </label>
            }
          </div>
        }
        @case (2) {
          <h2 class="m-0 text-sm font-semibold">Review</h2>
          <dl class="mt-3 space-y-1 text-xs">
            <div class="flex justify-between border-b border-slate-50 py-1">
              <dt class="text-slate-500">Backup</dt>
              <dd class="font-medium">{{ selected()?.name }}</dd>
            </div>
            <div class="flex justify-between border-b border-slate-50 py-1">
              <dt class="text-slate-500">Mode</dt>
              <dd class="font-medium">{{ mode }}</dd>
            </div>
            <div class="flex justify-between py-1">
              <dt class="text-slate-500">Host / name</dt>
              <dd class="font-medium">{{ host }} · {{ mode === 'new' ? newName : '(inplace)' }}</dd>
            </div>
          </dl>
          <p class="mt-3 text-[11px] text-amber-800">
            Restore is a long-running Task. Preflight runs on submit in full product.
          </p>
        }
      }
    </app-wizard-shell>
  `,
})
export class RestorePage implements OnInit {
  private readonly client = inject(EnvelopeClient);
  private readonly api = inject(ResourcesApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly steps: WizardStep[] = [
    { id: 'pick', label: 'Backup' },
    { id: 'target', label: 'Target' },
    { id: 'review', label: 'Review' },
  ];
  readonly step = signal(0);
  readonly loading = signal(true);
  readonly backups = signal<BackupPick[]>([]);
  readonly backupId = signal('');
  readonly submitting = signal(false);

  mode: 'inplace' | 'new' = 'new';
  host = 'prod-node-01.lan';
  newName = 'restored-vm';

  readonly selected = computed(() =>
    this.backups().find((b) => b.id === this.backupId()),
  );

  readonly canNext = computed(() => {
    if (this.step() === 0) return !!this.backupId();
    if (this.step() === 1 && this.mode === 'new') return this.newName.trim().length >= 2;
    return true;
  });

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const env = await this.client.exchange({
        what: 'backups.list',
        where: 'restore_wizard',
      });
      const batch = firstPayload<{ items: BackupPick[] }>(env, 'backups.batch');
      const items = batch?.data?.items || [
        {
          id: 'bk-1',
          name: 'nextcloud-daily',
          resource: 'vm-nextcloud',
          takenAt: '2026-07-15',
          sizeLabel: '12 GiB',
        },
        {
          id: 'bk-2',
          name: 'jellyfin-weekly',
          resource: 'vm-jellyfin',
          takenAt: '2026-07-12',
          sizeLabel: '48 GiB',
        },
      ];
      this.backups.set(items);
      if (items[0]) this.backupId.set(items[0].id);
    } finally {
      this.loading.set(false);
    }
  }

  async submit(): Promise<void> {
    this.submitting.set(true);
    try {
      const res = await this.api.create('backup.restore', 'restore_wizard', {
        backupId: this.backupId(),
        mode: this.mode,
        host: this.host,
        newName: this.newName,
      });
      this.toast.success('Restore started', `Task ${res.taskId}`);
      await this.router.navigateByUrl('/tasks');
    } catch (e) {
      this.toast.error('Restore failed', e instanceof Error ? e.message : 'Unknown');
    } finally {
      this.submitting.set(false);
    }
  }
}
