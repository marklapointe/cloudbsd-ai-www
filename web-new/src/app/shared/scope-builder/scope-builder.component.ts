import { Component, computed, input, model, output } from '@angular/core';

/** Resource types allowed in v1 scopes (Rule #10). */
export const SCOPE_RESOURCE_TYPES = [
  'vm',
  'jail',
  'container',
  'volume',
  'network',
  'host',
  'task',
  'cluster',
] as const;

export const SCOPE_ACTIONS = [
  'list',
  'read',
  'create',
  'update',
  'delete',
  'power',
  'snapshot.create',
  'snapshot.delete',
  'snapshot.revert',
  'migrate',
] as const;

export type ScopeDomainKind = 'all' | 'list' | 'tag' | 'pattern';

export interface ScopeDocument {
  resourceTypes: string[];
  actions: string[];
  domain: {
    kind: ScopeDomainKind;
    /** Inventory ids when kind=list; tags when tag; glob when pattern */
    values: string[];
  };
}

/**
 * Selectable-only scope builder (Rules #10 / #11).
 * No freeform capability text — catalogs and multi-select only.
 */
@Component({
  selector: 'app-scope-builder',
  standalone: true,
  template: `
    <div class="space-y-4 text-xs">
      <section>
        <h3 class="m-0 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Resource types
        </h3>
        <div class="mt-2 flex flex-wrap gap-2">
          @for (r of resourceTypes; track r) {
            <label
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1"
              [class.border-brand-500]="hasResource(r)"
              [class.bg-brand-50]="hasResource(r)"
              [class.border-slate-200]="!hasResource(r)"
            >
              <input
                type="checkbox"
                class="rounded border-slate-300"
                [checked]="hasResource(r)"
                (change)="toggleResource(r)"
              />
              {{ r }}
            </label>
          }
        </div>
      </section>

      <section>
        <h3 class="m-0 text-[11px] font-bold uppercase tracking-wide text-slate-400">Actions</h3>
        <div class="mt-2 flex flex-wrap gap-2">
          @for (a of actions; track a) {
            <label
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1"
              [class.border-brand-500]="hasAction(a)"
              [class.bg-brand-50]="hasAction(a)"
              [class.border-slate-200]="!hasAction(a)"
            >
              <input
                type="checkbox"
                class="rounded border-slate-300"
                [checked]="hasAction(a)"
                (change)="toggleAction(a)"
              />
              {{ a }}
            </label>
          }
        </div>
      </section>

      <section>
        <h3 class="m-0 text-[11px] font-bold uppercase tracking-wide text-slate-400">Domain</h3>
        <div class="mt-2 flex flex-wrap gap-2">
          @for (d of domains; track d.id) {
            <button
              type="button"
              class="rounded-full border px-2.5 py-1 font-medium"
              [class.border-brand-500]="scope().domain.kind === d.id"
              [class.bg-brand-50]="scope().domain.kind === d.id"
              [class.border-slate-200]="scope().domain.kind !== d.id"
              (click)="setDomainKind(d.id)"
            >
              {{ d.label }}
            </button>
          }
        </div>

        @if (scope().domain.kind === 'list') {
          <div class="mt-2 max-h-40 overflow-y-auto rounded-md border border-slate-200 p-2">
            @for (item of inventory(); track item.id) {
              <label class="flex items-center gap-2 py-0.5">
                <input
                  type="checkbox"
                  class="rounded border-slate-300"
                  [checked]="scope().domain.values.includes(item.id)"
                  (change)="toggleDomainValue(item.id)"
                />
                <span class="font-medium">{{ item.name }}</span>
                <span class="text-slate-400">{{ item.id }}</span>
              </label>
            } @empty {
              <p class="m-0 text-slate-500">No inventory loaded — use tag or all.</p>
            }
          </div>
        }

        @if (scope().domain.kind === 'tag') {
          <div class="mt-2 flex flex-wrap gap-2">
            @for (tag of tags(); track tag) {
              <label
                class="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1"
                [class.border-brand-500]="scope().domain.values.includes(tag)"
                [class.bg-brand-50]="scope().domain.values.includes(tag)"
              >
                <input
                  type="checkbox"
                  [checked]="scope().domain.values.includes(tag)"
                  (change)="toggleDomainValue(tag)"
                />
                {{ tag }}
              </label>
            }
          </div>
        }

        @if (scope().domain.kind === 'pattern') {
          <label class="mt-2 block text-xs font-medium text-slate-700">
            Name pattern (glob)
            <input
              class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs"
              [value]="scope().domain.values[0] || ''"
              (input)="setPattern($event)"
              placeholder="prod-*"
            />
          </label>
          @if (patternPreview().length) {
            <p class="mt-1 text-[11px] text-slate-500">
              Live match preview: {{ patternPreview().join(', ') }}
            </p>
          }
        }
      </section>

      <section class="rounded-md border border-slate-100 bg-slate-50 p-2">
        <div class="text-[11px] font-bold uppercase text-slate-400">Scope summary</div>
        <p class="m-0 mt-1 font-mono text-[11px] text-slate-700">{{ summary() }}</p>
      </section>
    </div>
  `,
})
export class ScopeBuilderComponent {
  readonly inventory = input<{ id: string; name: string }[]>([]);
  readonly tags = input<string[]>(['prod', 'dev', 'ci', 'media', 'db']);
  readonly scope = model<ScopeDocument>({
    resourceTypes: [],
    actions: [],
    domain: { kind: 'all', values: [] },
  });
  readonly scopeChange = output<ScopeDocument>();

  readonly resourceTypes = SCOPE_RESOURCE_TYPES;
  readonly actions = SCOPE_ACTIONS;
  readonly domains: { id: ScopeDomainKind; label: string }[] = [
    { id: 'all', label: 'All resources' },
    { id: 'list', label: 'Select from inventory' },
    { id: 'tag', label: 'By tag' },
    { id: 'pattern', label: 'Name pattern' },
  ];

  readonly summary = computed(() => {
    const s = this.scope();
    const rt = s.resourceTypes.length ? s.resourceTypes.join(',') : '(none)';
    const act = s.actions.length ? s.actions.join(',') : '(none)';
    let dom = s.domain.kind;
    if (s.domain.kind !== 'all' && s.domain.values.length) {
      dom += ':' + s.domain.values.join('|');
    }
    return `${rt} × ${act} × ${dom}`;
  });

  readonly patternPreview = computed(() => {
    const s = this.scope();
    if (s.domain.kind !== 'pattern' || !s.domain.values[0]) return [];
    const pat = s.domain.values[0].replace(/\*/g, '.*');
    try {
      const re = new RegExp('^' + pat + '$', 'i');
      return this.inventory()
        .filter((i) => re.test(i.name))
        .map((i) => i.name)
        .slice(0, 8);
    } catch {
      return [];
    }
  });

  hasResource(r: string): boolean {
    return this.scope().resourceTypes.includes(r);
  }
  hasAction(a: string): boolean {
    return this.scope().actions.includes(a);
  }

  toggleResource(r: string): void {
    const s = structuredClone(this.scope());
    const i = s.resourceTypes.indexOf(r);
    if (i >= 0) s.resourceTypes.splice(i, 1);
    else s.resourceTypes.push(r);
    this.emit(s);
  }

  toggleAction(a: string): void {
    const s = structuredClone(this.scope());
    const i = s.actions.indexOf(a);
    if (i >= 0) s.actions.splice(i, 1);
    else s.actions.push(a);
    this.emit(s);
  }

  setDomainKind(kind: ScopeDomainKind): void {
    const s = structuredClone(this.scope());
    s.domain = { kind, values: kind === 'all' ? [] : s.domain.values };
    this.emit(s);
  }

  toggleDomainValue(v: string): void {
    const s = structuredClone(this.scope());
    const i = s.domain.values.indexOf(v);
    if (i >= 0) s.domain.values.splice(i, 1);
    else s.domain.values.push(v);
    this.emit(s);
  }

  setPattern(event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    const s = structuredClone(this.scope());
    s.domain = { kind: 'pattern', values: v ? [v] : [] };
    this.emit(s);
  }

  private emit(s: ScopeDocument): void {
    this.scope.set(s);
    this.scopeChange.emit(s);
  }
}
