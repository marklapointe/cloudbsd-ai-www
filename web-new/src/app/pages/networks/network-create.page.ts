import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WizardShellComponent, WizardStep } from '../../shared/wizard-shell/wizard-shell.component';
import { ResourcesApi } from '../../core/api/resources.api';
import { ToastService } from '../../core/toast/toast.service';

@Component({
  selector: 'app-network-create-page',
  standalone: true,
  imports: [WizardShellComponent, FormsModule],
  template: `
    <app-wizard-shell
      title="Create network"
      subtitle="Bridge / VLAN / IP pool"
      [steps]="steps"
      cancelLink="/networks"
      finishLabel="Create network"
      [canNext]="canNext()"
      [submitting]="submitting()"
      [(index)]="step"
      (finish)="submit()"
    >
      @switch (step()) {
        @case (0) {
          <h2 class="m-0 text-sm font-semibold">Type & subnet</h2>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="block text-xs font-medium text-slate-700">
              Type
              <select
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                [(ngModel)]="type"
                name="type"
              >
                <option value="bridge">bridge</option>
                <option value="vlan">vlan</option>
                <option value="pool">IP pool</option>
              </select>
            </label>
            <label class="block text-xs font-medium text-slate-700">
              Name
              <input
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                [(ngModel)]="name"
                name="name"
              />
            </label>
            <label class="block text-xs font-medium text-slate-700">
              CIDR
              <input
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs"
                [(ngModel)]="cidr"
                name="cidr"
                placeholder="10.0.30.0/24"
              />
            </label>
            <label class="block text-xs font-medium text-slate-700">
              VLAN ID (optional)
              <input
                type="number"
                min="1"
                max="4094"
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                [(ngModel)]="vlan"
                name="vlan"
              />
            </label>
          </div>
        }
        @case (1) {
          <h2 class="m-0 text-sm font-semibold">DHCP / pool</h2>
          <label class="mt-3 flex items-center gap-2 text-xs">
            <input type="checkbox" [(ngModel)]="dhcp" name="dhcp" />
            Enable DHCP range
          </label>
          @if (dhcp) {
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <label class="block text-xs font-medium text-slate-700">
                Range start
                <input
                  class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs"
                  [(ngModel)]="rangeStart"
                  name="start"
                />
              </label>
              <label class="block text-xs font-medium text-slate-700">
                Range end
                <input
                  class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs"
                  [(ngModel)]="rangeEnd"
                  name="end"
                />
              </label>
            </div>
          }
        }
        @case (2) {
          <h2 class="m-0 text-sm font-semibold">Review</h2>
          <dl class="mt-3 space-y-1 text-xs">
            <div class="flex justify-between border-b border-slate-50 py-1">
              <dt class="text-slate-500">Name / type</dt>
              <dd class="font-medium">{{ name }} ({{ type }})</dd>
            </div>
            <div class="flex justify-between border-b border-slate-50 py-1">
              <dt class="text-slate-500">CIDR / VLAN</dt>
              <dd class="font-medium">{{ cidr }} · vlan {{ vlan || '—' }}</dd>
            </div>
            <div class="flex justify-between py-1">
              <dt class="text-slate-500">DHCP</dt>
              <dd class="font-medium">
                {{ dhcp ? rangeStart + ' – ' + rangeEnd : 'disabled' }}
              </dd>
            </div>
          </dl>
        }
      }
    </app-wizard-shell>
  `,
})
export class NetworkCreatePage {
  private readonly api = inject(ResourcesApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly steps: WizardStep[] = [
    { id: 'subnet', label: 'Subnet' },
    { id: 'dhcp', label: 'DHCP' },
    { id: 'review', label: 'Review' },
  ];
  readonly step = signal(0);
  readonly submitting = signal(false);

  type = 'bridge';
  name = 'app-net';
  cidr = '10.0.30.0/24';
  vlan: number | null = 30;
  dhcp = true;
  rangeStart = '10.0.30.100';
  rangeEnd = '10.0.30.200';

  readonly canNext = computed(() => {
    if (this.step() === 0) return this.name.trim().length >= 2 && this.cidr.includes('/');
    return true;
  });

  async submit(): Promise<void> {
    this.submitting.set(true);
    try {
      const res = await this.api.create('network.create', 'network_create_wizard', {
        name: this.name,
        type: this.type,
        cidr: this.cidr,
        vlan: this.vlan,
        dhcp: this.dhcp,
        rangeStart: this.rangeStart,
        rangeEnd: this.rangeEnd,
      });
      this.toast.success('Network create accepted', `Task ${res.taskId}`);
      await this.router.navigateByUrl('/networks');
    } catch (e) {
      this.toast.error('Create failed', e instanceof Error ? e.message : 'Unknown');
    } finally {
      this.submitting.set(false);
    }
  }
}
