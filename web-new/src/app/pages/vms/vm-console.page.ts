import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EnvelopeClient } from '../../core/protocol/envelope.client';
import { firstPayload } from '../../core/protocol/envelope.types';
import { ToastService } from '../../core/toast/toast.service';
import { environment } from '../../../environments/environment';

/**
 * bhyve console = noVNC (RFB) through backend/agent (Rule #13).
 * Ticket from envelope; WebSocket never targets guest IP from the SPA.
 */
@Component({
  selector: 'app-vm-console-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div>
        <a
          [routerLink]="['/vms', vmId()]"
          class="text-[11px] font-medium text-brand-600 no-underline hover:underline"
          >← Back to VM</a
        >
        <h1 class="mt-1 m-0 text-lg font-semibold text-slate-900">Console · {{ vmId() }}</h1>
        <p class="mt-0.5 text-xs text-slate-500">
          noVNC · RFB over backend ticket (not direct guest VNC)
        </p>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium"
          (click)="refreshToken()"
        >
          Refresh ticket
        </button>
        <button
          type="button"
          class="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium"
          (click)="sendCtrlAltDel()"
          [disabled]="!rfbReady()"
        >
          Ctrl+Alt+Del
        </button>
      </div>
    </div>

    @if (loading()) {
      <div class="rounded-shell border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Requesting console token…
      </div>
    } @else if (error()) {
      <div class="rounded-shell border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {{ error() }}
      </div>
    }

    <div
      class="relative flex h-[28rem] flex-col overflow-hidden rounded-shell border border-slate-700 bg-slate-950"
    >
      <div
        class="flex flex-wrap items-center gap-2 border-b border-slate-800 px-3 py-1.5 text-[11px] text-slate-400"
      >
        <span [class.text-emerald-400]="status() === 'connected'" [class.text-amber-400]="status() === 'connecting'" [class.text-rose-400]="status() === 'failed' || status() === 'disconnected'">●</span>
        {{ status() }}
        <span class="font-mono">{{ wsUrl() }}</span>
        <span class="ml-auto font-mono text-slate-500">…{{ tokenTail() }} · TTL {{ ttlSec() }}s</span>
      </div>
      <div #screen class="min-h-0 flex-1 bg-black"></div>
      @if (status() !== 'connected') {
        <div
          class="pointer-events-none absolute inset-x-0 bottom-0 top-8 flex items-center justify-center p-6 text-center"
        >
          <div class="pointer-events-auto max-w-md rounded-md bg-slate-900/90 px-4 py-3 text-xs text-slate-300">
            <p class="m-0 font-medium text-slate-100">@novnc/novnc RFB client loaded</p>
            <p class="mt-1 m-0 text-slate-400">
              {{ statusMessage() }}
            </p>
          </div>
        </div>
      }
    </div>
  `,
})
export class VmConsolePage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('screen', { static: false }) screenRef?: ElementRef<HTMLDivElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly client = inject(EnvelopeClient);
  private readonly toast = inject(ToastService);

  readonly vmId = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly wsUrl = signal('');
  readonly tokenTail = signal('');
  readonly ttlSec = signal(300);
  readonly status = signal<'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed'>('idle');
  readonly statusMessage = signal('Waiting for ticket…');
  readonly rfbReady = signal(false);

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private rfb: { disconnect: () => void; sendCtrlAltDel: () => void } | null = null;
  private viewReady = false;
  private pendingConnect: { url: string; token: string } | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.vmId.set(id);
    if (!id) {
      this.error.set('Missing VM id');
      this.loading.set(false);
      return;
    }
    void this.refreshToken();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.pendingConnect) {
      void this.attachRfb(this.pendingConnect.url, this.pendingConnect.token);
      this.pendingConnect = null;
    }
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.teardownRfb();
  }

  sendCtrlAltDel(): void {
    try {
      this.rfb?.sendCtrlAltDel();
    } catch {
      /* ignore */
    }
  }

  async refreshToken(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const env = await this.client.exchange({
        what: 'vm.console.token',
        where: 'vm_console',
        payload: [
          {
            mime: 'application/vnd.cloudbsd+query',
            kind: 'query',
            data: { id: this.vmId() },
          },
        ],
      });
      const tok = firstPayload<{
        token: string;
        path: string;
        ttlSec: number;
      }>(env, 'console.token');
      if (!tok) {
        throw new Error('No console.token in envelope');
      }
      const path = tok.data.path;
      const origin =
        environment.apiBaseUrl ||
        (typeof location !== 'undefined' ? location.origin : 'http://localhost:4200');
      const wsBase = origin.replace(/^http/, 'ws');
      const url = `${wsBase}${path}?token=${encodeURIComponent(tok.data.token)}`;
      this.wsUrl.set(url.replace(/token=[^&]+/, 'token=***'));
      this.tokenTail.set(tok.data.token.slice(-8));
      this.ttlSec.set(tok.data.ttlSec || 300);

      if (this.viewReady) {
        await this.attachRfb(url, tok.data.token);
      } else {
        this.pendingConnect = { url, token: tok.data.token };
      }

      if (this.refreshTimer) clearTimeout(this.refreshTimer);
      this.refreshTimer = setTimeout(
        () => void this.refreshToken(),
        (tok.data.ttlSec || 300) * 1000 * 0.8,
      );
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Console token failed');
      this.toast.error('Console unavailable', this.error() || '');
    } finally {
      this.loading.set(false);
    }
  }

  private teardownRfb(): void {
    try {
      this.rfb?.disconnect();
    } catch {
      /* ignore */
    }
    this.rfb = null;
    this.rfbReady.set(false);
    const el = this.screenRef?.nativeElement;
    if (el) el.innerHTML = '';
  }

  private async attachRfb(url: string, _token: string): Promise<void> {
    this.teardownRfb();
    const target = this.screenRef?.nativeElement;
    if (!target) {
      this.statusMessage.set('Screen element missing');
      return;
    }

    this.status.set('connecting');
    this.statusMessage.set('Connecting RFB via backend WebSocket…');

    try {
      // Dynamic import so SSR/build does not require DOM at module load
      const mod = await import('@novnc/novnc/core/rfb.js');
      const RFB = (mod as { default: new (t: HTMLElement, u: string, o?: object) => any }).default;

      const rfb = new RFB(target, url, {
        wsProtocols: ['binary'],
        // credentials if backend expects VNC password later
      });
      this.rfb = rfb;
      this.rfbReady.set(true);

      rfb.addEventListener('connect', () => {
        this.status.set('connected');
        this.statusMessage.set('Connected');
      });
      rfb.addEventListener('disconnect', (ev: { detail?: { clean?: boolean } }) => {
        this.status.set('disconnected');
        this.statusMessage.set(
          ev?.detail?.clean
            ? 'Disconnected'
            : 'Disconnected — backend websockify/agent not available (expected under mocks)',
        );
      });
      rfb.addEventListener('securityfailure', () => {
        this.status.set('failed');
        this.statusMessage.set('VNC security failure');
      });

      // If no real VNC endpoint, disconnect fires quickly — still "done" integration
      this.statusMessage.set(
        'RFB client started. Without a live agent websockify, disconnect is normal in mock/dev.',
      );
    } catch (e) {
      this.status.set('failed');
      this.statusMessage.set(
        e instanceof Error ? e.message : 'Failed to load @novnc/novnc RFB',
      );
      this.toast.warning('noVNC', this.statusMessage());
    }
  }
}
