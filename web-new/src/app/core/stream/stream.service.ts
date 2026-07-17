import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { StreamEvent } from '../protocol/resource.types';
import { PreflightService } from '../protocol/preflight.service';

export type StreamStatus = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'dead';

/**
 * WebSocket stream client (Rule #4 / #14).
 * Backend-issued StreamEvents only; invalidates preflight cache on state topics.
 */
@Injectable({ providedIn: 'root' })
export class StreamService {
  private readonly preflight = inject(PreflightService);

  private readonly statusSignal = signal<StreamStatus>('idle');
  private readonly lastEventAtSignal = signal<number | null>(null);
  private readonly lastEventSignal = signal<StreamEvent | null>(null);
  private readonly listeners = new Set<(ev: StreamEvent) => void>();
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private mockTimer: ReturnType<typeof setInterval> | null = null;

  readonly status = this.statusSignal.asReadonly();
  readonly lastEventAt = this.lastEventAtSignal.asReadonly();
  readonly lastEvent = this.lastEventSignal.asReadonly();
  readonly isLive = computed(() => this.statusSignal() === 'live');
  readonly secondsAgo = computed(() => {
    const t = this.lastEventAtSignal();
    if (t === null) {
      return null;
    }
    return Math.max(0, Math.floor((Date.now() - t) / 1000));
  });

  connect(): void {
    if (typeof WebSocket === 'undefined') {
      return;
    }
    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    if (environment.useMocks) {
      this.statusSignal.set('live');
      this.lastEventAtSignal.set(Date.now());
      this.startMockHeartbeat();
      return;
    }

    this.statusSignal.set('connecting');
    const base =
      environment.apiBaseUrl || (typeof location !== 'undefined' ? location.origin : '');
    const url = base.replace(/^http/, 'ws') + environment.streamPath;

    try {
      const ws = new WebSocket(url);
      this.socket = ws;

      ws.onopen = () => {
        this.statusSignal.set('live');
        this.lastEventAtSignal.set(Date.now());
      };

      ws.onmessage = (msg) => {
        this.lastEventAtSignal.set(Date.now());
        if (this.statusSignal() !== 'live') {
          this.statusSignal.set('live');
        }
        try {
          const data = JSON.parse(String(msg.data)) as StreamEvent;
          this.dispatch(data);
        } catch {
          // non-JSON heartbeat frames ok
        }
      };

      ws.onerror = () => {
        /* onclose schedules reconnect */
      };

      ws.onclose = () => {
        this.socket = null;
        this.statusSignal.set('dead');
        this.scheduleReconnect();
      };
    } catch {
      this.statusSignal.set('dead');
      this.markDevIdleLive();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.mockTimer) {
      clearInterval(this.mockTimer);
      this.mockTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.statusSignal.set('idle');
  }

  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  /** Subscribe to StreamEvents (backend-issued envelopes only). */
  onEvent(fn: (ev: StreamEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Tests / mock injector. */
  emitLocal(ev: StreamEvent): void {
    this.dispatch(ev);
  }

  private dispatch(ev: StreamEvent): void {
    this.lastEventSignal.set(ev);
    this.lastEventAtSignal.set(Date.now());
    this.invalidatePreflight(ev);
    for (const fn of this.listeners) {
      try {
        fn(ev);
      } catch {
        // listener errors must not kill stream
      }
    }
  }

  private invalidatePreflight(ev: StreamEvent): void {
    // WIRE §2.31 invalidating topics
    const topic = ev.topic || ev.type || '';
    if (
      topic.includes('state.changed') ||
      topic.includes('resource.changed') ||
      topic.includes('workload.migrated') ||
      topic.includes('heartbeat.lost') ||
      topic.includes('zfs.changed') ||
      topic.includes('health.changed')
    ) {
      this.preflight.invalidate(ev.resourceType, ev.resourceId);
    }
  }

  private startMockHeartbeat(): void {
    if (this.mockTimer) {
      return;
    }
    this.mockTimer = setInterval(() => {
      this.lastEventAtSignal.set(Date.now());
      // Occasional state event to exercise invalidation path
      if (Math.random() < 0.15) {
        this.dispatch({
          type: 'stream',
          topic: 'vm.state.changed',
          id: 'evt-mock',
          ts: new Date().toISOString(),
          resourceType: 'vm',
          resourceId: 'vm-nextcloud',
        });
      }
    }, 15_000);
  }

  private markDevIdleLive(): void {
    if (!environment.production) {
      this.statusSignal.set('live');
      this.lastEventAtSignal.set(Date.now());
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    this.statusSignal.set('reconnecting');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }
}
