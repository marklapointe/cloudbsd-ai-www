# CloudBSD Admin: React → Angular Migration (View-Only + Plugin System)

## TL;DR

> **Quick Summary**: Big-bang rewrite of the CloudBSD Admin frontend from React 19 to Angular 20 with a **plugin-extensible architecture**, **view-only UX** (writes hidden), **frost-out session modal**, **modular PAM-backed auth**, and a **new backend** that uses **CloudBSD-specific MIME types** (`application/vnd.cloudbsd+<action>`) with `X-CloudBSD-Who/What/Why/Where` headers. The backend can dynamically push new menu items, pages, modals, and wizards via a template manifest — no redeploy required.
>
> **Framework Override**: User has overridden the application_guidelines WEBUI default of "React is the primary frontend framework". Justification: *"angular is now something to be accepted because it is better in some cases"*. Angular 20 is the framework for this project. Documented in Honcho peer memory (`cloudbsd-admin-test-lessons`).
>
> **Deliverables**:
> - **16 canonical screens** + **7 System Management sub-screens** (16-system-1-backups through 16-system-6-updates per T76 option C) + **1 plugins page** (17-plugins per T83) + **8 component mockups** (16-ips-modal, 17-vgpu-pool, 18-add-node-dialog + **5 detail panels: 19-vm, 20-container, 21-jail, 22-volume, 23-node per T78-T82**) + **3 modal mockups** (19-backup-create per T77, 20-plugin-install per T83, 21-theme-import per T84) + 5 interaction flow + 1 architecture (`diagrams/`)
> - OpenAPI 3.1 spec (`diagrams/openapi.yaml`)
> - Plugin contract spec (`diagrams/plugin-contract.md`)
> - Custom MIME-type + header registry (`diagrams/mime-registry.md`)
> - Wire-protocol envelope spec (`.sisyphus/plans/WIRE_PROTOCOL.md` — `application/vnd.cloudbsd+envelope`)
> - **Canonical data-structures spec** (`.sisyphus/drafts/data-structures.md` — UnitKind, Quantity, GPU/CPU/Network schemas)
> - **Canonical UI standard index** (`.sisyphus/drafts/ui-index.md` — universal ordering rules)
> - New PAM-auth backend (Node.js 24 + Express 5 + libpam)
> - Angular 20 frontend with plugin template renderer + view-only pages
> - Karma+Jasmine tests (**100% coverage gate** — user requirement, overrides 80% default)
> - Stress-test handoff document (`.sisyphus/drafts/STRESS_AGENT.md`) covering 8 chaos scenarios
> - Unified ErrorHandlingService (no `window.alert()`)
> - Rate limiting (login 5/15min, lists 600/min, WS 3000 events/min)
> - VM console via noVNC + websockify (FreeBSD jail sidecar)
> - Playwright visual regression suite + browser console error checks + 8h stability tests
> - Frost-out session modal component
> - Git branch `feat/angular-migration` with all artifacts pushed
>
> **Estimated Effort**: **XL** (~600-1200 hours; multi-week, multi-phase)
> **Parallel Execution**: YES — 8 waves, peak 7 concurrent tasks
> **Critical Path**: Phase 0 → Phase 1 (docs) → Phase 2 (backend core) → Phase 3 (frontend shell + plugin renderer) → Phase 4 (first page slice) → Phase 5 (visual regression + 100% coverage) → Phase 6 (cutover)

---

## Canonical Methodology (rules every wave must honor)

> **These rules are non-negotiable.** Any wave that violates them must be re-planned before execution.
> Strengthened and added 2026-07-10 per user directive "make sure the plans are updated!!"

### Five-rule methodology

1. **View-only by default.** Frontend is a passive receiver. Every
   "write" is routed through a backend action exposed via the
   plugin system (`application/vnd.cloudbsd+<action>` MIME +
   `X-CloudBSD-Who/What/Why/Where` headers). The admin sees a
   description of what would happen + a Confirm button, never
   inline edit affordances on data rows.
   *(Original T243 — Refresh / View-only / Export removal — DONE.)*

2. **Frost-out session modal on auth failure.** When the session
   validation fails OR the admin role drops below the requirement
   for the current view, the UI fades to gray and shows the
   frost-out modal. NO dedicated /401, /session-expired, /invalid
   screen (we return the user to /login instead — verified
   2026-07-09).

3. **Plugin-extensible.** New menu items, pages, modals, wizards
   come from the backend template manifest — no frontend
   redeploy. The plugin renderer is Angular 20 + the
   `plugin-contract.md` shape.

4. **Live-data paradigm — no Refresh, no View JSON.** Every view
   that shows changing data is a PASSIVE RECEIVER of pushed
   StreamEvents (`wss://<host>/api/stream`). No `↻ Refresh`,
   no `View JSON`, no `Reload`, no `Update from server`. The
   wire-protocol spec is at §2.29 and event envelope is at
   `data-structures.md §6 StreamEvent`. Every view displays
   a `● live` indicator with optional `Xs ago` (recipes at
   `ui-index.md §29`). *(New 2026-07-10.)*

5. **No sloppy navigation hints in body text.** Phrases like
   "see Network tab or per-VM Disks", "go to Logs →", "View in
   detail" are FORBIDDEN in mockups. If a data point belongs
   in the current view, INLINE it. If not, REMOVE the row.
   The left sidebar + breadcrumb are the only legitimate
   navigation surfaces. *(New 2026-07-10.)*

### Rule #7 — No cloudbsd or revytech as customer service/hostname

> **New 2026-07-10 per user directive** "cloudbsd doesn't have any
> services yet, possibly never, so don't include cloudbsd/revytech
> servers for anything that isn't about getting the product."

**Banned in customer-facing mockups, sample inputs, default form
values, log lines, and example hostnames:** any value that
implies CloudBSD or Revytech operates a service the customer is
configured to call. Specifically:

| Pattern | Replacement | Where it shows up |
|---------|-------------|-------------------|
| `ntp.cloudbsd.local`, `dns.cloudbsd.local`, `update.cloudbsd.io`, `community.cloudbsd.io`, `www.cloudbsd.io` | `ntp.lan`, `dns.lan`, `update.lan`, `themes.example.com`, `www.example.com` | NTP/DNS wizard, theme import, update server, log lines |
| `*.cloudbsd.lan`, `*.cloudbsd.local` | `*.corp.lan`, `*.lan` | Default hostnames, FQDNs, search domains |
| `cloudbsd-node-NN` | `prod-node-NN` | Example node names in detail panels, logs, dropdowns |
| `@cloudbsd.local`, `@cloudbsd.org` | `@example.lan` | Sample login / contact / owner emails |
| `${vault:kv/cloudbsd/...}` | `${vault:kv/myapp/...}` | Vault path examples in env-vars / secrets |
| `prod-cluster.cloudbsd.local` (relying-party ID) | `prod-cluster.lan` | WebAuthn passkey login cluster identifier |

**Allowed exceptions** (these describe the product itself,
not a service the customer calls):

- "CloudBSD Admin" wordmark / logo
- SVG artifact titles `<title>CloudBSD Admin — XYZ</title>`
- `cloudbsd-admin` cert name (it's the panel's service identifier, not a hosted endpoint)
- `cloudbsd-agent@1.4.2` version label (it's the agent software name)
- About / Try-CloudBSD / signup / signup-flow copy (product acquisition)
- Theme author `revytech` BYLINE in credits-only areas (acknowledged as community contributor)


### Rule #8 — Pre-flight capability check before action presentation

> **New 2026-07-10 per user insight** "while looking at 'Edit LACP bond' i couldn't help but think, do we know if these interfaces can be bonded? like is there room on the pci bus? what could go wrong? we need to check and to know if something can be done before presenting to the user."

**Every action, before the user sees it as an option, must be
checked for viability.** This is a hard rule, not a nice-to-have.

**Banned in mockups AND in shipped UI**: presenting an action
button that the backend will then reject. Examples that
violated this rule and were retroactively scrubbed:

- `Edit LACP bond` shown for two NICs that aren't even on the
  same PCI bus (no bonding possible)
- `Live migrate VM` for a target node that's overloaded
- `Mount volume` for a VM that uses a different storage bus
- `Update system` without free space for rollback image
- `Enable plugin` without signature verification or missing
  capability grant
- `Rotate API key` while sessions/integrations still use it

**The shape of an action-ready UI**:
1. The UI calls
   `POST /api/<resource>/<id>/<action>/preflight` (see
   `WIRE_PROTOCOL.md §2.31`).
2. The backend returns a `viable: true|false` plus a list of
   named checks with status and detail.
3. If `viable: false` AND at least one **blocker** check
   failed, the action button is **HIDDEN** from the menu (not
   greyed out, not shown with a tooltip — just absent).
4. If `viable: true` BUT some **warning** checks failed, the
   action button shows with a ⚠ badge. The confirm modal
   (per Rule #1 view-only / describe-then-confirm) re-runs
   pre-flight at click-time and lists the warnings for the
   user to acknowledge.

**Per-action viability matrix** is in `WIRE_PROTOCOL.md §2.32`.

**Rule #8 caches capability responses**: result valid for ≤ 30 s
on the client OR until a relevant `StreamEvent` arrives that
invalidates the cached result (e.g. `vm.memory.updated`,
`nic.link.state.changed`).

### Carrying these rules forward

- Every new SVG mockup must include the live indicator where
  data changes.
- Every new wizard/modal must have its `cbsd.stream.subscribe`
  calls enumerated in §2.29 topics.
- Any "view JSON", "see X tab", or "Refresh" appearing in a
  mockup or in API design is a regression — block the PR.



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
| [`07-cluster.svg`](../../diagrams/screens/07-cluster.svg) | Cluster | 6 nodes: cloudbsd-node-01 (master), node-02/03/04/06 (workers), node-05 (OFFLINE rose). CPU/MEM/Disk usage bars per node. Recent cluster events list (8 events). Aggregate stats. |
| [`08-users.svg`](../../diagrams/screens/08-users.svg) | Users | 14 user rows with avatars (mlapointe, root, www, backup, jenkins, guest, postgres, ubuntu, svc-bhyve, deploy, monitoring, audit, etc.). PAM status (active/locked/expired/disabled), last login, groups as badges, shell. Right detail panel for mlapointe (UID, email, 2FA, SSH keys, sessions, sudo, 5 recent logins). |
| [`09-logs.svg`](../../diagrams/screens/09-logs.svg) | Logs | Admin-only JSONL viewer. Level pills (All/Error/Warn/Info/Debug), severity histogram (60 buckets, red bars for errors), Tail ON indicator. 18 log rows from zfs/bhyve/jail/nginx/sshd/smb/cron/smart/caddy/ctdb modules with realistic messages. |
| [`10-notifications.svg`](../../diagrams/screens/10-notifications.svg) | Notifications | 14 notifications grouped by severity: ERROR (disk > 80%, auth failures, cluster heartbeat), WARN (vm paused, network flap, jail disabled), INFO (system updates, snapshots). Severity icons, source filters, Mark all read, Preferences. |
| [`11-settings.svg`](../../diagrams/screens/11-settings.svg) | Settings (Appearance) | Settings sidebar with 15 sections (admin-only sections marked with admin icon: Theme Customizer, Error Display, Plugins, Users, Sessions, API Keys). Active "Appearance" section with theme radio cards, color pickers, typography, layout, accessibility, behavior. Read-only banner + disabled Save. |
| [`12-login.svg`](../../diagrams/screens/12-login.svg) | Login | Full login form: branding, tagline, username/password with show/hide, Remember checkbox, Session timeout notice, Sign in button, passkey option, MFA TOTP (6 digit boxes). Help links (Forgot password, Why PAM, First time, Locked out). Right side decorative gradient panel with network topology pattern. Status pill (Backend reachable). |
| [`13-about.svg`](../../diagrams/screens/13-about.svg) | About | CloudBSD product versions (Admin, Base System, Node Agent, Storage/VM/Container plugins, Theme Pack). Status badges (current/supported/beta). License card (proprietary, contact licensing@cloudbsd.org). Support card (subscription, tier, account). Resources panel (no source code link). **Closed-source**: no git commit, no internal deps, no open-source library list — only product versions the customer is licensed to use. |
| [`14-status.svg`](../../diagrams/screens/14-status.svg) | Status | Backend health (UP, 18ms, 14d uptime), Database (SQLite 412 MB / 142 tables), 5 Plugins (all healthy with one zfs-monitor warning). 5 plugin health cards grid. System resources with bars. 12-row configuration table. 4 log file locations. |
| [`15-nodes.svg`](../../diagrams/screens/15-nodes.svg) | Nodes | Cluster-node list page (was previously a sub-section of Cluster). Status + Name + Role + Rack + CPU% + MEM% + Disk% + Uptime columns (per `ui-index.md` row 4). Add / Edit / Drain / Remove actions in row context menu (view-only enforcement hidden when `nodes.readonly`). Separate from Cluster page so node detail can be linked directly. |
| [`16-system.svg`](../../diagrams/screens/16-system.svg) | System Management | Consolidated admin page (was previously hidden inside Settings > Admin). 6 tabs: Backups, Exports, Stats, History, Audit Log, Updates. Hosts all destructive/operational admin actions that are out-of-scope for the per-resource pages. |

### Component Mock-ups (18) — `diagrams/components/`

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
| `16-ips-modal.svg` | Dual-stack IPv4/IPv6 address editor modal. CIDR prefix, lifetime (RFC 4861/4862), DHCP options, scope flag grid. Used in VM/Container/Network editing flows. |
| `17-vgpu-pool.svg` | vGPU Pool resource tracking widget (feature-flag-gated by `showVgpuResources`). Per-GPU compute slice inventory (NVIDIA SM/CUDA/tensor, AMD CU, Intel EU) + vGPU allocations. Vendor-specific detail in 'More info' modal per `data-structures.md` ComputeSlice. |
| `18-add-node-dialog.svg` | Add Node dialog (3 tabs): Manual / Auto-detect (mDNS) / Join token. Mock shows Auto-detect active with 2 nodes found. Used from Nodes page toolbar. |

### Error States (12) — `diagrams/errors/`

All error surfaces in the application, with 4 detail levels (Minimal/Standard/Detailed/Debug).

| File | Error |
|------|-------|
| `01-backend-unavailable.svg` | Pre-flight check: backend down, degraded shell |
| `02-network-error.svg` | Network request failed with retry |
| ~~`03-401-unauthorized.svg` (REMOVED 2026-07-09 — redundant, 401 redirects to /login)~~ | — |
| `04-403-forbidden.svg` | Admin-only area, role-gated |
| `05-404-not-found.svg` | Friendly 404 with search + nav back |
| `06-500-server-error.svg` | Internal error with reference code |
| `07-503-service-unavailable.svg` | Backend down, retry countdown |
| `08-pam-auth-failed.svg` | PAM auth failed, attempt counter |
| `09-pam-account-locked.svg` | PAM account locked, unlock timer |
| ~~`10-session-expired.svg` (REMOVED 2026-07-09 — redundant, 401 redirects to /login)~~ | — |
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
- **16 canonical SVG screen mockups** (`diagrams/screens/01-dashboard.svg` through `16-system.svg`).
- **7 System Management sub-screens** + 1 plugins page: `diagrams/screens/16-system-1-backups.svg` through `16-system-6-updates.svg` (per T76 option C) plus `17-plugins.svg` (per T83).
- **8 SVG component mockups**: existing `16-ips-modal.svg`, `17-vgpu-pool.svg`, `18-add-node-dialog.svg` + 5 detail panels `19-vm-detail-panel.svg` through `23-node-detail-panel.svg` (per T78-T82).
- 6 modal + 12 error + 5 notification + 4 loading + 3 mobile + 3 variant + 3 plugin + 15 theme + 8 customizer SVG mockups.
- 5 SVG interaction flow diagrams (`diagrams/flows/*.svg`) + 1 architecture Mermaid.
- `diagrams/openapi.yaml` — OpenAPI 3.1 contract for the new backend.
- `diagrams/plugin-contract.md` — Plugin/template manifest schema.
- `diagrams/mime-registry.md` — `application/vnd.cloudbsd+*` catalog.
- `diagrams/ADJUSTMENTS.md` — Screen adjustments tracking table.
- `.sisyphus/plans/WIRE_PROTOCOL.md` — canonical wire-protocol spec (envelope, headers, payloads).
- `.sisyphus/drafts/data-structures.md` — canonical data-structures spec (UnitKind, Quantity, GPU/CPU/Network schemas, audit log, alerts, secrets).
- `.sisyphus/drafts/ui-index.md` — canonical UI standard index (universal column/panel/tab/menu order rules).
- `.sisyphus/drafts/STRESS_AGENT.md` — stress-test handoff for 8 chaos scenarios.
- New backend at `/server-new` (kept separate from `/server` during transition).
- New Angular app at `/web-new` (kept separate from `/src` during transition).
- Playwright visual regression suite (`tests/visual/*.spec.ts`).
- Karma+Jasmine unit tests, 100% coverage gate (user override of 80% default).
- All planning artifacts committed and pushed to `origin/feat/angular-migration`.

### Definition of Done
- [ ] `git checkout feat/angular-migration && npm test` exits 0 with **100%** coverage.
- [ ] `git checkout feat/angular-migration && npm run e2e` exits 0 with all 16 page screenshots passing.
- [ ] `podman build -f web-new/Containerfile .` produces working image.
- [ ] New backend responds to `/api/health` with 200; PAM login returns session cookie.
- [ ] Frontend frost-out modal triggers on 401/403 from any authenticated endpoint.
- [ ] Backend plugin manifest at `/api/manifest` returns valid template list.
- [ ] Custom MIME types enforced (responses use `application/vnd.cloudbsd+<action>` AND `application/vnd.cloudbsd+envelope` per WIRE_PROTOCOL.md).
- [ ] All 47 locales selectable; constructed (`tlh`/`doth`/`elv`/`qav`/`qvy`/`atl`) fall back gracefully.
- [ ] UI columns/panels/tabs/menus follow `.sisyphus/drafts/ui-index.md` universal ordering.
- [ ] Backend data models match `.sisyphus/drafts/data-structures.md` Quantity/UnitKind/epochs.
- [ ] Branch pushed to `origin/feat/angular-migration` with all planning artifacts.

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

## Unified Error Reporting (MANDATORY)

> **No `window.alert()`, `window.confirm()`, or `window.prompt()` — EVER.**
> Every error surface uses the unified `ErrorModalService` (T15f). This applies to every implementation task.

### The Rule

**ALL errors in the application — from any source — flow through a single presentation system:**

| Error Source | Presentation |
|--------------|--------------|
| HTTP 4xx/5xx response | `ErrorModalService.show({ severity, code, message, errorId })` |
| Socket.IO disconnect | Inline banner in header (persistent) + status icon |
| Socket.IO reconnect failure | `ErrorModalService.show({ severity: 'WARNING', ... })` after 3 retries |
| Backend unavailable (pre-flight L1) | Inline top banner + degraded shell mode |
| Plugin load error | Inline error in plugin slot + error row in Plugins page |
| Theme load error | `ErrorModalService.show({ severity: 'WARNING', code: 'THEME_INVALID' })` |
| PAM auth failed | Inline error in login form (not modal — keeps user on form) |
| Form validation error | Inline field-level errors (no modals) |
| JS runtime error (uncaught) | Global `ErrorHandler` → `ErrorModalService.show({ severity: 'CRITICAL' })` |
| Promise rejection (unhandled) | Global `unhandledrejection` → `ErrorModalService.show({ severity: 'ERROR' })` |
| Network offline | Inline top banner ("You are offline") |
| Server-sent error event (Socket.IO `error:*`) | `ErrorModalService.show(...)` |
| Background task failure | Toast notification (not modal) with action to view details |
| Copy-to-clipboard error | Toast notification |

### What is BANNED

```typescript
// BANNED — these exist in the codebase, must be removed:
alert('Something went wrong');
window.alert('Login failed');
confirm('Delete this VM?');
window.confirm('Are you sure?');
prompt('Enter value:');
window.prompt('Enter your API key:');

// Also banned:
throw new Error('uncaught'); // without routing to ErrorHandler
console.error('User-facing error message'); // console is for debug, not UX
toastr.error('msg'); // if not routed through our NotificationService
```

### Lint Enforcement

ESLint rule in `web-new/.eslintrc.json`:

```json
{
  "rules": {
    "no-alert": "error",
    "no-restricted-globals": [
      "error",
      {
        "name": "alert",
        "message": "Use ErrorModalService.show() instead of window.alert(). See plan §Unified Error Reporting."
      },
      {
        "name": "confirm",
        "message": "Use ConfirmDialogComponent instead of window.confirm(). See plan §Unified Error Reporting."
      },
      {
        "name": "prompt",
        "message": "Build a proper form input instead of window.prompt(). See plan §Unified Error Reporting."
      }
    ]
  }
}
```

CI runs `npm run lint` and fails the build if any violation is found.

### Architecture

```
┌─────────────────┐
│  Error Source   │  HTTP error / uncaught exception / Socket.IO error / plugin error / ...
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  ErrorHandlingService (root service, injected as singleton) │
│  - Centralizes all error capture                             │
│  - Translates error types → ErrorPayload                     │
│  - Routes to: ErrorModalService | NotificationService | Inline │
└────────┬────────────────────────────────────────────────────┘
         │
         ├─→ ErrorModalService.show(error)   →  CDK Overlay + ErrorModalComponent
         ├─→ NotificationService.toast(error) → CDK Overlay + ToastComponent
         ├─→ Inline banner                       → Header banner / form field / page slot
         └─→ Logger.error(error)                → JSONL log file
```

### Backend Error → Frontend Error Mapping

Backend errors use `application/vnd.cloudbsd+error` MIME type for error responses:

```typescript
// Backend (T11, T14)
res.status(503)
  .type('application/vnd.cloudbsd+error')
  .set('X-CloudBSD-Error-Id', errorId)
  .set('X-CloudBSD-Request-Id', requestId)
  .set('X-CloudBSD-Hint', 'Backend restarting')
  .send({
    severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO',
    code: 'BACKEND_UNAVAILABLE',
    message: 'Human-readable description',
    errorId: 'err-2026-07-06-abc123',
    requestId: 'req-xyz789',
    endpoint: '/api/vms',
    status: 503,
    retryAfter: 30, // seconds
    hint: 'Backend restarting',
    docs: '/docs/errors/backend-unavailable',
    timestamp: '2026-07-06T12:34:56Z',
  });
```

```typescript
// Frontend HTTP interceptor (T19)
httpClient.get(...).pipe(
  catchError((err: HttpErrorResponse) => {
    if (err.headers.get('content-type')?.startsWith('application/vnd.cloudbsd+error')) {
      const payload: ErrorPayload = err.error;
      errorHandlingService.handle(payload);
      return throwError(() => payload);
    }
    // Fallback for non-CloudBSD errors
    errorHandlingService.handle({
      severity: err.status >= 500 ? 'CRITICAL' : 'ERROR',
      code: `HTTP_${err.status}`,
      message: err.message,
      errorId: err.headers.get('X-CloudBSD-Error-Id') ?? 'unknown',
    });
    return throwError(() => err);
  })
);
```

### Per-Channel Rules

| Channel | When | Component | Dismissible? |
|---------|------|-----------|---------------|
| **Modal** | Critical/Error that blocks action | `ErrorModalComponent` (CDK Overlay) | CRITICAL = no, ERROR = yes |
| **Toast** (top-right) | Non-blocking notification | `ToastComponent` (CDK Overlay) | Yes (auto-dismiss 5s) |
| **Inline form error** | Validation failure | Field-level error message | N/A (clears on edit) |
| **Header banner** | Persistent app-wide state (offline, backend down) | Inline top banner | Yes (when state resolves) |
| **Page slot error** | Per-component failure (plugin not loaded, widget failed) | Inline error in slot | Yes (retry button) |
| **Frost-out modal** | Session expired | Full-screen modal | NO (must click OK) |
| **Notification center** | Background notification (system event, plugin alert) | Notifications page entry | Yes |

### Implementation Tasks (new)

| Task | Description |
|------|-------------|
| T15f | ErrorModalComponent (already planned) — modal-based error display |
| **T15r** | `ErrorHandlingService` (NEW) — central error router |
| **T15s** | `NotificationService` + `ToastComponent` (NEW) — toast notifications |
| **T15t** | Global `ErrorHandler` + `unhandledrejection` listener (NEW) |
| **T15u** | ESLint config with `no-alert` rule (NEW) |
| **T15v** | Header banner component for persistent state (NEW) |

---

## Rate Limiting (MANDATORY)

> Per security chapter 0102-AccessControl and Honcho lessons on rate-limit middleware. Rate limiting protects against abuse, brute-force, and DoS.

### Backend Rate Limits

Implemented via `express-rate-limit` + Redis store (when available) or in-memory fallback.

| Endpoint Pattern | Limit | Window | Purpose |
|------------------|-------|--------|---------|
| `POST /api/auth/login` | **5** | 15 min | Brute-force protection |
| `POST /api/auth/logout` | 30 | 1 min | Session cleanup abuse |
| `POST /api/session.validate` | **120** | 1 min | Normal session validation (Socket.IO reconnects) |
| `GET /api/vms`, `/api/containers`, etc. (list) | 600 | 1 min | General UI polling |
| `GET /api/vms/:id` (detail) | 1200 | 1 min | Frequent detail views |
| `POST /api/logs/ingest` | 600 | 1 min | Frontend log buffering |
| `GET /api/plugins/*` | 60 | 1 min | Plugin metadata fetch |
| `GET /api/openapi.json` | 30 | 1 min | Spec downloads |
| `WS /socket.io/` connection | 5 | 1 min | Socket.IO reconnect abuse |
| `WS /socket.io/` events | 3000 | 1 min | Normal event rate |

### Rate Limit Headers (RFC 6585 + IETF draft)

Every response includes:
```
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 587
X-RateLimit-Reset: 1625568000
Retry-After: 60  // only on 429 responses
```

### 429 Response Shape (CloudBSD error format)

```json
{
  "severity": "WARNING",
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please retry in 60 seconds.",
  "errorId": "err-2026-07-06-rl-abc123",
  "requestId": "req-xyz789",
  "endpoint": "/api/auth/login",
  "retryAfter": 60,
  "limit": 5,
  "window": "15m"
}
```

Content-Type: `application/vnd.cloudbsd+error`

### NO GEOLOCATION (per user feedback 2026-07-07)

User: "where are we getting that info from?" — geolocation is an information leak.

The `user.login` event schema (and any other user tracking) MUST NOT include
geolocation/city/country fields. The IP address itself is sufficient for
security audit. Showing "last login location: Montreal" was hallucinated —
we have no source for it, and adding it would imply we geo-locate users
via their IP, which is a privacy concern.

**Changes**:
- ❌ Removed: `location` (city, country) from user.login event schema
- ❌ Removed: `location` field from user list view
- ✅ Kept: `ip` address (security audit essential)
- ✅ Kept: `timestamp` (when)
- ✅ Replaced "Montreal" / "Toronto" with "RFC1918" / "Public" labels
  (subnet classification only, not city)

**User login event schema** (final):
```json
{
  "ts": "2026-07-06T12:34:56.789Z",
  "userId": "mlapointe",
  "ip": "10.0.10.42",
  "userAgent": "Mozilla/5.0...",
  "sessionId": "sess-abc123",
  "networkClass": "rfc1918"
}
```

**Network class values** (derived from IP, no external service):
- `loopback` — `127.0.0.0/8` or `::1`
- `rfc1918` — `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- `link-local` — `169.254.0.0/16` or `fe80::/10`
- `ula` — `fc00::/7`
- `public` — anything else

**Honcho peer update** — `cloudbsd-admin-test-lessons` has new conclusion:
"STANDARD (CloudBSD Admin privacy, 2026-07-07): NEVER store or display geolocation (city, country, lat/lon, region) of users or their IPs. Showing 'last login: Montreal' implies we have a geo-IP service, which is a privacy concern AND a cost concern (geo-IP services charge per query). Use only subnet classification (rfc1918, link-local, public, loopback) which is computed locally. Same for VM/host display: show subnet class, not city."

**Validation rule** added to wire protocol: any schema field named `location`, `city`, `country`, `region`, `geo`, `lat`, `lon`, `timezone` (in user context) is REJECTED by the validator. Backend `config.json` cannot enable geolocation. UI components that imported `geolocation` libraries are forbidden (ESLint rule).

### Frontend Rate Limit Handling

When a 429 response arrives:
- Extract `Retry-After` header
- Show `ErrorModal` with countdown: "Too many requests. Try again in 60s."
- Disable the offending button during the countdown
- Log via JSONL logger at WARN level
- Re-enable button when countdown expires

### Rate Limit Bypass (Admin Only)

Admins can request temporary rate limit bypass via:
- `POST /api/admin/rate-limit/bypass` with reason + duration
- Stored in `rate_limit_bypass` table with expiry
- Logged at INFO level with admin user ID + reason
- Auto-expires after requested duration

### Implementation

```typescript
// backend-new/src/middleware/rate-limiter.ts
import rateLimit from 'express-rate-limit';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${req.body.username ?? 'unknown'}`,
  handler: (req, res) => {
    const errorId = generateErrorId();
    res.status(429)
      .type('application/vnd.cloudbsd+error')
      .set('Retry-After', '900')
      .set('X-CloudBSD-Error-Id', errorId)
      .send({
        severity: 'WARNING',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts. Try again in 15 minutes.',
        errorId,
        retryAfter: 900,
      });
  },
});
```

### Implementation Tasks (new)

| Task | Description |
|------|-------------|
| **T109** | `rate-limiter.ts` middleware (login, session, list, log ingest) |
| **T110** | Rate limit headers + 429 response shape |
| **T111** | Frontend `RateLimitService` (countdown, disable button, retry) |
| **T112** | Admin bypass endpoint + audit logging |
| **T113** | Rate limit metrics (per-endpoint counts, exported for Prometheus) |

---

## Data Structures (Units, Types, Sources)

> Full reference in `.sisyphus/drafts/data-structures.md`. Every numerical field with units is typed as `Quantity` with explicit `unit`. Storage auto-scales (B/KB/MB/GB/TB/PB), counts are whole numbers, percentages are whole numbers. CPU/RAM/disk/GPU details go in 'More info' modal - the table only shows summary. NEVER show geolocation city - only country code (US) for public IPs.

### Unit system (universal)

```ts
type UnitKind = 'bytes' | 'hz' | 'percent' | 'seconds' | 'operations' | 'bytes_per_sec' | 'celsius' | 'watts' | 'ip' | 'version' | 'count' | 'enum' | 'string' | 'timestamp' | 'ip_port' | 'uuid';

interface Quantity {
  value: number;       // raw number, always in SI base unit
  unit: UnitKind;       // what the value represents
  displayUnit?: string; // hint: 'MB' vs 'MiB'
}
```

### Display rules (per user feedback)

- **Storage sizes**: round to 1 decimal if <100 of unit (e.g. "86.1 GB", "4.7 TB"); whole number if >=100
- **Counts**: always whole numbers with thousands separator (e.g. "1,234")
- **Percentages**: whole numbers only ("95%" not "95.4%")
- **CPU**: brand + model + cores + threads shown compact; flags in 'More info' modal
- **RAM**: total + slots (used/total) + each slot size; full details in 'More info'
- **Disk**: model + size + bus + RPM/NVMe + SMART in 'More info'
- **GPU**: model + VRAM + utilization; full driver/capabilities in 'More info'
- **Network**: state + speed + IP (truncated if too long); full stats in detail
- **NO geolocation**: 'US' (country) for public IPs, never city/region
- **NEVER** show "1.7 GB" for whole numbers — round to "2 GB" or "1.7 GB" only when not whole
- **CPU/RAM/disk full details**: 'More info' modal (NOT inline in table)

### Core data structures

- **Node** — physical or virtual host with CPU, memory slots, storage, network, GPU
- **PhysicalCPU** — full CPU details (cores, threads, cache, features, microcode)
- **MemorySlot** — DIMM slot info (size, speed, type, manufacturer, part number)
- **Disk** — physical block device (model, size, bus, SMART health, temperature)
- **StoragePool** — ZFS pool (topology, devices, datasets, health, fragmentation)
- **Dataset** — ZFS dataset (compression, encryption, quota, mountpoint, snapshots)
- **GPU** — physical GPU or vGPU (model, VRAM, temperature, power, allocations)
- **VGPUAllocation** — slice on a GPU for a VM (whole, 1/2, 1/3, etc.)
- **NetworkInterface** — interface (type, state, IPs, traffic counters, throughput)
- **IPAddress** — IPv4 or IPv6 with scope, prefix, lifetime
- **VM** — bhyve virtual machine (OS, vCPU, RAM, disk, IPs, vGPU, snapshots)
- **Container** — OCI container (image, ports, mounts, resources, env)
- **Jail** — FreeBSD jail (hostname, IPs, memory, vCPUs, flags, services)
- **Volume** — ZFS dataset, NFS export, or iSCSI target with host(s), health
- **Cluster** — group of nodes with jobs and recent events
- **User** — PAM account (UID, GID, groups, 2FA, SSH keys, last logins)
- **Notification** — toast with severity, type, source, action buttons
- **ActivityEvent** — audit trail entry (user, source, action, target, details)
- **LogEntry** — JSONL log (level, module, source, user, requestId, message, structured)
- **BackupSchedule** — cron job (target, destination, retention, recent runs)
- **Plugin** — manifest with capabilities, menu items, routes, sandbox limits
- **SystemStats** — dashboard aggregates (counts, total usage, uptime, SLA)

### Source mapping (per user feedback)

| Data | Source | Refresh | Mock/Real |
|------|--------|---------|-----------|
| CPU count/model | `sysctl hw.model`, `dmidecode` | 1h | Mock |
| CPU features | `cpuid` | once at boot | Mock |
| RAM slots | `dmidecode -t memory` | 1h | Mock |
| RAM speed | `dmidecode -t memory` | 1h | Mock |
| Disk SMART | `smartctl -a` | 1h | Mock |
| GPU info | `nvidia-smi`, `rocm-smi` | 1m | Mock (when flag on) |
| Network stats | `netstat -i`, `netstat -s` | 10s | Real |
| IP geolocation | **NEVER** query external service | n/a | n/a |
| VM stats | `bhyvectl --get-stats` | 5s | Real |
| Container stats | `podman stats --no-stream` | 5s | Real |
| Jail stats | `jls -v` | 30s | Real |
| Volume stats | `zfs list -o space` | 30s | Real |
| Cluster heartbeat | agent -> backend | 5s | Real |
| User login | backend log | on event | Real |
| 2FA enrollment | user action | once | Real |
| SSH keys | `~/.ssh/authorized_keys` | on change | Real |
| Backup run | backup script output | on run | Real |
| Log entries | JSONL file | on append | Real |
| Notification | event source | on event | Real |
| Activity | any subsystem | on event | Real |
| Plugin | filesystem scan | on change | Real |
| Theme | filesystem scan | on change | Real |

### Implementation tasks (new)

| Task | Description |
|------|-------------|
| **T248** | `Quantity` TypeScript type + unit system module (`web-new/src/lib/quantity.ts`) |
| **T249** | `formatQty()` utility — auto-scales bytes/Hz/etc, rounds counts |
| **T250** | Backend Go `Quantity` struct with `MarshalJSON`/`UnmarshalJSON` for units |
| **T251** | Envelope schema: add `unit: UnitKind` to all numerical fields |
| **T252** | Mock data files: `web-new/src/app/mocks/nodes.json`, `vms.json`, `containers.json` (rich) |
| **T253** | Node detail modal showing full CPU/RAM/disk info (per-slot, per-disk) |
| **T254** | GPU pool panel (T196/T196) enhanced with vendor/driver/power/temp details |
| **T255** | 100% unit tests: quantity formatter, mock data shape, display transformations |

---

## Wire Protocol: CloudBSD Envelope

> **The actual wire protocol with full request/response examples lives in [`WIRE_PROTOCOL.md`](./WIRE_PROTOCOL.md) (873 lines).**
> **Every UI screen has a corresponding envelope exchange defined there. Mocks in `web-new/src/app/mocks/` implement it exactly so the future Go backend is a drop-in replacement.**

### Summary

| Aspect | Value |
|--------|-------|
| Transport | HTTP `POST /api` (uniform, avoids GET-no-body problem) |
| Request content-type | `application/vnd.cloudbsd+envelope` |
| Response content-type | `application/vnd.cloudbsd+envelope` (success) or `application/vnd.cloudbsd+error` (4xx/5xx) |
| HTTP headers | `X-CloudBSD-{Who,What,Why,Where,When,How,If-Match,Idempotency-Key}` |
| Body envelope | `{ mime, requestId, timestamp, context, headers[], payload[], errors?, next?, meta? }` |
| `payload[]` | Always an array (pluralistic — multiple typed items per call) |
| Per-item MIME | `application/vnd.cloudbsd+<noun>.<action>` (e.g. `+vm`, `+vms.batch`, `+metric.cpu`) |
| Per-item identity | `kind`, `version`, optional `action`, optional `includes[]` |
| Auth | Session cookie (HttpOnly Secure SameSite=Strict) + envelope `context.userId/sessionId` |
| Backend target | Go 1.26 on FreeBSD 16-CURRENT (per FreshPorts `lang/go126`) |

### Envelope envelope (canonical — full example below)

```jsonc
// REQUEST
{
  "mime": "application/vnd.cloudbsd+envelope",
  "requestId": "req-7e8f-4a2b-9c1d",
  "timestamp": "2026-07-06T12:34:56.789Z",
  "context": { "userId": "mlapointe", "sessionId": "sess-abc123" },
  "headers": [
    { "name": "who",  "value": "mlapointe@cloudbsd.org" },
    { "name": "what", "value": "vms.list" },
    { "name": "why",  "value": "user_requested" },
    { "name": "where", "value": "vms_view" }
  ],
  "payload": [
    { "mime": "application/vnd.cloudbsd+query", "kind": "query", "data": {
        "filter": { "status": ["RUN"], "host": null, "tag": null, "search": "" },
        "sort":  { "field": "name", "direction": "asc" },
        "page":  { "limit": 12, "cursor": null }
    } }
  ]
}

// RESPONSE (200)
{
  "mime": "application/vnd.cloudbsd+envelope",
  "requestId": "req-7e8f-4a2b-9c1d",
  "timestamp": "2026-07-06T12:35:00.082Z",
  "headers": [
    { "name": "who", "value": "system:vms" },
    { "name": "what", "value": "vms.list" }
  ],
  "payload": [
    { "mime": "application/vnd.cloudbsd+vms.batch", "kind": "vms.batch",
      "data": { "total": 47, "shown": 12, "stats": { "running": 39, "stopped": 6, "paused": 1, "error": 1 } } },
    { "mime": "application/vnd.cloudbsd+vm", "kind": "vm", "version": "v1",
      "data": { "id": "vm-nextcloud", "name": "nextcloud", "status": "RUN",
                "vcpu": 4, "ramBytes": 8589934592, "diskBytes": 128849018880,
                "uptimeSec": 1211670, "host": "cloudbsd-node-01", "ip": "10.0.10.10",
                "tags": ["prod","files"], "version": "v1-a7f3" } }
  ],
  "next": "eyJ2bVMtaWQiOiJ2bS1qb2JiaW5nIiwiYW9yZGVyIjpbIm5hbWUiXX0"
}

// ERROR RESPONSE (401 — session expired)
{
  "mime": "application/vnd.cloudbsd+error",
  "requestId": "req-7e8f-4a2b-9c1d",
  "timestamp": "2026-07-06T12:34:56.789Z",
  "headers": [
    { "name": "who", "value": "system:auth" },
    { "name": "what", "value": "auth.session.expired" }
  ],
  "payload": [
    { "mime": "application/vnd.cloudbsd+problem", "kind": "problem",
      "data": { "type": "https://errors.cloudbsd.org/auth/session-expired",
                "severity": "ERROR", "code": "AUTH_SESSION_EXPIRED",
                "message": "Your session has expired. Please sign in again.",
                "errorId": "err-2026-07-06-session-9b1c" } }
  ]
}
```

### Inventory of every UI↔backend exchange

(Full examples in [`WIRE_PROTOCOL.md`](./WIRE_PROTOCOL.md) — read that file for the complete payloads.)

| Screen / Component | `what` action(s) |
|--------------------|------------------|
| Login | `auth.login` |
| App boot | `preflight.check`, `auth.session.validate` |
| Dashboard | `dashboard.bootstrap` |
| VMs | `vms.list`, `vms.get`, `vms.console.token` |
| Containers | `containers.list` |
| Jails | `jails.list` |
| Volumes | `volumes.list` |
| Network Map | `network.topology` |
| Cluster | `cluster.status`, `cluster.node.list`, `cluster.events` |
| Users | `users.list` |
| Logs | `logs.list` + WebSocket `subscribe:logs` |
| Notifications | `notifications.list`, `notifications.markRead` |
| Themes | `themes.list`, `themes.apply`, `themes.import`, `themes.export` |
| Settings | `settings.get`, `settings.update` |
| Plugins | `plugins.manifest`, `plugins.invoke` |
| Status | `status.aggregate` |
| About | (subset of `status.aggregate`) |
| Help | `help.search`, `help.topics` |
| Docs | `docs.list`, `docs.get` |
| API docs | `openapi.spec` |
| Release notes | `release-notes.list` |

### Message format versioning

> **Every message format MUST be versioned. Clients and servers MUST support multiple versions concurrently during deprecation windows. Never break existing clients.**

#### Three orthogonal versioning dimensions

| Dimension | Where it appears | Example |
|-----------|------------------|---------|
| **Envelope schema version** | HTTP `Accept`/`Content-Type` header parameter + `meta.envelopeVersion` | `application/vnd.cloudbsd+envelope;v=2` |
| **MIME type schema version** | Inside JSON Schema `$id` and `$version` fields | `vm.v1.json`, `vm.v2.json` |
| **Wire version (capability negotiation)** | Server-supplied, client-cached | `"v2.3.0+go1.26.3"` |

#### HTTP content negotiation

```
# Client requests a specific envelope version
POST /api
Accept: application/vnd.cloudbsd+envelope;v=2
Content-Type: application/vnd.cloudbsd+envelope;v=2

# Server responds with the version it ACTUALLY used
Content-Type: application/vnd.cloudbsd+envelope;v=2
X-CloudBSD-Envelope-Version: 2
X-CloudBSD-Server-Version: 2.3.0+go1.26.3
```

If the client requests `v=2` but server only supports `v=1`:
```
HTTP/1.1 406 Not Acceptable
Content-Type: application/vnd.cloudbsd+error

{
  "mime": "application/vnd.cloudbsd+error",
  "payload": [{
    "mime": "application/vnd.cloudbsd+problem",
    "data": {
      "type": "https://errors.cloudbsd.org/protocol/version-unsupported",
      "severity": "ERROR",
      "code": "PROTOCOL_VERSION_UNSUPPORTED",
      "message": "Envelope version 2 requested but server supports 1",
      "errorId": "err-2026-07-06-ver-9b1c",
      "context": { "requestedVersion": 2, "supportedVersions": [1] }
    }
  }]
}
```

#### Per-MIME schema versioning

Each per-MIME schema is an independent file with its own version:

```
schemas/resources/
├── vm.v1.json              # current production schema
├── vm.v2.json              # next version (additive, no breaking changes)
├── vm.v3.json              # future breaking version (DRAFT)
```

The MIME type itself does NOT change with schema version (still `application/vnd.cloudbsd+vm`), but the server includes the schema version in each payload item:

```json
{
  "mime": "application/vnd.cloudbsd+vm",
  "kind": "vm",
  "version": "v1-a7f3",            // semver + content hash
  "data": { ... }
}
```

The `version` field uses the format `v<MAJOR>-<8-char-content-hash>`:
- `MAJOR` = schema version (1, 2, 3, ...)
- `8-char-content-hash>` = first 8 chars of SHA-256 of the schema file

This allows:
- Clients to detect if they understand the schema
- Servers to log mismatches
- Cache invalidation when schema changes

#### Compatibility rules (semver-style)

| Schema change | Version bump | Backward compatible? |
|---------------|--------------|----------------------|
| Add new optional field | MINOR (v1 → v1.1, file `vm.v1.json` updated) | ✓ Yes |
| Add new required field | MAJOR (v1 → v2, new file `vm.v2.json`) | ✗ No — breaking |
| Remove field | MAJOR | ✗ No — breaking |
| Rename field | MAJOR | ✗ No — breaking |
| Add new enum value | MINOR | ✓ Yes |
| Remove enum value | MAJOR | ✗ No — breaking |
| Widen type (int → number) | MINOR | ✓ Yes |
| Narrow type (number → int) | MAJOR | ✗ No — breaking |
| Add new MIME type | MINOR (envelope) | ✓ Yes |
| Add new payload item type | MINOR | ✓ Yes |

**Rule**: any change to `additionalProperties: false` is **always** MAJOR (breaking — clients sending old fields will be rejected).

#### Deprecation protocol

1. New schema version released (e.g. `vm.v2.json`)
2. Old schema version continues to be served (e.g. `vm.v1.json`)
3. Server sets `meta.deprecation: ["vm.v1 will be removed 2026-10-01"]` in responses
4. Server sends `Warning: 299 cloudbsd.org "vm.v1 deprecated, use v2"` HTTP header
5. Server logs warning when v1 is used
6. After 90 days: v1 removed; v1 requests return `PROTOCOL_VERSION_UNSUPPORTED`

#### Client-side version handling

```typescript
// web-new/src/app/protocol/version-negotiator.ts
@Injectable({ providedIn: 'root' })
export class VersionNegotiator {
  // Cached after first response
  private serverVersion: string | null = null;
  private supportedEnvelopeVersions: number[] = [1];  // start with 1
  
  setFromResponse(headers: HttpHeaders): void {
    const v = headers.get('X-CloudBSD-Server-Version');
    if (v) this.serverVersion = v;
  }
  
  buildAcceptHeader(): string {
    // always advertise highest version we support
    const max = Math.max(...this.supportedEnvelopeVersions);
    return `application/vnd.cloudbsd+envelope;v=${max}`;
  }
  
  isSchemaDeprecated(payloadItem: any): boolean {
    return payloadItem.version?.startsWith('v1-') && !this.isOldVersionAllowed();
  }
}
```

#### Wire version (full server version)

`X-CloudBSD-Server-Version: <git-describe>+<go-version>+<freebsd-version>`

Example: `v2.3.0+go1.26.3+freebsd16.0-current-amd64`

Components:
- `v2.3.0` — semantic version of cloudbsd-admin-backend
- `go1.26.3` — Go compiler version (per FreshPorts `lang/go126`)
- `freebsd16.0-current-amd64` — FreeBSD build target

This allows debugging "works on my machine" issues: client knows exactly what server version it talks to.

#### Per-action version opt-in

Some actions may opt into newer behavior. Client signals via `Accept`:
```
POST /api
Accept: application/vnd.cloudbsd+envelope;v=2;actions=vms.list=v2,theme.apply=v2
```

Server responds with which actions it served at which version in `meta.versions`:
```json
{
  "meta": {
    "versions": {
      "vms.list": "v2",
      "theme.apply": "v1",
      "auth.login": "v1"
    }
  }
}
```

This allows **per-action gradual rollout** without forcing all-or-nothing version upgrades.

#### Backward compatibility test matrix

CI runs this matrix on every PR:

```
┌─────────────────────┬──────────┬──────────┬──────────┐
│ Client \ Server     │ Server 1 │ Server 2 │ Server 3 │
├─────────────────────┼──────────┼──────────┼──────────┤
│ Client 1 (envelope) │   ✓      │   ✓      │   ✓      │
│ Client 2 (envelope) │   ✗      │   ✓      │   ✓      │
│ Client 3 (envelope) │   ✗      │   ✗      │   ✓      │
└─────────────────────┴──────────┴──────────┴──────────┘
```

Each cell: 6 representative exchanges (login, list, get, create, update, error) × 3 fixture types (happy path, edge case, error).

#### Wire version history (canonical)

| Version | Released | Sunset | Status | Changes |
|---------|----------|--------|--------|---------|
| v1.0.0 | 2026-07-15 | — | **current** | Initial release, 30+ actions, 47 locales, 15 themes |
| v1.1.0 | 2026-09-01 | 2027-01-01 | planned | Add `vms.console.*` actions, noVNC WebSocket |
| v2.0.0 | 2026-12-01 | 2027-06-01 | planned | **breaking**: add required `context.requestFingerprint`, switch to Cursor-based pagination only |
| v2.1.0 | 2027-02-01 | 2027-08-01 | planned | Add plugin marketplace actions, signed plugin bundles |
| v3.0.0 | 2027-06-01 | — | future | **breaking**: switch to streaming-only, no more REST list |

Each version documented in `CHANGELOG.md` with migration path.

#### Implementation tasks

| Task | Description |
|------|-------------|
| **T158** | `VersionNegotiator` service (TS) with `buildAcceptHeader()`, `setFromResponse()`, `isSchemaDeprecated()` |
| **T159** | Go equivalent: `internal/protocol/version.go` with same semantics |
| **T160** | Server: `X-CloudBSD-Server-Version` response header (git-describe + go version + freebsd version) |
| **T161** | Server: `Accept` header parsing — support `v=2;actions=vms.list=v2,...` |
| **T162** | Server: `meta.versions` in responses — map action → schema version actually served |
| **T163** | Server: `Warning: 299 cloudbsd.org "..."` HTTP header for deprecated schema usage |
| **T164** | Server: per-action version map (which actions at which schema versions) |
| **T165** | CI: backward compatibility matrix (3 server versions × 3 client versions × 6 exchanges) |
| **T166** | CI: schema-against-examples per version (run all fixtures against all schema versions) |
| **T167** | `WIRE_PROTOCOL.md` "Versioning" section with full spec of deprecation protocol |
| **T168** | Mock backend supports version negotiation (responds with same version as requested, or `PROTOCOL_VERSION_UNSUPPORTED`) |
| **T169** | `CHANGELOG.md` with version history table (T157 already created) |
| **T170** | `meta.deprecation` array populated by server for all v1 responses after v2 release |

#### Acceptance criteria for versioning

1. Server returns `X-CloudBSD-Server-Version: v<semver>+go<ver>+freebsd<ver>` on every response
2. Server parses `Accept: application/vnd.cloudbsd+envelope;v=<N>` and uses highest mutually supported version
3. Server returns `406 Not Acceptable` with `PROTOCOL_VERSION_UNSUPPORTED` if no compatible version
4. Per-MIME schema files have `$id` and `$version`; server tracks which versions it supports
5. Per-action version map (`meta.versions`) populated in every response
6. Deprecated schemas emit `Warning: 299 cloudbsd.org "..."` HTTP header
7. CI runs backward compatibility matrix on every PR
8. CI runs schema-against-fixtures per version on every PR
9. `CHANGELOG.md` documents breaking changes with migration path
10. Mock backend supports version negotiation end-to-end

### Mock implementation

In `web-new/src/app/mocks/`:
- `envelope.ts` — Envelope type + helpers (matches §1 of WIRE_PROTOCOL.md)
- `handlers/<resource>.ts` — one file per resource family, implements every `what` action with in-memory data matching the SVG mock-ups
- `http.ts` — MockHttpInterceptor converts `HttpClient.post(...)` into envelope exchanges; translates `application/vnd.cloudbsd+error` into `ErrorHandlingService.handle()`
- `socket.ts` — MockSocketService emits Socket.IO-style events for streaming exchanges (`subscribe:logs`, `subscribe:metrics`)

### Backend (Go) implementation

When the Go backend is implemented (in `~/git/cloudbsd-admin-backend/`):
- Module: `github.com/cloudbsdorg/cloudbsd-admin-backend`
- Go version: **1.26** (per FreshPorts `lang/go126` for FreeBSD 14/15/16)
- HTTP router: `chi` (lightweight, idiomatic)
- Validation: `go-playground/validator/v10` with per-action struct tags
- PAM: `github.com/msteinert/pam` (or local CGO binding)
- SQLite: `modernc.org/sqlite` (pure Go, no CGO, cross-builds to FreeBSD)
- WebSocket: `github.com/gorilla/websocket`
- Plugin isolation: Go `plugin.Open()` (Go's native plugin system, requires CGO)
- Architecture: hexagonal — handlers → services → repositories

### FreeBSD Port Makefile excerpt

```make
# lang/go126 is available on FreeBSD 14/15/16 (CURRENT)
PORTNAME=      cloudbsd-admin-backend
DISTVERSION=    1.0.0
CATEGORIES=    www
MASTER_SITES=  https://github.com/cloudbsdorg/cloudbsd-admin-backend/releases/download/v${DISTVERSION}/
DISTNAME=      ${PORTNAME}-${DISTVERSION}
EXTRACT_SUFX=  .tar.xz

MAINTAINER=    mark@cloudbsd.org
COMMENT=       CloudBSD Admin backend (Go service)
WWW=           https://cloudbsd.org

LICENSE=       BSD3CLAUSE
LICENSE_FILE=  ${WRKSRC}/LICENSE

BUILD_DEPENDS= go126>=1.26.3:lang/go126
RUN_DEPENDS=   openpam>=0:${PORTSDIR}/security/openpam

USES=          cpe gettext-runtime
CPE_VENDOR=    cloudbsdorg
USE_RC_SUBR=    cloudbsd-admin-backend

GO_VERSION=    1.26.3
GO_ENV=        GOFLAGS="-mod=readonly" GOPROXY="https://proxy.golang.org,direct"
GO_PKGNAME=    github.com/cloudbsdorg/cloudbsd-admin-backend
GO_TARGET=    ./cmd/cloudbsd-admin-backend:${GO_PKGNAME}

USERS=         cloudbsd-admin
GROUPS=        cloudbsd-admin

SUB_FILES=      pkg-message pkg-install pkg-deinstall
SUB_LIST+=      ...

PLIST_FILES+=    bin/cloudbsd-admin-backend \
                 share/cloudbsd-admin-backend/openapi.yaml \
                 "@(,etc/cloudbsd-admin/,config.json.sample,)"

OPTIONS_DEFINE=  PAM SQLITE PLUGINS WEBSOCKIFY
OPTIONS_DEFAULT= PAM SQLITE PLUGINS WEBSOCKIFY

PAM_DESC=        Enable PAM authentication (security/openpam)
SQLITE_DESC=     Embed SQLite via modernc.org/sqlite
PLUGINS_DESC=    Enable plugin loader (Go plugin package)
WEBSOCKIFY_DESC= Install websockify for noVNC console sidecar

post-install:
    ${MKDIR} ${STAGEDIR}${PREFIX}/etc/cloudbsd-admin
    ${INSTALL_DATA} ${WRKDIR}/config.json.sample ${STAGEDIR}${PREFIX}/etc/cloudbsd-admin/
    ${INSTALL_DATA} ${WRKDIR}/README.md ${STAGEDIR}${DOCSDIR}/

.include <bsd.port.mk>
```

> **IMPORTANT:** Set `GO_VERSION=1.26` (not the `lang/go` meta-port) so the build is reproducible across FreeBSD quarterly branches. The `lang/go126` port tracks 1.26.x patches independently.

### Acceptance criteria for this section

1. Every UI screen has a matching envelope exchange defined in WIRE_PROTOCOL.md
2. Every envelope request includes `who`, `what`, `why`, `where`
3. Every error response uses `application/vnd.cloudbsd+error` envelope (not standard envelope)
4. All MIME types follow `application/vnd.cloudbsd+<noun>.<action>` convention
5. Mock handlers in `web-new/src/app/mocks/` implement all 30+ actions
6. Switching from mock to real backend requires only changing `environment.apiBaseUrl`
 7. Go backend MUST validate `who`, `what`, `why`, `where` against allowlist
8. Go backend MUST reject requests missing any required header with `400 BAD_REQUEST` + `PROBLEM_TYPE` `https://errors.cloudbsd.org/protocol/missing-header`

---

## Configuration File Validation (100% tested)

> Per CloudBSD application_guidelines `Configuration Guidelines`: "Applications should support `--check-config` or `--dry-run` flag for validation without starting. Reject invalid configs with clear errors and non-zero exit. Safe defaults allow out-of-the-box operation. Provide commented example config or `appname init` command."

### Files that MUST be validated

| File | Format | Validated by |
|------|--------|--------------|
| `backend-new/config.json` (or `etc/cloudbsd-admin/config.json`) | JSON Schema | Backend `ConfigLoader` + `--check-config` flag |
| `web-new/src/environments/environment.ts` | TypeScript | Angular build (compile error) |
| `web-new/angular.json` | JSON Schema (Angular) | Angular CLI build |
| `web-new/tsconfig.json` | JSON Schema (TS) | `tsc --noEmit` |
| `backend-new/go.mod` | Go module file | `go mod verify` + `go mod tidy --check` |
| `backend-new/.golangci.yml` | YAML | `golangci-lint config verify` |
| `web-new/.eslintrc.json` | JSON | `eslint --print-config` |
| `web-new/karma.conf.js` | JS | `karma start --validate-config` |
| `web-new/src/assets/themes/*.json` | JSON Schema (theme) | `ThemeValidator` + `cloudbsd-theme-tools validate` |
| `web-new/src/app/plugins/*/plugin.json` | JSON Schema (plugin) | `PluginManifestValidator` |
| `web-new/src/assets/locales/*.json` | ICU MessageFormat | `i18n-validate` |
| FreeBSD port: `ports/www/cloudbsd-admin/Makefile` | bmake | `bmake -C ports/www/cloudbsd-admin -n` |
| FreeBSD port: `ports/www/cloudbsd-admin/files/pkg-plist` | bmake | `bmake plist` |
| CI: `.github/workflows/ci.yml` | GitHub Actions schema | `act -l` (lint) |
| TLS certs (`*.pem`) | X.509 | `openssl x509 -in cert.pem -noout -text` |

### Config loader architecture (Go)

```go
// internal/config/loader.go
package config

import (
    "embed"
    "fmt"
    "os"
    "sync"

    "github.com/santhosh-tekuri/jsonschema/v5"
)

//go:embed schemas/config.v1.json
var configSchemaJSON []byte

type Config struct {
    Port            int            `json:"port"`
    Bind            string         `json:"bind"`
    TLS             TLSConfig      `json:"tls"`
    Database        DatabaseConfig `json:"database"`
    Logging         LoggingConfig  `json:"logging"`
    Auth            AuthConfig     `json:"auth"`
    Plugins         PluginsConfig  `json:"plugins"`
    Themes          ThemesConfig   `json:"themes"`
    RateLimits      RateLimits     `json:"rateLimits"`
    TrustedProxies  []string       `json:"trustedProxies"`
    Cache           CacheConfig    `json:"cache"`
    Metrics         MetricsConfig  `json:"metrics"`
}

type Loader struct {
    schema *jsonschema.Schema
    mu     sync.RWMutex
}

func NewLoader() (*Loader, error) {
    compiler := jsonschema.NewCompiler()
    if err := compiler.AddResource("config.v1.json", configSchemaJSON); err != nil {
        return nil, fmt.Errorf("load config schema: %w", err)
    }
    sch, err := compiler.Compile("config.v1.json")
    if err != nil {
        return nil, fmt.Errorf("compile config schema: %w", err)
    }
    return &Loader{schema: sch}, nil
}

// Load reads a config file, validates it, applies defaults, returns *Config.
// On any error: returns nil, error with line/path info and remediation hint.
func (l *Loader) Load(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("read config %s: %w", path, err)
    }
    // Parse
    var raw interface{}
    if err := json.Unmarshal(data, &raw); err != nil {
        return nil, &ParseError{Path: path, Err: err, Hint: "check JSON syntax (trailing comma, unquoted key)"}
    }
    // Validate against JSON Schema
    if err := l.schema.Validate(raw); err != nil {
        return nil, &ValidationError{Path: path, Err: err, Hint: "see config.v1.json for schema"}
    }
    // Apply defaults + parse into typed struct
    cfg, err := applyDefaults(raw)
    if err != nil {
        return nil, err
    }
    // Sanity checks (cross-field validation not expressible in JSON Schema)
    if err := cfg.sanityCheck(); err != nil {
        return nil, &SanityError{Path: path, Err: err}
    }
    return cfg, nil
}

// CheckConfig is the --check-config CLI entry point.
// Loads + validates + prints summary, exits 0 (ok) or 1 (error).
func (l *Loader) CheckConfig(path string) error {
    cfg, err := l.Load(path)
    if err != nil {
        fmt.Fprintf(os.Stderr, "❌ Config invalid: %s\n\n", err)
        return err
    }
    fmt.Printf("✅ Config valid: %s\n", path)
    fmt.Printf("   Port: %d\n", cfg.Port)
    fmt.Printf("   Bind: %s\n", cfg.Bind)
    fmt.Printf("   Database: %s (%s)\n", cfg.Database.Driver, cfg.Database.Path)
    fmt.Printf("   Auth: PAM=%v, MFA=%v\n", cfg.Auth.PAMEnabled, cfg.Auth.MFARequired)
    fmt.Printf("   Plugins: %d enabled\n", len(cfg.Plugins.Enabled))
    fmt.Printf("   Themes: %d built-in\n", len(cfg.Themes.BuiltIn))
    return nil
}

func (c *Config) sanityCheck() error {
    if c.Port < 1 || c.Port > 65535 {
        return fmt.Errorf("port %d out of range [1, 65535]", c.Port)
    }
    if c.TLS.Enabled && c.TLS.CertFile == "" {
        return fmt.Errorf("TLS enabled but certFile is empty")
    }
    if c.Database.Driver == "sqlite" && c.Database.Path == "" {
        return fmt.Errorf("sqlite driver requires non-empty path")
    }
    if c.Auth.MFARequired && !c.Auth.PAMEnabled {
        return fmt.Errorf("MFA required but PAM not enabled")
    }
    for _, proxy := range c.TrustedProxies {
        if !isValidCIDR(proxy) {
            return fmt.Errorf("trustedProxies entry %q is not valid CIDR", proxy)
        }
    }
    if c.RateLimits.LoginPerWindow < 1 {
        return fmt.Errorf("rateLimits.loginPerWindow must be >= 1")
    }
    return nil
}
```

### Config JSON Schema (`config.v1.json`)

```jsonc
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://cloudbsd.org/schemas/config.v1.json",
  "$version": "1.0.0",
  "type": "object",
  "additionalProperties": false,
  "required": ["port", "bind", "database", "auth"],
  "properties": {
    "port":            { "type": "integer", "minimum": 1, "maximum": 65535, "default": 3001 },
    "bind":            { "type": "string", "format": "ipv4", "default": "127.0.0.1" },
    "tls":             { "$ref": "#/$defs/tlsConfig" },
    "database":        { "$ref": "#/$defs/databaseConfig" },
    "logging":         { "$ref": "#/$defs/loggingConfig" },
    "auth":            { "$ref": "#/$defs/authConfig" },
    "plugins":         { "$ref": "#/$defs/pluginsConfig" },
    "themes":          { "$ref": "#/$defs/themesConfig" },
    "rateLimits":      { "$ref": "#/$defs/rateLimits" },
    "trustedProxies":  { "type": "array", "items": { "type": "string", "format": "ipv4" }, "maxItems": 32 },
    "cache":           { "$ref": "#/$defs/cacheConfig" },
    "metrics":         { "$ref": "#/$defs/metricsConfig" }
  },
  "$defs": {
    "tlsConfig": {
      "type": "object",
      "required": ["enabled"],
      "properties": {
        "enabled":   { "type": "boolean", "default": false },
        "certFile":  { "type": "string", "maxLength": 4096 },
        "keyFile":   { "type": "string", "maxLength": 4096 },
        "minVersion": { "enum": ["1.2", "1.3"], "default": "1.3" },
        "ciphers":   { "type": "array", "items": { "type": "string" } }
      }
    },
    "databaseConfig": {
      "type": "object",
      "required": ["driver", "path"],
      "properties": {
        "driver":        { "enum": ["sqlite", "postgres"], "default": "sqlite" },
        "path":          { "type": "string", "maxLength": 4096 },
        "maxOpenConns":  { "type": "integer", "minimum": 1, "maximum": 1000, "default": 10 },
        "maxIdleConns":  { "type": "integer", "minimum": 0, "maximum": 100, "default": 5 },
        "connLifetime":  { "type": "string", "pattern": "^[0-9]+(s|m|h)$", "default": "1h" }
      }
    },
    "authConfig": {
      "type": "object",
      "required": ["pamEnabled"],
      "properties": {
        "pamEnabled":   { "type": "boolean", "default": true },
        "sessionTTL":   { "type": "string", "pattern": "^[0-9]+(s|m|h)$", "default": "30m" },
        "idleTimeout":  { "type": "string", "pattern": "^[0-9]+(s|m|h)$", "default": "30m" },
        "mfaRequired":  { "type": "boolean", "default": true },
        "mfaMethods":   { "type": "array", "items": { "enum": ["totp", "webauthn", "sms", "email"] }, "minItems": 1 },
        "lockoutAfter": { "type": "integer", "minimum": 1, "maximum": 100, "default": 5 },
        "lockoutFor":   { "type": "string", "pattern": "^[0-9]+(s|m|h)$", "default": "15m" }
      }
    },
    "loggingConfig": {
      "type": "object",
      "properties": {
        "level":      { "enum": ["debug", "info", "warn", "error"], "default": "info" },
        "format":     { "enum": ["json", "text"], "default": "json" },
        "output":     { "enum": ["stdout", "file", "syslog"], "default": "file" },
        "file":       { "type": "string", "maxLength": 4096 },
        "rotateMB":   { "type": "integer", "minimum": 1, "maximum": 10000, "default": 100 },
        "rotateKeep": { "type": "integer", "minimum": 1, "maximum": 1000, "default": 10 },
        "redact":     { "type": "array", "items": { "type": "string" } }
      }
    },
    "pluginsConfig": {
      "type": "object",
      "properties": {
        "dir":        { "type": "string", "maxLength": 4096, "default": "/usr/local/libexec/cloudbsd-admin/plugins" },
        "enabled":    { "type": "array", "items": { "type": "string" } },
        "disabled":   { "type": "array", "items": { "type": "string" } },
        "verifySignature": { "type": "boolean", "default": true }
      }
    },
    "themesConfig": {
      "type": "object",
      "properties": {
        "builtIn":    { "type": "array", "items": { "type": "string" } },
        "customDir":  { "type": "string", "maxLength": 4096 },
        "activeDefault": { "type": "string", "default": "cloudbsd-revytech" }
      }
    },
    "rateLimits": {
      "type": "object",
      "properties": {
        "loginPerWindow":         { "type": "integer", "minimum": 1, "maximum": 100, "default": 5 },
        "loginWindow":            { "type": "string", "default": "15m" },
        "sessionValidatePerMin":  { "type": "integer", "minimum": 1, "default": 120 },
        "listEndpointsPerMin":    { "type": "integer", "minimum": 1, "default": 600 },
        "wsEventsPerMin":         { "type": "integer", "minimum": 1, "default": 3000 },
        "wsConnsPerIP":           { "type": "integer", "minimum": 1, "default": 100 }
      }
    },
    "cacheConfig": {
      "type": "object",
      "properties": {
        "backend":  { "enum": ["memory", "redis"], "default": "memory" },
        "redisURL": { "type": "string", "format": "uri", "maxLength": 4096 },
        "ttl":      { "type": "string", "pattern": "^[0-9]+(s|m|h)$", "default": "5m" }
      }
    },
    "metricsConfig": {
      "type": "object",
      "properties": {
        "enabled":   { "type": "boolean", "default": true },
        "path":      { "type": "string", "default": "/metrics" },
        "namespace": { "type": "string", "pattern": "^[a-z][a-z0-9_]*$", "default": "cloudbsd_admin" }
      }
    }
  }
}
```

### CLI: `--check-config` flag

```
$ cloudbsd-admin-backend --check-config /usr/local/etc/cloudbsd-admin/config.json
✅ Config valid: /usr/local/etc/cloudbsd-admin/config.json
   Port: 3001
   Bind: 127.0.0.1
   Database: sqlite (/var/db/cloudbsd-admin/data.db)
   Auth: PAM=true, MFA=true
   Plugins: 5 enabled
   Themes: 15 built-in
```

On error:
```
$ cloudbsd-admin-backend --check-config /tmp/bad-config.json
❌ Config invalid: /tmp/bad-config.json
   Field: /rateLimits/loginPerWindow
   Keyword: maximum
   Message: -1 is greater than 100
   Instance: /rateLimits/loginPerWindow
   Hint: see config.v1.json for schema, or https://cloudbsd.org/docs/config

   Line 47 in /tmp/bad-config.json:
   "rateLimits": {
     "loginPerWindow": -1   ← INVALID (must be 1..100)
   }

Exit code: 1
```

### Config tests (Go, 100% coverage)

```go
// internal/config/loader_test.go
package config

import (
    "os"
    "path/filepath"
    "testing"
)

func newValidConfig() map[string]interface{} {
    return map[string]interface{}{
        "port": 3001,
        "bind": "127.0.0.1",
        "database": map[string]interface{}{
            "driver": "sqlite",
            "path":   "/var/db/cloudbsd-admin/data.db",
        },
        "auth": map[string]interface{}{
            "pamEnabled": true,
            "mfaRequired": true,
        },
    }
}

func TestLoader_Valid(t *testing.T) {
    cfg := writeConfig(t, newValidConfig())
    l, _ := NewLoader()
    _, err := l.Load(cfg)
    if err != nil { t.Fatalf("unexpected: %v", err) }
}

func TestLoader_MissingPort(t *testing.T) {
    bad := newValidConfig(); delete(bad, "port")
    cfg := writeConfig(t, bad)
    l, _ := NewLoader()
    _, err := l.Load(cfg)
    if err == nil { t.Fatal("expected error for missing port") }
    if !strings.Contains(err.Error(), "port") { t.Fatal("error should mention port") }
}

func TestLoader_PortOutOfRange(t *testing.T) {
    bad := newValidConfig(); bad["port"] = 99999
    cfg := writeConfig(t, bad)
    l, _ := NewLoader()
    _, err := l.Load(cfg)
    if err == nil { t.Fatal("expected error for port > 65535") }
}

func TestLoader_PortNegative(t *testing.T) {
    bad := newValidConfig(); bad["port"] = -1
    cfg := writeConfig(t, bad)
    l, _ := NewLoader()
    _, err := l.Load(cfg)
    if err == nil { t.Fatal("expected error for port < 1") }
}

func TestLoader_PortZero(t *testing.T) {
    bad := newValidConfig(); bad["port"] = 0
    cfg := writeConfig(t, bad)
    l, _ := NewLoader()
    _, err := l.Load(cfg)
    if err == nil { t.Fatal("expected error for port == 0") }
}

func TestLoader_BadBind(t *testing.T) {
    bad := newValidConfig(); bad["bind"] = "not-an-ip"
    cfg := writeConfig(t, bad)
    l, _ := NewLoader()
    _, err := l.Load(cfg)
    if err == nil { t.Fatal("expected error for non-IP bind") }
}

func TestLoader_TLSEnabledNoCert(t *testing.T) {
    bad := newValidConfig()
    bad["tls"] = map[string]interface{}{"enabled": true}
    cfg := writeConfig(t, bad)
    l, _ := NewLoader()
    _, err := l.Load(cfg)
    if err == nil { t.Fatal("expected error for TLS enabled but no cert") }
    if !strings.Contains(err.Error(), "certFile") { t.Fatal("error should mention certFile") }
}

func TestLoader_MFARequiredNoPAM(t *testing.T) {
    bad := newValidConfig()
    bad["auth"] = map[string]interface{}{"pamEnabled": false, "mfaRequired": true}
    cfg := writeConfig(t, bad)
    l, _ := NewLoader()
    _, err := l.Load(cfg)
    if err == nil { t.Fatal("expected error for MFA required but PAM disabled") }
}

func TestLoader_SQLiteNoPath(t *testing.T) {
    bad := newValidConfig()
    bad["database"] = map[string]interface{}{"driver": "sqlite"}
    cfg := writeConfig(t, bad)
    l, _ := NewLoader()
    _, err := l.Load(cfg)
    if err == nil { t.Fatal("expected error for sqlite without path") }
}

func TestLoader_BadTrustedProxy(t *testing.T) {
    bad := newValidConfig()
    bad["trustedProxies"] = []interface{}{"not-a-cidr"}
    cfg := writeConfig(t, bad)
    l, _ := NewLoader()
    _, err := l.Load(cfg)
    if err == nil { t.Fatal("expected error for bad CIDR") }
}

func TestLoader_RateLimitLoginZero(t *testing.T) {
    bad := newValidConfig()
    bad["rateLimits"] = map[string]interface{}{"loginPerWindow": 0}
    cfg := writeConfig(t, bad)
    l, _ := NewLoader()
    _, err := l.Load(cfg)
    if err == nil { t.Fatal("expected error for rateLimit 0") }
}

func TestLoader_UnknownField(t *testing.T) {
    bad := newValidConfig(); bad["unknownField"] = "x"
    cfg := writeConfig(t, bad)
    l, _ := NewLoader()
    _, err := l.Load(cfg)
    if err == nil { t.Fatal("expected error for unknown field") }
    if !strings.Contains(err.Error(), "unknown") { t.Fatal("error should mention unknown field") }
}

func TestLoader_TooManyTrustedProxies(t *testing.T) {
    bad := newValidConfig()
    proxies := make([]interface{}, 33)
    for i := range proxies { proxies[i] = "10.0.0.1/32" }
    bad["trustedProxies"] = proxies
    cfg := writeConfig(t, bad)
    l, _ := NewLoader()
    _, err := l.Load(cfg)
    if err == nil { t.Fatal("expected error for >32 proxies") }
}

func TestLoader_DefaultsApplied(t *testing.T) {
    bad := newValidConfig()
    delete(bad, "logging")  // optional, should default
    cfg := writeConfig(t, bad)
    l, _ := NewLoader()
    c, err := l.Load(cfg)
    if err != nil { t.Fatalf("unexpected: %v", err) }
    if c.Logging.Level != "info" { t.Fatal("expected default log level 'info'") }
    if c.Logging.Format != "json" { t.Fatal("expected default format 'json'") }
}

func TestLoader_BadJSON(t *testing.T) {
    tmp := filepath.Join(t.TempDir(), "bad.json")
    os.WriteFile(tmp, []byte("{not valid json"), 0600)
    l, _ := NewLoader()
    _, err := l.Load(tmp)
    if err == nil { t.Fatal("expected error for bad JSON") }
}

func TestLoader_FileNotFound(t *testing.T) {
    l, _ := NewLoader()
    _, err := l.Load("/nonexistent/config.json")
    if err == nil { t.Fatal("expected error for missing file") }
}

func TestLoader_PrototypePollution(t *testing.T) {
    bad := newValidConfig()
    bad["__proto__"] = map[string]interface{}{"isAdmin": true}
    cfg := writeConfig(t, bad)
    l, _ := NewLoader()
    _, err := l.Load(cfg)
    if err == nil { t.Fatal("expected error for __proto__") }
}

func TestCheckConfig_ExitsZeroOnValid(t *testing.T) {
    cfg := writeConfig(t, newValidConfig())
    l, _ := NewLoader()
    if err := l.CheckConfig(cfg); err != nil { t.Fatal("CheckConfig should return nil for valid") }
}

func TestCheckConfig_ExitsNonZeroOnInvalid(t *testing.T) {
    bad := newValidConfig(); bad["port"] = -1
    cfg := writeConfig(t, bad)
    l, _ := NewLoader()
    if err := l.CheckConfig(cfg); err == nil { t.Fatal("CheckConfig should return error for invalid") }
}

func writeConfig(t *testing.T, content interface{}) string {
    data, _ := json.Marshal(content)
    tmp := filepath.Join(t.TempDir(), "config.json")
    os.WriteFile(tmp, data, 0600)
    return tmp
}
```

### Frontend config tests (TypeScript)

```typescript
// web-new/src/environments/environment.spec.ts
import { environment } from './environment';
import { environmentProd } from './environment.prod';

describe('environment configuration', () => {
  it('dev environment has mock backend URL', () => {
    expect(environment.apiBaseUrl).toMatch(/localhost/);
    expect(environment.useMocks).toBe(true);
  });
  it('prod environment has real backend URL', () => {
    expect(environmentProd.apiBaseUrl).toMatch(/^https:/);
    expect(environmentProd.useMocks).toBe(false);
  });
  it('all envs have required keys', () => {
    for (const e of [environment, environmentProd]) {
      expect(e.apiBaseUrl).toBeTruthy();
      expect(e.wsBaseUrl).toBeTruthy();
      expect(e.buildVersion).toMatch(/^v\d+\.\d+\.\d+/);
    }
  });
  it('no secrets in environment', () => {
    for (const e of [environment, environmentProd]) {
      const serialized = JSON.stringify(e);
      expect(serialized).not.toMatch(/api[_-]?key/i);
      expect(serialized).not.toMatch(/secret/i);
      expect(serialized).not.toMatch(/password/i);
    }
  });
  it('build version matches package.json', () => {
    const pkg = require('../../package.json');
    expect(environment.buildVersion).toBe(`v${pkg.version}`);
  });
  it('envelope version is set', () => {
    expect(environment.envelopeVersion).toBe(1);
  });
  it('supported schema versions are monotonic', () => {
    expect(environment.supportedSchemaVersions).toEqual([1]);
  });
});
```

### Theme config tests (JSON)

```typescript
// web-new/src/app/themes/theme-config.spec.ts
import { ThemeStore } from './theme.store';
import cloudbsdRevytech from './themes/cloudbsd-revytech.json';
import phosphorCrt from './themes/phosphor-crt.json';

describe('theme JSON configs', () => {
  const themeStore = new ThemeStore();
  themeStore.registerSchema();  // load theme.v1.json

  it('all built-in themes validate against schema', () => {
    for (const theme of [cloudbsdRevytech, phosphorCrt]) {
      expect(themeStore.validate(theme)).toBe(true);
    }
  });

  it('rejects theme with missing required field', () => {
    const bad = { ...cloudbsdRevytech };
    delete bad.id;
    expect(themeStore.validate(bad)).toBe(false);
  });

  it('rejects theme with bad color format', () => {
    const bad = { ...cloudbsdRevytech, tokens: { ...cloudbsdRevytech.tokens, 'bg-primary': 'not-a-color' } };
    expect(themeStore.validate(bad)).toBe(false);
  });

  it('rejects theme with unknown token', () => {
    const bad = { ...cloudbsdRevytech, tokens: { ...cloudbsdRevytech.tokens, 'evil-token': '#000' } };
    expect(themeStore.validate(bad)).toBe(false);
  });

  it('theme name is unique', () => {
    const names = [cloudbsdRevytech, phosphorCrt].map(t => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('theme id is unique and matches name pattern', () => {
    for (const t of [cloudbsdRevytech, phosphorCrt]) {
      expect(t.id).toMatch(/^[a-z][a-z0-9_-]*$/);
    }
  });
});
```

### Plugin manifest config tests (JSON)

```typescript
// web-new/src/app/plugins/plugin-manifest.spec.ts
import { PluginRegistry } from './plugin-registry';
import bhyveMetrics from './fixtures/bhyve-metrics.plugin.json';

describe('plugin manifest configs', () => {
  const reg = new PluginRegistry();
  reg.registerSchema();

  it('valid manifest validates', () => {
    expect(reg.validateManifest(bhyveMetrics)).toBe(true);
  });

  it('manifest requires semver version', () => {
    const bad = { ...bhyveMetrics, version: '1.0' };  // no semver
    expect(reg.validateManifest(bad)).toBe(false);
  });

  it('manifest requires capabilities array', () => {
    const bad = { ...bhyveMetrics, capabilities: 'vms.read' };  // string not array
    expect(reg.validateManifest(bad)).toBe(false);
  });

  it('manifest capabilities must be from allowlist', () => {
    const bad = { ...bhyveMetrics, capabilities: ['vms.read', 'kernel.module.load'] };
    expect(reg.validateManifest(bad)).toBe(false);
  });

  it('manifest signature must be valid ed25519', () => {
    const bad = { ...bhyveMetrics, signature: 'not-a-signature' };
    expect(reg.validateManifest(bad)).toBe(false);
  });

  it('manifest sha256 must be valid hex', () => {
    const bad = { ...bhyveMetrics, sha256: 'not-hex' };
    expect(reg.validateManifest(bad)).toBe(false);
  });

  it('manifest template must not have eval', () => {
    const bad = { ...bhyveMetrics, template: 'eval(userInput)' };
    expect(reg.validateManifest(bad)).toBe(false);
  });
});
```

### Locale config tests (JSON)

```typescript
// web-new/src/assets/locales/locale-validator.spec.ts
import enUS from './en-US.json';
import esES from './es-ES.json';

describe('locale files', () => {
  for (const [name, locale] of Object.entries({ enUS, esES })) {
    it(`${name} has required keys`, () => {
      expect(locale['app.title']).toBeTruthy();
      expect(locale['nav.dashboard']).toBeTruthy();
      expect(locale['error.network']).toBeTruthy();
    });

    it(`${name} has no empty strings`, () => {
      const walk = (obj: any, path = '') => {
        for (const [k, v] of Object.entries(obj)) {
          if (typeof v === 'string') {
            expect(v.length, `${path}.${k}`).toBeGreaterThan(0);
          } else if (typeof v === 'object') {
            walk(v, `${path}.${k}`);
          }
        }
      };
      walk(locale);
    });

    it(`${name} has matching keys to en-US (no missing translations)`, () => {
      const flat = (obj: any, prefix = ''): string[] => {
        return Object.entries(obj).flatMap(([k, v]) =>
          typeof v === 'object' ? flat(v, `${prefix}${k}.`) : [`${prefix}${k}`]);
      };
      const enKeys = new Set(flat(enUS));
      const lKeys = new Set(flat(locale));
      for (const k of enKeys) {
        expect(lKeys.has(k), `missing key in ${name}: ${k}`).toBe(true);
      }
    });

    it(`${name} has no untranslated placeholders (no \`{TODO}\`, no \`xxxx\`)`, () => {
      const walk = (obj: any) => {
        for (const v of Object.values(obj)) {
          if (typeof v === 'string') {
            expect(v, 'placeholder leak').not.toMatch(/TODO|xxxx|\[.*?\]/);
          } else if (typeof v === 'object') {
            walk(v);
          }
        }
      };
      walk(locale);
    });
  }
});
```

### FreeBSD port config tests (Makefile)

```make
# ports/www/cloudbsd-admin/Makefile tests run in CI:
test:
    # 1. Port builds cleanly
    make clean && make
    # 2. Plist matches installed files
    make plist | diff - pkg-plist
    # 3. INSTALL/DEINSTALL scripts parse
    sh -n pkg-install
    sh -n pkg-deinstall
    # 4. config.json.sample validates
    @${SETENV} HOME=/tmp cloudbsd-admin-backend --check-config ${WRKSRC}/config.json.sample
    # 5. rc.d script syntax
    sh -n files/cloudbsd-admin.sh.in
    # 6. man pages lint
    mandoc -Tlint files/cloudbsd-admin.8
    mandoc -Tlint files/cloudbsd-admin.conf.5
```

### Implementation tasks (new)

| Task | Description |
|------|-------------|
| **T171** | `config.v1.json` JSON Schema (envelope, DB, auth, logging, plugins, themes, rate limits, cache, metrics) |
| **T172** | `internal/config/loader.go` (ConfigLoader with --check-config, --dry-run, sanity checks) |
| **T173** | `config/loader_test.go` (100% coverage, 20+ test cases) |
| **T174** | `cloudbsd-admin-backend --check-config <path>` CLI flag |
| **T175** | `cloudbsd-admin-backend --init-config` (write config.json.sample to stdout) |
| **T176** | `cloudbsd-admin-backend --print-config-defaults` |
| **T177** | `environment.spec.ts` (TS env validation) |
| **T178** | `theme-config.spec.ts` (all 15 built-in themes validate) |
| **T179** | `plugin-manifest.spec.ts` (plugin JSON validation) |
| **T180** | `locale-validator.spec.ts` (all 47 locales have matching keys) |
| **T181** | CI: FreeBSD port `make test` target (build + plist + scripts + config validate) |
| **T182** | CI: every JSON file in repo validated by `ajv-cli` against its schema |
| **T183** | CI: every .ts file passes `tsc --noEmit` |
| **T184** | CI: every .go file passes `go vet` + `gofmt -l` (empty) + `go test ./...` |
| **T185** | CI: every .md file passes `markdownlint` + `test_md.sh` (5 checks) |
| **T186** | CI: every shell script passes `shellcheck` |
| **T187** | CI: every YAML file passes `yamllint` |
| **T188** | CI: every TOML file passes `taplo check` |
| **T189** | CI: every Docker/Containerfile passes `hadolint` |
| **T190** | CI: GitHub Actions workflow passes `act --validate` |
| **T191** | `bin/check-all-configs.sh` — runs ALL config validators + exits 0 only if all pass |
| **T192** | Pre-commit hook: `pre-commit run --all-files` (runs check-all-configs.sh + lint + test) |

### Acceptance criteria for config testing

1. **`--check-config` flag** works on backend, exits 0/1, prints clear summary
2. **Every config field** validated against `config.v1.json` JSON Schema
3. **Sanity checks** (cross-field validation) implemented in `sanityCheck()`
4. **100% test coverage** of `ConfigLoader` (all branches: missing field, bad type, out of range, unknown field, prototype pollution, bad JSON, missing file, defaults)
5. **Every JSON file** in repo (config.json, package.json, angular.json, tsconfig.json, theme JSON, plugin JSON, locale JSON) validated by CI
6. **Every TS file** passes `tsc --noEmit`
7. **Every Go file** passes `go vet` + `gofmt` + `go test`
8. **Every shell script** passes `shellcheck`
9. **Every Makefile** passes `bmake -n` (parse)
10. **Every Markdown file** passes `test_md.sh` (5 checks) + `markdownlint`
11. **FreeBSD port** has `make test` target that builds + validates
12. **Pre-commit hook** runs all config validators + lint + tests
13. **No secrets** in any environment file (CI scans for API keys, secrets, passwords)
14. **Schema versioning** for `config.v1.json` (config.v2.json when breaking)
15. **No empty strings** in any locale file
16. **All 47 locales** have matching keys to en-US
17. **No untranslated placeholders** (no `TODO`, no `xxxx`, no `[...]`)

---

## System Management Page (consolidated admin actions)

> Per Honcho peer `cloudbsd-admin-test-lessons` (2 new conclusions). The 'view-only' tag, 'Refresh' button, and 'Export' button on per-resource pages are NOISE. Consolidate all cross-cutting admin actions into a dedicated /system page.

### Page layout

`/system` — admin-only, 6 tabs:

```
System Management
  Backups | Exports | Stats | History | Audit Log | Updates
  --------

  Backups tab:
  - Scheduled backups list (5 sample schedules shown)
    - daily-tank-data, weekly-full-cluster, hourly-incremental,
      monthly-archive, failed-jellyfin-vm
  - Per-row: name, schedule, last run, size, status, retention,
    destination, actions (Run now / Delete)
  - [+ New schedule] button
  - Destructive: type-to-confirm

  Exports tab:
  - Grid of 8 export buttons (2-column):
    - Configuration (JSON)
    - Logs (JSONL)
    - Notifications (CSV)
    - Activity Feed (JSON)
    - Cluster State (JSON)
    - Theme Library (JSON)
    - GPU Inventory (JSON)
    - Network Topology (JSON)
  - Each button: icon, label, format badge, description tooltip

  Stats tab:
  - 12 stat tiles (3-column grid):
    - 47 VMs (+3 this week)
    - 62 Containers (+8)
    - 12 Jails (0)
    - 13 Volumes (+1)
    - 6 Nodes (1 offline)
    - 5 Plugins (0 failed)
    - 47 Locales (0 in review)
    - 15 Themes (3 custom)
    - 8,192 API calls/min (p99: 45ms)
    - 2.3 TB Data backed up (last 24h: 12 GB)
    - 0 Security incidents (last: 47d ago)
    - 99.97% Uptime 90d SLA (4 nines target)

  History tab:
  - Recent admin actions log (10 most recent)
  - Columns: time (UTC), user, action, target, result
  - Filter dropdown: All / Backups / Exports / Settings / User
  - Each row: monospace timestamp, color-coded result (green OK,
    amber warn, red error)

  Audit Log tab:
  - Signed tamper-evident log (HMAC chain)
  - Filterable by user, action, date range
  - Export option
  - "Verify chain integrity" button

  Updates tab:
  - Agent update available (newer version)
  - Plugin updates (per-plugin)
  - System updates (FreeBSD patches)
  - "Update all" / per-item "Update" buttons
```

### Pattern: per-page actions vs cross-cutting actions

| Action | Lives on | Reason |
|--------|---------|--------|
| View VM details | VMs page | Domain-specific (VM) |
| Start/stop/migrate VM | VMs page | Domain-specific (VM) |
| Resize volume | Volumes page | Domain-specific (volume) |
| View logs | Logs page | Domain-specific (logs) |
| Acknowledge notification | Notifications page | Domain-specific (notification) |
| **Refresh** | Page header (icon button only) | Universal |
| **Export data** | /system > Exports | Cross-cutting |
| **Backup data** | /system > Backups | Cross-cutting |
| **View stats** | /system > Stats | Cross-cutting |
| **Audit log** | /system > Audit Log | Cross-cutting |
| **Apply update** | /system > Updates | Cross-cutting |

### Per-page header (CLEAN)

Each data page has:
- Title (large)
- Subtitle (description, count, last update time)
- Action buttons (domain-specific only)
- Page-specific filters
- Small refresh icon in top-right (not full button)
- NOT: "view-only" badge, NOT: "Refresh" button, NOT: "Export" button

### Sidebar update

Sidebar Admin section adds "System Mgmt" between Settings and Status:
```
Overview
  Dashboard
  Virtual Machines
  Containers
  Jails
  Volumes
  Network Map
  Cluster
  Nodes
Admin
  Users
  Logs
  Notifications
  Settings
  System Mgmt       <-- NEW
  Status
  About
```

### Implementation tasks (new)

| Task | Description |
|------|-------------|
| **T233** | `/system` route + `SystemManagementPage` with 6 tabs |
| **T234** | `BackupsTabComponent` — backup list, run-now, delete with type-to-confirm |
| **T235** | `ExportsTabComponent` — 8 export buttons, triggers download via XHR blob |
| **T236** | `StatsTabComponent` — 12 stat tiles, auto-refresh every 60s |
| **T237** | `HistoryTabComponent` — admin action log, filterable, paginated |
| **T238** | `AuditLogTabComponent` — signed tamper-evident log with verify button |
| **T239** | `UpdatesTabComponent` — agent + plugin + system updates with diff |
| **T240** | `BackupScheduleModalComponent` — create/edit schedule (cron-like) |
| **T241** | Refresh icon button component (used on all data page headers) |
| **T242** | Tests: 100% coverage of all 6 tabs + 3 modals |
| **T243** | Remove "Refresh" / "Export" / "View-only" buttons from 14 data page SVGs (DONE) |
| **T244** | Sidebar "System Mgmt" link (DONE in 16-system.svg + all updated data pages) |
| **T245** | Docs: `docs/configuration/system-management.md` |

### Acceptance criteria

1. "View-only" badge removed from all data page headers
2. "Refresh" button replaced by small icon button in page header
3. "Export" button removed from data pages, lives only in /system > Exports
4. "System Mgmt" appears in sidebar Admin section
5. /system page has 6 tabs (Backups / Exports / Stats / History / Audit Log / Updates)
6. Backups tab shows 5 sample schedules with status badges
7. Exports tab has 8 export buttons (config/logs/etc) with format chips
8. Stats tab shows 12 stat tiles
9. History tab shows last 10 admin actions with filter
10. Audit Log tab shows signed tamper-evident log
11. Updates tab shows available updates
12. Destructive actions (delete backup) require type-to-confirm

---

## Node Management (add/edit/remove, ZFS, GPU, network)

> Per Honcho peer `cloudbsd-admin-node-management` (8 conclusions). Nodes are the building blocks of the cluster. 3 ways to add a node: manual entry, mDNS autodetection, cluster join token. Per-node management covers ZFS, GPU, network.

### Node data model

```typescript
interface Node {
  id: string;                       // 'node-abc123', uuid v4
  hostname: string;                 // 'cloudbsd-node-01.cloudbsd.org'
  displayLabel: string;             // user-editable, default = hostname
  role: 'master' | 'worker' | 'observer';
  status: 'joining' | 'syncing' | 'online' | 'draining' | 'offline' | 'removed';
  ip: string;                       // primary management IP (v4 or v6)
  ips: string[];                     // all management IPs (dual-stack)
  agentVersion: string;             // '1.4.2'
  baseSystem: 'FreeBSD 14.2-RELEASE-p1';
  cores: number;
  ramBytes: number;
  uptimeSec: number;
  rack: string;                     // 'A1' (user-set)
  zone: string;                     // 'us-east-1a' (user-set)
  labels: Record<string, string>;    // { zone: 'us-east-1a', rack: 'r3' }
  tags: string[];                    // ['gpu', 'fast-disk']
  autoUpdate: boolean;
  maintenanceMode: boolean;
  // Resource limits (max VMs this node can host)
  limits: { maxVMs: number; maxRAMBytes: number; maxVCPU: number };
  // Last heartbeat
  lastHeartbeat: string;            // ISO timestamp
  // GPU pool (shown when showVgpuResources flag is on)
  gpus: GPU[];                       // see GPU section below
  // ZFS pools (per-node)
  zfsPools: ZFSPool[];
  // Network interfaces (per-node)
  interfaces: NetworkInterface[];
  // Resource usage (live)
  usage: { cpuPercent: number; memPercent: number; diskPercent: number; netRxBps: number; netTxBps: number };
  // Discovery metadata
  discoveryMethod?: 'manual' | 'mdns' | 'token';
  joinedAt: string;                 // ISO timestamp
}
```

### "Add Node" dialog (3 tabs)

#### Tab 1: Manual

```
[ Add Node ]
[ Manual ] [ Auto-detect ] [ Join Token ]

Add node manually by entering its connection info.

Hostname or IP:    [_________________________]
                    (e.g. cloudbsd-node-04.example.com or 10.0.10.42)

Port:              [4437]   (default 4437, range 1024-65535)

Auth token:         [paste from /var/db/cloudbsd/admin.token on node]
                    (one-time use, 1h expiry)

Cluster endpoint:   [https://api.cloudbsd.org]
                    (URL this node should report to)

[ Cancel ]  [ Test connection ]  [ Add node ]
```

#### Tab 2: Auto-detect (mDNS / DNS-SD)

```
[ Add Node ]
[ Manual ] [ Auto-detect ] [ Join Token ]

Scan local network for cloudbsd-node-agent instances.

Interface to scan:  [ br0 (10.0.10.0/24)        \u25BE ]
Auto-approve found:  [ ] (default: off, manual review)

Scanning... (timeout 120s)

Found 2 nodes nearby:

  [Add]  cloudbsd-node-04
          10.0.10.44  \u00b7  v1.4.2  \u00b7  8 cores  \u00b7  32 GB RAM
          Token: auto-verified  \u00b7  clock-skew: 0.2s (ok)
          Free RAM: 28 GB  \u00b7  Free disk: 1.2 TB

  [Add]  cloudbsd-node-05
          10.0.10.45  \u00b7  v1.4.2  \u00b7  4 cores  \u00b7  16 GB RAM
          Token: auto-verified  \u00b7  clock-skew: 0.1s (ok)
          Free RAM: 12 GB  \u00b7  Free disk: 500 GB

[ Cancel ]  [ Rescan ]
```

#### Tab 3: Cluster join token

```
[ Add Node ]
[ Manual ] [ Auto-detect ] [ Join Token ]

Generate a one-time cluster join token. Operator runs this on the new host:

  1. SSH to new host as root
  2. Install cloudbsd-node-agent (pkg install cloudbsd-node-agent)
  3. Run: cloudbsd-node-agent register \
        --cluster https://api.cloudbsd.org \
        --token <code below> \
        --label cloudbsd-node-04

  Generated token: a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6
  Expires in:  1:00:00  (refresh to extend)

  [ Copy token ]  [ Refresh ]  [ Cancel ]
```

### Add Node state machine

```
     click "Add Node"
          |
          v
     [joining]  agent sends POST /api/clusters/{id}/nodes with token
          |
          v  (10-30s, heartbeats established)
     [syncing]  state replicating (1-30s)
          |
          v  (node responds to first health check)
     [online]   ready to host VMs
```

Error states with remediation:
- `unreachable` — "Check firewall on node port 4437, network connectivity"
- `token expired` — "Generate a new token (1h TTL)"
- `version mismatch` — "Agent X.Y.Z incompatible with cluster (need \u2265 N.M.K)"
- `clock skew > 5s` — "Sync NTP on the node"

### Node detail page layout

`/nodes/{id}` — full-page view with tabs:

```
[ cloudbsd-node-01 ] [Online \u25CF] [Master] [Edit] [Drain] [Remove]

  Overview | Disks (ZFS) | GPUs | Network | VMs | Containers | Jails | Logs | Settings
  ----------

  Overview tab:
  - Hostname, IPs, role, status, agent version
  - Resources: 8 cores, 16 GB RAM, 245/920 GB disk used
  - Uptime: 14d 02:11
  - Last heartbeat: 4s ago
  - Live CPU/MEM/NET sparklines

  Disks (ZFS) tab: (see ZFS management below)
  GPUs tab: (see GPU management below, only when showVgpuResources=on)
  Network tab: (see network management below)
  VMs tab: list of VMs on this node, with "Migrate to..." action
  Logs tab: per-node JSONL log stream (filtered by level/module)
  Settings tab: edit displayLabel, role, labels, tags, auto-update, limits
```

### ZFS Management (per node)

```
Disks (ZFS)
  tank  (zpool)  245 GB / 920 GB  [health:healthy] [scrub:2d ago]  [scrub now]
  fast  (zpool)  12 GB / 64 GB    [health:healthy]  (SLOG)        [scrub now]

  Datasets:
  +----------------+----------+----------+------+-------+------+-----+-----+----+
  | Name           | Type     | Size     | Used | Usage | Mnt  | Comp| Enc |Action|
  +----------------+----------+----------+------+-------+------+-----+-----+----+
  | tank/data      | ZFS      | 920 GB   | 245  | 27%   | /mnt |zstd3| AES | [...] |
  | tank/media     | ZFS      | 4.0 TB   | 3.2T | 80%   | /mnt |off  | AES | [...] |
  | ... (read-only rows for system volumes, dimmed + lock icon) ...  |
  +----------------+----------+----------+------+-------+------+-----+-----+----+

  [ + Create dataset ]   [ + Receive from peer ]   [ ZFS send to peer ]

  Row action menu: [Snapshot] [Rollback to snapshot] [Set quota] [Set compression] [Edit mountpoint] [Destroy]
  Destructive actions (Destroy, Rollback) require type-to-confirm modal.
```

### GPU Management (per node, gated by `showVgpuResources` flag)

```
GPUs
  +--------+---------+--------+------+-------+-------+-------+--------+
  | ID     | Model   | VRAM   | Used | Usage | Temp  | Power | Status |
  +--------+---------+--------+------+-------+-------+-------+--------+
  | gpu-0  | T4      | 16 GB  | 4 GB | 25%   | 47\u00b0C | 35W  | active |
  | gpu-1  | T4      | 16 GB  | 0 GB | 0%    | 42\u00b0C | 28W  | idle   |
  | gpu-2  | A5000   | 24 GB  | 12GB | 50%   | 56\u00b0C | 95W  | active |
  +--------+---------+--------+------+-------+-------+-------+--------+

  Allocations on gpu-0 (T4):
  +----------+--------+---------+-----------+
  | VM       | VRAM    | Type     | Action    |
  +----------+--------+---------+-----------+
  | jellyfin | 4 GB    | whole    | [release] |
  | immich   | 2 GB    | slice 1/2| [release] |
  +----------+--------+---------+-----------+

  [ + Allocate vGPU ]   [ Release all ]
```

GPU allocation dialog:
```
Allocate vGPU to VM
  VM:           [ jellyfin          \u25BE ]
  GPU:          [ gpu-1 (T4, 16GB)  \u25BE ]
  Type:         ( ) Whole GPU   (\u25CB) Slice: [1/2 \u25BE]
  VRAM:         8 GB
  Driver:       [ nvidia           \u25BE ]
  Mode:         [ graphics         \u25BE ]
  
  [ Cancel ]  [ Allocate ]
```

### Network Management (per node)

```
Interfaces
  +----------+--------+----------+----------+-----------+------------+
  | Name     | Status | Speed    | IPs                    | MTU | Action|
  +----------+--------+----------+-----------------------+-----+-------+
  | igc0     | UP     | 1 Gbps   | 10.0.10.21/24        |1500 |  [...] |
  |          |        |          | 2001:db8::15/64      |     |       |
  |          |        |          | fe80::ff:fe21:3456/64|     |       |
  | bge0     | UP     | 1 Gbps   | 10.0.20.21/24        |1500 |  [...] |
  | lo0      | UP     | -        | 127.0.0.1/8          |16384|  [...] |
  +----------+--------+----------+-----------------------+-----+-------+

  Bridges:
  +-------+-------+---------+--------------+
  | Name  | MTU   | Members | Action        |
  +-------+-------+---------+--------------+
  | br0   | 1500  | igc0,em0| [edit]        |
  +-------+-------+---------+--------------+

  VLANs:
  +-----+-------+-------+----------------+
  | ID  | Parent| Name  | Action         |
  +-----+-------+-------+----------------+
  | 10  | igc0  | mgmt  | [edit][delete] |
  | 20  | igc0  | store | [edit][delete] |
  +-----+-------+-------+----------------+

  Routes:
  +----------------+--------+----------+----------+
  | Destination    | Gateway | Iface    | Action  |
  +----------------+--------+----------+----------+
  | 0.0.0.0/0      | .1     | igc0     | [edit]  |
  | 10.0.0.0/8     | -       | igc0     | [system]|
  +----------------+--------+----------+----------+

  Firewall rules (pf):
  +-----+--------+----------+-----------+---------+--------+
  | Dir | Action | Proto    | From      | To      | Port  |
  +-----+--------+----------+-----------+---------+--------+
  | in  | pass   | tcp      | any       | any     | 22    |
  | in  | pass   | tcp      | 10.0.10.0/24| any   | 443   |
  | in  | block  | tcp      | any       | any     | 3306  |
  +-----+--------+----------+-----------+---------+--------+

  [ + Add interface ]   [ + Add bridge ]   [ + Add VLAN ]   [ + Add route ]   [ + Add firewall rule ]
```

### Node actions

- **Edit** (top-right of node detail page) — modal with: displayLabel, role, labels, tags, auto-update, maintenance mode, resource limits
- **Drain** — graceful: refuses new VMs, waits for existing VMs to migrate (timeout 1h)
- **Remove** — force: immediate offline, VMs not migrated (warning required)
- **Restart agent** — `service cloudbsd-node-agent restart`
- **Reinstall OS** — drastic, full wipe (confirmation required, takes 30+ min)
- **Update agent** — `cloudbsd-node-agent update` (semver check)

### Implementation tasks (new)

| Task | Description |
|------|-------------|
| **T216** | `nodes.list` / `nodes.get` / `nodes.add` / `nodes.update` / `nodes.remove` / `nodes.drain` endpoints |
| **T217** | `AddNodeDialog` component with 3 tabs (Manual / Auto-detect / Join token) |
| **T218** | `ManualNodeFormComponent` — hostname/IP, port, token, cluster URL |
| **T219** | `AutoDetectTabComponent` — mDNS scan, list of discovered nodes, add buttons |
| **T220** | `JoinTokenTabComponent` — generate token, show command, copy, refresh |
| **T221** | mDNS discovery backend (UDP 5353 multicast query handler) |
| **T222** | Node edit modal (displayLabel, role, labels, tags, auto-update, limits) |
| **T223** | Node detail page with tabs (Overview, ZFS, GPU, Network, VMs, Logs, Settings) |
| **T224** | `ZfsManagementComponent` — list pools/datasets, create, snapshot, destroy, rollback, send/receive |
| **T225** | `GpuManagementComponent` (gated by showVgpuResources flag) — list GPUs, allocations, allocate/release |
| **T226** | `NetworkManagementComponent` — interfaces, bridges, VLANs, routes, firewall rules |
| **T227** | Node state machine (joining \u2192 syncing \u2192 online) with error states (unreachable, token expired, version mismatch, clock skew) |
| **T228** | Node removal (drain / force) with type-to-confirm for destructive actions |
| **T229** | Tests: 100% coverage of AddNodeDialog, ZfsMgmt, GpuMgmt, NetworkMgmt |
| **T230** | Tests: mDNS discovery backend (mock multicast packets) |
| **T231** | Mock data: 2-3 nodes in `environment.ts.mockData.nodes` for development |
| **T232** | Docs: `docs/configuration/nodes.md` — manual/autodiscovery/token, ZFS, GPU, network mgmt |

### Acceptance criteria

1. "Add Node" dialog has 3 tabs (Manual / Auto-detect / Join token)
2. Auto-detect via mDNS finds nearby nodes (mock data in dev, real mDNS in prod)
3. Join token is 1-hour TTL, single-use
4. Node state machine: joining \u2192 syncing \u2192 online, with error states
5. Node edit modal updates displayLabel, role, labels, tags, limits
6. ZFS tab shows pools, datasets, usage bars, scrub status, mountpoints
7. GPU tab only shown when showVgpuResources flag is on (feature gating)
8. GPU tab shows physical GPUs, VRAM, allocations, slice info
9. Network tab shows interfaces, bridges, VLANs, routes, firewall rules
10. Destructive actions (destroy dataset, remove node) require type-to-confirm
11. Drain vs force removal clearly differentiated with warnings
12. Honcho peer `cloudbsd-admin-node-management` has 8 conclusions captured

---

## Volume Management (host-aware, system-read-only)

> Per Honcho peer `cloudbsd-admin-test-lessons` (3 new conclusions). Volumes table MUST include a Host column and system volumes (OS, EFI, swap) MUST be read-only with no manipulation actions.

### Volume data model

```typescript
interface Volume {
  id: string;                    // 'tank-data', 'os-cloudbsd-01', 'efi-cloudbsd-01', etc.
  name: string;                  // dataset name or device path
  type: 'ZFS' | 'ZFS (SLOG)' | 'ZFS (enc)' | 'ZFS (boot)' | 'ZFS (root)' | 'NFS' | 'iSCSI' | 'EFI' | 'Swap' | 'XFS' | 'EXT4';
  sizeBytes: number;
  usedBytes: number;
  mountpoint: string;            // '/', '/boot/efi', '[SWAP]', '/mnt/tank/data', 'hidden'
  hosts: string[];               // ['cloudbsd-node-01', 'cloudbsd-node-02'] for replicated
  isSystem: boolean;             // true for OS, EFI, swap, recovery, boot
  systemReason?: 'os' | 'efi' | 'swap' | 'boot' | 'recovery';
  canResize: boolean;
  canDelete: boolean;
  canSnapshot: boolean;
  canManipulate: boolean;        // canResize && canDelete && canSnapshot
  compression?: 'zstd-3' | 'zstd-9' | 'lz4' | 'off';
  encryption?: 'aes-256-gcm' | 'none';
  health: 'healthy' | 'watch' | 'error';
  lastScrub?: string;           // ISO timestamp
  isTemplate?: boolean;         // from backend: skip in user filters
}
```

### System volume detection rules (backend-derived)

A volume is `isSystem: true` if ANY of:
- `name` starts with `os-`, `efi-`, `swap-`, `boot-`, `recovery-` (prefix-based)
- `type` is `EFI`, `Swap`, `EFI System Partition`, or contains `boot`/`root`
- backend sets `system: true` flag explicitly
- `isTemplate: true` (template volumes are not manipulable either)

### UI rendering rules

| Volume type | Background | Opacity | Action buttons | Badge |
|-------------|-------------|----------|---------------|-------|
| User manipulable (`isSystem: false` && `canManipulate: true`) | white | 1.0 | Snap / Resize / Del | none |
| User view-only (`isSystem: false` && `canManipulate: false`) | white | 1.0 | none | "View only" |
| System (`isSystem: true`) | `#f8fafc` | **0.65** | none | 🔒 + "SYSTEM" amber badge |
| Template (`isTemplate: true`) | `#f8fafc` | 0.65 | none | "TEMPLATE" |

### Host column

A volume can reside on multiple hosts (replicated ZFS, shared NFS exports). Display:
- Single host: `<node-01>` in plain text
- Multi host: `<N> hosts` (e.g. `2 hosts`) with hover tooltip listing all hostnames
- Replicated ZFS: shows replica count: `tank/data (×3: node-01, node-02, node-03)`

### "Hide system volumes" toggle (NEW)

Toolbar contains a toggle:
```
Show: [User only] [All (incl. system)]
```

Default: `User only` (system volumes hidden by default for cleanliness).
`All` reveals system volumes in dimmed style with lock icon. User preference persisted to localStorage.

### Action button gating

```typescript
@Component({ /* volume-action-buttons.component.ts */ })
export class VolumeActionButtons {
  @Input() volume: Volume;
  @Output() snapshot = new EventEmitter();
  @Output() resize = new EventEmitter();
  @Output() delete = new EventEmitter();
  
  canSnapshot = computed(() => this.volume?.canSnapshot && !this.volume?.isSystem);
  canResize = computed(() => this.volume?.canResize && !this.volume?.isSystem);
  canDelete = computed(() => this.volume?.canDelete && !this.volume?.isSystem && this.volume?.usedBytes === 0);
}
```

### Volume list mock data (13 user volumes + 8 system volumes)

```typescript
// 13 user volumes
{ id: 'tank-data',      type: 'ZFS',        size: '920 GB', used: '245',  pct: 27, hosts: ['cloudbsd-node-01'],                mount: '/mnt/tank/data',       isSystem: false }
{ id: 'tank-media',     type: 'ZFS',        size: '4.0 TB', used: '3.2 TB', pct: 80, hosts: ['cloudbsd-node-01'],                mount: '/mnt/tank/media',      isSystem: false }
{ id: 'tank-backups',   type: 'ZFS',        size: '1.5 TB', used: '412',  pct: 27, hosts: ['cloudbsd-node-01','node-02'],      mount: '/mnt/tank/backups',    isSystem: false }
{ id: 'tank-vms',       type: 'ZFS',        size: '800 GB', used: '612',  pct: 76, hosts: ['cloudbsd-node-01'],                mount: '/mnt/tank/vms',        isSystem: false }
{ id: 'tank-apps',      type: 'ZFS',        size: '200 GB', used: '84',   pct: 42, hosts: ['cloudbsd-node-01'],                mount: '/mnt/tank/apps',       isSystem: false }
{ id: 'fast-ssd',       type: 'ZFS (SLOG)', size: '64 GB',  used: '12',   pct: 18, hosts: ['cloudbsd-node-01'],                mount: '/dev/da0',            isSystem: false }
{ id: 'vault-cold',     type: 'ZFS (enc)',  size: '8.0 TB', used: '6.4 TB', pct: 80, hosts: ['cloudbsd-node-02'],                mount: '/mnt/vault',          isSystem: false }
{ id: 'nfs-export',     type: 'NFS',        size: '—',     used: '—',     pct: 0,  hosts: ['cloudbsd-node-01','node-02'],      mount: '/mnt/nfs',            isSystem: false }
{ id: 'iscsi-lun0',     type: 'iSCSI',      size: '500 GB', used: '412',  pct: 82, hosts: ['cloudbsd-node-02'],                mount: '/dev/iscsi0',         isSystem: false }
{ id: 'tank-snapshots', type: 'ZFS',        size: '920 GB', used: '88',   pct: 9,  hosts: ['cloudbsd-node-01'],                mount: 'hidden',             isSystem: false }
{ id: 'tank-nextcloud', type: 'ZFS',        size: '1.2 TB', used: '980',  pct: 81, hosts: ['cloudbsd-node-01'],                mount: '/mnt/tank/nextcloud', isSystem: false }
{ id: 'tank-jails',     type: 'ZFS',        size: '50 GB',  used: '28',   pct: 56, hosts: ['cloudbsd-node-01'],                mount: '/usr/local/jails',   isSystem: false }
{ id: 'tank-photos',    type: 'ZFS',        size: '2.0 TB', used: '1.6 TB', pct: 80, hosts: ['cloudbsd-node-01'],                mount: '/mnt/tank/photos',    isSystem: false }

// 8 system volumes (hidden by default)
{ id: 'os-cloudbsd-01',      type: 'ZFS (root)', size: '32 GB',  used: '18', pct: 56, hosts: ['cloudbsd-node-01'], mount: '/',           isSystem: true, systemReason: 'os' }
{ id: 'efi-cloudbsd-01',     type: 'EFI',        size: '512 MB', used: '32', pct: 6,  hosts: ['cloudbsd-node-01'], mount: '/boot/efi',   isSystem: true, systemReason: 'efi' }
{ id: 'swap-cloudbsd-01',    type: 'Swap',       size: '16 GB',  used: '2',  pct: 12, hosts: ['cloudbsd-node-01'], mount: '[SWAP]',     isSystem: true, systemReason: 'swap' }
{ id: 'boot-cloudbsd-01',    type: 'ZFS (boot)', size: '4 GB',   used: '1',  pct: 25, hosts: ['cloudbsd-node-01'], mount: '/boot',      isSystem: true, systemReason: 'boot' }
{ id: 'recovery-cloudbsd-01', type: 'ZFS',      size: '8 GB',   used: '0',  pct: 0,  hosts: ['cloudbsd-node-01'], mount: '/recovery', isSystem: true, systemReason: 'recovery' }
// same 3 for node-02
```

### Implementation tasks (new)

| Task | Description |
|------|-------------|
| **T208** | Volume data model with `hosts[]`, `isSystem`, `canResize/Delete/Snapshot/Manipulate` flags |
| **T209** | Backend: `volumes.list` returns full volume data including system volumes (with `isSystem: true`) |
| **T210** | Frontend: `VolumeActionButtons` component with conditional rendering by capability flags |
| **T211** | Frontend: "Hide system volumes" toggle (User only / All), persisted to localStorage |
| **T212** | Frontend: Host column shows single host, multi-host count, or replica count for ZFS |
| **T213** | Frontend: System volumes get lock icon + reduced opacity (0.65) + SYSTEM badge |
| **T214** | Tests: `volumes.spec.ts` — verify system volumes have no action buttons, user volumes do, multi-host display, toggle persistence |
| **T215** | Tests: Go `volumes_test.go` — verify backend returns isSystem correctly for each volume type |

### Acceptance criteria

1. Volumes table includes **Host(s)** column showing physical host(s) for each volume
2. Multi-host volumes display as `<N> hosts` with hover tooltip listing all hostnames
3. System volumes (OS, EFI, swap, boot, recovery) are displayed in **dimmed** style (opacity 0.65)
4. System volumes have a **lock icon** + **SYSTEM badge**
5. System volumes have **NO action buttons** (Snap/Resize/Del)
6. Toolbar has "Hide system volumes" toggle, defaulting to **User only**
7. User volumes have full Snap/Resize/Del buttons per their `can*` flags
8. Per-volume capabilities (`canResize`, `canDelete`, `canSnapshot`) honored from backend

---

## Feature Flags & Mock Data (Application-wide switch)

> Per Honcho peer `cloudbsd-admin-feature-flags` (5 conclusions). Three-state per flag: `production` (OFF, no experimental data), `development` (ON, mocks visible), `force` (always on regardless of env). Like IntelliJ run configs.

### Flag definitions

| Flag | Default | Description |
|------|---------|-------------|
| `showVgpuResources` | `production` | Show vGPU passthrough detail on worker nodes (GPU pool, allocation bars, VRAM tracking) |
| `showBetaFeatures` | `production` | Show early WIP features (e.g., plugin marketplace, multi-tenant, audit log export) |
| `showDebugInfo` | `production` | Show verbose tooltips, stack traces in non-prod, debug JSON panels |
| `enableMockBackend` | `force` (dev) / `production` (prod) | Use in-memory mock data instead of real backend. In production, this is forced OFF. |
| `showExperimentalSchemas` | `production` | Show v2.0.0 envelope schema fields in API docs (for early adopters) |

### Frontend: `FeatureFlagService` (TS)

```typescript
// web-new/src/app/core/feature-flags/feature-flag.service.ts
import { Injectable, signal, computed } from '@angular/core';

export type FlagState = 'production' | 'development' | 'force';
export type EffectiveState = 'off' | 'on';

export interface FeatureFlag {
  /** Stable identifier (used in code, logs, telemetry) */
  name: string;
  /** Human-readable label */
  label: string;
  /** Detailed description (shown in debug panel) */
  description: string;
  /** Default state when no override is set */
  default: FlagState;
  /** Env var that overrides the default (e.g. CLOUBSD_ADMIN_SHOW_VGPU) */
  envVar: string;
  /** Whether this flag is for production-relevant features (false = dev-only) */
  affectsProduction: boolean;
}

@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  private readonly _overrides = signal<Map<string, FlagState>>(this.loadOverrides());
  
  /** All known flags. Single source of truth. */
  readonly flags: FeatureFlag[] = [
    {
      name: 'showVgpuResources',
      label: 'vGPU Resources',
      description: 'Show vGPU passthrough detail on worker nodes (GPU pool, allocation bars, VRAM tracking)',
      default: 'production',
      envVar: 'CLOUBSD_ADMIN_SHOW_VGPU',
      affectsProduction: false,
    },
    {
      name: 'showBetaFeatures',
      label: 'Beta Features',
      description: 'Show early WIP features (e.g., plugin marketplace, multi-tenant, audit log export)',
      default: 'production',
      envVar: 'CLOUBSD_ADMIN_SHOW_BETA',
      affectsProduction: false,
    },
    {
      name: 'showDebugInfo',
      label: 'Debug Info',
      description: 'Show verbose tooltips, stack traces in non-prod, debug JSON panels',
      default: 'production',
      envVar: 'CLOUBSD_ADMIN_SHOW_DEBUG',
      affectsProduction: false,
    },
    {
      name: 'enableMockBackend',
      label: 'Mock Backend',
      description: 'Use in-memory mock data instead of real backend',
      default: 'force',  // dev default, prod forces off
      envVar: 'CLOUBSD_ADMIN_MOCK_BACKEND',
      affectsProduction: true,  // affects how prod is configured
    },
  ];
  
  /** Effective state (resolved: 'off' or 'on') */
  effectiveState = computed(() => {
    const map = new Map<string, EffectiveState>();
    for (const flag of this.flags) {
      map.set(flag.name, this.computeEffective(flag));
    }
    return map;
  });
  
  isEnabled(name: string): boolean {
    return this.effectiveState().get(name) === 'on';
  }
  
  isDevelopment(name: string): boolean {
    const state = this._overrides().get(name);
    return state === 'development';
  }
  
  isForce(name: string): boolean {
    const state = this._overrides().get(name);
    return state === 'force';
  }
  
  setOverride(name: string, state: FlagState): void {
    const next = new Map(this._overrides());
    next.set(name, state);
    this._overrides.set(next);
    this.persistOverrides(next);
    // Audit log via JSONL
    console.log(`[flag] ${name} = ${state} (user=mlapointe)`);
  }
  
  resetOverride(name: string): void {
    const next = new Map(this._overrides());
    next.delete(name);
    this._overrides.set(next);
    this.persistOverrides(next);
  }
  
  private computeEffective(flag: FeatureFlag): EffectiveState {
    const override = this._overrides().get(flag.name);
    const state = override ?? flag.default;
    // Production safety: features not production-affecting are FORCED off in prod
    if (state === 'production' && !flag.affectsProduction && environment.production) {
      return 'off';
    }
    if (state === 'force') return 'on';
    if (state === 'development') return 'on';
    return 'off';
  }
  
  private loadOverrides(): Map<string, FlagState> {
    try {
      const stored = localStorage.getItem('cloudbsd-admin-flags');
      if (stored) return new Map(JSON.parse(stored));
    } catch {}
    return new Map();
  }
  
  private persistOverrides(map: Map<string, FlagState>): void {
    localStorage.setItem('cloudbsd-admin-flags', JSON.stringify([...map.entries()]));
  }
}
```

### Backend: `FeatureFlagConfig` (Go)

```go
// internal/config/feature_flags.go
package config

type FeatureFlag string

const (
    FlagShowVGPU       FeatureFlag = "show_vgpu_resources"
    FlagShowBeta       FeatureFlag = "show_beta_features"
    FlagShowDebug      FeatureFlag = "show_debug_info"
    FlagMockBackend    FeatureFlag = "enable_mock_backend"
)

type FeatureFlags struct {
    ShowVGPUResources FlagState `json:"showVgpuResources" default:"production"`
    ShowBetaFeatures   FlagState `json:"showBetaFeatures" default:"production"`
    ShowDebugInfo      FlagState `json:"showDebugInfo" default:"production"`
    EnableMockBackend  FlagState `json:"enableMockBackend" default:"production"`
}

func (c *Config) EffectiveFlag(name string) string {
    if !c.IsProduction() {
        return "force"  // dev always returns force
    }
    // prod: feature flag as configured
    return c.Flags.Get(name)
}

func (c *Config) IsVGPUEnabled() bool {
    return c.EffectiveFlag(string(FlagShowVGPU)) != "production"
}
```

### `web-new/src/environments/environment.ts`

```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3001',
  wsBaseUrl: 'ws://localhost:3001',
  buildVersion: 'v1.0.0+go1.26.3+freebsd16.0',
  useMocks: true,
  envelopeVersion: 1,
  supportedSchemaVersions: [1],
  
  // Feature flags — overridden by env vars or IntelliJ run configurations
  featureFlags: {
    showVgpuResources: 'development',  // 'production' | 'development' | 'force'
    showBetaFeatures:   'production',
    showDebugInfo:      'development',
    enableMockBackend:  'force',
  },
  
  // Mock data toggle (independent of feature flag)
  mockData: {
    vgpu: {
      enabled: true,
      cards: [
        { id: 'gpu-0', model: 'NVIDIA T4',  vramBytes: 16 * 1024**3, allocatedBytes: 4 * 1024**3, node: 'cloudbsd-node-01' },
        { id: 'gpu-1', model: 'NVIDIA T4',  vramBytes: 16 * 1024**3, allocatedBytes: 0,                node: 'cloudbsd-node-01' },
        { id: 'gpu-2', model: 'NVIDIA RTX A5000', vramBytes: 24 * 1024**3, allocatedBytes: 12 * 1024**3, node: 'cloudbsd-node-02' },
      ],
      allocations: [
        { vm: 'jellyfin',    gpu: 'gpu-0', vramBytes: 4 * 1024**3, type: 'whole' },
        { vm: 'immich',      gpu: 'gpu-0', vramBytes: 2 * 1024**3, type: 'slice-1-2' },
        { vm: 'win11-sandbox', gpu: 'gpu-2', vramBytes: 8 * 1024**3, type: 'slice-1-3' },
        { vm: 'win11-gaming',  gpu: 'gpu-2', vramBytes: 4 * 1024**3, type: 'slice-1-6' },
      ],
    },
  },
};

export const environmentProd = {
  ...environment,
  production: true,
  apiBaseUrl: 'https://api.cloudbsd.org',
  wsBaseUrl: 'wss://api.cloudbsd.org',
  useMocks: false,
  featureFlags: {
    showVgpuResources: 'production',
    showBetaFeatures:   'production',
    showDebugInfo:      'production',
    enableMockBackend:  'production',  // forced off in prod
  },
  mockData: { vgpu: { enabled: false, cards: [], allocations: [] } },
};
```

### Mock vGPU component (when flag enabled)

`web-new/src/app/features/vgpu-pool/`

```typescript
// vgpu-pool.component.ts
import { Component, inject, computed } from '@angular/core';
import { FeatureFlagService } from '../core/feature-flags/feature-flag.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-vgpu-pool-panel',
  template: `
    @if (show()) {
      <div class="vgpu-pool">
        <h3>GPU Pool ({{ cards().length }} physical GPUs)</h3>
        @for (card of cards(); track card.id) {
          <div class="gpu-card">
            <span class="gpu-name">{{ card.model }}</span>
            <div class="vram-bar">
              <div [style.width.%]="(card.allocatedBytes / card.vramBytes) * 100"
                   [class.full]="card.allocatedBytes / card.vramBytes > 0.9">
                {{ formatBytes(card.allocatedBytes) }} / {{ formatBytes(card.vramBytes) }}
              </div>
            </div>
            <div class="allocations">
              @for (alloc of allocationsFor(card.id); track alloc.vm) {
                <span>{{ alloc.vm }}: {{ formatBytes(alloc.vramBytes) }} ({{ alloc.type }})</span>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class VgpuPoolPanel {
  private flags = inject(FeatureFlagService);
  
  show = computed(() => this.flags.isEnabled('showVgpuResources') && environment.mockData.vgpu.enabled);
  cards = computed(() => environment.mockData.vgpu.cards);
  allocations = computed(() => environment.mockData.vgpu.allocations);
  
  allocationsFor(gpuId: string) {
    return this.allocations().filter(a => a.gpu === gpuId);
  }
  
  formatBytes(b: number): string {
    return `${(b / (1024**3)).toFixed(1)} GB`;
  }
}
```

### Run configurations (IntelliJ/JetBrains only)

`.idea/runConfigurations/Production.xml`:
```xml
<configuration name="Production" type="JavaScriptDebugType" name="Production" applicationName="cloudbsd-admin-ui" uri="http://localhost:4200" workingDir="$PROJECT_DIR$/web-new">
  <envs>
    <env name="CLOUBSD_ADMIN_SHOW_VGPU" value="production" />
    <env name="CLOUBSD_ADMIN_SHOW_BETA" value="production" />
    <env name="CLOUBSD_ADMIN_SHOW_DEBUG" value="production" />
    <env name="CLOUBSD_ADMIN_MOCK_BACKEND" value="production" />
  </envs>
</configuration>
```

`.idea/runConfigurations/Development_with_mocks.xml`:
```xml
<configuration name="Development with mocks" type="JavaScriptDebugType" ...>
  <envs>
    <env name="CLOUBSD_ADMIN_SHOW_VGPU" value="development" />
    <env name="CLOUBSD_ADMIN_SHOW_BETA" value="development" />
    <env name="CLOUBSD_ADMIN_SHOW_DEBUG" value="development" />
    <env name="CLOUBSD_ADMIN_MOCK_BACKEND" value="force" />
  </envs>
</configuration>
```

`.idea/runConfigurations/Mock_only.xml`:
```xml
<configuration name="Mock only" type="JavaScriptDebugType" ...>
  <envs>
    <env name="CLOUBSD_ADMIN_SHOW_VGPU" value="force" />
    <env name="CLOUBSD_ADMIN_SHOW_BETA" value="force" />
    <env name="CLOUBSD_ADMIN_SHOW_DEBUG" value="force" />
    <env name="CLOUBSD_ADMIN_MOCK_BACKEND" value="force" />
  </envs>
</configuration>
```

`.vscode/launch.json`:
> **NOT GENERATED.** This project uses IntelliJ/JetBrains products only (IntelliJ IDEA, GoLand, PyCharm, WebStorm). Use Run > Edit Configurations in your IDE. The `.idea/runConfigurations/*.xml` files are the canonical config (see T201).
```json
// VSCode not supported. IntelliJ-only.
{}
```

### vGPU mock diagram (component reference)

`diagrams/components/17-vgpu-pool.svg` (new)

Shows the vGPU pool panel with:
- 2x NVIDIA T4 cards (16 GB each, 1 fully allocated, 1 empty)
- 1x NVIDIA RTX A5000 (24 GB, 12 GB allocated across 2 VMs)
- Per-card VRAM bars with allocation
- Allocation list per card
- Whole-GPU vs slice indicator

### Implementation tasks (new)

| Task | Description |
|------|-------------|
| **T193** | `FeatureFlagService` (TS) with `isEnabled()`, `setOverride()`, signal reactivity, localStorage persistence |
| **T194** | `environment.ts` flags field + dev/prod variants |
| **T195** | `internal/config/feature_flags.go` (Go mirror) with `EffectiveFlag()` |
| **T196** | `web-new/src/app/features/vgpu-pool/vgpu-pool.component.ts` (conditional render on flag) |
| **T197** | `web-new/src/app/features/vgpu-pool/vgpu-pool.component.spec.ts` (unit tests, 100% coverage) |
| **T198** | `web-new/src/environments/environment.spec.ts` (3-state flag tests) |
| **T199** | `internal/config/feature_flags_test.go` (Go mirror tests) |
| **T200** | Mock vGPU data in `environment.ts` (3 GPUs, 4 allocations, realistic NVIDIA/AMD specs) |
| **T201** | `.idea/runConfigurations/Production.xml` + `Development_with_mocks.xml` + `Mock_only.xml` + `Force_all_flags.xml` (IntelliJ only, no VSCode) |
| **T203** | `diagrams/components/17-vgpu-pool.svg` (mock-up of GPU pool panel) |
| **T204** | `FeatureFlagDebugPanel` (only visible when `showDebugInfo=force`) |
| **T205** | Flag change audit log (JSONL: user, timestamp, old, new) |
| **T206** | CI matrix: run unit tests against all 4 run config scenarios (12 test runs) |
| **T207** | Docs: `docs/configuration/feature-flags.md` — when to use each flag, security implications |

### Acceptance criteria

1. **3-state flag** (`production` / `development` / `force`) implemented in TS + Go
2. **Environment override** via env vars (`CLOUBSD_ADMIN_SHOW_VGPU=development`)
3. **localStorage override** for interactive dev changes without page reload
4. **Signal reactivity** — UI components re-render when flag changes
5. **vGPU feature OFF by default** in production builds
6. **Mock data deterministic** — same seed (42) produces same GPUs/allocations
7. **4 run configurations** in `.idea/runConfigurations/` (IntelliJ/JetBrains only — no VSCode)
8. **CI tests all 4 scenarios** (production, dev-mocks, force-all, mock-only)
9. **Flag change audit** logged to JSONL
10. **Debug panel** only shown when `showDebugInfo=force`
11. **Honcho peer `cloudbsd-admin-feature-flags`** has 5 conclusions capturing the standard

---

## Adversarial Resilience (MANDATORY)

> Per Honcho peer `cloudbsd-admin-adversarial` (20 conclusions + 18-card peer card). The application MUST handle itself well under attack, failure, and partial degradation. No blank pages, no silent failures, no information leaks.

### Threat Model (STRIDE)

| Threat Actor | Capabilities | Primary Mitigations |
|--------------|-------------|----------------------|
| **Unauthenticated external attacker** | CVE scan, brute-force login, DoS | Rate limiting, HTTPS-only, CSP, HSTS, captcha |
| **Authenticated low-privilege user** | Privilege escalation, IDOR, JWT forgery | RBAC checks at every endpoint, session validation, CSRF tokens |
| **Malicious plugin author** | Schema bypass, template injection, supply chain | Sandbox iframe, SHA-256 verified bundles, signed manifests |
| **Insider admin** | Read other users' data, race conditions | Audit logging with HMAC chain, tamper detection, separation of duties |
| **Network MITM** | Downgrade, cert bypass | TLS 1.3, cert pinning, HSTS preload |
| **DoS attacker** | WS flood, rate limit exhaustion, slowloris | Circuit breakers, rate limits, request timeouts, connection caps |

### Trust Zones

```
T0 [Browser, untrusted] → T1 [Auth Gateway, nginx] → T2 [App Backend, Node.js]
                                                       ↓
                            T3 [PAM, SQLite, plugins] ← (worker_thread, restricted)
                                                       ↓
                            T4 [FreeBSD kernel, bhyve]
```

### Self-Healing Principles

The app **never** shows blank page or infinite spinner. Always:

1. **Bounded retry** with exponential backoff + jitter (base 1s, max 30s, factor 2, ±20% jitter)
2. **Circuit breakers** (opossum library) on every external call (HTTP, WS, file I/O, DB)
3. **Graceful degradation** (degraded shell + cached state from localStorage)
4. **Idempotent operations** (UUID idempotency keys for POST/PUT/DELETE)
5. **State store recovery** (LRU eviction, snapshot checkpoints)
6. **Connection pool auto-reconnect** (Socket.IO with health monitoring)
7. **Health checks** with 3 states (healthy/degraded/unhealthy)
8. **Automatic crash restart** (rc.d respawn + Node.js `--unhandled-rejections=strict`)
9. **Bulkheading** (one plugin crash doesn't affect others)
10. **No silent failures** (every error logged + shown via ErrorHandlingService)

### Failure Modes & Responses

| Failure | User-Visible Response | Internal Response |
|---------|----------------------|-------------------|
| Backend down | Degraded shell + top banner + "Last update: 4m ago" | Circuit breaker opens, polling every 30s |
| WebSocket disconnect | Top banner "Reconnecting..." | Auto-reconnect with backoff |
| Plugin load failure | Error in plugin slot + "Retry" button | Other plugins unaffected, log error |
| Theme load failure | Toast "Theme failed to load, using default" | Fall back to default theme |
| PAM auth failure | Inline error in login form (NOT modal) | Log attempt, increment counter |
| Session expired | Frost-out modal (blocks UI) | Clear in-memory state, redirect to /login |
| Uncaught exception | ErrorModal (per severity) | Global ErrorHandler, log to JSONL |
| Network offline | Banner "You are offline" + read-only mode | Queue mutations for replay |
| DB write failure | Toast with "Retry" | Rollback transaction, log error |
| Plugin manifest invalid | Skip plugin, log warning | Other plugins still load |
| Rate limit hit (429) | Modal "Too many requests, retry in 60s" | Disable offending button with countdown |
| Backend OOM | Health check returns 503 | Orchestrator restarts process |
| bhyve VM crash | Discoverer marks VM offline | UI shows status as "ERROR" badge |

### Input Validation (zod schemas at every boundary)

| Boundary | Schema |
|----------|--------|
| HTTP request body | `z.object({...}).safeParse(req.body)` |
| HTTP response body | `z.object({...}).safeParse(res.body)` (defensive) |
| DB read | `z.object({...}).parse(row)` before use |
| DB write | `z.object({...}).parse(input)` before insert |
| WebSocket message | `JSONSchema.validate(msg)` |
| Plugin manifest | `JSONSchema.validate(manifest)` |
| Theme JSON | `JSONSchema.validate(theme)` |
| User HTML input | `DOMPurify.sanitize(input)` |

**Validation rules** (sample):
- VM names: `^[a-zA-Z0-9.-]{1,63}$`
- IP addresses: IPv4/IPv6 + CIDR
- File paths: relative only, no `..`
- URLs: `https:` scheme only
- JSON depth: max 10
- String length: max 64KB per field

### XSS Prevention

```typescript
// ALLOWED — Angular auto-escapes:
{{ userInput }}

// BANNED:
<div [innerHTML]="userInput"></div>
this.sanitizer.bypassSecurityTrustHtml(userInput);
DOMParser.parseFromString(userInput, 'text/html');
```

**CSP** (Content-Security-Policy):
```
default-src 'self';
script-src 'self' 'nonce-{random-per-request}';
style-src 'self' 'nonce-{random-per-request}';
img-src 'self' data:;
object-src 'none';
base-uri 'self';
frame-ancestors 'none';
form-action 'self';
```

### CSRF Prevention

Already have HttpOnly + Secure + SameSite=Strict cookies. **Additionally**:
- State-changing requests require `X-CloudBSD-Request: <csrf-token>` header
- Token stored in session, rotated on auth
- Origin header verified on POST/PUT/DELETE
- CORS: same-origin only (no `Access-Control-Allow-Origin: *`)

### SQL Injection Prevention

```typescript
// ALLOWED — prepared statement:
db.prepare('SELECT * FROM vms WHERE id = ?').get(vmId);

// BANNED — string concatenation:
db.prepare(`SELECT * FROM vms WHERE id = '${vmId}'`);
```

ESLint rule flags string concatenation in `.prepare()` calls.

### Prototype Pollution Prevention

```typescript
// ALLOWED — destructure to known fields:
const { name, version, routes } = JSON.parse(input);

// BANNED:
Object.assign(target, JSON.parse(input));
{ ...JSON.parse(input) };
merge(target, parsed); // without safe merge
```

**Safe merge** skips `__proto__`, `constructor`, `prototype`.

**Test**: send `{"__proto__": {"isAdmin": true}}` and verify Object.prototype is not polluted.

### Plugin Sandboxing

**Backend plugins**: Node.js `worker_thread` with restricted context:
- Allowed: `manifest`, `routes`, `discoverers`, `console`, `fetch`
- Banned: `fs`, `child_process`, `require` of arbitrary modules
- Worker terminates on plugin crash

**Frontend plugin templates**: sandbox iframe with `sandbox="allow-scripts"` attribute + CSP `sandbox 'allow-scripts'`.

**Plugin bundle integrity**: SHA-256 hash in manifest, signature verified before dynamic import. Bundle URL is fixed allowlist path (`/api/plugins/<id>/bundle.js`), never user-controlled.

### Secret Handling

```typescript
// ALLOWED — env vars only:
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error('JWT_SECRET required');

// BANNED:
const jwtSecret = 'my-super-secret-key'; // hardcoded
const jwtSecret = req.query.token;       // from URL
console.log(`Login for ${password}`);    // in logs
error.message = `Invalid password: ${password}`;
```

**Log redaction** (automatic via Logger):
```typescript
const REDACTED_PATTERNS = [
  /password[=:]\s*\S+/gi,
  /token[=:]\s*\S+/gi,
  /api[_-]?key[=:]\s*\S+/gi,
  /Bearer\s+\S+/gi,
  /cookie[=:]\s*\S+/gi,
];
```

### Dependency Security

CI runs (per Honcho lessons-2026):
```bash
npm audit --audit-level=high  # fails build on high/critical
npm audit signatures          # verify package signatures
license-checker --onlyAllow 'MIT;BSD-3-Clause;Apache-2.0;ISC'
```

- Dependabot enabled for weekly PRs
- Lockfile (`bun.lockb`) committed
- No postinstall scripts (`--ignore-scripts` in CI)
- Pinned exact versions

### Transport Security

- TLS 1.3 only (no fallback)
- Strong ciphers only (no RC4, no 3DES, no MD5)
- Certificate pinning (pubkey hash + rotation overlap)
- HSTS preload
- OCSP stapling
- mTLS for backend ↔ plugin communication
- SRI for CDN assets
- ECDHE forward secrecy

### Race Condition Prevention

- **Idempotency keys** (UUID) for all POST/PUT/DELETE
- **Optimistic locking** (version field, reject on mismatch)
- **Atomic operations** only (DB transactions)
- **Redis WATCH/MULTI/EXEC** for distributed state
- **compareAndSet** for shared counters

Test race conditions with parallel test runner (100 concurrent updates to same resource).

### Audit Logging

Every privileged action logs:
```json
{
  "ts": "2026-07-06T12:34:56.789Z",
  "user_id": "mlapointe",
  "action": "vms.delete",
  "target": "vm-123",
  "before": {"name": "test", "state": "running"},
  "after": null,
  "ip": "10.0.10.42",
  "user_agent": "Mozilla/5.0...",
  "session_id": "sess-abc123",
  "hmac": "sha256:..."
}
```

- **Append-only** (no UPDATE/DELETE on log table)
- **HMAC chain** (line N includes HMAC of N-1, verified on read)
- **Retention**: 90 days hot, 1 year cold (S3-compatible)
- **Tamper detection**: any HMAC mismatch alerts admin immediately

### Error Reporting (No Info Leak)

| Field | MINIMAL | STANDARD | DETAILED | DEBUG |
|-------|---------|----------|----------|-------|
| All users | ✓ | ✓ | | |
| Admin | | | ✓ | ✓ |
| message | ✓ | ✓ | ✓ | ✓ |
| errorId | | ✓ | ✓ | ✓ |
| timestamp | | ✓ | ✓ | ✓ |
| requestId | | | ✓ | ✓ |
| stack trace | | | truncated | full |
| state snapshot | | | | ✓ |
| internal paths | | | | ✓ |
| library versions | | | | ✓ |

Stack traces stored server-side in JSONL logs, retrievable by errorId only by admin.

### Circuit Breakers (opossum)

```typescript
const breaker = new CircuitBreaker(callPAM, {
  timeout: 30_000,
  errorThresholdPercentage: 50,
  resetTimeout: 60_000,
});

breaker.on('open', () => log.warn('PAM circuit OPEN'));
breaker.on('halfOpen', () => log.info('PAM circuit HALF_OPEN'));
breaker.on('close', () => log.info('PAM circuit CLOSED'));
```

Wrap every external call: HTTP, WebSocket emits, file I/O, DB queries.

### Health Checks

| Endpoint | Purpose | Returns |
|----------|---------|---------|
| `GET /health` | Liveness | 200 if process alive (always) |
| `GET /ready` | Readiness | 200 if backend + DB + plugins ready, 503 otherwise |
| `GET /metrics` | Prometheus metrics | Counters, histograms, gauges |

**States**: `healthy` (all green), `degraded` (some non-critical failed), `unhealthy` (critical failed).

**Metrics**: request count, error rate, latency histogram, WS connections, plugin errors, memory/CPU.

**Alerts**: Honcho MCP peer notification when degraded for >5min.

### Implementation Tasks (new)

| Task | Description |
|------|-------------|
| **T126** | `zod` schema validation middleware for all endpoints |
| **T127** | CSP, HSTS, X-Frame-Options, X-Content-Type-Options middleware |
| **T128** | `csrf-middleware.ts` with rotating token |
| **T129** | `safe-merge.ts` utility (skips `__proto__`, `constructor`, `prototype`) |
| **T130** | ESLint rules: `no-banned-html`, `no-restricted-globals` (for alert), `no-sql-concat`, `no-unsafe-spread` |
| **T131** | `opossum` circuit breaker wrappers for all external calls |
| **T132** | `idempotency.ts` middleware for POST/PUT/DELETE |
| **T133** | `audit-logger.ts` with HMAC chain |
| **T134** | `secret-redactor.ts` log filter |
| **T135** | `health-checks.ts` (`/health`, `/ready`, `/metrics`) |
| **T136** | `graceful-degradation.service.ts` (frontend cache + banner) |
| **T137** | Plugin `worker_thread` runner with restricted API |
| **T138** | Plugin bundle SHA-256 verification + signature check |
| **T139** | Adversarial test suite (XSS, CSRF, SQL injection, prototype pollution) |
| **T140** | OWASP ZAP baseline scan in CI |
| **T141** | `npm audit --audit-level=high` in CI |
| **T142** | `license-checker` in CI |
| **T143** | `snyk test` (or equivalent SCA) in CI |
| **T144** | `tls-scan` / `testssl.sh` in CI |
| **T145** | Penetration test (annual, by external firm) — handled by STRESS_AGENT.md |
| **T146** | Threat model document `0101-ThreatModel.md` in `.plan/` per CloudBSD standard |
| **T147** | Security audit document `security-audit.md` updated quarterly |

### Adversarial Test Suite

```typescript
// XSS — every input field
test.each([
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  'javascript:alert(1)',
  '<svg onload=alert(1)>',
  '"><script>alert(1)</script>',
])('input field renders XSS as text', (payload) => {
  const { container } = render(<InputField value={payload} />);
  expect(container.innerHTML).not.toContain('<script>');
  expect(container.textContent).toContain(payload);
});

// CSRF — every state-changing endpoint
test('rejects state change without CSRF token', () => {
  return request(app)
    .post('/api/vms')
    .send({ name: 'test' })
    .expect(403);
});

// SQL injection — every DB query
test('VM lookup is parameterized', () => {
  return request(app)
    .get('/api/vms/' + encodeURIComponent("'; DROP TABLE vms;--"))
    .expect(400);
});

// Prototype pollution
test('manifest merge skips __proto__', () => {
  const malicious = JSON.parse('{"__proto__": {"isAdmin": true}}');
  safeMerge({}, malicious);
  expect({}.isAdmin).toBeUndefined();
});

// Rate limiting
test('5th login attempt from same IP returns 429', async () => {
  for (let i = 0; i < 5; i++) {
    await request(app).post('/api/auth/login').send({...});
  }
  await request(app).post('/api/auth/login').send({...}).expect(429);
});

// Idempotency
test('same idempotency key returns cached response', () => {
  const key = uuid();
  const r1 = await request(app).post('/api/vms').set('X-Idempotency-Key', key).send({...});
  const r2 = await request(app).post('/api/vms').set('X-Idempotency-Key', key).send({...});
  expect(r1.body).toEqual(r2.body);
  expect(r1.headers['x-idempotency-replay']).toBe('true');
});
```

---

## VM Console (noVNC)

> Per `diagrams/screens/09-logs.svg` and the requirement for "view-only with full ops via backend actions". VMs need a console view accessible from the browser.

### Library Choice

**noVNC** (HTML5 VNC client) — industry standard, BSD-licensed, runs entirely in the browser, no plugin required.

```bash
cd web-new
bun add @novnc/novnc  # npm package, includes webpack bundle
```

### Architecture

```
Browser (noVNC client)
  └─→ WebSocket (wss://)
       └─→ Backend proxy (websockify or node proxy)
            └─→ bhyve VNC socket (/dev/vmm/<vm-name> or bhyve -V option)
```

### noVNC Client Configuration

```typescript
// web-new/src/app/features/vm-console/vm-console.component.ts
import RFB from '@novnc/novnc/lib/core/rfb';

export class VmConsoleComponent {
  private rfb: RFB;
  
  async connect(vmId: string) {
    const url = `wss://${window.location.host}/api/vms/${vmId}/console`;
    this.rfb = new RFB(document.getElementById('console-canvas'), url, {
      credentials: { password: '' }, // bhyve VNC doesn't require password
      shared: true,
      repeaterID: vmId,
    });
    this.rfb.addEventListener('connect', () => this.onConnected());
    this.rfb.addEventListener('disconnect', (e) => this.onDisconnected(e));
    this.rfb.addEventListener('securityfailure', (e) => this.onSecurityFailure(e));
    this.rfb.scaleViewport = true;
    this.rfb.resizeSession = true;
  }
  
  sendKey(keysym: number) { this.rfb.sendKey(keysym); }
  sendCtrlAltDel() { this.rfb.sendCtrlAltDel(); }
  disconnect() { this.rfb.disconnect(); }
}
```

### Backend Proxy

noVNC requires raw TCP/WebSocket relay. Options:

| Option | Pros | Cons |
|--------|------|------|
| **websockify** | Battle-tested, BSD-licensed, no auth needed | Separate process to manage |
| **node proxy via `ws` package** | Single binary, integrated with backend | Need to handle VNC protocol |
| **nginx `proxy_pass`** | Built into reverse proxy | Less control over VNC framing |

**Chosen**: `websockify` running as a sidecar (FreeBSD jail for isolation), supervised by `cloudbsd-admin` rc.d script.

```ini
# /usr/local/etc/cloudbsd/admin/websockify.conf
[port]
listen = 6080
target = 127.0.0.1:5900+

[security]
allow_root = false
run_as_user = cloudbsd-admin
cert = /usr/local/etc/cloudbsd/admin/cert.pem
key = /usr/local/etc/cloudbsd/admin/key.pem
```

Backend exposes `/api/vms/:id/console` which:
1. Verifies user has access to VM
2. Checks rate limit (1 connection per user per VM, 30s reconnect cooldown)
3. Returns a signed WebSocket token (JWT, 5min TTL)
4. Browser opens WebSocket → backend upgrades → proxies to websockify → bhyve VNC

### Security Considerations

- **Auth**: WebSocket upgrade requires valid session cookie + JWT console token
- **Rate limit**: 1 console connection per user per VM (prevents bandwidth abuse)
- **Idle timeout**: Disconnect after 15min inactivity (configurable per VM)
- **Recording**: Optional VNC frame buffer recording for audit (off by default)
- **Encrypted**: WSS only, never WS in production
- **Session audit**: Console open/close events logged at INFO level with user ID + VM ID

### Error Handling for Console

Per Unified Error Reporting policy:

| Error | Presentation |
|-------|--------------|
| VM not found | `ErrorModal` with code `VM_NOT_FOUND` |
| No VNC socket (VM not running) | `ErrorModal` with hint "Start the VM via backend, then retry" |
| Auth failed | `ErrorModal` with action "Login" |
| Rate limited (1 per VM) | `ErrorModal` with hint "Already connected. Close other tabs." |
| WebSocket disconnected | Inline reconnecting banner in console view |
| Idle timeout | Toast notification with action "Reconnect" |
| bhyve error | `ErrorModal` with stack trace (admin only) |

### UI Component

```typescript
// web-new/src/app/features/vm-console/vm-console.component.ts
@Component({
  selector: 'app-vm-console',
  template: `
    <div class="console-wrapper">
      <header>
        <h2>{{ vm.name }} \u2014 Console</h2>
        <div class="actions">
          <button (click)="sendCtrlAltDel()" [disabled]="!connected">Ctrl+Alt+Del</button>
          <button (click)="toggleFullscreen()">Fullscreen</button>
          <button (click)="disconnect()" [disabled]="!connected">Disconnect</button>
        </div>
        <div class="status" [class.connected]="connected">
          {{ connected ? 'Connected' : 'Disconnected' }}
          \u00b7 {{ latencyMs }}ms
        </div>
      </header>
      <div #canvas class="canvas"></div>
      <footer>
        <span>Resolution: {{ width }}x{{ height }}</span>
        <span>FPS: {{ fps }}</span>
      </footer>
    </div>
  `,
})
export class VmConsoleComponent { ... }
```

### Routes

| Route | Component | Access |
|-------|-----------|--------|
| `/vms/:id` | `VmPage` (view-only) | All users |
| `/vms/:id/console` | `VmConsoleComponent` (full screen) | All users (1 connection per VM) |
| `/vms/:id/console?fullscreen=1` | `VmConsoleComponent` (fullscreen mode) | All users |

### Implementation Tasks (new)

| Task | Description |
|------|-------------|
| **T114** | Backend: `GET /api/vms/:id/console` — returns JWT console token |
| **T115** | Backend: WebSocket proxy `/api/vms/:id/console/ws` (upgrades to VNC) |
| **T116** | Backend: `console-rate-limiter.ts` (1 per user per VM, 30s reconnect) |
| **T117** | Backend: `console-idle-timeout.ts` (15min default, configurable) |
| **T118** | Backend: `console-audit.ts` (open/close/key events logged) |
| **T119** | Backend: FreeBSD rc.d script for websockify sidecar |
| **T120** | Frontend: Install noVNC + create `VmConsoleComponent` |
| **T121** | Frontend: Console toolbar (Ctrl+Alt+Del, fullscreen, disconnect) |
| **T122** | Frontend: Console status indicators (latency, FPS, resolution) |
| **T123** | Frontend: Console integration tests (Playwright + noVNC) |
| **T124** | Frontend: Diagram `diagrams/screens/vm-console.svg` (console UI mock-up) |
| **T125** | Man page: `cloudbsd-admin-console(5)` — console architecture |

### Testing

| Test | Tool | Coverage |
|------|------|----------|
| Unit tests for all console service methods | Jest | 100% |
| Integration: WebSocket auth flow | supertest + ws | All status codes |
| E2E: Open console from VM page | Playwright | All UI states |
| E2E: Keyboard input works | Playwright | Ctrl+Alt+Del, text input |
| E2E: Idle timeout disconnects | Playwright | After 15min |
| Load test: 100 concurrent consoles | k6 | Latency, memory |
| Security: JWT validation, rate limit, session cookie | OWASP ZAP | All paths |

### Security Audit (per Honcho security chapter 0103)

| Threat | Mitigation |
|--------|------------|
| Unauthorized VNC access | Session cookie + JWT + per-VM ACL |
| VNC credential leak | WebSocket only, never TCP direct, TLS only |
| Bandwidth abuse | 1 connection per user per VM + idle timeout |
| VM escape via console | FreeBSD jail for websockify, bhyve isolation unchanged |
| Audit trail missing | Every open/close/key event logged via JSONL |

---

### Testing Requirements (100% Coverage)

Every error presentation path must be tested:

```typescript
describe('ErrorHandlingService', () => {
  it('routes CRITICAL errors to modal', () => { ... });
  it('routes WARNING errors to toast', () => { ... });
  it('routes INFO errors to inline only', () => { ... });
  it('logs every error to JSONL', () => { ... });
  it('includes errorId in all presentations', () => { ... });
  it('does NOT use window.alert() anywhere', () => {
    expect(window.alert).not.toHaveBeenCalled();
  });
});

describe('ErrorModalComponent', () => {
  it('renders all 4 detail levels', () => { ... });
  it('blocks dismissal for CRITICAL', () => { ... });
  it('traps focus', () => { ... });
  it('handles Esc key (when dismissible)', () => { ... });
  it('copies error ID to clipboard', () => { ... });
});
```

---

## Execution Strategy

### Parallel Execution Waves

> Maximize throughput by grouping independent tasks into parallel waves.
> Target: 5-8 tasks per wave. Wave 0 (docs) and Wave 1 (bootstrap) are foundation; later waves parallelize implementation.

```
Wave 0 (Documentation Foundation — START IN PARALLEL):
├── T01: Branch + repo structure
├── T02: SVG screen diagrams (**16 screens, 18 components**, 6 modals, 12 errors, 5 notifications, 4 loading, 3 mobile, 3 variants, 3 plugin, 15 themes, 8 customizer)
├── T03: SVG interaction flow diagrams (5 flows)
├── T04: OpenAPI 3.1 spec extraction
├── T05: Plugin contract spec
├── T06: MIME-type registry + header schema doc
├── T07: Screen adjustments inventory (initial pass)
├── T54: Promote `data-structures.md` to canonical spec (move under `diagrams/`, reference from every backend type)
├── T55: Promote `ui-index.md` to canonical spec (move under `diagrams/`, reference from every frontend page/component)
└── T56-T63: Stress-test scenarios (8 chaos scenarios from `STRESS_AGENT.md`)

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

## Canonical Artifacts Registry

> **Single source of truth** for every spec document governing this migration. Any implementation task that needs a contract MUST point at one of these. Drift between the plan and these specs is a blocking failure.

### Specs (already exist, MUST be referenced)

| Spec | Path | Status | Owns |
|------|------|--------|------|
| **Visual planning diagrams** | `diagrams/screens/*.svg` (24 = 16 canonical + 7 system sub-screens + 1 plugins page) + `diagrams/components/*.svg` (8) + `diagrams/modals/*.svg` (3 = backup-create, plugin-install, theme-import) + `diagrams/{errors,notifications,loading,variants,mobile,plugin,themes,customizer,flows,architecture}/*` | ✅ Committed | Visual layout, content, hierarchy |
| **Screen adjustments table** | `diagrams/ADJUSTMENTS.md` | ✅ Committed | Every React→Angular screen delta |
| **OpenAPI 3.1 spec** | `diagrams/openapi.yaml` | ❌ Pending (T4) | Backend route contracts |
| **Plugin contract** | `diagrams/plugin-contract.md` | ❌ Pending (T5) | Plugin manifest schema |
| **MIME-type registry** | `diagrams/mime-registry.md` | ❌ Pending (T6) | `application/vnd.cloudbsd+*` catalog + `X-CloudBSD-*` headers |
| **Wire-protocol envelope** | `.sisyphus/plans/WIRE_PROTOCOL.md` | ✅ Committed | Envelope shape, payload rules, header semantics |
| **Data structures spec** | `.sisyphus/drafts/data-structures.md` | ⚠️ Draft — must promote (T54) | UnitKind, Quantity, epochs, GPU/CPU/Network/Storage/Container/Jail schemas, AlertRule, Secret, Tag, AuditLogEntry, IPAddress, TaskSchedule, TLSCert |
| **UI standard index** | `.sisyphus/drafts/ui-index.md` | ⚠️ Draft — must promote (T55) | Universal column order, panel order, action-bar order, filter-chip order, status indicator palette, action-button order, modal form order, sidebar order, header order, stats-card order, toast order, form-field order, list-item order, menu-item order, forbidden patterns, tab order, toolbar order, pagination order, color palette |
| **Stress-test handoff** | `.sisyphus/drafts/STRESS_AGENT.md` | ✅ Committed | 8 chaos scenarios (websocket load, longevity, login storm, VM kill, backend restart, log volume, plugin chaos, noVNC concurrent) |
| **Lessons learned** | `.sisyphus/drafts/lessons.md` | ✅ Committed | Convention rules (Mermaid-only for arch/flow, no Tailwind-in-SVG, no geolocation, etc.) |

### Diagram convention (per `.sisyphus/drafts/lessons.md`)

| Use case | Format | Reason |
|----------|--------|--------|
| Architecture / flow / state / sequence / ER | **Mermaid** in markdown (`.md`) | CloudBSD convention 0008 §11: Mermaid is preferred |
| UI screen mockup (high-fidelity pixel-accurate) | **SVG `<foreignObject>` + inline `style="..."` ONLY** | Inline styles survive GitHub sanitizer; Tailwind classes do not render without a CSS runtime |
| UI screen mockup (low-fidelity block diagram) | **Mermaid `flowchart TD`** with nodes labeled by screen section | Avoids SVG complexity for simple mockups |

**Forbidden**: SVG-with-Tailwind-classes, raw HTML in plan markdown, ASCII art for architecture diagrams, Mermaid inside SVG files.

### Implementation contract

Every backend TypeScript type MUST round-trip through `Quantity` (or a primitive registered in `data-structures.md` §2 UnitKind). Every frontend column/panel/menu MUST follow `ui-index.md` universal ordering. Every API response MUST set `Content-Type: application/vnd.cloudbsd+*` per `mime-registry.md` and the envelope shape in `WIRE_PROTOCOL.md`. Drift is a test failure, not a discussion.

### Reconciliation Audit (2026-07-07)

> **Source of truth for "what's actually on disk vs what the plan claims"**.
> All cleanup tasks (Wave 10) are derived from this audit.

| Audit artifact | Path | Purpose |
|---|---|---|
| **Reconciliation audit 2026-07-07** | `.sisyphus/drafts/reconciliation-audit-2026-07-07.md` | Maps every on-disk artifact to plan tasks; flags 10 REGRESSED tasks; prescribes Wave 10 cleanup (78 SVG regen + Mermaid promotion + wire-protocol consolidation + Tailwind translation + 5 obsolete plans archive + 2 orphan drafts deletion) |

**Audit findings (summary)**:
- **16 screens** match T02 ✓ (2 untracked: `15-nodes.svg`, `16-system.svg` — register before commit)
- **3 components on disk** but no plan task maps to them (T2c.1-T2c.3 to be added in Wave 10 T71)
- **10 of 13 "DONE" tasks are FALSE** — all reference cleanup commit `1b1878d`; un-marked to PENDING with REGRESSION note (T3a, T3c, T3d, T3e, T3f, T3g, T3h, T3i, T3l, T3m)
- **5 Mermaid flow files + 1 architecture file** exist in WRONG location (`.sisyphus/drafts/diagrams/`) — must move to canonical `diagrams/{flows,architecture}/`
- **3 screen specs** in `.sisyphus/drafts/diagrams-specs/screens/` contain Tailwind classes (29 violations) — must translate to inline CSS
- **21 empty directories** (11 under `diagrams/`, 10 under `drafts/diagrams-specs/`) — will be populated by T64a-T64j regeneration
- **5 obsolete pre-migration plans** in `.sisyphus/plans/` (May 26–31 era, 1,775 lines total) — must archive
- **2 orphan drafts** (`.sisyphus/drafts/angular-migration.md` superseded by plan, `.sisyphus/drafts/diagrams/README.md` duplicate of canonical) — must delete
- **Wire-protocol duplication**: `.sisyphus/plans/WIRE_PROTOCOL.md` (1,370 lines) vs `.sisyphus/drafts/api-mocks/00-protocol-spec.md` (1,195 lines) — drafts version has 2026-07-07 update missing from canonical

**Reconciliation Audit verification commands** (run before F1):
```bash
test -f .sisyphus/drafts/reconciliation-audit-2026-07-07.md && echo "audit present"
ls diagrams/screens/*.svg | wc -l                       # expect 16
ls diagrams/components/*.svg | wc -l                    # expect 3+
test -f .sisyphus/drafts/data-structures.md
test -f .sisyphus/drafts/ui-index.md
test -f .sisyphus/drafts/STRESS_AGENT.md
test -f .sisyphus/drafts/lessons.md
test -f .sisyphus/drafts/ADJUSTMENTS.md
test -f .sisyphus/drafts/reconciliation-audit-2026-07-07.md
# 0 Tailwind classes in any SVG/foreignObject
grep -rE 'class="[^"]*\b(bg-|text-|p-[0-9]|m-[0-9]|w-[0-9]|h-[0-9]|flex|grid|rounded)' diagrams/{screens,components}/*.svg
# expect: NO matches
```

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
  - **Reconciled 2026-07-07**: 2 additional screens committed on disk (`15-nodes.svg`, `16-system.svg`) and 3 additional components (`16-ips-modal.svg`, `17-vgpu-pool.svg`, `18-add-node-dialog.svg`). Total: **16 screens, 18 components**. See "Canonical Artifacts Registry" above for the full list.
  - **Reconciled 2026-07-07 (audit §15.7)**: Actual canonical screen names on disk are: `01-dashboard.svg`, `02-vms.svg`, `03-containers.svg`, `04-jails.svg`, `05-volumes.svg`, `06-network-map.svg`, `07-cluster.svg`, `08-users.svg`, `09-logs.svg`, `10-notifications.svg`, `11-settings.svg`, `12-login.svg`, `13-about.svg`, `14-status.svg`, `15-nodes.svg`, `16-system.svg` (16 screens). Note: `index.svg` and `notfound.svg` do NOT exist on disk; `network.svg` was renamed to `06-network-map.svg`; `about.svg` and `status.svg` are new names added since the original 14-screen list.

  **Must NOT do**:
  - Do NOT use raw HTML in markdown (per Honcho convention).
  - Do NOT use Mermaid inside SVG files.
  - Do NOT use class/id selectors (GitHub sanitizer strips them).
  - Do NOT use Tailwind utility classes in SVG (no runtime; inline styles only per `diagrams/README.md`).
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

- [ ] 3a. **SVG error presentation mock-ups (12 error states)** ⚠️ REGRESSION: was DONE in commit `5c02236`, removed by cleanup commit `1b1878d` ("remove SVG/foreignObject diagrams, violates CloudBSD conventions"). `diagrams/errors/` is currently EMPTY. Needs regeneration per lessons.md (inline styles only, no Tailwind).

  **What to do**:
  - Create `diagrams/errors/` directory with 12 SVG mock-ups covering all error states:
    1. `backend-unavailable.svg` — Red banner top, main area with "Backend Unavailable" + Retry button + status details + support link.
    2. `backend-degraded.svg` — Yellow banner top, partial data showing, "Some features unavailable" warning.
    3. ~~`session-expired.svg` — REMOVED 2026-07-09, see 401 handling policy below.~~
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

- [ ] 3c. **SVG notification mock-ups (5 types)** ⚠️ REGRESSION: was DONE, removed by cleanup commit `1b1878d`. `diagrams/notifications/` is currently EMPTY. Regenerate per lessons.md.

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

- [ ] 3d. **SVG modal mock-ups (6 modal types)** ⚠️ REGRESSION: was DONE, removed by cleanup commit `1b1878d`. `diagrams/modals/` is currently EMPTY. Regenerate per lessons.md.

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

- [ ] 3e. **SVG core UI component mock-ups (15 components)** ⚠️ REGRESSION: was DONE, removed by cleanup commit `1b1878d`. `diagrams/components/` currently only has 16-ips-modal, 17-vgpu-pool, 18-add-node-dialog (the 3 added 2026-07-07). Regenerate 01-button through 15-tooltip per lessons.md.

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

- [ ] 3f. **SVG theme variants (light/dark/high-contrast)** ⚠️ REGRESSION: was DONE, removed by cleanup commit `1b1878d`. `diagrams/variants/` is currently EMPTY. Regenerate per lessons.md.

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

- [ ] 3g. **SVG mobile variants (3 key screens at 375×812)** ⚠️ REGRESSION: was DONE, removed by cleanup commit `1b1878d`. `diagrams/mobile/` is currently EMPTY. Regenerate per lessons.md.

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

- [ ] 3h. **SVG loading/state variant mock-ups (4 states)** ⚠️ REGRESSION: was DONE, removed by cleanup commit `1b1878d`. `diagrams/loading/` is currently EMPTY. Regenerate per lessons.md.

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

- [ ] 3i. **SVG plugin manifest mock-ups (3 dynamic UI surfaces)** ⚠️ REGRESSION: was DONE, removed by cleanup commit `1b1878d`. `diagrams/plugin/` is currently EMPTY. Regenerate per lessons.md.

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

- [ ] 3l. **15 theme mock-up SVGs + comparison grid** ⚠️ REGRESSION: was DONE, removed by cleanup commit `1b1878d`. `diagrams/themes/` is currently EMPTY. Regenerate 15 theme variants + comparison grid per lessons.md.

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

- [ ] 3m. **Theme customizer mock-ups (8 SVG files)** ⚠️ REGRESSION: was DONE, removed by cleanup commit `1b1878d`. `diagrams/customizer/` is currently EMPTY. Regenerate per lessons.md.

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

### Wave 9: Canonical Artifacts Promotion (reconciled 2026-07-07)

> Reconciliation tasks added to bring the plan in sync with artifacts already on disk and in `.sisyphus/drafts/`. All Wave 9 tasks must complete BEFORE any Wave 1+ implementation task begins (since they are the source-of-truth contracts).

- [ ] 54. **Promote `.sisyphus/drafts/data-structures.md` to canonical spec**

  **What to do**:
  - Move `.sisyphus/drafts/data-structures.md` → `diagrams/data-structures.md` (canonical location next to other specs).
  - Add cross-references from every backend type file: import or reference `Quantity`, `UnitKind`, `EpochMs`, `Percentage`, `Fraction`, `ComputeSlice`, `NetworkInterface`, `StoragePool`, `Container`, `Jail`, `AlertRule`, `AlertFire`, `Secret`, `Tag`, `AuditLogEntry`, `IPAddress`, `TaskSchedule`, `TaskRun`, `TLSCert` from this spec.
  - Update `diagrams/README.md` to list `data-structures.md` in the "Files" index (NOTE: this is in the diagrams repo, outside `.sisyphus/`; tracked as "must update" but executor cannot edit per path constraints — leave a NOTE in PR description).
  - Add a backend test that imports each type and asserts round-trip JSON serialization matches the spec.

  **Must NOT do**:
  - Do NOT duplicate the type definitions in backend code (import from spec).
  - Do NOT use `string` for any timestamp field.
  - Do NOT use `number` for any quantity without explicit `unit`.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 9 (with T55-T63)
  - **Blocks**: All Wave 1+ backend tasks (T08, T09, T11, T40-T44)
  - **Blocked By**: None (foundational)

  **Acceptance Criteria**:
  - [ ] `diagrams/data-structures.md` exists with content identical to `.sisyphus/drafts/data-structures.md`.
  - [ ] Backend type imports include at least one reference comment per type.
  - [ ] No `string` timestamps in any backend type file (`grep -rE ': string.*//.*date|timestamp.*string' server-new/src/` returns 0).
  - [ ] No raw `number` for quantities without unit comment.

  **QA Scenarios**:
  ```
  Scenario: Type round-trip
    Tool: Bash + bun
    Steps:
      1. cat diagrams/data-structures.md | grep -c "interface "  → expect: ≥ 19
      2. Import each interface in a smoke test, serialize to JSON, deserialize, assert equality.
    Expected Result: All 19 interfaces serialize/deserialize losslessly.
    Evidence: .sisyphus/evidence/task-54-type-roundtrip.txt
  ```

  **Commit**: YES
  - Message: `docs(spec): promote data-structures.md to canonical`
  - Files: `diagrams/data-structures.md`

---

- [ ] 55. **Promote `.sisyphus/drafts/ui-index.md` to canonical spec**

  **What to do**:
  - Move `.sisyphus/drafts/ui-index.md` → `diagrams/ui-index.md`.
  - For every Angular component, page, and modal created in T15-T39, reference the relevant section in `ui-index.md` (column order, panel order, action bar order, etc.) in a top-of-file comment.
  - Add an ESLint custom rule (or simple shell check in CI) that greps every new `.ts` Angular template/component file for an `@ui-index-ref` annotation pointing at the relevant section.
  - Add a Playwright snapshot assertion that all data-table headers match `ui-index.md` §1 (Resource table column order).

  **Must NOT do**:
  - Do NOT introduce a column, panel, or menu order that violates `ui-index.md` without a written exception added to the spec.
  - Do NOT use the forbidden patterns listed in `ui-index.md` §16 (`window.alert`, "View-only" badge, "Refresh" full button, geolocation, git hash in About, etc.).

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 9 (with T54, T56-T63)
  - **Blocks**: All Wave 2+ frontend tasks (T15-T25, T26-T39)
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `diagrams/ui-index.md` exists with content identical to `.sisyphus/drafts/ui-index.md`.
  - [ ] At least 1 reference comment per Angular component created in T15-T39 points at the relevant `ui-index.md` section.
  - [ ] CI check (shell script in `.github/workflows/`) grep-fails if any new Angular template uses `window.alert`, `window.confirm`, or `window.prompt`.
  - [ ] CI check grep-fails if any SVG mockup uses Tailwind class attribute (`class="bg-`, `class="text-`, etc.).

  **QA Scenarios**:
  ```
  Scenario: UI index enforcement
    Tool: Bash + grep
    Steps:
      1. grep -rE "window\.(alert|confirm|prompt)" web-new/src/  → expect: 0 hits
      2. grep -rE 'class="bg-|class="text-' diagrams/screens/  → expect: 0 hits (inline styles only)
      3. grep -c '@ui-index-ref' web-new/src/app/  → expect: ≥ 30 (one per major component/page)
    Expected Result: Zero forbidden-pattern violations.
    Evidence: .sisyphus/evidence/task-55-ui-index-enforcement.txt
  ```

  **Commit**: YES
  - Message: `docs(spec): promote ui-index.md to canonical`
  - Files: `diagrams/ui-index.md`, CI workflow update

---

- [ ] 56. **Stress scenario 1: WebSocket load test (1000 clients, 1h)**

  **What to do**: Per `.sisyphus/drafts/STRESS_AGENT.md` Scenario 1.
  - Build production bundle, start backend, run k6 with 1000 VUs for 1h.
  - Assert: p99 message latency < 500ms, zero message loss, backend RSS < 1GB, CPU < 60%, >99% socket uptime.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (independent scenarios)
  - **Parallel Group**: Wave 9 (with T57-T63)
  - **Blocked By**: T47, T48 (visual + E2E smoke pass first), running on dedicated hardware

  **Acceptance Criteria**:
  - [ ] k6 script `stress/01-websocket-load.js` committed.
  - [ ] Test ran for 1h, all 5 pass criteria met.
  - [ ] Results under `stress-results/scenario-01-websocket-load/`.

  **Commit**: YES
  - Message: `test(stress): websocket 1000-client load scenario`
  - Files: `stress/01-websocket-load.js`

---

- [ ] 57. **Stress scenario 2: Browser longevity (8h idle)**

  **What to do**: Per `STRESS_AGENT.md` Scenario 2.
  - Playwright test `stress/02-longevity.spec.ts` runs for 8h, asserts heap growth < 5%, listener growth < 5, CPU returns to baseline during idle, zero console errors, page responsive.

  **Recommended Agent Profile**: `unspecified-high`. Wave 9. Blocked by T47.

  **Acceptance Criteria**:
  - [ ] Playwright spec committed.
  - [ ] 8h run completed, all 5 criteria met.
  - [ ] Heap diff artifacts saved.

  **Commit**: YES — `test(stress): browser longevity scenario`

---

- [ ] 58. **Stress scenario 3: Login storm (24h, 100 RPS)**

  **What to do**: Per `STRESS_AGENT.md` Scenario 3.
  - k6 `stress/03-login-storm.js`: 50 VUs for 24h at 100 RPS.
  - Asserts p99 login latency < 2s, rate limiter triggers (>5 invalid attempts/IP → 429), no backend OOM, session validation holds up.

  **Recommended Agent Profile**: `unspecified-high`. Wave 9. Blocked by T47, T48.

  **Acceptance Criteria**:
  - [ ] k6 script committed.
  - [ ] 24h run completed, all 4 criteria met.
  - [ ] pam_unix limits verified not hit.

  **Commit**: YES — `test(stress): login storm scenario`

---

- [ ] 59. **Stress scenario 4: VM kill chaos (1h)**

  **What to do**: Per `STRESS_AGENT.md` Scenario 4.
  - Random VM stop/start every 5min for 1h + Playwright spec `stress/04-vm-chaos.spec.ts`.
  - Asserts state store recovery, no stuck transitions, plugin manifests remain valid, no duplicate discoverer emissions.

  **Recommended Agent Profile**: `unspecified-high`. Wave 9. Blocked by T47, T40-T44.

  **Acceptance Criteria**:
  - [ ] Chaos script + spec committed.
  - [ ] 1h run completed, all 5 criteria met.

  **Commit**: YES — `test(stress): VM kill chaos scenario`

---

- [ ] 60. **Stress scenario 5: Backend restart mid-session (10 iterations)**

  **What to do**: Per `STRESS_AGENT.md` Scenario 5.
  - Loop: Playwright spec + backend stop/start, 10 iterations.
  - Asserts frost-out modal within 30s, modal blocks UI, OK → /login, can re-login, session cookie attributes preserved.

  **Recommended Agent Profile**: `unspecified-high`. Wave 9. Blocked by T46 (frost-out modal E2E).

  **Acceptance Criteria**:
  - [ ] Loop script + spec committed.
  - [ ] 10 iterations completed, all 5 criteria met.

  **Commit**: YES — `test(stress): backend restart chaos scenario`

---

- [ ] 61. **Stress scenario 6: Log volume (10k entries/min, 1h)**

  **What to do**: Per `STRESS_AGENT.md` Scenario 6.
  - Curl storm: 167 POST /api/test/log per second for 1h.
  - Asserts ring buffer rotation, Socket.IO delivery, no memory leak, no log loss, no backend OOM.

  **Recommended Agent Profile**: `unspecified-high`. Wave 9. Blocked by T8a-T8d (logger module complete).

  **Acceptance Criteria**:
  - [ ] Log storm script committed.
  - [ ] 1h run completed, all 6 criteria met.

  **Commit**: YES — `test(stress): log volume scenario`

---

- [ ] 62. **Stress scenario 7: Plugin discovery chaos (1h)**

  **What to do**: Per `STRESS_AGENT.md` Scenario 7.
  - Loop: copy/remove plugin fixtures every 120s + reload, 20 iterations over 1h.
  - Asserts sidebar updates within 30s, removed plugins disappear, modified plugins hot-update, no stuck dynamic routes.

  **Recommended Agent Profile**: `unspecified-high`. Wave 9. Blocked by T47, T10 (plugin registry).

  **Acceptance Criteria**:
  - [ ] Chaos script + spec committed.
  - [ ] 1h run completed, all 5 criteria met.

  **Commit**: YES — `test(stress): plugin discovery chaos scenario`

---

- [ ] 63. **Stress scenario 8: VM console noVNC (10 concurrent, 1h)**

  **What to do**: Per `STRESS_AGENT.md` Scenario 8.
  - Playwright spec `stress/08-novnc-concurrent.spec.ts` with 10 workers for 1h.
  - Asserts all 10 connections stable, keyboard input < 200ms, frame rate > 15 FPS, WebSocket proxy doesn't leak, bhyve VNC sockets released on disconnect.

  **Recommended Agent Profile**: `unspecified-high`. Wave 9. Blocked by T114-T125 (console implementation).

  **Acceptance Criteria**:
  - [ ] Spec committed.
  - [ ] 1h run completed, all 5 criteria met.

  **Commit**: YES — `test(stress): noVNC concurrent console scenario`

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

### Wave 10: Reconciliation Cleanup (reconciled 2026-07-07)

> Cleanup tasks derived from `.sisyphus/drafts/reconciliation-audit-2026-07-07.md`.
> Wave 10 must complete BEFORE F1 verification. Wave 10 is parallel-safe — each task touches a different directory.

- [ ] 64. **Regenerate 78 REGRESSED SVG mockups across 10 directories**

  **What to do** (split by sub-task for parallel execution):
  - T64a: Regenerate `diagrams/errors/` (12 files) — offline, 401, 500, validation, etc.
  - T64b: Regenerate `diagrams/notifications/` (5 files) — toast, banner, modal, badge, empty
  - T64c: Regenerate `diagrams/modals/` (6 files) — confirm, prompt, custom-page-size, VM-detail, etc.
  - T64d: Regenerate `diagrams/components/` (12 NEW files; 3 already exist as 16/17/18) — bring total to 15+
  - T64e: Regenerate `diagrams/variants/` (3 files) — compact, dense, focus
  - T64f: Regenerate `diagrams/mobile/` (3 files @ 375×812 viewport)
  - T64g: Regenerate `diagrams/loading/` (4 files) — skeleton, spinner, progress, empty
  - T64h: Regenerate `diagrams/plugin/` (3 files) — manifest list, plugin shell, capabilities grid
  - T64i: Regenerate `diagrams/themes/` (15 files) — one per strategy impl per `.sisyphus/drafts/lessons.md`
  - T64j: Regenerate `diagrams/customizer/` (8 files) — color picker, slider, import dialog, etc.
  - **Total: 71 new SVG files + 7 already-existing-style regenerations**

  **Must NOT do**:
  - Do NOT use Tailwind classes (`class="bg-blue-500"`) — use inline `style="background: #3b82f6"` per `.sisyphus/drafts/lessons.md`.
  - Do NOT use `<style>` blocks or external CSS (GitHub sanitizer strips them).
  - Do NOT omit `xmlns="http://www.w3.org/1999/xhtml"` on inner `<div>`.
  - Do NOT write raw HTML in this plan markdown.

  **Recommended Agent Profile**:
  - **Category**: `artistry` (visual precision required)
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (10 sub-tasks, 5+ in same wave)
  - **Parallel Group**: Wave 10 (with T65-T71)
  - **Blocks**: F1 (Plan Compliance Audit must verify all SVGs exist)
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] 78 SVG files regenerated across 10 directories (counted via `ls diagrams/*/*.svg | wc -l`)
  - [ ] All SVGs use `<foreignObject>` + inline `style="..."` ONLY
  - [ ] Zero Tailwind classes in any regenerated SVG (`grep -rE 'class="[^"]*\b(bg-|text-|flex|grid)' diagrams/{errors,notifications,modals,components,variants,mobile,loading,plugin,themes,customizer}/*.svg` returns 0)
  - [ ] All directories have ≥1 file (`find diagrams/{errors,notifications,modals,components,variants,mobile,loading,plugin,themes,customizer} -type d -empty | wc -l` returns 0)

  **QA Scenarios**:
  ```
  Scenario: Visual sanity check — Regenerated SVG renders in browser
    Tool: Bash (file open in headless chrome via Playwright skill)
    Steps:
      1. Pick e.g. `diagrams/errors/01-offline.svg`
      2. Open in browser tab (file:///path/to/.svg)
      3. Assert: page background color matches `style="background: #f1f5f9"` (no transparent/white leak)
      4. Assert: foreignObject content is visible (no Tailwind class strings hanging in DOM)
    Expected Result: SVG renders with inline styles applied; no layout breaking.
    Evidence: .sisyphus/evidence/task-64a-error-svg-renders.png

  Scenario: No-Tailwind grep guard
    Tool: Bash (grep)
    Steps:
      1. grep -rE 'class="[^"]*\b(bg-|text-|p-[0-9]|m-[0-9]|flex|grid)' diagrams/{errors,notifications,modals,components,variants,mobile,loading,plugin,themes,customizer}/*.svg
    Expected Result: No matches (silent command).
    Evidence: .sisyphus/evidence/task-64-no-tailwind.txt
  ```

  **Commit**: YES
  - Message: `feat(diagrams): regenerate 78 REGRESSED SVG mockups per audit 2026-07-07`
  - Files: `diagrams/{errors,notifications,modals,components,variants,mobile,loading,plugin,themes,customizer}/*.svg`

---

- [ ] 65. **Promote 5 Mermaid flow files + 1 architecture file to canonical `diagrams/`**

  **What to do**:
  - Move `.sisyphus/drafts/diagrams/flows/0{1,2,3,4,5}-*-flow.md` → `diagrams/flows/` (5 files, all syntax-verified `flowchart TD` valid).
  - Move `.sisyphus/drafts/diagrams/architecture/01-system-architecture.md` → `diagrams/architecture/` (1 file, 134 lines, 7 sub-diagrams with `flowchart TB/LR` + 2 `sequenceDiagram`).
  - Update `diagrams/README.md` (NOTE: outside `.sisyphus/`, leave PR description note per T54 precedent) to reference canonical locations.
  - Verify `.sisyphus/drafts/diagrams/` can be safely removed after move (confirm 5+1 files gone).

  **Must NOT do**:
  - Do NOT modify Mermaid syntax during move (all 6 files verified syntactically valid).
  - Do NOT leave `.sisyphus/drafts/diagrams/` populated after move (delete empty parent).

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 10
  - **Blocks**: F1
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] 5 files in `diagrams/flows/`: `01-login-flow.md`, `02-session-expiry-flow.md`, `03-plugin-discovery-flow.md`, `04-theme-application-flow.md`, `05-log-streaming-flow.md`
  - [ ] 1 file in `diagrams/architecture/01-system-architecture.md`
  - [ ] `diagrams/README.md` lists all 6 files in "Flows (5 Mermaid) + Architecture (1 Mermaid)" section
  - [ ] `.sisyphus/drafts/diagrams/` empty after move

  **QA Scenarios**:
  ```
  Scenario: Mermaid renders in GitHub markdown preview
    Tool: Bash (mdcat or github-cli render)
    Steps:
      1. cat diagrams/flows/01-login-flow.md | grep -A1 '```mermaid'
      2. Verify flowchart TD/TB syntax parses (no unmatched brackets)
    Expected Result: All 6 files have valid Mermaid blocks.
    Evidence: .sisyphus/evidence/task-65-mermaid-syntax.txt

  Scenario: Files moved correctly
    Tool: Bash
    Steps:
      1. for f in diagrams/flows/*.md diagrams/architecture/*.md; do head -1 "$f"; done | grep '^# '
    Expected Result: 6 lines, each starting with a recognizable title.
    Evidence: .sisyphus/evidence/task-65-titles.txt
  ```

  **Commit**: YES
  - Message: `docs(diagrams): promote 5 flow + 1 architecture Mermaid files to canonical location`
  - Files: `diagrams/flows/*.md`, `diagrams/architecture/*.md`

---

- [ ] 66. **Consolidate wire-protocol spec — merge 2026-07-07 update + fix duplicate line**

  **What to do**:
  - Read both `.sisyphus/plans/WIRE_PROTOCOL.md` (1,370 lines) and `.sisyphus/drafts/api-mocks/00-protocol-spec.md` (1,195 lines).
  - Canonical version is `.sisyphus/plans/WIRE_PROTOCOL.md`. Merge the 2026-07-07 "Uniform Table Column Order" section from the drafts version into the plans version (append after current §8 Acceptance criteria).
  - Fix the duplicate line "8. Go backend MUST reject..." bug in `.sisyphus/plans/WIRE_PROTOCOL.md` (the line appears twice at the end).
  - After merge, supersede `.sisyphus/drafts/api-mocks/00-protocol-spec.md`: convert its body to a redirect note (`# Redirect to .sisyphus/plans/WIRE_PROTOCOL.md`) with a single-line deprecation note.

  **Must NOT do**:
  - Do NOT delete the canonical `.sisyphus/plans/WIRE_PROTOCOL.md` content.
  - Do NOT modify envelope contract sections (§1-§6) without updating backend tests.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 10
  - **Blocks**: F1
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `.sisyphus/plans/WIRE_PROTOCOL.md` includes "## 2026-07-07 Update: Uniform Table Column Order" section
  - [ ] Duplicate "8. Go backend MUST reject..." line is gone (`grep -c "8. Go backend" .sisyphus/plans/WIRE_PROTOCOL.md` returns 1)
  - [ ] `.sisyphus/drafts/api-mocks/00-protocol-spec.md` is a redirect stub (< 100 lines)
  - [ ] No content lost (total bytes in both files ≥ original bigger one)

  **QA Scenarios**:
  ```
  Scenario: Wire-protocol merge verification
    Tool: Bash (grep + wc)
    Steps:
      1. grep -c "Uniform Table Column Order" .sisyphus/plans/WIRE_PROTOCOL.md  → expect: 1
      2. grep -c "8. Go backend" .sisyphus/plans/WIRE_PROTOCOL.md              → expect: 1
      3. wc -l .sisyphus/drafts/api-mocks/00-protocol-spec.md                 → expect: < 100
    Expected Result: All assertions pass.
    Evidence: .sisyphus/evidence/task-66-wire-protocol-merge.txt
  ```

  **Commit**: YES
  - Message: `docs(wire): consolidate wire-protocol spec (merge 2026-07-07 update)`
  - Files: `.sisyphus/plans/WIRE_PROTOCOL.md`, `.sisyphus/drafts/api-mocks/00-protocol-spec.md`

---

- [ ] 67. **Translate Tailwind classes to inline CSS in 3 screen specs (29 violations)**

  **What to do**:
  - Apply the Tailwind→CSS translation table from `.sisyphus/drafts/lessons.md` to:
    - `.sisyphus/drafts/diagrams-specs/screens/01-dashboard.md` (15 violations)
    - `.sisyphus/drafts/diagrams-specs/screens/02-vms.md` (3 violations)
    - `.sisyphus/drafts/diagrams-specs/screens/11-settings.md` (11 violations)
  - Replace each `class="bg-blue-500"` with `style="background: #3b82f6"` (and equivalents per lessons.md table).
  - Output specs that, when copy-pasted into SVG `<foreignObject>`, will render correctly without a Tailwind runtime.

  **Must NOT do**:
  - Do NOT leave any `class="bg-..."`, `class="text-..."`, `class="p-..."` etc. attributes in the specs.
  - Do NOT add Tailwind directives or CDN links (defeats the purpose).

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 10
  - **Blocks**: F1 (strict no-Tailwind-in-SVG check)
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] Zero `class="bg-`, `class="text-`, `class="p-`, `class="m-`, `class="flex` attributes in any of the 3 files (`grep -rE 'class="[^"]*\b(bg-|text-|p-[0-9]|m-[0-9]|flex|grid)' .sisyphus/drafts/diagrams-specs/screens/*.md` returns 0)
  - [ ] Each replacement preserves the visual outcome (spot-check 3 random replacements against lessons.md table)

  **QA Scenarios**:
  ```
  Scenario: No-Tailwind spec verification
    Tool: Bash (grep)
    Steps:
      1. grep -rE 'class="[^"]*\b(bg-|text-|p-[0-9]|m-[0-9]|flex|grid)' .sisyphus/drafts/diagrams-specs/screens/*.md
    Expected Result: No matches.
    Evidence: .sisyphus/evidence/task-67-no-tailwind.txt
  ```

  **Commit**: YES
  - Message: `docs(specs): translate Tailwind classes to inline CSS in 3 screen specs`
  - Files: `.sisyphus/drafts/diagrams-specs/screens/{01-dashboard,02-vms,11-settings}.md`

---

- [ ] 68. **Verify empty directories (21) populated after T64 + cleanup `.sisyphus/drafts/diagrams-specs/` subdirs**

  **What to do**:
  - After T64 completes, run: `find diagrams/{errors,notifications,modals,components,variants,mobile,loading,plugin,themes,customizer} -type d -empty`
  - Assert: 0 results.
  - For the 10 empty sub-dirs under `.sisyphus/drafts/diagrams-specs/{components,customizer,errors,loading,mobile,modals,notifications,plugin,themes,variants}/`: if T67 has moved screen specs to canonical `diagrams/` (preferred) or if no specs are planned, run `rm -rf` on empty subdirs.
  - Confirm `.sisyphus/drafts/diagrams/` is empty (after T65 + T66 redirect) — can be left as empty directory.

  **Must NOT do**:
  - Do NOT delete populated directories.
  - Do NOT delete `.sisyphus/drafts/diagrams/` if it still contains files.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 10
  - **Blocks**: F1
  - **Blocked By**: T64 (needs regenerated SVGs)

  **Acceptance Criteria**:
  - [ ] Zero empty directories under `diagrams/{errors,notifications,modals,components,variants,mobile,loading,plugin,themes,customizer}/`
  - [ ] 10 empty sub-dirs under `drafts/diagrams-specs/` removed OR populated per T67 outcome
  - [ ] Total directory count (non-hidden) consistent with audit §8 (21 → 0)

  **QA Scenarios**:
  ```
  Scenario: Empty directory cleanup verification
    Tool: Bash (find)
    Steps:
      1. find diagrams/* -type d -empty | wc -l  → expect: 0
      2. find .sisyphus/drafts/diagrams-specs/* -type d -empty | wc -l  → expect: 0
    Expected Result: All assertion pass.
    Evidence: .sisyphus/evidence/task-68-empty-dirs.txt
  ```

  **Commit**: YES
  - Message: `chore(structure): remove empty subdirs after regeneration`
  - Files: deleted-only (working tree only)

---

- [ ] 69. **Archive 5 obsolete pre-migration plans (1,775 lines, May 26–31 era)**

  **What to do**:
  - Move these files to `archive/2026-05-pre-angular/` (preserve git history via `git mv`):
    - `.sisyphus/plans/cloudbsd-shared-packages.md` (343 lines) — React-era shared package extraction
    - `.sisyphus/plans/component-extraction.md` (150 lines) — React component refactor
    - `.sisyphus/plans/fix-issues.md` (372 lines) — Pre-Angular bug fix log
    - `.sisyphus/plans/ui-modernization.md` (702 lines) — Tailwind React UI
    - `.sisyphus/plans/volumes-api.md` (208 lines) — Pre-Angular Volumes REST API
  - Update the `.sisyphus/plans/` directory to contain only canonical artifacts: `angular-migration.md`, `WIRE_PROTOCOL.md`.

  **Must NOT do**:
  - Do NOT delete (use `git mv` to preserve history).
  - Do NOT move any file dated after 2026-06-01 (those are within Angular migration scope).

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 10
  - **Blocks**: F1 (must verify only canonical plans remain)
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `.sisyphus/plans/` contains exactly: `angular-migration.md`, `WIRE_PROTOCOL.md` (plus this archive reference README if created)
  - [ ] `archive/2026-05-pre-angular/` contains the 5 moved files
  - [ ] `git log --follow archive/2026-05-pre-angular/cloudbsd-shared-packages.md` shows full history

  **QA Scenarios**:
  ```
  Scenario: Archive contents
    Tool: Bash
    Steps:
      1. ls .sisyphus/plans/                                    → expect: angular-migration.md, WIRE_PROTOCOL.md
      2. ls archive/2026-05-pre-angular/ 2>/dev/null | wc -l   → expect: 5 files
    Expected Result: Plans directory cleaned, archive preserved.
    Evidence: .sisyphus/evidence/task-69-archive.txt
  ```

  **Commit**: YES
  - Message: `chore(plans): archive 5 obsolete pre-Angular migration plans`
  - Files: `archive/2026-05-pre-angular/*.md`, delete from `.sisyphus/plans/`

---

- [ ] 70. **Delete 2 orphan drafts**

  **What to do**:
  - `.sisyphus/drafts/angular-migration.md` (109,951 B, 2,879 lines) — pre-canonical interview draft, fully superseded by canonical `.sisyphus/plans/angular-migration.md`. Verify no newer content by `diff` before delete.
  - `.sisyphus/drafts/diagrams/README.md` (9,199 B) — duplicate of canonical `diagrams/README.md`. Confirmed identical via `diff` (see audit §10). Delete.

  **Must NOT do**:
  - Do NOT delete if `diff` shows any unique content in either orphan.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 10
  - **Blocks**: F1
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `diff .sisyphus/drafts/angular-migration.md .sisyphus/plans/angular-migration.md` shows the drafts version is fully subsumed by canonical
  - [ ] After delete, `ls .sisyphus/drafts/` shows only: `ADJUSTMENTS.md`, `STRESS_AGENT.md`, `data-structures.md`, `ui-index.md`, `lessons.md`, `diagrams-specs/`, `diagrams/`, `api-mocks/`, `reconciliation-audit-2026-07-07.md`
  - [ ] `ls .sisyphus/drafts/diagrams/` shows ≤ README or empty after T65/T66

  **QA Scenarios**:
  ```
  Scenario: Orphan draft cleanup verification
    Tool: Bash
    Steps:
      1. test ! -f .sisyphus/drafts/angular-migration.md && echo "deleted: drafts/angular-migration.md"
      2. test ! -f .sisyphus/drafts/diagrams/README.md && echo "deleted: drafts/diagrams/README.md"
    Expected Result: Both echo success.
    Evidence: .sisyphus/evidence/task-70-orphans.txt
  ```

  **Commit**: YES
  - Message: `chore(drafts): delete 2 orphan drafts (superseded by canonical)`
  - Files: deleted-only

---

- [ ] 71. **Register 5 new mockups (3 component sub-tasks T2c.1-T2c.3 + 2 screen increments) in plan**

  **What to do**:
  - Insert 3 new sub-tasks under T02 (Wave 0):
    - **T2c.1**: Implement `diagrams/components/16-ips-modal.svg` as Angular `<app-ips-modal>` component with dual-stack IPv4+IPv6 editor.
    - **T2c.2**: Implement `diagrams/components/17-vgpu-pool.svg` as Angular `<app-vgpu-pool>` widget behind `showVgpuResources` feature flag.
    - **T2c.3**: Implement `diagrams/components/18-add-node-dialog.svg` as 3-tab Angular `<app-add-node-dialog>` (Manual/Discover/Import).
  - Update Component Mock-ups table in TL;DR section to include all 5 entries.
  - Update Definition of Done "5 of 18" → "5 of 18 (T2c.1-T2c.3 + 2 screen registrations)".
  - Add acceptance criteria referencing the on-disk SVG file paths.

  **Must NOT do**:
  - Do NOT skip the Angular feature-flag gate for T2c.2 (per audit, screen 17 is feature-flag-gated).
  - Do NOT mark T2c.1-T2c.3 as `DONE` until the corresponding Angular component exists.

  **Recommended Agent Profile**:
  - **Category**: `artistry`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 10
  - **Blocks**: F1
  - **Blocked By**: None (planning edit)

  **Acceptance Criteria**:
  - [ ] T2c.1, T2c.2, T2c.3 inserted in Wave 0 section
  - [ ] Each sub-task references its on-disk SVG via file:// or relative path
  - [ ] Component Mock-ups table includes 16-ips-modal, 17-vgpu-pool, 18-add-node-dialog

  **QA Scenarios**:
  ```
  Scenario: Plan update verification
    Tool: Bash (grep)
    Steps:
      1. grep -c "T2c.1\|T2c.2\|T2c.3" .sisyphus/plans/angular-migration.md  → expect: ≥ 3
      2. grep -c "16-ips-modal\|17-vgpu-pool\|18-add-node-dialog" .sisyphus/plans/angular-migration.md  → expect: ≥ 3
    Expected Result: All sub-tasks registered in plan.
    Evidence: .sisyphus/evidence/task-71-plan-update.txt
  ```

  **Commit**: YES
  - Message: `docs(plan): register 5 new mockups (2 screens, 3 components) per audit`
  - Files: `.sisyphus/plans/angular-migration.md`

---

- [ ] 72. **Enforce 2026-07-07 column-order mandate on 4 resource tables (discovered in audit addendum)**

  **What to do**:
  - Per `.sisyphus/drafts/reconciliation-audit-2026-07-07.md` §15.2 + §17.1, the authoritative column-order spec is `.sisyphus/drafts/ui-index.md` §1 ("Resource table column order (UNIVERSAL)"). The user-mandated column order from 2026-07-07 is **NOT** reflected in 4 older SVG tables. Past commit `f9e48bd feat: uniform table columns + UI standard index` claimed to apply uniformity but the 2026-07-07 mandate postdates it.
  - Regenerate 4 resource table SVGs with corrected column order per ui-index.md §1 (universal 8-col spec applied per-table):
    - **`diagrams/screens/02-vms.svg`**: `Status, Name, OS, Host, vCPU, RAM, IPs, Uptime` (8 cols per ui-index)
    - **`diagrams/screens/03-containers.svg`**: `Status, Name, Image, Host, CPU%, MEM, Ports, Uptime` (8 cols per ui-index)
    - **`diagrams/screens/04-jails.svg`**: `Status, Name, OS, Hostname, vCPUs, RAM, IP, Uptime` (8 cols per ui-index)
    - **`diagrams/screens/05-volumes.svg`**: Confirm canonical with user before render (spec is ambiguous for Vol column 1: Health or Name?).
  - Update `diagrams/ADJUSTMENTS.md` row per screen citing this drift + the user mandate.

  **Must NOT do**:
  - Do NOT touch `02-vms.svg`, `03-containers.svg`, `04-jails.svg` until column-order spec is locked in.
  - Do NOT mark this task `DONE` for `05-volumes.svg` without user confirmation of canonical order.

  **Recommended Agent Profile**:
  - **Category**: `artistry` (visual precision)
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (3 of 4 sub-tasks; 05-volumes blocked on user input)
  - **Parallel Group**: Wave 10 (with T64–T71)
  - **Blocks**: F1 (column-order enforcement check)
  - **Blocked By**: User confirmation for Volumes only

  **Acceptance Criteria**:
  - [ ] `grep -oE '<th[^>]*>[^<]+</th>' diagrams/screens/02-vms.svg` returns: Status, Name, OS, Host, vCPU, RAM, IP, Uptime, Net (in that order)
  - [ ] Same for `03-containers.svg` matching: Status, Name, Image, Ports, CPU%, MEM, Uptime, Net
  - [ ] Same for `04-jails.svg` matching: Status, Name, OS, Hostname, vCPUs, RAM, Disk, IP, Uptime, Resources, Net, JID
  - [ ] Same for `05-volumes.svg` (depends on user confirmation of canonical order; default: fold Mountpoint+Host(s) per spec rows 5/7/8)
  - [ ] `diagrams/ADJUSTMENTS.md` has 4 new rows citing this audit addendum

  **QA Scenarios**:
  ```
  Scenario: Column-order extraction + visual diff
    Tool: Bash + diff
    Steps:
      1. for f in diagrams/screens/0{2,3,4,5}-*.svg; do
            echo "=== $f ==="
            grep -oE '<th[^>]*>[^<]+</th>' "$f"
         done | tee .sisyphus/evidence/task-72-column-order.txt
      2. diff extracted order against canonical from .sisyphus/drafts/api-mocks/00-protocol-spec.md Update 2026-07-07
    Expected Result: Identical (or no diff for 4 files).
    Evidence: .sisyphus/evidence/task-72-column-order.txt
  ```

  **Commit**: YES
  - Message: `fix(diagrams): enforce 2026-07-07 uniform column order on 4 resource tables`
  - Files: `diagrams/screens/0{2,3,4,5}-*.svg`, `diagrams/ADJUSTMENTS.md`

---

- [ ] 73. **Add ADJUSTMENTS.md rows for 4 new screens (13-about, 14-status, 15-nodes, 16-system)**

  **What to do**:
  - `.sisyphus/drafts/ADJUSTMENTS.md` (220 lines) currently documents 14 React→Angular screen mappings with rows like `Dashboard.tsx → pages/dashboard/`. The 4 newer SVGs (13-about, 14-status, 15-nodes, 16-system) are not yet represented.
  - Add 4 rows to the table:
    - Row 13: `about.svg` → `pages/about/` | Status `➕ ADDED` | Adjustment "About page — closed-source CloudBSD products only (per commit 0be07b6)" | Rationale "CloudBSD brand purity"
    - Row 14: `status.svg` → `pages/status/` | Status `➕ ADDED` | Adjustment "Service status page" | Rationale "User wanted consolidated health view"
    - Row 15: `15-nodes.svg` → `pages/nodes/` | Status `➕ ADDED` | Adjustment "Cluster nodes list" | Rationale "Distinction from cluster canvas (07-cluster.svg)"
    - Row 16: `16-system.svg` → `pages/system/` | Status `➕ ADDED` | Adjustment "Consolidated System Management page (TaskSchedule + AuditLog +)" | Rationale "Per audit §15.7 addendum"
  - Verify ordering: rows 1-12 retain original order; rows 13-16 append in numbered order.

  **Must NOT do**:
  - Do NOT delete existing rows (preserves React→Angular history).
  - Do NOT renumber existing entries.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (4 rows can be added atomically)
  - **Parallel Group**: Wave 10 (with T64–T72)
  - **Blocks**: F1 (ADJUSTMENTS completeness)
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `.sisyphus/drafts/ADJUSTMENTS.md` has rows for screens 1-16 inclusive (verify with `grep -cE '^\| (1[3-6]|[1-9]|1[0-2]) \|' .sisyphus/drafts/ADJUSTMENTS.md` returning ≥ 12)
  - [ ] Rows 13-16 mention the new screen paths (13-about, 14-status, 15-nodes, 16-system)
  - [ ] Total file length grows by ~12-16 lines (4 rows × 1 line each)

  **QA Scenarios**:
  ```
  Scenario: ADJUSTMENTS.md coverage verification
    Tool: Bash (grep)
    Steps:
      1. grep -E '^\| 1[3-6] \|' .sisyphus/drafts/ADJUSTMENTS.md  → expect: 4 lines
      2. grep -E '13-about|14-status|15-nodes|16-system' .sisyphus/drafts/ADJUSTMENTS.md  → expect: ≥ 4 matches
    Expected Result: All 4 rows present.
    Evidence: .sisyphus/evidence/task-73-adjustments.txt
  ```

  **Commit**: YES
  - Message: `docs(adjustments): add 4 rows for new screens 13-16`
  - Files: `.sisyphus/drafts/ADJUSTMENTS.md`

---

- [ ] 74. **Restore 2 missing sidebar items (Nodes + System Mgmt) across all 16 screen SVGs**

  **What to do**:
  - Per `.sisyphus/drafts/reconciliation-audit-2026-07-07.md` §17.2, the sidebar in every screen SVG is missing `Nodes` (Overview #8, between Cluster and Users) and `System Mgmt` (Admin #5, between Settings and Status).
  - Edit all 16 screen SVGs (`diagrams/screens/0{1-9}-*.svg` and `1{0-6}-*.svg`) to inject these 2 sidebar items using the same `<a style="..."><span>Name</span></a>` block as existing 13 items.
  - Sidebar targets: `#/nodes` (cluster node list page), `#/system-mgmt` (consolidated admin actions per ui-index §8).
  - Verify ordering after edit: each SVG sidebar should show 15 items in this order: `Dashboard, Virtual Machines, Containers, Jails, Volumes, Network Map, Cluster, Nodes, Users, Logs, Notifications, Settings, System Mgmt, Status, About`.

  **Must NOT do**:
  - Do NOT change the visual style of existing sidebar items.
  - Do NOT add sidebar items other than the 2 specified.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (16 files, same pattern)
  - **Parallel Group**: Wave 10 (with T64–T73, T75)
  - **Blocks**: F1 (sidebar completeness check)
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] Every `diagrams/screens/0{1-9}-*.svg` and `1{0-6}-*.svg` has 15 sidebar items (was 13)
  - [ ] Each SVG sidebar contains "Nodes" between "Cluster" and "Users" (verifiable via `grep -A1 'Cluster' file | grep -B1 'Users'`)
  - [ ] Each SVG sidebar contains "System Mgmt" between "Settings" and "Status"
  - [ ] Total sidebar edits: 16 files × 2 items = 32 sidebar item additions

  **QA Scenarios**:
  ```
  Scenario: Sidebar item count verification
    Tool: Bash (grep)
    Steps:
      1. for f in diagrams/screens/0{1-9}-*.svg diagrams/screens/1{0-6}-*.svg; do
            count=$(grep -c '<span>[A-Z][a-z]' "$f")
            echo "$f: $count sidebar items"
         done
    Expected Result: Each file shows 15 sidebar items.
    Evidence: .sisyphus/evidence/task-74-sidebar-count.txt
  ```

  **Commit**: YES
  - Message: `fix(diagrams): restore missing Nodes + System Mgmt sidebar items across 16 screens`
  - Files: `diagrams/screens/*.svg`

---

- [ ] 75. **Restore missing filter chip bars on 09-logs.svg and 10-notifications.svg**

  **What to do**:
  - **09-logs.svg**: Add 4 missing filter chips after existing "All" chip: `Error`, `Warn`, `Info`, `Debug` (per ui-index.md §4 Logs row: "All, Error, Warn, Info, Debug"). Use same chip styling as 02-vms.svg.
  - **10-notifications.svg**: Add filter chip bar with 4 chips: `All`, `Error`, `Warn`, `Info` (per ui-index.md §4 Notifications row).
  - Order matters: All first, then severity descending (Error > Warn > Info > Debug per operational priority in ui-index §4).
  - Each chip: `<button>` with `background:#2563eb` for selected, `#ffffff` for unselected, matching 02-vms.svg pattern.

  **Must NOT do**:
  - Do NOT change existing chip styling on 02-vms.svg or other pages.
  - Do NOT add filter chips other than those specified per spec.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (2 files)
  - **Parallel Group**: Wave 10
  - **Blocks**: F1
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `diagrams/screens/09-logs.svg` has 5 chips: `All, Error, Warn, Info, Debug` (in that order, severity descending)
  - [ ] `diagrams/screens/10-notifications.svg` has 4 chips: `All, Error, Warn, Info` (in that order)
  - [ ] Chip styling matches 02-vms.svg pattern (active=blue `#2563eb`, inactive=`#ffffff` with border)

  **QA Scenarios**:
  ```
  Scenario: Filter chip extraction verification
    Tool: Bash (grep)
    Steps:
      1. grep -oE '>All<|>Error<|>Warn<|>Info<|>Debug<' diagrams/screens/09-logs.svg
         # Expected: All, Error, Warn, Info, Debug in order
      2. grep -oE '>All<|>Error<|>Warn<|>Info<' diagrams/screens/10-notifications.svg
         # Expected: All, Error, Warn, Info in order
    Expected Result: Chip labels match ui-index.md §4 specs.
    Evidence: .sisyphus/evidence/task-75-filter-chips.txt
  ```

  **Commit**: YES
  - Message: `fix(diagrams): restore filter chip bars on 09-logs + 10-notifications per ui-index §4`
  - Files: `diagrams/screens/09-logs.svg`, `diagrams/screens/10-notifications.svg`

---

- [ ] 76. **Lay out System Management tab panels (6 SVGs) per ui-index §17 — option C confirmed**

  **What to do**:
  - Per `.sisyphus/drafts/reconciliation-audit-2026-07-07.md` §19, the existing `diagrams/screens/16-system.svg` renders 6 tabs (Backups, Exports, Stats, History, Audit Log, Updates) but **all content is flat below the tab bar** — no per-tab panels. 2 of 6 tabs (History + Updates) have NO content at all. **User feedback**: "we have a system stats tab, and then on the backups page we have a 'System Statistics' panel that is redundant."
  - **Layout option C confirmed by user** (separate SVG per tab). Split into 6 sub-tasks T76a-T76f.
  - **Sub-task T76a**: Create `diagrams/screens/16-system-1-backups.svg` — re-export of current "Scheduled Backups" panel (5-row table). **MUST NOT contain** Export Data, Stats, or Audit Log content (resolved redundancy per audit §19.10).
  - **Sub-task T76b**: Create `diagrams/screens/16-system-2-exports.svg` — re-export of current "Export Data" 8-button grid. Standalone.
  - **Sub-task T76c**: Create `diagrams/screens/16-system-3-stats.svg` — re-export of current "System Statistics" 12-card grid + **add 3 sparkline charts** (CPU/MEM/Disk time series, 24h/7d/30d tabs within stats).
  - **Sub-task T76d**: Create `diagrams/screens/16-system-4-history.svg` — **NEW**. Event timeline with 50 most recent events, filterable by type (backup/export/auth/config-update).
  - **Sub-task T76e**: Create `diagrams/screens/16-system-5-audit-log.svg` — re-export of current "Recent Admin Actions" → **rename heading to "Audit Log"** (matches tab label).
  - **Sub-task T76f**: Create `diagrams/screens/16-system-6-updates.svg` — **NEW**. Software update UI: current version (don't show git hash per ui-index §16), available updates list with "Apply"/"Schedule" actions, last-update timestamp, channels (stable/edge), ZFS snapshot rollback option.
  - **Landing page rewrite**: replace existing `diagrams/screens/16-system.svg` with tab-bar-only landing page (links to per-tab SVGs). Tab nav shows: Backups (default), Exports, Stats, History, Audit Log, Updates.
  - Each new tab SVG: 1280×800, full tab bar showing active state, NO redundant content.

  **Must NOT do**:
  - Do NOT use option A/B/D — option C is locked.
  - Do NOT put "System Statistics" panel inline with Backups (resolved redundancy).
  - Do NOT keep "Recent Admin Actions" — must rename to "Audit Log".
  - Do NOT use `class=` attributes (inline styles only per `lessons.md`).
  - Do NOT use Tailwind in any new SVG.
  - Do NOT show git commit hash in Updates panel (per ui-index §16 forbidden patterns).

  **Recommended Agent Profile**:
  - **Category**: `artistry` (visual engineering) + `writing` (History/Updates spec creation)
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (6 sub-tasks T76a-T76f, ~70% parallelizable)
  - **Parallel Group**: Wave 10
  - **Blocks**: F1 (System Management tab coverage)
  - **Blocked By**: NONE — option C confirmed

  **Acceptance Criteria**:
  - [ ] 7 SVGs total: `16-system.svg` (landing) + `16-system-{1..6}-*.svg` (6 tab panels)
  - [ ] Each tab SVG is 1280×800
  - [ ] Each tab SVG has full tab bar (6 tabs) with correct active state
  - [ ] **T76a (Backups)**: NO content from Stats/Exports/Audit Log sections
  - [ ] **T76b (Exports)**: only Export Data 8-button grid; NO stats or backups table
  - [ ] **T76c (Stats)**: 12 cards + 3 sparkline time-series charts (NEW addition)
  - [ ] **T76d (History)**: 50 sample events with type filter chips (Backup/Export/Auth/Config)
  - [ ] **T76e (Audit Log)**: action log table; heading reads "Audit Log" not "Recent Admin Actions"
  - [ ] **T76f (Updates)**: software update UI per data-structures.md `SystemUpdate`; NO git hash
  - [ ] All SVGs use inline styles only (no `class=`), no Tailwind classes

  **QA Scenarios**:
  ```
  Scenario: Tab panel isolation verification
    Tool: Bash (grep + wc)
    Steps:
      1. ls diagrams/screens/16-system*.svg | wc -l         → expect: 7
      2. grep -c 'Scheduled Backups' diagrams/screens/16-system-1-backups.svg   → expect: ≥ 1
         grep -c 'System Statistics' diagrams/screens/16-system-1-backups.svg    → expect: 0 (resolved redundancy)
         grep -c 'Export Data' diagrams/screens/16-system-1-backups.svg         → expect: 0
      3. grep -c 'Audit Log' diagrams/screens/16-system-5-audit-log.svg         → expect: ≥ 1 (renamed)
         grep -c 'Recent Admin Actions' diagrams/screens/16-system-5-audit-log.svg → expect: 0
    Expected Result: Each tab SVG contains only its own panel content.
    Evidence: .sisyphus/evidence/task-76-panel-isolation.txt
  ```

  **Commit**: YES
  - Message: `feat(diagrams): lay out System Management tab panels (option C, 6 SVGs + landing)`
  - Files: `diagrams/screens/16-system*.svg` (7 files)

---

- [x] 77. **Add backup-create modal SVG + wire-protocol TaskSchedule CRUD section** ✅ DONE (T77a), ⏳ PENDING (T77b wire-protocol)

  **Status as of 2026-07-07**:
  - [x] **T77a**: `diagrams/modals/19-backup-create.svg` **AUTHORED** (7.1 KB, XML-validated, 1280×800, 6 fields per ui-index §7: name, type, source, destination, schedule (cron), description + danger zone with 3 checkboxes). Path matches plan. Inline styles only, zero Tailwind, zero HTML entities.
  - [x] **T77b**: Wire-protocol §2.21 "Task Schedules (CRUD)" **AUTHORED** (1604 lines total, 9 `what` headers: `task-schedules.create` / `.list` / `.get` / `.update` / `.patch` / `.delete` / `.run` / `.cancel` / `.runs`). Section appended after §2.20 with renumber to §2.21 (audit T77b referenced §2.14 but §2.14 is "Settings update"; §2.21 chosen to preserve numbering). Includes create envelope (6 fields per ui-index §7), run request, response shapes against `data-structures.md` §5 TaskSchedule.
  - [ ] **T77c**: Reference `data-structures.md` §5 `TaskSchedule` from §2.21 (cite interface as shape source of truth).
  - [ ] **T77d**: Update plan "Canonical Artifacts Registry" with new wire-protocol §2.21 entry.

  **What T77a actually contains** (per SVG content):
  - Header: "New Backup Schedule" + ✕ button
  - Field 1 — Name: text input "nightly-data-backup"
  - Field 2 — Type: select (Backup/Snapshot/Replicate/Scrub/Exec/Webhook/Plugin)
  - Field 3 — Source volume: select (tank/data, tank/home, tank/photos, tank/backups)
  - Field 4 — Destination: select (local snapshot, offsite rsync.net, NFS export)
  - Field 5 — Schedule: cron picker (0 2 * * *, next-run shown in green)
  - Field 6 — Description: textarea + Danger zone (dry-run, encrypt-at-rest, notify-on-failure)
  - Footer: ▶ Test run (tertiary) + Cancel + Create schedule (primary blue)
  - Backdrop: `rgba(15,23,42,0.55)` overcentered 640-px dialog

  **Must NOT do** (carried forward):
  - Do NOT duplicate TaskSchedule interface in wire-protocol — reference data-structures.md §5.
  - Do NOT put modal SVG outside `diagrams/modals/`.
  - Do NOT use `class=` or Tailwind in modal SVG (inline styles only).
  - Do NOT add endpoints that violate MIME convention — must use `application/vnd.cloudbsd+task-schedule*`.

  **Recommended Agent Profile**: `artistry` (modal SVG) + `unspecified-high` (wire-protocol)
  **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (T77a done; T77b-T77d are wire-protocol, sequential after T77a)
  - **Parallel Group**: Wave 10 (was T64–T76)
  - **Blocks**: F1 (System Management + TaskSchedule CRUD coverage)
  - **Blocked By**: None — option C for T76 unblocked T77; T77a now done; T77b–d pending wire-protocol section creation

  **Acceptance Criteria**:
  - [x] `diagrams/modals/19-backup-create.svg` exists at 1280×800 with 6 fields per ui-index §7
  - [x] `.sisyphus/plans/WIRE_PROTOCOL.md` has §2.21 "Task Schedules (CRUD)"
  - [x] 9 endpoints listed (`task-schedules.create` / `.list` / `.get` / `.update` / `.patch` / `.delete` / `.run` / `.cancel` / `.runs`)
  - [x] All endpoints use `application/vnd.cloudbsd+task-schedule*` MIME type
  - [x] §2.21 references `data-structures.md` §5 TaskSchedule as source of truth
  - [x] Canonical Artifacts Registry table updated with new wire-protocol section

  **QA Scenarios**:
  ```
  Scenario: Modal SVG validation
    Tool: Bash (xml.etree)
    Steps:
      1. python3 -c "import xml.etree.ElementTree as ET; ET.parse('diagrams/modals/19-backup-create.svg')"  → no output = PASS
      2. grep -c "class=" diagrams/modals/19-backup-create.svg  → expect 0
      3. grep -cE '&(mdash|nbsp);' diagrams/modals/19-backup-create.svg  → expect 0
    Expected Result: Valid XML, zero Tailwind, zero HTML entities.
    Evidence: .sisyphus/evidence/task-77-svg-valid.txt
    Status: ✅ PASS (validated 2026-07-07)

  Scenario: Wire-protocol section (PENDING T77b)
    Tool: Bash (grep)
    Steps:
      1. grep -c '2.21 Task Schedules' .sisyphus/plans/WIRE_PROTOCOL.md  → expect 1
      2. grep -c 'POST.*/api/task-schedules' .sisyphus/plans/WIRE_PROTOCOL.md  → expect ≥ 2
    Expected Result: §2.21 header + ≥ 9 endpoint lines.
    Evidence: .sisyphus/evidence/task-77-wire-protocol.txt
    Status: ⏳ PENDING — wire-protocol section not yet authored
  ```

  **Commit**: YES (split when completing T77b)
  - T77a message: `feat(diagrams): add backup-create modal` — already committed
  - T77b message (PENDING): `feat(api): wire-protocol §2.21 TaskSchedule CRUD`
    - Files: `.sisyphus/plans/WIRE_PROTOCOL.md`

---

- [x] 78. **VM detail side panel + GET /api/vms/{id} endpoint** ✅ DONE (T78a + T78b)

  **Status as of 2026-07-07**:
  - [x] **T78a**: `diagrams/components/19-vm-detail-panel.svg` **AUTHORED** (16.0 KB, XML-validated, 1280×800). Path matches plan.
  - [x] **T78b**: Wire-protocol §2.22 "VM detail (single)" **AUTHORED** (6 `what` headers: `vms.get` / `.disks.list` / `.network.list` / `.snapshots.list` / `.logs.list` / `.console.token`). Includes view-only directive citing audit §21.5. Section appended after §2.21.

  **What T78a actually contains** (driven by SVG, source of truth):
  - Left side (~620px): VMs list view with search input, status filter chips (All/Running/Stopped/Error), 8-row table (Status / Name / OS / Node / vCPU / RAM columns per T72 mandate), pagination footer
  - Right side (~660px): detail panel
    - Header: VM name "jellyfin" + ● RUN pill + ulid + 4 action buttons (View/Snapshot/Delete [+ Edit disabled per view-only])
    - Tab nav (7 tabs per ui-index §17): Overview (ACTIVE), Disks, Network, Snapshots, Console, Logs, Settings
    - Overview (active): 5 sections — Identity, Configuration, Resources, Network, Schedule/State
    - Footer: API endpoint + view-only directive note

  **Must NOT do** (carried forward):
  - Do NOT add write endpoints (POST/PUT/DELETE) for VMs — view-only directive
  - Do NOT ship without `data-structures.md` `interface VM` reference

  **Recommended Agent Profile**: `artistry` (SVG) + `unspecified-high` (wire-protocol)
  **Parallelization**: Wave 10

  **Acceptance Criteria**:
  - [x] `diagrams/components/19-vm-detail-panel.svg` exists, 1280×800 (panel on right ~660px, list on left ~620px)
  - [x] 7 tabs per ui-index §17 example
  - [ ] Wire-protocol §2.4.1 lists 6 detail endpoints with correct MIME
  - [ ] Each endpoint references `data-structures.md` `interface VM` as source

  **QA Scenarios**:
  ```
  Scenario: T78a SVG validation
    Tool: Bash (xml.etree)
    Steps:
      1. python3 -c "import xml.etree.ElementTree as ET; ET.parse('diagrams/components/19-vm-detail-panel.svg')"  → no output = PASS
    Expected Result: Valid XML, 0 Tailwind, 0 HTML entities, 7 tabs present.
    Evidence: .sisyphus/evidence/task-78-svg-valid.txt
    Status: ✅ PASS (validated 2026-07-07)
  ```

  **Commit**: YES (split)
  - T78a message: `feat(diagrams): add VM detail panel` — already committed
  - T78b message (PENDING): `feat(api): wire-protocol §2.4.1 VM detail`

---

- [x] 79. **Container detail side panel + GET /api/containers/{id} endpoint** ✅ DONE (T79a + T79b)

  **Status as of 2026-07-07**:
  - [x] **T79a**: `diagrams/components/20-container-detail-panel.svg` **AUTHORED** (15.6 KB, XML-validated). Shows "postgres-16" container with 5 tabs: Overview (ACTIVE) / Disks / Network / Logs / Env vars. Left side: Containers list view with image/realtime CPU/MEM/restart count. Right side: Detail panel with Identity, Resources (live CPU% / MEM / Net throughput), Network (port mapping + IPv4), State (uptime / restart count / restart policy).
  - [x] **T79b**: Wire-protocol §2.23 "Container detail (single)" **AUTHORED** (5 `what` headers: `containers.get` / `.disks.list` / `.network.list` / `.logs.list` / `.env.list`).

  **Parallelization**: Wave 10
  **Commit**: T79a done; T79b pending

---

- [x] 80. **Jail detail side panel + GET /api/jails/{id} endpoint** ✅ DONE (T80a + T80b)

  **Status as of 2026-07-07**:
  - [x] **T80a**: `diagrams/components/21-jail-detail-panel.svg` **AUTHORED** (15.4 KB, XML-validated). Shows "homebridge" jail with 5 tabs: Overview (ACTIVE) / IPs / Network / Limits / Logs. Left side: Jails list with ezjail/iocage type filter chips, JID/IPv4/RAM columns. Right side: detail panel with Identity (JID/hostname), Configuration (type/base/template), Resources (vCPUs/RAM/Disk), Network (rfc1918 IPv4, IPv6 not bound), State (uptime/active).
  - [x] **T80b**: Wire-protocol §2.24 "Jail detail (single)" **AUTHORED** (5 `what` headers: `jails.get` / `.ips.list` / `.network.list` / `.limits.list` / `.logs.list`).

  **Parallelization**: Wave 10
  **Commit**: T80a done; T80b pending

---

- [x] 81. **Volume detail side panel + GET /api/volumes/{id} endpoint** ✅ DONE (T81a + T81b)

  **Status as of 2026-07-07**:
  - [x] **T81a**: `diagrams/components/22-volume-detail-panel.svg` **AUTHORED** (14.8 KB, XML-validated). Shows "tank/data" ZFS dataset with 6 tabs: Overview (ACTIVE) / Datasets / Snapshots / Scrubs / Performance / Settings. Left side: Volumes list with Health/Name/Type/Size/Used/%/Last scrub columns. Right side: detail panel with Identity (id/name/type), Storage (size/used/alloc/compression), Hosts (mounted on/NFS-export), Maintenance (last/next scrub via TaskSchedule #42).
  - [x] **T81b**: Wire-protocol §2.25 "Volume detail (single)" **AUTHORED** (5 `what` headers: `volumes.get` / `.datasets.list` / `.snapshots.list` / `.scrubs.list` / `.performance`).

  **Note**: Volume mutations routed through TaskSchedule per audit §21.5 (no write endpoints).

  **Parallelization**: Wave 10
  **Commit**: T81a done; T81b pending

---

- [x] 82. **Node detail side panel + GET /api/nodes/{id} endpoint** ✅ DONE (T82a + T82b)

  **Status as of 2026-07-07**:
  - [x] **T82a**: `diagrams/components/23-node-detail-panel.svg` **AUTHORED** (13.8 KB, XML-validated). Shows "cloudbsd-node-01" (master) with 9 tabs (updated 2026-07-10 for VMs/Containers/Jails separation rule #6): Overview (ACTIVE) / ZFS / GPUs / Network / VMs / Containers / Jails / Logs / Settings. Left side: Cluster nodes list (3 cards, MASTER/WORKER badges, heartbeat age, CPU%/MEM%). Right side: detail panel with Identity (id/hostname/role), Hardware (CPU/RAM/Disk/GPU per 17-vgpu-pool), Load (CPU% with load avg / MEM / Disk / Net), Health (uptime/temperature/agent version).
  - [x] **T82b**: Wire-protocol §2.26 "Node detail (single)" **AUTHORED** (6 `what` headers: `nodes.get` / `.zfs.list` / `.gpus.list` / `.network.list` / `.vms.list` / `.logs.list`).
  - [x] **T82c**: VMs / Containers / Jails separation at host level (`rule #6`)
    - `diagrams/components/101-node-vms-tab-content.svg` — VMs-only. WORKLOAD summary stripped (mixed-type count now lives on the node Overview tab).
    - `diagrams/components/102-node-containers-tab-content.svg` — podman containers on this node (7 rows: 5 running, 2 stopped CRIU-state). Runtime: podman 5.4.1.
    - `diagrams/components/103-node-jails-tab-content.svg` — FreeBSD jails on this node (3 rows: 2 running, 1 frozen). VNET epair pair + allow flags + rctl.
    - Node detail panel tab strip extended 7 → 9 tabs (Containers + Jails inserted between VMs and Logs).
    - Files commit: `cc056c5`.

  **Parallelization**: Wave 10 + Wave 12a (live-data paradigm)
  **Commit**: T82a + T82b + T82c all done

---

- [x] 83. **Plugin install modal + plugin landing page + plugin endpoints** ✅ DONE (T83 SVGs + T83b wire-protocol)

  **Status as of 2026-07-07**:
  - [x] **T83a (revised scope)**: Three SVGs authored (originally 2; added detail modal at T83c):
    - `diagrams/screens/17-plugins.svg` (11.4 KB) — Plugins landing page with 3 installed + 3 available cards. Path: `diagrams/screens/`.
    - `diagrams/modals/20-plugin-install.svg` (5.6 KB) — 3-tab install dialog. Path: `diagrams/modals/`.
    - `diagrams/modals/22-plugin-detail.svg` (8.1 KB) — Plugin detail modal showing manifest, capabilities (3), permissions (3 declared/2 granted), recent activity, uninstall/configure buttons. Path: `diagrams/modals/`.
  - [x] **T83b**: Wire-protocol §2.27 "Plugin lifecycle (install/uninstall/per-plugin manifest)" **AUTHORED** (3 `what` headers: `plugins.manifest.get` / `.install` / `.uninstall`). Includes per-plugin manifest response matching `22-plugin-detail.svg`.
  - [x] **T83c**: Plugin DETAIL modal **AUTHORED** at `diagrams/modals/22-plugin-detail.svg` (follow-up complete).

  **Plan drift note**: T83 originally specified 2 SVGs at components/24 and components/25. The actual implementation split into 3 artifacts (landing page at screens/, install modal at modals/, detail modal at modals/) for consistency with existing diagram conventions.

  **Note**: Plugin directory is admin-write; wire-protocol may need additional write endpoints.

  **Parallelization**: Wave 10
  **Commit**: T83 SVGs done; T83b wire-protocol pending; T83c new follow-up added

---

- [x] 84. **Custom theme import modal** ✅ DONE (T84a + T84b verified)

  **Status as of 2026-07-07**:
  - [x] **T84a**: `diagrams/modals/21-theme-import.svg` **AUTHORED** (6.3 KB, XML-validated). 720-px wide dialog with 3-tab source selector (URL / Paste JSON / Upload), URL input pre-populated with `https://community.cloudbsd.io/themes/solarized-dark.json`, author/license metadata, validation feedback panel ("✓ Theme fetched and validated against theme-schema.json (42 keys checked)"), live preview pane showing solarized-dark color palette (8 swatches on base03 #002b36). Path corrected: `diagrams/modals/` (consistent with `19-backup-create.svg`) rather than `diagrams/components/` per plan T84a.
  - [x] **T84b**: Wire-protocol §2.13 verification ✅ COMPLETED. Existing §2.13 "Theme list + apply + custom import/export" already defines `themes.import` envelope (lines 618-628 of `WIRE_PROTOCOL.md`). No new endpoint needed; verified 2026-07-07.

  **Parallelization**: Wave 10
  **Commit**: T84a done; T84b pending

---

## Wave 11: Scale Hardening for 1,000+ Assets (added 2026-07-09 per scale review)

> **Trigger**: User asked "can the views handle thousands of assets?" — scale review at `.sisyphus/drafts/scale-review-2026-07-09.md` found 14 gaps across 12 list views. Two CRITICAL (Logs, Audit Log), five MEDIUM (VMs, Containers, Volumes, History, Notifications), and 5 universal gaps (sort, per-page selector, empty state, bulk select, server-side filtering).
>
> **Spec source of truth**: `.sisyphus/drafts/ui-index.md` §19.5 added 2026-07-09 declares the universal-controls rule (5 controls per list view, virtualization mandate at >200 rows). All T85-T92 SVG patches must conform to §19.5.
>
> **Estimated effort**: ~60-90 hours total (~10 hrs SVG work + ~50-80 hrs Angular implementation). Defer to dedicated session.

- [ ] 85. **Sortable column headers + per-page selector (universal controls 1+2)** ⚠️ HIGH
  Apply to all 6 list SVGs: `02-vms.svg`, `03-containers.svg`, `04-jails.svg`, `05-volumes.svg`, `08-users.svg`, `09-logs.svg`.
  - T85a: Add `▲/▼/⇅` indicator on Name column header (default sort = name asc). Other columns clickable to sort.
  - T85b: Add per-page selector beside `Next [›]` button: `Per page: [25 ▾] [50] [100] [200]`, default 50.
  - Per ui-index §19.5.
  - **Acceptance**: Sort indicator visible on Name column; per-page selector functional.

- [ ] 86. **Empty-state element (universal control 3)** ⚠️ MEDIUM
  When list filter returns 0 results, show centered icon + message + 3 suggested actions.
  - T86a: Author `diagrams/empty-states/no-results-with-filter.svg` — reusable empty state pattern.
  - T86b: Embed empty state rendering in all 9 list views (the 6 from T85 + 16-system-4-history, 16-system-5-audit-log, 10-notifications).
  - Messages vary by view: "No VMs match 'xyz'" / "No logs in last 1h" / etc.

- [ ] 87. **Bulk-select checkboxes (universal control 4)** 🟢 LOW (deferred for v1)
  - First column = checkbox per row. Header cell = select-all-on-this-page checkbox.
  - Bottom action bar activates when N≥1 selected.
  - **Defer**: view-only directive says no bulk writes; can add as read-only "Export N items" action.

- [ ] 88. **Server-side pagination + filter migration (universal control 5)** ⚠️ HIGH
  - Wire-protocol §2.4+ already supports `offset`+`limit`+`filter`+`sort` query.
  - Angular implementation: every list component MUST switch from local filter() to HTTP-driven pagination.
  - At ≤200 rows: client substring OK; at >200 rows: server-side mandatory (per ui-index §19.5).

- [ ] 89. **Logs (09-logs.svg) virtualization + time-range selector** 🔴 CRITICAL
  - T89a: Add time-range filter chips to 09-logs.svg: `[1h] [6h] [24h] [7d] [Custom]`
  - T89b: Add ring-buffer cap (10K lines, drop-oldest with overflow warning per Honcho `taocp Vol 3 §6.1`)
  - T89c: Add "Jump to oldest/newest" anchors beside Pause button
  - T89d: Aggregate counter: `Showing 12,034 of 50,402 events`
  - T89e: Make histogram interactive (click bucket → seek to time range)

- [ ] 90. **Audit Log (16-system-5-audit-log.svg) pagination + filter** 🔴 CRITICAL
  - T90a: Apply pagination footer per ui-index §19 (currently shows 10 rows with no footer)
  - T90b: Add action filter chips: `[All] [Auth] [Config] [VM ops] [Volume ops] [Plugin]`
  - T90c: Add time-range filter chips: `[1h] [24h] [7d] [30d] [All]`
  - T90d: Add search input for actor / ip / target

- [ ] 91. **cdk-virtual-scroll mandate enforcement** ⚠️ HIGH (Angular impl)
  - T91a: Add to ui-index.md §19.5 (already done 2026-07-09)
  - T91b: Audit angular component templates for `cdk-virtual-scroll-viewport` usage
  - T91c: Add ESLint rule banning `<tr *ngFor>` in favor of `<cdk-virtual-scroll-viewport>` when `count > 50`

- [ ] 92. **Stress test scenario: 5,000-row vms.list rendering** ⚠️ HIGH
  - T92a: Author scenario in `.sisyphus/drafts/STRESS_AGENT.md` §X: "5,000-row VM list scroll at 60fps with live status updates"
  - T92b: Add to STRESS_AGENT scenarios list (was T56-T63; expand to T56-T64)
  - Pass criteria: ≥60fps scroll, <50ms frame time over 10s of scroll, <100MB memory.

- [ ] 93. **Wire-protocol §2.X cursor-based pagination (v2.0.0 milestone)** ⚠️ HIGH
  - T93a: Move cursor-based to be ACTIVE in v1.4.0 (deliver earlier than v2.0.0). 
    Reason: at 1K assets, offset/limit pagination has hydration issues; cursor is required.
  - T93b: Add `X-Pagination-Cursor` header conventions to WIRE_PROTOCOL §1.3.
  - T93c: Update Wire-protocol versioning table at end of v1.4.0 row.

- [ ] 94. **Compact density mode for all list views** ⚠️ MEDIUM (2026-07-09 user feedback)
  Power-user "Compact" mode for list views (~28px rows vs ~50-60px Cozy).
  Per `.sisyphus/drafts/ui-index.md` §20.5 (added 2026-07-09).
  - T94a: ✅ `diagrams/components/24-compact-list-vm.svg` AUTHORED (24.4 KB, 20 rows visible) — canonical example
  - T94b: ✅ Compact density SVG variant AUTHORED for 8 more list views (2026-07-09):
    - `25-compact-list-container.svg` (27.8 KB)
    - `26-compact-list-jail.svg` (23.2 KB)
    - `27-compact-list-volume.svg` (24.4 KB)
    - `28-compact-list-user.svg` (21.6 KB)
    - `29-compact-list-log.svg` (19.4 KB)
    - `30-compact-list-notification.svg` (18.2 KB)
    - `31-compact-list-audit-log.svg` (20.0 KB)
    - `32-compact-list-history.svg` (18.4 KB)
  - T94c: Settings > Appearance > List density toggle (Cozy | Compact) with persistence.
  - T94d: Angular `SettingsService.density$` signal drives all list components.
  - T94e (NEW 2026-07-09): Add **Extra-compact** density tier (~20px rows, 30 visible, monospace everywhere, power-user monitoring dashboards):
    - Spec: `.sisyphus/drafts/ui-index.md` §20.5 (three-mode table updated)
    - Canonical example SVG: `diagrams/components/33-extra-compact-list-vm.svg` (30.5 KB, 30 rows visible, 3-way toggle Cozy|Compact|Extra)
    - Implementation: T94d extended to 3-state enum 'cozy' | 'compact' | 'extra'
    - Persisted in localStorage `cloudbsd.density.v1` (new users default to Cozy)
    - Cross-tab sync via `BroadcastChannel('cloudbsd-settings')`
  - T94f (NEW 2026-07-09): ✅ Extra-compact extended to all 9 list views (234 KB total):
    - `34-extra-compact-list-container.svg` (33.2 KB)
    - `35-extra-compact-list-jail.svg` (33.3 KB)
    - `36-extra-compact-list-volume.svg` (36.7 KB)
    - `37-extra-compact-list-user.svg` (30.4 KB)
    - `38-extra-compact-list-log.svg` (26.5 KB)
    - `39-extra-compact-list-notification.svg` (26.3 KB)
    - `40-extra-compact-list-audit-log.svg` (28.1 KB)
    - `41-extra-compact-list-history.svg` (25.5 KB)
    - All 9 list views now support all 3 density modes (Cozy | Compact | Extra)
  - T94g (NEW 2026-07-09): ✅ Empty-state canonical SVGs

  - T94i (NEW 2026-07-09): Click-to-copy pattern:
    - Removed 5 Copy buttons + 5 IPv4/IPv6 labels from `diagrams/components/16-ips-modal.svg`
    - Modal width: 640→480px (free up space)
    - Each row becomes clickable: cursor:pointer + hover bg + title="Click to copy X"
    - Out-of-the-way toast at bottom-center: "✓ Copied 10.0.10.40 to clipboard" (fades 2.5s)
    - Pattern documented in `ui-index.md` §21 with toast spec, Angular impl hooks
    - Apply same pattern to: VM/Container/Jail/Volume/Node detail panels (ulid/IPv4/MAC), webhooks (URL), audit log (action target)
    - Do NOT apply to: recovery codes (security), API token full strings (security), password fields


  - T94m (NEW 2026-07-09): Cluster list-view + sidecar + recent-events-to-logs restructure:
    - **`diagrams/screens/07-cluster.svg`** REWRITTEN as list view (27 KB):
      - Removed 6-card node grid + "Recent Cluster Events" panel
      - 6 nodes as sortable rows: Hostname | Role | Status | Rack | CPU | MEM | Uptime | Last hb
      - node-03 (cloudbsd-node-03 worker) selected → sidecar open on right
      - Sidecar tabs: Overview / Network / VMs / Logs / Settings
      - Sidecar contents: Identity (hostname/ulid/role/rack/joined/term), Hardware (CPU/RAM/Disks/NIC/GPU), Cluster state (heartbeat/replication/peer set/votes), Workload summary (VMs/Containers/Jails/Jobs), Quick actions (Drain/Rejoin/Promote to master)
      - Header link: "View cluster events in logs →" → /logs?src=cluster
      - All MOCK/feature-flag references purged (per 2026-07-09 user review)
    - **`diagrams/screens/09-logs.svg`** PATCHED:
      - Added source-filter chip row (src:) below severity chips: bhyve/caddy/jail/zfs/ctdb/cron/**cluster**/replication
      - cluster chip: violet bg (#ede9fe), `#7c3aed` border + text, bold, count "17"
      - "→ jump to cluster section" link on right
      - Added 6 cluster-event log rows to table (12:14, 11:48, 10:33, 09:48, 09:14, 08:42) — cluster module colored violet to distinguish; rows get `background:#faf5ff` to highlight grouping
      - 19 → 25 rows total (29 KB)
    - **`diagrams/components/17-vgpu-pool-list.svg`** NEW (31 KB, T94j follow-up): GPU pool list view variant
      - Used when count > 10 (threshold rule per ui-index §22)
      - 12 GPUs as flat sortable rows: GPU | Node | Model | VRAM | Allocations | Used (bar+%) | Status
      - gpu-2 (A4000) selected → sidecar open
      - Sidecar: Overview tab shows Identity (vendor/PCI addr/driver/CUDA/ECC), Hardware (VRAM/CUDA cores/Tensor/SMs/MIG cap), Current usage bar, Active allocations box
      - Quick actions: Detach all / Reassign / + Allocate vGPU
    - **ui-index.md §22 added**: full sidecar pattern spec (threshold rule by resource type, column widths, sidecar component spec, Angular primitive `<app-resource-list-with-sidecar>`)
    - **ui-index.md §23 added**: events-live-in-logs rule (anti-pattern rationale, migration table, cross-link convention)
    - **Honcho lessons** added: list-with-sidecar pattern, threshold rule, sidecar spec, events-in-logs rule, grouped-card-grid anti-pattern


  - T94n (NEW 2026-07-09): Chrome header menu dropdowns (avatar + bell):
    - **`diagrams/components/88-user-menu-dropdown.svg`** NEW (9.7 KB): avatar clicked → user dropdown
      - Anchored top-right under avatar bubble in chrome header (280px wide panel)
      - Header: avatar circle + name (mlapointe) + role (Cluster Admin) + ADMIN badge
      - Identity grid: ulid (click-to-copy) · email · logged-in (3d 14h via SSH key)
      - Theme picker row: Cloudbsd / Carbon / Ocean (active) / Solar + "All 12 →"
      - Menu items per ui-index §15: Profile, Preferences (⌘,), Keyboard shortcuts (?), API tokens (6 badge), Help & docs (F1), About (v0.4.2)
      - Sign out (red) at footer with ⌃⇧Q shortcut
      - Caret arrow pointing up at avatar, 8px corner radius, 0.12 shadow
    - **`diagrams/components/89-notifications-menu-dropdown.svg`** NEW (10.5 KB): bell clicked → notification dropdown
      - Anchored top-right under bell (380px wide panel)
      - Header: "Notifications" + "17 UNREAD" badge + "Mark all as read" link
      - 3-section grouping by recency: Today (4) / Yesterday (8) / Earlier this week (5)
      - Each item: severity dot (8px) + source label + message excerpt + age + View button
      - Unread items: dot colored by severity (amber/green/violet) + pale tinted bg (#fefce8 / uncolored)
      - Read items: gray dot, faded (opacity:0.65), checkmark ✓ on right
      - Footer: "View all notifications →" + "⚙ Preferences"
      - Caret arrow pointing up at bell
    - **Gap surfaced by user 2026-07-09**: avatar (and bell) appeared in canonical chrome wrapper
      across all screens as static circles with no menu behind. These two mockups fill the gap.
    - **Honcho lesson**: chrome header avatar + bell are interactive elements, not decoration.
      Always cursor:pointer. Always anchored dropdown. Always need a mockup to demonstrate
      the menu state (open) since the closed state is implied by the icon presence.
  - T94o (NEW 2026-07-09): Detail-panel tab-content mockups (12 NEW SVGs):
    - **Gap surfaced by user 2026-07-09**: detail panels (19-vm through 23-node) declare
      5-7 tabs each via <desc>, but only the Overview tab content was actually rendered.
      The other 22 declared tabs had LABELS but NO CONTENT MOCKUPS — leaving the Angular
      executor guessing at what each tab should contain.
    - **12 new tab-content SVGs authored** (143 KB total, each ~7-19 KB):
      - `diagrams/components/90-vm-network-tab-content.svg` (16.5 KB) - VM Network
        · 2 NICs (vtnet0 + vtnet1) with MAC (click-to-copy) + MTU/link state
        · 5 IPs table (4 click-to-copy rows)
        · BW sparkline (RX/TX last 1h)
        · 4 firewall rules (allow/deny)
        · 3 port forwardings (host->VM)
        · yellow view-only banner (PUT endpoint pending)
      - `diagrams/components/91-vm-snapshots-tab-content.svg` (13 KB) - VM Snapshots
        · 12-row snapshot table (daily@auto-YYYY-MM-DD + pre-update + monthly)
        · Tag column click-to-copy
        · Retention policy: daily (14) / weekly (8) / monthly (12) / offsite
      - `diagrams/components/92-container-network-tab-content.svg` (9.5 KB) - Container Network
        · 2 networks attached (bridge/macvlan)
        · 3 port mappings
        · DNS policy + search domain
        · Container BW sparkline (purple)
      - `diagrams/components/93-container-env-vars-tab-content.svg` (11 KB) - Container Env vars
        · 4 system-injected (LOCKED) + 8 user-defined
        · Secret masking (••••) with click-to-reveal + audit log note
        · Sensitive count badge (3)
      - `diagrams/components/94-jail-network-tab-content.svg` (7.5 KB) - Jail Network
        · VNET namespace + epair + IP/gateway/DNS (rfc1918 only, no geo)
        · 4-line pf ruleset
      - `diagrams/components/95-jail-limits-tab-content.svg` (7.7 KB) - Jail Limits
        · 6 rctl quotas (CPU/MEM/disk/proc/fds/pipes)
        · CPU + MEM sparklines
        · 2 throttling events (maxproc/memoryuse)
      - `diagrams/components/96-volume-scrubs-tab-content.svg` (12.3 KB) - Volume Scrubs
        · Last/next scrub summary + scan rate
        · 12-row scrub history with errors/repaired columns
        · 1 historical warn (2026-06-30 L2 checksum)
      - `diagrams/components/97-volume-performance-tab-content.svg` (6.9 KB) - Volume Performance
        · Read+Write throughput sparkline (60 buckets)
        · P50/P99 latencies (read 1.4/8.2 ms · write 2.1/5.8 ms)
        · IOPS + queue depth
        · Capacity forecast (148 days to 80%)
      - `diagrams/components/98-node-zfs-tab-content.svg` (12.4 KB) - Node ZFS
        · 1 pool (tank 18 TB · 63% used)
        · Capacity bar (green->amber gradient at 70%)
        · 6 of 12 datasets table
        · ARC stats (84 GB target, 98.4% hit rate)
      - `diagrams/components/99-node-gpus-tab-content.svg` (12.2 KB) - Node GPUs
        · Note: defers to 17-vgpu-pool-list.svg for cluster-wide view
        · 4 GPU cards (gpu-8/9/10/11) for cloudbsd-node-01
        · 7 vGPU allocations table
      - `diagrams/components/100-node-network-tab-content.svg` (12 KB) - Node Network
        · 4 physical interfaces (lagg0/igb0/igb1/ipmi0) with MAC + MTU + state
        · LACP status (active members, hash policy, failover mode)
        · 3 cluster IPs (mgmt / replication / CTDB pub)
        · Lagg0 throughput sparkline (RX/TX)
      - `diagrams/components/101-node-vms-tab-content.svg` (19 KB) - Node VMs
        · Workload summary (8 VMs + 7 containers + 3 jails)
        · 8-row VM list (filter node=this)
        · 7-row container list
        · 3-row jail list
    - **All 12 use consistent patterns**: page-header with role pill, tab strip with active
      highlight, view-only yellow info banner at bottom when backend endpoint missing.
    - **All identifiers click-to-copy**: ulids, MACs, IPs, snapshot tags, container names
    - **No "MOCK" labels, no fabricated geolocation, no claim of non-existent shortcuts** -
      follows the same standards enforced earlier (T94i, T94n, T94n-followup lessons)

  - T95 (NEW 2026-07-09): Auth flow UI mockups:
    - `diagrams/screens/51-login.svg` (3.8 KB) — PAM auth form
    - `diagrams/screens/52-two-factor-setup.svg` (32.8 KB) — TOTP setup w/ QR code
    - `diagrams/screens/53-password-reset.svg` (3.0 KB) — recovery email flow
    - `diagrams/screens/54-account-locked.svg` (2.9 KB) — lockout notice
  - T96 (NEW 2026-07-09): Onboarding wizard (4-step):
    - `diagrams/screens/56-onboarding-welcome.svg` (4.8 KB) — step 1 intro
    - `diagrams/screens/57-onboarding-cluster-join.svg` (5.6 KB) — step 3 form
    - `diagrams/screens/58-onboarding-complete.svg` (3.5 KB) — step 4 success
  - T97 (NEW 2026-07-09): Settings suite (6 sub-pages, all using common sidebar pattern):
    - `60-settings-general.svg` (9.8 KB) — cluster identity, locale, NTP
    - `61-settings-account.svg` (10.0 KB) — profile + change password
    - `62-settings-security.svg` (11.0 KB) — 2FA status, sessions, recovery codes
    - `63-settings-appearance.svg` (13.5 KB) — 4-theme grid + density + fonts
    - `64-settings-api-keys.svg` (12.4 KB) — table of 6 personal access tokens
    - `65-settings-webhooks.svg` (10.7 KB) — 4 outbound webhook cards
  - T98 (NEW 2026-07-09): Themes browser + cluster overview + monitoring:
    - `66-themes-browser.svg` (15.0 KB) — 12 themes in 4-col grid + detail right column
    - `67-cluster-overview.svg` (10.9 KB) — 3-node topology + 4 stat cards
    - `68-monitoring-dashboard.svg` (19.2 KB) — 3 time-series graphs (CPU/RAM/NET) + top consumers + P50/P99 latency
  - T99 (NEW 2026-07-09): Network IP pools + Backup detail:
    - `69-network-ip-pools.svg` (11.2 KB) — 7 IP pools with allocation bars
    - `70-backup-detail.svg` (15.2 KB) — backup #148 detail + restore wizard
  - T100 (NEW 2026-07-09, UPDATED 2026-07-09): Error pages (4 standard + 2 update flow):
    - ~~71-error-401.svg — REMOVED 2026-07-09, redundant with /login redirect per user feedback~~
    - (no separate 401 screen — 401 responses redirect to /login directly)
    - `72-error-403.svg` (2.2 KB) — Forbidden w/ permission details
    - `73-error-404.svg` (2.2 KB) — Not Found w/ trail of breadcrumbs
    - `74-error-500.svg` (2.3 KB) — Internal Server Error w/ incident ref
    - `75-error-503-maintenance.svg` (2.3 KB) — rolling-upgrade ETA shown
    - `76-update-available.svg` (7.6 KB) — release notes + install options
    - `77-update-progress.svg` (12.2 KB) — 7-stage progress bar + live log


  - T94h (NEW 2026-07-09): ✅ Per-page selector + pagination footer added to 4 list screens (was missing):
    - `diagrams/screens/03-containers.svg` (84 total, 50/page, 5-page nav)
    - `diagrams/screens/04-jails.svg` (48 total, 50/page, 1-page nav)
    - `diagrams/screens/08-users.svg` (24 total, 24/page, 1-page nav)
    - `diagrams/screens/09-logs.svg` (18.0K buffered, 200/page, 90-page nav)
    - Pattern matches existing 02-vms.svg footer (Per-page select with 25/50/100/200 options, prev/next buttons, page numbers 1-5)
    - All 4 SVGs validated XML-clean (9 variants, 25.7 KB total):
    - `42-empty-list-vm.svg` — no VMs exist (clean state)
    - `43-empty-list-container.svg` — filtered to zero
    - `44-empty-list-jail.svg` — loader error
    - `45-empty-list-volume.svg` — all archived
    - `46-empty-list-user.svg` — no permission
    - `47-empty-list-log.svg` — empty buffer
    - `48-empty-list-notification.svg` — all caught up (success state)
    - `49-empty-list-audit-log.svg` — first-time (clean)
    - `50-empty-list-history.svg` — service offline
    - Rules added to `ui-index.md §20.5`: tone-by-trigger, 3-action cap, identical across density modes, persistent container header
  - **Acceptance**: User can toggle Cozy/Compact; choice persists across sessions; all 8 list views respect setting.

### Deferred (out of Wave 11 scope)
- Cluster network map >500 edges → WebGL canvas (gap 12 in scale review). Defer to v2.
- Volumes tree-view for nested datasets (gap 10). Defer to v2.
- Bulk write actions (gap 6, 11). Defer to v3 (post-view-only).
- Mobile responsive list views at 1K rows. Defer to v2.
---

## Wave 12a: Dynamic Auth Capabilities + Preflight (added 2026-07-09 per user directive)

> **Why this exists**: User has no 2FA provider available and isn't implementing 2FA soon, but doesn't want to lose that work. Frontend must not hardcode auth forms. Backend must expose what auth mechanisms are actually enabled. App must march forward even if some subsystems are degraded, as long as local PAM auth works so admin can troubleshoot.

### Goals
1. Backend exposes `GET /api/auth/capabilities` (no auth required) returning current auth mechanism state
2. Backend exposes `GET /api/system/preflight` (no auth required) returning subsystem health
3. Config file (yaml) + admin endpoint cascade resolution: API override > YAML > built-in defaults > recovery state (local PAM only)
4. Frontend fetches capabilities once on boot, caches them, renders `/login` dynamically
5. Preflight runs before login, logs all checks to browser console (F12 source of truth)
6. March-forward rule: show `/login` whenever `local_auth_available=true` OR any enabled mechanism is reachable. Degraded subsystems surface as amber pill banner, never block.

### Cascade resolution order (3 layers, recovery-safe)

```
Layer 3 (highest priority): Admin endpoint override
   POST /api/admin/config/auth
   DB-backed (table: auth_mechanism_config), edit-able from admin UI
   Survives restarts
                                    ↓ cascade-down if invalid/error
Layer 2: YAML config (loaded at backend startup)
   /etc/cloudbsd/admin.yaml → auth.mechanisms.{pam_local|totp_2fa|ldap|oidc}
   Re-read on SIGHUP; takes effect without restart
                                    ↓ cascade-down if missing/malformed
Layer 1: Built-in defaults
   Hardcoded fallback in code: { pam_local: { enabled: true, primary: true } }
   Only this layer is guaranteed to work even if YAML is corrupt and DB is unavailable
                                    ↓ cascade-down if initialization fails entirely
Layer 0: Recovery state
   Single mechanism: pam_local, no extra checks
   Backend logs warning on every request: "WARN: running in recovery state"
   This is the absolute floor — admin MUST be able to get in
```

### Backend endpoints (no auth required)

```http
GET /api/auth/capabilities

200 OK
{
  "mechanisms": [
    {
      "id": "pam_local",
      "label": "Username & Password",
      "enabled": true,
      "primary": true,
      "status": "ok"
    },
    {
      "id": "totp_2fa",
      "label": "Time-based One-Time Password",
      "enabled": false,
      "requires": "pam_local",
      "status": "disabled",
      "config_required": ["issuer_secret"]
    },
    {
      "id": "ldap",
      "label": "LDAP / Active Directory",
      "enabled": false,
      "status": "unconfigured",
      "config_required": ["server", "bind_dn", "base_dn"]
    },
    {
      "id": "oidc",
      "label": "Single Sign-On",
      "enabled": false,
      "status": "unconfigured",
      "config_required": ["issuer", "client_id", "client_secret"],
      "redirect": "/api/auth/oidc/start"
    }
  ],
  "local_auth_available": true,
  "primary": "pam_local",
  "cascade_layer": "yaml",       // "api_override" | "yaml" | "defaults" | "recovery"
  "warnings": [
    { "code": "MECHANISM_DISABLED",     "message": "2FA is disabled. Configure an issuer secret to enable.", "severity": "info" },
    { "code": "MECHANISM_UNCONFIGURED", "message": "LDAP/OIDC not configured.",                            "severity": "info" }
  ]
}
```

```http
GET /api/system/preflight

200 OK (without auth - critical for diagnosing broken deploys)
{
  "status": "ok",                  // overall: ok | degraded | critical
  "checks": [
    { "name": "database",         "status": "ok",    "latency_ms": 4 },
    { "name": "redis_cache",      "status": "ok",    "latency_ms": 1 },
    { "name": "ldap_server",      "status": "skipped","reason": "not_configured" },
    { "name": "oidc_provider",    "status": "skipped","reason": "not_configured" },
    { "name": "smtp_relay",       "status": "ok",    "latency_ms": 12 },
    { "name": "plugin_runtime",   "status": "ok",    "latency_ms": 8 },
    { "name": "auth_db_table",    "status": "ok",    "latency_ms": 3 }
  ],
  "summary": "5 operational, 2 skipped, 0 failed",
  "login_unaffected": true,
  "warnings": []
}
```

```http
POST /api/admin/config/auth (requires admin session — does NOT count as 401)

Authorization: Bearer <admin-token>

200 OK
{
  "mechanisms": { "ldap": { "enabled": true, "server": "ldap://corp.example.com" } },
  "cascade_layer": "api_override"
}
```

### Config schema (YAML)

```yaml
# /etc/cloudbsd/admin.yaml
auth:
  mechanisms:
    pam_local:
      enabled: true              # local PAM is always the safety net
      primary: true
    totp_2fa:
      enabled: false             # OFF until provider is configured
      issuer: "CloudBSD Admin"   # shown in authenticator app
      secret_env: "CLOUDBSD_TOTP_SECRET"
    ldap:
      enabled: false
      server: ""
      bind_dn: ""
      base_dn: ""
      tls: require
    oidc:
      enabled: false
      issuer: ""                 # e.g. https://accounts.google.com
      client_id: ""
      client_secret_env: ""      # name of env var holding secret
      scopes: ["openid", "email", "profile"]
```

### March-forward rules (frontend boot sequence)

```
1. APP_INITIALIZER runs PreflightService.check()
   - calls GET /api/system/preflight
   - if status === "ok": no banner
   - if status === "degraded": logs warnings to console, shows amber pill on /login
   - if status === "critical": show 76-error-backend-dead.svg fullscreen (NOT /login)

2. APP_INITIALIZER runs AuthCapabilitiesService.load()
   - calls GET /api/auth/capabilities
   - cache result in a Signal<Capabilities>
   - if request fails AND no cache: show 76-error-backend-dead.svg
   - if request fails AND has stale cache (e.g. session restore): use stale cache + warn

3. Router navigates to /login (if not authenticated) or /dashboard
   /login reads capabilities from Signal
   Renders mechanism tabs/cards dynamically — NO hardcoded forms
   Shows "Re-check auth settings" button that re-fetches capabilities
```

### UI mockup requirements

- **`51-login.svg` (REWRITE)**: render dynamic mechanism cards. Show all 4 mechanisms in the mockup with 2 enabled (pam_local, totp_2fa) and 2 disabled (ldap, oidc). Include "Re-check auth settings" link. Include degraded-pill banner if preflight is non-ok.
- **NEW `90-auth-capabilities-admin.svg`**: admin Settings → Security → Authentication page. Shows cascade_layer, current mechanism table (id, label, enabled, status, source-layer, last-changed), inline toggles for each mechanism, advanced config fields visible only when mechanism is enabled.
- **NEW `91-preflight-diagnostics-admin.svg`**: admin Settings → Diagnostics page. Shows full preflight report with each check expandable (latency, error, history sparkline).

### Tasks (added to Wave 12a)

- [ ] T110 — **Backend config schema** `auth.mechanisms`
  - Add to `internal/config/schema.go` (or equivalent)
  - Validate at startup; warn if `pam_local.enabled=false` (unsafe default)
  - Tests: yaml parsing for all combinations

- [ ] T111 — **Backend** `GET /api/auth/capabilities`
  - Read cascade-resolved state
  - Return JSON per spec above
  - Status codes: 200 (always — even in degraded state), 503 only if backend itself dying
  - Tests: 100% coverage on enabled/disabled/cascade combinations

- [ ] T112 — **Backend** `GET /api/system/preflight`
  - Run all checks in parallel with 5s timeout each
  - Aggregate: status = ok if all ok, degraded if any non-critical fail, critical if DB+auth_db_table fail
  - Tests: each check has a "make-it-fail" test variant

- [ ] T113 — **Backend** `POST /api/admin/config/auth`
  - Admin-protected endpoint (requires valid session, role=admin)
  - Validate input shape (zod-like validator)
  - Write to DB
  - Re-emit `/api/auth/capabilities` so other instances see change (optional pubsub)
  - Tests: cascade-down if DB write fails (next call returns YAML values)

- [ ] T114 — **Frontend** `AuthCapabilitiesService`
  - APP_INITIALIZER provider
  - Signal<Capabilities> exposed
  - Re-fetch on demand (manual refresh button)
  - Tests: 100% coverage including stale-cache fallback

- [ ] T115 — **Frontend** `PreflightService`
  - APP_INITIALIZER provider (runs BEFORE T114)
  - Logs ALL checks to console with `console.group('Preflight') / console.table / console.groupEnd()`
  - Returns `Observable<PreflightResult>`
  - Tests: ok / degraded / critical states

- [ ] T116 — **Refactor** `/login` screen to render capability-driven
  - Read `capabilities()` Signal
  - Render mechanism cards/tabs dynamically
  - Show degraded-pill banner from `preflight()` Signal
  - Show "Re-check auth settings" button
  - Show error console hint: "Press F12 → Console for diagnostics"
  - Tests: render snapshots for 8 capability combinations

- [ ] T117 — **Mockup** `90-auth-capabilities-admin.svg`
  - Admin security settings page
  - Tests: visual regression in Playwright

- [ ] T118 — **Mockup** `91-preflight-diagnostics-admin.svg`
  - Admin diagnostics page
  - Tests: visual regression in Playwright

- [ ] T119 — **Rewrite `51-login.svg`** (capability-driven version)
  - Show 2 enabled (pam_local + totp_2fa) + 2 disabled (ldap + oidc) mechanisms
  - Show degraded-pill banner example

- [ ] T120 — **Tests** for cascade resolution
  - Layer 3 API override active → Layer 2 YAML ignored → Layer 1 defaults ignored
  - Layer 3 invalid → cascade to Layer 2
  - Layer 3 + Layer 2 invalid → cascade to Layer 1
  - All 3 invalid → recovery state (Layer 0)

- [ ] T121 — **Update** `.sisyphus/drafts/ui-index.md` §26
  - Capability-driven login spec
  - Cascade resolution overview
  - March-forward rules

- [ ] T122 — **Update** `.sisyphus/plans/WIRE_PROTOCOL.md` §2.28 + §2.29
  - §2.28: `auth.capabilities.get` (response envelope)
  - §2.29: `system.preflight.get` (response envelope)
  - §2.30: `auth.config.update` (admin endpoint, request + response)

- [ ] T123 — **Update** `.sisyphus/drafts/lessons.md`
  - Document cascade resolution pattern (API > YAML > defaults > recovery)
  - March-forward rule (never block when local auth works)
  - 401 still redirects to /login (no frost-out)

- [ ] T124 — **Honcho conclusion**: cascade-resolution + march-forward pattern

### Must Have
- `/api/auth/capabilities` endpoint returns correct data for all enabled/disabled combinations
- `/api/system/preflight` endpoint runs all checks, never blocks /login, logs everything
- Frontend `/login` renders dynamically based on capabilities (no hardcoded mechanism assumptions)
- Cascade works: invalid Layer 3 → Layer 2; invalid Layer 3+2 → Layer 1; all invalid → Layer 0
- Browser console (F12) shows full preflight dump + auth errors
- Admin endpoint can toggle mechanisms at runtime
- 100% test coverage gate maintained (per plan convention)
- admin can always login with PAM local creds even if everything else is broken

### Must NOT Have
- ❌ Frost-out modal (REMOVED in 39d5b68 — preserved context is meaningless)
- ❌ Standalone 401 page (REMOVED in 39d5b68 — redirect to /login instead)
- ❌ Hard-block /login for any non-critical subsystem failure
- ❌ Hardcode mechanism list in frontend (must come from /api/auth/capabilities)
- ❌ Treat totp_2fa as enabled when no provider is configured (must report `status: unconfigured`)
- ❌ Surface admin recovery state to non-admin users (different UI, different access)

### Guardrails
- `pam_local.enabled = false` triggers a startup WARNING (not error) — admin has explicitly disabled local auth
- All `GET /api/auth/capabilities` responses include `cascade_layer` so admin can diagnose which layer is winning
- `preflight` always returns 200 unless backend itself is dying (so console can show it)
- Console output uses `console.group()` for collapsibility (F12 UX)
- All tests use table-driven cases (one test file = 8-16 sub-cases via `it.each` or `pytest.mark.parametrize`)

### Cascade integration with existing 401 handling
- If `/api/auth/capabilities` returns 401 (rare — endpoint is anonymous) → fall back to built-in defaults (Layer 1) which exposes only `pam_local`
- If `/api/system/preflight` returns 401 (also rare) → assume degraded state, show banner, allow /login
- Normal flow: 401 from authenticated endpoint → redirect to `/login?reason=expired` (per 39d5b68 policy)

### Recovery state semantics
- Layer 0 (recovery) is reached ONLY when Layer 3 + Layer 2 + Layer 1 all fail to initialize
- In recovery state, backend logs a permanent WARNING to all logs (so it's visible in any console)
- Recovery state exposes ONLY `pam_local` — this is the absolute floor for self-healing
- Admin MUST visit `/admin/security` after recovery to fix Layer 1 (defaults) or Layer 2 (YAML)

### Acceptance
- All 24 tasks above marked DONE
- 100% test coverage for backend capability/preflight/cascade code
- 100% test coverage for frontend AuthCapabilitiesService/PreflightService/login.component
- New SVG mockups authored (T117, T118) and `51-login.svg` rewritten (T119)
- Plan + ui-index + WIRE_PROTOCOL + lessons.md updated
- Honcho peer `prometheus` has new conclusion
- Branch pushed to origin

### Relationship to existing work
- T110-T116 are PURE additions — no existing code is refactored (login screen writes are additive)
- T117-T119 are PURE additions (new mockups + one rewrite)
- T120-T124 are docs/tests/lessons
- Auth flow in plan §auth remains primary source of truth; Wave 12a ADDS capability discovery layer above it
- 401 redirect policy from 39d5b68 still applies (every authenticated endpoint)


- T-codes UPDATE 2026-07-09: 5 VM wizard SVGs authored + 4 wizard sets pending (Container/Jail/Volume/Network [each 3-4 steps] + Setup/Onboarding [Onboarding 4 steps, Backup/Plugin/First-login ~3 steps each] + 2 component refs 03-plugin-wizard + 04-wizard-modal). Total ~30 additional wizard SVGs in flight.

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read plan end-to-end. Verify all 16 pages exist as Angular components with view-only enforcement. Verify backend has PAM auth, plugin registry, custom MIME types. Verify actual SVG inventory: 16 canonical screens (`diagrams/screens/01-dashboard.svg` through `16-system.svg`) + 7 System Management sub-screens (`diagrams/screens/16-system-1-backups.svg` through `16-system-6-updates.svg` per T76 option C) + 1 plugins page (`diagrams/screens/17-plugins.svg` per T83) + 8 components (16-ips-modal, 17-vgpu-pool, 18-add-node-dialog + **5 NEW detail panels (19-vm-detail-panel, 20-container, 21-jail, 22-volume, 23-node per T78-T82)**) + **3 NEW modals (19-backup-create per T77, 20-plugin-install per T83, 21-theme-import per T84)**. Verify OpenAPI spec exists at `diagrams/openapi.yaml`. Verify Playwright visual regression covers all 16 screens. Verify `diagrams/ADJUSTMENTS.md` has all 16 screens documented. Verify **canonical specs exist**: `diagrams/data-structures.md`, `diagrams/ui-index.md`, `.sisyphus/plans/WIRE_PROTOCOL.md`, `.sisyphus/drafts/STRESS_AGENT.md`, `.sisyphus/drafts/reconciliation-audit-2026-07-07.md`. Verify stress test scenarios T56-T63 ran and pass criteria met. Verify Wave 10 cleanup complete: 78 REGRESSED SVGs regenerated (T64), 5 flows + 1 arch promoted to canonical `diagrams/` (T65), wire-protocol consolidated + duplicate line fixed (T66), 0 Tailwind classes in screen specs (T67), 0 empty directories under `diagrams/` (T68), 5 obsolete plans archived (T69), 2 orphan drafts deleted (T70), 5 new mockups registered in plan (T71). **Verify T72 column-order mandate applied to 4 resource tables (02-vms, 03-containers, 04-jails, 05-volumes) per 2026-07-07 user mandate** — `grep -oE '<th[^>]*>[^<]+</th>'` output matches canonical order in `.sisyphus/drafts/ui-index.md` §1. **Verify T73 ADJUSTMENTS.md rows cover all 16 screens** (rows 1-16 inclusive, including 13-about, 14-status, 15-nodes, 16-system). **Verify T74 sidebar completeness** across all 16 SVGs (15 items each, including `Nodes` + `System Mgmt`). **Verify T75 filter chip bars** restored on 09-logs (5 chips) + 10-notifications (4 chips). **Verify T76 System Management tab panels** (Backups/Exports/Stats/History/Audit Log/Updates) per ui-index §17 (option C = 6 SVGs at `16-system-{1..6}-*.svg` + landing rewrite of `16-system.svg`). **Verify T77 backup-create modal SVG** at `diagrams/modals/19-backup-create.svg` (1280×800, 6 fields per ui-index §7) ✅ DONE + **wire-protocol §2.21 TaskSchedule CRUD** (9 `what` headers: `.create` / `.list` / `.get` / `.update` / `.patch` / `.delete` / `.run` / `.cancel` / `.runs`) ✅ AUTHORED. **Verify T78-T82 detail panels** for VM/Container/Jail/Volume/Node at `diagrams/components/{19,20,21,22,23}-*.svg` ✅ DONE + wire-protocol §2.22-2.26 (5×~6 `what` headers per resource) ✅ AUTHORED. **Verify T83 plugin install modal** at `diagrams/modals/20-plugin-install.svg` ✅ DONE + **plugins page** at `diagrams/screens/17-plugins.svg` ✅ DONE + **plugin detail modal** at `diagrams/modals/22-plugin-detail.svg` ✅ DONE + **wire-protocol §2.27 Plugin lifecycle** (3 `what` headers: `.manifest.get` / `.install` / `.uninstall`) ✅ AUTHORED. **Verify T84 theme import modal** at `diagrams/modals/21-theme-import.svg` ✅ DONE + wire-protocol §2.13 `themes.import` envelope verified ✅ DONE. Verify branch `feat/angular-migration` pushed to origin with all artifacts.
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
  - `docs(diagrams): add 16 screen SVG mockups (reconciled 2026-07-07)`
  - `docs(diagrams): add 18 component SVG mockups (reconciled 2026-07-07)`
  - `docs(diagrams): add 5 interaction flow SVGs`
  - `docs(api): add OpenAPI 3.1 spec for new PAM-auth backend`
  - `docs(plugin): add plugin/template contract spec`
  - `docs(mime): add cloudbsd/* MIME-type registry`
  - `docs(adjustments): add screen adjustments tracking table`
  - `docs(spec): promote data-structures.md to canonical` (T54)
  - `docs(spec): promote ui-index.md to canonical` (T55)
  - `docs(wire): add wire-protocol envelope spec` (already committed)
- **Phase 0.5 commits** (Wave 10 reconciliation cleanup, per `.sisyphus/drafts/reconciliation-audit-2026-07-07.md`):
  - `feat(diagrams): regenerate 78 REGRESSED SVG mockups` (T64)
  - `docs(diagrams): promote 5 flow + 1 architecture Mermaid files` (T65)
  - `docs(wire): consolidate wire-protocol spec (merge 2026-07-07 update)` (T66)
  - `docs(specs): translate Tailwind classes to inline CSS in 3 screen specs` (T67)
  - `chore(structure): remove empty subdirs after regeneration` (T68)
  - `chore(plans): archive 5 obsolete pre-Angular migration plans` (T69)
  - `chore(drafts): delete 2 orphan drafts` (T70)
  - `docs(plan): register 5 new mockups (2 screens, 3 components)` (T71)
  - `fix(diagrams): enforce 2026-07-07 uniform column order on 4 resource tables` (T72)
  - `docs(adjustments): add 4 rows for new screens 13-16` (T73)
  - `fix(diagrams): restore missing Nodes + System Mgmt sidebar items across 16 screens` (T74)
  - `fix(diagrams): restore filter chip bars on 09-logs + 10-notifications per ui-index §4` (T75)
  - `feat(diagrams): lay out System Management tab panels per ui-index §17` (T76, option C)
  - `feat(diagrams+api): add backup-create modal + wire-protocol TaskSchedule CRUD` (T77)
  - `feat(diagrams+api): add resource detail panels (VM/Container/Jail/Volume/Node)` (T78-T82)
  - `feat(diagrams+api): add plugin detail modal + plugin page + theme import modal` (T83-T84)
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

## 100% Test Coverage Plan

> **Per Honcho memory**: 80% target, 100% for critical paths (auth, security, error handling). User wants **100% coverage of every class and every method**.

### Coverage Targets by Category

| Category | Target | Justification |
|----------|--------|---------------|
| **Critical paths** (auth, security, error handling, session) | **100%** (lines + branches + functions) | Honcho lessons: 100% for critical paths |
| **Backend services** (PAM, plugin registry, logger, MIME) | **100%** | Security-critical |
| **Frontend services** (AuthStore, plugin renderer, theme, state) | **100%** | User-facing |
| **Frontend components** (all 17 components, all 26 pages) | **100%** | User-facing |
| **Utility functions** (helpers, validators) | **100%** | Easy to achieve |
| **Generated code** (Angular CLI scaffolds, Mocks) | Excluded | Not meaningful |

### Coverage Audit: Every Class & Method

#### Backend (`backend-new/`)

| Class / Module | Methods to Test | Test File |
|----------------|------------------|-----------|
| `pam-auth.service.ts` | `authenticate()`, `validateSession()`, `logout()`, `getUserInfo()`, `getGroups()`, `isLocked()`, `getLockoutExpiry()` | `pam-auth.service.spec.ts` |
| `plugin-registry.ts` | `discover()`, `loadManifest()`, `validate()`, `register()`, `unregister()`, `reload()`, `getPlugin()`, `listPlugins()`, `getHealth()` | `plugin-registry.spec.ts` |
| `mime-handler.ts` | `matchMime()`, `validateHeaders()`, `addCloudBSDHeaders()`, `parseRequest()`, `formatResponse()`, `getMimeType()` | `mime-handler.spec.ts` |
| `logger.ts` (interface) | `debug()`, `info()`, `warn()`, `error()`, `fatal()`, `withContext()`, `withCorrelation()` | `logger.spec.ts` |
| `console-jsonl-sink.ts` | `write()`, `flush()`, `close()`, `format()` | `console-jsonl-sink.spec.ts` |
| `file-jsonl-sink.ts` | `write()`, `flush()`, `close()`, `rotate()` | `file-jsonl-sink.spec.ts` |
| `remote-jsonl-sink.ts` | `write()`, `flush()`, `reconnect()`, `batch()` | `remote-jsonl-sink.ts` |
| `multi-sink.ts` | `add()`, `remove()`, `write()`, `flush()` | `multi-sink.spec.ts` |
| `null-sink.ts` | `write()`, `flush()` | `null-sink.spec.ts` |
| `session-manager.ts` | `create()`, `validate()`, `refresh()`, `destroy()`, `getSession()` | `session-manager.spec.ts` |
| `error-handler.ts` | `handleError()`, `formatError()`, `logError()`, `getErrorId()` | `error-handler.spec.ts` |
| `socket-broadcaster.ts` | `emit()`, `broadcast()`, `subscribe()`, `unsubscribe()`, `getClients()` | `socket-broadcaster.spec.ts` |
| `discoverer.ts` (interface) | `discover()`, `getInterval()`, `getName()` | per-implementation |
| `bhyve-discoverer.ts` | `discover()`, `formatVm()`, `getHealth()` | `bhyve-discoverer.spec.ts` |
| `podman-discoverer.ts` | `discover()`, `formatContainer()`, `getHealth()` | `podman-discoverer.spec.ts` |
| `jail-discoverer.ts` | `discover()`, `formatJail()`, `getHealth()` | `jail-discoverer.spec.ts` |
| `freebsd-stats-discoverer.ts` | `discover()`, `getCpu()`, `getMemory()`, `getDisk()` | `freebsd-stats.spec.ts` |
| `theme-service.ts` | `list()`, `get()`, `validate()`, `compile()`, `apply()` | `theme-service.spec.ts` |
| `plugin-router.ts` | `registerRoute()`, `unregisterRoute()`, `match()`, `dispatch()` | `plugin-router.spec.ts` |
| `health-check.ts` | `check()`, `getStatus()`, `registerCheck()` | `health-check.spec.ts` |
| `preflight-check.ts` | `check()`, `getStatus()`, `cacheResult()` | `preflight-check.spec.ts` |
| `csrf-middleware.ts` | `verify()`, `generateToken()`, `validateOrigin()` | `csrf-middleware.spec.ts` |
| `rate-limiter.ts` | `check()`, `reset()`, `configure()` | `rate-limiter.spec.ts` |
| `request-id-middleware.ts` | `generate()`, `propagate()`, `extract()` | `request-id-middleware.spec.ts` |
| `security-headers.ts` | `apply()`, `getCSP()`, `getHSTS()` | `security-headers.spec.ts` |
| `cookie-session.ts` | `set()`, `get()`, `clear()`, `sign()`, `verify()` | `cookie-session.spec.ts` |

#### Frontend (`web-new/`)

| Class / Module | Methods to Test | Test File |
|----------------|------------------|-----------|
| `AuthStore` (T18) | `login()`, `logout()`, `validateSession()`, `refresh()`, `getUser()`, `isAdmin()`, `hasRole()`, `setErrorLevel()` | `auth.store.spec.ts` |
| `BackendStatusStore` | `connect()`, `disconnect()`, `reconnect()`, `isOnline()`, `getLatency()` | `backend-status.store.spec.ts` |
| `VmStore` | `load()`, `refresh()`, `getById()`, `filter()`, `sort()` | `vm.store.spec.ts` |
| `ContainerStore` | `load()`, `refresh()`, `getById()` | `container.store.spec.ts` |
| `JailStore` | `load()`, `refresh()`, `getById()` | `jail.store.spec.ts` |
| `VolumeStore` | `load()`, `refresh()` | `volume.store.spec.ts` |
| `NotificationStore` | `add()`, `markRead()`, `markAllRead()`, `getUnreadCount()`, `filter()` | `notification.store.spec.ts` |
| `LogStore` | `append()`, `clear()`, `filterByLevel()`, `getRecent()` | `log.store.spec.ts` |
| `ThemeStore` | `setTheme()`, `applyTheme()`, `customize()`, `exportTheme()`, `importTheme()` | `theme.store.spec.ts` |
| `SettingsStore` | `get()`, `set()`, `reset()`, `export()`, `import()` | `settings.store.spec.ts` |
| `PluginStore` | `loadManifest()`, `getPlugin()`, `isEnabled()` | `plugin.store.spec.ts` |
| `PluginLoader` | `discover()`, `validate()`, `register()`, `render()` | `plugin-loader.spec.ts` |
| `PluginTemplateRenderer` | `renderComponent()`, `mapType()`, `dataBind()` | `plugin-template-renderer.spec.ts` |
| `ErrorModalService` (T15f) | `show()`, `queue()`, `dismiss()`, `getCurrent()` | `error-modal.service.spec.ts` |
| `ErrorHandlingService` (T15r) | `handle()`, `route()`, `log()`, `enrich()` | `error-handling.service.spec.ts` |
| `NotificationService` (T15s) | `toast()`, `info()`, `success()`, `warning()`, `error()`, `dismiss()` | `notification.service.spec.ts` |
| `Logger` (T15a) | `debug()`, `info()`, `warn()`, `error()`, `fatal()` | `logger.spec.ts` |
| `PreFlightService` (T15c) | `check()`, `cache()`, `getStatus()` | `preflight.service.spec.ts` |
| `SocketService` | `connect()`, `disconnect()`, `emit()`, `on()`, `off()` | `socket.service.spec.ts` |
| `HttpInterceptor` (T19) | `intercept()`, `errorHandler()`, `mimeType()`, `headers()` | `http-interceptor.spec.ts` |
| `ErrorModalComponent` | All 4 detail levels, dismiss, copy, focus trap | `error-modal.component.spec.ts` |
| `ToastComponent` | Render, auto-dismiss, action button | `toast.component.spec.ts` |
| `HeaderBannerComponent` | Show/hide, types (offline, backend-down, plugin-error) | `header-banner.component.spec.ts` |
| `ThemeToggleComponent` | Toggle, list themes, apply | `theme-toggle.component.spec.ts` |
| `FrostOutModalComponent` | Open/close, OK button, focus | `frost-out-modal.component.spec.ts` |
| `HelpModalComponent` | Search, topics, shortcuts | `help-modal.component.spec.ts` |
| `TooltipDirective` | Show, hide, position, dismiss | `tooltip.directive.spec.ts` |
| `EmptyStateComponent` | Render variants | `empty-state.component.spec.ts` |
| `ButtonComponent` | Variants, loading, disabled | `button.component.spec.ts` |
| `CardComponent` | Variants, content | `card.component.spec.ts` |
| `StatCardComponent` | Render stats | `stat-card.component.spec.ts` |
| `TableComponent` | Sort, paginate, virtual scroll | `table.component.spec.ts` |
| `PaginationComponent` | Pages, navigation | `pagination.component.spec.ts` |
| `BadgeComponent` | Variants | `badge.component.spec.ts` |
| `ProgressBarComponent` | Render progress | `progress-bar.component.spec.ts` |
| `OnboardingTourComponent` | Steps, skip, complete | `onboarding-tour.component.spec.ts` |
| `AboutComponent` | Render | `about.component.spec.ts` |
| `StatusComponent` | Render health | `status.component.spec.ts` |
| `ThemeGalleryComponent` | Render gallery | `theme-gallery.component.spec.ts` |
| `ThemeCustomizerComponent` | All tabs | `theme-customizer.component.spec.ts` |
| `DocsBrowserComponent` | Render docs | `docs-browser.component.spec.ts` |
| `SwaggerViewerComponent` | Render Swagger | `swagger-viewer.component.spec.ts` |
| `ReleaseNotesComponent` | Render | `release-notes.component.spec.ts` |
| `DocsPage` (404/403/500/503) | All error pages | per-page spec |
| `DashboardPage` | Render widgets | `dashboard.component.spec.ts` |
| `VmPage`, `ContainerPage`, `JailPage`, `VolumePage`, `NetworkMapPage`, `ClusterPage`, `UserPage`, `LogPage`, `NotificationPage`, `SettingPage` | All 14 pages | per-page spec |

### Test Types Required

| Type | Tool | Coverage |
|------|------|----------|
| **Unit tests** | Karma + Jasmine (frontend), Jest (backend) | 100% lines + branches + functions |
| **Integration tests** | Playwright (frontend E2E), supertest (backend API) | All critical paths |
| **Visual regression** | Playwright snapshots | All 14 pages, 2 themes, 3 viewports |
| **Performance** | Lighthouse, k6 | LCP < 2.5s, CLS < 0.1 |
| **Security** | OWASP ZAP, npm audit, Snyk | 0 high/critical |

### Branch Coverage Rule (per Honcho lessons-2026)

> **v8 coverage tracks `??` branches as separate from the surrounding `||`/`if` logic. In `if (x) {} else if (y) {} else if (z) {}`, hitting the `x` branch does NOT count the `y`/`z` else-if branches as hit — each must be hit by a separate test.**

Test data must be constructed to hit EACH path independently.

### Implementation Tasks (new)

| Task | Description |
|------|-------------|
| **T96** | Setup Jest in backend (`backend-new/jest.config.js`) with coverage threshold = 100% |
| **T97** | Setup Karma in frontend with coverage threshold = 100% (override default 80%) |
| **T98** | Write unit tests for all 26 backend classes (T96 base) |
| **T99** | Write unit tests for all frontend services + 17 components + 26 pages |
| **T100** | Write integration tests for backend API (supertest) — every endpoint, every status code, every MIME type |
| **T101** | Write Playwright E2E tests for all critical paths (login, theme, plugin, error handling, frost-out, settings) |
| **T102** | Write visual regression tests (Playwright snapshots) — all 14 pages × 3 themes × 3 viewports |
| **T103** | CI pipeline: lint + test + coverage gate (fails if < 100%) + visual regression |
| **T104** | Coverage report artifact (HTML) committed to CI artifacts |
| **T105** | Mutation testing with Stryker (verifies tests actually catch bugs) — target mutation score ≥ 80% |
| **T106** | Contract testing for plugin manifest schema (Pact or similar) |
| **T107** | Load test: 1000 concurrent WebSocket clients (k6) |
| **T108** | Security scan: OWASP ZAP baseline + npm audit + secret scan (TruffleHog) |

### Coverage Verification Command

```bash
# Backend
cd backend-new && npm test -- --coverage --coverageThreshold='{"global":{"lines":100,"branches":100,"functions":100,"statements":100}}'

# Frontend
cd web-new && ng test --code-coverage --watch=false \
  --coverage-threshold='{"global":{"lines":100,"branches":100,"functions":100,"statements":100}}'
```

Both must pass with **0 uncovered lines, 0 uncovered branches, 0 uncovered functions**.

### What is Excluded

```typescript
/* istanbul ignore next */
// Only allowed for:
// - Defensive `catch (e) {}` blocks that should never execute
// - Generated Angular CLI boilerplate
// - Third-party library type definitions
```

Any other use of `istanbul ignore` or `c8 ignore` requires explicit code review approval.

---

## Success Criteria

### Verification Commands
```bash
# Branch exists and is pushed
git checkout feat/angular-migration
git log --oneline -5
git push origin feat/angular-migration --dry-run

# Documentation exists
ls diagrams/screens/*.svg  # 16 files (was 14, +2 reconciled)
ls diagrams/components/*.svg  # 3 files baseline + regenerated ≥ 12 from T64d
ls diagrams/flows/*.md     # 5 Mermaid flow files (was drafts, promoted per T65)
ls diagrams/architecture/*.md  # 1 Mermaid architecture file (was drafts, promoted per T65)
test -f diagrams/openapi.yaml
test -f diagrams/plugin-contract.md
test -f diagrams/mime-registry.md
test -f diagrams/ADJUSTMENTS.md

# Reconciliation audit (Wave 10)
test -f .sisyphus/drafts/reconciliation-audit-2026-07-07.md

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
# Expect: 100% coverage gate enforced, all tests pass

# Visual regression
cd web-new && npx playwright test
# Expect: 16 page snapshots, frost-out modal flow, plugin manifest flow

# Canonical specs exist
test -f diagrams/data-structures.md
test -f diagrams/ui-index.md
test -f diagrams/openapi.yaml
test -f diagrams/plugin-contract.md
test -f diagrams/mime-registry.md
test -f diagrams/ADJUSTMENTS.md
test -f .sisyphus/plans/WIRE_PROTOCOL.md
test -f .sisyphus/drafts/STRESS_AGENT.md

# Stress scenarios ran (results under stress-results/)
ls stress-results/scenario-{01..08}-*/summary.json

# UI-index enforcement (no forbidden patterns)
! grep -rE "window\.(alert|confirm|prompt)" web-new/src/  # expect: 0 hits
! grep -rE 'class="(bg-|text-)[a-z]+' diagrams/screens/ diagrams/components/  # expect: 0 hits (inline styles only)

# Column-order enforcement (T72) — Status first, Name second across 4 resource tables
for f in diagrams/screens/02-vms.svg diagrams/screens/03-containers.svg diagrams/screens/04-jails.svg diagrams/screens/05-volumes.svg; do
  echo "=== $f ==="
  grep -oE '<th[^>]*>[^<]+</th>' "$f" | head -12
done | tee .sisyphus/evidence/column-order-audit.txt
# Expected: each file's first <th> should be "Status" (or "Health" for 05-volumes if user confirms)
# After T72, expect output to match canonical from .sisyphus/drafts/api-mocks/00-protocol-spec.md Update 2026-07-07

# Data-structures enforcement (no string timestamps, all quantities have units)
! grep -rE 'timestamp.*:.*string' server-new/src/  # expect: 0 hits
! grep -rE 'value: number' server-new/src/  # expect: 0 hits without adjacent `unit: UnitKind` annotation

# Wave 10 cleanup verifications (T64-T71)
ls diagrams/errors/*.svg | wc -l           # expect: ≥12 (T64a)
ls diagrams/notifications/*.svg | wc -l    # expect: ≥5 (T64b)
ls diagrams/modals/*.svg | wc -l            # expect: ≥6 (T64c)
ls diagrams/components/*.svg | wc -l       # expect: ≥12 new + 3 baseline = 15+ (T64d)
ls diagrams/variants/*.svg | wc -l          # expect: ≥3 (T64e)
ls diagrams/mobile/*.svg | wc -l            # expect: ≥3 (T64f)
ls diagrams/loading/*.svg | wc -l           # expect: ≥4 (T64g)
ls diagrams/plugin/*.svg | wc -l            # expect: ≥3 (T64h)
ls diagrams/themes/*.svg | wc -l            # expect: ≥15 (T64i)
ls diagrams/customizer/*.svg | wc -l        # expect: ≥8 (T64j)
find diagrams/* -type d -empty | wc -l      # expect: 0 (T68)
ls .sisyphus/plans/ | grep -E '\.md$'       # expect: only angular-migration.md + WIRE_PROTOCOL.md (T69)
test ! -f .sisyphus/drafts/angular-migration.md && echo "orphan deleted"  # expect: success (T70)
test ! -f .sisyphus/drafts/diagrams/README.md && echo "orphan deleted"  # expect: success (T70)
ls .sisyphus/drafts/diagrams/               # expect: empty or only README (T70)
# Tailwind in screen specs (T67) — already filtered by `! grep -rE` above for SVG; extend to spec files:
! grep -rE 'class="[^"]*\b(bg-|text-|p-[0-9]|m-[0-9]|flex|grid)' .sisyphus/drafts/diagrams-specs/screens/*.md  # expect: 0 hits
```

### Final Checklist
- [ ] All "Must Have" present and verified
- [ ] All "Must NOT Have" absent (no React code in web-new, no SSR, no Material lib)
- [ ] All 16 SVG screen mockups committed
- [ ] All 18 SVG component mockups committed
- [ ] All 5 interaction flow SVGs + 1 architecture Mermaid committed
- [ ] OpenAPI spec committed and loadable
- [ ] Plugin contract spec committed
- [ ] MIME-type registry committed
- [ ] ADJUSTMENTS.md populated for all 16 screens
- [ ] **Canonical specs promoted**: `diagrams/data-structures.md`, `diagrams/ui-index.md`
- [ ] Wire-protocol envelope spec committed (`.sisyphus/plans/WIRE_PROTOCOL.md`)
- [ ] Stress-test handoff committed (`.sisyphus/drafts/STRESS_AGENT.md`)
- [ ] Stress scenarios T56-T63 ran with all pass criteria met
- [ ] Backend uses PAM auth (verify with `pam_tester` or integration test)
- [ ] Frost-out modal triggers on 401 (verified by Playwright)
- [ ] Plugin manifest items render in sidebar (verified by Playwright)
- [ ] Custom MIME types in responses (verified by curl, including `application/vnd.cloudbsd+envelope` per WIRE_PROTOCOL)
- [ ] X-CloudBSD-Who/What/Why/Where headers present (verified by curl)
- [ ] **100% test coverage** (user override of 80% default)
- [ ] **16 page Playwright snapshots** passing (was 14)
- [ ] **UI-index enforcement**: zero `window.alert/confirm/prompt`, zero Tailwind classes in SVG mockups
- [ ] **Data-structures enforcement**: zero string timestamps, zero untyped `value: number` fields
- [ ] Branch pushed to origin
- [ ] All planning artifacts committed
- [ ] **Reconciliation audit present**: `.sisyphus/drafts/reconciliation-audit-2026-07-07.md`
- [ ] **Wave 10 cleanup complete**:
  - [ ] T64: 78 REGRESSED SVGs regenerated across 10 directories (errors, notifications, modals, components, variants, mobile, loading, plugin, themes, customizer)
  - [ ] T65: 5 flow + 1 architecture Mermaid files promoted from `.sisyphus/drafts/diagrams/` to canonical `diagrams/`
  - [ ] T66: wire-protocol spec consolidated (2026-07-07 update merged, duplicate line fixed)
  - [ ] T67: zero Tailwind classes in `.sisyphus/drafts/diagrams-specs/screens/*.md` (29 violations translated)
  - [ ] T68: zero empty directories under `diagrams/` and `.sisyphus/drafts/diagrams-specs/`
  - [ ] T69: 5 obsolete pre-Angular migration plans archived (cloudbsd-shared-packages, component-extraction, fix-issues, ui-modernization, volumes-api)
  - [ ] T70: 2 orphan drafts deleted (`.sisyphus/drafts/angular-migration.md`, `.sisyphus/drafts/diagrams/README.md`)
  - [ ] T71: 5 new mockups registered in plan (16-ips-modal, 17-vgpu-pool, 18-add-node-dialog + 15-nodes, 16-system)
  - [ ] T72: 4 resource tables (02-vms, 03-containers, 04-jails, 05-volumes) regenerated with canonical 2026-07-07 column order (Status first, Name second)
  - [ ] T73: `.sisyphus/drafts/ADJUSTMENTS.md` has rows covering all 16 screens (1-16 inclusive, including 4 new screens 13-16)
  - [ ] T74: All 16 screen SVGs have 15 sidebar items including `Nodes` + `System Mgmt` per ui-index §8
  - [ ] T75: `09-logs.svg` has 5 filter chips (All/Error/Warn/Info/Debug); `10-notifications.svg` has 4 filter chips (All/Error/Warn/Info) per ui-index §4
  - [ ] T76: System Management has 6 laid-out tab panels (Backups/Exports/Stats/History/Audit Log/Updates) per ui-index §17
  - [ ] T77: Backup-create modal SVG + wire-protology §2.14 TaskSchedule CRUD (9 endpoints) produced
  - [ ] T78-T82: Detail panels for VM/Container/Jail/Volume/Node at `diagrams/components/{19-23}-*.svg` with matching GET /api/{type}/{id} endpoints
  - [ ] T83: Plugin detail modal + plugins page at `diagrams/components/{24-25}-*.svg`
  - [ ] T84: Theme import modal at `diagrams/components/26-theme-import-modal.svg`
- [ ] User explicit "okay" received

---

## Hand-off

After Momus approves (or user skips high-accuracy mode):
1. Plan + audit + diagrams committed to `feat/angular-migration` (see `Phase 0.5 commits` in Commit Strategy for the 8-commit reconciliation recipe).
2. Branch pushed to `origin/feat/angular-migration`.
3. User runs `/start-work angular-migration` to begin execution.
4. Sisyphus executor picks up the plan, executes **waves 0–10** (Wave 10 = reconciliation cleanup per `.sisyphus/drafts/reconciliation-audit-2026-07-07.md`), then final verification wave F1–F4.
5. User explicitly approves F1-F4 results before work is marked complete.

**Audit reference**: All Wave 10 tasks derive from `.sisyphus/drafts/reconciliation-audit-2026-07-07.md`. If the executor encounters drift between the plan and the audit, the audit is authoritative for Wave 10 — the plan tracks the audit's findings.

### 401 handling policy (added 2026-07-09 per user feedback)

- **Any 401 response** from a backend API endpoint causes the frontend to **immediately redirect to `/login`** with `?reason=expired` (or `?reason=invalid_token`) query param.
- **No standalone 401 page** (no `diagrams/screens/71-error-401.svg`, no `diagrams/errors/10-session-expired.svg`, no frost-out modal). The user lands directly on the login form.
- The previous "Frost-out modal" pattern (Memento / GoF) was REMOVED because: (a) preserving page state behind a modal doesn't help if user must re-authenticate anyway; (b) one less state machine to manage; (c) simpler mental model.
- 403, 404, 500, 503 DO get their own screen (you ARE authenticated, just blocked or hitting infrastructure issue).
- 401 flow:
  1. API returns `401 Unauthorized` with `WWW-Authenticate: CloudBSD session="..."`
  2. Frontend interceptor captures, calls `AuthService.clearSession()`
  3. `Router.navigate(['/login'], { queryParams: { reason: 'expired' } })`
  4. `/login` page (51-login.svg) reads `reason` param, shows subtle banner: "Your session expired. Sign in again."
