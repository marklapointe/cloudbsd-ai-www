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
3. API tokens
4. ---
5. Sign out

Note: NO "Keyboard shortcuts" menu item, NO shortcut hint chips beside other items. We have not defined any keyboard shortcuts for this app yet (per user 2026-07-09). When shortcuts are defined, re-introduce as a new item with hint chips, in a separate change.

Mockup: `diagrams/components/88-user-menu-dropdown.svg` (280px panel, anchored top-right under avatar bubble).
- Identity grid: ulid (click-to-copy) · email · auth (Password + TOTP, with 2FA pill) · session (elapsed + expiry) · ip (with device label, NO geolocation per 2026-06 lessons)
- Theme picker is a NATIVE `<select>` dropdown (12 themes + Custom…), not inline chips. Selected theme has a left-edge color swatch overlay + ▾ caret on right. "Browse all 12 →" link on the right opens the dedicated themes browser.
- 5 menu items: Profile · Preferences · API tokens (count badge) · Help & docs · About
- NO "Keyboard shortcuts" item, NO shortcut hint chips on other items — we have not defined any keyboard shortcuts yet (per user 2026-07-09). Add shortcuts and re-introduce the menu item + hint chips in a separate change.
- Footer: Sign out in red

Why dropdown for theme: 12+ themes don't fit inline chips (overflows 280px panel); user picks ONE at a time, not browse-and-compare; the dedicated Themes browser (66-themes-browser.svg) is the right place for visual comparison. Apply `cursor:pointer` to avatar in chrome wrapper.

**Notifications menu** (bell dropdown):
1. Notification list (last 10, grouped by date)
2. "Mark all as read" link
3. ---
4. View all notifications
5. Notification preferences

Mockup: `diagrams/components/89-notifications-menu-dropdown.svg` (380px panel, anchored top-right under bell). 3-section grouping by recency (Today / Yesterday / Earlier this week). Each item: severity dot + source label + excerpt + age + View button. Unread items: colored dot (amber/red/violet) + tinted bg; read items: gray dot + faded + checkmark.

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

#### Compact tier (~28px rows, 20 visible)

| File | Subject |
|---|---|
| `diagrams/components/24-compact-list-vm.svg` | VMs canonical |
| `diagrams/components/25-compact-list-container.svg` | Containers |
| `diagrams/components/26-compact-list-jail.svg` | Jails |
| `diagrams/components/27-compact-list-volume.svg` | Volumes |
| `diagrams/components/28-compact-list-user.svg` | Users |
| `diagrams/components/29-compact-list-log.svg` | Logs |
| `diagrams/components/30-compact-list-notification.svg` | Notifications |
| `diagrams/components/31-compact-list-audit-log.svg` | Audit Log |
| `diagrams/components/32-compact-list-history.svg` | History |

#### Extra-compact tier (~20px rows, 30 visible, monospace)

| File | Subject |
|---|---|
| `diagrams/components/33-extra-compact-list-vm.svg` | VMs (3-way toggle canonical) |
| `diagrams/components/34-extra-compact-list-container.svg` | Containers |
| `diagrams/components/35-extra-compact-list-jail.svg` | Jails |
| `diagrams/components/36-extra-compact-list-volume.svg` | Volumes |
| `diagrams/components/37-extra-compact-list-user.svg` | Users |
| `diagrams/components/38-extra-compact-list-log.svg` | Logs |
| `diagrams/components/39-extra-compact-list-notification.svg` | Notifications |
| `diagrams/components/40-extra-compact-list-audit-log.svg` | Audit Log |
| `diagrams/components/41-extra-compact-list-history.svg` | History |

### Empty-state canonical SVGs (one per list view)

When data is missing, errored, or filtered to nothing — every list view shows a contextual empty-state. Added 2026-07-09:

| File | Trigger | Icon | Primary action |
|---|---|---|---|
| `diagrams/components/42-empty-list-vm.svg` | No VMs exist (clean state) | ◻ square | Create VM |
| `diagrams/components/43-empty-list-container.svg` | Filtered to zero | ⌗ search | Clear filter |
| `diagrams/components/44-empty-list-jail.svg` | Loader error | ⚠ warning | Retry |
| `diagrams/components/45-empty-list-volume.svg` | All archived | ❘ heart | Show archived |
| `diagrams/components/46-empty-list-user.svg` | No permission | 🔒 lock | Request access |
| `diagrams/components/47-empty-list-log.svg` | Empty buffer | ⌖ target | Start live tail |
| `diagrams/components/48-empty-list-notification.svg` | All caught up | ✔ success check | View history |
| `diagrams/components/49-empty-list-audit-log.svg` | First-time (clean) | ❖ diamond | Generate test |
| `diagrams/components/50-empty-list-history.svg` | Service offline | ⦢ dashed circle | Retry now |

### Empty-state pattern rules

1. **Tone matches trigger**: clean/positive state (caught-up, no-permission) gets ✿ neutral; error/loading gets ⚠ ✗ amber/red; success-empty gets ✓ green
2. **3 actions max**: primary + secondary + ghost (or 3 secondary). Action labels imperative ("Create VM", not "VMs page")
3. **Icon is large (80×80)** in muted color (#94a3b8) — readable but not alarming
4. **Body 13px; heading 18px bold** — heading states WHAT, body states WHY and gives context (e.g. "13 datasets exist but archived")
5. **Container has same `<header>`** as the populated list view — same selector, same filter input — so user knows where they are
6. **Persistent across density modes**: empty state is identical in Cozy/Compact/Extra-compact (it's not a list row, so density toggle doesn't affect it)

### Performance note

| Mode | DOM size @ 1,000 rows | DOM size @ 5,000 rows |
|---|---|---|
| Cozy | ~580 KB | ~2.9 MB |
| Compact | ~280 KB | ~1.4 MB |
| Extra-compact | ~190 KB | ~950 KB |

Combined with `cdk-virtual-scroll-viewport` (mandatory at >200 rows per §19.5), only ~25-40 rows mount in DOM regardless of mode. Render fps target: ≥60fps scroll, ≥55fps filter/sort even in Extra-compact.

### Persistence

`SettingsService` exposes `density$: Observable<'cozy'|'compact'|'extra'>` which all list components consume via `@if`/`@switch` template syntax. Persisted in `localStorage` key `cloudbsd.density.v1`. Cross-tab sync via `BroadcastChannel('cloudbsd-settings')`. Migration path: existing users default to Cozy on first load after upgrade.

## 21. Click-to-copy pattern (added 2026-07-09)

**No Copy buttons. The row itself is the copy target.** When a row's content is a copyable value (IP, ID, hostname, ULID, hash, secret), clicking anywhere on the row copies its primary value to the paste buffer. A small bottom-center toast confirms — out of the way, dismisses automatically.

### Where applied

The pattern fits anywhere a row's "primary value" is a discrete, copy-paste-ready string. Implemented first on the **IPs modal** (`diagrams/components/16-ips-modal.svg`). Apply same pattern wherever per-row copy made sense:

- IPs modal (IP addresses)
- VM/Container/Jail/Volume/Node detail panels (ulid, IPv4, MAC)
- Webhooks detail (URL)
- Audit log rows (action target)
- API key rows (token prefix only — full token never clickable)
- Plugin detail (manifest URL, manifest hash)

Do NOT apply to:
- Recovery codes (2FA security — use explicit Download/Regenerate buttons)
- API token full strings (security — never auto-copyable)
- Passwords / secrets displayed as asterisks (use Clipboard with confirmation prompt)

### How it works

```
┌──────────────────────────────────────────────────┐
│  ●  10.0.10.40                  vtnet0   global  │  ← row, whole row clickable
│  ●  2001:db8::28                vtnet0   global  │     cursor:pointer
│  ●  fe80::ff:fe40:5678          vtnet0   link    │     hover bg:#f8fafc
│  ●  fd00:1234:5678::1           epair0a  site    │     title="Click to copy X"
└──────────────────────────────────────────────────┘
                ↓ click any row ↓
        ┌──────────────────────────────┐
        │ ✓ Copied 10.0.10.40 to       │  ← toast at bottom-center
        │   clipboard                  │     fades after 2500ms
        └──────────────────────────────┘
```

### Toast specification

| Property | Value |
|---|---|
| Position | bottom: 24px; left: 50%; transform: translateX(-50%) |
| Background | #0f172a (slate-900) |
| Text color | #ffffff |
| Border radius | 6px |
| Padding | 7px 14px |
| Font | 11px |
| Inner code | monospace, bg #1e293b, padding 1px 6px, color #10b981 |
| Check icon | ✓ in #10b981 |
| Box shadow | 0 6px 20px rgba(0,0,0,0.3) |
| Z-index | above page chrome, below modals (so modal copy toasts appear above modals? no — inside modal space) |
| Animation | slide up 200ms ease-out, dwell 2300ms, fade out 300ms |
| Stacking | max 3 visible; newest at top; older queue or push |
| Dismissable | auto only (no × button — too noisy; clicks anywhere dismiss) |

### Why this is better than Copy buttons

1. **Faster**: no mouse travel to a small button. Click target is whole row (60px+ tall).
2. **Less noise**: 5 buttons per row create visual clutter. One row, one action, zero buttons.
3. **Familiar**: file explorers (macOS Finder, Windows Explorer) already use row-click + tooltip pattern.
4. **Discoverable**: cursor:pointer + hover background + title attribute = implicit affordance.
5. **Free up space**: removing 5 buttons per row + 32px IPv4/IPv6 badge width = ~70px gained → modal width 640→480px, fits more rows.

### IP modal-specific notes

- **No IPv4/IPv6 labels**: address shape is self-evident (`.`/`::` distinguishes). Saves 32px per row + cognitive load.
- **Scope column kept** (`global`/`link`/`site`) — useful info; not derivable from the address alone.
- **Interface column kept** (`vtnet0`/`epair0a`) — useful for ops.
- **Removed 5 `Copy` buttons** (one per row). Removed 5 `IPv4`/`IPv6` badges. Removed redundant chevron-style right alignment.
- **Modal width**: 640px → 480px (centers better on a 1280px viewport, leaves more breathing room).
- **Filter input**: still there; copy respects the filtered view (clicking a row copies only what's visible).

### Implementation hooks (Angular)

```ts
// In IpAddressesModal component:
@HostListener('click', ['$event']) onRowClick(ev: MouseEvent) {
  const row = (ev.target as HTMLElement).closest('[data-copy]');
  if (!row) return;
  const value = row.getAttribute('data-copy')!;
  navigator.clipboard.writeText(value).then(() => {
    this.toast.show(`Copied ${value} to clipboard`, 'success', 2500);
  });
}

// template:
// <div data-copy="10.0.10.40" title="Click to copy 10.0.10.40" style="cursor:pointer;">
//   ...
// </div>
```

Avoid `<button>` semantics for clickable rows here — keyboard accessibility wants `Enter`/`Space` activation. Use `[role="button"] tabindex="0"` + `(keydown.enter)` handler for full A11y.



---

## §22. List-View + Sidecar Pattern (T94j)

Replaces the older "card-grid + recent-events" pattern for resource pages with **count > ~5-10 items**.

### When to use

Any resource page that groups more than a handful of peer items: nodes, GPUs, IP pools, IP allowlist rules, webhooks, API keys, ssh keys, firewall rules, snapshots, etc.

### Threshold rule

| Count of items | Primary view | Panel toggle |
|----------------|--------------|--------------|
| ≤ 5 | card-grid OR list, user choice | both available |
| 6–10 | list view (default), panel toggle visible | toggle works |
| **> 10** | **list view only, panel toggle HIDDEN** | **list-only** |

The threshold per-resource-type is defined in the resource's spec; tunable via Settings → Appearance → Layout thresholds (future). For now hard-coded values:

- GPUs: **10** (simple cards, single metric) — `diagrams/components/17-vgpu-pool.svg` (≤10 panel mode) vs `diagrams/components/17-vgpu-pool-list.svg` (>10 list mode)
- Cluster nodes: **10** (more state per node) — `diagrams/screens/07-cluster.svg` always list, threshold lets you drop panel toggle earlier
- API keys, webhooks, IP rules: **25** (very simple rows) — always list
- Volumes, snapshots, backups: **20** (single primary metric)

### List view columns (canonical)

| Column | Width | Notes |
|--------|-------|-------|
| Primary key | 150px | hostname / ID / token name — first column, monospace, **`cursor:pointer` + `title="Click to open sidecar"`** |
| Type / role badge | 70-90px | pill (MASTER/WORKER, RUN/STOP, healthy/offline) |
| Status / health | 80px | colored pill, traffic-light (●/◐/✕) |
| Secondary group | 60px | rack / region / namespace — short mono |
| Resource metric bars | 280px (two ×140) | CPU / MEM / DISK / VRAM — paired columns |
| Temporal | 110px | uptime / last seen / age |
| Heartbeat / staleness | 90px | mono, color-coded (green <5s, amber 30s, red >5m) |
| Action chevron | 24px | `›` gray, blue when row selected |

### Sidecar spec

Docked right side panel:

```
┌────────────────────────────────────┬─────────────────────────────┐
│                                    │  cloudbsd-node-03  WORKER ×│
│         table area                 │  ───────────────────────────│
│         (~ 880px)                  │  Overview / Network / VMs  │
│                                    │  / Logs / Settings tabs     │
│                                    │  ───────────────────────────│
│                                    │  Identity section           │
│                                    │  Hardware section           │
│                                    │  Cluster state section      │
│                                    │  Workload summary box       │
│                                    │  ───────────────────────────│
│                                    │  [Drain][Rejoin][Promote]   │
└────────────────────────────────────┴─────────────────────────────┘
```

- **Width**: 380-392px docked right (`width:392px; border-left:1px solid #e2e8f0; box-shadow:-2px 0 8px rgba(15,23,42,0.04);`)
- **Height**: matches table area; max-height for body with `overflow-y:auto`
- **Header**: identity (name + role badge) + close `×` button + "open in full panel" arrow `↗` button
- **Tabs**: 4-5 tabs (canonical: Overview / {sub-tabs} / Settings). Active tab gets `border-bottom:2px solid #2563eb`, color `#1d4ed8`
- **Body sections**: TITLE-LABEL (uppercase 10px gray) + grid `display:grid;grid-template-columns:90px 1fr;gap:5px 10px;font-size:11px` for key/value pairs
- **Quick actions footer**: 2-3 buttons (`flex:1` + `flex:1` + `flex:1.4` Primary). Action buttons disabled when sidecar open
- **Open trigger**: click row, `Enter` on focused row, `?sidecar=ID` URL param (deep-linkable)
- **Close trigger**: `×` button, `Esc` key, click outside row range, `?sidecar=` removed
- **Multi-tab**: stacked sidecar tabs allow open 2-3 resources simultaneously; max 5 (then oldest auto-closes)
- **Persistence**: sidecar ID persists in URL for sharing; sessionStorage for restoration after page nav
- **Sidecar type-agnostic**: contents swap based on resource type — same `SidecarContainer` component hosts VM/Container/Jail/Volume/Node/GPU/ClusterMember details with a discriminator field

### Apply across the board

All list-view + sidecar pages share the same component primitive:

```ts
@Component({
  selector: 'app-resource-list-with-sidecar',
  template: `
    <div class="split">
      <app-list-table [rows]="rows()" (rowClick)="open($event)" />
      @if (sidecar(); as s) {
        <app-sidecar [resourceId]="s" (close)="sidecar.set(null)" />
      }
    </div>
  `
})
```

Resource-specific components wrap:
- `<app-gpu-list-with-sidecar>` (T94j)
- `<app-cluster-list-with-sidecar>` (T94m)
- `<app-vm-list-with-sidecar>` (when VMs > 25)
- `<app-firewall-rules-list-with-sidecar>`
- `<app-api-keys-list-with-sidecar>`
- `<app-webhooks-list-with-sidecar>`
- `<app-ip-rules-list-with-sidecar>`

---

## §23. Event Timelines Live in Logs (T94m)

### Rule

> **Do not embed ephemeral event timelines on resource pages.**
> "Recent X Events" / "Recent activity" / "Latest X" / "Activity feed" panels on resource pages are an anti-pattern. All event timelines belong in **Logs** (the system-wide stream) or **Notifications** (the user-targeted stream).

### Why

1. **Duplication** — the same events appear in two places; you don't know which is canonical.
2. **Pagination mismatch** — resource-page events show N most-recent, but admins want to query older events. Resource page can't host query UI.
3. **Filter conflicts** — each resource page invents its own subset of filters, while logs has the canonical filter set (severity, source, time range, regex search).
4. **Notification vs log confusion** — user-facing events (notifications) need ack/dismiss state; system events (logs) don't. Mixing in same panel confuses both.
5. **Rate of change** — events stream in faster than static resource fields, making resource pages feel noisy.

### Migration

| Old (resource-page event panel) | New |
|---------------------------------|-----|
| Cluster page "Recent Cluster Events" | Logs page with `cluster` source filter chip (NOW SHIPPED: `diagrams/screens/07-cluster.svg` removed its events panel, `diagrams/screens/09-logs.svg` gained 6 cluster-event rows + filter chip) |
| VM page "Recent activity" | Logs page with `bhyve` + VM-name search |
| Volume page "Recent snapshots" | Logs page with `zfs` source + snapshot name search |
| Plugin page "Recent installs/uninstalls" | Logs page with `plugin` source |
| Backup detail page "Recent restore history" | Logs page with `backup` source + restore search |
| Network page "Recent DHCP events" | Logs page with `net` + `dhcp` |

### Cross-link convention

Every resource page that REMOVED its "Recent X" panel adds ONE link in the page header:

```html
<a href="/logs?src=cluster" style="display:inline-flex;align-items:center;gap:4px;
   padding:5px 10px;border:1px solid #cbd5e1;border-radius:5px;
   background:#ffffff;color:#475569;text-decoration:none;font-weight:600;">
   View {resource_type} events in logs →
</a>
```

The link target is `/logs` (canonical) with query string pre-selecting the source filter. Click → opens logs pre-filtered for that resource type. Avoids deep state in URL while still one-click away.

### What STAYS on resource pages

- Static config (role, hostname, ulid, joined date, hardware, tags)
- Operational metrics (current CPU/MEM/DISK/throughput) with timestamp
- Inline alerts tied to THIS resource only (e.g., "this VM has a paused state because…")
- Related-resource chips ("runs on cloudbsd-node-03", "uses volume tank/data")

### What does NOT stay

- Event lists (>3 items)
- Activity feeds
- "What happened here recently"
- Per-resource log viewers (replace with `→ View all events for this resource in logs` link)



---

## §24. Auth-context row convention (T94n follow-up)

> **Rule**: every user-menu / session-detail / settings-account panel that shows the *current user* MUST show the actual session's auth method. Not made-up filler like "via SSH key" — pick from this whitelist of real CloudBSD auth methods.

### Real auth methods (per wire-protocol §auth)

| Method | Used for | Notes |
|--------|----------|-------|
| **Password** | primary | PAM via libpam; required always |
| **TOTP** (RFC 6238) | secondary factor | 30s rotation; recovery codes required |
| **OIDC SSO** | primary (alternative) | Google / Okta / generic OIDC; bypasses PAM password |
| **WebAuthn / Passkey** | primary (alternative) | FIDO2 passwordless; no password entered |
| **Recovery code** | one-time fallback | used after primary factor lost |

### Things that are NOT auth methods for the web UI

- **SSH key** — for CLI/SSH session only. In CloudBSD this gates the LaunchShell feature, not browser login. Login screen has a "Use SSH key →" button that opens LaunchShell, which then uses the SSH key.
- **JWT / session cookie** — that's how the auth SESSION is maintained after login, not how login happened. Don't list it.
- **API token** — that's how the CLI uses the API, not how the user logs into the web UI.

### Auth-context row format (user-menu, account panel)

```
ulid      <ulid>            (click-to-copy)
email     <email>
auth      <method>          (e.g., "Password + TOTP" with 2FA pill if applicable)
session   <elapsed> · expires in <Nd>
ip        <ip> · <device>   (NO geolocation per 2026-06 lessons)
```

Apply to:
- User-menu identity grid (§15) — `diagrams/components/88-user-menu-dropdown.svg`
- Settings > Account page (61-settings-account.svg)
- Active sessions list (62-settings-security.svg, sessions tab)
- Login audit log entries (when showing what method was used to log in)

### Active sessions list

Beyond the current session, also surface recent sessions:

```
● this device        Chrome 134     10.0.10.42     now
  Password + TOTP    last active 2s ago                [Revoke]

● MacBook (work)     Safari 17.4    10.0.10.50     4h ago
  Password only      no 2FA                            [Revoke]

○ old-laptop         Firefox 124    10.0.10.99     2d ago
  Password + TOTP    expired                          [Re-login]
```

Index sessions by `last_active desc`. Visual treatment: ● = current, ● = other active, ○ = expired/revoked.


