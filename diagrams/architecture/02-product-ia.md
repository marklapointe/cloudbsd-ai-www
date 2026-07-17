# Product information architecture (Mermaid)

> **Track 1 — conceptual diagrams** (Mermaid only).  
> UI mockups for the same IA are SVG Track 2 under `diagrams/screens/140-ia-*.svg`.  
> Canonical prose: `docs/migration/product-ia-esxi-vsphere-2026-07-16.md`  
> Agent index: `docs/migration/README.md`

## 1. Sidebar groups (target Angular shell)

```mermaid
flowchart TB
  subgraph Workload
    D[Dashboard]
    VM[Virtual Machines]
    C[Containers]
    J[Jails]
    S[Storage / Volumes]
    N[Networks]
    H[Hosts]
    CL[Cluster]
    T[Tasks]
  end

  subgraph Access
    U[Users]
    R[Roles]
  end

  subgraph Observe
    L[Logs]
    NO[Notifications]
    A[Audit]
  end

  subgraph Configure
    SET[Settings]
    P[Plugins]
  end

  subgraph Operate
    SYS[System]
    AB[About]
  end

  Workload --> Access --> Observe --> Configure --> Operate
```

## 2. Settings vs Account vs System

```mermaid
flowchart LR
  subgraph UserMenu["Avatar menu → My Account"]
    AP[Profile]
    AS[Security / 2FA]
    AA[Appearance]
    APR[Preferences]
    AT[Personal API tokens]
  end

  subgraph AdminSettings["Admin → Settings"]
    CI[Cluster identity]
    AUTH[Auth methods]
    HD[Host / agent defaults]
    NET[Networking defaults]
    ST[Storage defaults]
    INT[Integrations]
    LIC[Licensing]
  end

  subgraph SystemOps["Admin → System"]
    B[Backups policies + runs]
    UP[Updates]
    DIAG[Diagnostics]
    EX[Exports / support bundle]
    M[Maintenance]
  end

  UserMenu -.->|never mixes with| AdminSettings
  AdminSettings -.->|ops not prefs| SystemOps
```

## 3. Hosts vs Cluster

```mermaid
flowchart TB
  subgraph HostsPage["Hosts /nodes"]
    HL[Host inventory table]
    HA[Add host / join / drain]
    HD2[Host detail: ZFS · NICs · GPU · VMs]
  end

  subgraph ClusterPage["Cluster"]
    CS[Membership / quorum]
    VIP[CARP VIP summary]
    JOBS[Cluster jobs / replication]
    EV[Cluster events]
  end

  HostsPage -->|does not own| JOBS
  ClusterPage -->|does not list| HL
```

## 4. Action path (Rule #1 + #8)

```mermaid
sequenceDiagram
  autonumber
  actor Op as Operator
  participant UI as Angular UI
  participant API as Backend
  Op->>UI: Open resource menu
  UI->>API: POST .../action/preflight
  API-->>UI: viable + checks
  alt blocker
    UI-->>Op: Action hidden
  else warning or ok
    UI-->>Op: Show action
    Op->>UI: Click action
    UI->>Op: Confirm modal description
    Op->>UI: Confirm
    UI->>API: Execute action MIME + Who/What/Why/Where
    API-->>UI: StreamEvent result
  end
```

## 5. Product spine (implement first)

```mermaid
flowchart LR
  Login --> Shell
  Shell --> Dashboard
  Shell --> VMs
  Shell --> Hosts
  Shell --> Storage
  Shell --> Networks
  Shell --> Account
  Shell --> Settings
  Shell --> System
  VMs --> Console[noVNC console]
  System --> Backups
  System --> Updates
```

## SVG companions (Track 2)

| File | Screen |
|------|--------|
| [`../screens/140-ia-shell-hosts.svg`](../screens/140-ia-shell-hosts.svg) | Shell + Hosts inventory (new sidebar) |
| [`../screens/141-ia-cluster-services.svg`](../screens/141-ia-cluster-services.svg) | Cluster services (not host table) |
| [`../screens/142-ia-account-security.svg`](../screens/142-ia-account-security.svg) | My Account · Security |
| [`../screens/143-ia-settings-cluster.svg`](../screens/143-ia-settings-cluster.svg) | Settings · Cluster identity |
| [`../screens/144-ia-system-backups.svg`](../screens/144-ia-system-backups.svg) | System · Backups |
