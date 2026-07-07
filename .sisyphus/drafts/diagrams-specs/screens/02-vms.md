# 02-vms.svg — Detailed Spec

**Target size**: 50-70 KB
**Viewport**: 1280×800
**View-only**: No Start/Stop/Restart/Delete/Apply buttons

## Layout

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ HEADER (canonical)                                                               │
├──────────────────────────────────────────────────────────────────────────────────┤
│ SIDEBAR (canonical)                          │ MAIN                              │
│                                                │                                   │
│                                                │ ┌─Toolbar─────────────────────┐ │
│                                                │ │ [Filter VMs...] [Filter ▾]  │ │
│                                                │ │ [All:47][Run:39][Stop:6]    │ │
│                                                │ │ [Pause:1][Error:1]           │ │
│                                                │ │  [Host▾][OS▾]    [▦|≡][Exp]  │ │
│                                                │ └──────────────────────────────┘ │
│                                                │                                   │
│                                                │ ┌─Table────────────────────────┐ │
│                                                │ │ Name ▲|Status|OS|vCPU|RAM...│ │
│                                                │ │ nextcloud  ●RUN  Deb12  4 8GB│ │
│                                                │ │ homeass.   ●RUN  HAOS   2 4GB│ │
│                                                │ │ jellyfin   ●RUN  Ubu24  6 12G│ │
│                                                │ │ postgres   ○STOP  Deb12  2 4G│ │
│                                                │ │ win11      ◐PAUS  Win11  4 8G│ │
│                                                │ │ gitlab     ●RUN  Alp   2 4G│ │
│                                                │ │ mastodon   ●RUN  Deb12  4 8G│ │
│                                                │ │ node02-win ✕ERR   WS22   8 16│ │
│                                                │ │ gitea      ●RUN  Ubu22  2 4G│ │
│                                                │ │ pihole     ●RUN  Deb12  1 1G│ │
│                                                │ │ immich     ●RUN  Deb12  4 8G│ │
│                                                │ │ paperless  ○STOP  Deb12  2 4G│ │
│                                                │ └──────────────────────────────┘ │
│                                                │                                   │
│                                                │ Pagination: < 1 2 3 4 >  50/page▾│
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Table Columns (13)

| # | Column | Width | Content |
|---|--------|-------|---------|
| 1 | Name | 140px | VM name (link styled) |
| 2 | Status | 90px | Colored dot + label |
| 3 | OS | 130px | Badge with version |
| 4 | vCPU | 60px | Number |
| 5 | RAM | 70px | "8.0 GB" |
| 6 | Disk | 80px | "120 GB" |
| 7 | Uptime | 100px | "14d 02:11" |
| 8 | Host | 110px | Hostname |
| 9 | Tags | 120px | Colored chips |
| 10 | IP | 110px | "10.0.10.10" |
| 11 | IOPS | 70px | "1.2k" |
| 12 | Net rx/tx | 110px | "12.4 / 4.1 MB/s" |
| 13 | Created | 100px | "2026-06-22" |

## Row Data (12 rows)

| Name | Status | OS | vCPU | RAM | Disk | Uptime | Host | Tags | IP | IOPS | Net | Created |
|------|--------|----|-----:|-----|------|--------|------|------|----|------|------|---------|
| nextcloud | ● RUN | Debian 12 | 4 | 8.0 GB | 120 GB | 14d 02:11 | freenas-mock | [prod][files] | 10.0.10.10 | 1.2k | 12.4/4.1 | 2026-06-22 |
| homeassistant | ● RUN | HAOS 12 | 2 | 4.0 GB | 32 GB | 8d 18:42 | freenas-mock | [smarthome] | 10.0.10.12 | 380 | 0.6/0.2 | 2026-06-27 |
| jellyfin | ● RUN | Ubuntu 24.04 | 6 | 12.0 GB | 500 GB | 22d 06:00 | freenas-mock | [media] | 10.0.10.11 | 4.8k | 86.1/12.4 | 2026-06-14 |
| postgres-dev | ○ STOP | Debian 12 | 2 | 4.0 GB | 80 GB | — | freenas-mock | [dev] | 10.0.10.20 | — | —/— | 2026-05-12 |
| win11-sandbox | ◐ PAUS | Windows 11 | 4 | 8.0 GB | 100 GB | 0d 04:18 | freenas-mock | [test] | 10.0.10.30 | 0 | 0.0/0.0 | 2026-07-05 |
| gitlab-runner | ● RUN | Alpine 3.20 | 2 | 4.0 GB | 40 GB | 5d 11:02 | freenas-mock | [ci] | 10.0.10.40 | 220 | 1.1/0.3 | 2026-07-01 |
| mastodon | ● RUN | Debian 12 | 4 | 8.0 GB | 200 GB | 32d 14:09 | node-02 | [social] | 10.0.20.10 | 1.6k | 8.2/7.5 | 2026-06-04 |
| node-02-win | ✕ ERR | Win Srv 2022 | 8 | 16.0 GB | 250 GB | 1d 02:44 | node-02 | [infra] | 10.0.20.11 | 0 | 0.0/0.0 | 2026-07-05 |
| gitea | ● RUN | Ubuntu 22.04 | 2 | 4.0 GB | 50 GB | 11d 09:33 | freenas-mock | [dev] | 10.0.10.50 | 540 | 2.1/0.9 | 2026-06-25 |
| pihole-vm | ● RUN | Debian 12 | 1 | 1.0 GB | 8 GB | 19d 21:11 | freenas-mock | [network] | 10.0.10.60 | 60 | 0.1/0.0 | 2026-06-16 |
| immich | ● RUN | Debian 12 | 4 | 8.0 GB | 800 GB | 7d 03:24 | freenas-mock | [media][backup] | 10.0.10.70 | 2.2k | 14.2/8.7 | 2026-06-29 |
| paperless-ngx | ○ STOP | Debian 12 | 2 | 4.0 GB | 60 GB | — | freenas-mock | [docs] | 10.0.10.80 | — | —/— | 2026-06-18 |

## Row 5 (win11-sandbox) — Hover State

Background: `bg-blue-50`
Left border: `border-l-4 border-blue-500`

## Toolbar

```
[Filter VMs...                              ] [⚙ Filter ▾] [All:47] [Run:39] [Stop:6] [Pause:1] [Error:1]  Host:[all ▾] OS:[all ▾]    [▦ Grid][≡ List]   [Export]
```

## Pagination Footer

```
Showing 1–12 of 47 VMs   [<] [1] 2 3 4 [>]   50/page ▾
```

## Aggregate Stats Bar (above table)

```
┌──────────┬──────────┬──────────┬──────────┐
│ 47 VMs   │ 39 Run   │ 6 Stop   │ 1 Error  │
│ ▓▓▓▓░░░  │ 83%      │ 13%      │ 2%       │
└──────────┴──────────┴──────────┴──────────┘
```

## SVG Skeleton

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" width="1280" height="800" font-family="system-ui, sans-serif">
  <title>CloudBSD Admin — VMs</title>
  <foreignObject x="0" y="0" width="1280" height="800">
    <div xmlns="http://www.w3.org/1999/xhtml" class="h-full bg-slate-50 text-slate-900">
      <g id="header">[canonical]</g>
      <div class="flex" style="height: calc(800px - 56px)">
        <g id="sidebar">[canonical]</g>
        <g id="content" class="flex-1 p-6 space-y-4 overflow-auto">
          [Toolbar]
          [Stats bar]
          [Table]
          [Pagination]
        </g>
      </div>
    </div>
  </foreignObject>
</svg>
```

## Constraints

- No Start/Stop/Restart/Delete buttons anywhere
- View-only buttons: Refresh, Filter, Export, View details
- One row shown in hover state (row 5: win11-sandbox)
- Column header has sort indicator on Name (▲)
- Pagination shown

## Files Referenced

- Existing simple version: `diagrams/screens/02-vms.svg` (9KB)
- Adjustment rationale: `.sisyphus/drafts/ADJUSTMENTS.md`