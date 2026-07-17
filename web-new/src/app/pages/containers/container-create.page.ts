import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WizardShellComponent, WizardStep } from '../../shared/wizard-shell/wizard-shell.component';
import { ResourcesApi } from '../../core/api/resources.api';
import { ToastService } from '../../core/toast/toast.service';

@Component({
  selector: 'app-container-create-page',
  standalone: true,
  imports: [WizardShellComponent, FormsModule],
  template: `
    <app-wizard-shell
      title="Create container"
      subtitle="OCI · image from registry via backend"
      [steps]="steps"
      cancelLink="/containers"
      finishLabel="Create container"
      [canNext]="canNext()"
      [submitting]="submitting()"
      [(index)]="step"
      (finish)="submit()"
    >
      @switch (step()) {
        @case (0) {
          <h2 class="m-0 text-sm font-semibold">Image</h2>
          <label class="mt-3 block text-xs font-medium text-slate-700">
            Image reference
            <input
              class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-mono"
              [(ngModel)]="image"
              name="image"
              placeholder="docker.io/library/nginx:1.27-alpine"
            />
          </label>
          <p class="mt-2 text-[11px] text-slate-500">
            Pull is backend-mediated (Rule #13) — browser never talks to the registry.
          </p>
        }
        @case (1) {
          <h2 class="m-0 text-sm font-semibold">Identity</h2>
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
          </div>
        }
        @case (2) {
          <h2 class="m-0 text-sm font-semibold">Resources & ports</h2>
          <div class="mt-3 grid gap-3 sm:grid-cols-3">
            <label class="block text-xs font-medium text-slate-700">
              CPU limit
              <input
                type="number"
                min="0.1"
                step="0.1"
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                [(ngModel)]="cpu"
                name="cpu"
              />
            </label>
            <label class="block text-xs font-medium text-slate-700">
              Memory (MiB)
              <input
                type="number"
                min="64"
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                [(ngModel)]="memMiB"
                name="mem"
              />
            </label>
            <label class="block text-xs font-medium text-slate-700">
              Publish ports
              <input
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-mono"
                [(ngModel)]="ports"
                name="ports"
                placeholder="8080:80"
              />
            </label>
          </div>
        }
        @case (3) {
          <h2 class="m-0 text-sm font-semibold">Review</h2>
          <dl class="mt-3 space-y-1 text-xs">
            <div class="flex justify-between border-b border-slate-50 py-1">
              <dt class="text-slate-500">Image</dt>
              <dd class="font-mono text-[11px]">{{ image }}</dd>
            </div>
            <div class="flex justify-between border-b border-slate-50 py-1">
              <dt class="text-slate-500">Name / host</dt>
              <dd class="font-medium">{{ name }} @ {{ host }}</dd>
            </div>
            <div class="flex justify-between py-1">
              <dt class="text-slate-500">Limits</dt>
              <dd class="font-medium">{{ cpu }} CPU · {{ memMiB }} MiB · {{ ports || 'no ports' }}</dd>
            </div>
          </dl>
        }
      }
    </app-wizard-shell>
  `,
})
export class ContainerCreatePage {
  private readonly api = inject(ResourcesApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly steps: WizardStep[] = [
    { id: 'image', label: 'Image' },
    { id: 'identity', label: 'Identity' },
    { id: 'resources', label: 'Resources' },
    { id: 'review', label: 'Review' },
  ];

  readonly step = signal(0);
  readonly submitting = signal(false);

  image = 'docker.io/library/nginx:1.27-alpine';
  name = '';
  host = 'prod-node-01.lan';
  cpu = 1;
  memMiB = 256;
  ports = '8080:80';

  readonly canNext = computed(() => {
    if (this.step() === 0) return this.image.trim().length > 3;
    if (this.step() === 1) return this.name.trim().length >= 2;
    return true;
  });

  async submit(): Promise<void> {
    this.submitting.set(true);
    try {
      const res = await this.api.create('container.create', 'container_create_wizard', {
        name: this.name.trim(),
        image: this.image.trim(),
        host: this.host,
        cpu: this.cpu,
        memMiB: this.memMiB,
        ports: this.ports,
      });
      this.toast.success('Container create accepted', `Task ${res.taskId}`);
      await this.router.navigateByUrl('/containers');
    } catch (e) {
      this.toast.error('Create failed', e instanceof Error ? e.message : 'Unknown');
    } finally {
      this.submitting.set(false);
    }
  }
}
