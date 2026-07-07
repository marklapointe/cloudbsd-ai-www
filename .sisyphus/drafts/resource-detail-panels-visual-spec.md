# Resource Detail Panels — Mermaid Visual Spec (2026-07-07)

> **Purpose**: Visual layout spec for the 5 resource detail panels (per audit §23).
> Rendered entirely in **Mermaid** (per `lessons.md` convention).
>
> **Detail panel pattern precedent**: `08-users.svg` opens a right-side detail panel for selected user. Same pattern extended to VMs/Containers/Jails/Volumes/Nodes.

---

## 0. Layout pattern (consistent across all 5 detail panels)

```mermaid
flowchart LR
  subgraph Layout["Viewport 1280x800"]
    direction LR
    subgraph LeftList["Left: List view (~640px)"]
      direction TB
      L1[Filter row: search + chips per ui-index §4]
      L2[Table: 47/62/12/13/6 rows]
      L3[Pagination per ui-index §19]
      L4["Selected row highlighted<br/>(gradient bg, blue border-left)"]
    end
    subgraph RightDetail["Right: Detail panel (~640px)"]
      direction TB
      D1[Header: name + status pill]
      D2[Tab nav per ui-index §17]
      D3[Active tab content]
      D4[Action buttons at bottom: View / Edit / Snapshots / Start/Stop / Delete]
    end
    LeftList -->|click row| RightDetail
  end
```

---

## 1. VM Detail Panel (`19-vm-detail-panel.svg` + `20-vm-detail-overview.svg`)

### Structure

```mermaid
flowchart TB
  subgraph Header["Header: VM name + status pill"]
    H1["nextcloud"]
    H2["● RUN<br/>badge bg #d1fae5, color #065f46"]
    H3[VM id: ulid-xxx]
  end
  subgraph TabNav["Tab nav (7 tabs per ui-index §17 example)"]
    direction LR
    T1["Overview<br/><b>ACTIVE</b>"]
    T2[Disks]
    T3[Network]
    T4[Snapshots]
    T5[Console]
    T6[Logs]
    T7[Settings]
  end
  subgraph OverviewContent["Overview tab (active)"]
    O1[Section: Identity]
    O2["id: ulid-xxx<br/>name: nextcloud<br/>description: Personal cloud"]
    O3[Section: Configuration]
    O4["type: bhyve<br/>OS: Debian 12<br/>generation: 2"]
    O5[Section: Resources]
    O6["vCPU: 4 cores<br/>RAM: 8 GB<br/>Disk: 80 GB<br/>(per data-structures.md interface VM)"]
    O7[Section: Network]
    O8["IPv4: 10.0.10.10<br/>IPv6: fd00::10 (dual-stack per 16-ips-modal.svg)"]
    O9[Section: Schedule / State]
    O10["uptime: 14d 02:11<br/>created: 2026-05-20<br/>next backup: 02:00 UTC"]
  end
  subgraph ActionBar["Action bar (bottom)"]
    A1["View (primary blue)"] ~~~ A2[Edit] ~~~ A3[Snapshot] ~~~ A4[Start/Stop] ~~~ A5[Delete (red, type-to-confirm)]
  end
```

### VM tabs (7 per ui-index §17 example)

```mermaid
flowchart LR
  Tab1["Overview<br/>= Identity + Configuration + Resources + Network + State"]
  Tab2["Disks<br/>= List of attached disks (size/used/usage)"]
  Tab3["Network<br/>= Interfaces + IPs (dual-stack)"]
  Tab4["Snapshots<br/>= ZFS snapshots list + View diff / Rollback"]
  Tab5["Console<br/>= noVNC iframe (token from /api/vms/{id}/console-token)"]
  Tab6["Logs<br/>= Tail of VM stderr/stdout"]
  Tab7["Settings<br/>= Metadata edit (read-only meta — view-only directive)"]
```

### Data source

```mermaid
erDiagram
  VMDetailPanel {
    string vmId FK
    string name
    string status "RUN|STOP|PAUSE|ERROR"
    string description
    string os
    int vcpu
    string ram "Quantity unit GB"
    string disk "Quantity unit GB"
    int uptimeSec
    ipv4 ipv4Addr
    ipv6 ipv6Addr
  }
  VMDisk {
    string diskId FK
    string size "Quantity"
    string used "Quantity"
    float usagePercent
    string mountpoint
  }
  VMNetwork {
    string ifaceId FK
    ipv4 ipv4Addr
    ipv6 ipv6Addr
    string vlan
    string mac
  }
  VMSnapshot {
    string snapId FK
    int epochMs
    string size
    string parent "snapshot chain"]
  }
  VMDetailPanel ||--o{ VMDisk : has
  VMDetailPanel ||--o{ VMNetwork : has
  VMDetailPanel ||--o{ VMSnapshot : has
```

### API endpoints

| Endpoint | MIME type |
|---|---|
| `GET /api/vms/{id}` | `application/vnd.cloudbsd+vm+json` |
| `GET /api/vms/{id}/disks` | `application/vnd.cloudbsd+vm-disk+list` |
| `GET /api/vms/{id}/network` | `application/vnd.cloudbsd+vm-network+list` |
| `GET /api/vms/{id}/snapshots` | `application/vnd.cloudbsd+vm-snapshot+list` |
| `GET /api/vms/{id}/logs` | `application/vnd.cloudbsd+vm-log+list` |
| `GET /api/vms/{id}/console-token` | `application/vnd.cloudbsd+vm-console-token+json` (already §2.20) |

View-only directive: NO write endpoints (POST/PUT/DELETE) for VMs per audit §21.5.

---

## 2. Container Detail Panel (`20-container-detail-panel.svg`)

### Structure

```mermaid
flowchart TB
  subgraph Header["Header: Container name + status pill"]
    H1["postgres-16"]
    H2["● RUN<br/>badge: green per ui-index §5"]
    H3["Image: postgres:16-alpine<br/>tag: docker.io/library/postgres"]
  end
  subgraph TabNav["Tab nav (5 tabs)"]
    direction LR
    T1["Overview<br/><b>ACTIVE</b>"]
    T2[Disks]
    T3[Network]
    T4[Logs]
    T5[Env vars]
  end
  subgraph OverviewContent["Overview tab (active)"]
    O1[Section: Identity]
    O2["id: ulid-yyy<br/>name: postgres-16<br/>image: postgres:16-alpine"]
    O3[Section: Resources]
    O4["CPU%: 12% (live)<br/>MEM: 380 MB / 1 GB<br/>Net: 2.4 MB/s in, 1.1 MB/s out"]
    O5[Section: Network]
    O6["Ports: 5432->5432 (TCP)<br/>IPv4: 172.17.0.4"]
    O7[Section: State]
    O8["uptime: 18d 04:32<br/>restart count: 0<br/>restart policy: unless-stopped"]
  end
  subgraph ActionBar["Action bar (bottom, view-only)"]
    A1[View] ~~~ A2[Logs] ~~~ A3[Stats] ~~~ A4[Inspect]
  end
```

### Container tabs

```mermaid
flowchart LR
  Tab1["Overview<br/>Identity + Resources + Network + State"]
  Tab2["Disks<br/>= Mount points + volumes"]
  Tab3["Network<br/>= Port mappings + IPs"]
  Tab4["Logs<br/>= stdout/stderr tail"]
  Tab5["Env vars<br/>= Key-value list (sensitive values masked)"]
```

### API endpoints

| Endpoint | MIME type |
|---|---|
| `GET /api/containers/{id}` | `application/vnd.cloudbsd+container+json` |
| `GET /api/containers/{id}/disks` | `application/vnd.cloudbsd+container-disk+list` |
| `GET /api/containers/{id}/network` | `application/vnd.cloudbsd+container-network+list` |
| `GET /api/containers/{id}/logs` | `application/vnd.cloudbsd+container-log+list` |
| `GET /api/containers/{id}/env` | `application/vnd.cloudbsd+container-env+list` |

---

## 3. Jail Detail Panel (`21-jail-detail-panel.svg`)

### Structure

```mermaid
flowchart TB
  subgraph Header["Header: Jail hostname + status pill"]
    H1["homebridge"]
    H2["● RUN<br/>badge: green"]
    H3["JID: 12<br/>Hostname: homebridge.local"]
  end
  subgraph TabNav["Tab nav (5 tabs)"]
    direction LR
    T1["Overview<br/><b>ACTIVE</b>"]
    T2[IPs]
    T3[Network]
    T4[Limits]
    T5[Logs]
  end
  subgraph OverviewContent["Overview tab (active)"]
    O1[Section: Identity]
    O2["JID: 12<br/>hostname: homebridge.local<br/>name: homebridge"]
    O3[Section: Configuration]
    O4["type: ezjail<br/>base: FreeBSD 14.2-RELEASE<br/>template: homeautomation"]
    O5[Section: Resources]
    O6["vCPUs: 2<br/>RAM: 1 GB<br/>Disk: 8 GB<br/>(per data-structures.md interface Jail)"]
    O7[Section: Network]
    O8["IPv4: 10.0.30.42<br/>no IPv6"]
    O9[Section: State]
    O10["uptime: 47d 14:08<br/>state: active"]
  end
```

### Jail tabs

```mermaid
flowchart LR
  Tab1["Overview<br/>Identity + Configuration + Resources + Network + State"]
  Tab2["IPs<br/>= List of bound IPs (v4 + v6)"]
  Tab3["Network<br/>= Interfaces + VLANs"]
  Tab4["Limits<br/>= rctl rules (CPU%, memory, disk-IO)"]
  Tab5["Logs<br/>= jail.log tail"]
```

### API endpoints

| Endpoint | MIME type |
|---|---|
| `GET /api/jails/{id}` | `application/vnd.cloudbsd+jail+json` |
| `GET /api/jails/{id}/ips` | `application/vnd.cloudbsd+jail-ip+list` |
| `GET /api/jails/{id}/network` | `application/vnd.cloudbsd+jail-network+list` |
| `GET /api/jails/{id}/limits` | `application/vnd.cloudbsd+jail-limit+list` |
| `GET /api/jails/{id}/logs` | `application/vnd.cloudbsd+jail-log+list` |

---

## 4. Volume Detail Panel (`22-volume-detail-panel.svg`)

### Structure

```mermaid
flowchart TB
  subgraph Header["Header: Volume name + health pill"]
    H1["tank/data"]
    H2["● HEALTHY<br/>badge: green per ui-index §5"]
    H3["Type: ZFS<br/>Last scrub: 7d ago"]
  end
  subgraph TabNav["Tab nav (6 tabs per ui-index §17 example)"]
    direction LR
    T1["Overview<br/><b>ACTIVE</b>"]
    T2[Datasets]
    T3[Snapshots]
    T4[Scrubs]
    T5[Performance]
    T6[Settings]
  end
  subgraph OverviewContent["Overview tab (active)"]
    O1[Section: Identity]
    O2["id: tank/data<br/>name: tank/data<br/>type: ZFS"]
    O3[Section: Storage]
    O4["size: 1.6 TB<br/>used: 442 GB (27%)<br/>alloc: 28%<br/>compression: lz4"]
    O5[Section: Hosts]
    O6["mounted on: cloudbsd-node-01<br/>shared via: NFS-export on 10.0.10.5"]
    O7[Section: Maintenance]
    O8["last scrub: 2026-06-30 (7d ago)<br/>next scrub: 2026-07-07 (today)<br/>compression ratio: 1.4x"]
  end
```

### Volume tabs (6 per ui-index §17 Volume example)

```mermaid
flowchart LR
  Tab1["Overview<br/>Identity + Storage + Hosts + Maintenance"]
  Tab2["Datasets<br/>= List of child datasets (inheritance)"]
  Tab3["Snapshots<br/>= ZFS snapshots list + View diff / Rollback"]
  Tab4["Scrubs<br/>= Scrub history + Schedule next scrub"]
  Tab5["Performance<br/>= Read/write IOPS, throughput, latency charts"]
  Tab6["Settings<br/>= Compression, encryption, mount options"]
```

### API endpoints

| Endpoint | MIME type |
|---|---|
| `GET /api/volumes/{id}` | `application/vnd.cloudbsd+volume+json` |
| `GET /api/volumes/{id}/datasets` | `application/vnd.cloudbsd+volume-dataset+list` |
| `GET /api/volumes/{id}/snapshots` | `application/vnd.cloudbsd+volume-snapshot+list` |
| `GET /api/volumes/{id}/scrubs` | `application/vnd.cloudbsd+volume-scrub+list` |
| `GET /api/volumes/{id}/performance` | `application/vnd.cloudbsd+volume-performance+json` |

View-only: NO write endpoints for volumes per audit §21.5 (mutations route through TaskSchedule).

---

## 5. Node Detail Panel (`23-node-detail-panel.svg`)

### Structure

```mermaid
flowchart TB
  subgraph Header["Header: Node name + status pill"]
    H1["cloudbsd-node-01"]
    H2["● ONLINE (master)<br/>badge: green"]
    H3["Role: master<br/>Heartbeat: 12s ago"]
  end
  subgraph TabNav["Tab nav (7 tabs per ui-index §17 Node example)"]
    direction LR
    T1["Overview<br/><b>ACTIVE</b>"]
    T2[ZFS]
    T3[GPUs]
    T4[Network]
    T5[VMs]
    T6[Logs]
    T7[Settings]
  end
  subgraph OverviewContent["Overview tab (active)"]
    O1[Section: Identity]
    O2["id: cloudbsd-node-01<br/>hostname: cloudbsd-node-01.local<br/>role: master"]
    O3[Section: Hardware]
    O4["CPU: 8 cores AMD EPYC<br/>RAM: 16 GB<br/>Disk: 240 GB NVMe<br/>GPU: 1x NVIDIA RTX A4000 (per 17-vgpu-pool.svg)"]
    O5[Section: Load]
    O6["CPU%: 42% (load avg: 1.2, 1.5, 1.8)<br/>MEM: 8.2 GB / 16 GB (51%)<br/>Disk: 65 GB / 240 GB (27%)<br/>Net: 124 Mbps in / 88 Mbps out"]
    O7[Section: Health]
    O8["uptime: 14d 02:11<br/>temperature: 48°C<br/>agents: cloudbsd-agent@1.4.2 connected"]
  end
```

### Node tabs (7 per ui-index §17 Node example)

```mermaid
flowchart LR
  Tab1["Overview<br/>Identity + Hardware + Load + Health"]
  Tab2["ZFS<br/>= Pools list (mirror/stripe/raidz)"]
  Tab3["GPUs<br/>= GPU inventory + vGPU pool (per 17-vgpu-pool.svg)<br/>behind showVgpuResources feature flag"]
  Tab4["Network<br/>= Interfaces + VLANs + bonds"]
  Tab5["VMs<br/>= VMs hosted on this node + load"]
  Tab6["Logs<br/>= node.log tail (cloudbsd-agent output)"]
  Tab7["Settings<br/>= Node metadata (feature flags, labels)"]
```

### API endpoints

| Endpoint | MIME type |
|---|---|
| `GET /api/nodes/{id}` | `application/vnd.cloudbsd+node+json` |
| `GET /api/nodes/{id}/zfs` | `application/vnd.cloudbsd+node-zfs+list` |
| `GET /api/nodes/{id}/gpus` | `application/vnd.cloudbsd+node-gpu+list` (per 17-vgpu-pool.svg) |
| `GET /api/nodes/{id}/network` | `application/vnd.cloudbsd+node-network+list` |
| `GET /api/nodes/{id}/vms` | `application/vnd.cloudbsd+node-vm+list` |
| `GET /api/nodes/{id}/logs` | `application/vnd.cloudbsd+node-log+list` |

---

## 6. Cross-detail-panel invariants

All 5 detail panel SVGs share:

```mermaid
flowchart TB
  subgraph Shared["Shared across all 5 detail panels"]
    direction TB
    S1["List on left (~640px)<br/>filter row + table + pagination"]
    S2["Detail on right (~640px)<br/>header + tab nav + content + action bar"]
    S3["Header structure: name + status pill (ui-index §5) + id/ulid"]
    S4["Tabs per ui-index §17 resource examples<br/>VM=7, Container=5, Jail=5, Volume=6, Node=7"]
    S5["Action bar per ui-index §6: View→Edit→Snapshot→Start/Stop→Delete"]
    S6["Inline styles ONLY (no class=, no Tailwind) per lessons.md"]
    S7["Viewport 1280x800 per diagrams/README.md"]
    S8["Color palette per ui-index §20"]
    S9["View-only: NO write endpoints except via TaskSchedule (per audit §21.5)"]
  end
```

### Action bar spec (ui-index §6)

```mermaid
flowchart LR
  Order["Left-to-right order:<br/>1. View (always present, primary blue)<br/>2. Edit (if applicable)<br/>3. Snapshot/Backup (VM/Volume)<br/>4. Start/Stop/Restart (VM/Container)<br/>5. Delete (always rightmost, danger red, type-to-confirm)"]
  Colors["Color coding:<br/>Primary: blue #2563eb<br/>Destructive: red #b91c1c<br/>View-only: gray #475569"]
```

---

## 7. Executor conversion steps

The executor renders each detail panel into a 1280×800 SVG per the Mermaid spec:

```mermaid
sequenceDiagram
    participant Planner as prometheus (this spec)
    participant Executor as Sisyphus executor
    participant Files as diagrams/components/

    Planner->>Executor: Read resource-detail-panels-visual-spec.md
    Executor->>Files: 19-vm-detail-panel.svg (T78a — 7 tabs)
    Executor->>Files: 20-container-detail-panel.svg (T79a — 5 tabs)
    Executor->>Files: 21-jail-detail-panel.svg (T80a — 5 tabs)
    Executor->>Files: 22-volume-detail-panel.svg (T81a — 6 tabs)
    Executor->>Files: 23-node-detail-panel.svg (T82a — 7 tabs)
    Executor->>Planner: All 5 SVGs delivered
    Planner-->>Files: F1 audit verifies 5 SVGs
```

Per SVG:
1. Layout: list view (~640px left) + detail panel (~640px right)
2. Use Mermaid `flowchart TB` above as structural blueprint
3. Replace nodes with `<div style="position:absolute;...">` per lessons.md
4. Status pills per ui-index §5 (Running/Healthy/Online/etc.)
5. Tabs per ui-index §17 examples
6. Inline-styles-only — no `class=`, no Tailwind
7. Verify `grep -r 'class="' diagrams/components/{19,20,21,22,23}-*.svg` returns 0

---

## 8. Cross-reference table

| This spec | Plan task | Audit section |
|---|---|---|
| VM detail | T78 | audit §23 (click affordances) |
| Container detail | T79 | audit §23 |
| Jail detail | T80 | audit §23 |
| Volume detail | T81 | audit §23 |
| Node detail | T82 | audit §23 |

---

## 9. Sign-off

This document is the **Mermaid-based visual spec** for the 5 resource detail panels.

User can preview in any markdown viewer to verify visual coverage before SVG generation.

Date: 2026-07-07
Author: prometheus (planner)
Status: MERMAID VISUAL SPEC COMPLETE — executor converts to SVG per Wave 10 T78a-T82a.
