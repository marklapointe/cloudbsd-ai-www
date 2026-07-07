# CloudBSD Admin — Diagrams

Visual planning artifacts for the Angular 20 migration. These SVGs are the **source of truth** for visual layout, content, and hierarchy. Read them before implementing each component.

## Convention

UI mock-ups use **SVG with `<foreignObject>`** containing inline-styled HTML.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" width="100%" font-family="system-ui, sans-serif">
  <title>CloudBSD Admin — Dashboard</title>
  <foreignObject x="0" y="0" width="1280" height="800">
    <div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:1280px;height:800px;background:#f1f5f9;">
      <!-- inline styles only — no class= attributes -->
    </div>
  </foreignObject>
</svg>
```

### Critical rules

1. **All styling must be inline `style="..."` attributes.** No `<style>` blocks, no `class=`, no `id=` selectors. GitHub's markdown sanitizer strips these. Inline styles are preserved.
2. **Tailwind utility classes do NOT work** in SVG `<foreignObject>` when the SVG is opened directly in a browser. There is no Tailwind runtime, no compiled stylesheet. The browser sees `class="bg-blue-500"` and has no matching rule.
3. **The `xmlns="http://www.w3.org/1999/xhtml"` namespace on the inner `<div>` is mandatory.** Without it the browser won't parse contents as XHTML.
4. **`viewBox` + `width="100%"` + `preserveAspectRatio="xMidYMid meet"`** scales the SVG responsively in markdown viewers.
5. **Mermaid is preferred for architecture/flow/sequence diagrams**, not UI mock-ups.

### Color palette (CloudBSD default theme)

Used consistently across all UI SVGs:

| Role | Hex |
|------|-----|
| Background | `#f1f5f9` (slate-100) |
| Surface | `#ffffff` |
| Border | `#e2e8f0` (slate-200) |
| Text primary | `#0f172a` (slate-900) |
| Text secondary | `#475569` (slate-600) |
| Text muted | `#64748b` (slate-500) |
| Primary (blue) | `#2563eb` |
| Primary gradient | `linear-gradient(135deg, #0ea5e9, #1e40af)` |
| Success (green) | `#10b981` / `#059669` |
| Warning (amber) | `#f59e0b` / `#d97706` |
| Error (red) | `#ef4444` / `#dc2626` |
| Info (cyan) | `#06b6d4` |

### Translating Tailwind → inline CSS

| Tailwind | Inline CSS |
|----------|-----------|
| `bg-blue-500` | `background: #3b82f6;` |
| `bg-blue-600` | `background: #2563eb;` |
| `bg-slate-50` | `background: #f8fafc;` |
| `bg-slate-100` | `background: #f1f5f9;` |
| `text-slate-900` | `color: #0f172a;` |
| `text-xs` | `font-size: 12px;` |
| `text-sm` | `font-size: 13px;` |
| `text-lg` | `font-size: 17px;` |
| `font-bold` | `font-weight: 700;` |
| `p-2` | `padding: 8px;` |
| `p-3` | `padding: 12px;` |
| `p-4` | `padding: 16px;` |
| `px-3` | `padding-left: 12px; padding-right: 12px;` |
| `py-2` | `padding-top: 8px; padding-bottom: 8px;` |
| `rounded` | `border-radius: 4px;` |
| `rounded-md` | `border-radius: 6px;` |
| `rounded-lg` | `border-radius: 10px;` |
| `rounded-full` | `border-radius: 9999px;` |
| `flex` | `display: flex;` |
| `flex-col` | `flex-direction: column;` |
| `items-center` | `align-items: center;` |
| `justify-between` | `justify-content: space-between;` |
| `gap-2` | `gap: 8px;` |
| `gap-4` | `gap: 16px;` |
| `grid grid-cols-4` | `display: grid; grid-template-columns: repeat(4, 1fr);` |
| `w-full` | `width: 100%;` |
| `h-14` | `height: 56px;` |
| `border` | `border: 1px solid #e2e8f0;` |
| `shadow-sm` | `box-shadow: 0 1px 3px rgba(0,0,0,0.04);` |

### Render targets

The SVGs render correctly in:
- Browser (open `.svg` file directly)
- GitHub (renders via `<img>` tag in markdown)
- VS Code preview
- Obsidian
- Any SVG-capable markdown viewer

## Files

### UI Screens (14)
- `screens/01-dashboard.svg` through `screens/14-status.svg`

### Components (15), Errors (12), Notifications (5), Modals (6), Loading (4)
- `components/`, `errors/`, `notifications/`, `modals/`, `loading/`

### Variants (3), Mobile (3), Plugin (3)
- `variants/`, `mobile/`, `plugin/`

### Themes (15), Customizer (8)
- `themes/`, `customizer/`

### Flows (5 Mermaid) + Architecture (1 Mermaid)
- `flows/*.md`, `architecture/*.md`

## Notes

- All SVGs are 1280×800 unless noted (mobile is 375×812, components are 600×400).
- All UI is view-only: no Start/Stop/Delete/Save buttons. Only Refresh/Filter/Export/View.
- Admin-only sections are clearly marked with a lock icon or "Admin-only" badge.
- Read-only mode is indicated by a yellow banner when applicable.
- All realistic data: real VM names (nextcloud, jellyfin, mastodon, gitea), real log messages, real FreeBSD hosts.

## Design Patterns Applied

Per Honcho peer memory (lessons-2026) and GoF/TAOCP principles:

### Plugin System

| Concern | Pattern | Source |
|---------|---------|--------|
| Plugin discovery | **Template Method** (GoF) | shared `PluginLoader` base with `discover()`, `validate()`, `register()` steps; each plugin overrides only `entry()` |
| Plugin manifest schema | JSON Schema with `$ref` reuse | per `dp-builder` |
| Hot-reload race conditions | Observer + atomic check-then-act | per TAOCP Vol 1 Ch 2 (coroutines/synchronization) |
| Plugin sandboxing | Capability tokens (not full process isolation) | per TAOCP Vol 1 §2.6 (subroutines with bounded state) |

### Global State + Streaming

| Concern | Pattern | Source |
|---------|---------|--------|
| SignalStore design | **Singleton + Publish/Subscribe** | per Honcho lessons (lessons-2026) |
| Ring buffer for log streaming | Circular array with O(1) push/pop | per TAOCP Vol 1 §2.2.2 (circular lists) |
| Backpressure | Drop-oldest with overflow warning | per TAOCP Vol 3 §6.1 (priority queues) |
| Socket.IO reconnect | Exponential backoff with jitter | per TAOCP Vol 2 §4.6.3 (hashing for distribution) |

### Theme System

| Concern | Pattern | Source |
|---------|---------|--------|
| 15 themes | **Strategy** (GoF) | each theme = concrete strategy implementing CSS variable interface |
| Custom theme import | Validator + Builder | per `dp-builder`, per Honcho lessons (auth validation) |
| Theme application | Immutable snapshot in signal | per Angular Signals best practice |

### Security

| Concern | Pattern | Source |
|---------|---------|--------|
| PAM auth | Chain of Responsibility (GoF) | `pam_authenticate` → service-specific policy → audit |
| Session cookies | Factory + Immutable state | HttpOnly + Secure + SameSite=Strict |
| Frost-out modal | Memento (GoF) | preserves page state while forcing re-auth |
| Permission checks | Guard / Decorator | per-plugin capability checks via `@Require` decorator |

### JSONL Logging

| Concern | Pattern | Source |
|---------|---------|--------|
| Structured format | Pure-data records (TAOCP Vol 1 §2.3.1 — serial streams) | one JSON object per line, machine-parseable |
| Pluggable sinks | **Strategy** (GoF) | `Logger` interface with `ConsoleJsonl`, `FileJsonl`, `Remote`, `Null` impls |
| Async dispatch | Producer-consumer queue | per TAOCP Vol 1 §2.2.4 (queues) |

## TAOCP References

This implementation draws from:

- **TAOCP Vol 1 §2.1** (Stacks, queues, deques) — used in JSONL ring buffer, Socket.IO event queue
- **TAOCP Vol 1 §2.2.2** (Circular lists) — log ring buffer
- **TAOCP Vol 1 §2.3** (Linked lists) — plugin dependency graph
- **TAOCP Vol 1 §2.6** (Subroutines/coroutines) — plugin lifecycle (load → register → run → unload)
- **TAOCP Vol 2 §4.6.3** (Universal hashing) — Socket.IO connection ID distribution, room sharding
- **TAOCP Vol 3 §5** (Sorting) — plugin sort order, menu order
- **TAOCP Vol 3 §6** (Minimum-comparison selection) — theme picker (top 10 by popularity)
- **TAOCP Vol 4A §7** (Combinatorial algorithms) — plugin capability resolution (AND/OR tree)

## Honcho Memory References

Patterns confirmed by past lessons:

- **Boot-time coverage validation** — `HonchoProviderRegistry.validateFullCoverage()` pattern: convert first-call 500 into boot failure. Apply to `PluginRegistry.validateFullCoverage()` on backend startup.
- **Race condition: check-then-insert** — `AuthService.register` caught `DataIntegrityViolationException` and converted to `UserExistsException → 409`. Apply same pattern to plugin registration.
- **V3ProviderSupport (Template Method)** — All 4 providers delegated to shared helper (-304 lines). Apply same refactor to plugin providers: `PluginProviderBase` with shared `loadManifest()`, `validate()`, `registerRoutes()`.
- **Path substitution with backward compatibility** — V3ProviderSupport.substitutePath needed 3-line change to support pathVars override. Apply to plugin path handling for `/${pluginId}/*` routes.

## Implementation Order

Apply these patterns in this order (dependency-respecting):

1. **Strategy** for theme system → enables theme switching
2. **Template Method** for plugin loader → enables plugin architecture
3. **Singleton + Pub/Sub** for global state → enables streaming
4. **Chain of Responsibility** for PAM auth → enables auth flow
5. **Memento** for frost-out modal → enables session expiry
6. **Producer-consumer queue** for JSONL logging → enables audit trail
7. **Guard/Decorator** for permission checks → enables admin-only features
## 2026-07-07 Update: NO Geolocation

User: "where are we getting that info from?" - geolocation is an info leak.

NO component/page/API response may include geolocation. Use only subnet classification (rfc1918, link-local, public, loopback) computed locally.
