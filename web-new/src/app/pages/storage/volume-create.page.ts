import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WizardShellComponent, WizardStep } from '../../shared/wizard-shell/wizard-shell.component';
import { ResourcesApi } from '../../core/api/resources.api';
import { ToastService } from '../../core/toast/toast.service';

@Component({
  selector: 'app-volume-create-page',
  standalone: true,
  imports: [WizardShellComponent, FormsModule],
  template: `
    <app-wizard-shell
      title="Create volume"
      subtitle="ZFS dataset · backend-mediated"
      [steps]="steps"
      cancelLink="/storage"
      finishLabel="Create volume"
      [canNext]="canNext()"
      [submitting]="submitting()"
      [(index)]="step"
      (finish)="submit()"
    >
      @switch (step()) {
        @case (0) {
          <h2 class="m-0 text-sm font-semibold">Basics</h2>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="block text-xs font-medium text-slate-700">
              Dataset name
              <input
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs"
                [(ngModel)]="name"
                name="name"
                placeholder="tank/apps/mydata"
              />
            </label>
            <label class="block text-xs font-medium text-slate-700">
              Pool
              <select
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                [(ngModel)]="pool"
                name="pool"
              >
                <option value="tank">tank</option>
                <option value="fast">fast</option>
              </select>
            </label>
            <label class="block text-xs font-medium text-slate-700">
              Mountpoint
              <input
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs"
                [(ngModel)]="mountpoint"
                name="mount"
                placeholder="/mnt/tank/apps/mydata"
              />
            </label>
            <label class="block text-xs font-medium text-slate-700">
              Quota (GiB, 0 = none)
              <input
                type="number"
                min="0"
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                [(ngModel)]="quotaGiB"
                name="quota"
              />
            </label>
          </div>
        }
        @case (1) {
          <h2 class="m-0 text-sm font-semibold">Properties</h2>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="block text-xs font-medium text-slate-700">
              Compression
              <select
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                [(ngModel)]="compression"
                name="comp"
              >
                <option value="lz4">lz4</option>
                <option value="zstd-3">zstd-3</option>
                <option value="off">off</option>
              </select>
            </label>
            <label class="block text-xs font-medium text-slate-700">
              Encryption
              <select
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                [(ngModel)]="encryption"
                name="enc"
              >
                <option value="aes-256-gcm">aes-256-gcm</option>
                <option value="off">off</option>
              </select>
            </label>
          </div>
        }
        @case (2) {
          <h2 class="m-0 text-sm font-semibold">Review</h2>
          <dl class="mt-3 space-y-1 text-xs">
            <div class="flex justify-between border-b border-slate-50 py-1">
              <dt class="text-slate-500">Dataset</dt>
              <dd class="font-mono">{{ name }}</dd>
            </div>
            <div class="flex justify-between border-b border-slate-50 py-1">
              <dt class="text-slate-500">Pool / mount</dt>
              <dd class="font-medium">{{ pool }} · {{ mountpoint }}</dd>
            </div>
            <div class="flex justify-between py-1">
              <dt class="text-slate-500">Props</dt>
              <dd class="font-medium">
                {{ compression }} · {{ encryption }} · quota {{ quotaGiB || 'none' }}
              </dd>
            </div>
          </dl>
        }
      }
    </app-wizard-shell>
  `,
})
export class VolumeCreatePage {
  private readonly api = inject(ResourcesApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly steps: WizardStep[] = [
    { id: 'basics', label: 'Basics' },
    { id: 'props', label: 'Properties' },
    { id: 'review', label: 'Review' },
  ];
  readonly step = signal(0);
  readonly submitting = signal(false);

  name = 'tank/apps/newdata';
  pool = 'tank';
  mountpoint = '/mnt/tank/apps/newdata';
  quotaGiB = 0;
  compression = 'zstd-3';
  encryption = 'aes-256-gcm';

  readonly canNext = computed(() => {
    if (this.step() === 0) return this.name.includes('/') && this.name.length > 3;
    return true;
  });

  async submit(): Promise<void> {
    this.submitting.set(true);
    try {
      const res = await this.api.create('volume.create', 'volume_create_wizard', {
        name: this.name,
        pool: this.pool,
        mountpoint: this.mountpoint,
        quotaGiB: this.quotaGiB,
        compression: this.compression,
        encryption: this.encryption,
      });
      this.toast.success('Volume create accepted', `Task ${res.taskId}`);
      await this.router.navigateByUrl('/storage');
    } catch (e) {
      this.toast.error('Create failed', e instanceof Error ? e.message : 'Unknown');
    } finally {
      this.submitting.set(false);
    }
  }
}
