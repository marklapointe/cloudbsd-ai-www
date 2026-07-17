import { Injectable, signal } from '@angular/core';

export type ToastSeverity = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  severity: ToastSeverity;
  title: string;
  message?: string;
  timeoutMs: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsSignal = signal<Toast[]>([]);
  readonly toasts = this.toastsSignal.asReadonly();

  show(
    severity: ToastSeverity,
    title: string,
    message?: string,
    timeoutMs = 4500,
  ): void {
    const id = 'toast-' + Math.random().toString(36).slice(2, 9);
    const toast: Toast = { id, severity, title, message, timeoutMs };
    this.toastsSignal.update((list) => [...list, toast]);
    if (timeoutMs > 0) {
      setTimeout(() => this.dismiss(id), timeoutMs);
    }
  }

  info(title: string, message?: string): void {
    this.show('info', title, message);
  }

  success(title: string, message?: string): void {
    this.show('success', title, message);
  }

  warning(title: string, message?: string): void {
    this.show('warning', title, message);
  }

  error(title: string, message?: string): void {
    this.show('error', title, message, 8000);
  }

  dismiss(id: string): void {
    this.toastsSignal.update((list) => list.filter((t) => t.id !== id));
  }
}
