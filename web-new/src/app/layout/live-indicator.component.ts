import { Component, inject } from '@angular/core';
import { StreamService } from '../core/stream/stream.service';

@Component({
  selector: 'app-live-indicator',
  standalone: true,
  template: `
    @if (stream.status() === 'live') {
      <span class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600" title="Live stream">
        <span class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true"></span>
        live
        @if (stream.secondsAgo() !== null && stream.secondsAgo()! > 0) {
          <span class="font-normal text-slate-400">· {{ stream.secondsAgo() }}s ago</span>
        }
      </span>
    } @else if (stream.status() === 'reconnecting' || stream.status() === 'connecting') {
      <span class="text-xs font-medium text-amber-600">reconnecting…</span>
    } @else if (stream.status() === 'dead') {
      <button
        type="button"
        class="text-xs font-medium text-rose-600 underline-offset-2 hover:underline"
        (click)="stream.reconnect()"
      >
        reconnect
      </button>
    }
  `,
})
export class LiveIndicatorComponent {
  readonly stream = inject(StreamService);
}
