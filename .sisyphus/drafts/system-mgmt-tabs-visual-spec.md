# System Management — Per-Tab Visual Spec (2026-07-07)

> **Purpose**: Visual layout spec for the 6 System Management tabs (per ui-index §17).
> Rendered entirely in **Mermaid** (per `lessons.md` convention: Mermaid for diagrams, NOT UI mockups via SVG).
>
> **Note**: Mermaid `flowchart` is the layout tool here — yes, this spec is a diagram, not
> a 1280×800 mockup. The executor converts these Mermaid diagrams into actual
> `diagrams/screens/16-system-{N}-*.svg` files using the structural + content data below.
>
> **Constraint note**: The planner (prometheus) is markdown-only — SVGs cannot be written
> directly. This document is the source-of-truth spec; the executor produces the SVGs.
>
> **IA update 2026-07-16**: Nav label is **System** under Operate (not "System Mgmt" in Admin
> alone). Tabs should evolve toward: Backups (policies+runs), Exports, Diagnostics (absorb
> Status), Audit, Updates, Maintenance. Stats tiles that count themes/locales are non-operational
> — prefer capacity/ops metrics. Sidebar item list in § diagrams below is **historical**; use
> `ui-index.md` §8 + `docs/migration/product-ia-esxi-vsphere-2026-07-16.md` §3–4 for nav.

---

## 0. Tab nav (consistent across all 6 tab SVGs)

```mermaid
flowchart LR
  subgraph TabBar["Tab bar (44px height)"]
    direction LR
    T1[Backups<br/><b>ACTIVE</b><br/>blue underline]
    T2[Exports]
    T3[Stats]
    T4[History]
    T5[Audit Log]
    T6[Updates]
    T1 ~~~ T2 ~~~ T3 ~~~ T4 ~~~ T5 ~~~ T6
  end
```

**One tab styled ACTIVE per SVG** (left-to-right: Backups → Exports → Stats → History → Audit Log → Updates, per ui-index §17). Active style: `color:#1d4ed8; background:#ffffff; border-bottom:2px solid #2563eb`. Inactive: `color:#64748b; border-bottom:2px solid transparent`.

---

## 1. TAB 1: Backups (`16-system-1-backups.svg`)

### Page structure

```mermaid
flowchart TB
  subgraph Header["Header (56px)"]
    H1[Logo "C"] ~~~ H2[CloudBSD Admin] ~~~ H3[cloudbsd-node-01.local] ~~~ H4[TZ selector] ~~~ H5[Bell+17] ~~~ H6[Avatar M]
  end

  subgraph Sidebar["Sidebar (224px)"]
    subgraph Overview["Overview"]
      O1[Dashboard] ~~~ O2[VMs] ~~~ O3[Containers] ~~~ O4[Jails] ~~~ O5[Volumes] ~~~ O6[Network Map] ~~~ O7[Cluster] ~~~ O8[Nodes]
    end
    subgraph Admin["Admin"]
      A1[Users] ~~~ A2[Logs] ~~~ A3[Notifications] ~~~ A4[Settings] ~~~ A5[System Mgmt] ~~~ A6[Status] ~~~ A7[About]
    end
  end

  subgraph Main["Main content"]
    P1[Page header: System Management + Admin-only badge]
    subgraph TabNav["Tab nav — Backups ACTIVE"]
      TA[Backups ACTIVE] ~~~ TB[Exports] ~~~ TC[Stats] ~~~ TD[History] ~~~ TE[Audit Log] ~~~ TF[Updates]
    end
    subgraph Panel["Scheduled Backups panel"]
      PH[Heading: 'Scheduled Backups'] ~~~ PB[+ New schedule primary button]
      subgraph Table["Table (8 cols)"]
        direction LR
        C1[Name] ~~~ C2[Schedule] ~~~ C3[Last run] ~~~ C4[Size] ~~~ C5[Status] ~~~ C6[Retention] ~~~ C7[Destination] ~~~ C8[Actions]
      end
      subgraph Rows["5 sample rows"]
        R1["daily-tank-data · Daily 02:00 · 3.2 GB · healthy · 14d · node-02 · Run/Delete"]
        R2["weekly-full-cluster · Weekly Sun 03:00 · 24 GB · healthy · 90d · rsync.net · Run/Delete"]
        R3["hourly-incremental · Hourly :15 · 120 MB · healthy · 48h · ZFS snap · Run/Delete"]
        R4["monthly-archive · Monthly 1st 04:00 · 180 GB · healthy · 5y · encrypted · Run/Delete"]
        R5["failed-jellyfin-vm · Daily 01:00 · — · failed · — · disk full · Run/Delete"]
      end
    end
  end
```

### Interaction state diagram

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> EditRow: click row
  EditRow --> Idle: cancel
  EditRow --> SaveEdit: Save button
  SaveEdit --> Idle: success
  SaveEdit --> EditRow: validation error
  Idle --> CreateModal: + New schedule
  CreateModal --> Idle: cancel
  CreateModal --> SaveNew: Create button
  SaveNew --> Idle: success
  SaveNew --> CreateModal: validation error
  Idle --> RunNow: Run now button
  RunNow --> Idle: POST /api/task-schedules/{id}/run
  Idle --> DeletePrompt: Delete button
  DeletePrompt --> Idle: cancel
  DeletePrompt --> DeleteConfirm: type-to-confirm
  DeleteConfirm --> Idle: DELETE /api/task-schedules/{id}
```

### 5 sample backup rows (table data)

| # | Name | Schedule | Last run | Size | Status | Retention | Destination |
|---|------|----------|----------|------|--------|-----------|-------------|
| 1 | daily-tank-data | Daily 02:00 UTC | 12:42:18Z | 3.2 GB | healthy (green) | 14d retention | replicated to node-02 |
| 2 | weekly-full-cluster | Weekly Sun 03:00 | 04:00:00Z Sun | 24 GB | healthy | 90d retention | offsite: rsync.net |
| 3 | hourly-incremental | Hourly :15 | 09:14:00Z | 120 MB | healthy | 48h retention | ZFS snapshots |
| 4 | monthly-archive | Monthly 1st 04:00 | 04:00:00Z 1st | 180 GB | healthy | 5y retention | encrypted + offsite |
| 5 | failed-jellyfin-vm | Daily 01:00 | last error | — | failed (red) | — | last error: disk full |

Row actions: `Run now` (border gray) + `Delete` (border red `#fecaca`).

---

## 2. TAB 2: Exports (`16-system-2-exports.svg`)

### Page structure

```mermaid
flowchart TB
  subgraph Header["Header (56px) — same as all tabs"]
    H1[Logo] ~~~ H2[CloudBSD Admin] ~~~ H3[host chip] ~~~ H4[TZ] ~~~ H5[Bell+17] ~~~ H6[Avatar]
  end
  subgraph Sidebar["Sidebar — same as all tabs"]
    S[Overview + Admin groups]
  end
  subgraph Main["Main content — Exports tab"]
    P1[Page header: System Management]
    subgraph TabNav["Tab nav — Exports ACTIVE"]
      TA[Backups] ~~~ TB["Exports<br/><b>ACTIVE</b>"] ~~~ TC[Stats] ~~~ TD[History] ~~~ TE[Audit Log] ~~~ TF[Updates]
    end
    subgraph Panel["Export Data panel"]
      PH[Heading: 'Export Data']
      PD[Description: 'Download system data for backup, audit, or migration.']
      subgraph Grid["8 export buttons (2x4 grid)"]
        direction LR
        B1["⚙ Configuration [JSON]<br/>'All settings + users + plugins'"]
        B2["☰ Logs [JSONL]<br/>'Last 90d, per-module filter'"]
        B3["⚠ Notifications [CSV]<br/>'All severity levels'"]
        B4["⏰ Activity Feed [JSON]<br/>'Per-day aggregation'"]
        B5["⛄ Cluster State [JSON]<br/>'Full topology snapshot'"]
        B6["⚿ Theme Library [JSON]<br/>'All built-in + custom themes'"]
        B7["⚡ GPU Inventory [JSON]<br/>'Per-node GPU + allocations'"]
        B8["⛶ Network Topology [JSON]<br/>'Per-node interfaces + VLANs'"]
      end
    end
  end
```

### 8 export button definitions

```mermaid
flowchart LR
  subgraph ConfigType["Button styling"]
    Direction["padding:8px 10px"]
    Bg["background: #f1f5f9"]
    Border["border: 0"]
    Radius["border-radius: 5px"]
    FontSize["font-size: 11px"]
    FormatPill["format pill [JSON|JSONL|CSV]<br/>background: #dbeafe<br/>color: #1d4ed8"]
  end

  subgraph ClickHandlers["Click handlers — POST /api/exports + download"]
    OnClick["On click: trigger download,<br/>show toast per ui-index §12"]
  end

  ConfigType --> ClickHandlers
```

Each button is `display:flex; align-items:center; gap:6px;` with icon (left, 14px), label (middle, flex:1), format pill (right, 9px).

### Export → MIME type mapping (per `mime-registry.md`)

| Export | Wire-protocol path | MIME type |
|---|---|---|
| Configuration | `POST /api/exports/config` | `application/vnd.cloudbsd+config-bundle` |
| Logs | `POST /api/exports/logs` | `application/vnd.cloudbsd+logs-bundle+jsonl` |
| Notifications | `POST /api/exports/notifications` | `application/vnd.cloudbsd+notifications-export+csv` |
| Activity Feed | `POST /api/exports/activity` | `application/vnd.cloudbsd+activity-export+json` |
| Cluster State | `POST /api/exports/cluster` | `application/vnd.cloudbsd+cluster-state+json` |
| Theme Library | `POST /api/exports/themes` | `application/vnd.cloudbsd+theme-library+json` |
| GPU Inventory | `POST /api/exports/gpus` | `application/vnd.cloudbsd+gpu-inventory+json` |
| Network Topology | `POST /api/exports/network` | `application/vnd.cloudbsd+network-topology+json` |

---

## 3. TAB 3: Stats (`16-system-3-stats.svg`)

### Page structure

```mermaid
flowchart TB
  subgraph Header["Header (56px) — same as all tabs"]
    H[Logo / Brand / TZ / Bell / Avatar]
  end
  subgraph Sidebar["Sidebar — same as all tabs"]
    S[Overview + Admin]
  end
  subgraph Main["Main content — Stats tab"]
    P1[Page header: System Management]
    subgraph TabNav["Tab nav — Stats ACTIVE"]
      TA[Backups] ~~~ TB[Exports] ~~~ TC["Stats<br/><b>ACTIVE</b>"] ~~~ TD[History] ~~~ TE[Audit Log] ~~~ TF[Updates]
    end
    subgraph TimeSeries["NEW: Time-series sparklines row (per audit §19.10)"]
      PH["Tab strip: [24h ACTIVE] [7d] [30d]"]
      subgraph SparkCharts["4 sparkline charts (200x80 each)"]
        S1["CPU usage 24h<br/>bars: #3b82f6<br/>Y-axis: 0-100%"]
        S2["Memory used 24h<br/>bars: #10b981<br/>Y-axis: 0-16 GB"]
        S3["Disk I/O 24h<br/>bars: #f59e0b<br/>Y-axis: 0-1 GB/s"]
        S4["Network throughput 24h<br/>bars: #06b6d4<br/>Y-axis: 0-1 Gbps"]
      end
    end
    subgraph StatCards["System Statistics panel — 12 cards in 3x4 grid"]
      direction LR
      subgraph Row1["Row 1"]
        R1C1["VMs<br/>47<br/>+3 this week"]
        R1C2["Containers<br/>62<br/>+8 this week"]
        R1C3["Jails<br/>12<br/>0 this week"]
        R1C4["Volumes<br/>13<br/>+1 this week"]
      end
      subgraph Row2["Row 2"]
        R2C1["Nodes<br/>6<br/>1 offline"]
        R2C2["Plugins<br/>5<br/>0 failed"]
        R2C3["Locales<br/>47<br/>0 in review"]
        R2C4["Themes<br/>15<br/>3 custom"]
      end
      subgraph Row3["Row 3"]
        R3C1["API calls/min<br/>8,192<br/>p99: 45ms"]
        R3C2["Data backed up<br/>2.3 TB<br/>last 24h: 12 GB"]
        R3C3["Security incidents<br/>0<br/>last: 47d ago"]
        R3C4["Uptime 90d SLA<br/>99.97%<br/>4 nines target"]
      end
    end
  end
```

### Card data structure (12 stats)

```mermaid
erDiagram
  StatCard {
    string metric "e.g. 'VMs'"
    string value "e.g. '47'"
    string trend "e.g. '+3 this week'"
    string colorHint "blue|green|amber|gray"
  }
```

Card style: `background:#f8fafc; border-radius:6px; padding:10px;` with value (18px bold), label (10px caps), trend (10px muted).

### Time-series interaction

```mermaid
stateDiagram-v2
  [*] --> Range24h
  Range24h --> Range7d: click [7d]
  Range7d --> Range24h: click [24h]
  Range7d --> Range30d: click [30d]
  Range30d --> Range7d: click [7d]
  Range24h --> Range7d
  Range24h --> Range30d
```

Each range bucket shows 24/168/720 hourly bars respectively.

---

## 4. TAB 4: History (`16-system-4-history.svg`)

### Page structure

```mermaid
flowchart TB
  subgraph Header["Header (56px) — same as all tabs"]
    H[Logo / Brand / TZ / Bell / Avatar]
  end
  subgraph Sidebar["Sidebar — same as all tabs"]
    S[Overview + Admin]
  end
  subgraph Main["Main content — History tab (NEW content per audit §21)"]
    P1[Page header: System Management]
    subgraph TabNav["Tab nav — History ACTIVE"]
      TA[Backups] ~~~ TB[Exports] ~~~ TC[Stats] ~~~ TD["History<br/><b>ACTIVE</b>"] ~~~ TE[Audit Log] ~~~ TF[Updates]
    end
    subgraph FilterRow["Filter row (44px)"]
      F1[Filter input '...']
      F2[Type dropdown 'All types']
      F3[Severity dropdown 'All severity']
      F4[Date range dropdown]
      subgraph Chips["Filter chips"]
        TC1[All] ~~~ TC2[Backup] ~~~ TC3[Export] ~~~ TC4[Auth] ~~~ TC5[Plugin] ~~~ TC6[Config]
      end
    end
    subgraph Timeline["Event timeline (50 rows, vertical timeline)"]
      E1["● 12:42:18Z · backup.run · daily-tank-data · OK<br/>user=system · duration=4m12s · size=3.2GB"]
      E2["● 12:31:18Z · vm.migrate · win11-sandbox->node-02 · OK<br/>duration=8m12s"]
      E3["● 11:18:02Z · export.config · json · OK<br/>size=124KB"]
      E4["● 10:48:33Z · user.password · jenkins · OK"]
      E5["● 10:32:11Z · health.check · cluster:6 · 1 node slow (warn)"]
      E6["● 09:14:00Z · backup.run · hourly-incremental · OK · 120MB"]
      E7["● 08:48:02Z · theme.activate · phosphor-crt · OK"]
      E8["● 07:32:18Z · plugin.install · zfs-monitor · OK · 4.2MB"]
      E9["● 06:18:00Z · cluster.heartbeat · all nodes · OK"]
      E10["● 04:00:00Z · backup.run · weekly-full-cluster · OK · 24GB"]
      More["...40 more rows..."]
      Pagination["[View older events] ← pagination"]
    end
  end
```

### Filter + row interaction

```mermaid
flowchart LR
  subgraph FilterInput
    FT[Type chips selected]
    FS[Severity chips selected]
    FD[Date range selected]
  end
  subgraph RenderLogic["Render logic"]
    Query["Build query: GET /api/events?<br/>type={FT}&severity={FS}&from={FD}"]
    Render["Render filtered timeline rows<br/>from events: AuditLogEntry[]"]
  end
  subgraph BackendFetch
    API["GET /api/events<br/>MIME: application/vnd.cloudbsd+event+list<br/>shape: AuditLogEntry[] per data-structures.md"]
  end
  FT --> Query
  FS --> Query
  FD --> Query
  Query --> API
  API --> Render
```

### Event severity legend

```mermaid
flowchart LR
  Info["● Info events<br/>color: #3b82f6<br/>bullets: blue"]
  Warn["● Warn events<br/>color: #f59e0b<br/>bullets: amber"]
  Error["● Error events<br/>color: #ef4444<br/>bullets: red"]
```

---

## 5. TAB 5: Audit Log (`16-system-5-audit-log.svg`)

### Page structure (renamed from "Recent Admin Actions" per audit §19.10)

```mermaid
flowchart TB
  subgraph Header["Header (56px) — same as all tabs"]
    H[Logo / Brand / TZ / Bell / Avatar]
  end
  subgraph Sidebar["Sidebar — same as all tabs"]
    S[Overview + Admin]
  end
  subgraph Main["Main content — Audit Log tab"]
    P1[Page header: System Management]
    subgraph TabNav["Tab nav — Audit Log ACTIVE"]
      TA[Backups] ~~~ TB[Exports] ~~~ TC[Stats] ~~~ TD[History] ~~~ TE["Audit Log<br/><b>ACTIVE</b>"] ~~~ TF[Updates]
    end
    subgraph Panel["Audit Log panel"]
      PH[Heading: 'Audit Log' (was 'Recent Admin Actions')]
      DD[Filter dropdown: All actions / Backups / Exports / Settings / Users]
      subgraph Table["Table (5 cols)"]
        direction LR
        C1[Time UTC] ~~~ C2[User] ~~~ C3[Action] ~~~ C4[Target] ~~~ C5[Result]
      end
      subgraph Rows["10 rows from existing 16-system.svg"]
        R1["12:42:18Z mlapointe backup.run daily-tank-data OK 3.2GB"]
        R2["12:31:18Z system vm.migrate win11-sandbox→node-02 OK 8m12s"]
        R3["11:18:02Z mlapointe export.config json OK 124KB"]
        R4["10:48:33Z mlapointe user.password jenkins OK"]
        R5["10:32:11Z system health.check cluster:6 1 node slow"]
        R6["09:14:00Z system backup.run hourly-incremental OK 120MB"]
        R7["08:48:02Z mlapointe theme.activate phosphor-crt OK"]
        R8["07:32:18Z mlapointe plugin.install zfs-monitor OK 4.2MB"]
        R9["06:18:00Z system cluster.heartbeat all nodes OK"]
        R10["04:00:00Z system backup.run weekly-full-cluster OK 24GB"]
      end
    end
  end
```

### Note on rename

```mermaid
flowchart LR
  Old["Old: heading text 'Recent Admin Actions'<br/>in 16-system.svg lines 105"]
  New["New: heading text 'Audit Log'<br/>to match tab label in ui-index §17"]
  Old -->|T76e rename| New
```

---

## 6. TAB 6: Updates (`16-system-6-updates.svg`)

### Page structure (NEW content — no current spec)

```mermaid
flowchart TB
  subgraph Header["Header (56px) — same as all tabs"]
    H[Logo / Brand / TZ / Bell / Avatar]
  end
  subgraph Sidebar["Sidebar — same as all tabs"]
    S[Overview + Admin]
  end
  subgraph Main["Main content — Updates tab (Admin only)"]
    P1[Page header: System Management + Admin-only badge]
    subgraph TabNav["Tab nav — Updates ACTIVE"]
      TA[Backups] ~~~ TB[Exports] ~~~ TC[Stats] ~~~ TD[History] ~~~ TE[Audit Log] ~~~ TF["Updates<br/><b>ACTIVE</b>"]
    end
    subgraph CurrentVer["Current version panel"]
      CV1[CloudBSD Admin v14.2.1]
      CV2["Channel: Stable<br/>(NOT showing git hash per ui-index §16)"]
      CV3[Last update: 2026-04-12 14:00 UTC]
      CV4[ZFS rollback available: snapshot pre-update-2026-04-12]
      CV5[Buttons: Check for updates · Roll back]
    end
    subgraph Available["Available updates panel"]
      PH[Heading: 'Available updates']
      subgraph Updates["3 update rows"]
        direction LR
        U1["v14.3.0 (stable, 2026-07-15)<br/>Adds: ZFS send/receive UI, dual-stack IP<br/>Risk: low · ~5min downtime<br/>[Apply] [Schedule]"]
        U2["v15.0.0-edge (edge, 2026-07-20)<br/>Adds: theme picker rewrite, plugin sandbox<br/>Risk: medium · manual upgrade<br/>[Apply] [Schedule]"]
        U3["patch-0014 (hotfix, 2026-07-25)<br/>Fixes: session expiry, JSONL audit timing<br/>Risk: very low<br/>[Apply] [Schedule]"]
      end
    end
    subgraph Channels["Channels panel"]
      CH1["Channel radio: ○ Stable  ● Edge  ○ LTS"]
      CH2["Channel description: 'Edge — pre-release, daily updates'"]
    end
    subgraph Schedule["Schedule-update inline form (when Schedule clicked)"]
      SCH1[Date: 2026-08-01]
      SCH2[Time: 03:00 UTC]
      SCH3[Window: 03:00-05:00 UTC]
      SCH4[Buttons: Schedule · Cancel]
    end
  end
```

### Update flow state diagram

```mermaid
stateDiagram-v2
  [*] --> CheckUpdates
  CheckUpdates --> Idle: check
  Idle --> ApplyNow: click [Apply] on stable update
  ApplyNow --> Idle: confirm
  ApplyNow --> Applying: progress
  Applying --> Idle: success / failure (toast per ui-index §12)
  Idle --> ScheduleUpdate: click [Schedule]
  ScheduleUpdate --> Idle: fill form + click Schedule
  ScheduleUpdate --> Idle: click Cancel
  Idle --> ChannelChange: radio select
  ChannelChange --> Idle: confirm channel
  Idle --> Rollback: click [Roll back]
  Rollback --> Idle: confirm + ZFS rollback
```

### Forbidden-patterns compliance (per ui-index §16)

```mermaid
flowchart TD
  Start[Version display]
  Start --> Q1{Show git commit hash?}
  Q1 -->|YES| V1[VIOLATES ui-index §16<br/>'Git commit hash in About (closed-source)']
  Q1 -->|NO| Q2{Show backend version in dashboard?}
  Q2 -->|YES| V2[VIOLATES ui-index §16<br/>'Backend version in dashboard (only in /about)']
  Q2 -->|NO| OK[OK: show only<br/>semver (v14.2.1) + channel + last-update time]
```

### Update → MIME type mapping

| Endpoint | MIME type |
|---|---|
| `GET /api/updates/current` | `application/vnd.cloudbsd+current-version+json` |
| `GET /api/updates/available` | `application/vnd.cloudbsd+available-updates+json` |
| `POST /api/updates/apply` | request: `application/vnd.cloudbsd+update-apply+json` |
| `POST /api/updates/schedule` | request: `application/vnd.cloudbsd+update-schedule+json` |
| `POST /api/updates/rollback` | request: `application/vnd.cloudbsd+update-rollback+json` |

---

## 7. Landing page (`16-system.svg` after T76)

```mermaid
flowchart TB
  subgraph Header["Header — same as all tabs"]
    H[Logo / Brand / TZ / Bell / Avatar]
  end
  subgraph Sidebar["Sidebar — same as all tabs"]
    S[Overview + Admin]
  end
  subgraph Main["Main content — System Management landing"]
    P1[Page header: System Management + Admin-only badge]
    subgraph TabNavOnly["Tab nav with 6 LINKS (no inline content)"]
      direction LR
      L1["Backups<br/>→ 16-system-1-backups.svg"]
      L2["Exports<br/>→ 16-system-2-exports.svg"]
      L3["Stats<br/>→ 16-system-3-stats.svg"]
      L4["History<br/>→ 16-system-4-history.svg"]
      L5["Audit Log<br/>→ 16-system-5-audit-log.svg"]
      L6["Updates<br/>→ 16-system-6-updates.svg"]
    end
    subgraph QuickSummary["Quick summary panel (3 cards)"]
      direction LR
      Q1["Last backup<br/>daily-tank-data<br/>12:42:18Z · healthy"]
      Q2["Storage used<br/>4.2 TB / 8 TB<br/>52% used"]
      Q3["Updates<br/>1 available<br/>v14.3.0"]
    end
  end
```

Click any tab → routes to corresponding tab SVG. Landing page is the new minimal `16-system.svg`.

---

## 8. Cross-tab invariants

All 6 tab SVGs share these elements (per `diagrams/README.md` + ui-index §20):

```mermaid
flowchart TB
  subgraph SharedElements["Shared across all 6 tab SVGs"]
    direction TB
    S1["Header<br/>(56px, logo + breadcrumb + TZ + bell + avatar)"]
    S2["Sidebar (224px)<br/>15 items per ui-index §8<br/>= 8 Overview + 7 Admin (incl. Nodes + System Mgmt)"]
    S3["Tab nav (44px)<br/>6 tabs, one ACTIVE<br/>per ui-index §17"]
    S4["Color palette<br/>ui-index §20<br/>(#f1f5f9, #2563eb, etc.)"]
    S5["Inline styles ONLY<br/>(no class=, no Tailwind)<br/>per lessons.md"]
    S6["Viewport: 1280x800<br/>per diagrams/README.md"]
  end

  subgraph TabContent["Per-tab content (varies)"]
    T1Content[TAB 1: Backup task table]
    T2Content[TAB 2: 8 export buttons]
    T3Content[TAB 3: 12 stats + 4 sparklines]
    T4Content[TAB 4: 50-event timeline]
    T5Content[TAB 5: 10-row audit table]
    T6Content[TAB 6: 3 update rows + channel selector]
  end

  SharedElements --> TabContent
```

### Visual constant references (sampling from existing files)

| Element | Source location | Color/style |
|---|---|---|
| Sidebar item layout | `02-vms.svg` lines 21-38 (15 items per T74) | padding 7px 12px, border-radius 6px |
| Active sidebar highlight | `02-vms.svg` line 36 (`System Mgmt`) | bg linear-gradient `#eff6ff,#dbeafe`, color `#1d4ed8`, border-left `3px solid #2563eb` |
| Tab nav tab item | `16-system.svg` line 48 | padding 10px 16px, font-size 12px |
| Active tab style | `16-system.svg` line 48 (Backups ACTIVE) | color `#1d4ed8`, border-bottom `2px solid #2563eb` |
| Stats card | `16-system.svg` line 88-99 | background `#f8fafc`, border-radius 6px, padding 10px |

---

## 9. Executor conversion steps

The executor (`/start-work angular-migration`) renders each tab into a 1280×800 SVG:

```mermaid
sequenceDiagram
    participant Planner as prometheus (this spec)
    participant Executor as Sisyphus executor
    participant Files as diagrams/screens/

    Planner->>Executor: Read system-mgmt-tabs-visual-spec.md
    Executor->>Files: Generate 16-system-1-backups.svg (T76a)
    Executor->>Files: Generate 16-system-2-exports.svg (T76b)
    Executor->>Files: Generate 16-system-3-stats.svg (T76c, +4 sparklines)
    Executor->>Files: Generate 16-system-4-history.svg (T76d, NEW content)
    Executor->>Files: Generate 16-system-5-audit-log.svg (T76e, rename)
    Executor->>Files: Generate 16-system-6-updates.svg (T76f, NEW content)
    Executor->>Files: Rewrite 16-system.svg as landing page
    Executor->>Planner: All 7 SVGs delivered
    Planner-->>Files: F1 audit verifies 7 SVGs
```

Per SVG:
1. Use the Mermaid `flowchart` above as structural blueprint
2. Replace Mermaid nodes with `<div style="position:absolute;left:Xpx;top:Ypx;width:Wpx;height:Hpx;...">` per lessons.md conventions
3. Sample data from existing `16-system.svg` lines 50-122 (Backups/Exports/Stats/Audit panels)
4. Generate new content for History (per §4 above) and Updates (per §6 above)
5. Verify all 7 SVGs follow inline-styles-only convention (`grep -r 'class="' diagrams/screens/16-system*.svg` returns 0)
6. All SVGs at viewBox `0 0 1280 800` and `width="100%" preserveAspectRatio="xMidYMid meet"`

---

## 10. Cross-reference table

| This spec | Plan task | Audit section |
|---|---|---|
| Tab 1 Backups | T76a | audit §19, §19.10 |
| Tab 2 Exports | T76b | audit §19, §19.10 |
| Tab 3 Stats | T76c | audit §19, §19.10 (sparklines NEW) |
| Tab 4 History | T76d (NEW content) | audit §19, §19.4 |
| Tab 5 Audit Log | T76e (rename) | audit §19, §19.10 |
| Tab 6 Updates | T76f (NEW content) | audit §19.4 |
| Landing page | T76 (rewrite) | audit §19.5 option C |
| Backup-create modal | T77 | audit §21 |
| Detail panels | T78-T82 | audit §23 |
| Plugin/theme mocks | T83-T84 | audit §23 |

---

## 11. Sign-off

This document is the **Mermaid-based visual spec** for the 6 System Management tabs.

User can preview this spec in any markdown viewer (GitHub, VS Code, Obsidian)
to verify visual coverage of all 6 tabs without waiting for SVG generation.

Date: 2026-07-07
Author: prometheus (planner)
Status: MERMAID VISUAL SPEC COMPLETE — executor converts to SVG per Wave 10 T76a-T76f.
