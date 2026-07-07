# CloudBSD Admin: React → Angular Migration (View-Only + Plugin System)

## TL;DR

> **Quick Summary**: Big-bang rewrite of the CloudBSD Admin frontend from React 19 to Angular 20 with a **plugin-extensible architecture**, **view-only UX** (writes hidden), **frost-out session modal**, **modular PAM-backed auth**, and a **new backend** that uses **CloudBSD-specific MIME types** (`application/vnd.cloudbsd+<action>`) with `X-CloudBSD-Who/What/Why/Where` headers. The backend can dynamically push new menu items, pages, modals, and wizards via a template manifest — no redeploy required.
>
> **Deliverables**:
> - 14 SVG screen mockups + 5 interaction flow SVGs (`diagrams/`)
> - OpenAPI 3.1 spec (`diagrams/openapi.yaml`)
> - Plugin contract spec (`diagrams/plugin-contract.md`)
> - Custom MIME-type + header registry (`diagrams/mime-registry.md`)
> - New PAM-auth backend (Node.js 24 + Express 5 + libpam)
> - Angular 20 frontend with plugin template renderer + view-only pages
> - Karma+Jasmine tests (80% coverage gate)
> - Playwright visual regression suite for 14 pages
> - Frost-out session modal component
> - Git branch `feat/angular-migration` with all artifacts pushed
>
> **Estimated Effort**: **XL** (~600-1200 hours; multi-week, multi-phase)
> **Parallel Execution**: YES — 8 waves, peak 7 concurrent tasks
> **Critical Path**: Phase 0 → Phase 1 (docs) → Phase 2 (backend core) → Phase 3 (frontend shell + plugin renderer) → Phase 4 (first page slice) → Phase 5 (visual regression) → Phase 6 (cutover)

---

## Context

### Original Request
"Examine codebase, plan for Angular migration. Check Honcho MCP services for diagram and UI/UX guidelines." Followed by scope expansions: view-only UI, replace backend entirely, modular auth with PAM, frost-out modal, plugin system, custom MIME types + headers, OpenAPI spec, Playwright visual inspections.

### Interview Summary
**Key Discussions**:
- Migration trigger: User explicitly overrode the CloudBSD WebUI guideline ("React is primary") — Angular is better for this project.
- View-only paradigm: Frontend becomes pure read interface; new backend handles actions.
- Auth model: Backend authenticates via PAM; frontend validates sessions and presents frost-out modal on validation failure.
- Plugin extensibility: Backend dynamically adds menu items, pages, modals, wizards via template manifest — no redeploy for new features.
- Custom MIME types: `application/vnd.cloudbsd+<action>` with required `X-CloudBSD-Who/What/Why/Where` headers.
- Screen adjustments: User flagged several "odd" things in current screens; Prometheus will adjust and document in a "Screen Adjustments" table.

**Research Findings** (from Honcho MCP):
- WebUI guideline says React is primary — Angular is an explicit user override.
- Tailwind mandatory, TypeScript mandatory, WCAG 2.1 Level AA, strict CSP, HTTPS-only, XSS/CSRF.
- Diagram convention: Mermaid inline for conceptual, SVG `<foreignObject>` for UI mockups in `diagrams/`.
- i18n: `i18next` for JS/TS per guidelines; user overrode to Angular `$localize`.
- Testing: TDD, 80% coverage, isolated, AI-parseable output (JSON/TAP/JUnit XML).
- Configuration: XDG Base Directory mandatory.
- Author: Mark LaPointe <mark@cloudbsd.org>. License: BSD 3-Clause. Target platform: FreeBSD.

### Metis Review (consumed)
Metis identified 17 categories of risks/gaps. The most critical ones for this migration:
- Locale marker cleanup (`*`/`(fixed)` markers exposed post-`$localize` migration).
- `@xyflow/angular` feature parity risk for NetworkMap (use `@xyflow/angular` or fall back to CDK drag-drop).
- `vi.mock` → Jasmine spy refactor across 4 test files.
- RTL Tailwind logical-property extensions needed for `ar`/`he`.
- Big-bang = no rollback path; need a `USE_ANGULAR` feature flag for staged rollout.
- Containerfile is Linux-based but Makefile is FreeBSD-style — deployment artifact decision needed.
- Custom postProcessor `removeMarkers` does not exist in `$localize` — pre-cleanup required.

---

## Visual Planning Artifacts (Diagrams)

> **CRITICAL for implementing agent:** All UI screens, components, flows, and error states have been pre-rendered as planning artifacts. **Read these before implementing each component.** They are the source of truth for layout, content, and visual hierarchy.

**Convention:** SVG with `<foreignObject>` containing inline-styled HTML (Tailwind classes are inert in SVG; only inline `style="..."` works). See `diagrams/README.md` for details.

### Screen Mock-ups (14) — `diagrams/screens/`

These define the visual target for every page in the new Angular app. Each SVG is 1280×800, uses CloudBSD theme by default, and is view-only (no write buttons).

| File | Page | Key Contents |
|------|------|--------------|
| [`01-dashboard.svg`](../../diagrams/screens/01-dashboard.svg) | Dashboard | 8 widgets: CPU (42%, 8 cores, load avg, sparkline), Memory (8.2/16 GB, breakdown bars), Disk (4 volumes, 27%/80%/76%), Network (rx/tx), Temperature, Load Avg (1m/5m/15m), Top Processes (5 rows), ZFS Health. Recent Activity feed (10 events). Top Consumers bar chart (5 rows). |
| [`02-vms.svg`](../../diagrams/screens/02-vms.svg) | Virtual Machines | 4 stat cards (47 VMs, 39 Run, 6 Stop, 1 Error). 12-row table with 13 columns (Name, Status, OS, vCPU, RAM, Disk, Uptime, Host, Tags, IP, IOPS, Net, Created). VM names: nextcloud, homeassistant, jellyfin, postgres-dev, win11-sandbox, gitlab-runner, mastodon, node-02-win, gitea, pihole-vm, immich, paperless-ngx. Row 5 (win11-sandbox) shown in hover state. Pagination. |
| [`03-containers.svg`](../../diagrams/screens/03-containers.svg) | Containers | 15 container rows: nginx-proxy, postgres-16, redis-cache, immich-server, immich-ml, paperless, nextcloud-fpm, caddy, syncthing, gitea, postgres-backup, watchtower. Image tag pills, status pills, ports, CPU%, MEM, net sparkline, uptime, registry columns. |
| [`04-jails.svg`](../../diagrams/screens/04-jails.svg) | Jails | 10 jail rows: transmission, syncthing, pi-hole, unifi-controller, homebridge, paperless (STOPPED), gitea-runner (FROZEN), dnscrypt, minio, vaultwarden. Status, hostname, IP, vCPUs, RAM, Disk, resource bar, uptime, JID. |
| [`05-volumes.svg`](../../diagrams/screens/05-volumes.svg) | Volumes | 13 volume rows: tank/data, tank/media, tank/backups, tank/vms, tank/apps, fast/ssd (SLOG), vault/cold (encrypted), nfs_export, iscsi-lun0, tank/snapshots, tank/nextcloud, tank/jails, tank/photos. Type (ZFS/NFS/iSCSI), size, used, usage bar, mountpoint, compression, encryption, last scrub, health. |
| [`06-network-map.svg`](../../diagrams/screens/06-network-map.svg) | Network Map | 18 nodes: Internet, pfsense.local, sw-core.local, NAS, 5 VMs, 4 CTs, 4 jails, 2 services, 3 cluster nodes. 3 subnets (10.0.10.0/24, 10.0.20.0/24, 10.0.30.0/24). Mini-map. Legend. Controls (Zoom, Fit, Refresh, Layout). |
| [`07-cluster.svg`](../../diagrams/screens/07-cluster.svg) | Cluster | 6 nodes: freenas-mock (master), node-02/03/04/06 (workers), node-05 (OFFLINE rose). CPU/MEM/Disk usage bars per node. Recent cluster events list (8 events). Aggregate stats. |
| [`08-users.svg`](../../diagrams/screens/08-users.svg) | Users | 14 user rows with avatars (mlapointe, root, www, backup, jenkins, guest, postgres, ubuntu, svc-bhyve, deploy, monitoring, audit, etc.). PAM status (active/locked/expired/disabled), last login, groups as badges, shell. Right detail panel for mlapointe (UID, email, 2FA, SSH keys, sessions, sudo, 5 recent logins). |
| [`09-logs.svg`](../../diagrams/screens/09-logs.svg) | Logs | Admin-only JSONL viewer. Level pills (All/Error/Warn/Info/Debug), severity histogram (60 buckets, red bars for errors), Tail ON indicator. 18 log rows from zfs/bhyve/jail/nginx/sshd/smb/cron/smart/caddy/ctdb modules with realistic messages. |
| [`10-notifications.svg`](../../diagrams/screens/10-notifications.svg) | Notifications | 14 notifications grouped by severity: ERROR (disk > 80%, auth failures, cluster heartbeat), WARN (vm paused, network flap, jail disabled), INFO (system updates, snapshots). Severity icons, source filters, Mark all read, Preferences. |
| [`11-settings.svg`](../../diagrams/screens/11-settings.svg) | Settings (Appearance) | Settings sidebar with 15 sections (admin-only sections marked with admin icon: Theme Customizer, Error Display, Plugins, Users, Sessions, API Keys). Active "Appearance" section with theme radio cards, color pickers, typography, layout, accessibility, behavior. Read-only banner + disabled Save. |
| [`12-login.svg`](../../diagrams/screens/12-login.svg) | Login | Full login form: branding, tagline, username/password with show/hide, Remember checkbox, Session timeout notice, Sign in button, passkey option, MFA TOTP (6 digit boxes). Help links (Forgot password, Why PAM, First time, Locked out). Right side decorative gradient panel with network topology pattern. Status pill (Backend reachable). |
| [`13-about.svg`](../../diagrams/screens/13-about.svg) | About | Version info table (Angular 19.1.0, Node 24, Express 5, build commit f8e2a4c1, BSD 3-Clause). System info card (FreeBSD 14.2, 8 cores, 16 GB, 47 locales, 5 plugins). Links panel. 12 third-party libraries table. |
| [`14-status.svg`](../../diagrams/screens/14-status.svg) | Status | Backend health (UP, 18ms, 14d uptime), Database (SQLite 412 MB / 142 tables), 5 Plugins (all healthy with one zfs-monitor warning). 5 plugin health cards grid. System resources with bars. 12-row configuration table. 4 log file locations. |

### Component Mock-ups (15) — `diagrams/components/`

Reusable UI building blocks. View at 600×400, light theme.

| File | Component |
|------|-----------|
| `01-button.svg` | Button variants: primary, secondary, ghost, danger |
| `02-button-loading.svg` | Button in loading state with spinner |
| `03-card.svg` | Card with header, body, footer |
| `04-card-stats.svg` | Stats/KPI card with label, value, trend indicator |
| `05-input.svg` | Text input with label, helper text, validation |
| `06-select.svg` | Dropdown select |
| `07-checkbox.svg` | Checkbox with label |
| `08-toggle.svg` | Toggle switch |
| `09-tabs.svg` | Tabbed navigation (3 tabs) |
| `10-table.svg` | Data table with header, rows, pagination |
| `11-badge.svg` | Badge variants (success/warning/error/info) |
| `12-breadcrumb.svg` | Breadcrumb navigation |
| `13-pagination.svg` | Pagination controls |
| `14-progress-bar.svg` | Progress bar (60% complete) |
| `15-tooltip.svg` | Tooltip on hover with "Don't show again" link |

### Error States (12) — `diagrams/errors/`

All error surfaces in the application, with 4 detail levels (Minimal/Standard/Detailed/Debug).

| File | Error |
|------|-------|
| `01-backend-unavailable.svg` | Pre-flight check: backend down, degraded shell |
| `02-network-error.svg` | Network request failed with retry |
| `03-401-unauthorized.svg` | Authentication required → login |
| `04-403-forbidden.svg` | Admin-only area, role-gated |
| `05-404-not-found.svg` | Friendly 404 with search + nav back |
| `06-500-server-error.svg` | Internal error with reference code |
| `07-503-service-unavailable.svg` | Backend down, retry countdown |
| `08-pam-auth-failed.svg` | PAM auth failed, attempt counter |
| `09-pam-account-locked.svg` | PAM account locked, unlock timer |
| `10-session-expired.svg` | Frost-out modal (page frosted, info hidden) |
| `11-plugin-load-error.svg` | Plugin manifest invalid/missing |
| `12-themes-load-error.svg` | Theme file corrupt, restore default |

### Notifications (5) — `diagrams/notifications/`

| File | Type |
|------|------|
| `01-info-toast.svg` | Info notification (blue, auto-dismiss 5s) |
| `02-success-toast.svg` | Success notification (green, checkmark) |
| `03-warning-toast.svg` | Warning notification (amber, triangle) |
| `04-error-toast.svg` | Error notification (red, X icon, sticky) |
| `05-notification-center.svg` | Full notification center panel |

### Modals (6) — `diagrams/modals/`

| File | Type |
|------|------|
| `01-confirmation-modal.svg` | "Are you sure?" with Cancel/Confirm |
| `02-info-modal.svg` | Information display with OK |
| `03-form-modal.svg` | Modal containing form fields |
| `04-wizard-modal.svg` | Multi-step wizard (step 2 of 4) |
| `05-fullscreen-modal.svg` | Full-screen overlay (e.g., console) |
| `06-drawer-modal.svg` | Side drawer (slides from right) |

### Loading & State (4) — `diagrams/loading/`

| File | State |
|------|-------|
| `01-loading-spinner.svg` | Spinner overlay during data fetch |
| `02-skeleton-screen.svg` | Skeleton placeholder |
| `03-empty-state.svg` | Empty state with icon + message + action |
| `04-error-state.svg` | Inline error state within component |

### Theme Variants (3) — `diagrams/variants/`

Same dashboard rendered in different themes for comparison.

| File | Theme |
|------|-------|
| `01-light.svg` | Light theme (CloudBSD default) |
| `02-dark.svg` | Dark theme (Glass Dark) |
| `03-high-contrast.svg` | High-contrast theme (WCAG AAA) |

### Mobile Variants (3) — `diagrams/mobile/`

375×812 mobile portrait renders.

| File | Screen |
|------|--------|
| `01-mobile-dashboard.svg` | Mobile dashboard |
| `02-mobile-vms.svg` | Mobile VMs list |
| `03-mobile-settings.svg` | Mobile settings |

### Plugin System (3) — `diagrams/plugin/`

| File | Type |
|------|------|
| `01-plugin-page.svg` | Plugin-rendered page (e.g., "VM Metrics" by metrics plugin) |
| `02-plugin-modal.svg` | Plugin-rendered modal |
| `03-plugin-wizard.svg` | Plugin-rendered multi-step wizard |

### Themes (15) — `diagrams/themes/`

15 built-in themes rendered as the same dashboard.

| File | Theme Name |
|------|------------|
| `01-cloudbsd-revytech.svg` | CloudBSD Revytech (default) |
| `02-miami-vice.svg` | Miami Vice (neon pink + cyan) |
| `03-pixel-pop.svg` | Pixel Pop (retro gamer) |
| `04-beige-box.svg` | Beige Box (90s retro PC) |
| `05-pearl-luna.svg` | Pearl Luna (rounded blue) |
| `06-cde-motif.svg` | Beveled Desktop (CDE-style) |
| `07-sunos-sunburst.svg` | Sunburst Orange (warm beige + gold) |
| `08-aqua-pinstripe.svg` | Brushed Pinstripe (translucent blue) |
| `09-phosphor-crt.svg` | Phosphor CRT (green phosphor) |
| `10-glass-light.svg` | Glass Light (modern frosted) |
| `11-glass-dark.svg` | Glass Dark (modern frosted dark) |
| `12-workbench.svg` | Workshop Orange (orange/red topbar) |
| `13-haiku.svg` | Minimal Clean (white + beige) |
| `14-cube.svg` | Cube Lab (black/green/white) |
| `15-warp.svg` | Flat Steel (gray + blue accents) |

### Customizer (8) — `diagrams/customizer/`

Theme customizer UI panels.

| File | Panel |
|------|-------|
| `01-colors-tab.svg` | Color picker |
| `02-typography-tab.svg` | Font family, size, weight |
| `03-layout-tab.svg` | Spacing, border radius, shadows |
| `04-branding-tab.svg` | Logo upload, app name, copyright |
| `05-import-export-tab.svg` | Theme import/export (.cbsd-theme.json) |
| `06-preview-tab.svg` | Live theme preview |
| `07-theme-gallery.svg` | Browse all 15 built-in themes |
| `08-custom-theme-list.svg` | User's custom themes list |

### Flow & Architecture Diagrams (Mermaid) — `diagrams/flows/` and `diagrams/architecture/`

These are Mermaid diagrams (NOT SVG) per CloudBSD conventions. They show system behavior, not UI.

| File | Flow |
|------|------|
| `diagrams/flows/01-login-flow.md` | Login: app open → pre-flight → /login → PAM auth → /dashboard |
| `diagrams/flows/02-session-expiry-flow.md` | Session expiry: 401 → frost-out modal → OK → /login |
| `diagrams/flows/03-plugin-discovery-flow.md` | Plugin loader: scan → validate → register routes → manifest |
| `diagrams/flows/04-theme-application-flow.md` | Theme: select → validate → CSS vars → persist |
| `diagrams/flows/05-log-streaming-flow.md` | JSONL logger → Socket.IO → SignalStore → UI |
| `diagrams/architecture/01-system-architecture.md` | Browser / Backend / FreeBSD layers + plugin flow + auth + streaming + security + deployment |

### ADJUSTMENTS Table

[`diagrams/../.sisyphus/drafts/ADJUSTMENTS.md`](../../.sisyphus/drafts/ADJUSTMENTS.md) — Documents every screen/component/route change from React → Angular with status (ADDED/REMOVED/CHANGED/VIEW-ONLY/ADMIN-ONLY).

---

## Design Patterns & References

> **Read [`diagrams/README.md`](../../diagrams/README.md)** for full pattern references. Summary below.

Per Honcho MCP peer memory (lessons-2026) and TAOCP principles:

| Subsystem | Primary Pattern | TAOCP / GoF Ref |
|-----------|------------------|------------------|
| Plugin loader | **Template Method** (GoF) — shared `PluginLoader` with overridable `entry()` | TAOCP Vol 1 §2.6 |
| Plugin manifest | JSON Schema with `$ref` reuse + Builder pattern | dp-builder |
| Plugin race conditions | Atomic check-then-act + DataIntegrityViolationException catch | Honcho lessons (auth) |
| Theme system (15) | **Strategy** (GoF) — each theme implements CSS variable interface | — |
| Custom theme import | Validator + Builder | — |
| Global state | **Singleton + Publish/Subscribe** | Honcho lessons |
| JSONL log ring buffer | Circular list with O(1) push/pop | TAOCP Vol 1 §2.2.2 |
| Socket.IO reconnect | Exponential backoff with jitter | TAOCP Vol 2 §4.6.3 |
| Backpressure | Drop-oldest with overflow warning | TAOCP Vol 3 §6.1 |
| PAM auth | **Chain of Responsibility** (GoF) | — |
| Frost-out modal | **Memento** (GoF) — preserves page state during re-auth | — |
| Permission checks | **Guard + Decorator** (GoF) | — |
| Pluggable logger sinks | **Strategy** (GoF) — `Logger` interface, multiple impls | — |
| Plugin path routing | Backward-compatible path substitution | Honcho V3ProviderSupport lesson |

### Honcho Lessons Applied

From `lessons-2026` session (verified, not fabricated):

1. **Boot-time coverage validation** — `PluginRegistry.validateFullCoverage()` called at backend startup; converts first-call 500 into boot failure.
2. **Race condition fix** — `register()` catches `DataIntegrityViolationException → PluginExistsException → 409`.
3. **Template Method refactor** — All plugin providers delegate to `PluginProviderBase` with shared `loadManifest()`, `validate()`, `registerRoutes()` (avoids -304 line duplication).
4. **Path substitution** — `PluginProviderBase.substitutePath()` handles `pathVars` first, falls back to ctx.workspaceId() (backward compat).

### Implementation Order (Pattern Dependencies)

Apply patterns in this dependency order:

1. **Strategy** (themes) → enables theme switching
2. **Template Method** (plugin loader) → enables plugin architecture
3. **Singleton + Pub/Sub** (global state) → enables streaming
4. **Chain of Responsibility** (PAM auth) → enables auth flow
5. **Memento** (frost-out modal) → enables session expiry
6. **Producer-consumer queue** (JSONL logging) → enables audit trail
7. **Guard/Decorator** (permission checks) → enables admin-only features

---

## Work Objectives

### Core Objective
Replace the entire CloudBSD Admin frontend (React 19 + Vite) and backend (Express 5 + SQLite + JWT) with a new Angular 20 + PAM-auth architecture that is **plugin-extensible**, **view-only by default**, and uses **CloudBSD-specific MIME types** with semantic headers. The new backend serves as a discovery layer for FreeBSD services (bhyve, podman, jails) and dynamically registers new menu items, pages, and modals.

### Concrete Deliverables
- Git branch `feat/angular-migration` (created from `f01c24b` on `vstest`).
- 14 SVG screen mockups (`diagrams/screens/*.svg`).
- 5 SVG interaction flow diagrams (`diagrams/flows/*.svg`).
- `diagrams/openapi.yaml` — OpenAPI 3.1 contract for the new backend.
- `diagrams/plugin-contract.md` — Plugin/template manifest schema.
- `diagrams/mime-registry.md` — `application/vnd.cloudbsd+*` catalog.
- `diagrams/ADJUSTMENTS.md` — Screen adjustments tracking table.
- New backend at `/server-new` (kept separate from `/server` during transition).
- New Angular app at `/web-new` (kept separate from `/src` during transition).
- Playwright visual regression suite (`tests/visual/*.spec.ts`).
- Karma+Jasmine unit tests, 80% coverage gate.
- All planning artifacts committed and pushed to `origin/feat/angular-migration`.

### Definition of Done
- [ ] `git checkout feat/angular-migration && npm test` exits 0 with ≥80% coverage.
- [ ] `git checkout feat/angular-migration && npm run e2e` exits 0 with all 14 page screenshots passing.
- [ ] `podman build -f web-new/Containerfile .` produces working image.
- [ ] New backend responds to `/api/health` with 200; PAM login returns session cookie.
- [ ] Frontend frost-out modal triggers on 401/403 from any authenticated endpoint.
- [ ] Backend plugin manifest at `/api/manifest` returns valid template list.
- [ ] Custom MIME types enforced (responses use `application/vnd.cloudbsd+<action>`).
- [ ] All 47 locales selectable; constructed (`tlh`/`doth`/`elv`/`qav`/`qvy`/`atl`) fall back gracefully.
- [ ] Branch pushed to `origin/feat/angular-migration` with planning artifacts.

### Must Have
- 14 Angular pages with **view-only** UX (write controls hidden).
- 47-locale i18n via Angular `$localize` (XLIFF 1.2).
- Frost-out modal on session validation failure.
- Plugin template renderer that can render a page/modal/wizard from a JSON manifest.
- New backend with PAM auth + service discovery.
- `application/vnd.cloudbsd+*` MIME types + `X-CloudBSD-Who/What/Why/Where` headers.
- Playwright visual regression for all 14 pages (desktop + mobile).
- 80% test coverage gate.
- WCAG 2.1 Level AA compliance.

### Must NOT Have (Guardrails)
- No React code in `/web-new` (full migration, no coexistence).
- No SSR (SPA-only; `angular.json` `"ssr": false`).
- No Angular Material / PrimeNG / component library (CDK + Tailwind only).
- No backend write endpoints from the frontend (view-only).
- No `localStorage.setItem('token')` (use HttpOnly cookie set by backend).
- No new dependencies without Angular 20 + Signals compatibility.
- No re-translation of any locale during migration.
- No refactoring of framer-motion into "better" animation (replicate with `@angular/animations`).
- No skipping the `$localize` ID annotation step.
- No skipping the Vitest → Jasmine test conversion.
- No raw HTML for UI mockups in plan markdown (use SVG `<foreignObject>`).
- No Mermaid in SVG files (Mermaid inline in markdown only).
- No Co-authored-by trailers in commits.
- No secrets in any Docker image.
- No Linux-only assumptions (target = FreeBSD host).

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision
- **Infrastructure exists**: YES (Vitest + React Testing Library).
- **Automated tests**: Migrate to **Karma + Jasmine** (Angular CLI default).
- **Framework**: Karma + Jasmine + Angular TestBed.
- **Coverage gate**: 80% lines/branches/functions (enforced via `ng test --code-coverage --watch=false` exit code).
- **Visual regression**: Playwright snapshots of all 14 pages (desktop 1280×720 + mobile 375×812).

### QA Policy
Every task MUST include agent-executed QA scenarios (see TODO template). Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend UI**: Use Playwright (`/playwright` skill) — Navigate, interact, assert DOM, screenshot.
- **Backend API**: Use `curl` + `jq` — Assert status, `Content-Type`, custom headers, response body shape.
- **Auth flow**: Use `curl` with cookie jar + Playwright to drive UI login.
- **Plugin manifest**: Use Playwright to assert manifest items render in sidebar/menus.
- **MIME type**: Use `curl -I` + `jq -r '.headers["content-type"]'` to assert `application/vnd.cloudbsd+*`.

---

## Execution Strategy

### Parallel Execution Waves

> Maximize throughput by grouping independent tasks into parallel waves.
> Target: 5-8 tasks per wave. Wave 0 (docs) and Wave 1 (bootstrap) are foundation; later waves parallelize implementation.

```
Wave 0 (Documentation Foundation — START IN PARALLEL):
├── T01: Branch + repo structure
├── T02: SVG screen diagrams (14 screens)
├── T03: SVG interaction flow diagrams (5 flows)
├── T04: OpenAPI 3.1 spec extraction
├── T05: Plugin contract spec
├── T06: MIME-type registry + header schema doc
└── T07: Screen adjustments inventory (initial pass)

Wave 1 (Backend Foundation — Parallel):
├── T08: New backend repo scaffold (web-new/server)
├── T09: PAM auth middleware
├── T10: Plugin/service registry (in-memory + SQLite-backed)
├── T11: Custom MIME type middleware + CloudBSD headers
├── T12: Manifest endpoint (`/api/manifest`)
├── T13: Session validation endpoint (`/api/session.validate`)
└── T14: Health + login + logout endpoints

Wave 2 (Frontend Foundation — Parallel):
├── T15: Angular 20 workspace scaffold
├── T16: Tailwind + CDK setup
├── T17: $localize + Karma+Jasmine setup
├── T18: NgRx SignalStore setup
├── T19: HttpClient + custom MIME interceptors
├── T20: Frost-out session modal component
└── T21: Plugin template renderer (component library)

Wave 3 (Vertical Slice — Settings Page as Proof):
├── T22: Settings page (view-only mode demo)
├── T23: Theme toggle + locale switcher
├── T24: Session validation flow end-to-end
└── T25: Frost-out modal trigger wiring

Wave 4 (Page Migration — Wave A: 7 pages, parallel):
├── T26: Dashboard page
├── T27: Login page
├── T28: Index (landing) page
├── T29: VMs page
├── T30: OCIContainers page
├── T31: Jails page
└── T32: NotFound page

Wave 5 (Page Migration — Wave B: 7 pages, parallel):
├── T33: Cluster page (uses @xyflow/angular)
├── T34: Volumes page (largest, 979 LOC)
├── T35: NetworkMap page (uses @xyflow/angular)
├── T36: Users page (Admin-only)
├── T37: Logs page (Admin-only)
├── T38: Notifications page
└── T39: ConsoleModal (xterm.js integration)

Wave 6 (Backend Plugin Discoverers):
├── T40: Bhyve VM discoverer (queries `bhyvectl`/vm-bhyve)
├── T41: Podman/OCI container discoverer
├── T42: Jail discoverer (queries `jls`)
├── T43: FreeBSD host stats discoverer (sysctl parsing)
└── T44: Notification/alert discoverer (periodic)

Wave 7 (Integration & Visual Regression):
├── T45: E2E login → dashboard happy path
├── T46: Frost-out modal trigger E2E
├── T47: 14-page Playwright visual snapshots
├── T48: 47-locale E2E smoke (real + constructed fallback)
├── T49: CSP/HSTS/security header audit
└── T50: Bundle size gate (Angular ≤ 150KB compressed gz)

Wave FINAL (4 parallel reviews, then user okay):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real Playwright QA pass (unspecified-high)
└── F4: Scope fidelity + adjustments check (deep)
-> Present results -> Get explicit user okay

Critical Path: T01 → T02-T07 → T08 → T09-T14 → T15 → T19-T21 → T22-T25 → T47 → F1-F4 → user okay → /start-work
Parallel Speedup: ~70% faster than sequential
Max Concurrent: 7 (Waves 1, 4, 5)
```

### Dependency Matrix (abbreviated)
- **T01**: - - T02-T07, T08, T15
- **T08**: T01 - T09-T14, T19
- **T09**: T08 - T22-T24, T36-T37, T45-T46
- **T15**: T01 - T16-T21, T26-T39
- **T21**: T15, T08 - T22-T24, T26-T39
- **T22**: T15, T09, T21 - T23-T25, T45-T46
- **T47**: T22-T39 - F1-F4
- **T50**: T15 - F1-F4

---

## Screen Adjustments (Tracked)

> The user flagged several "odd" things in current screens. Prometheus will adjust these during SVG generation. Every removal/addition is tracked here for explicit approval during Momus review.

| # | Screen | Element | Action | Reason |
|---|--------|---------|--------|--------|
| 1 | Index | (pending review) | (pending) | (pending) |
| 2 | Login | (pending review) | (pending) | (pending) |
| 3 | Dashboard | (pending review) | (pending) | (pending) |
| 4 | VMs | (pending review) | (pending) | (pending) |
| 5 | OCIContainers | (pending review) | (pending) | (pending) |
| 6 | Jails | (pending review) | (pending) | (pending) |
| 7 | Cluster | (pending review) | (pending) | (pending) |
| 8 | Volumes | (pending review) | (pending) | (pending) |
| 9 | NetworkMap | (pending review) | (pending) | (pending) |
| 10 | Users | (pending review) | (pending) | (pending) |
| 11 | Logs | (pending review) | (pending) | (pending) |
| 12 | Notifications | (pending review) | (pending) | (pending) |
| 13 | Settings | (pending review) | (pending) | (pending) |
| 14 | NotFound | (pending review) | (pending) | (pending) |

> **Populated during SVG generation in Wave 0 (T02).** Final table committed to `diagrams/ADJUSTMENTS.md` and surfaced to user during Momus review.

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.
> **A task WITHOUT QA Scenarios is INCOMPLETE. No exceptions.**

---

### Wave 0: Documentation Foundation

- [ ] 1. **Create migration branch `feat/angular-migration` from f01c24b**

  **What to do**:
  - `git checkout -b feat/angular-migration` from current HEAD on `vstest`.
  - Create directory structure: `diagrams/screens/`, `diagrams/flows/`, `server-new/`, `web-new/`, `tests/visual/`.
  - Add `.gitkeep` to empty directories.
  - Add `diagrams/README.md` explaining the diagram convention.
  - Verify `git status` shows branch created, working tree clean.

  **Must NOT do**:
  - Do NOT touch any files outside `diagrams/`, `server-new/`, `web-new/`, `tests/visual/`.
  - Do NOT delete or rename the existing `vstest` branch.
  - Do NOT push yet (later waves handle push).

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Reason**: Trivial git operation + directory scaffolding.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0 (with T02-T07)
  - **Blocks**: T02-T07, T08, T15
  - **Blocked By**: None (can start immediately)

  **Acceptance Criteria**:
  - [ ] `git branch --show-current` outputs `feat/angular-migration`.
  - [ ] `git log --oneline -1` shows `f01c24b` as HEAD.
  - [ ] `ls -d diagrams screens server-new web-new tests/visual` exits 0.
  - [ ] `cat diagrams/README.md` exists and references Mermaid + SVG `<foreignObject>` convention.

  **QA Scenarios**:
  ```
  Scenario: Branch creation
    Tool: Bash
    Preconditions: Working directory is the project root, on branch `vstest`.
    Steps:
      1. git checkout -b feat/angular-migration
      2. git branch --show-current  → expect: feat/angular-migration
      3. git log --oneline -1       → expect: f01c24b ...
      4. mkdir -p diagrams/screens diagrams/flows server-new web-new tests/visual
      5. for d in diagrams/screens diagrams/flows server-new web-new tests/visual; do touch "$d/.gitkeep"; done
    Expected Result: Branch created, directories exist, .gitkeep files in place.
    Failure Indicators: Branch name != feat/angular-migration; HEAD != f01c24b.
    Evidence: .sisyphus/evidence/task-1-branch-creation.txt

  Scenario: diagrams/README.md exists with convention
    Tool: Bash
    Steps:
      1. Write diagrams/README.md with Mermaid + SVG `<foreignObject>` convention.
      2. cat diagrams/README.md | grep -E "Mermaid|foreignObject"
    Expected Result: Both keywords present.
    Evidence: .sisyphus/evidence/task-1-readme-content.txt
  ```

  **Commit**: YES
  - Message: `chore(branch): create feat/angular-migration from f01c24b`
  - Files: `diagrams/README.md`, `.gitkeep` files
  - Pre-commit: `git status` clean before push

---

- [x] 2. **SVG screen mockups (14 screens) + ADJUSTMENTS table** ✅ DONE

  **What to do**:
  - Examine each React page in `src/pages/*.tsx` (14 pages).
  - For each page, identify oddities (per Metis review: Index is 598 bytes tiny, Jails/VMs/OCIContainers are placeholder stubs, CustomPageSizeModal is standalone, redundant tree items).
  - Design an adjusted version per screen.
  - Create `diagrams/screens/<screen-name>.svg` with SVG `<foreignObject>` containing styled HTML mockup.
  - Populate `diagrams/ADJUSTMENTS.md` table with one row per screen change.
  - SVG structural template (per Honcho convention):
    ```xml
    <?xml version="1.0" encoding="UTF-8"?>
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
         viewBox="0 0 1280 800" width="100%" preserveAspectRatio="xMidYMid meet">
      <foreignObject x="0" y="0" width="1280" height="800">
        <div xmlns="http://www.w3.org/1999/xhtml"
             style="position: relative; width: 1280px; height: 800px;
                    font-family: Inter, system-ui, sans-serif; color: #0f172a;
                    background: #f8fafc; box-sizing: border-box; padding: 16px;">
          <!-- Screen content here, all inline styles -->
        </div>
      </foreignObject>
    </svg>
    ```
  - 14 screens: `login.svg`, `index.svg`, `dashboard.svg`, `vms.svg`, `containers.svg`, `jails.svg`, `cluster.svg`, `volumes.svg`, `network.svg`, `users.svg`, `logs.svg`, `notifications.svg`, `settings.svg`, `notfound.svg`.

  **What to do**:
  - Examine each React page in `src/pages/*.tsx` (14 pages).
  - For each page, identify oddities (per Metis review: Index is 598 bytes tiny, Jails/VMs/OCIContainers are placeholder stubs, CustomPageSizeModal is standalone, redundant tree items).
  - Design an adjusted version per screen.
  - Create `diagrams/screens/<screen-name>.svg` with SVG `<foreignObject>` containing styled HTML mockup.
  - Populate `diagrams/ADJUSTMENTS.md` table with one row per screen change.
  - SVG structural template (per Honcho convention):
    ```xml
    <?xml version="1.0" encoding="UTF-8"?>
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
         viewBox="0 0 1280 800" width="100%" preserveAspectRatio="xMidYMid meet">
      <foreignObject x="0" y="0" width="1280" height="800">
        <div xmlns="http://www.w3.org/1999/xhtml"
             style="position: relative; width: 1280px; height: 800px;
                    font-family: Inter, system-ui, sans-serif; color: #0f172a;
                    background: #f8fafc; box-sizing: border-box; padding: 16px;">
          <!-- Screen content here, all inline styles -->
        </div>
      </foreignObject>
    </svg>
    ```
  - 14 screens: `login.svg`, `index.svg`, `dashboard.svg`, `vms.svg`, `containers.svg`, `jails.svg`, `cluster.svg`, `volumes.svg`, `network.svg`, `users.svg`, `logs.svg`, `notifications.svg`, `settings.svg`, `notfound.svg`.

  **Must NOT do**:
  - Do NOT use raw HTML in markdown (per Honcho convention).
  - Do NOT use Mermaid inside SVG files.
  - Do NOT use class/id selectors (GitHub sanitizer strips them).
  - Do NOT use external CSS files (inline styles only).
  - Do NOT skip the ADJUSTMENTS table even if no changes are needed (note "no changes" explicitly).

  **Recommended Agent Profile**:
  - **Category**: `artistry`
  - **Skills**: `[]`
  - **Reason**: Visual design with critical evaluation + SVG craftsmanship.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0 (with T01, T03-T07)
  - **Blocks**: T15 (frontend scaffolding needs screen refs)
  - **Blocked By**: T01 (branch must exist)

  **Acceptance Criteria**:
  - [ ] 14 SVG files exist at `diagrams/screens/*.svg`.
  - [ ] Each SVG is well-formed (XML parser validates).
  - [ ] Each SVG uses `<foreignObject>` with inline-styled HTML.
  - [ ] Each SVG includes the screen name in a visible header.
  - [ ] `diagrams/ADJUSTMENTS.md` has 14 rows (one per screen).
  - [ ] ADJUSTMENTS table has columns: `# | Screen | Element | Action | Reason`.
  - [ ] Each row is either a real change or an explicit "no change" note.

  **QA Scenarios**:
  ```
  Scenario: 14 SVG files exist and parse
    Tool: Bash + xmllint
    Steps:
      1. ls diagrams/screens/*.svg | wc -l  → expect: 14
      2. for f in diagrams/screens/*.svg; do xmllint --noout "$f" || echo "INVALID: $f"; done
      3. for f in diagrams/screens/*.svg; do grep -q "<foreignObject" "$f" || echo "MISSING foreignObject: $f"; done
    Expected Result: 14 files, all valid XML, all use foreignObject.
    Failure Indicators: count != 14; any "INVALID" line; any "MISSING foreignObject" line.
    Evidence: .sisyphus/evidence/task-2-svg-validation.txt

  Scenario: ADJUSTMENTS.md is complete
    Tool: Bash
    Steps:
      1. cat diagrams/ADJUSTMENTS.md | wc -l  → expect: ≥ 20 (header + 14 rows + footer)
      2. grep -c "^|" diagrams/ADJUSTMENTS.md  → expect: ≥ 16 (header separator + 14 rows + footer)
    Expected Result: Table has 14 rows.
    Evidence: .sisyphus/evidence/task-2-adjustments-table.txt

  Scenario: SVG renders in browser (Playwright snapshot)
    Tool: Playwright
    Steps:
      1. npx playwright test --grep "screens render"
      2. For each SVG, load via file:// URL, screenshot, assert non-zero content area.
    Expected Result: All 14 SVGs render to a non-empty screenshot.
    Evidence: .sisyphus/evidence/task-2-svg-screenshots/*.png
  ```

  **Commit**: YES
  - Message: `docs(diagrams): add 14 screen SVG mockups + adjustments table`
  - Files: `diagrams/screens/*.svg`, `diagrams/ADJUSTMENTS.md`
  - Pre-commit: `xmllint --noout diagrams/screens/*.svg`

  **QA Scenarios**:
  ```
  Scenario: 14 SVG files exist and parse
    Tool: Bash + xmllint
    Steps:
      1. ls diagrams/screens/*.svg | wc -l  → expect: 14
      2. for f in diagrams/screens/*.svg; do xmllint --noout "$f" || echo "INVALID: $f"; done
      3. for f in diagrams/screens/*.svg; do grep -q "<foreignObject" "$f" || echo "MISSING foreignObject: $f"; done
    Expected Result: 14 files, all valid XML, all use foreignObject.
    Failure Indicators: count != 14; any "INVALID" line; any "MISSING foreignObject" line.
    Evidence: .sisyphus/evidence/task-2-svg-validation.txt

  Scenario: ADJUSTMENTS.md is complete
    Tool: Bash
    Steps:
      1. cat diagrams/ADJUSTMENTS.md | wc -l  → expect: ≥ 20 (header + 14 rows + footer)
      2. grep -c "^|" diagrams/ADJUSTMENTS.md  → expect: ≥ 16 (header separator + 14 rows + footer)
    Expected Result: Table has 14 rows.
    Evidence: .sisyphus/evidence/task-2-adjustments-table.txt

  Scenario: SVG renders in browser (Playwright snapshot)
    Tool: Playwright
    Steps:
      1. npx playwright test --grep "screens render"
      2. For each SVG, load via file:// URL, screenshot, assert non-zero content area.
    Expected Result: All 14 SVGs render to a non-empty screenshot.
    Evidence: .sisyphus/evidence/task-2-svg-screenshots/*.png
  ```

  **Commit**: YES
  - Message: `docs(diagrams): add 14 screen SVG mockups + adjustments table`
  - Files: `diagrams/screens/*.svg`, `diagrams/ADJUSTMENTS.md`
  - Pre-commit: `xmllint --noout diagrams/screens/*.svg`

---

- [x] 3a. **SVG error presentation mock-ups (12 error states)** ✅ DONE

  **What to do**:
  - Create `diagrams/errors/` directory with 12 SVG mock-ups covering all error states:
    1. `backend-unavailable.svg` — Red banner top, main area with "Backend Unavailable" + Retry button + status details + support link.
    2. `backend-degraded.svg` — Yellow banner top, partial data showing, "Some features unavailable" warning.
    3. `session-expired.svg` — Frost-out modal, "Session Expired" message, OK button.
    4. `session-revoked.svg` — Frost-out modal, "Session Revoked by Administrator" message.
    5. `permission-denied.svg` — Inline error card, "Permission Denied" with explanation, contact admin.
    6. `network-timeout.svg` — Toast notification bottom-right, "Request timed out", retry button.
    7. `server-error.svg` — Inline error card, "Server Error (500)", with error ID, "Report this" link.
    8. `validation-error.svg` — Form field with red border + error text below.
    9. `empty-state.svg` — Centered illustration + "No VMs found" + "Create one" disabled button (view-only).
    10. `connection-lost.svg` — Yellow banner top, "Connection lost - reconnecting..." with spinner.
    11. `plugin-error.svg` — Inline error in plugin area, "Plugin failed to load", retry/disable buttons.
    12. `csrf-failure.svg` — Toast notification, "Session security check failed", re-authenticate prompt.
  - Each SVG uses the same `<foreignObject>` template as screen mockups.
  - All show actual text content (localized placeholder, English).
  - For each, document in the SVG file's visible header: error name, severity (info/warn/error/critical), trigger condition.
  - Add `diagrams/errors/README.md` explaining each error state and when it triggers.

  **Must NOT do**:
  - Do NOT use raw HTML (per Honcho convention).
  - Do NOT use external CSS.
  - Do NOT skip any of the 12 error states.
  - Do NOT include real user data or PII in mockups.

  **Recommended Agent Profile**:
  - **Category**: `artistry`
  - **Skills**: `[]`
  - **Reason**: Visual design for error states.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0 (with T01-T07)
  - **Blocks**: T15e (frontend error components)
  - **Blocked By**: T01

  **Acceptance Criteria**:
  - [ ] 12 SVG files exist at `diagrams/errors/*.svg`.
  - [ ] All SVGs parse as valid XML.
  - [ ] `diagrams/errors/README.md` documents each error state.
  - [ ] Each SVG shows: error name, severity, trigger, message, action buttons.

  **QA Scenarios**:
  ```
  Scenario: 12 error SVGs render
    Tool: Playwright
    Steps:
      1. ls diagrams/errors/*.svg | wc -l  → expect: 12
      2. xmllint --noout diagrams/errors/*.svg
      3. Playwright opens each, screenshots.
    Expected Result: 12 valid SVGs, all render.
    Evidence: .sisyphus/evidence/task-3a-error-screenshots/*.png
  ```

  **Commit**: YES
  - Message: `docs(diagrams): add 12 error presentation SVG mock-ups`
  - Files: `diagrams/errors/*.svg`, `diagrams/errors/README.md`

---

- [x] 3b. **Admin Settings → Error Display section SVG mock-up** ✅ DONE (in `diagrams/screens/11-settings.svg`)

  **What to do**:
  - Create `diagrams/screens/settings-error-display.svg` (or add to settings screen mock-up).
  - Show the "Error Display" settings section:
    - Section title "Error Display"
    - Description "How much detail to show when errors occur"
    - Radio button group:
      - ⦿ Minimal — "Show only error type. Best for general users."
      - ◯ Standard — "Show error details and IDs for support. Recommended."
      - ⦿ Detailed — "Show technical details, request IDs, stack traces. Recommended for admins." (selected for admin)
      - ◯ Debug — "Show full debug info including headers. Use only when troubleshooting."
    - For non-admin view: hide Detailed and Debug options
    - Save button (instant apply or explicit save based on UX choice)

  **Recommended Agent Profile**:
  - **Category**: `artistry`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0
  - **Blocked By**: T01

  **Acceptance Criteria**:
  - [ ] SVG shows admin view with all 4 radio options.
  - [ ] SVG shows non-admin view with only Minimal and Standard.
  - [ ] Save button visible.
  - [ ] SVG renders correctly in Playwright.

  **QA Scenarios**:
  ```
  Scenario: Settings mock-up renders
    Tool: Playwright
    Steps:
      1. Playwright opens the SVG.
      2. Asserts all 4 radio options visible.
    Expected Result: SVG renders.
    Evidence: .sisyphus/evidence/task-3b-settings-mockup.png
  ```

  **Commit**: YES
  - Message: `docs(diagrams): add Error Display settings section mock-up`
  - Files: `diagrams/screens/settings-error-display.svg`

---

- [x] 3c. **SVG notification mock-ups (5 types)** ✅ DONE

  **What to do**:
  - Create `diagrams/notifications/` directory.
  - 5 SVG files (using `<foreignObject>` template):
    1. `info-toast.svg` — Blue accent, info icon, "VM metadata refreshed", auto-dismiss 5s indicator.
    2. `success-toast.svg` — Green accent, check icon, "Preferences saved", auto-dismiss 5s indicator.
    3. `warning-toast.svg` — Yellow accent, warning icon, "Backend slow response", auto-dismiss 8s.
    4. `error-toast.svg` — Red accent, error icon, "Failed to refresh", manual dismiss × button.
    5. `system-notification.svg` — Persistent system notification (top banner), "VM started by admin", dismissible.

  **Recommended Agent Profile**:
  - **Category**: `artistry`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0
  - **Blocked By**: T01

  **Acceptance Criteria**:
  - [ ] 5 SVG files exist at `diagrams/notifications/*.svg`.
  - [ ] All parse as valid XML.
  - [ ] Each shows: icon, message, dismiss control, position (bottom-right for toast, top for banner).
  - [ ] Color coded by severity.

  **QA Scenarios**: Standard Playwright snapshot validation.

  **Commit**: YES
  - Message: `docs(diagrams): add 5 notification SVG mock-ups`
  - Files: `diagrams/notifications/*.svg`

---

- [x] 3d. **SVG modal mock-ups (6 modal types)** ✅ DONE

  **What to do**:
  - Create `diagrams/modals/` directory.
  - 6 SVG files:
    1. `error-modal.svg` — Reusable error modal with 4 detail-level variants (MINIMAL/STANDARD/DETAILED/DEBUG) shown side-by-side or in 2x2 grid.
    2. `frost-out-modal.svg` — Session expired, full-page frost overlay.
    3. `confirmation-modal.svg` — Generic confirmation with OK/Cancel.
    4. `resource-details-modal.svg` — View-only VM/container details.
    5. `about-modal.svg` — App info (version, license, links).
    6. `logout-confirmation.svg` — Confirm logout before session ends.

  **Recommended Agent Profile**:
  - **Category**: `artistry`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0
  - **Blocked By**: T01

  **Acceptance Criteria**:
  - [ ] 6 SVG files exist.
  - [ ] All parse as valid XML.
  - [ ] Error modal shows all 4 detail levels clearly distinguished.
  - [ ] Frost-out modal shows page obscured behind it.

  **Commit**: YES
  - Message: `docs(diagrams): add 6 modal SVG mock-ups`
  - Files: `diagrams/modals/*.svg`

---

- [x] 3e. **SVG core UI component mock-ups (15 components)** ✅ DONE

  **What to do**:
  - Create `diagrams/components/` directory.
  - 15 SVG files (each component shown in isolation, in default state, optionally with hover/focus/disabled variants):
    1. `sidebar-expanded.svg` — Full sidebar with menu items, active state, badges.
    2. `sidebar-collapsed.svg` — Icons-only collapsed state.
    3. `mobile-sidebar.svg` — Mobile drawer overlay.
    4. `header.svg` — Top header with user menu, theme toggle, locale switcher.
    5. `mobile-topbar.svg` — Mobile compact header.
    6. `stat-card.svg` — Stat with value/label/trend.
    7. `chart-card.svg` — Card with embedded chart.
    8. `data-table.svg` — Table with sort/pagination/search.
    9. `data-table-empty.svg` — Empty table.
    10. `badge.svg` — All badge variants in one SVG.
    11. `form-input.svg` — Input states (default/focus/error/disabled).
    12. `form-select.svg` — Select closed and open.
    13. `form-toggle.svg` — Toggle on/off/disabled.
    14. `button-variants.svg` — All button styles.
    15. `tree-item.svg` — Tree node with children.

  **Recommended Agent Profile**:
  - **Category**: `artistry`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0
  - **Blocked By**: T01

  **Acceptance Criteria**:
  - [ ] 15 SVG files exist.
  - [ ] All parse as valid XML.
  - [ ] Components match Tailwind utility classes used in actual implementation.

  **Commit**: YES
  - Message: `docs(diagrams): add 15 core UI component SVG mock-ups`
  - Files: `diagrams/components/*.svg`

---

- [x] 3f. **SVG theme variants (light/dark/high-contrast)** ✅ DONE

  **What to do**:
  - Create `diagrams/themes/` directory.
  - 3 SVG files:
    1. `login-light.svg` — Login screen in light mode.
    2. `login-dark.svg` — Same login in dark mode.
    3. `dashboard-high-contrast.svg` — Dashboard in WCAG AAA high contrast (black/white only, large text).

  **Recommended Agent Profile**:
  - **Category**: `artistry`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0
  - **Blocked By**: T01

  **Acceptance Criteria**:
  - [ ] 3 SVG files exist.
  - [ ] Color tokens match Tailwind config (per T16).
  - [ ] High contrast passes WCAG AAA (≥7:1 contrast).

  **Commit**: YES
  - Message: `docs(diagrams): add 3 theme variant SVG mock-ups`
  - Files: `diagrams/themes/*.svg`

---

- [x] 3g. **SVG mobile variants (3 key screens at 375×812)** ✅ DONE

  **What to do**:
  - Create `diagrams/mobile/` directory.
  - 3 SVG files:
    1. `mobile-dashboard.svg` — Dashboard at 375×812.
    2. `mobile-vms-list.svg` — VM list view on mobile.
    3. `mobile-vm-detail.svg` — VM detail on mobile.

  **Recommended Agent Profile**:
  - **Category**: `artistry`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0
  - **Blocked By**: T01

  **Acceptance Criteria**:
  - [ ] 3 SVG files exist.
  - [ ] viewBox is 0 0 375 812.
  - [ ] Touch targets ≥ 44×44px (WCAG 2.5.5).
  - [ ] Text scales appropriately.

  **Commit**: YES
  - Message: `docs(diagrams): add 3 mobile variant SVG mock-ups`
  - Files: `diagrams/mobile/*.svg`

---

- [x] 3h. **SVG loading/state variant mock-ups (4 states)** ✅ DONE

  **What to do**:
  - Create `diagrams/states/` directory.
  - 4 SVG files:
    1. `loading-skeleton.svg` — Skeleton placeholder for a list/table.
    2. `loading-spinner.svg` — Centered spinner with optional message.
    3. `progress-bar.svg` — Linear progress bar (for long ops).
    4. `empty-state-illustration.svg` — Generic empty state with illustration.

  **Recommended Agent Profile**:
  - **Category**: `artistry`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0
  - **Blocked By**: T01

  **Commit**: YES
  - Message: `docs(diagrams): add 4 loading/state SVG mock-ups`
  - Files: `diagrams/states/*.svg`

---

- [x] 3i. **SVG plugin manifest mock-ups (3 dynamic UI surfaces)** ✅ DONE

  **What to do**:
  - Create `diagrams/plugins/` directory.
  - 3 SVG files:
    1. `new-menu-item-toast.svg` — Toast notification when new plugin menu item appears in sidebar.
    2. `plugin-page-rendered.svg` — Dynamic plugin page rendered from manifest template.
    3. `plugin-modal-rendered.svg` — Dynamic modal triggered by plugin event.

  **Recommended Agent Profile**:
  - **Category**: `artistry`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0
  - **Blocked By**: T01

  **Commit**: YES
  - Message: `docs(diagrams): add 3 plugin manifest SVG mock-ups`
  - Files: `diagrams/plugins/*.svg`

---

- [ ] 3j. **UI coverage matrix document**

  **What to do**:
  - Create `diagrams/ui-coverage-matrix.md`.
  - Markdown table with 71 rows mapping every UI surface to its mock-up file.
  - Columns: `UI Surface | Type | Mock-up File | Status`.
  - Status initially `Pending`, updated to `Done` after each task completes.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0
  - **Blocked By**: T01

  **Acceptance Criteria**:
  - [ ] `diagrams/ui-coverage-matrix.md` exists.
  - [ ] Table has 71 rows.
  - [ ] All rows have mock-up file paths.

  **Commit**: YES
  - Message: `docs(diagrams): add UI coverage matrix`
  - Files: `diagrams/ui-coverage-matrix.md`

---

- [ ] 3k. **Theme catalog design document (15 themes)**

  **What to do**:
  - Create `diagrams/themes/README.md`.
  - Document all 15 themes with:
    - Theme name + era + inspiration (generic, no trademark).
    - Full color palette (primary, secondary, accent, bg, text, borders, semantic).
    - Typography (font family, sizes).
    - Signature visual element (scanlines, pixel borders, bevel, pinstripes, glass).
    - WCAG 2.1 AA contrast check.
  - Include table mapping theme → file path in `diagrams/themes/`.
  - Include token schema reference.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0
  - **Blocked By**: T01

  **Acceptance Criteria**:
  - [ ] `diagrams/themes/README.md` exists.
  - [ ] All 15 themes documented.
  - [ ] Color palettes use hex values.
  - [ ] Typography specified per theme.
  - [ ] Contrast ratios verified for AA.

  **Commit**: YES
  - Message: `docs(themes): add 15-theme catalog design document`
  - Files: `diagrams/themes/README.md`

---

- [x] 3l. **15 theme mock-up SVGs + comparison grid** ✅ DONE

  **What to do**:
  - Create `diagrams/themes/<theme-slug>.svg` × 15.
  - Each shows the Dashboard view rendered in that theme:
    - Header with theme accent color.
    - Sidebar with theme styling.
    - 1 stat card.
    - 1 chart card.
    - 1 table row.
    - Typography sample.
    - One signature element (scanlines, pixel borders, bevel, pinstripes, glass blur).
  - Additionally: `diagrams/themes/comparison-grid.svg` — all 15 themes at thumbnail (200×150) in a 5×3 grid.

  **Recommended Agent Profile**:
  - **Category**: `artistry`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0
  - **Blocked By**: T01, T3k (catalog)

  **Acceptance Criteria**:
  - [ ] 16 SVG files exist (15 themes + 1 comparison grid).
  - [ ] All parse as valid XML.
  - [ ] Each theme mock-up shows dashboard with signature element.
  - [ ] Comparison grid has 15 thumbnails.
  - [ ] No trademark terms in SVG visible text.

  **Commit**: YES
  - Message: `docs(themes): add 15 theme SVG mock-ups + comparison grid`
  - Files: `diagrams/themes/*.svg`

---

- [x] 3m. **Theme customizer mock-ups (8 SVG files)** ✅ DONE

  **What to do**:
  - Create `diagrams/screens/theme-editor.svg` — Full theme editor with tab navigation.
  - Create `diagrams/screens/theme-editor-colors.svg` — Colors tab with color pickers.
  - Create `diagrams/screens/theme-editor-branding.svg` — Branding tab with logo upload area.
  - Create `diagrams/screens/theme-import.svg` — Import dialog (file upload + JSON paste + preview).
  - Create `diagrams/screens/theme-export.svg` — Export dialog showing JSON preview.
  - Create `diagrams/screens/theme-gallery.svg` — Theme gallery (grid of all 15+ themes).
  - Create `diagrams/modals/theme-conflict.svg` — "Replace existing theme?" modal.
  - Create `diagrams/modals/theme-validation-error.svg` — "Invalid theme" error modal with field-level errors.

  **Recommended Agent Profile**:
  - **Category**: `artistry`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0
  - **Blocked By**: T01, T3k

  **Acceptance Criteria**:
  - [ ] 8 SVG files exist.
  - [ ] All parse as valid XML.
  - [ ] Editor shows tabs: Colors, Typography, Effects, Branding, Preview, Metadata.
  - [ ] Import dialog shows: file upload area, JSON paste area, preview area, Save button.
  - [ ] Export dialog shows: JSON preview, Download button.

  **Commit**: YES
  - Message: `docs(themes): add theme customizer mock-ups (8 files)`
  - Files: `diagrams/screens/theme-editor*.svg`, `diagrams/screens/theme-import.svg`, `diagrams/screens/theme-export.svg`, `diagrams/screens/theme-gallery.svg`, `diagrams/modals/theme-*.svg`

---

- [ ] 3n. **Theme JSON schema (`diagrams/theme-schema.json`)**

  **What to do**:
  - Create `diagrams/theme-schema.json` — JSON Schema (draft 2020-12) for theme files.
  - Defines: required fields, optional fields, types, enums, patterns.
  - Validates color values (hex pattern).
  - Validates font names (enum of allowed fonts).
  - Validates logo data URL format.
  - Validates signature format (`sha256:...`).
  - Rejects `__proto__`, `constructor`, `prototype` keys.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0
  - **Blocked By**: T01

  **Acceptance Criteria**:
  - [ ] `diagrams/theme-schema.json` exists and parses as valid JSON Schema.
  - [ ] All theme token fields documented with types.
  - [ ] Validation rejects malformed files.

  **Commit**: YES
  - Message: `docs(themes): add theme JSON schema`
  - Files: `diagrams/theme-schema.json`

---

- [ ] 3p. **Man pages (5 sections, mdoc(7) format)**

  **What to do**:
  - Write 5 man pages in mdoc(7) format (FreeBSD standard):
    1. `man/man8/cloudbsd-admin.8` — System administration command
    2. `man/man5/cloudbsd-admin.conf.5` — Config file format
    3. `man/man5/cloudbsd-admin-theme.5` — Theme file format
    4. `man/man5/cloudbsd-admin-plugin.5` — Plugin manifest format
    5. `man/man5/cloudbsd-admin-logs.5` — JSONL log format
  - Each follows standard sections: NAME, SYNOPSIS, DESCRIPTION, OPTIONS/FORMAT, FILES, EXAMPLES, DIAGNOSTICS, SEE ALSO, HISTORY, AUTHORS.
  - Verified rendering via `man -w <page>` and `man <page>` in FreeBSD VM.
  - English only (primary language per Honcho guidelines).

  **Must NOT do**:
  - Do NOT use non-FreeBSD-standard formats.
  - Do NOT include trademarked names.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0
  - **Blocked By**: T01

  **Acceptance Criteria**:
  - [ ] 5 man pages written.
  - [ ] All render with `man cloudbsd-admin` etc.
  - [ ] Each has all required sections.
  - [ ] Cross-references (`SEE ALSO`) point to real pages.

  **Commit**: YES
  - Message: `docs(manpages): add 5 man pages in mdoc(7) format`
  - Files: `docs/man/man8/cloudbsd-admin.8`, `docs/man/man5/*.5`

---

- [ ] 3q. **Documentation files (12 docs)**

  **What to do**:
  - Write 12 documentation files at repo root:
    1. `README.md` — Updated project overview
    2. `INSTALL.md` — FreeBSD install guide
    3. `UPGRADE.md` — Upgrade procedures
    4. `ADMIN_GUIDE.md` — Day-to-day administration
    5. `DEVELOPER_GUIDE.md` — Plugin/theme development
    6. `THEME_REFERENCE.md` — Theme token reference
    7. `PLUGIN_REFERENCE.md` — Plugin manifest reference
    8. `API_REFERENCE.md` — REST API reference (generated from OpenAPI)
    9. `SECURITY.md` — Security architecture
    10. `CHANGELOG.md` — Version history (Keep-a-Changelog format)
    11. `TROUBLESHOOTING.md` — Common issues
    12. `FAQ.md` — Frequently asked questions
  - English only.
  - Link to relevant code locations.
  - Include examples for non-trivial concepts.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0
  - **Blocked By**: T01

  **Acceptance Criteria**:
  - [ ] 12 docs exist.
  - [ ] All internal links resolve.
  - [ ] Examples are runnable.

  **Commit**: YES
  - Message: `docs: add 12 documentation files (README, INSTALL, etc.)`
  - Files: `README.md`, `INSTALL.md`, `UPGRADE.md`, etc.

---

- [ ] 3r. **In-app help content (searchable articles)**

  **What to do**:
  - Write help articles for the in-app help system.
  - Stored as JSON: `web-new/src/app/help/articles.json` or markdown files.
  - One article per topic (e.g., "vms", "themes", "plugins", "logging", "security").
  - Topics:
    - Getting started
    - Navigation
    - VM management (view-only)
    - Container management
    - Jails
    - Volumes
    - Network map
    - Cluster
    - Themes (built-in + custom)
    - Plugins
    - Logs (JSONL format)
    - Settings (language, theme, error display)
    - Keyboard shortcuts
    - Troubleshooting
  - Each article: title, category, body (markdown), related topics.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0
  - **Blocked By**: T01

  **Acceptance Criteria**:
  - [ ] Articles cover all major features.
  - [ ] Search works (full-text).
  - [ ] Cross-references between articles.

  **Commit**: YES
  - Message: `docs(help): add in-app help article content`
  - Files: `web-new/src/app/help/articles/`

---

- [ ] 3s. **In-app documentation browser**

  **What to do**:
  - `web-new/src/app/docs/`:
    - `docs-browser.component.ts`: `/docs` route, sidebar + main content.
    - `docs.service.ts`: Loads and parses markdown docs.
    - `docs-search.component.ts`: Full-text search across all docs.
    - `docs-toc.component.ts`: Per-page table of contents.
  - Renders all 12 repo docs (README, INSTALL, etc.) in-app.
  - Sidebar grouped by category (Getting Started, Admin, Developer, Reference).
  - Markdown rendered with `ngx-markdown` (or similar).
  - Syntax highlighting via Prism/highlight.js.
  - Print-friendly CSS.
  - "Edit on GitHub" link per page.
  - URL routing: `/docs/install`, `/docs/admin/users`, etc.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocked By**: T01, T3q

  **Acceptance Criteria**:
  - [ ] All 12 docs browsable.
  - [ ] Search returns results.
  - [ ] Markdown renders with code highlighting.
  - [ ] Print view works.

  **Commit**: YES
  - Message: `feat(docs): add in-app documentation browser`
  - Files: `web-new/src/app/docs/`

---

- [ ] 3t. **In-app API documentation (Swagger UI)**

  **What to do**:
  - `web-new/src/app/api-docs/`:
    - `swagger-ui.component.ts`: `/api-docs` route, embeds Swagger UI.
    - Uses `swagger-ui-dist` package.
    - Loads OpenAPI spec from backend (`/api/openapi.json`).
    - Try-it-out enabled (requires session).
    - Schema browser in sidebar.
    - Server selection if multiple backends.
    - Auth header persists across requests.
  - Cache OpenAPI spec on app load.
  - Refresh button for spec updates.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocked By**: T4 (OpenAPI spec)

  **Acceptance Criteria**:
  - [ ] Swagger UI loads at `/api-docs`.
  - [ ] All endpoints listed.
  - [ ] Try-it-out works.
  - [ ] Auth header set.

  **Commit**: YES
  - Message: `feat(api-docs): embed Swagger UI for REST API reference`
  - Files: `web-new/src/app/api-docs/`

---

- [ ] 3u. **Help analytics service (opt-in)**

  **What to do**:
  - `web-new/src/app/help/analytics/`:
    - `help-analytics.service.ts`: Tracks article views, search queries, bounce.
    - Posts aggregated events to `/api/help/analytics`.
    - Admin setting to disable (`help_analytics_enabled` in settings).
  - Privacy: No PII, only aggregated counts.
  - Stored in backend JSONL logs.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocked By**: T15m (help modal)

  **Acceptance Criteria**:
  - [ ] Article views tracked.
  - [ ] Settings toggle works.
  - [ ] No PII collected.

  **Commit**: YES
  - Message: `feat(help): add opt-in help analytics`
  - Files: `web-new/src/app/help/analytics/`

---

- [ ] 3v. **Release notes page**

  **What to do**:
  - `web-new/src/app/release-notes/`:
    - `release-notes.component.ts`: `/release-notes` route.
    - Loads `CHANGELOG.md` and renders.
    - Filter by version (dropdown).
    - Highlight breaking changes section.
    - Markdown rendered.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocked By**: T3q (CHANGELOG.md)

  **Acceptance Criteria**:
  - [ ] Changelog renders.
  - [ ] Version filter works.
  - [ ] Breaking changes highlighted.

  **Commit**: YES
  - Message: `feat(pages): add release notes viewer`
  - Files: `web-new/src/app/release-notes/`

---

- [ ] 4. **OpenAPI 3.1 spec for new PAM-auth backend**

  **What to do**:
  - Extract all routes from current `server/src/index.ts` (45 endpoints identified via grep).
  - Generate `diagrams/openapi.yaml` in OpenAPI 3.1 format covering:
    - Auth: `/api/health`, `/api/login`, `/api/logout`, `/api/csrf`, `/api/session.validate`.
    - Resources: `/api/users`, `/api/logs`, `/api/nodes`, `/api/cluster/stats`, `/api/volumes`, `/api/disks`, `/api/notifications`, `/api/system/*`, generic `/api/:resource`.
    - New endpoints: `/api/manifest`, `/api/templates/:id`, `/api/plugins`, `/api/services/discover`.
  - Use the actual `@openapi` JSDoc annotations from `server/src/index.ts` as ground truth.
  - Add `application/vnd.cloudbsd+*` content types under `content` blocks.
  - Add `X-CloudBSD-Who/What/Why/Where` as required request headers.
  - Define `SecurityScheme` for both session cookie (new) and Bearer JWT (legacy migration).
  - Include `x-tagGroups` for plugin categories.

  **Must NOT do**:
  - Do NOT invent new endpoints that don't exist in current code.
  - Do NOT omit any existing endpoints (verify count = 45).
  - Do NOT use Swagger 2.0 syntax; OpenAPI 3.1 only.
  - Do NOT include any secrets in `examples`.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `[]`
  - **Reason**: Specification authoring, not implementation.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0
  - **Blocks**: T08, T12-T14 (backend needs spec)
  - **Blocked By**: T01

  **Acceptance Criteria**:
  - [ ] `diagrams/openapi.yaml` exists and parses as valid YAML.
  - [ ] `openapi: 3.1.0` (or compatible) declared at top.
  - [ ] `npx swagger-cli validate diagrams/openapi.yaml` exits 0.
  - [ ] Endpoint count ≥ 45 (matches current backend).
  - [ ] `application/vnd.cloudbsd+*` appears in `content` blocks.
  - [ ] `X-CloudBSD-Who/What/Why/Where` declared as `parameters` with `in: header`, `required: true` where applicable.

  **QA Scenarios**:
  ```
  Scenario: OpenAPI spec is valid
    Tool: Bash + swagger-cli
    Steps:
      1. npx --yes @apidevtools/swagger-cli@latest validate diagrams/openapi.yaml
      2. grep -c "^  /api/" diagrams/openapi.yaml  → expect: ≥ 45
      3. grep -c "application/vnd.cloudbsd+" diagrams/openapi.yaml  → expect: ≥ 10
      4. grep -E "X-CloudBSD-(Who|What|Why|Where)" diagrams/openapi.yaml | wc -l  → expect: ≥ 4
    Expected Result: Spec validates, endpoint count matches, custom MIME + headers present.
    Evidence: .sisyphus/evidence/task-4-openapi-validation.txt

  Scenario: Spec is loadable in swagger-ui
    Tool: Bash
    Steps:
      1. npx --yes swagger-ui-watcher diagrams/openapi.yaml &
      2. curl -sI http://localhost:8888/ | grep "200"
    Expected Result: UI loads, spec renders.
    Evidence: .sisyphus/evidence/task-4-swagger-ui-load.png
  ```

  **Commit**: YES
  - Message: `docs(api): add OpenAPI 3.1 spec for new PAM-auth backend`
  - Files: `diagrams/openapi.yaml`

---

- [ ] 5. **Plugin contract spec (`diagrams/plugin-contract.md`)**

  **What to do**:
  - Author a markdown document specifying the plugin/template manifest schema.
  - Cover:
    - Manifest endpoint contract: `GET /api/manifest` returns `{plugins: [...], templates: [...], services: [...]}`.
    - Template schema: `{type: 'page'|'modal'|'wizard'|'menu', id, title, icon, layout: [ComponentSpec...], dataBindings: {...}, permissions: [...]}`.
    - Component library: list of available component types (`Card`, `Table`, `Form`, `Chart`, `Tree`, `Badge`, `StatCard`, etc.) with their prop schemas.
    - Data binding syntax: `{endpoint: '/api/foo', transform: '...', refreshInterval: 5000}`.
    - Permission model: which roles can render which template types.
    - Lifecycle hooks: `onMount`, `onDataLoaded`, `onAction`, `onError`.
  - Include JSON examples for each template type.
  - Include a worked example: "Add a new VM metrics page" → backend emits manifest entry → frontend renders.

  **Must NOT do**:
  - Do NOT include actual code (this is a contract spec).
  - Do NOT skip the worked example.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0
  - **Blocks**: T12, T21
  - **Blocked By**: T01

  **Acceptance Criteria**:
  - [ ] `diagrams/plugin-contract.md` exists.
  - [ ] Document has sections for: Manifest, Template Schema, Components, Data Binding, Permissions, Lifecycle, Worked Example.
  - [ ] Worked example is concrete and step-by-step.

  **QA Scenarios**:
  ```
  Scenario: Plugin contract is complete
    Tool: Bash
    Steps:
      1. test -f diagrams/plugin-contract.md
      2. for section in "Manifest" "Template Schema" "Components" "Data Binding" "Permissions" "Lifecycle" "Worked Example"; do
           grep -q "## $section" diagrams/plugin-contract.md || echo "MISSING: $section"
         done
    Expected Result: All sections present.
    Evidence: .sisyphus/evidence/task-5-plugin-contract-sections.txt

  Scenario: Worked example renders to valid JSON
    Tool: Bash + jq
    Steps:
      1. Extract worked example JSON block from markdown.
      2. echo "$JSON" | jq .  → expect: valid JSON
    Expected Result: JSON parses.
    Evidence: .sisyphus/evidence/task-5-worked-example-valid.txt
  ```

  **Commit**: YES
  - Message: `docs(plugin): add plugin/template contract spec`
  - Files: `diagrams/plugin-contract.md`

---

- [ ] 6. **Custom MIME-type registry + CloudBSD header schema (`diagrams/mime-registry.md`)**

  **What to do**:
  - Author a markdown document enumerating all `application/vnd.cloudbsd+*` MIME types.
  - Cover:
    - Verb-noun taxonomy (e.g., `+login`, `+createvm`, `+startcontainer`, `+listvolumes`, `+manifest`, `+template`, `+session.validate`).
    - Required `X-CloudBSD-Who/What/Why/Where` headers and their semantics.
    - `Accept` header negotiation on the client.
    - Versioning: `application/vnd.cloudbsd.v2+<action>` for breaking changes.
  - Include a registry table: each row = (action name, MIME type, required headers, example payload).
  - Reference RFC 6838 for media type structure.

  **Must NOT do**:
  - Do NOT use generic `application/json` in any examples.
  - Do NOT skip the versioning strategy.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0
  - **Blocks**: T11, T19
  - **Blocked By**: T01

  **Acceptance Criteria**:
  - [ ] `diagrams/mime-registry.md` exists.
  - [ ] Registry table has ≥ 20 entries.
  - [ ] Versioning section present.
  - [ ] Required headers section present with 4 headers documented.

  **QA Scenarios**:
  ```
  Scenario: Registry completeness
    Tool: Bash
    Steps:
      1. grep -c "^| .*vnd.cloudbsd" diagrams/mime-registry.md  → expect: ≥ 20
      2. for h in Who What Why Where; do grep -q "X-CloudBSD-$h" diagrams/mime-registry.md; done
      3. grep -q "Versioning" diagrams/mime-registry.md
    Expected Result: ≥ 20 MIME entries, all 4 headers documented, versioning present.
    Evidence: .sisyphus/evidence/task-6-mime-registry.txt
  ```

  **Commit**: YES
  - Message: `docs(mime): add cloudbsd/* MIME-type registry`
  - Files: `diagrams/mime-registry.md`

---

### Wave 1: Backend Foundation

- [ ] 7a. **Backend state broadcaster (Socket.IO streaming events)**

  **What to do**:
  - Create `server-new/src/state/` directory.
  - `broadcaster.ts`: `StateBroadcaster` class wrapping Socket.IO.
    - `publishUpsert(topic, resource_id, data)` → emits `state:upsert` to topic room.
    - `publishDelete(topic, resource_id)` → emits `state:delete`.
    - `publishClear(topic)` → emits `state:clear`.
    - `publishSnapshot(socket, topic, data)` → emits `state:snapshot` to one socket.
  - `subscription-manager.ts`: tracks `Map<topic, Set<socketId>>`.
    - `subscribe(socket, topics)` → joins socket to topic rooms, sends snapshot.
    - `unsubscribe(socket, topics)` → leaves rooms.
    - `handleRefresh(socket, topic)` → re-sends snapshot for topic.
  - `events.ts`: Socket.IO event handlers for `state:subscribe`, `state:unsubscribe`, `state:refresh`.
  - All publishes logged via JSONL logger with `{module: 'state', topic, action, subscriber_count}`.
  - Tests: publish to N subscribers, unsubscribe removes from room, refresh re-sends snapshot.

  **Must NOT do**:
  - Do NOT broadcast without first checking authorization.
  - Do NOT send sensitive data (passwords, tokens) via state updates.
  - Do NOT use Socket.IO rooms for authorization (use middleware).

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Reason**: Real-time pub/sub architecture; needs careful design.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T08-T14, T58a-c)
  - **Blocks**: T40-T44 (discoverers integrate with broadcaster)
  - **Blocked By**: T08 (backend scaffold), T08a (logger)

  **Acceptance Criteria**:
  - [ ] `StateBroadcaster.publishUpsert('vms', 'vm-1', {...})` emits to all subscribers in `state:vms` room.
  - [ ] `SubscriptionManager.subscribe(socket, ['vms', 'containers'])` joins both rooms and sends snapshot.
  - [ ] `state:refresh {topic: 'vms'}` triggers snapshot re-send.
  - [ ] All broadcasts logged via JSONL logger.
  - [ ] Socket.IO middleware validates session cookie before allowing subscription.

  **QA Scenarios**:
  ```
  Scenario: Publish to subscribers
    Tool: Bash + node script
    Steps:
      1. Create Socket.IO client + server in test.
      2. Client subscribes to 'vms'.
      3. Server calls broadcaster.publishUpsert('vms', 'vm-1', {name: 'test'}).
      4. Assert client receives state:upsert with correct payload.
    Expected Result: Client receives update.
    Evidence: .sisyphus/evidence/task-7a-publish.txt

  Scenario: Unauthenticated connection rejected
    Tool: Bash
    Steps:
      1. Socket.IO connect without session cookie.
      2. Attempt state:subscribe.
      3. Assert connection rejected (401 or disconnect).
    Expected Result: No subscription allowed.
    Evidence: .sisyphus/evidence/task-7a-auth.txt
  ```

  **Commit**: YES
  - Message: `feat(state): add backend state broadcaster with Socket.IO streaming events`
  - Files: `server-new/src/state/`

---

- [ ] 7b. **Backend initial state snapshot (per-topic)**

  **What to do**:
  - `snapshot.ts`: builds initial state for each topic.
    - `buildVMSnapshot()`: queries current VMs via `BhyveVMDiscoverer`.
    - `buildContainersSnapshot()`: queries via `PodmanDiscoverer`.
    - `buildJailsSnapshot()`: queries via `JailDiscoverer`.
    - `buildSystemSnapshot()`: queries FreeBSD stats.
    - `buildNotificationsSnapshot()`: queries notification discoverer.
    - `buildClusterSnapshot()`: aggregates all above.
    - `buildUsersSnapshot()`: lists users (admin-only).
  - Returns `{topic, data, timestamp}` per topic.
  - Called on `state:subscribe` to seed the topic.
  - Cached for 5s to prevent redundant queries on rapid re-subscribes.

  **Must NOT do**:
  - Do NOT include passwords or sensitive fields in snapshots.
  - Do NOT include other users' session IDs.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  - **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocked By**: T7a, T40-T44 (discoverers)

  **Acceptance Criteria**:
  - [ ] Each topic has a snapshot builder.
  - [ ] Snapshots are JSON-serializable.
  - [ ] Cache returns same data within 5s window.
  - [ ] Cache invalidated on `state:upsert` events for the topic.

  **QA Scenarios**:
  ```
  Scenario: Snapshot contains all topics
    Tool: Bash
    Steps:
      1. Login, connect Socket.IO.
      2. Subscribe to all topics.
      3. Assert state:snapshot received for each.
      4. Verify shape: {vms: [...], containers: [...], jails: [...], volumes: [...], disks: [...], notifications: [...], cluster: {...}, system: {...}, users: [...]}.
    Expected Result: All topics populated.
    Evidence: .sisyphus/evidence/task-7b-snapshot.json

  Scenario: Snapshot cache
    Tool: Bash
    Steps:
      1. Subscribe → snapshot.
      2. Within 5s, subscribe again → returns cached snapshot.
      3. After 5s, subscribe → fresh query.
    Expected Result: Cache works.
    Evidence: .sisyphus/evidence/task-7b-cache.txt
  ```

  **Commit**: YES
  - Message: `feat(state): add initial state snapshot builders per topic`
  - Files: `server-new/src/state/snapshot.ts`

---

- [ ] 7c. **Backend Socket.IO middleware + session-cookie auth**

  **What to do**:
  - Socket.IO middleware reads `cbsd_session` cookie from handshake headers.
  - Validates session against DB (or JWT verification if applicable).
  - On success: attach `socket.data.user`, `socket.data.session_id`.
  - On failure: reject connection with disconnect reason.
  - This middleware runs BEFORE any subscription is allowed.
  - Reuses `authenticateSession` from T09.

  **Must NOT do**:
  - Do NOT skip validation even for "internal" topics.
  - Do NOT log session tokens.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  - **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocked By**: T09, T7a

  **Acceptance Criteria**:
  - [ ] Socket.IO connection without `cbsd_session` cookie is rejected.
  - [ ] Connection with valid cookie attaches `socket.data.user`.
  - [ ] Connection with expired session is rejected.
  - [ ] Logout invalidates socket connection.

  **QA Scenarios**:
  ```
  Scenario: Unauthenticated socket rejected
    Tool: Bash + node script
    Steps:
      1. io() without cookie → expect: connect_error
    Expected Result: Connection rejected.
    Evidence: .sisyphus/evidence/task-7c-no-auth.txt

  Scenario: Authenticated socket connects
    Tool: Bash
    Steps:
      1. Login to get cookie.
      2. io(url, {extraHeaders: {Cookie: 'cbsd_session=...'}}) → connect.
      3. socket.data.user populated.
    Expected Result: Connection succeeds.
    Evidence: .sisyphus/evidence/task-7c-auth.txt
  ```

  **Commit**: YES
  - Message: `feat(state): add Socket.IO session-cookie authentication middleware`
  - Files: `server-new/src/state/socket-auth.ts`

---

- [ ] 8a. **Backend structured logger module (interface + JSONL impl)**

  **What to do**:
  - Create `server-new/src/logging/` directory structure.
  - `types.ts`: `LogLevel` enum, `LogEntry` interface (per draft schema), `Logger` interface (5 methods + child + withContext).
  - `console-jsonl.ts`: `ConsoleJsonlLogger` class implementing `Logger`. Each entry serialized as single-line JSON, written to stdout via `process.stdout.write`.
  - `null.ts`: `NullLogger` (no-op, for tests).
  - `factory.ts`: `createLogger(config)` returns `Logger` based on config. Default = `console-jsonl`.
  - `index.ts`: exports default `logger` instance + `createLogger` factory.
  - Tests: `types.test.ts`, `console-jsonl.test.ts`, `factory.test.ts`.
  - Verify output is valid JSONL (one JSON object per line).

  **Must NOT do**:
  - Do NOT use `console.log` directly (defeats the purpose).
  - Do NOT pretty-print JSON (single line only).
  - Do NOT use libraries other than the native `JSON.stringify`.
  - Do NOT log passwords, secrets, or session tokens (even at debug level).

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Reason**: Foundational module; needs solid interface design.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T08-T14)
  - **Blocks**: T08b (replace console calls), T08c (more logger impls)
  - **Blocked By**: T01

  **Acceptance Criteria**:
  - [ ] `src/logging/types.ts` exports `Logger` interface with all 5 methods + child + withContext.
  - [ ] `ConsoleJsonlLogger` produces valid JSONL output (one line per call).
  - [ ] `NullLogger` is no-op.
  - [ ] `createLogger({implementation: 'console-jsonl'})` returns `ConsoleJsonlLogger` instance.
  - [ ] Tests cover: each method, JSONL validity, child loggers inherit module, withContext persists.

  **QA Scenarios**:
  ```
  Scenario: JSONL output format
    Tool: Bash + node script
    Steps:
      1. const logger = createLogger({implementation: 'console-jsonl'});
      2. logger.info('test message', {module: 'auth', user_id: 1});
      3. Capture stdout.
      4. Parse each line as JSON; assert valid.
      5. Verify .level === 'info', .message === 'test message', .module === 'auth', .user_id === 1.
    Expected Result: One JSON line, all fields present.
    Evidence: .sisyphus/evidence/task-8a-jsonl-output.txt

  Scenario: Logger interface contract
    Tool: Bash + vitest
    Steps:
      1. npm test -- src/logging/types.test.ts
      2. Parameterized test runs all 5 logger impls (ConsoleJsonl, Null, plus stubs for File, Remote, Multi).
      3. Each must satisfy the interface contract.
    Expected Result: All impls pass contract tests.
    Evidence: .sisyphus/evidence/task-8a-contract-tests.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): add structured JSONL logger module with swappable interface`
  - Files: `server-new/src/logging/`

---

- [ ] 8b. **Replace console.* calls in backend with structured logger**

  **What to do**:
  - Audit all `console.log/warn/error/debug` in `server-new/src/` (target: 0 after this task).
  - Replace each with `logger.info/warn/error/debug` call, preserving context.
  - Map old console calls to new logger calls:
    - `console.log('[Auth] Generated token...')` → `logger.info({module: 'auth', user_id, token_length}, 'Generated token')`
    - `console.warn('[Auth] Token expired...')` → `logger.warn({module: 'auth', error: {name: 'TokenExpired'}}, 'Token expired')`
    - `console.error('[API] ...')` → `logger.error({module: 'api', method, path, status_code}, '...')`
  - `logAction()` SQLite function: keep for audit trail (DB record) BUT also call `logger.info({module: 'audit', action, user_id}, '...')`.
  - Tests: verify no `console.*` calls remain (grep + lint rule).

  **Must NOT do**:
  - Do NOT log JWT tokens or password hashes (sanitize before logging).
  - Do NOT log session cookies.
  - Do NOT change the SQLite `logs` table schema (keep `logAction()` for audit compatibility).

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  - **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T08c, all subsequent tasks that need logging
  - **Blocked By**: T08a

  **Acceptance Criteria**:
  - [ ] `grep -r "console\." server-new/src/ --include="*.ts" | grep -v "\.test\.ts" | wc -l` returns 0.
  - [ ] ESLint rule added: `no-console: 'error'` for `server-new/src/`.
  - [ ] Each replacement preserves or adds structured context (module, request_id, etc.).
  - [ ] `logAction()` still writes to SQLite `logs` table.
  - [ ] Tests verify logger is called with correct context.

  **QA Scenarios**:
  ```
  Scenario: No console.* calls in production code
    Tool: Bash
    Steps:
      1. grep -rn "console\." server-new/src/ --include="*.ts" | grep -v "\.test\.ts"
      2. Expect empty output.
    Expected Result: 0 console calls.
    Evidence: .sisyphus/evidence/task-8b-no-console.txt

  Scenario: Log entries preserve context
    Tool: Bash + curl
    Steps:
      1. Start server with console-jsonl logger.
      2. curl -X POST http://localhost:3001/api/login with bad creds.
      3. Verify log line emitted: level=error, module=auth, message contains "Invalid credentials", user_id present.
    Expected Result: Structured log with all context.
    Evidence: .sisyphus/evidence/task-8b-context-preserved.jsonl
  ```

  **Commit**: YES
  - Message: `refactor(backend): replace console.* calls with structured JSONL logger`
  - Files: all `server-new/src/**/*.ts`

---

- [ ] 8c. **Additional logger implementations (File, Remote, Multi, Null)**

  **What to do**:
  - `file-jsonl.ts`: `FileJsonlLogger` with rotating files (`/var/log/cloudbsd/admin.log`, `admin.log.1`, etc.). Rotation by size or time.
  - `remote.ts`: `RemoteLogger` that POSTs JSONL batches to remote endpoint (Loki/Datadog compatible).
  - `multi.ts`: `MultiLogger` that delegates to N other loggers.
  - Update `factory.ts` to support new impls.
  - Tests for each.
  - Update config schema in `config.ts` to allow logger array.

  **Must NOT do**:
  - Do NOT use sync filesystem writes (use streams).
  - Do NOT buffer logs indefinitely (drop oldest if buffer full).
  - Do NOT log to `/tmp` (use configured path).

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  - **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocked By**: T08a

  **Acceptance Criteria**:
  - [ ] Each impl satisfies `Logger` interface.
  - [ ] `FileJsonlLogger` rotates files (test with small max size).
  - [ ] `RemoteLogger` batches entries (configurable batch size).
  - [ ] `MultiLogger` delegates to all children.
  - [ ] Config: `logger: {implementation: 'multi', loggers: [{type: 'console-jsonl'}, {type: 'file-jsonl', path: '...'}]}` works.

  **QA Scenarios**:
  ```
  Scenario: File rotation
    Tool: Bash
    Steps:
      1. Configure FileJsonlLogger with maxSize: 1MB.
      2. Log 1000 large entries.
      3. Verify admin.log rotated to admin.log.1.
    Expected Result: Rotation occurred.
    Evidence: .sisyphus/evidence/task-8c-file-rotation.txt

  Scenario: Multi logger fans out
    Tool: Bash
    Steps:
      1. Create MultiLogger with ConsoleJsonl + Null.
      2. Log entry.
      3. Verify console output captured; null doesn't throw.
    Expected Result: All children called.
    Evidence: .sisyphus/evidence/task-8c-multi-fanout.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): add File, Remote, Multi, Null logger implementations`
  - Files: `server-new/src/logging/file-jsonl.ts`, `remote.ts`, `multi.ts`

---

- [ ] 8d. **`/api/logs.ingest` endpoint (frontend log sink)**

  **What to do**:
  - Accept newline-delimited JSON (JSONL) batches in request body.
  - Each line parsed as `LogEntry`, re-logged via backend logger with added context (`source: 'frontend'`).
  - Authenticated (session cookie required).
  - Rate-limited: 100 entries per minute per session.
  - Response MIME: `application/vnd.cloudbsd+logs.ingest`.

  **Must NOT do**:
  - Do NOT accept logs from unauthenticated sessions.
  - Do NOT log frontend entries without re-validating schema (reject malformed).
  - Do NOT trust client-provided `user_id`/`session_id` (use server-side from session).

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  - **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocked By**: T08a, T08b

  **Acceptance Criteria**:
  - [ ] `POST /api/logs.ingest` accepts JSONL body.
  - [ ] Each entry re-logged with backend logger.
  - [ ] Unauthenticated requests get 401.
  - [ ] Malformed entries are rejected (skipped, error logged).
  - [ ] Rate limit enforced.

  **QA Scenarios**:
  ```
  Scenario: Ingest accepts valid JSONL
    Tool: Bash + curl
    Steps:
      1. Login to get session.
      2. curl -X POST http://localhost:3001/api/logs.ingest -H "Cookie: cbsd_session=..." -H "Content-Type: application/vnd.cloudbsd+logs.ingest" -d '{"timestamp":"2026-07-05T22:00:00Z","level":"info","service":"cloudbsd-frontend","version":"2.0.0","message":"test"}\n{...}'
      3. Verify backend log output contains both entries with source: 'frontend'.
    Expected Result: Logs re-emitted with backend context.
    Evidence: .sisyphus/evidence/task-8d-ingest.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add /api/logs.ingest endpoint for frontend logs`
  - Files: `server-new/src/api/logs.ts`

---

- [ ] 8. **Scaffold new PAM-auth backend at `server-new/`**

  **What to do**:
  - Initialize `server-new/` with `package.json` (type: module), Node 24+ engine.
  - Dependencies: `express@5`, `cookie-parser`, `cors`, `socket.io`, `socket.io-client`, `jsonwebtoken` (for legacy compat), `node-pam2` (or `@napi-rs/pam` for native binding), `better-sqlite3`, `swagger-jsdoc`, `swagger-ui-express`.
  - Dev deps: `typescript@5.9`, `tsx`, `vitest`, `@types/*`.
  - `tsconfig.json` matching existing `server/tsconfig.json` style.
  - Copy `config.ts` and `ssl.ts` from `server/src/` as starting points.
  - Add `src/index.ts` skeleton with Express app, CORS, cookie-parser, swagger setup, health endpoint.
  - Add `src/db.ts` skeleton (defer schema until T09/T10).

  **Must NOT do**:
  - Do NOT modify `server/` directory at all.
  - Do NOT include any secrets in `config.ts`.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T09-T14)
  - **Blocks**: T09-T14
  - **Blocked By**: T01, T04 (spec), T07 (push of spec)

  **Acceptance Criteria**:
  - [ ] `server-new/package.json` exists with all deps.
  - [ ] `server-new/src/index.ts` compiles with `tsc --noEmit`.
  - [ ] `cd server-new && npm install && npm run build` exits 0.
  - [ ] `cd server-new && npm start` starts on port 3001 (or config-driven).
  - [ ] `curl -sI http://localhost:3001/api/health` returns 200.

  **QA Scenarios**:
  ```
  Scenario: Backend boots and serves health
    Tool: Bash + curl
    Steps:
      1. cd server-new && npm install
      2. npm run build
      3. npm start &  (background)
      4. sleep 2
      5. curl -sI http://localhost:3001/api/health
      6. kill %1
    Expected Result: 200 OK, Content-Type: application/vnd.cloudbsd+health.
    Failure Indicators: Connection refused, 404, plain application/json.
    Evidence: .sisyphus/evidence/task-8-health-check.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): scaffold new PAM-auth backend at server-new/`
  - Files: `server-new/`

---

- [ ] 9. **PAM authentication middleware**

  **What to do**:
  - Implement `src/auth/pam.ts` using `node-pam2` (or alternative).
  - `authenticateSession(req, res, next)` middleware: reads session cookie, validates against `sessions` table, sets `req.user`.
  - `requireRole(role)` middleware factory.
  - Login endpoint uses PAM, on success creates session row in SQLite with `expires_at = now + 8h`, sets HttpOnly cookie `cbsd_session`.
  - Logout endpoint clears session row + cookie.
  - Tests: integration test with mock PAM module.

  **Must NOT do**:
  - Do NOT fall back to plaintext password auth if PAM fails.
  - Do NOT store passwords in DB.
  - Do NOT use `localStorage` for sessions (HttpOnly cookie only).

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Reason**: Auth is security-critical; needs careful implementation + testing.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T22-T25, T36-T37, T45-T46
  - **Blocked By**: T08

  **Acceptance Criteria**:
  - [ ] `src/auth/pam.ts` exists with `authenticate()` and `authenticateSession()` exported.
  - [ ] Login endpoint sets HttpOnly `cbsd_session` cookie.
  - [ ] Logout endpoint clears cookie + DB session.
  - [ ] `curl -X POST -H "Content-Type: application/vnd.cloudbsd+login" -d '{"username":"admin","password":"admin"}' http://localhost:3001/api/login -c cookies.txt` returns 200 with `Set-Cookie: cbsd_session=...; HttpOnly`.
  - [ ] Subsequent `curl -H "Cookie: cbsd_session=..." http://localhost:3001/api/users` returns user list.
  - [ ] Invalid PAM creds return 401.
  - [ ] Expired session returns 401 with `X-CloudBSD-Why: session_expired` header.

  **QA Scenarios**:
  ```
  Scenario: PAM login succeeds
    Tool: Bash + curl
    Steps:
      1. Login: curl -X POST http://localhost:3001/api/login -H "Content-Type: application/vnd.cloudbsd+login" -d '{"username":"admin","password":"admin"}' -c /tmp/c.txt -i
      2. Verify Set-Cookie header includes HttpOnly
      3. Use cookie: curl -H "Cookie: cbsd_session=..." http://localhost:3001/api/users -i
      4. Verify 200 OK and Content-Type: application/vnd.cloudbsd+users
    Expected Result: Login sets HttpOnly cookie, subsequent request authenticated.
    Failure Indicators: No HttpOnly flag; 401 on second request; plain application/json response.
    Evidence: .sisyphus/evidence/task-9-pam-login.txt

  Scenario: Expired session triggers frost-out response
    Tool: Bash
    Steps:
      1. Login to get session.
      2. Manually set session expiry to past in DB: sqlite3 server-new/data/auth.db "UPDATE sessions SET expires_at = '2020-01-01' WHERE id = ..."
      3. curl -H "Cookie: cbsd_session=..." http://localhost:3001/api/users -i
      4. Verify 401 + X-CloudBSD-Why: session_expired header present
    Expected Result: 401 with reason header.
    Evidence: .sisyphus/evidence/task-9-expired-session.txt
  ```

  **Commit**: YES
  - Message: `feat(auth): add PAM authentication middleware + session cookies`
  - Files: `server-new/src/auth/`

---

- [ ] 10. **Plugin/service registry (`src/plugins/`)**

  **What to do**:
  - Define `Plugin` interface: `{id, name, version, services: Service[], templates: TemplateRef[]}`.
  - `src/plugins/registry.ts`: in-memory + SQLite-backed registry. `register(plugin)`, `unregister(id)`, `list()`, `get(id)`.
  - Service discovery hooks: `discoverServices()` runs periodically, calls registered plugins' `discover()` method.
  - `src/plugins/discoverers/`: skeleton files for bhyve, podman, jail, host-stats, notifications (implementations in Wave 6).
  - Tests: registry CRUD, concurrent register/unregister.

  **Must NOT do**:
  - Do NOT auto-start any FreeBSD service (`bhyve`, `jail`, etc.) from the registry.
  - Do NOT persist plugin code; only metadata.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T12, T40-T44
  - **Blocked By**: T08, T05

  **Acceptance Criteria**:
  - [ ] `src/plugins/registry.ts` exports `PluginRegistry` class.
  - [ ] `register({...})` adds a plugin; `list()` returns all.
  - [ ] `discoverServices()` calls registered discoverers.
  - [ ] SQLite `plugins` table persists across restarts.
  - [ ] Vitest tests cover register/unregister/list/discover.

  **QA Scenarios**:
  ```
  Scenario: Plugin registry round-trip
    Tool: Bash + node script
    Steps:
      1. cd server-new && npm test -- src/plugins/registry.test.ts
      2. Verify all tests pass.
    Expected Result: All tests pass.
    Evidence: .sisyphus/evidence/task-10-registry-tests.txt
  ```

  **Commit**: YES
  - Message: `feat(plugins): add plugin/service registry`
  - Files: `server-new/src/plugins/`

---

- [ ] 11. **Custom MIME-type + CloudBSD header middleware**

  **What to do**:
  - `src/middleware/cloudbsd.ts`: middleware that:
    - Inspects `Content-Type` request header; if `application/vnd.cloudbsd+<action>`, parse action name into `req.cbsdAction`.
    - Inspects required `X-CloudBSD-Who`, `X-CloudBSD-What`, `X-CloudBSD-Why`, `X-CloudBSD-Where`; missing → 400 with reason.
    - On response, sets `Content-Type: application/vnd.cloudbsd+<responding-action>` based on route handler.
  - Action registry mapping: route → response MIME type (e.g., `GET /api/users` → `application/vnd.cloudbsd+users.list`).
  - `src/middleware/cloudbsd.test.ts`: tests for missing headers, wrong content-type, correct response.

  **Must NOT do**:
  - Do NOT allow generic `application/json` in production responses (warn at startup if any route emits it).
  - Do NOT skip header validation.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T19 (frontend mirror)
  - **Blocked By**: T08, T06

  **Acceptance Criteria**:
  - [ ] `src/middleware/cloudbsd.ts` exists.
  - [ ] Request without `X-CloudBSD-Who` returns 400.
  - [ ] Response with custom MIME: `curl -i ... | grep -i content-type` shows `application/vnd.cloudbsd+<action>`.
  - [ ] Action registry maps all 45+ endpoints.

  **QA Scenarios**:
  ```
  Scenario: Missing required header returns 400
    Tool: Bash + curl
    Steps:
      1. curl -X POST http://localhost:3001/api/login -H "Content-Type: application/vnd.cloudbsd+login" -d '{"username":"admin","password":"admin"}' -i
      2. Verify 400 and body explains which header is missing.
    Expected Result: 400 with reason.
    Evidence: .sisyphus/evidence/task-11-missing-header.txt

  Scenario: Response uses custom MIME
    Tool: Bash
    Steps:
      1. Login to get cookie.
      2. curl -H "Cookie: cbsd_session=..." -H "X-CloudBSD-Who: admin" -H "X-CloudBSD-What: list_users" -H "X-CloudBSD-Why: dashboard_refresh" -H "X-CloudBSD-Where: /users" http://localhost:3001/api/users -i
      3. grep -i "content-type"  → expect: application/vnd.cloudbsd+users.list
    Expected Result: Custom MIME in response.
    Evidence: .sisyphus/evidence/task-11-custom-mime.txt
  ```

  **Commit**: YES
  - Message: `feat(mime): add custom vnd.cloudbsd+ MIME-type middleware`
  - Files: `server-new/src/middleware/cloudbsd.ts`, `server-new/src/middleware/action-registry.ts`

---

- [ ] 12. **Manifest endpoint (`GET /api/manifest`)**

  **What to do**:
  - `src/api/manifest.ts` handler:
    - Aggregates plugins from registry.
    - Aggregates templates from plugin manifests.
    - Returns `{plugins: [...], templates: [...], services: [...], permissions: [...]}`.
  - Response MIME: `application/vnd.cloudbsd+manifest`.
  - Cache headers: `Cache-Control: max-age=60` (frontend polls for updates).
  - Tests: aggregation logic, empty registry case.

  **Must NOT do**:
  - Do NOT include sensitive plugin config in response (no secrets, no internal IPs).
  - Do NOT exceed 1MB response size.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T22 (vertical slice reads manifest)
  - **Blocked By**: T10, T11

  **Acceptance Criteria**:
  - [ ] `GET /api/manifest` returns valid manifest JSON.
  - [ ] Response MIME: `application/vnd.cloudbsd+manifest`.
  - [ ] Empty registry returns `{plugins: [], templates: [], services: []}`.
  - [ ] With 1 test plugin registered, manifest includes its metadata.

  **QA Scenarios**:
  ```
  Scenario: Manifest endpoint shape
    Tool: Bash + jq
    Steps:
      1. curl -H "Cookie: cbsd_session=..." http://localhost:3001/api/manifest | jq .
      2. Verify .plugins, .templates, .services arrays exist.
      3. Verify Content-Type: application/vnd.cloudbsd+manifest
    Expected Result: Valid manifest JSON.
    Evidence: .sisyphus/evidence/task-12-manifest.json
  ```

  **Commit**: YES
  - Message: `feat(api): add /api/manifest endpoint`
  - Files: `server-new/src/api/manifest.ts`

---

- [ ] 13. **Session validation endpoint (`POST /api/session.validate`)**

  **What to do**:
  - `src/api/session.ts` handler:
    - Reads session cookie.
    - If valid: returns `{valid: true, user: {...}, expiresAt: ...}`.
    - If invalid: returns 401 with body `{valid: false, reason: 'session_expired'|'session_revoked'|'session_not_found'}`.
  - Response MIME: `application/vnd.cloudbsd+session.validate`.
  - This is the endpoint the frontend polls to detect frost-out conditions.

  **Must NOT do**:
  - Do NOT include password or token in response body.
  - Do NOT log full session IDs.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T22-T25, T46
  - **Blocked By**: T09

  **Acceptance Criteria**:
  - [ ] `POST /api/session.validate` with valid cookie returns 200 + user info.
  - [ ] Same with invalid cookie returns 401 + reason.
  - [ ] Response uses `application/vnd.cloudbsd+session.validate` MIME.

  **QA Scenarios**:
  ```
  Scenario: Session validation happy path
    Tool: Bash + curl
    Steps:
      1. Login to get session cookie.
      2. curl -X POST -H "Cookie: cbsd_session=..." http://localhost:3001/api/session.validate
      3. jq .valid  → expect: true
    Expected Result: true returned.
    Evidence: .sisyphus/evidence/task-13-session-valid.txt

  Scenario: Invalid session reason
    Tool: Bash
    Steps:
      1. curl -X POST http://localhost:3001/api/session.validate -i
      2. Verify 401 + body has reason field.
    Expected Result: 401 with reason.
    Evidence: .sisyphus/evidence/task-13-session-invalid.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add /api/session.validate endpoint`
  - Files: `server-new/src/api/session.ts`

---

### Wave 2: Frontend Foundation

- [ ] 15a. **Frontend structured logger module (interface + impls)**

  **What to do**:
  - Create `web-new/src/app/logging/` directory structure.
  - `types.ts`: mirror of backend `LogEntry` + `Logger` interface (shared schema).
  - `console-jsonl.ts`: writes JSONL to browser `console` (dev mode, formatted).
  - `remote.ts`: buffers entries, POSTs to backend `/api/logs.ingest` (production).
  - `null.ts`: no-op (for tests).
  - `multi.ts`: composite.
  - `factory.ts`: config-driven (default = console in dev, remote in prod).
  - `context.ts`: route/component-scoped context (auto-detect from Angular Router).
  - `index.ts`: default exported logger.
  - Tests for each impl + factory.

  **Must NOT do**:
  - Do NOT log PII (passwords, tokens, user data).
  - Do NOT log full stack traces in production (truncate to 1KB).
  - Do NOT block UI on log sends (always async + buffered).

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`

  - **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T15-T21)
  - **Blocks**: T15b, T15c
  - **Blocked By**: T15

  **Acceptance Criteria**:
  - [ ] `src/app/logging/types.ts` matches backend schema.
  - [ ] `ConsoleJsonlLogger` writes valid JSONL to browser console.
  - [ ] `RemoteLogger` batches entries and POSTs to `/api/logs.ingest`.
  - [ ] `createLogger({implementation: 'remote'})` returns `RemoteLogger`.
  - [ ] `logger.child('MyComponent')` returns child logger that auto-attaches module.
  - [ ] Tests cover all impls + contract.

  **QA Scenarios**:
  ```
  Scenario: Frontend console JSONL
    Tool: Playwright
    Steps:
      1. Open app in dev mode.
      2. Call logger.info('test', {module: 'test'}).
      3. Capture browser console output.
      4. Assert line is valid JSON with .level, .message, .module.
    Expected Result: Valid JSONL in console.
    Evidence: .sisyphus/evidence/task-15a-console-jsonl.txt

  Scenario: Remote logger batches
    Tool: Playwright
    Steps:
      1. Configure logger as remote.
      2. Call logger.info() 10 times.
      3. Verify single POST to /api/logs.ingest with 10-line JSONL body.
    Expected Result: Batched POST.
    Evidence: .sisyphus/evidence/task-15a-remote-batch.txt
  ```

  **Commit**: YES
  - Message: `feat(web): add structured JSONL logger module with remote sink`
  - Files: `web-new/src/app/logging/`

---

- [ ] 15c. **Pre-flight check service (L1/L2/L3)**

  **What to do**:
  - `web-new/src/app/preflight/preflight.service.ts`:
    - `run()`: 3-level progressive check.
    - **L1**: `GET /api/health` with 5s timeout. Returns `{status: 'ok', version, uptime, services: {db: bool, pam: bool, plugins: bool}}`.
    - **L2**: Parse response, check services map. Degraded = some services down.
    - **L3**: `POST /api/session.validate` if cookie present. Routes to /login or /dashboard.
  - State machine: `pending → checking-L1 → checking-L2 → checking-L3 → ready | unreachable | degraded`.
  - Auto-retry on unreachable: 30s, 60s, 120s, 240s, 300s (capped).
  - Manual retry via UI button.
  - Expose signal `state = signal<PreFlightState>({status: 'pending'})`.
  - All state transitions logged via JSONL logger.

  **Must NOT do**:
  - Do NOT block UI for more than 5s on L1.
  - Do NOT retry faster than every 30s.
  - Do NOT log cookies in pre-flight logs.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  - **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocked By**: T15, T14 (health endpoint)

  **Acceptance Criteria**:
  - [ ] `run()` completes L1 within 5s when backend healthy.
  - [ ] On L1 fail: state = `unreachable`, retry scheduled.
  - [ ] On L2 partial: state = `degraded`.
  - [ ] L3 routes correctly based on session validity.
  - [ ] Manual retry button works.

  **QA Scenarios**:
  ```
  Scenario: Healthy backend passes all levels
    Tool: Playwright
    Steps:
      1. Start backend.
      2. App boots, runs pre-flight.
      3. Assert state transitions to 'ready'.
      4. Verify route is /dashboard (if logged in) or /login.
    Expected Result: App loads normally.
    Evidence: .sisyphus/evidence/task-15c-healthy.txt

  Scenario: Unreachable backend shows degraded UI
    Tool: Playwright
      Steps:
        1. Stop backend.
        2. App boots, runs pre-flight.
        3. After 5s timeout, state = 'unreachable'.
        4. Assert degraded UI banner visible.
    Expected Result: Degraded UI shown.
    Evidence: .sisyphus/evidence/task-15c-unreachable.png
  ```

  **Commit**: YES
  - Message: `feat(preflight): add 3-level pre-flight check service`
  - Files: `web-new/src/app/preflight/`

---

- [ ] 15d. **Backend unavailable UI (banner + degraded shell)**

  **What to do**:
  - `web-new/src/app/ui/backend-unavailable/`:
    - `banner.component.ts`: top banner with red strip, "Backend Unavailable" message, "Retry Now" button, "Last attempt: ..." timestamp.
    - `shell.component.ts`: degraded app shell — sidebar visible but disabled, pages show skeleton placeholders.
    - `retry.service.ts`: manual retry handler.
  - Auto-retry: schedule next attempt via `setTimeout` with backoff.
  - On successful retry: hide banner, refresh app state.
  - Accessibility: banner has `role="status"`, `aria-live="polite"` (not assertive since it's persistent).
  - Tests: banner appears on unreachable, hides on recovery, retry button works.

  **Must NOT do**:
  - Do NOT prevent user from navigating (sidebar still visible, links work).
  - Do NOT show modals (banner is correct pattern for persistent degradation).

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  - **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocked By**: T15c

  **Acceptance Criteria**:
  - [ ] Banner visible when pre-flight state = `unreachable`.
  - [ ] Banner hidden when state = `ready`.
  - [ ] Manual retry button triggers pre-flight re-run.
  - [ ] Sidebar shows but is disabled with tooltips "Backend offline".
  - [ ] Auto-retry happens on backoff schedule.

  **QA Scenarios**:
  ```
  Scenario: Banner shows on unreachable
    Tool: Playwright
    Steps:
      1. Backend down.
      2. App boots.
      3. Assert banner with "Backend Unavailable" visible.
      4. Click "Retry Now".
      5. Backend comes up.
      6. Assert banner disappears.
    Expected Result: Banner shows/hides correctly.
    Evidence: .sisyphus/evidence/task-15d-banner.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add backend unavailable banner + degraded shell`
  - Files: `web-new/src/app/ui/backend-unavailable/`

---

- [ ] 15e. **Error presentation components (12 error states)**

  **What to do**:
  - `web-new/src/app/ui/errors/`:
    - One component per error state (matching T3a mock-ups):
      - `BackendUnavailableError`, `BackendDegradedError`, `SessionExpiredError`, `SessionRevokedError`, `PermissionDeniedError`, `NetworkTimeoutError`, `ServerError`, `ValidationError`, `EmptyState`, `ConnectionLostError`, `PluginError`, `CsrfFailureError`.
    - Each component renders the appropriate presentation (modal for CRITICAL/ERROR, banner for WARN, toast for INFO).
    - Uses shared `ErrorModalComponent` (T15f) for modal presentations.
    - Tests: each component renders correctly per mock-up.

  **Must NOT do**:
  - Do NOT show modals for INFO/WARN severity.
  - Do NOT show banners for CRITICAL/ERROR (use modal).

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  - **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocked By**: T15f (modal), T15g (admin settings)

  **Acceptance Criteria**:
  - [ ] All 12 error components exist.
  - [ ] Each renders per its mock-up (verified by Playwright snapshot).
  - [ ] Severity determines presentation (modal/banner/toast).
  - [ ] Tests cover each component.

  **QA Scenarios**:
  ```
  Scenario: Each error renders correctly
    Tool: Playwright
    Steps:
      1. For each of 12 error components, render in isolation.
      2. Playwright snapshot.
      3. Compare against mock-up SVG.
    Expected Result: All match.
    Evidence: .sisyphus/evidence/task-15e-error-snapshots/*.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add 12 error presentation components`
  - Files: `web-new/src/app/ui/errors/`

---

- [ ] 15f. **Reusable Error Modal component (with detail levels)**

  **What to do**:
  - `web-new/src/app/ui/error-modal/error-modal.component.ts`:
    - Props: `error: ErrorPayload` (severity, code, message, errorId, requestId, stack, etc.)
    - Reads user's `errorDetailLevel` from `AuthStore`.
    - Renders:
      - Header: icon (severity-based color), title, severity badge.
      - Message: human-readable description.
      - Detail section: conditional based on detail level.
        - MINIMAL: nothing extra.
        - STANDARD: error ID + timestamp.
        - DETAILED: + request ID + endpoint + status code + truncated stack.
        - DEBUG: + full stack + headers + state snapshot.
      - Actions: primary (OK/Retry/Login), secondary (Copy Error ID), tertiary (Dismiss if allowed).
    - Backdrop click: dismisses if `canDismiss=true`, else does nothing.
    - Focus trap, Esc key handling.
    - Logs every presentation via JSONL logger.
  - Service: `ErrorModalService.show(error)` queues and displays modal.

  **Must NOT do**:
  - Do NOT show stack traces for MINIMAL level.
  - Do NOT allow dismissal of CRITICAL errors.
  - Do NOT log full error payloads at INFO level.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  - **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T15e
  - **Blocked By**: T15, T18 (AuthStore)

  **Acceptance Criteria**:
  - [ ] Modal renders at all 4 detail levels correctly.
  - [ ] Admin sees DETAILED by default; regular user sees MINIMAL.
  - [ ] CRITICAL errors block dismissal.
  - [ ] Copy Error ID button works.
  - [ ] Focus trap functional.

  **QA Scenarios**:
  ```
  Scenario: Detail level affects visible content
    Tool: Playwright
    Steps:
      1. Login as admin (detail level = DETAILED).
      2. Trigger server error.
      3. Assert modal shows stack trace.
      4. Logout, login as viewer (detail level = MINIMAL).
      5. Trigger same error.
      6. Assert modal shows only error message.
    Expected Result: Detail level respected.
    Evidence: .sisyphus/evidence/task-15f-detail-level.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add reusable Error Modal with role-based detail levels`
  - Files: `web-new/src/app/ui/error-modal/`

---

- [ ] 15g. **Admin Settings → Error Display section**

  **What to do**:
  - `web-new/src/app/pages/settings/error-display.component.ts`:
    - Settings section in Settings page.
    - Section title: "Error Display".
    - Description: "How much detail to show when errors occur".
    - Radio button group with available options per role:
      - Admin: Minimal / Standard / Detailed / Debug.
      - Operator: Minimal / Standard / Detailed.
      - Viewer: Minimal / Standard.
    - Save button (or instant apply).
    - On change: `PUT /api/users/profile` with `{error_detail_level: <value>}`.
    - On success: update `AuthStore.user.errorDetailLevel`.
    - Mock-up: matches `diagrams/screens/settings-error-display.svg`.

  **Must NOT do**:
  - Do NOT show options the current user can't select.
  - Do NOT save without showing success/error feedback.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  - **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocked By**: T22 (Settings page), T18 (AuthStore)

  **Acceptance Criteria**:
  - [ ] Section renders per mock-up.
  - [ ] Options filtered by user role.
  - [ ] Save updates profile and AuthStore.
  - [ ] Error modal respects new detail level immediately.

  **QA Scenarios**:
  ```
  Scenario: Admin sees all options, viewer sees 2
    Tool: Playwright
    Steps:
      1. Login as admin, navigate to /settings.
      2. Assert 4 radio options visible in Error Display section.
      3. Logout, login as viewer.
      4. Assert only 2 options (Minimal, Standard).
    Expected Result: Role-filtered options.
    Evidence: .sisyphus/evidence/task-15g-role-filtered.png

  Scenario: Changing level updates modal behavior
    Tool: Playwright
    Steps:
      1. Login as admin.
      2. Change Error Display from DETAILED to MINIMAL.
      3. Trigger server error.
      4. Assert modal shows MINIMAL detail (no stack trace).
    Expected Result: Live update works.
    Evidence: .sisyphus/evidence/task-15g-live-update.png
  ```

  **Commit**: YES
  - Message: `feat(settings): add Error Display section with role-based options`
  - Files: `web-new/src/app/pages/settings/error-display.component.ts`

---

- [ ] 15b. **Replace console.* in frontend with structured logger**

  **What to do**:
  - Audit all `console.log/warn/error/debug` in `web-new/src/`.
  - Replace each with `logger.info/warn/error/debug` call.
  - Critical replacements:
    - `console.error('[Auth] Invalid token detected...')` in `client.ts` → `logger.error({module: 'auth', reason, token_length}, 'Invalid token detected')`
    - `console.warn('[CSRF] Failed to prime...')` → `logger.warn({module: 'csrf', error: {...}}, 'Failed to prime CSRF token')`
    - `console.log('[API Request] Token found...')` → `logger.debug({module: 'api', token_length}, 'Token found in localStorage')`
  - ESLint rule: `no-console: 'error'` for `web-new/src/`.
  - Add automatic capture of Angular `ErrorHandler` → logger.error.

  **Must NOT do**:
  - Do NOT log JWT tokens or password values.
  - Do NOT log full request bodies (only safe metadata).

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  - **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocked By**: T15a

  **Acceptance Criteria**:
  - [ ] `grep -r "console\." web-new/src/ --include="*.ts" | grep -v "\.spec\.ts" | wc -l` returns 0.
  - [ ] ESLint rule enforced.
  - [ ] Each replacement preserves structured context.
  - [ ] Angular `ErrorHandler` captures and logs all unhandled errors.
  - [ ] Tests verify logger called with correct context.

  **QA Scenarios**:
  ```
  Scenario: No console.* in production
    Tool: Bash
    Steps:
      1. grep -rn "console\." web-new/src/ --include="*.ts" | grep -v "\.spec\.ts"
      2. Expect empty output.
    Expected Result: 0 console calls.
    Evidence: .sisyphus/evidence/task-15b-no-console.txt

  Scenario: ErrorHandler captures errors
    Tool: Playwright
    Steps:
      1. Trigger an unhandled error in app (e.g., throw in component).
      2. Assert logger.error called with error details.
    Expected Result: Errors logged as JSONL.
    Evidence: .sisyphus/evidence/task-15b-error-handler.txt
  ```

  **Commit**: YES
  - Message: `refactor(web): replace console.* with structured JSONL logger`
  - Files: all `web-new/src/**/*.ts`

---

- [ ] 15. **Scaffold Angular 20 workspace at `web-new/`**

  **What to do**:
  - `npx --yes @angular/cli@20 new web-new --standalone --routing --style=css --skip-tests=false --ssr=false`.
  - Strict mode enabled, Karma+Jasmine as test framework (CLI default).
  - `angular.json` configured with budgets: initial bundle ≤ 250KB warning, ≤ 500KB error.
  - `tsconfig.json` path aliases mirror current React (`@/components`, `@/pages`, `@/api`, etc.).
  - Add `web-new/README.md` describing the new structure.

  **Must NOT do**:
  - Do NOT enable SSR (`--ssr=false` is mandatory).
  - Do NOT use any UI library other than Tailwind + CDK.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T16-T21)
  - **Blocks**: T16-T21, T26-T39
  - **Blocked By**: T01, T07 (push)

  **Acceptance Criteria**:
  - [ ] `web-new/` exists with `package.json`, `angular.json`, `tsconfig.json`.
  - [ ] `cd web-new && npm install` exits 0.
  - [ ] `cd web-new && ng build` exits 0.
  - [ ] `cd web-new && ng serve` starts on port 4200.
  - [ ] SSR is `false` in `angular.json`.
  - [ ] No Material/PrimeNG dependencies in `package.json`.

  **QA Scenarios**:
  ```
  Scenario: Angular workspace boots
    Tool: Bash
    Steps:
      1. cd web-new && npm install
      2. npm run build  → expect: exit 0
      3. ng serve &  (background)
      4. sleep 5
      5. curl -sI http://localhost:4200/
      6. kill %1
    Expected Result: 200 OK, Content-Type: text/html.
    Evidence: .sisyphus/evidence/task-15-angular-boot.txt
  ```

  **Commit**: YES
  - Message: `feat(web): scaffold Angular 20 workspace at web-new/`
  - Files: `web-new/`

---

- [ ] 16. **Tailwind + Angular CDK setup**

  **What to do**:
  - Install `tailwindcss@3`, `postcss`, `autoprefixer` in `web-new/`.
  - Copy `tailwind.config.js` from current project (preserve brand colors, fonts, glass shadows).
  - Extend with logical properties: `ps-*`/`pe-*`/`start-*`/`end-*` aliases for RTL (`ar`/`he`).
  - Configure `postcss.config.js`.
  - Install `@angular/cdk@20`.
  - Add CDK overlay styles to `angular.json` styles array.
  - Verify Tailwind classes work in components.

  **Must NOT do**:
  - Do NOT install Angular Material (per user decision).

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T22-T39
  - **Blocked By**: T15

  **Acceptance Criteria**:
  - [ ] `web-new/tailwind.config.js` exists with brand colors, fonts, RTL extensions.
  - [ ] `web-new/postcss.config.js` exists.
  - [ ] `@angular/cdk` is in `package.json`.
  - [ ] A test component with Tailwind classes renders correctly (Playwright snapshot).

  **QA Scenarios**:
  ```
  Scenario: Tailwind + CDK working
    Tool: Playwright + Bash
    Steps:
      1. ng serve &
      2. Playwright opens localhost:4200, asserts body has Tailwind-reset styles.
      3. Playwright asserts `getComputedStyle(document.body).fontFamily` includes "Inter".
    Expected Result: Tailwind applied, Inter font active.
    Evidence: .sisyphus/evidence/task-16-tailwind-cdk.png
  ```

  **Commit**: YES
  - Message: `chore(web): configure Tailwind CSS + Angular CDK with RTL extensions`
  - Files: `web-new/tailwind.config.js`, `web-new/postcss.config.js`, `web-new/src/styles.css`

---

- [ ] 16a. **Theme system implementation (15 themes + CSS variables + service)**

  **What to do**:
  - `web-new/src/app/themes/`:
    - `tokens/<theme-slug>.ts` × 15 — each exports a `ThemeTokens` object.
    - `theme.types.ts` — `ThemeTokens` interface.
    - `theme.service.ts`:
      - `currentTheme = signal<ThemeTokens>(cloudsbsdRevytech)` (default).
      - `applyTheme(themeId: string)` — sets CSS variables on `document.documentElement`.
      - `setTheme(themeId)` — updates signal + applies.
      - On init: reads from `AuthStore.user.themeId` or localStorage.
    - `theme-preview.component.ts` — small preview tile for settings page.
  - CSS variables in `:root[data-theme="<theme-id>"]` selector (one per theme).
  - Tailwind config reads from CSS variables for theme-aware utilities.
  - Fonts loaded per theme (Google Fonts subset for non-default fonts).
  - Tests: each theme token validates, theme.service applies correctly.

  **Must NOT do**:
  - Do NOT include any trademarked name in theme IDs (use slug like `miami-vice`, not `cyberpunk-2077`).
  - Do NOT use copyrighted fonts (use Google Fonts / OFL fonts only).
  - Do NOT break WCAG 2.1 AA contrast.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T15-T21)
  - **Blocked By**: T15, T3k (catalog), T3l (mock-ups)

  **Acceptance Criteria**:
  - [ ] 15 theme token files exist.
  - [ ] ThemeService can apply any of 15 themes via CSS variables.
  - [ ] Switching theme doesn't require page reload.
  - [ ] Each theme passes WCAG AA contrast check.
  - [ ] Default theme = CloudBSD/REVYTECH.

  **QA Scenarios**:
  ```
  Scenario: Each theme applies correctly
    Tool: Playwright
    Steps:
      1. For each of 15 themes, set via ThemeService, screenshot dashboard.
      2. Verify CSS variables applied (e.g., --color-primary changes).
      3. Compare against mock-up SVG (pixel match within 5%).
    Expected Result: All 15 themes render correctly.
    Evidence: .sisyphus/evidence/task-16a-theme-snapshots/*.png
  ```

  **Commit**: YES
  - Message: `feat(themes): add 15-theme system with CSS variables and ThemeService`
  - Files: `web-new/src/app/themes/`

---

- [ ] 16b. **Theme customizer service (token editor)**

  **What to do**:
  - `web-new/src/app/themes/customizer/`:
    - `customizer.service.ts`:
      - `currentEdit = signal<PartialThemeTokens>({})` — edit buffer.
      - `applyEdit(token, value)` — updates buffer + live preview.
      - `reset()` — clear buffer.
      - `loadTheme(themeId)` — load for editing.
      - `saveAs(name)` — POST new theme.
      - `update(themeId)` — PUT update.
    - `customizer.types.ts` — `PartialThemeTokens`, `ThemeBranding` types.
  - All edits trigger `ThemeService.preview()` for live update.
  - Tests: edit token, save, load, update flows.

  **Must NOT do**:
  - Do NOT allow saving without at least 1 token changed.
  - Do NOT save without theme name.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocked By**: T16a, T13a

  **Acceptance Criteria**:
  - [ ] Edit token triggers live preview.
  - [ ] Save creates new theme via POST.
  - [ ] Update modifies existing theme via PUT.
  - [ ] Reset reverts buffer.

  **QA Scenarios**:
  ```
  Scenario: Edit token + save
    Tool: Playwright
    Steps:
      1. Open theme editor.
      2. Change primary color to red.
      3. Assert dashboard live preview shows red primary.
      4. Enter name "Test Theme".
      5. Click Save.
      6. Assert new theme appears in gallery.
    Expected Result: Edit + save works.
    Evidence: .sisyphus/evidence/task-16b-edit-save.txt
  ```

  **Commit**: YES
  - Message: `feat(themes): add theme customizer service for token editing`
  - Files: `web-new/src/app/themes/customizer/`

---

- [ ] 16c. **Theme import/export service**

  **What to do**:
  - `web-new/src/app/themes/import-export/`:
    - `export.ts`: builds `.cbsd-theme.json` from current theme + signs.
    - `import.ts`: parses JSON, validates against schema, verifies signature.
    - `sign.ts`: sha256 of canonical JSON.
  - Uses `Ajv` or `zod` for JSON Schema validation.
  - File upload via `<input type="file">` with `.cbsd-theme.json` accept.
  - Drag-and-drop file zone.
  - Tests: round-trip export → import → identical result.

  **Must NOT do**:
  - Do NOT eval() any field of imported JSON.
  - Do NOT trust file extension (validate content).
  - Do NOT import themes larger than 1MB.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocked By**: T16a, T13b, T3n

  **Acceptance Criteria**:
  - [ ] Export produces valid `.cbsd-theme.json`.
  - [ ] Import validates against schema.
  - [ ] Invalid files rejected with clear error.
  - [ ] Round-trip produces identical theme.
  - [ ] Signature verified.

  **QA Scenarios**:
  ```
  Scenario: Export + import round-trip
    Tool: Playwright
    Steps:
      1. Select custom theme.
      2. Click Export.
      3. File downloads.
      4. Click Import, upload file.
      5. Assert preview matches original.
      6. Click Save.
      7. Assert new theme exists.
    Expected Result: Round-trip works.
    Evidence: .sisyphus/evidence/task-16c-roundtrip.png
  ```

  **Commit**: YES
  - Message: `feat(themes): add theme import/export service`
  - Files: `web-new/src/app/themes/import-export/`

---

- [ ] 15m. **Help modal component + search**

  **What to do**:
  - `web-new/src/app/help/`:
    - `help-modal.component.ts`: Modal with 3 tabs (Search, Topics, Shortcuts).
    - `help.service.ts`: Loads articles, full-text search, caches results.
    - `shortcuts.service.ts`: Centralized keyboard shortcut registry.
  - Opens via `?` keyboard shortcut or "?" icon in header.
  - Search: fuse.js or similar for fuzzy search.
  - Closes on Esc or backdrop click.
  - Loads articles from `articles/` directory (T3r content).

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocked By**: T15, T3r (articles)

  **Acceptance Criteria**:
  - [ ] `?` opens help modal.
  - [ ] Search returns relevant articles.
  - [ ] Topics browsable.
  - [ ] Shortcuts reference shown.

  **Commit**: YES
  - Message: `feat(help): add help modal with search/topics/shortcuts`
  - Files: `web-new/src/app/help/`

---

- [ ] 15n. **Contextual tooltip system**

  **What to do**:
  - `web-new/src/app/ui/tooltip/`:
    - `tooltip.directive.ts`: Attribute directive for `appTooltip="..."`.
    - `tooltip.component.ts`: Uses CDK Overlay for positioning.
    - "Don't show again" per-tooltip state in localStorage.
  - Apply to key UI elements (settings options, theme switcher, error level dropdown).

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocked By**: T15

  **Acceptance Criteria**:
  - [ ] Tooltips appear on hover/focus.
  - [ ] Position correctly (no overflow).
  - [ ] "Don't show again" persists.

  **Commit**: YES
  - Message: `feat(ui): add contextual tooltip system`
  - Files: `web-new/src/app/ui/tooltip/`

---

- [ ] 15o. **Keyboard shortcut overlay**

  **What to do**:
  - `web-new/src/app/help/shortcuts-overlay.component.ts`:
    - Shows all keyboard shortcuts grouped by category.
    - Opens with `?` key (if no input focused).
    - Searchable.
    - Dismissible.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocked By**: T15m

  **Acceptance Criteria**:
  - [ ] Opens with `?` key.
  - [ ] All shortcuts listed.
  - [ ] Searchable.

  **Commit**: YES
  - Message: `feat(help): add keyboard shortcut overlay`
  - Files: `web-new/src/app/help/shortcuts-overlay.component.ts`

---

- [ ] 15p. **Empty-state component**

  **What to do**:
  - `web-new/src/app/ui/empty-state/`:
    - `empty-state.component.ts`: Reusable empty state with icon, message, action button.
    - Used by every list page (VMs, Containers, Jails, Volumes, Logs, Plugins, Themes, Users).
  - Variants per context:
    - "No data" (default)
    - "Loading error" (with retry button)
    - "Permission denied" (with admin help link)
    - "Backend unavailable" (with status link)
  - Each variant has contextual help article link.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocked By**: T15

  **Acceptance Criteria**:
  - [ ] Empty state appears on every list page.
  - [ ] Each variant renders correctly.
  - [ ] Help links work.

  **Commit**: YES
  - Message: `feat(ui): add empty-state component`
  - Files: `web-new/src/app/ui/empty-state/`

---

- [ ] 15q. **Friendly error pages (404/403/500/503)**

  **What to do**:
  - `web-new/src/app/pages/errors/`:
    - `not-found.component.ts`: `/404` — "Page not found" + search + nav links.
    - `forbidden.component.ts`: `/403` — "Access denied" + admin help link.
    - `server-error.component.ts`: `/500` — "Internal error" + reference code.
    - `service-unavailable.component.ts`: `/503` — "Backend unavailable" + status link.
  - Each page has:
    - Friendly illustration (SVG)
    - Plain-language explanation
    - Action buttons (go home, search, contact support)
    - Reference code for support requests
    - Help article link

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocked By**: T15

  **Acceptance Criteria**:
  - [ ] All 4 error pages render.
  - [ ] Each has working action buttons.
  - [ ] Reference codes generated.

  **Commit**: YES
  - Message: `feat(pages): add friendly error pages (404/403/500/503)`
  - Files: `web-new/src/app/pages/errors/`

---

- [ ] 17. **`$localize` + Karma+Jasmine setup**

  **What to do**:
  - Install `@angular/localize`.
  - `ng add @angular/localize` to wire it into `angular.json`.
  - Configure `i18n` block in `angular.json` for all 47 locales (41 real + 6 constructed).
  - Configure `ng extract-i18n` to generate `messages.xlf`.
  - Configure `karma.conf.js` with ChromeHeadless launcher, coverage reporter.
  - Set coverage thresholds in `angular.json` test block: lines ≥ 80, branches ≥ 80, functions ≥ 80.
  - Convert the 9 src test files (Vitest → Jasmine): mechanical rewrite of `vi.fn()` → `jasmine.createSpy()`, `vi.mock()` → TestBed providers, `screen.getByXxx` → fixture queries.
  - Tests: 1:1 functional parity for each existing test.

  **Must NOT do**:
  - Do NOT skip the Vitest → Jasmine conversion (4 files use `vi.mock`).
  - Do NOT add new test cases during migration.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T22-T39
  - **Blocked By**: T15

  **Acceptance Criteria**:
  - [ ] `ng extract-i18n` produces `messages.xlf`.
  - [ ] `ng test --watch=false` runs all 9 (rewritten) tests.
  - [ ] Coverage report shows ≥ 80% for at least 1 component.
  - [ ] All 47 locales configured in `angular.json`.

  **QA Scenarios**:
  ```
  Scenario: Tests pass under Jasmine
    Tool: Bash
    Steps:
      1. cd web-new && npm test -- --watch=false --browsers=ChromeHeadless
      2. Verify exit 0 and all 9 test specs pass.
    Expected Result: 9 specs pass.
    Evidence: .sisyphus/evidence/task-17-jasmine-tests.txt
  ```

  **Commit**: YES
  - Message: `chore(web): configure $localize + Karma+Jasmine with 80% coverage gate`
  - Files: `web-new/karma.conf.js`, `web-new/angular.json`, `web-new/src/app/**/*.spec.ts`

---

- [ ] 18. **NgRx SignalStore setup**

  **What to do**:
  - Install `@ngrx/signals`.
  - Create `src/app/store/` directory.
  - Implement `AuthStore` (SignalStore): signal for current user, signal for session expiry, computed for isAuthenticated.
  - Implement `ManifestStore`: signal for plugin manifest, computed for menu items.
  - Implement `ThemeStore`: signal for current theme, action to toggle.
  - Wire stores into `app.config.ts` providers.
  - Tests: store state transitions.

  **Must NOT do**:
  - Do NOT install full `@ngrx/store` (overkill); use SignalStore only.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T22-T39
  - **Blocked By**: T15

  **Acceptance Criteria**:
  - [ ] `@ngrx/signals` in `package.json`.
  - [ ] 3 SignalStores created and exported.
  - [ ] `app.config.ts` provides them.
  - [ ] Unit tests cover state transitions.

  **QA Scenarios**:
  ```
  Scenario: Stores hydrate and update
    Tool: Bash + node script
    Steps:
      1. ng test --watch=false --include='**/store/*.spec.ts'
      2. Verify all store tests pass.
    Expected Result: Tests pass.
    Evidence: .sisyphus/evidence/task-18-signalstore-tests.txt
  ```

  **Commit**: YES
  - Message: `feat(state): add NgRx SignalStore setup (Auth, Manifest, Theme)`
  - Files: `web-new/src/app/store/`

---

- [ ] 19. **HttpClient + custom MIME interceptors**

  **What to do**:
  - `src/app/http/cloudbsd.interceptor.ts`:
    - On outgoing request: set `Content-Type: application/vnd.cloudbsd+<inferred-action>` based on URL pattern.
    - On outgoing request: set `X-CloudBSD-Who/What/Why/Where` from current store state.
    - On response: validate `Content-Type` is `application/vnd.cloudbsd+*`, not `application/json`.
    - On 401: trigger frost-out flow.
  - Configure `provideHttpClient(withInterceptors([cloudbsdInterceptor]))` in `app.config.ts`.
  - Tests: header injection, MIME validation, 401 trigger.

  **Must NOT do**:
  - Do NOT fall back to `application/json` if action name can't be inferred (use `application/vnd.cloudbsd+unknown` and log a warning).

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T22-T39
  - **Blocked By**: T15, T11

  **Acceptance Criteria**:
  - [ ] All outgoing requests have custom MIME type.
  - [ ] All outgoing requests have 4 CloudBSD headers.
  - [ ] 401 response triggers `FrostOutService.show(reason)`.
  - [ ] Test covers each.

  **QA Scenarios**:
  ```
  Scenario: Interceptor sets custom headers
    Tool: Playwright
    Steps:
      1. ng serve &
      2. Playwright opens /login, types creds, submits.
      3. Playwright intercepts /api/login request, asserts:
         - Content-Type header starts with "application/vnd.cloudbsd+"
         - X-CloudBSD-Who/What/Why/Where present
    Expected Result: All headers present.
    Evidence: .sisyphus/evidence/task-19-interceptor.png
  ```

  **Commit**: YES
  - Message: `feat(http): add HttpClient with custom vnd.cloudbsd+ interceptors`
  - Files: `web-new/src/app/http/`

---

- [ ] 20. **Frost-out session modal component**

  **What to do**:
  - `src/app/ui/frost-out/`:
    - `frost-out.component.ts`: full-screen overlay with blur(8px) + rgba(0,0,0,0.6) background, centered modal.
    - `frost-out.service.ts`: singleton service exposing `show(reason: string)` and `hide()`.
    - When `show()` called: blocks all other UI interaction, hides info underneath, displays reason.
    - Modal has OK button (label localized). Click → navigate to `/login?reason=<reason>`.
  - Wire into `app.component.ts` as global overlay (position: fixed, z-index: 9999).
  - Accessibility: `role="alertdialog"`, `aria-modal="true"`, focus trap, Esc to confirm.
  - Tests: trigger show/hide, focus trap, navigation on click.

  **Must NOT do**:
  - Do NOT allow dismissal without confirmation (single OK button is intentional).
  - Do NOT leave the underlying page interactive.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T22-T25, T46
  - **Blocked By**: T15

  **Acceptance Criteria**:
  - [ ] Calling `FrostOutService.show('session_expired')` renders the modal.
  - [ ] Underlying page is visually obscured (CSS assertion via Playwright).
  - [ ] All other UI interaction blocked (Playwright click on a hidden button does nothing).
  - [ ] Click OK → navigates to `/login?reason=session_expired`.
  - [ ] Focus trapped inside modal (Tab cycles within).

  **QA Scenarios**:
  ```
  Scenario: Frost-out blocks and navigates
    Tool: Playwright
    Steps:
      1. ng serve &
      2. Playwright opens /dashboard, logs in.
      3. Playwright triggers FrostOutService.show('session_expired') via console eval.
      4. Asserts modal visible.
      5. Asserts body has `pointer-events: none` (or similar) on non-modal content.
      6. Clicks OK.
      7. Asserts URL is /login?reason=session_expired.
    Expected Result: Modal blocks, navigation happens.
    Evidence: .sisyphus/evidence/task-20-frost-out.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add frost-out session modal with focus trap`
  - Files: `web-new/src/app/ui/frost-out/`

---

### Wave 3: Vertical Slice (Settings Page)

- [ ] 22. **Settings page (view-only demo)**

  **What to do**:
  - `src/app/pages/settings/`:
    - View-only mode: hide all write controls (theme toggle is a switch, not a save button; locale picker is read-only display).
    - Reads `AuthStore.user` for current settings.
    - Components: `ThemeSection`, `LocaleSection`, `NotificationsSection`, `AboutSection`.
    - All text via `$localize`.
  - Tests: render with mock AuthStore, verify write buttons absent.

  **Must NOT do**:
  - Do NOT include any write buttons (view-only).

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential, after Wave 2)
  - **Blocks**: T23-T25
  - **Blocked By**: T15-T21

  **Acceptance Criteria**:
  - [ ] `/settings` renders in view-only mode.
  - [ ] No `<button>` element with type=submit or any "Save" text.
  - [ ] Theme switcher is a readonly display (or instant-apply, no submit).
  - [ ] Tests pass.

  **QA Scenarios**:
  ```
  Scenario: Settings page is view-only
    Tool: Playwright
    Steps:
      1. Login + navigate to /settings.
      2. Playwright asserts no button has text matching /save|update|submit/i.
      3. Playwright asserts all interactive elements are toggle/select (not submit).
    Expected Result: No write controls.
    Evidence: .sisyphus/evidence/task-22-settings-view-only.png
  ```

  **Commit**: YES
  - Message: `feat(pages): add view-only Settings page as vertical slice`
  - Files: `web-new/src/app/pages/settings/`

---

- [ ] 23. **Theme toggle + locale switcher (view-only)**

  **What to do**:
  - `ThemeSection`: instant theme toggle (light/dark) — not a save, just sets store signal.
  - `LocaleSection`: dropdown showing current locale, all 47 options listed, change is instant.
  - Theme applies via `Renderer2` setting `documentElement.classList`.
  - Locale change triggers Angular `$localize` switch.
  - Tests: toggle theme, change locale.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T24, T25)
  - **Blocks**: T47 (visual regression uses these)
  - **Blocked By**: T22

  **Acceptance Criteria**:
  - [ ] Theme toggle instantly applies dark mode class.
  - [ ] Locale switcher lists 47 languages.
  - [ ] Changing locale updates displayed text.

  **QA Scenarios**:
  ```
  Scenario: Theme toggles instantly
    Tool: Playwright
    Steps:
      1. /settings loaded.
      2. Click theme toggle.
      3. Assert documentElement.classList contains 'dark'.
      4. Click again, assert 'dark' removed.
    Expected Result: Toggle works.
    Evidence: .sisyphus/evidence/task-23-theme-toggle.png
  ```

  **Commit**: YES
  - Message: `feat(settings): add instant theme + locale switcher (view-only)`
  - Files: `web-new/src/app/pages/settings/`

---

- [ ] 22a. **Theme selector UI in Settings**

  **What to do**:
  - Add "Theme" section to Settings page.
  - Grid of 15 theme preview tiles (using `ThemePreviewComponent`).
  - Each tile shows: theme name, color sample, signature element.
  - Click → live preview applies theme.
  - Selected theme highlighted.
  - "Apply" button (or instant apply on click).
  - Search/filter themes by name.
  - Persists to user profile via `PUT /api/users/profile`.
  - Mock-up reference: `diagrams/screens/settings-themes.svg` (NEW — to be added to T02 supplement if not already).

  **Must NOT do**:
  - Do NOT allow theme change to break current page state.
  - Do NOT lose unsaved settings on theme switch.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocked By**: T22, T16a

  **Acceptance Criteria**:
  - [ ] Settings page has Theme section.
  - [ ] 15 theme tiles rendered.
  - [ ] Click applies theme live.
  - [ ] Selection persists to backend.
  - [ ] Search filters themes.

  **QA Scenarios**:
  ```
  Scenario: Theme switcher works
    Tool: Playwright
    Steps:
      1. Navigate to /settings.
      2. Click Miami Vice tile.
      3. Assert page renders in Miami Vice theme (background color changed).
      4. Reload page.
      5. Assert theme persists.
    Expected Result: Theme applies and persists.
    Evidence: .sisyphus/evidence/task-22a-theme-switcher.png

  Scenario: Search filters themes
    Tool: Bash
    Steps:
      1. Type "retro" in search.
      2. Assert only Pixel Pop, Phosphor CRT, Retro CRT variants shown.
    Expected Result: Search works.
    Evidence: .sisyphus/evidence/task-22a-search.txt
  ```

  **Commit**: YES
  - Message: `feat(settings): add theme selector UI with 15 themes`
  - Files: `web-new/src/app/pages/settings/theme-selector.component.ts`

---

- [ ] 22b. **Theme editor UI (full editor with tabs)**

  **What to do**:
  - `web-new/src/app/pages/settings/theme-editor.component.ts`:
    - Tabbed interface (Colors / Typography / Effects / Branding / Preview / Metadata).
    - **Colors tab**: Color picker per token (15+ tokens), grouped by category.
    - **Typography tab**: Font family dropdown, size inputs.
    - **Effects tab**: Shadow blur slider, border-radius slider, glass blur slider.
    - **Branding tab**: Name input, description textarea, logo upload (SVG/PNG), logo alt text.
    - **Preview tab**: Live render of Dashboard with current edits.
    - **Metadata tab**: Tags input, author info, license selector.
    - Save buttons: "Save as New", "Update Existing", "Export", "Reset".
    - Uses `CustomizerService` for state management.
  - Per mock-ups: `diagrams/screens/theme-editor*.svg`.
  - Tests: each tab renders, color picker works, save flow works.

  **Must NOT do**:
  - Do NOT allow empty theme name on save.
  - Do NOT lose edits on tab switch.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocked By**: T22, T16b, T3m (mock-ups)

  **Acceptance Criteria**:
  - [ ] All 6 tabs render.
  - [ ] Color picker updates live preview.
  - [ ] Logo upload works.
  - [ ] Save creates new theme.
  - [ ] Update modifies existing.

  **QA Scenarios**:
  ```
  Scenario: Theme editor flow
    Tool: Playwright
    Steps:
      1. Navigate to /settings/themes/editor.
      2. Click Colors tab.
      3. Change primary to #ff5500.
      4. Switch to Branding tab.
      5. Enter name "My Theme".
      6. Click Save as New.
      7. Assert theme appears in gallery.
    Expected Result: Editor works.
    Evidence: .sisyphus/evidence/task-22b-editor.png
  ```

  **Commit**: YES
  - Message: `feat(settings): add theme editor UI with 6 tabs`
  - Files: `web-new/src/app/pages/settings/theme-editor.component.ts`

---

- [ ] 22c. **Theme gallery UI (browse all themes)**

  **What to do**:
  - `web-new/src/app/pages/settings/theme-gallery.component.ts`:
    - Grid view of all themes (15 built-in + user's custom).
    - Each tile: theme name, color preview, signature element thumbnail.
    - Tabs: "Built-in" / "My Themes".
    - Search/filter by name.
    - Click tile → apply theme immediately (or open preview).
    - For custom themes: Edit / Export / Delete actions.
    - Mock-up reference: `diagrams/screens/theme-gallery.svg`.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocked By**: T22, T16a, T13a

  **Acceptance Criteria**:
  - [ ] Gallery shows 15 built-in themes.
  - [ ] User's custom themes appear in "My Themes" tab.
  - [ ] Click applies theme.
  - [ ] Search filters themes.

  **Commit**: YES
  - Message: `feat(settings): add theme gallery UI`
  - Files: `web-new/src/app/pages/settings/theme-gallery.component.ts`

---

- [ ] 22d. **Theme import/export UI**

  **What to do**:
  - `web-new/src/app/pages/settings/theme-import-export.component.ts`:
    - **Import view**: File upload zone (drag-and-drop), JSON paste textarea, preview panel.
    - **Export view**: Theme selector dropdown, JSON preview, Download button.
    - Conflict modal: "Theme already exists. Replace?" (per mock-up).
    - Validation error modal: shows field-level errors (per mock-up).
    - Uses `ImportExportService`.
    - Mock-up references: `theme-import.svg`, `theme-export.svg`, `theme-conflict.svg`, `theme-validation-error.svg`.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocked By**: T22, T16c, T3m

  **Acceptance Criteria**:
  - [ ] File upload accepts `.cbsd-theme.json`.
  - [ ] JSON paste works.
  - [ ] Preview shows theme applied.
  - [ ] Conflict modal handles duplicates.
  - [ ] Validation errors shown clearly.

  **Commit**: YES
  - Message: `feat(settings): add theme import/export UI`
  - Files: `web-new/src/app/pages/settings/theme-import-export.component.ts`

---

- [ ] 22e. **Onboarding tour (first-login wizard)**

  **What to do**:
  - `web-new/src/app/help/onboarding/`:
    - `onboarding-tour.component.ts`: Multi-step wizard.
    - Steps: welcome, navigation overview, key features, where to find help, finish.
    - Skippable ("Skip Tour" button).
    - State in localStorage (`onboarding_completed: true`).
    - Re-trigger via Settings.
    - Spotlight highlights for each step.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocked By**: T22, T15m

  **Acceptance Criteria**:
  - [ ] Shown on first login only.
  - [ ] Skippable.
  - [ ] Step navigation works.
  - [ ] State persists.

  **Commit**: YES
  - Message: `feat(help): add first-login onboarding tour`
  - Files: `web-new/src/app/help/onboarding/`

---

- [ ] 22f. **About page**

  **What to do**:
  - `web-new/src/app/pages/about/about.component.ts`:
    - Version info (from package.json).
    - License info (BSD 3-Clause).
    - Links to documentation (README, INSTALL, ADMIN_GUIDE, etc.).
    - Links to support/community.
    - Open source notices / attributions.
    - Build info (commit SHA, build date).
  - Accessible via header link or `/about` route.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocked By**: T22

  **Acceptance Criteria**:
  - [ ] Page renders.
  - [ ] Links work.
  - [ ] Version shown.

  **Commit**: YES
  - Message: `feat(pages): add About page`
  - Files: `web-new/src/app/pages/about/`

---

- [ ] 22g. **Status page**

  **What to do**:
  - `web-new/src/app/pages/status/`:
    - `status.component.ts`: `/status` route.
    - Backend health: status (up/down), latency (ms), last check time.
    - Plugin health: loaded count, errors.
    - Frontend build: version, commit SHA, build date.
    - Backend build: version, commit SHA, uptime.
    - Log file locations (clickable paths).
    - Database status (if applicable).
  - Auto-refresh every 30s.
  - Manual "Refresh" button.
  - Public (no auth required) — useful for ops.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocked By**: T22

  **Acceptance Criteria**:
  - [ ] Backend health shown.
  - [ ] Plugin health shown.
  - [ ] Build info shown.
  - [ ] Auto-refresh works.

  **Commit**: YES
  - Message: `feat(pages): add status/health page`
  - Files: `web-new/src/app/pages/status/`

---

- [ ] 22h. **Admin-only help topics (role-gated)**

  **What to do**:
  - `web-new/src/app/help/admin-topics/`:
    - Admin-only articles:
      - "Adding users via PAM"
      - "Configuring system services"
      - "Reading security audit logs"
      - "Plugin permission management"
      - "Custom MIME type registry"
      - "Log retention policy"
      - "Backup procedures"
      - "PAM configuration"
      - "Reverse proxy setup"
  - Hidden from non-admin users in help modal Topics tab.
  - Visible only after admin login.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocked By**: T15m, T22

  **Acceptance Criteria**:
  - [ ] Topics hidden for non-admins.
  - [ ] Topics visible for admins.
  - [ ] All admin topics written.

  **Commit**: YES
  - Message: `feat(help): add admin-only help topics`
  - Files: `web-new/src/app/help/admin-topics/`

---

- [ ] 22i. **Plugin documentation viewer**

  **What to do**:
  - `web-new/src/app/plugins/plugin-docs/`:
    - `plugin-docs.component.ts`: `/plugins/<name>/docs` route.
    - Loads plugin's `docs/` directory markdown files.
    - Sidebar with plugin's doc structure.
    - Same markdown renderer as in-app docs browser.
  - Each plugin can ship docs in its manifest's `docs` field (array of paths).

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocked By**: T3s (docs browser), T6 (plugin system)

  **Acceptance Criteria**:
  - [ ] Plugin docs render.
  - [ ] Sidebar shows structure.
  - [ ] Markdown renders.

  **Commit**: YES
  - Message: `feat(plugins): add per-plugin documentation viewer`
  - Files: `web-new/src/app/plugins/plugin-docs/`

---

- [ ] 24. **Session validation end-to-end flow**

  **What to do**:
  - `AuthStore.validateSession()`: calls `/api/session.validate`, updates store.
  - Periodic check: every 60 seconds.
  - On 401 response: trigger `FrostOutService.show(reason)`.
  - On login success: hide frost-out, redirect to original URL.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Blocks**: T46 (E2E test)
  - **Blocked By**: T13, T19

  **Acceptance Criteria**:
  - [ ] Periodic check every 60s.
  - [ ] 401 from any endpoint triggers frost-out.
  - [ ] After login, redirected back to original URL.

  **QA Scenarios**:
  ```
  Scenario: Session expiration triggers frost-out
    Tool: Playwright
    Steps:
      1. Login, navigate to /dashboard.
      2. Backend: revoke session in DB.
      3. Playwright waits for periodic check (or triggers via console).
      4. Asserts frost-out modal visible with reason.
      5. Clicks OK.
      6. Asserts URL is /login.
    Expected Result: Frost-out triggered.
    Evidence: .sisyphus/evidence/task-24-session-expiry.png
  ```

  **Commit**: YES
  - Message: `feat(auth): add periodic session validation + frost-out wiring`
  - Files: `web-new/src/app/auth/`

---

- [ ] 25. **Frost-out modal trigger wiring**

  **What to do**:
  - Wire `FrostOutService.show()` calls from:
    - `HttpInterceptor` on 401.
    - `AuthStore.validateSession()` on validation failure.
    - Manual trigger via console (for testing).
  - Tests: all 3 trigger paths.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Blocked By**: T20, T24

  **Acceptance Criteria**:
  - [ ] All 3 trigger paths verified by tests.
  - [ ] Modal renders same regardless of trigger.

  **QA Scenarios**:
  ```
  Scenario: 401 from interceptor triggers frost-out
    Tool: Playwright
    Steps:
      1. Login, navigate to /dashboard.
      2. Backend: revoke session.
      3. Playwright triggers a /api/* call (refresh data).
      4. Asserts frost-out visible.
    Expected Result: Frost-out via interceptor.
    Evidence: .sisyphus/evidence/task-25-interceptor-trigger.png
  ```

  **Commit**: YES
  - Message: `feat(auth): wire all frost-out trigger paths`
  - Files: `web-new/src/app/auth/`, `web-new/src/app/http/`

---

### Wave 4: Page Migration Wave A (7 pages)

- [ ] 26. **Dashboard page (view-only)**

  **What to do**:
  - Port `src/pages/Dashboard.tsx` (12KB) to `web-new/src/app/pages/dashboard/`.
  - Read-only: stat cards, charts, system health.
  - Use `@angular/animations` for any motion (replicate framer-motion timing).
  - Components: `StatCardComponent`, `SystemHealthCardComponent`, `UsageBarComponent`.
  - Tests: render with mock data.

  **Must NOT do**:
  - Do NOT include any write actions (e.g., "Restart" buttons).

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T27-T32)
  - **Blocks**: T47
  - **Blocked By**: T15-T21

  **Acceptance Criteria**:
  - [ ] `/dashboard` renders.
  - [ ] All stat cards display.
  - [ ] No write buttons.

  **QA Scenarios**: Standard Playwright snapshot.

  **Commit**: YES
  - Message: `feat(pages): add view-only Dashboard`
  - Files: `web-new/src/app/pages/dashboard/`

---

- [ ] 27. **Login page (PAM) + Index landing**

  **What to do**:
  - `LoginComponent`: username + password form, calls `/api/login`, on success stores session via cookie.
  - `IndexComponent`: landing page (marketing-style), links to /login.
  - Both with `$localize` text.
  - Tests: form validation, submission.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: T45, T47
  - **Blocked By**: T15-T21

  **Commit**: YES
  - Message: `feat(pages): add Login + Index pages (PAM auth)`

---

- [ ] 28. **VMs page (view-only)**

  **What to do**:
  - Port `VMs.tsx` (1KB) — likely placeholder; expand to a proper list view.
  - Read VM data via `/api/vms` (custom MIME).
  - Components: `ResourceListComponent` (port of existing), `ResourceModalComponent` (read-only view).

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Commit**: YES
  - Message: `feat(pages): add view-only VMs page`

---

- [ ] 29. **OCIContainers page (view-only)**

  **What to do**:
  - Port `OCIContainers.tsx` (1KB) — placeholder expansion.
  - Read via `/api/containers`.
  - Reuse `ResourceListComponent`.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Commit**: YES
  - Message: `feat(pages): add view-only OCIContainers page`

---

- [ ] 30. **Jails page (view-only)**

  **What to do**:
  - Port `Jails.tsx` (1KB) — placeholder expansion.
  - Read via `/api/jails`.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Commit**: YES
  - Message: `feat(pages): add view-only Jails page`

---

- [ ] 31. **NotFound page**

  **What to do**:
  - Port `NotFound.tsx`.
  - Simple 404 view with link to /.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Commit**: YES
  - Message: `feat(pages): add NotFound page`

---

- [ ] 32. **Cluster page (view-only, uses @xyflow/angular)**

  **What to do**:
  - Port `Cluster.tsx` (16KB) using `@xyflow/angular`.
  - Read-only cluster map with `ClusterNodeCard` and `ClusterStats` components.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Commit**: YES
  - Message: `feat(pages): add view-only Cluster page with @xyflow/angular`

---

### Wave 5: Page Migration Wave B (7 pages)

- [ ] 33. **Volumes page (largest, view-only)**

  **What to do**:
  - Port `Volumes.tsx` (979 lines, the largest).
  - Read-only ZFS volume list with `VolumeDetails`.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with T34-T39)
  - **Commit**: YES
  - Message: `feat(pages): add view-only Volumes page (largest)`

---

- [ ] 34. **NetworkMap page (uses @xyflow/angular heavily)**

  **What to do**:
  - Port `NetworkMap.tsx` (10KB) with `ContextMenu`, `Legend`, `MapHeader`, `NetworkNodes`.
  - Read-only network topology.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Commit**: YES
  - Message: `feat(pages): add view-only NetworkMap with @xyflow/angular`

---

- [ ] 35. **Users page (Admin-only, view-only)**

  **What to do**:
  - Port `Users.tsx` (16KB).
  - Read-only user list with profile viewer.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Commit**: YES
  - Message: `feat(pages): add view-only Users page (Admin-only)`

---

- [ ] 36. **Logs page (Admin-only, view-only)**

  **What to do**:
  - Port `Logs.tsx` (9KB).
  - Read-only audit log viewer.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Commit**: YES
  - Message: `feat(pages): add view-only Logs page (Admin-only)`

---

- [ ] 37. **Notifications page (view-only)**

  **What to do**:
  - Port `Notifications.tsx` (12KB).
  - Read-only notification list (mark-read action allowed since it's idempotent and local).

  **Recommended Agent Profile**:
  - `quick` | parallel: Wave 5
  - **Commit**: YES
  - Message: `feat(pages): add view-only Notifications page`

---

- [ ] 38. **ConsoleModal (xterm.js, view-only)**

  **What to do**:
  - Port `ConsoleModal.tsx` (7KB) using `@xterm/xterm`.
  - View-only terminal output (no input).
  - Socket.IO integration for live stream.

  **Recommended Agent Profile**:
  - `unspecified-high`
  - **Parallelization**: Wave 5
  - **Commit**: YES
  - Message: `feat(ui): add view-only ConsoleModal with xterm.js`

---

### Wave 6: Backend Plugin Discoverers

- [ ] 40. **Bhyve VM discoverer**

  **What to do**:
  - `src/plugins/discoverers/bhyve.ts`:
    - Spawns `vm list` (or parses `/dev/vmm/*` directly).
    - Returns VMs as services + templates.
  - Register in registry at startup.
  - Tests: with mock subprocess.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6
  - **Blocked By**: T10
  - **Commit**: YES
  - Message: `feat(plugins): add Bhyve VM discoverer`

---

- [ ] 41. **Podman/OCI container discoverer**

  **What to do**:
  - Spawns `podman ps -a --format json`.
  - Returns containers.

  **Recommended Agent Profile**:
  - `quick`
  - **Parallelization**: Wave 6
  - **Commit**: YES
  - Message: `feat(plugins): add Podman/OCI discoverer`

---

- [ ] 42. **Jail discoverer**

  **What to do**:
  - Spawns `jls -j` (FreeBSD).
  - Returns jails.

  **Recommended Agent Profile**:
  - `quick`
  - **Parallelization**: Wave 6
  - **Commit**: YES
  - Message: `feat(plugins): add Jail discoverer`

---

- [ ] 43. **FreeBSD host stats discoverer**

  **What to do**:
  - Parses `sysctl hw.*`, `vmstat`, etc.
  - Returns host stats.

  **Recommended Agent Profile**:
  - `quick`
  - **Parallelization**: Wave 6
  - **Commit**: YES
  - Message: `feat(plugins): add FreeBSD host stats discoverer`

---

- [ ] 44. **Notification discoverer (periodic)**

  **What to do**:
  - Periodic poll of system logs (`/var/log/messages`, dmesg).
  - Returns notifications as templates.

  **Recommended Agent Profile**:
  - `quick`
  - **Parallelization**: Wave 6
  - **Commit**: YES
  - Message: `feat(plugins): add periodic notification discoverer`

---

### Wave 7: Integration & Visual Regression

- [ ] 45. **E2E login → dashboard happy path**

  **What to do**:
  - Playwright spec: open /, click login link, enter creds, submit, assert /dashboard, assert user info in header.
  - Run on Chromium + Firefox.

  **Recommended Agent Profile**:
  - `unspecified-high`
  - **Parallelization**: Wave 7
  - **Commit**: YES
  - Message: `test(e2e): add login-to-dashboard happy path`

---

- [ ] 46. **Frost-out modal E2E**

  **What to do**:
  - Playwright spec: login, expire session (via API), wait for frost-out, click OK, assert /login.
  - All 4 trigger paths tested.

  **Recommended Agent Profile**:
  - `unspecified-high`
  - **Parallelization**: Wave 7
  - **Commit**: YES
  - Message: `test(e2e): add frost-out modal trigger paths`

---

- [ ] 47. **14-page Playwright visual regression**

  **What to do**:
  - `tests/visual/screenshots.spec.ts`:
    - For each of 14 pages, take Playwright screenshot at 1280×720 desktop + 375×812 mobile.
    - Compare against baseline (with 1% pixel diff tolerance).
    - Output diff images for failures.
  - First run creates baseline (committed to `tests/visual/baselines/`).
  - CI fails on visual diff.

  **Recommended Agent Profile**:
  - `unspecified-high`
  - **Parallelization**: Wave 7
  - **Blocked By**: T22-T39
  - **Commit**: YES
  - Message: `test(visual): add 14-page Playwright visual regression baseline`

---

- [ ] 48. **47-locale E2E smoke**

  **What to do**:
  - For each of 47 locales, load `/login?lng=<locale>`, assert at least 1 known translated string matches expectation.
  - For constructed locales (`tlh`/`doth`/`elv`/`qav`/`qvy`/`atl`), assert fallback to English.

  **Recommended Agent Profile**:
  - `unspecified-high`
  - **Parallelization**: Wave 7
  - **Commit**: YES
  - Message: `test(e2e): add 47-locale smoke with constructed fallback`

---

- [ ] 49. **CSP/HSTS/security header audit**

  **What to do**:
  - Verify Angular build emits CSP-compatible output.
  - Verify nginx config (or backend `helmet`) sets HSTS, X-Frame-Options, etc.
  - Tests: curl headers, axe-core scan.

  **Recommended Agent Profile**:
  - `quick`
  - **Parallelization**: Wave 7
  - **Commit**: YES
  - Message: `test(security): add CSP/HSTS/security header audit`

---

- [ ] 50. **Bundle size gate**

  **What to do**:
  - `scripts/check-bundle-size.sh`:
    - After `ng build --configuration=production`, measure `dist/*.js` gzipped sizes.
    - Fail if initial bundle > 250KB gzipped.
    - Fail if any single chunk > 500KB gzipped.

  **Recommended Agent Profile**:
  - `quick`
  - **Parallelization**: Wave 7
  - **Commit**: YES
  - Message: `chore(bundle): add bundle size gate (250KB initial, 500KB chunk)`

---

### Wave 8: Cutover

- [ ] 51. **Populate frontend repo `cloudbsdorg/cloudbsd-admin-ui.git` (existing)**

  **What to do**:
  Per user: "I have checked out the ui frontend and backend repos in ~/git/"
  - **Repo state**: `~/git/cloudbsd-admin-ui/` already exists with 2 commits (LICENSE 2020, Jenkinsfile 2020), branch `master`.
  - **No `gh repo create`** — repo already exists on GitHub.
  - `cd ~/git/cloudbsd-admin-ui && git fetch origin && git branch -m master main`
  - Copy Angular app code from `/home/mlapointe/secure/git/cloudbsd-ai-www/web-new/*` → `~/git/cloudbsd-admin-ui/`
  - Copy frontend-relevant docs: README, INSTALL, THEME_REFERENCE, PLUGIN_REFERENCE, DEVELOPER_GUIDE, TROUBLESHOOTING, FAQ, SECURITY, CHANGELOG, RELEASE_NOTES
  - Copy SVG diagrams to `docs/diagrams/`
  - **Preserve existing**: LICENSE (BSD 3-Clause), Jenkinsfile (existing FreeBSD 12.1 pipeline scaffold — will be modernized in T54 CI/CD task)
  - Stage + commit: `feat: add CloudBSD Admin UI Angular 20 application`
  - `git push -u origin main`
  - Tag: `git tag -a v1.0.0 -m "Initial release of CloudBSD Admin UI" && git push origin v1.0.0`
  - `gh release create v1.0.0 --notes-file RELEASE_NOTES.md --target main`
  - Update GitHub settings: default branch → `main`, branch protection on `main` (PR reviews, linear history), topics (`cloudbsd`, `angular`, `freebsd`, `plugin-system`, `admin-ui`, `bsd3`), enable Issues + Discussions, disable Wiki + Projects
  - Verify: clone fresh, `npm install`, `npm run build` succeeds
  - Update repo description on GitHub via `gh repo edit --description "..."`

  **Must NOT do**:
  - Do NOT delete or modify the planning repo (`marklapointe/cloudbsd-ai-www`)
  - Do NOT include `.sisyphus/`, `node_modules/`, `.env`, secrets, build artifacts
  - Do NOT copy backend code or FreeBSD port (those go to backend repo)
  - Do NOT rewrite existing git history (preserve 2020 LICENSE + Jenkinsfile commits)
  - Do NOT delete existing LICENSE or Jenkinsfile

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `git-master`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T52)
  - **Parallel Group**: Wave FINAL (after F1-F4, requires user approval)
  - **Blocked By**: All implementation tasks complete, F1-F4 APPROVED, user explicit approval

  **Acceptance Criteria**:
  - [ ] `~/git/cloudbsd-admin-ui/` has all Angular code + docs
  - [ ] Existing LICENSE and Jenkinsfile preserved
  - [ ] Branch renamed: `master` → `main`
  - [ ] `git push -u origin main` succeeded
  - [ ] `v1.0.0` tag pushed
  - [ ] `gh release create v1.0.0` succeeded
  - [ ] Fresh clone test: `git clone ... && npm install && npm run build` succeeds
  - [ ] Branch protection configured
  - [ ] Topics + description set
  - [ ] Default branch on GitHub is `main`

  **Commit**: YES (single commit on top of existing history)
  - Message: `feat: add CloudBSD Admin UI Angular 20 application`

---

- [ ] 52. **Populate backend repo `cloudbsdorg/cloudbsd-admin-backend.git` (existing)**

  **What to do**:
  Per user: "I have checked out the ui frontend and backend repos in ~/git/"
  - **Repo state**: `~/git/cloudbsd-admin-backend/` already exists with 1 commit (LICENSE 2026-07-06), branch `master`.
  - **No `gh repo create`** — repo already exists on GitHub.
  - `cd ~/git/cloudbsd-admin-backend && git fetch origin && git branch -m master main`
  - Copy backend code from `/home/mlapointe/secure/git/cloudbsd-ai-www/backend-new/*` → `~/git/cloudbsd-admin-backend/`
  - Copy FreeBSD port: `/home/mlapointe/secure/git/cloudbsd-ai-www/ports/` → `~/git/cloudbsd-admin-backend/ports/`
  - Copy backend-relevant docs: README, INSTALL, ADMIN_GUIDE, UPGRADE, API_REFERENCE, SECURITY, CHANGELOG, RELEASE_NOTES
  - Copy 5 man pages: `docs/man/man5/*`, `docs/man/man8/*`
  - Copy OpenAPI spec: `openapi.yaml`
  - **Preserve existing**: LICENSE (BSD 3-Clause)
  - Stage + commit: `feat: add CloudBSD Admin Backend (PAM auth + plugin registry)`
  - `git push -u origin main`
  - Tag: `git tag -a v1.0.0 -m "Initial release of CloudBSD Admin Backend" && git push origin v1.0.0`
  - `gh release create v1.0.0 --notes-file RELEASE_NOTES.md --target main`
  - Update GitHub settings: default branch → `main`, branch protection, topics (`cloudbsd`, `nodejs`, `freebsd`, `plugin-system`, `pam-auth`, `openpam`, `bsd3`), enable Issues + Discussions
  - Verify: clone fresh, `npm install`, `npm test` succeeds, FreeBSD port syntax check (`make -n -C ports/www/cloudbsd-admin`)
  - Update repo description via `gh repo edit --description "..."`

  **Must NOT do**:
  - Do NOT delete or modify the planning repo
  - Do NOT include `.sisyphus/`, `node_modules/`, `.env`, secrets, build artifacts
  - Do NOT copy frontend code (that goes to UI repo)
  - Do NOT rewrite existing git history (preserve 2026 LICENSE commit)
  - Do NOT delete existing LICENSE

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `git-master`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T51)
  - **Parallel Group**: Wave FINAL (after F1-F4, requires user approval)
  - **Blocked By**: All implementation tasks complete, F1-F4 APPROVED, user explicit approval

  **Acceptance Criteria**:
  - [ ] `~/git/cloudbsd-admin-backend/` has all backend code + docs + port + man pages
  - [ ] Existing LICENSE preserved
  - [ ] Branch renamed: `master` → `main`
  - [ ] `git push -u origin main` succeeded
  - [ ] `v1.0.0` tag pushed
  - [ ] `gh release create v1.0.0` succeeded
  - [ ] Fresh clone test: `git clone ... && npm install && npm test` succeeds
  - [ ] FreeBSD port syntax check passes
  - [ ] Branch protection configured
  - [ ] Topics + description set
  - [ ] Default branch on GitHub is `main`

  **Commit**: YES (single commit on top of existing history)
  - Message: `feat: add CloudBSD Admin Backend (PAM auth + plugin registry)`

---

- [ ] 53. **Retire/Archive old planning repo `marklapointe/cloudbsd-ai-www`**

  **What to do**:
  Per user: "yeah, we will retire the current repo"
  - Update local README.md: add ARCHIVED notice pointing to both new repos
  - Add `RETIRED.md` at repo root with full redirect notice
  - Commit: `chore(retire): archive - moved to cloudbsdorg/cloudbsd-admin-ui and cloudbsd-admin-backend`
  - `git push origin feat/angular-migration`
  - Archive via GitHub: `gh repo archive marklapointe/cloudbsd-ai-www --yes`
  - Update repo description: "ARCHIVED - Legacy React version + migration planning workspace. See cloudbsdorg/cloudbsd-admin-ui and cloudbsdorg/cloudbsd-admin-backend."
  - Close any open issues with redirect comment
  - Verify: GitHub shows repo as archived, redirects work

  **Must NOT do**:
  - Do NOT delete the repo
  - Do NOT delete the local clone at `~/git/cloudbsd-ai-www/`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `git-master`

  **Parallelization**:
  - **Can Run In Parallel**: NO (must run after T51 + T52 complete)
  - **Parallel Group**: Wave FINAL (after T51 + T52)
  - **Blocked By**: T51, T52 complete

  **Acceptance Criteria**:
  - [ ] Local README.md updated with ARCHIVED notice
  - [ ] `RETIRED.md` added at root
  - [ ] Commit pushed to origin
  - [ ] GitHub repo archived (`gh repo view` shows "Archived")
  - [ ] Repo description updated
  - [ ] Open issues closed (if any)

  **Commit**: YES
  - Message: `chore(retire): archive - moved to cloudbsdorg/cloudbsd-admin-ui and cloudbsd-admin-backend`
  - Files: `README.md`, `RETIRED.md`

---

- [ ] 39. **BackendStatusProvider (Socket.IO health)**

  **What to do**:
  - Port `BackendStatusProvider.tsx` (2KB) as Angular service.
  - Socket.IO `connect`/`disconnect` listeners, update `BackendStatusStore`.

  **Recommended Agent Profile**:
  - `quick`
  - **Parallelization**: Wave 5
  - **Commit**: YES
  - Message: `feat(state): add BackendStatusProvider service`

---

- [ ] 21. **Plugin template renderer (component library)**

  **What to do**:
  - `src/app/plugins/renderer/`:
    - `template-renderer.component.ts`: takes a `Template` object, renders the layout as Angular components.
    - `component-registry.service.ts`: maps `ComponentSpec.type` to Angular component class (e.g., `'card'` → `CardComponent`).
    - Built-in components: `CardComponent`, `TableComponent`, `StatCardComponent`, `BadgeComponent`, `TreeItemComponent`, `FormComponent`, `ChartComponent`.
    - `data-binding.service.ts`: fetches data per template's `dataBindings` config.
    - `dynamic-page.component.ts`: full-page renderer for manifest-registered pages.
  - Tests: render each built-in component, mock data binding.

  **Must NOT do**:
  - Do NOT allow `eval()` or arbitrary code execution in templates.
  - Do NOT trust manifest content without validation (validate against JSON schema).

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T22-T25, T26-T39
  - **Blocked By**: T15, T05, T12

  **Acceptance Criteria**:
  - [ ] `TemplateRendererComponent` exists and renders 7 component types.
  - [ ] Mock manifest with 1 page renders that page at `/ext/<pluginId>/<pageId>`.
  - [ ] Data binding fetches from `/api/<endpoint>` and updates view.
  - [ ] Tests cover all component types.

  **QA Scenarios**:
  ```
  Scenario: Dynamic page renders from manifest
    Tool: Playwright + mock backend
    Steps:
      1. ng serve with mock manifest: {templates: [{type: 'page', id: 'test', layout: [{type: 'card', title: 'Hello'}]}]}
      2. Playwright opens /ext/test-plugin/test.
      3. Asserts "Hello" card visible.
    Expected Result: Dynamic page renders.
    Evidence: .sisyphus/evidence/task-21-template-renderer.png
  ```

  **Commit**: YES
  - Message: `feat(plugins): add plugin template renderer with 7 built-in components`
  - Files: `web-new/src/app/plugins/`

---

- [ ] 13a. **Custom theme CRUD endpoints (`/api/users/me/themes/*`)**

  **What to do**:
  - `GET /api/users/me/themes` — list user's custom themes.
  - `POST /api/users/me/themes` — create new custom theme.
  - `PUT /api/users/me/themes/:id` — update existing.
  - `DELETE /api/users/me/themes/:id` — delete custom theme.
  - `GET /api/users/me/themes/:id/export` — download as `.cbsd-theme.json` (sets Content-Disposition).
  - All endpoints authenticated via session cookie.
  - Validate tokens against theme schema.
  - Max 50 custom themes per user (configurable).
  - All responses use `application/vnd.cloudbsd+<action>` MIME.

  **Must NOT do**:
  - Do NOT allow theme name collisions (return 409 on conflict).
  - Do NOT include other users' themes in any response.
  - Do NOT persist unvalidated tokens.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocked By**: T09 (auth)

  **Acceptance Criteria**:
  - [ ] All 5 endpoints work end-to-end.
  - [ ] Authenticated requests only.
  - [ ] Theme validation rejects malformed tokens.
  - [ ] User-scoped (no cross-user access).
  - [ ] Export produces valid `.cbsd-theme.json` file.

  **QA Scenarios**:
  ```
  Scenario: Create + export round-trip
    Tool: Bash + curl
    Steps:
      1. Login to get cookie.
      2. POST /api/users/me/themes with valid theme body.
      3. Verify 201 + theme_id.
      4. GET /api/users/me/themes/:id/export -i
      5. Verify Content-Disposition: attachment; filename="*.cbsd-theme.json".
      6. Verify JSON body matches what was POSTed.
    Expected Result: Round-trip works.
    Evidence: .sisyphus/evidence/task-13a-roundtrip.txt

  Scenario: 50-theme limit
    Tool: Bash
    Steps:
      1. POST 51 themes in sequence.
      2. Verify 51st returns 429 (too many themes).
    Expected Result: Limit enforced.
    Evidence: .sisyphus/evidence/task-13a-limit.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add custom theme CRUD endpoints`
  - Files: `server-new/src/api/themes.ts`

---

- [ ] 13b. **Theme import endpoint with validation**

  **What to do**:
  - `POST /api/users/me/themes/import` — accepts JSON body of imported theme.
  - Validates against `diagrams/theme-schema.json` (loaded at startup).
  - Verifies signature if present (sha256 of canonical JSON).
  - Sanitizes all string fields (strips HTML/scripts).
  - Rejects `__proto__`, `constructor`, `prototype` keys (prototype pollution).
  - Returns 201 + new theme_id on success.
  - Returns 400 with field-level errors on validation failure.
  - Response MIME: `application/vnd.cloudbsd+themes.import`.

  **Must NOT do**:
  - Do NOT eval() or execute any code from imported JSON.
  - Do NOT trust client-provided IDs (generate fresh UUIDs).
  - Do NOT allow logo data URLs > 200KB.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Reason**: Security-critical (untrusted input parsing).

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocked By**: T13a, T3n (schema)

  **Acceptance Criteria**:
  - [ ] Valid theme imports successfully.
  - [ ] Invalid colors rejected with field error.
  - [ ] Oversized logo rejected.
  - [ ] Prototype pollution attempt rejected.
  - [ ] Signature verified when present.

  **QA Scenarios**:
  ```
  Scenario: Prototype pollution blocked
    Tool: Bash
    Steps:
      1. POST theme with body: {"__proto__": {"isAdmin": true}, "name": "test", "tokens": {...}}
      2. Verify 400 + error message about __proto__.
      3. Verify backend state unchanged.
    Expected Result: Attack blocked.
    Evidence: .sisyphus/evidence/task-13b-proto-pollution.txt

  Scenario: Invalid color rejected
    Tool: Bash
    Steps:
      1. POST theme with tokens.primary = "not-a-color".
      2. Verify 400 + error: {field: "tokens.primary", message: "must match pattern ^#[0-9a-fA-F]{6}$"}.
    Expected Result: Validation error.
    Evidence: .sisyphus/evidence/task-13b-invalid-color.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add theme import endpoint with validation + sandboxing`
  - Files: `server-new/src/api/themes-import.ts`

---

- [ ] 14. **Login + logout + health endpoints (PAM-wired)**

  **What to do**:
  - `src/api/auth.ts`:
    - `POST /api/login`: PAM auth, create session, set cookie.
    - `POST /api/logout`: destroy session, clear cookie.
    - `GET /api/health`: returns `{status: 'ok', uptime, version}`.
  - All responses use `application/vnd.cloudbsd+<action>` MIME.
  - All require `X-CloudBSD-Who/What/Why/Where` headers per T11.
  - Tests: integration with test DB.

  **Must NOT do**:
  - Do NOT log passwords (even at debug level).
  - Do NOT include user password hashes in any response.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T22-T25, T45
  - **Blocked By**: T09, T11

  **Acceptance Criteria**:
  - [ ] All three endpoints work end-to-end.
  - [ ] Login uses PAM (verify via logs or integration test).
  - [ ] Logout destroys session and clears cookie.
  - [ ] Health is unauthenticated.

  **QA Scenarios**:
  ```
  Scenario: Full login → logout flow
    Tool: Bash + curl
    Steps:
      1. POST /api/login → 200 + Set-Cookie
      2. GET /api/users with cookie → 200
      3. POST /api/logout → 200 + Set-Cookie (clear)
      4. GET /api/users with cleared cookie → 401
    Expected Result: All four steps behave as expected.
    Evidence: .sisyphus/evidence/task-14-login-logout.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add login/logout/health endpoints with PAM auth`
  - Files: `server-new/src/api/auth.ts`

---

- [ ] 7. **Push Wave 0 artifacts to origin**

  **What to do**:
  - Stage all Wave 0 artifacts: diagrams, ADJUSTMENTS table, all .md docs.
  - `git add diagrams/ .gitignore`
  - `git commit -m "docs(migration): wave 0 planning artifacts - diagrams, openapi, plugin contract, mime registry, adjustments"`
  - `git push -u origin feat/angular-migration`
  - Verify `git log --oneline origin/feat/angular-migration | head -10` shows the wave 0 commits.

  **Must NOT do**:
  - Do NOT use `--force` or `--no-verify`.
  - Do NOT include any secrets in commits.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `["git-master"]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (must follow Wave 0 commits)
  - **Blocks**: T08, T15
  - **Blocked By**: T02-T06

  **Acceptance Criteria**:
  - [ ] `git push -u origin feat/angular-migration` exits 0.
  - [ ] `origin/feat/angular-migration` exists and is reachable.

  **QA Scenarios**:
  ```
  Scenario: Push succeeds
    Tool: Bash
    Steps:
      1. git push -u origin feat/angular-migration 2>&1 | tee evidence.txt
      2. grep -E "Branch .* set up to track" evidence.txt
    Expected Result: Push output shows tracking set up.
    Evidence: .sisyphus/evidence/task-7-push-output.txt
  ```

  **Commit**: YES (this task IS the commit)
  - Message: `docs(migration): wave 0 planning artifacts`
  - Files: all Wave 0 deliverables

---

- [x] 3. **SVG interaction flow diagrams (5 flows)** ✅ DONE (Mermaid markdown in `diagrams/flows/`)

  **What to do**:
  - Design 5 SVG interaction flows using `<foreignObject>` styled HTML:
    1. `login-flow.svg` — Login form → PAM auth → session cookie → redirect to dashboard.
    2. `frost-out-flow.svg` — Active session → 401 from backend → frost overlay → modal → OK → login.
    3. `plugin-manifest-flow.svg` — Backend starts → discovers service → emits manifest → frontend receives → renders new menu item.
    4. `view-only-enforcement-flow.svg` — User navigates → page renders → write controls hidden → read controls visible.
    5. `custom-mime-flow.svg` — Client sends `Accept: application/vnd.cloudbsd+createvm` → backend responds with that MIME → client parses typed payload.
  - Use the same SVG `<foreignObject>` template as T02.
  - For complex flows, use multiple panels (sequence-diagram-like) inside the foreignObject.

  **Must NOT do**:
  - Do NOT use Mermaid (per Honcho convention; Mermaid inline only in markdown).
  - Do NOT use raw HTML outside SVG.
  - Do NOT skip the custom-MIME flow (it's the most novel piece).

  **Recommended Agent Profile**:
  - **Category**: `artistry`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0 (with T01, T02, T04-T07)
  - **Blocks**: T22 (vertical slice references frost-out-flow)
  - **Blocked By**: T01

  **Acceptance Criteria**:
  - [ ] 5 SVG files exist at `diagrams/flows/*.svg`.
  - [ ] Each SVG renders sequence-diagram-style content.
  - [ ] `custom-mime-flow.svg` shows `application/vnd.cloudbsd+*` examples.
  - [ ] `frost-out-flow.svg` shows the modal + overlay visually.
  - [ ] `plugin-manifest-flow.svg` shows backend → frontend dynamic menu addition.

  **QA Scenarios**:
  ```
  Scenario: 5 flow SVGs render
    Tool: Playwright
    Steps:
      1. ls diagrams/flows/*.svg | wc -l  → expect: 5
      2. xmllint --noout diagrams/flows/*.svg
      3. Playwright opens each, screenshots.
    Expected Result: 5 valid SVGs, all render to non-empty screenshots.
    Evidence: .sisyphus/evidence/task-3-flow-screenshots/*.png
  ```

  **Commit**: YES
  - Message: `docs(diagrams): add 5 interaction flow SVGs`
  - Files: `diagrams/flows/*.svg`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read plan end-to-end. Verify all 14 pages exist as Angular components with view-only enforcement. Verify backend has PAM auth, plugin registry, custom MIME types. Verify 14 SVG mockups + 5 interaction flows exist in `diagrams/`. Verify OpenAPI spec exists at `diagrams/openapi.yaml`. Verify Playwright visual regression covers all 14 pages. Verify `diagrams/ADJUSTMENTS.md` has all 14 screens documented. Verify branch `feat/angular-migration` pushed to origin with all artifacts.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `ng test --watch=false` + `ng lint` + `npx playwright test`. Review for `any`, `@ts-ignore`, empty catches, console.log in prod, AI slop. Verify custom MIME types in actual responses (curl spot-check). Verify frost-out modal triggers on 401 (Playwright assertion). Verify plugin manifest items render in sidebar.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Visual [N/N] | VERDICT`

- [ ] F3. **Real Playwright QA Pass** — `unspecified-high` (+ `/playwright` skill)
  Execute every QA scenario from every task. Capture evidence. Test cross-page integration. Test frost-out modal flow (expire session → expect modal → click OK → expect login page). Test plugin manifest end-to-end (mock backend returns new menu item → frontend renders it).
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity + Adjustments Check** — `deep`
  Verify 1:1: every "Must Have" exists, no extra scope added. Verify "Must NOT Have" absent. Verify `diagrams/ADJUSTMENTS.md` matches actual code changes (each row corresponds to a real code delta). Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Adjustments [N/N documented] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **Phase 0 commits**:
  - `chore(branch): create feat/angular-migration from f01c24b`
  - `docs(diagrams): add 14 screen SVG mockups`
  - `docs(diagrams): add 5 interaction flow SVGs`
  - `docs(api): add OpenAPI 3.1 spec for new PAM-auth backend`
  - `docs(plugin): add plugin/template contract spec`
  - `docs(mime): add cloudbsd/* MIME-type registry`
  - `docs(adjustments): add screen adjustments tracking table`
- **Phase 1 commits** (backend foundation, one per task group):
  - `feat(backend): scaffold new PAM-auth backend`
  - `feat(auth): add PAM authentication middleware`
  - `feat(plugins): add plugin/service registry`
  - `feat(mime): add custom MIME-type + CloudBSD headers middleware`
  - `feat(api): add manifest endpoint with template list`
  - `feat(api): add session validation + login/logout/health endpoints`
- **Phase 2 commits** (frontend foundation):
  - `feat(web): scaffold Angular 20 workspace`
  - `chore(web): configure Tailwind + Angular CDK`
  - `chore(web): configure $localize + Karma+Jasmine`
  - `feat(state): add NgRx SignalStore setup`
  - `feat(http): add HttpClient with custom MIME interceptors`
  - `feat(ui): add frost-out session modal`
  - `feat(plugins): add plugin template renderer`
- **Phase 3 commits** (vertical slice + page migration):
  - One commit per page (14 commits)
- **Phase 4 commits** (discoverers + integration):
  - One commit per discoverer
  - One commit for visual regression baseline
- **Final commit**:
  - `chore(cutover): mark old React app + old backend as deprecated`
  - `chore(branch): push feat/angular-migration to origin`

---

## Success Criteria

### Verification Commands
```bash
# Branch exists and is pushed
git checkout feat/angular-migration
git log --oneline -5
git push origin feat/angular-migration --dry-run

# Documentation exists
ls diagrams/screens/*.svg  # 14 files
ls diagrams/flows/*.svg    # 5 files
test -f diagrams/openapi.yaml
test -f diagrams/plugin-contract.md
test -f diagrams/mime-registry.md
test -f diagrams/ADJUSTMENTS.md

# Backend builds and serves
cd server-new && npm install && npm run build && npm start &
curl -sI http://localhost:3001/api/health | head -3
# Expect: 200 OK, Content-Type: application/vnd.cloudbsd+health

# Frontend builds and serves
cd web-new && npm install && npm run build && npm start &
curl -sI http://localhost:4200/ | head -3
# Expect: 200 OK, Content-Type: text/html

# Tests pass
cd web-new && ng test --watch=false --code-coverage
# Expect: 80% coverage gate enforced, all tests pass

# Visual regression
cd web-new && npx playwright test
# Expect: 14 page snapshots, frost-out modal flow, plugin manifest flow
```

### Final Checklist
- [ ] All "Must Have" present and verified
- [ ] All "Must NOT Have" absent (no React code in web-new, no SSR, no Material lib)
- [ ] All 14 SVG mockups committed
- [ ] All 5 interaction flow SVGs committed
- [ ] OpenAPI spec committed and loadable
- [ ] Plugin contract spec committed
- [ ] MIME-type registry committed
- [ ] ADJUSTMENTS.md populated for all 14 screens
- [ ] Backend uses PAM auth (verify with `pam_tester` or integration test)
- [ ] Frost-out modal triggers on 401 (verified by Playwright)
- [ ] Plugin manifest items render in sidebar (verified by Playwright)
- [ ] Custom MIME types in responses (verified by curl)
- [ ] X-CloudBSD-Who/What/Why/Where headers present (verified by curl)
- [ ] 80% test coverage
- [ ] 14 page Playwright snapshots passing
- [ ] Branch pushed to origin
- [ ] All planning artifacts committed
- [ ] User explicit "okay" received

---

## Hand-off

After Momus approves (or user skips high-accuracy mode):
1. Plan + draft + diagrams committed to `feat/angular-migration`.
2. Branch pushed to `origin/feat/angular-migration`.
3. User runs `/start-work angular-migration` to begin execution.
4. Sisyphus executor picks up the plan, executes waves 0-7, then final verification wave.
5. User explicitly approves F1-F4 results before work is marked complete.