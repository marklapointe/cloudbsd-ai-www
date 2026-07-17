import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WizardShellComponent, WizardStep } from '../../shared/wizard-shell/wizard-shell.component';
import { ToastService } from '../../core/toast/toast.service';
import { AuthService } from '../../core/auth/auth.service';

/** Day-1 / first-login path — single wizard (catalog §4.3). */
@Component({
  selector: 'app-onboarding-page',
  standalone: true,
  imports: [WizardShellComponent, FormsModule],
  template: `
    <app-wizard-shell
      title="Welcome to CloudBSD Admin"
      subtitle="First-run setup"
      [steps]="steps"
      cancelLink="/dashboard"
      cancelLabel="Skip for now"
      finishLabel="Finish"
      [canNext]="canNext()"
      [submitting]="submitting()"
      [(index)]="step"
      (finish)="finish()"
    >
      @switch (step()) {
        @case (0) {
          <h2 class="m-0 text-sm font-semibold">Welcome</h2>
          <p class="mt-2 text-xs text-slate-600">
            This control plane manages bhyve VMs, jails, OCI containers, and ZFS on FreeBSD.
            Management is the default; view-only is an auditor role.
          </p>
        }
        @case (1) {
          <h2 class="m-0 text-sm font-semibold">Cluster identity</h2>
          <label class="mt-3 block text-xs font-medium text-slate-700">
            Cluster name
            <input
              class="mt-1 w-full max-w-sm rounded-md border border-slate-300 px-2 py-1.5 text-xs"
              [(ngModel)]="clusterName"
              name="cluster"
            />
          </label>
        }
        @case (2) {
          <h2 class="m-0 text-sm font-semibold">Secure your account</h2>
          <p class="mt-2 text-xs text-slate-600">
            Enable MFA under My Account → Security after setup. Change the default password on first
            login when the real backend enforces it.
          </p>
          <label class="mt-3 block text-xs font-medium text-slate-700">
            Display name
            <input
              class="mt-1 w-full max-w-sm rounded-md border border-slate-300 px-2 py-1.5 text-xs"
              [(ngModel)]="displayName"
              name="display"
            />
          </label>
        }
        @case (3) {
          <h2 class="m-0 text-sm font-semibold">Done</h2>
          <p class="mt-2 text-xs text-slate-600">
            Next: add a host, create a VM or jail from a Library base, register MCP servers under
            Configure.
          </p>
          <ul class="mt-2 list-disc pl-5 text-xs text-slate-700">
            <li>Cluster: {{ clusterName }}</li>
            <li>Operator: {{ displayName || auth.user()?.displayName }}</li>
          </ul>
        }
      }
    </app-wizard-shell>
  `,
})
export class OnboardingPage {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly steps: WizardStep[] = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'cluster', label: 'Cluster' },
    { id: 'secure', label: 'Secure' },
    { id: 'done', label: 'Done' },
  ];
  readonly step = signal(0);
  readonly submitting = signal(false);
  clusterName = 'prod-lan';
  displayName = '';

  readonly canNext = computed(() => {
    if (this.step() === 1) return this.clusterName.trim().length >= 2;
    return true;
  });

  finish(): void {
    this.toast.success('Onboarding complete', this.clusterName);
    void this.router.navigateByUrl('/dashboard');
  }
}
