import { Injectable, signal, effect } from '@angular/core';

export type Density = 'cozy' | 'compact' | 'extra';

const STORAGE_KEY = 'cloudbsd.density';

/** One density system for the whole app (catalog plan). */
@Injectable({ providedIn: 'root' })
export class DensityService {
  private readonly densitySignal = signal<Density>(this.readInitial());

  readonly density = this.densitySignal.asReadonly();

  constructor() {
    effect(() => {
      const d = this.densitySignal();
      if (typeof document === 'undefined') {
        return;
      }
      document.body.classList.remove('density-cozy', 'density-compact', 'density-extra');
      document.body.classList.add(`density-${d}`);
      try {
        localStorage.setItem(STORAGE_KEY, d);
      } catch {
        // private mode
      }
    });
  }

  set(density: Density): void {
    this.densitySignal.set(density);
  }

  private readInitial(): Density {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === 'cozy' || v === 'compact' || v === 'extra') {
        return v;
      }
    } catch {
      // ignore
    }
    return 'cozy';
  }
}
