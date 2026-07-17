import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WizardShellComponent, WizardStep } from '../../shared/wizard-shell/wizard-shell.component';
import { ResourcesApi } from '../../core/api/resources.api';
import { ToastService } from '../../core/toast/toast.service';

@Component({
  selector: 'app-mcp-add-page',
  standalone: true,
  imports: [WizardShellComponent, FormsModule],
  template: `
    <app-wizard-shell
      title="Add MCP server"
      subtitle="MCP is the plugin system (Rule #3)"
      [steps]="steps"
      cancelLink="/mcp"
      finishLabel="Register server"
      [canNext]="canNext()"
      [submitting]="submitting()"
      [(index)]="step"
      (finish)="submit()"
    >
      @switch (step()) {
        @case (0) {
          <h2 class="m-0 text-sm font-semibold">Transport</h2>
          <div class="mt-3 grid gap-2 sm:grid-cols-3">
            @for (t of transports; track t.id) {
              <button
                type="button"
                class="rounded-md border px-3 py-2 text-left text-xs"
                [class.border-brand-500]="transport() === t.id"
                [class.bg-brand-50]="transport() === t.id"
                [class.border-slate-200]="transport() !== t.id"
                (click)="transport.set(t.id)"
              >
                <div class="font-semibold">{{ t.label }}</div>
                <div class="text-slate-500">{{ t.hint }}</div>
              </button>
            }
          </div>
        }
        @case (1) {
          <h2 class="m-0 text-sm font-semibold">Endpoint</h2>
          <div class="mt-3 grid gap-3">
            <label class="block text-xs font-medium text-slate-700">
              Name
              <input
                class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                [(ngModel)]="name"
                name="name"
              />
            </label>
            @if (transport() === 'stdio') {
              <label class="block text-xs font-medium text-slate-700">
                Command (server-side)
                <input
                  class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs"
                  [(ngModel)]="endpoint"
                  name="endpoint"
                  placeholder="mcp-server-fs"
                />
              </label>
            } @else {
              <label class="block text-xs font-medium text-slate-700">
                URL
                <input
                  class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs"
                  [(ngModel)]="endpoint"
                  name="endpoint"
                  placeholder="https://mcp.example.lan/sse"
                />
              </label>
            }
          </div>
          <p class="mt-2 text-[11px] text-slate-500">
            Backend owns process/socket to MCP servers — browser only registers metadata.
          </p>
        }
        @case (2) {
          <h2 class="m-0 text-sm font-semibold">Review</h2>
          <dl class="mt-3 space-y-1 text-xs">
            <div class="flex justify-between border-b border-slate-50 py-1">
              <dt class="text-slate-500">Name</dt>
              <dd class="font-medium">{{ name }}</dd>
            </div>
            <div class="flex justify-between border-b border-slate-50 py-1">
              <dt class="text-slate-500">Transport</dt>
              <dd class="font-medium">{{ transport() }}</dd>
            </div>
            <div class="flex justify-between py-1">
              <dt class="text-slate-500">Endpoint</dt>
              <dd class="font-mono text-[11px]">{{ endpoint }}</dd>
            </div>
          </dl>
        }
      }
    </app-wizard-shell>
  `,
})
export class McpAddPage {
  private readonly api = inject(ResourcesApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly steps: WizardStep[] = [
    { id: 'transport', label: 'Transport' },
    { id: 'endpoint', label: 'Endpoint' },
    { id: 'review', label: 'Review' },
  ];
  readonly transports = [
    { id: 'http' as const, label: 'HTTP', hint: 'JSON-RPC over HTTPS' },
    { id: 'sse' as const, label: 'SSE', hint: 'Server-sent events' },
    { id: 'stdio' as const, label: 'stdio', hint: 'Local process (backend)' },
  ];

  readonly step = signal(0);
  readonly transport = signal<'http' | 'sse' | 'stdio'>('http');
  readonly submitting = signal(false);
  name = '';
  endpoint = '';

  readonly canNext = computed(() => {
    if (this.step() === 1) return this.name.trim().length >= 2 && this.endpoint.trim().length >= 2;
    return true;
  });

  async submit(): Promise<void> {
    this.submitting.set(true);
    try {
      const res = await this.api.create('mcp.register', 'mcp_add_wizard', {
        name: this.name.trim(),
        transport: this.transport(),
        endpoint: this.endpoint.trim(),
      });
      this.toast.success('MCP server registered', res.id);
      await this.router.navigateByUrl('/mcp');
    } catch (e) {
      this.toast.error('Register failed', e instanceof Error ? e.message : 'Unknown');
    } finally {
      this.submitting.set(false);
    }
  }
}
