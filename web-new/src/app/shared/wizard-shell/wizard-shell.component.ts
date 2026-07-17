import { Component, computed, input, model, output } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface WizardStep {
  id: string;
  label: string;
}

/**
 * Multi-step create/edit chrome (catalog §7.2).
 * Parent owns step content; shell owns stepper + nav.
 */
@Component({
  selector: 'app-wizard-shell',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="mb-3">
      @if (cancelLink()) {
        <a
          [routerLink]="cancelLink()!"
          class="text-[11px] font-medium text-brand-600 no-underline hover:underline"
        >
          ← {{ cancelLabel() }}
        </a>
      }
      <h1 class="mt-1 m-0 text-lg font-semibold text-slate-900">{{ title() }}</h1>
      @if (subtitle()) {
        <p class="mt-0.5 text-xs text-slate-500">{{ subtitle() }}</p>
      }
    </div>

    <ol class="mb-4 flex flex-wrap gap-2">
      @for (step of steps(); track step.id; let i = $index) {
        <li class="flex items-center gap-2 text-xs">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium"
            [class.border-brand-500]="i === index()"
            [class.bg-brand-50]="i === index()"
            [class.text-brand-700]="i === index()"
            [class.border-emerald-300]="i < index()"
            [class.bg-emerald-50]="i < index()"
            [class.text-emerald-800]="i < index()"
            [class.border-slate-200]="i > index()"
            [class.text-slate-500]="i > index()"
            [disabled]="i > index() && !allowJump()"
            (click)="jump(i)"
          >
            <span
              class="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
              [class.bg-brand-500]="i === index()"
              [class.text-white]="i === index()"
              [class.bg-emerald-500]="i < index()"
              [class.text-white]="i < index()"
              [class.bg-slate-200]="i > index()"
            >
              @if (i < index()) {
                ✓
              } @else {
                {{ i + 1 }}
              }
            </span>
            {{ step.label }}
          </button>
          @if (i < steps().length - 1) {
            <span class="text-slate-300" aria-hidden="true">→</span>
          }
        </li>
      }
    </ol>

    <div class="rounded-shell border border-slate-200 bg-white p-4">
      <ng-content />
    </div>

    <div class="mt-3 flex items-center justify-between">
      <button
        type="button"
        class="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        [disabled]="index() === 0"
        (click)="back()"
      >
        Back
      </button>
      <div class="flex gap-2">
        @if (!isLast()) {
          <button
            type="button"
            class="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-40"
            [disabled]="!canNext()"
            (click)="next()"
          >
            Next
          </button>
        } @else {
          <button
            type="button"
            class="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-40"
            [disabled]="!canNext() || submitting()"
            (click)="finish.emit()"
          >
            {{ submitting() ? 'Submitting…' : finishLabel() }}
          </button>
        }
      </div>
    </div>
  `,
})
export class WizardShellComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly steps = input.required<WizardStep[]>();
  readonly cancelLink = input<string | null>(null);
  readonly cancelLabel = input('Cancel');
  readonly finishLabel = input('Create');
  readonly canNext = input(true);
  readonly allowJump = input(false);
  readonly submitting = input(false);
  readonly index = model(0);

  readonly stepChange = output<number>();
  readonly finish = output<void>();

  readonly isLast = computed(() => this.index() >= this.steps().length - 1);

  next(): void {
    if (!this.canNext() || this.isLast()) {
      return;
    }
    this.index.update((i) => i + 1);
    this.stepChange.emit(this.index());
  }

  back(): void {
    if (this.index() <= 0) {
      return;
    }
    this.index.update((i) => i - 1);
    this.stepChange.emit(this.index());
  }

  jump(i: number): void {
    if (i > this.index() && !this.allowJump()) {
      return;
    }
    this.index.set(i);
    this.stepChange.emit(i);
  }
}
