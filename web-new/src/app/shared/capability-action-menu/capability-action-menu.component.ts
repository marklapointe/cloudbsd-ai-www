import { Component, input, output, signal } from '@angular/core';

export interface CapabilityAction {
  id: string;
  label: string;
  /** When false, hide entirely (Rule #8: blockers hide action). */
  visible?: boolean;
  /** When true, show but disabled with badge. */
  disabled?: boolean;
  warning?: boolean;
  destructive?: boolean;
}

/**
 * Actions after preflight (catalog §7.2).
 * Parent runs preflight and sets visible/disabled on each action.
 */
@Component({
  selector: 'app-capability-action-menu',
  standalone: true,
  template: `
    <div class="relative inline-block text-left">
      <button
        type="button"
        class="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        [attr.aria-expanded]="open()"
        (click)="open.set(!open())"
      >
        {{ label() }} ▾
      </button>
      @if (open()) {
        <div
          class="absolute right-0 z-10 mt-1 min-w-[10rem] rounded-md border border-slate-200 bg-white py-1 shadow-lg"
          role="menu"
        >
          @for (action of visibleActions(); track action.id) {
            <button
              type="button"
              role="menuitem"
              class="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              [class.text-rose-700]="action.destructive"
              [class.text-slate-700]="!action.destructive"
              [disabled]="action.disabled"
              (click)="onSelect(action)"
            >
              <span>{{ action.label }}</span>
              @if (action.warning) {
                <span class="text-[10px] text-amber-600">warn</span>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class CapabilityActionMenuComponent {
  readonly label = input('Actions');
  readonly actions = input.required<CapabilityAction[]>();
  readonly actionSelect = output<CapabilityAction>();

  readonly open = signal(false);

  visibleActions(): CapabilityAction[] {
    return this.actions().filter((a) => a.visible !== false);
  }

  onSelect(action: CapabilityAction): void {
    this.open.set(false);
    this.actionSelect.emit(action);
  }
}
