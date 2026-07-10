# CloudBSD Admin — Complete UI Standard Index

> 2026-07-07. Every menu item, every panel, every column, every button follows
> these orders. Single source of truth. Updated to "index everything,
> even menu items" per user feedback.

## 1. Resource table column order (UNIVERSAL)

| # | Column | Required |
|---|--------|----------|
| 1 | **Status** (icon + color) | always first |
| 2 | **Name** | always second |
| 3 | OS / Image / Type | always third |
| 4 | Host (or Hostname / Node) | always fourth |
| 5 | Resources (vCPU / MEM / Disk) | always fifth |
| 6 | Network detail (IP / Ports) | always sixth |
| 7 | Uptime | always seventh |
| 8 | Detail (Net rx/tx / extra) | always last |

Applied to all resource tables:

| Table | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7 | Col 8 |
|-------|--------|-------|-------|-------|--------|--------|--------|--------|
| **VMs** | Status | Name | OS | Host | vCPU | RAM | IPs | Uptime |
| **Containers** | Status | Name | Image | Host | CPU% | MEM | Ports | Uptime |
| **Jails** | Status | Name | OS | Hostname | vCPUs | RAM | IP | Uptime |
| **Volumes** | Status | Name | Type | Host(s) | Size | Used | Mountpoint | Uptime |
| **Cluster nodes** | Status | Name | Role | Rack | CPU% | MEM% | Disk% | Uptime |
| **Users** | Status | Username | UID | Groups | 2FA | Last login | IP | Actions |
| **Notifications** | Severity | Title | Source | Time | Description | Actions | — | — |
| **Logs** | Level | Timestamp | Module | Source | Message | Actions | — | — |

## 2. Page panel order (UNIVERSAL)

| # | Panel | Purpose |
|---|-------|---------|
| 1 | **Page header** (title + subtitle) | Identify the page |
| 2 | **Action bar** (filter + actions) | Per-page actions only |
| 3 | **Stats cards** (3-5 KPI tiles) | Aggregate summary |
| 4 | **Main table** (the data) | Per-item detail |
| 5 | **Pagination** (always last) | Navigation between pages |

Forbidden on per-page headers: "View-only" badge, "Refresh" full button, "Export" full button.

## 3. Action bar order (UNIVERSAL)

Left-to-right layout:

```
[Filter input] [Status filter chips] [Type filter] ............ [Per-page action buttons]
```

## 4. Filter chip order (UNIVERSAL)

Status filter chips ordered by operational priority:

```
[All] [Active states] [Idle states] [Error states]
```

| Resource | Order |
|----------|-------|
| VMs | All, Run, Stop, Pause, Error |
| Containers | All, Run, Exit, Pause, Error |
| Volumes | All, ZFS, NFS, iSCSI |
| Jails | All, Run, Stop, Frozen |
| Nodes | All, Online, Offline |
| Users | All, Active, Locked, Expired, Disabled |
| Logs | All, Error, Warn, Info, Debug |
| Notifications | All, Error, Warn, Info |

## 5. Status indicator order (UNIVERSAL)

| State | Symbol | Color | Background |
|-------|--------|-------|------------|
| Running/Healthy/Online | `\u25CF` | `#10b981` green | `#d1fae5` |
| Stopped/Offline | `\u25CB` | `#94a3b8` gray | `#e2e8f0` |
| Paused/Frozen | `\u25D0` | `#f59e0b` amber | `#fef3c7` |
| Error/Failed | `\u2715` | `#ef4444` red | `#fee2e2` |
| Syncing/Joining | spinner | `#3b82f6` blue | `#dbeafe` |
| Watch/Warning | `\u26A0` | `#d97706` amber | `#fef3c7` |
| System (read-only) | `\u26BF` | `#94a3b8` gray | `#f8fafc` opacity 0.65 |

## 6. Action button order in row (UNIVERSAL)

Left-to-right:
1. View (always present, primary)
2. Edit (if applicable)
3. Snapshot/Backup (VM/Volume)
4. Start/Stop/Restart (VM/Container)
5. Delete/Remove (always rightmost, danger styled)

**Color coding:**
- Primary: blue `#2563eb`
- Destructive: red `#b91c1c`
- View-only: gray `#475569`

## 7. Modal form order (UNIVERSAL)

Top-to-bottom in a modal form:
1. **Identity** (name, label, ID)
2. **Configuration** (type, category, options)
3. **Resources** (vCPU, RAM, disk)
4. **Network** (IP, ports)
5. **Schedule** (time, recurrence)
6. **Description / Notes** (free-form)
7. **Dangerous options** (delete, force) — at bottom, separated, red

**Buttons at bottom right** (right-to-left in source order):
- Primary: `Save` / `Create` / `Apply`
- Secondary: `Cancel`
- Tertiary: `Test`
- Destructive: `Delete` (leftmost, red, requires type-to-confirm)

## 8. Sidebar order (UNIVERSAL)

```
Overview              (resource links)
  Dashboard
  Virtual Machines
  Containers
  Jails
  Volumes
  Network Map
  Cluster
  Nodes

Admin                  (admin tools)
  Users
  Logs
  Notifications
  Settings
  System Mgmt           (consolidated admin actions)
  Status
  About
```

Footer:
```
Host: cloudbsd-node-01
Uptime: 14d 02:11
```

## 9. Header order (UNIVERSAL)

Left-to-right:
```
[Logo C] [CloudBSD Admin] [host chip: cloudbsd-node-01.local] .........[TZ selector] [Bell+count] [Avatar M]
```

## 10. Stats card order (UNIVERSAL)

Left-to-right in a stats row (highest attention first):
1. Total / aggregate count
2. Success indicator (Running, Healthy)
3. Warning indicator (Watch, Paused)
4. Failure indicator (Error, Offline)
5. Trend / growth

## 11. Modal placement (UNIVERSAL)

- Modals centered with backdrop overlay
- Backdrop click: dismisses if `dismissible=true`
- Esc: same as backdrop click
- Focus trap inside modal
- First focusable gets focus on open
- Return focus to opener on close

## 12. Notification toast order (UNIVERSAL)

Toasts: top-right, stack downward, dismissible.

Left-to-right in each toast:
1. Severity icon (left)
2. Title (bold)
3. Description (truncated)
4. Timestamp (small, right)
5. Action button (if applicable)
6. Dismiss (X, far right)

## 13. Form field order (UNIVERSAL)

Vertical stacking for each input:
- Label (above, bold)
- Helper text (below, small, gray)
- Input (full width)
- Validation error (red, below, replaces helper on error)

## 14. List item order (UNIVERSAL)

Notifications, logs, search results, etc. show:
1. Icon (severity/type, left)
2. Primary text (bold)
3. Secondary text (gray, truncated)
4. Metadata (timestamp, source)
5. Actions (right)

## 15. Menu items (UNIVERSAL, per user feedback)

**Top-level main menu (sidebar):**

```
[Overview group]
  1. Dashboard
  2. Virtual Machines
  3. Containers
  4. Jails
  5. Volumes
  6. Network Map
  7. Cluster
  8. Nodes

[Admin group]
  9. Users
  10. Logs
  11. Notifications
  12. Settings
  13. System Mgmt
  14. Status
  15. About
```

**Page sub-navigation** (tabs, when present):
- Alphanumerical by ID, OR by frequency of use
- Resource-level tabs first (Overview, Detail, Events)
- Admin-level tabs last (Settings, Permissions)
- "Default" tab always first

**Context menus** (right-click on rows):
1. View
2. Edit
3. (domain-specific actions: Start, Stop, Migrate, Snapshot)
4. ---
5. Copy ID
6. Export
7. ---
8. Delete / Remove

**Dropdown menus** (filters, sorts):
1. Default option first ("All", "Newest", "Name")
2. Alphabetical / numerical after
3. Custom groups last ("Custom filters...")

**User menu** (avatar dropdown):
1. Profile
2. Preferences
3. Theme picker
4. ---
5. Keyboard shortcuts
6. API tokens
7. ---
8. Sign out

**Notifications menu** (bell dropdown):
1. Notification list (last 10, grouped by date)
2. "Mark all as read" link
3. ---
4. View all notifications
5. Notification preferences

**System menu** (icon in header, when present):
1. Backend status indicator
2. ---
3. Connection: online/offline
4. WebSocket: connected/connecting
5. Last sync: X seconds ago
6. ---
7. Diagnostics page

## 16. Forbidden patterns (BANNED)

Per Honcho peer `cloudbsd-admin-test-lessons`:
- `window.alert()` / `window.confirm()` / `window.prompt()` — use ErrorModalService
- "View-only" badge (redundant)
- "Refresh" full button (use small icon)
- "Export" full button (use /system > Exports)
- Geolocation (city, country) for users/hosts/IPs — subnet classification only
- Git commit hash in About (closed-source)
- Third-party libraries table (internal IP)
- FreeBSD/FreeNAS references (it's CloudBSD)
- "backend OK" in header (redundant with /status)
- Backend version in dashboard (only in /about)
- ASCII diagrams (use Mermaid)
- Tailwind in SVG without CSS (use inline styles)
- Default global time-range toolbar (per-panel dropdowns)
- Admin-only badge in page header (all admin pages are admin-only by definition)
- Tailwind classes in SVG mockups

## 17. Tab order (UNIVERSAL)

When a page has tabs, left-to-right:
1. Overview / Summary (always first)
2. Detail / List (always second)
3. Configuration / Settings (always before Logs)
4. Logs / Events
5. History / Activity
6. Permissions (admin)
7. Advanced (last)

Examples:
- VM detail: Overview, Disks, Network, Snapshots, Console, Logs, Settings
- Volume: Overview, Datasets, Snapshots, Scrubs, Performance, Settings
- Node: Overview, ZFS, GPUs, Network, VMs, Logs, Settings
- System Management: Backups, Exports, Stats, History, Audit Log, Updates

## 18. Toolbar button order (UNIVERSAL)

Within a toolbar (left to right):
1. Filter / search
2. Sort / view-mode toggle
3. Group / categorize
4. ---
5. Refresh (small icon, not full button)
6. Export (if page-specific, not generic)
7. Primary action (e.g. + Create, + Add)

## 19. Pagination order (UNIVERSAL)

Left to right:
[Showing X-Y of Z] [Previous] [1] [2] [3] [...] [N] [Next] [Per-page select]

Previous disabled when on first page. Next disabled when on last page.

## 19.5 List-view universal controls (added 2026-07-09 per scale review)

**Every list view MUST include all of the following 5 controls**, applicable to: VMs, Containers, Jails, Volumes, Users, Logs, Notifications, Audit Log, History, Plugins, Tasks, Volumes (sub-tabs: Datasets/Snapshots/Scrubs), Nodes (VMs sub-tab):

| # | Control | Pattern | Reason |
|---|---|---|---|
| 1 | **Sortable column headers** | click any header to toggle asc/desc; `▲` for asc, `▼` for desc, `⇅` for unsorted. Default sort: Name asc. | At >100 rows, finding by sort is the dominant action. |
| 2 | **Per-page selector** | Beside `Next [›]`: `Per page: [25 ▾] [50] [100] [200]`. Default = 50. | Page count at 1K rows: 50/page = 20 pages; 12/page = 84 pages. Mandatory to avoid click-fest. |
| 3 | **Empty-state element** | When 0 rows match filter: show centered icon + message + 3 suggested actions (clear filter, broaden search, etc.). | Without this, blank screen looks broken. |
| 4 | **Bulk-select checkboxes** | First column = checkbox per row. Header cell = `select all on this page` checkbox. Bottom action bar activates when N≥1 selected. | At >100 rows, bulk apply (patch, snapshot, etc.) becomes the dominant use case. |
| 5 | **Server-side pagination + filter** | Wire-protocol §2.4 specifies `offset`+`limit`+`filter`+`sort` query; v2.0.0 adds cursor-based. **Client-side substring filter ONLY for ≤200 rows; server-side required above that.** | At 1K rows, client substring is dog-slow and unsearchable by exact id. |

### Virtualization mandate (Angular implementation)

At **total > 200 rows** in any list view, the Angular component MUST use `cdk-virtual-scroll-viewport` (Angular CDK). Spec mockups showing 8-12 rows are visual-only; the implementation must window to the visible viewport.

| Rows | Pagination | Virtualization | Filter | Sort |
|---|---|---|---|---|
| ≤200 | ✅ server-side | optional | client OR server | client OK |
| 201-2,000 | ✅ server-side + cursor (WIRE_PROTOCOL v2.0) | ✅ **MANDATORY** | **server-side mandatory** | server-side |
| 2,000+ | ✅ server-side + cursor | ✅ mandatory | server-side + autocomplete | server-side |

### Performance budgets

| Operation | Budget | Notes |
|---|---|---|
| Filter chip change → updated list | <100ms | server-side if >200 rows |
| Sort click → re-rendered list | <100ms | client ≤200; server otherwise |
| Page-size change → new page | <200ms | server roundtrip |
| Search input → debounced results | <300ms (300ms debounce) | server-side at >200 |
| Live data update (WebSocket) → cards | <50ms | signal-driven OnPush |
| 5,000-row scroll fps | ≥60fps | cdk-virtual-scroll |
| Memory at 5,000 VMs | <100MB | lazy virtualization |

## 20. Color palette (UNIVERSAL)

Applied consistently across all SVGs and components:

```
Background:    #f1f5f9 (slate-100)
Surface:       #ffffff
Border:        #e2e8f0 (slate-200)
Muted text:    #94a3b8
Secondary:     #64748b
Primary text:  #0f172a (slate-900)
Brand primary: #0ea5e9 -> #1e40af (gradient)
Success:       #10b981 (emerald)
Warning:       #f59e0b (amber)
Error:         #ef4444 (red)
Info:          #3b82f6 (blue)
```

## 20.5 List density modes (added 2026-07-09)

Every list view supports **three density modes** toggled by user preference (stored in `Settings > Appearance > List density`):

| Mode | Row height | Visible rows in viewport (1280×720) | Use case |
|---|---|---|---|
| **Cozy** (default) | ~50-60px | 8-12 rows | Default. Spacious rows; secondary text on hover. Most readability. |
| **Compact** | ~28px | **20 rows** | Power users / dense-data preference. Single-line, monospace technical fields. |
| **Extra-compact** | ~20px | **30 rows** | Power-user tier 2. Monospace everywhere. For monitoring dashboards with 100+ visible entities. |

### Mode comparison table

| Field | Cozy | Compact | Extra-compact |
|---|---|---|---|
| Row padding | 10-14px vertical | 6px vertical | 4px vertical |
| Font size | 13px base | 11px base | 10px base |
| Status | Pill with color + label | Color dot only | Color dot only (11px) |
| Name | Bold + id below | Bold + monospace ulid inline | Bold + monospace single |
| OS | Plain text | Plain text (smaller) | Plain text (10px) |
| IPv4 | "10.0.10.10 +1 more" button | Monospace single | Monospace single |
| Specs (RAM/vCPU) | Right-aligned | Right-aligned, monospace | Right-aligned, monospace |
| Uptime | "14d 02:11" or "—" | Same, monospace | Same, monospace |
| Hover details | Always shown | Hidden (popover) | **Hidden** (popover) |
| Per-page default | 12 | 50 | 100 |
| Monospace UI | No | Partial (tech fields) | **Yes (entire row)** |

### Three-way toggle UI (Cozy | Compact | Extra)

```
┌────────────────────────┐
│ Cozy │Compact│ Extra  │  ← segmented control top-right of every list view
└────────────────────────┘
              ▼ Active: bg=#1d4ed8 color=white font-weight=600
```

Per-user preference persisted via `SettingsService.density$` signal. Default = Cozy for new accounts. Migration: existing users default to their previous setting (none = Cozy).

### Canonical example SVGs

| File | Pattern | Tier |
|---|---|---|
| `diagrams/components/24-compact-list-vm.svg` | VMs in Compact | 1 of 2 |
| `diagrams/components/25-compact-list-container.svg` | Containers in Compact | n/a |
| `diagrams/components/26-compact-list-jail.svg` | Jails in Compact | n/a |
| `diagrams/components/27-compact-list-volume.svg` | Volumes in Compact | n/a |
| `diagrams/components/28-compact-list-user.svg` | Users in Compact | n/a |
| `diagrams/components/29-compact-list-log.svg` | Logs in Compact | n/a |
| `diagrams/components/30-compact-list-notification.svg` | Notifications in Compact | n/a |
| `diagrams/components/31-compact-list-audit-log.svg` | Audit Log in Compact | n/a |
| `diagrams/components/32-compact-list-history.svg` | History in Compact | n/a |
| `diagrams/components/33-extra-compact-list-vm.svg` | VMs in Extra-Compact (3-way toggle) | 2 of 2 |

### Performance note

| Mode | DOM size @ 1,000 rows | DOM size @ 5,000 rows |
|---|---|---|
| Cozy | ~580 KB | ~2.9 MB |
| Compact | ~280 KB | ~1.4 MB |
| Extra-compact | ~190 KB | ~950 KB |

Combined with `cdk-virtual-scroll-viewport` (mandatory at >200 rows per §19.5), only ~25-40 rows mount in DOM regardless of mode. Render fps target: ≥60fps scroll, ≥55fps filter/sort even in Extra-compact.

### Persistence

`SettingsService` exposes `density$: Observable<'cozy'|'compact'|'extra'>` which all list components consume via `@if`/`@switch` template syntax. Persisted in `localStorage` key `cloudbsd.density.v1`. Cross-tab sync via `BroadcastChannel('cloudbsd-settings')`. Migration path: existing users default to Cozy on first load after upgrade.


