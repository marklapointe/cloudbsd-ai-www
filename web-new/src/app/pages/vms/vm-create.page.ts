import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WizardShellComponent, WizardStep } from '../../shared/wizard-shell/wizard-shell.component';
import { ResourcesApi } from '../../core/api/resources.api';
import { ToastService } from '../../core/toast/toast.service';

@Component({
  selector: 'app-vm-create-page',
  standalone: true,
  imports: [WizardShellComponent, FormsModule],
  template: `
    <app-wizard-shell
      title="Create virtual machine"
      subtitle="bhyve · describe → review → execute"
      [steps]="steps"
      cancelLink="/vms"
      finishLabel="Create VM"
      [canNext]="canNext()"
      [submitting]="submitting()"
      [(index)]="step"
      (finish)="submit()"
    >
      @switch (step()) {
        @case (0) {
          <h2 class="m-0 text-sm font-semibold text-slate-900">Template</h2>
          <p class="mt-1 text-xs text-slate-500">Pick a guest template for install media.</p>
          <div class="mt-3 grid gap-2 sm:grid-cols-2">
            @for (t of templates; track t.id) {
              <button
                type="button"
                class="rounded-md border px-3 py-2 text-left text-xs"
                [class.border-brand-500]="template() === t.id"
                [class.bg-brand-50]="template() === t.id"
                [class.border-slate-200]="template() !== t.id"
                (click)="template.set(t.id)"
              >
                <div class="font-semibold text-slate-800">{{ t.label }}</div>
                <div class="text-slate-500">{{ t.hint }}</div>
              </button>
            }
          </div>
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
                required
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
          <h2 class="m-0 text-sm font-semibold text-slate-900">Resources</h2>
          <div class="mt-3 grid gap-3 sm:grid-cols-3">
            <label class="block text-xs font-medium text-slate-700">
              vCPUs
              <input
                type="number"
                min="1"
                max="64"
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                [(ngModel)]="vcpu"
                name="vcpu"
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
            <label class="block text-xs font-medium text-slate-700">
              Disk (GiB)
              <input
                type="number"
                min="8"
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                [(ngModel)]="diskGiB"
                name="disk"
              />
            </label>
          </div>
        }
        @case (3) {
          <h2 class="m-0 text-sm font-semibold text-slate-900">Network</h2>
          <label class="mt-3 block text-xs font-medium text-slate-700">
            Bridge
            <select
              class="mt-1 w-full max-w-xs rounded-md border border-slate-300 px-2 py-1.5 text-xs"
              [(ngModel)]="bridge"
              name="bridge"
            >
              <option value="vm-public">vm-public (10.0.10.0/24)</option>
              <option value="storage">storage (10.0.20.0/24)</option>
            </select>
          </label>
        }
        @case (4) {
          <h2 class="m-0 text-sm font-semibold text-slate-900">Review</h2>
          <dl class="mt-3 space-y-1 text-xs text-slate-700">
            <div class="flex justify-between border-b border-slate-50 py-1">
              <dt class="text-slate-500">Template</dt>
              <dd class="font-medium">{{ template() }}</dd>
            </div>
            <div class="flex justify-between border-b border-slate-50 py-1">
              <dt class="text-slate-500">Name</dt>
              <dd class="font-medium">{{ name }}</dd>
            </div>
            <div class="flex justify-between border-b border-slate-50 py-1">
              <dt class="text-slate-500">Host</dt>
              <dd class="font-medium">{{ host }}</dd>
            </div>
            <div class="flex justify-between border-b border-slate-50 py-1">
              <dt class="text-slate-500">Compute</dt>
              <dd class="font-medium">{{ vcpu }} vCPU · {{ memGiB }} GiB · {{ diskGiB }} GiB disk</dd>
            </div>
            <div class="flex justify-between py-1">
              <dt class="text-slate-500">Network</dt>
              <dd class="font-medium">{{ bridge }}</dd>
            </div>
          </dl>
          <p class="mt-3 text-[11px] text-slate-500">
            Submit creates a backend Task (Rule #1 / #13). No host tools from the browser.
          </p>
        }
      }
    </app-wizard-shell>
  `,
})
export class VmCreatePage {
  private readonly api = inject(ResourcesApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly steps: WizardStep[] = [
    { id: 'template', label: 'Template' },
    { id: 'identity', label: 'Identity' },
    { id: 'resources', label: 'Resources' },
    { id: 'network', label: 'Network' },
    { id: 'review', label: 'Review' },
  ];

  readonly templates = [
    { id: 'freebsd-14', label: 'FreeBSD 14.2', hint: 'bhyve · UEFI' },
    { id: 'debian-12', label: 'Debian 12', hint: 'cloud image' },
    { id: 'ubuntu-24', label: 'Ubuntu 24.04', hint: 'cloud image' },
    { id: 'blank', label: 'Blank', hint: 'ISO attach later' },
  ];

  readonly step = signal(0);
  readonly template = signal('freebsd-14');
  readonly submitting = signal(false);

  name = '';
  host = 'prod-node-01.lan';
  vcpu = 2;
  memGiB = 4;
  diskGiB = 40;
  bridge = 'vm-public';

  readonly canNext = computed(() => {
    switch (this.step()) {
      case 0:
        return !!this.template();
      case 1:
        return this.name.trim().length >= 2;
      default:
        return true;
    }
  });

  async submit(): Promise<void> {
    this.submitting.set(true);
    try {
      const res = await this.api.create('vm.create', 'vm_create_wizard', {
        name: this.name.trim(),
        template: this.template(),
        host: this.host,
        vcpu: this.vcpu,
        memGiB: this.memGiB,
        diskGiB: this.diskGiB,
        bridge: this.bridge,
      });
      this.toast.success('VM create accepted', `Task ${res.taskId} · ${res.id}`);
      await this.router.navigateByUrl('/vms');
    } catch (e) {
      this.toast.error('Create failed', e instanceof Error ? e.message : 'Unknown');
    } finally {
      this.submitting.set(false);
    }
  }
}
