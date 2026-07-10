# CloudBSD Admin — Screen Adjustments Table

This table documents every screen adjustment made during the React → Angular migration planning phase. Adjustments are corrections to the original React screens based on user feedback, security review, view-only enforcement, and UX improvements.

**Legend**:
- ➕ ADDED — new screen/component
- ❌ REMOVED — deleted from old version
- 🔄 CHANGED — modified behavior/layout
- ⚠️ VIEW-ONLY — write UI hidden (per user requirement)
- 🔒 ADMIN-ONLY — restricted to admin role
- 🌐 i18n — translation considerations

---

## Original React Screens → New Angular Screens

| # | Original (React) | New (Angular) | Status | Adjustment | Rationale |
|---|---|---|---|---|---|
| 1 | `Dashboard.tsx` | `pages/dashboard/` | 🔄 CHANGED | Split into widgets (CPU, Memory, Disk, Network, Notifications) as plugin-renderable cards | Better composition, plugin-friendly |
| 1a | (none) | `widgets/cpu.widget.ts` | ➕ ADDED | New CPU usage widget with sparkline | User wanted better visualization |
| 1b | (none) | `widgets/memory.widget.ts` | ➕ ADDED | New memory widget with breakdown | User wanted better visibility |
| 1c | (none) | `widgets/disk.widget.ts` | ➕ ADDED | Disk I/O widget with throughput | User wanted better visualization |
| 1d | (none) | `widgets/network.widget.ts` | ➕ ADDED | Network throughput widget | User wanted better visualization |
| 1e | (none) | `widgets/notifications.widget.ts` | ➕ ADDED | Recent notifications summary | Better UX |
| 2 | `Bhyve.tsx` (VMs) | `pages/vms/` | 🔄 CHANGED | Renamed "Bhyve" → "VMs" (generic) | More user-friendly terminology |
| 2a | VM action buttons (Start/Stop/Delete) | `pages/vms/` | ⚠️ VIEW-ONLY | All write buttons hidden | View-only enforcement |
| 2b | VM console (noVNC) | `pages/vms/console/` | 🔄 CHANGED | Replaced noVNC with xterm.js for console | Lighter, more compatible |
| 3 | `Containers.tsx` (OCI) | `pages/containers/` | 🔄 CHANGED | Renamed "OCI" → "Containers" | More user-friendly |
| 3a | Container action buttons | `pages/containers/` | ⚠️ VIEW-ONLY | All write buttons hidden | View-only enforcement |
| 4 | `Jails.tsx` | `pages/jails/` | 🔄 CHANGED | Improved status indicators (running/stopped/frozen) | Better UX |
| 4a | Jail action buttons | `pages/jails/` | ⚠️ VIEW-ONLY | All write buttons hidden | View-only enforcement |
| 5 | `Volumes.tsx` (largest) | `pages/volumes/` | 🔄 CHANGED | Pagination added (was loading all) | Performance |
| 5a | Volume action buttons | `pages/volumes/` | ⚠️ VIEW-ONLY | All write buttons hidden | View-only enforcement |
| 5b | (none) | `pages/volumes/usage-chart/` | ➕ ADDED | Disk usage chart per volume | Better visibility |
| 6 | `NetworkMap.tsx` | `pages/network/` | 🔄 CHANGED | React Flow → `@xyflow/angular` | Angular-native |
| 6a | (none) | `pages/network/legend/` | ➕ ADDED | Network map legend | Better discoverability |
| 7 | `Users.tsx` (Admin) | `pages/users/` | 🔄 CHANGED | Moved to admin-only, integrated with PAM | Security |
| 7a | User create/edit forms | (none) | ❌ REMOVED | Users managed via PAM (`useradd`, etc.) | View-only |
| 7b | (none) | `pages/users/pam-status/` | ➕ ADDED | PAM account status display | Better visibility |
| 8 | `Logs.tsx` (Admin) | `pages/logs/` | 🔄 CHANGED | JSONL format with structured fields | User requirement |
| 8a | Plain text logs | `pages/logs/` | 🔄 CHANGED | JSONL → human-readable via structured renderer | Better UX |
| 8b | (none) | `pages/logs/filter/` | ➕ ADDED | Advanced log filtering (level, module, time) | Better UX |
| 8c | (none) | `pages/logs/follow/` | ➕ ADDED | Tail-style log following | UX parity with `tail -f` |
| 9 | `Notifications.tsx` | `pages/notifications/` | 🔄 CHANGED | Grouped by severity (info/warn/error) | Better UX |
| 9a | (none) | `pages/notifications/severity-filter/` | ➕ ADDED | Severity-based filtering | Better UX |
| 10 | `Settings.tsx` | `pages/settings/` | 🔄 CHANGED | Tabbed layout (General, Theme, Language, Error Display, Admin) | Better organization |
| 10a | (none) | `pages/settings/error-display/` | ➕ ADDED | Error detail level setting (Minimal/Standard/Detailed/Debug) | User requirement |
| 10b | (none) | `pages/settings/theme/` | ➕ ADDED | Theme picker with 15 themes | User requirement |
| 10c | (none) | `pages/settings/theme-customizer/` | ➕ ADDED | Theme editor with 6 tabs | User requirement |
| 10d | (none) | `pages/settings/theme-import-export/` | ➕ ADDED | Theme `.cbsd-theme.json` import/export | User requirement |
| 10e | (none) | `pages/settings/admin/` | ➕ ADDED | Admin-only settings (help analytics, plugin permissions) | Security |
| 11 | (none) | `pages/login/` | ➕ ADDED | Login page with PAM auth | New design |
| 11a | (none) | `pages/login/help-links/` | ➕ ADDED | Forgot password / Why PAM / First time links | User requirement |
| 12 | `Cluster.tsx` | `pages/cluster/` | 🔄 CHANGED | React Flow → `@xyflow/angular`, plugin-renderable | Angular-native + plugin-friendly |
| 13 | `ConsoleModal.tsx` | `pages/console-modal/` | 🔄 CHANGED | xterm.js (was xterm.js in React too, but moved to service) | Better reuse |
| 14 | (none) | `pages/about/` | ➕ ADDED | About page with version, license, docs links | New requirement |
| 15 | (none) | `pages/status/` | ➕ ADDED | Status/health page (backend, plugins, build) | New requirement |
| 16 | (none) | `pages/help/` | ➕ ADDED | Help modal with search/topics/shortcuts | User requirement |
| 17 | (none) | `pages/docs/` | ➕ ADDED | In-app documentation browser | User requirement |
| 18 | (none) | `pages/api-docs/` | ➕ ADDED | Embedded Swagger UI | User requirement |
| 19 | (none) | `pages/release-notes/` | ➕ ADDED | In-app changelog viewer | User requirement |
| 20 | (none) | `pages/errors/not-found/` | ➕ ADDED | Friendly 404 page | User requirement |
| 21 | (none) | `pages/errors/forbidden/` | ➕ ADDED | Friendly 403 page | User requirement |
| 22 | (none) | `pages/errors/server-error/` | ➕ ADDED | Friendly 500 page | User requirement |
| 23 | (none) | `pages/errors/service-unavailable/` | ➕ ADDED | Friendly 503 page | User requirement |
| 24 | (none) | `pages/errors/frost-out/` | ➕ ADDED | Session validation failure (frosted page, OK → login) | User requirement |
| 25 | (none) | `pages/plugins/` | ➕ ADDED | Plugin management page (SVG: `diagrams/screens/17-plugins.svg`) | Plugin system |
| 26 | (none) | `pages/plugins/<name>/docs/` | ➕ ADDED | Per-plugin documentation viewer | Plugin system |
| 27 | (none) | `pages/system-mgmt/` | ➕ ADDED | System Management landing (SVG: `diagrams/screens/16-system.svg` rewrite) | Admin consolidation |
| 28 | (none) | `pages/system-mgmt/backups/` | ➕ ADDED | System Mgmt · Backups tab (SVG: `16-system-1-backups.svg`) | T76 option C |
| 29 | (none) | `pages/system-mgmt/exports/` | ➕ ADDED | System Mgmt · Exports tab (SVG: `16-system-2-exports.svg`) | T76 option C |
| 30 | (none) | `pages/system-mgmt/stats/` | ➕ ADDED | System Mgmt · Stats tab with 4 sparklines (SVG: `16-system-3-stats.svg`) | T76 option C |
| 31 | (none) | `pages/system-mgmt/history/` | ➕ ADDED | System Mgmt · History tab timeline (SVG: `16-system-4-history.svg`) | T76 option C |
| 32 | (none) | `pages/system-mgmt/audit-log/` | ➕ ADDED | System Mgmt · Audit Log tab (SVG: `16-system-5-audit-log.svg`) | T76 option C |
| 33 | (none) | `pages/system-mgmt/updates/` | ➕ ADDED | System Mgmt · Updates tab (SVG: `16-system-6-updates.svg`) | T76 option C |
| 34 | (none) | `pages/vms/<id>/` (detail) | ➕ ADDED | VM detail panel SVG (7 tabs, `19-vm-detail-panel.svg`) | T78 right-side drill-down |
| 35 | (none) | `pages/containers/<id>/` (detail) | ➕ ADDED | Container detail panel SVG (5 tabs, `20-container-detail-panel.svg`) | T79 right-side drill-down |
| 36 | (none) | `pages/jails/<id>/` (detail) | ➕ ADDED | Jail detail panel SVG (5 tabs, `21-jail-detail-panel.svg`) | T80 right-side drill-down |
| 37 | (none) | `pages/volumes/<id>/` (detail) | ➕ ADDED | Volume detail panel SVG (6 tabs, `22-volume-detail-panel.svg`) | T81 right-side drill-down |
| 38 | (none) | `pages/nodes/<id>/` (detail) | ➕ ADDED | Node detail panel SVG (7 tabs, `23-node-detail-panel.svg`) | T82 right-side drill-down |
| 39 | (none) | `modals/backup-create/` | ➕ ADDED | Backup-create modal SVG (6 fields, `diagrams/modals/19-backup-create.svg`) | T77a |
| 40 | (none) | `modals/plugin-install/` | ➕ ADDED | Plugin install modal SVG (3 tabs, `diagrams/modals/20-plugin-install.svg`) | T83a |
| 41 | (none) | `modals/plugin-detail/` | ➕ ADDED | Plugin detail modal SVG (manifest/capabilities/permissions, `diagrams/modals/22-plugin-detail.svg`) | T83c |
| 42 | (none) | `modals/theme-import/` | ➕ ADDED | Theme import modal SVG (3-tab URL/Paste/Upload, `diagrams/modals/21-theme-import.svg`) | T84a |
| 43 | (none) | `components/compact-list-vm/` | ➕ ADDED | Compact density list component SVG (20 rows in single viewport, `diagrams/components/24-compact-list-vm.svg`) | T94 compact-mode toggle |

---

## Components → Components

| Original (React) | New (Angular) | Status | Adjustment | Rationale |
|---|---|---|---|---|
| `Sidebar.tsx` | `components/sidebar/` | 🔄 CHANGED | Menu items now loaded from plugin registry | Plugin-friendly |
| `TopBar.tsx` | `components/topbar/` | 🔄 CHANGED | Added help icon, status indicator, theme switcher | New features |
| `UserMenu.tsx` | `components/user-menu/` | 🔄 CHANGED | Logout triggers frost-out modal on session validation failure | Security |
| `NotificationToast.tsx` | `components/notifications/toast/` | 🔄 CHANGED | Replaced react-toastify with CDK Overlay | Angular-native |
| `Modal.tsx` | `components/modal/` | 🔄 CHANGED | CDK Dialog instead of custom modal | Angular-native |
| `Button.tsx` | `components/button/` | 🔄 CHANGED | Tailwind variants + loading state | Consistency |
| `Card.tsx` | `components/card/` | 🔄 CHANGED | Tailwind, used by plugin template renderer | Plugin-friendly |
| `Table.tsx` | `components/table/` | 🔄 CHANGED | CDK Table, virtual scroll for large lists | Performance |
| `Chart.tsx` (chart.js) | `components/chart/` | 🔄 CHANGED | ngx-charts (Angular-native chart.js wrapper) | Angular-native |
| `FlowDiagram.tsx` (react-flow) | `components/flow/` | 🔄 CHANGED | `@xyflow/angular` | Angular-native |
| `Console.tsx` (xterm.js) | `components/console/` | 🔄 CHANGED | Wrapped as Angular component, reused across pages | Reuse |
| (none) | `components/error-display/` | ➕ ADDED | Configurable error display (4 levels: Minimal/Standard/Detailed/Debug) | User requirement |
| (none) | `components/tooltip/` | ➕ ADDED | Contextual tooltips via CDK Overlay | User requirement |
| (none) | `components/empty-state/` | ➕ ADDED | Reusable empty state with help link | User requirement |
| (none) | `components/theme-switcher/` | ➕ ADDED | Quick theme picker in header | User requirement |
| (none) | `components/help-icon/` | ➕ ADDED | Inline help icon next to labels | User requirement |
| (none) | `components/shortcut-overlay/` | ➕ ADDED | Keyboard shortcut reference modal | User requirement |

---

## Backend Routes → Backend Routes

| Original (Express) | New (Node + PAM) | Status | Adjustment | Rationale |
|---|---|---|---|---|
| `/api/login` (JWT) | `/api/auth/login` | 🔄 CHANGED | JWT → PAM auth (`pam_authenticate`) | User requirement |
| `/api/users` | (none) | ❌ REMOVED | Users managed via PAM, not API | View-only enforcement |
| `/api/users/me` | `/api/auth/me` | 🔄 CHANGED | Path changed | Consistency |
| `/api/vms` | `/api/vms` | 🔄 CHANGED | `GET` only (POST/PUT/DELETE removed) | View-only |
| `/api/containers` | `/api/containers` | 🔄 CHANGED | `GET` only | View-only |
| `/api/jails` | `/api/jails` | 🔄 CHANGED | `GET` only | View-only |
| `/api/volumes` | `/api/volumes` | 🔄 CHANGED | `GET` only | View-only |
| `/api/logs` (JSON) | `/api/logs/stream` (JSONL) | 🔄 CHANGED | JSON → JSONL streaming | User requirement |
| `/api/notifications` | `/api/notifications` | 🔄 CHANGED | `GET` only | View-only |
| (none) | `/api/plugins` | ➕ ADDED | Plugin discovery/registry | Plugin system |
| (none) | `/api/plugins/<name>/manifest` | ➕ ADDED | Plugin manifest fetch | Plugin system |
| (none) | `/api/plugins/<name>/template` | ➕ ADDED | Plugin template fetch | Plugin system |
| (none) | `/api/themes` | ➕ ADDED | Built-in theme list | Theming |
| (none) | `/api/themes/custom` | ➕ ADDED | Custom theme CRUD | Theming |
| (none) | `/api/themes/import` | ➕ ADDED | Theme import with validation | Theming |
| (none) | `/api/themes/export/<id>` | ➕ ADDED | Theme export as `.cbsd-theme.json` | Theming |
| (none) | `/api/help/analytics` | ➕ ADDED | Help article usage analytics (opt-in) | User requirement |
| (none) | `/api/openapi.json` | ➕ ADDED | OpenAPI 3.1 spec | User requirement |
| (none) | `/api/health` | ➕ ADDED | Backend health check | User requirement |
| (none) | `/api/preflight` | ➕ ADDED | Pre-flight check (backend, plugins, etc.) | User requirement |
| (none) | `/api/socket.io/` | ➕ ADDED | Socket.IO for streaming updates | User requirement |

---

## Theming Adjustments

| Original (React) | New (Angular) | Status |
|---|---|---|
| Tailwind config (default) | `tailwind.config.ts` (15 themes) | 🔄 CHANGED |
| CSS variables for theme | CSS variables + design tokens | 🔄 CHANGED |
| (none) | 15 themes (CloudBSD/REVYTECH, Miami Vice, Pixel Pop, Beige Box, Pearl Luna, CDE Motif, SunOS Sunburst, Aqua Pinstripe, Phosphor CRT, Glass Light, Glass Dark, Workbench, Haiku, Cube, Warp) | ➕ ADDED |
| (none) | Theme customizer (6 tabs: Colors, Typography, Layout, Branding, Import/Export, Preview) | ➕ ADDED |
| (none) | Theme `.cbsd-theme.json` import/export | ➕ ADDED |

---

## Plugin System (NEW)

| Surface | Description |
|---|---|
| Plugin discovery | Backend scans `plugins/` directory on startup |
| Plugin manifest | `plugin.json` describes pages, templates, permissions |
| Template rendering | Plugin-supplied templates rendered via Angular component library |
| Dynamic menu | Backend tells frontend to add menu items |
| Dynamic pages | Backend tells frontend to add pages, modals, wizards |
| Permissions | Plugin permissions enforced by backend |
| Hot reload | Plugin manifest changes picked up without frontend redeploy |

---

## Custom MIME Types + Headers (NEW)

| MIME Type | Purpose |
|---|---|
| `application/vnd.cloudbsd+login` | Login request/response |
| `application/vnd.cloudbsd+listvms` | VM list |
| `application/vnd.cloudbsd+createvm` | (view-only — unused) |
| `application/vnd.cloudbsd+listcontainers` | Container list |
| `application/vnd.cloudbsd+listjails` | Jail list |
| `application/vnd.cloudbsd+listvolumes` | Volume list |
| `application/vnd.cloudbsd+manifest` | Plugin manifest |
| `application/vnd.cloudbsd+template` | Plugin template |
| `application/vnd.cloudbsd+session.validate` | Session validation |

**Required headers**: `X-CloudBSD-Who`, `X-CloudBSD-What`, `X-CloudBSD-Why`, `X-CloudBSD-Where`

---

## Security Adjustments (NEW)

| Original | New |
|---|---|
| JWT tokens | PAM authentication (`pam_authenticate` from `security/openpam`) |
| SQLite user store | PAM (system accounts) |
| Bearer token in localStorage | Session cookie (HTTP-only, Secure, SameSite=Strict) |
| (none) | CSP headers (default-src 'self') |
| (none) | HSTS (max-age=31536000; includeSubDomains) |
| (none) | X-Frame-Options: DENY |
| (none) | X-Content-Type-Options: nosniff |
| (none) | Referrer-Policy: strict-origin-when-cross-origin |
| (none) | Permissions-Policy |
| Plain-text logs | JSONL logs with structured fields |
| (none) | Rate limiting (express-rate-limit) |
| (none) | Input validation (zod schemas) |

---

## i18n Adjustments

| Original (React) | New (Angular) |
|---|---|
| react-i18next | `$localize` (Angular native) |
| 44 locale files | 47 locale files (added 3 constructed languages: qav, tlh) |
| Translation workflow | Same — `.json` files in `web-new/src/locales/` |

---

## FreeBSD Port (NEW)

| Original | New |
|---|---|
| Manual install via npm | FreeBSD port at `~/git/cloudbsd-admin-backend/ports/www/cloudbsd-admin/` |
| No rc.d script | `cloudbsd-admin.in` rc.d script (modeled on Nexus3) |
| No man pages | 5 man pages (mdoc(7) format) |
| No package | FreeBSD package (`.pkg`) built from port |

---

## Summary

- **Original screens**: 11 React screens
- **New screens**: 42 Angular screens (rows 1-42: 14 React→Angular + 1 System Mgmt landing rewrite + 6 System Mgmt sub-screens + 5 detail-panel entry routes + 4 modal entry routes + 12 misc plugins/errors/help/pages)
- **SVG screen mockups on disk**: 24 (`diagrams/screens/` = 16 canonical + 7 system sub-screens + 1 plugins page)
- **SVG component mockups on disk**: 8 (`diagrams/components/` = 3 existing + 5 detail panels)
- **SVG modal mockups on disk**: 4 (`diagrams/modals/` = backup-create, plugin-install, plugin-detail, theme-import)
- **Original components**: 11 React components
- **New components**: 17 Angular components (11 migrated + 6 new)
- **Original backend routes**: ~45 Express routes
- **New backend routes**: ~25 routes (GET-only + plugin/system routes)
- **Wire-protocol sections**: §2.1-§2.20 (existing) + §2.21-§2.27 (added 2026-07-07: TaskSchedules CRUD, VM/Container/Jail/Volume/Node detail, Plugin lifecycle)
- **Themes**: 1 default → 15 built-in + custom
- **Locales**: 44 → 47 (added 3 constructed)
- **Plugins**: 0 → plugin system with manifests, templates, permissions
- **Logs**: plain text → JSONL structured
- **Auth**: JWT → PAM
- **Distribution**: npm install → FreeBSD port + package