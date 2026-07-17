import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

const COPY: Record<string, { title: string; body: string }> = {
  '403': {
    title: 'Forbidden',
    body: 'Your role or API key scope does not allow this resource.',
  },
  '404': {
    title: 'Not found',
    body: 'That page or resource does not exist.',
  },
  '500': {
    title: 'Server error',
    body: 'The Admin backend hit an error. Retry or check Tasks / Logs.',
  },
  '503': {
    title: 'Unavailable',
    body: 'Control plane temporarily unavailable. Stream will reconnect when live.',
  },
};

@Component({
  selector: 'app-error-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div class="text-5xl font-bold text-slate-200">{{ code() }}</div>
      <h1 class="mt-2 text-lg font-semibold text-slate-900">{{ title() }}</h1>
      <p class="mt-1 max-w-md text-xs text-slate-500">{{ body() }}</p>
      <a
        routerLink="/dashboard"
        class="mt-4 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white no-underline"
      >
        Dashboard
      </a>
    </div>
  `,
})
export class ErrorPage {
  private readonly route = inject(ActivatedRoute);
  readonly code = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('code') || '404')),
    { initialValue: '404' },
  );

  title(): string {
    return (COPY[this.code()] || COPY['404']).title;
  }
  body(): string {
    return (COPY[this.code()] || COPY['404']).body;
  }
}
