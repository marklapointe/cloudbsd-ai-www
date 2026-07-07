# 01-dashboard.svg — Detailed Spec

**Target size**: 50-70 KB
**Viewport**: 1280×800
**Theme**: CloudBSD/REVYTECH (default light, blue/slate)
**View-only**: No Start/Stop/Delete/Save buttons

## Layout

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ HEADER (h-14, white bg, slate-200 bottom border)                                 │
│  [Logo C] CloudBSD Admin  [cloudbsd-node-01] [●connected]  [backend OK · 18ms] ...   │
│                                          [Search...] [Refresh] [🔔] [Avatar M]   │
├──────────────────────────────────────────────────────────────────────────────────┤
│ SIDEBAR (w-56, white bg, slate-200 right border)        │ MAIN (bg-slate-50)      │
│                                                          │                         │
│  Dashboard (12)        [active bg-blue-50]               │  ┌─Toolbar─────────┐   │
│  VMs              (47)                                    │  │ Host: cloudbsd-node-01│  │
│  Containers       (62)                                    │  │ Range: 1h|6h|24h|7d │  │
│  Jails            (12)                                    │  │ [Refresh][Export]  │  │
│  Volumes          (13)                                    │  └──────────────────┘   │
│  Network                                                  │                         │
│  Cluster           (6)                                    │  4×2 WIDGET GRID:       │
│  ─── Admin ───                                             │                         │
│  Users                                                    │  ┌──────┬──────┐         │
│  Logs            (142)                                    │  │ CPU  │ MEM  │         │
│  Notifications    (17)                                    │  ├──────┼──────┤         │
│  Settings                                                 │  │ DISK │ NET  │         │
│  Status                                                   │  ├──────┼──────┤         │
│  About                                                    │  │ TEMP │ LOAD │         │
│                                                          │  ├──────┼──────┤         │
│                                                          │  │ PROC │ ZFS  │         │
│                                                          │  └──────┴──────┘         │
│                                                          │                         │
│                                                          │  ┌─Recent Activity────┐ │
│                                                          │  │ 12:42 zfs snapshot │ │
│                                                          │  │ 12:31 jail STARTED │ │
│                                                          │  │ ... 10 events ...   │ │
│                                                          │  └─────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Widget Details (8 widgets)

### Widget 1: CPU
```
┌──────────────────────────────────────┐
│ CPU Usage                       [↗]  │
│                                       │
│  ┌─donut──┐    Load Avg:             │
│  │  42%   │    1.42 / 1.38 / 1.21    │
│  └────────┘                           │
│                                       │
│  Cores:                              │
│  ▓▓▓▓░░░░ 38%  ▓▓▓░░░░░░ 28%         │
│  ▓▓▓▓▓░░░ 52%  ▓▓░░░░░░░ 18%         │
│  ▓▓▓▓▓▓░░ 68%  ▓▓▓▓░░░░ 42%         │
│  ▓▓▓░░░░░ 32%  ▓▓░░░░░░░ 14%         │
│                                       │
│  ──24h sparkline────                  │
│                                       │
│  [View details]                      │
└──────────────────────────────────────┘
```

### Widget 2: Memory
```
┌──────────────────────────────────────┐
│ Memory                          [↗]  │
│                                       │
│  8.2 / 16 GB                          │
│  ▓▓▓▓▓▓▓▓░░ 51%                       │
│                                       │
│  Used: 6.4 GB                         │
│  Buffers: 1.2 GB                      │
│  Cache: 1.8 GB                       │
│  ARC: 2.4 GB                          │
│  Swap: 64 MB (1%)                     │
│                                       │
│  ──24h sparkline────                  │
└──────────────────────────────────────┘
```

### Widget 3: Disk
```
┌──────────────────────────────────────┐
│ Disk                            [↗]  │
│                                       │
│  Total: 245 / 920 GB                  │
│                                       │
│  tank/data     245/920GB   ▓▓▓░ 27%  │
│  tank/media    3.2/4.0TB   ▓▓▓▓ 80%⚠│
│  tank/vms      612/800GB   ▓▓▓ 76%  │
│  tank/backups  412/1.5TB   ▓▓░ 27%  │
│                                       │
│  Last scrub: 2d ago                   │
│  Status: healthy                       │
│                                       │
│  ──24h sparkline────                  │
└──────────────────────────────────────┘
```

### Widget 4: Network
```
┌──────────────────────────────────────┐
│ Network                          [↗]  │
│                                       │
│  ↑ 12.4 MB/s    ↓ 86.1 MB/s          │
│                                       │
│  Interfaces:                          │
│  ● igc0    up    1GbE   142K pkts/s  │
│  ● bge0    up    1GbE    18K pkts/s  │
│  ● lo0     up    -       2K pkts/s   │
│                                       │
│  ──24h sparkline (rx/tx)──           │
└──────────────────────────────────────┘
```

### Widget 5: Temperature
```
┌──────────────────────────────────────┐
│ Temperature                      [↗]  │
│                                       │
│  CPU:    47°C  [normal]              │
│  NVMe:   38°C  [normal]              │
│  Ambient: 41°C [normal]              │
│                                       │
│  Sensor calibrated 2026-06-12         │
└──────────────────────────────────────┘
```

### Widget 6: Load Avg
```
┌──────────────────────────────────────┐
│ Load Average                     [↗]  │
│                                       │
│  1m     5m     15m                   │
│  1.42   1.38   1.21                   │
│  ▓▓▓░░░  ▓▓▓░░░  ▓▓░░░░░░            │
│                                       │
│  Threshold:                          │
│  ▒▒ normal (0-2)                    │
│  ▒▒ warn (2-4)                       │
│  ▒▒ crit (>4)                        │
└──────────────────────────────────────┘
```

### Widget 7: Top Processes
```
┌──────────────────────────────────────┐
│ Processes (312 total)           [↗]  │
│                                       │
│  PID    USER    %CPU  %MEM  CMD       │
│  1242   www     18%   8.2%  nginx     │
│  8821   pgsql   14%   24%   postgres  │
│  3104   root    12%   4.1%  vm-bhyve  │
│  9214   mlap    8%    2.1%  sshd      │
│  5512   mlap    6%    1.8%  zsh       │
└──────────────────────────────────────┘
```

### Widget 8: ZFS Health
```
┌──────────────────────────────────────┐
│ ZFS Health                       [↗]  │
│                                       │
│  Pool: tank (healthy)                 │
│  Fragmentation: 4%                   │
│  ARC hit ratio: 87.4%                 │
│  Last scrub: 2d ago (no errors)       │
│  Next scrub: in 12 days              │
└──────────────────────────────────────┘
```

## Recent Activity Feed (10 events)

```
┌──────────────────────────────────────────────────────────┐
│ Recent Activity                                           │
│ 12:42:01 ●  zfs snapshot daily@auto-2026-07-06 created   │
│ 12:31:18 ●  jail transmission entered STATE: STARTED     │
│ 12:18:44 ●  vm nextcloud guest-agent heartbeat (3s)      │
│ 11:55:09 ●  scrub of tank completed (0 errors)           │
│ 11:42:18 ●  alert resolved: tank/data < 80%             │
│ 11:14:02 ●  ct nginx-proxy restarted (exit 0)           │
│ 10:58:33 ●  jail pi-hole blocked 1,204 queries          │
│ 10:33:07 ●  vm nextcloud snapshot to offsite OK         │
│ 09:48:22 ●  backup snapshot daily replicated             │
│ 09:14:00 ●  systemd timer fstrim ran (freed 2.4 GB)     │
└──────────────────────────────────────────────────────────┘
```

## Top Consumers Bar Chart

```
┌──────────────────────────────────────────────────────────┐
│ Top Consumers (last 5 min)                               │
│ vm-bhyve/jellyfin      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░  86.1 MB/s     │
│ postgres-16            ▓▓▓▓▓▓░░░░░░░░░░░░░  42.0 MB/s    │
│ jail/syncthing         ▓▓▓▓▓░░░░░░░░░░░░░░  28.4 MB/s    │
│ vm-bhyve/nextcloud     ▓▓▓▓░░░░░░░░░░░░░░░  21.2 MB/s    │
│ jail/transmission      ▓▓▓░░░░░░░░░░░░░░░░░  14.8 MB/s    │
└──────────────────────────────────────────────────────────┘
```

## SVG Skeleton

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" width="1280" height="800" font-family="system-ui, sans-serif">
  <title>CloudBSD Admin — Dashboard</title>
  <foreignObject x="0" y="0" width="1280" height="800">
    <div xmlns="http://www.w3.org/1999/xhtml" class="h-full bg-slate-50 text-slate-900">
      <g id="header">[canonical header]</g>
      <div class="flex" style="height: calc(800px - 56px)">
        <g id="sidebar">[canonical sidebar with badges]</g>
        <g id="content">
          <!-- Toolbar -->
          <div class="h-14 bg-white border-b border-slate-200 px-6 flex items-center gap-4">
            <span class="text-sm text-slate-500">Host: <b class="text-slate-900">cloudbsd-node-01</b></span>
            <div class="flex border border-slate-200 rounded text-xs">
              <button class="px-2 py-1 text-slate-500">1h</button>
              <button class="px-2 py-1 bg-slate-100 font-medium">24h</button>
              <button class="px-2 py-1 text-slate-500">7d</button>
              <button class="px-2 py-1 text-slate-500">30d</button>
            </div>
            <span class="text-xs text-slate-500">Last updated: 4s ago</span>
            <div class="ml-auto flex gap-2">
              <button class="text-xs px-3 py-1.5 border border-slate-200 rounded text-slate-700 hover:bg-slate-50">Refresh</button>
              <button class="text-xs px-3 py-1.5 border border-slate-200 rounded text-slate-700 hover:bg-slate-50">Export</button>
            </div>
          </div>
          <div class="p-6 space-y-4 overflow-auto" style="height: calc(800px - 56px - 56px)">
            <div class="grid grid-cols-4 gap-4">
              [8 widgets here]
            </div>
            [Activity feed]
            [Top consumers chart]
          </div>
        </g>
      </div>
    </div>
  </foreignObject>
</svg>
```

## Constraints

- View-only: Only Refresh/Export/Filter buttons
- WCAG 2.1 AA contrast (text-slate-900 on bg-white = 16:1)
- Sparklines: 120×24 viewBox, polyline points
- Status dots: w-1.5 h-1.5 rounded-full
- Hover/focus states NOT shown (static mockup)

## Files Referenced

- Existing simple version: `diagrams/screens/01-dashboard.svg` (9KB)
- Architecture: `diagrams/architecture/01-system-architecture.md`