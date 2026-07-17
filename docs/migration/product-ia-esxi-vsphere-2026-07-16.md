# CloudBSD Admin — Product Information Architecture

> **Date**: 2026-07-16  
> **Branch**: `feat/angular-migration`  
> **Status**: CANONICAL for Angular migration planning (supersedes conflicting IA in older mockups)  
> **Audience**: planners, implementers, visual-spec authors  
> **Agent index**: `docs/migration/README.md`  
> **Related** (repo-relative):  
> - `docs/migration/product-ia-esxi-vsphere-2026-07-16.md` (tracked mirror of this file)  
> - `.sisyphus/drafts/ui-index.md`  
> - `.sisyphus/plans/angular-migration.md`  
> - `.sisyphus/plans/WIRE_PROTOCOL.md`  
> - `.sisyphus/drafts/ADJUSTMENTS.md`  
> - `.sisyphus/drafts/data-structures.md`

---

## 1. Product definition

CloudBSD Admin is the **control plane for a FreeBSD-based hypervisor stack** intended to replace:

| Layer | VMware analog | CloudBSD direction |
|-------|---------------|--------------------|
| Hypervisor | ESXi | FreeBSD + **bhyve** |
| Isolation | (containers elsewhere) | **Jails** + OCI containers |
| Storage | VMFS / vSAN | **ZFS** (datasets, snapshots, scrub, send/receive) |
| Cluster | vCenter | Multi-node + CARP VIP, join tokens, drain |
| Client | vSphere Client | This Angular admin UI + **MCP-extensible** backend |
| Auth | SSO / AD / local | PAM + PassKey / TOTP / LDAP / SAML |

**Product center of value**: inventory and operate VMs, jails, containers, ZFS volumes, hosts (nodes), networking, and cluster health on FreeBSD — with full day-2 ops (create, power, migrate, snapshot, backup, update), not a theme browser.

### 1.1 Trust boundary (security)

```
Operator  ↔  Angular UI (browser)  ↔  Admin backend only
                                        ↓
                                 agents / FreeBSD / storage / MCP
```

- The UI is a **view + action client**. It never opens databases, SSH, or ZFS from the browser.  
- The operator uses the product **only through the UI** — never by talking to Postgres/SQLite/Redis/hosts as part of the admin app flow.  
- All resource I/O is **backend-mediated** (REST/actions + stream). **rules.md Rule #13**.  
- The **backend repackages and routes all messages**: only authenticated, authorized sessions/API keys receive events for resources they may see. Invalid/revoked sessions get **nothing**. **rules.md Rule #14**.  
- **OpenAPI 3.1** is the target HTTP contract (backend-owned). Until published, **WIRE_PROTOCOL.md** is interim. No ad-hoc browser→infra endpoints.

---

## 2. Methodology corrections (2026-07-16)

These override earlier plan language where they conflict.

### 2.1 Management UI by default; view-only is a **role**

| Before (plan Rule #1 misread) | Now |
|-------------------------------|-----|
| Product is permanently view-only; write UI hidden | Product is a **full management console** |
| Writes only via opaque backend actions | Writes use **describe → preflight → confirm → execute** (still no silent mutations) |
| Create wizards contradict view-only | Create wizards and power ops are **first-class** |

**View-only / auditor role**: hides destructive and mutating controls; still shows live inventory. Not the default admin product stance.

**Still required**:
- Pre-flight capability check (Rule #8) before presenting actions  
- Confirm modal with human-readable action description  
- No raw `window.alert` / inline destructive without type-to-confirm  
- Live stream for changing data (Rule #4); small reconnect control allowed when socket is broken  

### 2.2 Coverage gate

Prefer **solid critical-path coverage** over a literal 100% gate that blocks shipping. Plan text still documents the historical 100% request; implementation waves may use 80% overall + 100% on auth, money-path actions, and envelope parsing unless the user reaffirms 100% globally.

### 2.3 Console technology

**bhyve console = VNC / noVNC** (websockify jail sidecar). Serial/xterm is optional for serial-only guests, not a replacement for graphical install media.

---

## 3. Canonical information architecture

### 3.1 Sidebar (UNIVERSAL — replaces prior dual models)

```
Workload (Overview)
  Dashboard
  Virtual Machines
  Containers
  Jails
  Storage                    # Volumes / ZFS (keep route /volumes for compat)
  Networks                   # Inventory + IP pools; Network Map is a view mode
  Hosts                      # Nodes (hosts). NOT a second cluster table
  Cluster                    # HA, jobs, replication, cluster events — NOT node list
  Tasks                      # Global long-running ops (migrate, scrub, backup runs)

Access
  Users                      # Control-plane identities (admins/operators/API principals)
  Roles                      # RBAC (new; may ship as Users sub-tab in v1)
  API keys                   # Or under My Account for personal tokens only

Observe
  Logs
  Notifications
  Audit                      # Compliance trail (was System Mgmt → Audit Log)

Configure
  Settings                   # System configuration only (see §4)
  MCP                        # MCP is the plugin system (registry of MCP servers)

Operate
  System                     # Backups, Updates, Diagnostics, Exports, Maintenance
  About                      # Product versions, license, support

# REMOVED from primary sidebar:
#   Status as separate item  → merge into System → Diagnostics / Dashboard health
#   Nodes AND Cluster both as host lists → Hosts = inventory; Cluster = cluster services
#   Plugins as a separate concept  → MCP (servers + tools + install)
```

Footer (sidebar): connected host display name + uptime (no geolocation).

### 3.2 User menu (avatar)

```
Profile                 → My Account (profile)
Preferences             → My Account (appearance, density, locale, notification prefs)
API tokens              → personal tokens
Help & docs
About
───
Sign out
```

**My Account is not Admin Settings.** Personal 2FA, theme, and personal API keys live under the avatar menu (or `/account/*`), never mixed with cluster VIP / NTP.

### 3.2a API keys and scopes (required)

API keys are **not** “full admin unless we remember to restrict them.”  
Every key has an explicit **scope document** evaluated on every wire action (same axis as RBAC + Rule #8 preflight).

#### Two homes (do not merge)

| Kind | Surface | Typical use |
|------|---------|-------------|
| **Personal access token** | My Account → API tokens | Human operator automation under their identity |
| **Service / CI key** | Access → API keys | Pipelines, agents, Terraform — owned by a service principal or admin-created bot user |

Both use the **same scope model**. Service keys may not broaden beyond what the creating admin can grant.

#### Scope model (v1)

A key is authorized only when **all** of these match:

1. **Resource type** — what kind of object (system-facing inventory first)  
2. **Actions** — what verbs on that type  
3. **Domain** — which instances (all of type, or a bound set)

```
scope entry = {
  resource:  vm | jail | container | volume | network | host | cluster | task | library | system | mcp | …
  actions:   [ read | create | update | delete | power | migrate | console
               | snapshot.create | snapshot.delete | snapshot.revert
               | backup | attach | … ]
  domain:    { mode: all | list | pattern | tag }
             // list:    ids / names
             // pattern: name globs e.g. ci-*, tank/vms/ci/*
             // tag:     resources labeled e.g. env=ci
}
```

**Deny by default.** Missing resource type or action ⇒ 403.  
**Intersect with user/role:** key cannot exceed the principal’s role capabilities.

#### System resources (start here)

| Type | Example actions | Notes |
|------|-----------------|--------|
| **vm** | read, create, update, delete, power, migrate, console, **snapshot.create**, **snapshot.delete**, **snapshot.revert** | Core CI + day-2 |
| **jail** | read, create, update, delete, power, snapshot.* | FreeBSD-native |
| **container** | read, create, update, delete, power, logs | OCI |
| **volume** | read, create, update, delete, snapshot.*, clone, scrub | ZFS datasets |
| **network** | read, create, update, delete, attach | Bridges/VLANs/pools |
| **host** | read, drain, maintenance | Usually not on CI keys |
| **cluster** | read | Membership/VIP — rarely on CI |
| **task** | read, cancel | See job status for long ops |
| **library** | read, upload | ISO/template pull for create |
| **system** | backups, updates, diagnostics, exports | Admin-only keys |
| **mcp** | read, register, invoke | Separate from hypervisor CRUD |

#### Domain binding (CI pattern)

| Domain mode | Meaning | Example |
|-------------|---------|---------|
| **all** | Every object of that type the principal can see | Break-glass / platform CI |
| **list** | Explicit IDs/names | `nextcloud`, `ci-runner-01` |
| **pattern** | Name or ZFS path glob | `ci-*`, `tank/vms/ci/*` |
| **tag** | Label selector | `pipeline=gha`, `env=staging` |

**CI snapshot-only key (recommended template):**

| Resource | Actions | Domain |
|----------|---------|--------|
| vm | `read`, `snapshot.create`, `snapshot.revert`, `snapshot.delete` | pattern `ci-*` **or** tag `ci=true` |
| task | `read` | all (or tasks spawned by this key) |
| — | no create/delete/power/migrate/console | — |

That lets a pipeline snapshot before deploy and **revert** on failure without the ability to destroy the VM or touch prod inventory.

#### Snapshots (yes — first-class)

Snapshots are **not** an afterthought:

| Surface | Coverage |
|---------|----------|
| VM detail → Snapshots tab | list, create, delete, clone, **revert/rollback** |
| Volume/dataset detail → Snapshots | ZFS snapshots on storage |
| Storage → Snapshots (cluster view) | cross-dataset list |
| Confirm + Rule #8 preflight | pool space, VM state for in-place revert, etc. |
| Tasks | long snapshot/send/revert jobs |
| **API key actions** | `snapshot.create` / `snapshot.delete` / `snapshot.revert` as separate grants |

**Revert** (rollback to snapshot) is a distinct capability from create — grant it deliberately (CI often wants create+revert; rarely wants delete of arbitrary snaps).

#### UI requirements

- Create/edit key wizard: name, expiry, owner, **scope builder** (resource × actions × domain), review summary  
- Key list columns: name, owner, expiry, **scope summary** (e.g. `vm:snapshot* @ 12 VMs`), last used  
- Key detail: full scope table, rotate, revoke  
- Audit: every API call logs key id + matched scope entry + target resource  

#### UI: selectable only — no freeform capability strings

Free-text boxes for roles/capabilities/resource names are **forbidden** in create/edit flows (typos become silent over- or under-privilege).

| Field | Control |
|-------|---------|
| **Role capabilities** | Grouped checklist of known actions per resource type (from server catalog) |
| **API key resource type** | Single-select from catalog (vm, jail, …) |
| **API key actions** | Multi-select checkboxes for that type (only valid verbs shown) |
| **Domain: all** | Radio / chip — no text |
| **Domain: list** | **Searchable multi-select** of live inventory (VMs, jails, …); pick from list |
| **Domain: tag** | Multi-select of **existing** tags (or create-tag flow elsewhere), not free CSV |
| **Domain: pattern** | Prefer **preset patterns** from inventory prefixes + optional advanced glob with live **preview matches** (must show matching objects before save) |

**Roles** use the same action catalog as keys (role = default capability set for humans; key scopes refine further).

#### Non-goals (v1)

- OAuth2 delegated third-party app marketplace  
- Per-field attribute ACLs  
- Impersonation of other users without an explicit admin scope  

### 3.3 Cluster vs Hosts

| Surface | Purpose | Must not |
|---------|---------|----------|
| **Hosts** (`/hosts` or `/nodes`) | Host inventory: status, resources, drain, maintenance, agent version, add host | Duplicate HA/jobs UI |
| **Cluster** (`/cluster`) | Cluster services: membership policy, CARP/VIP summary, replication, cluster jobs/events | Be a second host table with Add Node |

Node detail remains the place for per-host ZFS / NICs / GPUs / resident VMs.

### 3.4 Networking hierarchy

| Layer | Home | Content |
|-------|------|---------|
| Workload networking | **Networks** | Bridges, VLANs, IP pools, attach to VM/jail/container |
| Topology view | **Networks → Map** (or view toggle) | Visualization only; not IPAM |
| Host NICs / LACP | **Host detail → Network** | Per-node interfaces, bonds (with Rule #8 preflight) |
| Cluster addressing | **Settings → Networking** | Cluster VIP/CARP, upstream DNS/NTP defaults |

NTP appears **once** (Settings → Host/cluster defaults or Networking), not in both General and Network.

### 3.5 MCP = plugins (extension model)

CloudBSD Admin does **not** maintain a parallel “plugin package” product next to MCP.
**MCP servers are how the product is extended.**

| Concern | Product surface |
|---------|-----------------|
| List / enable / disable servers | **MCP** list page |
| Add server (HTTP/SSE/stdio) | **MCP → Add** wizard |
| Probe health + list tools | **MCP → detail** |
| Secrets (headers, env) | Stored server-side; UI never echoes full secrets |
| Menu/pages from tools | Backend maps MCP tools → actions/manifest (replaces old plugin templates) |
| Legacy “plugin” mocks (`17-plugins`, `131–133`) | **SUPERSEDED** by MCP registry mocks (`160-mcp-*`) |

Transports (v1): **HTTP (streamable)**, **SSE**, **stdio** (agent-local / host sidecar).

---

## 4. Settings: system vs user (required)

### 4.1 Problem being fixed

Mockups had two incompatible Settings models:

- `11-settings.svg` — nested Appearance + admin sections + read-only banner  
- `60–65`, `83–84` — full-page nav mixing Account, Security, Backup, Network, About  

React `Settings.tsx` is still **license + language/TZ + demo/SSL/CORS** — not a system settings surface.

### 4.2 Target Settings IA

#### A. My Account (`/account/*` — all authenticated users)

| Section | Contents |
|---------|----------|
| Profile | Display name, email, avatar |
| Security | Password, 2FA/Passkeys, recovery codes, active sessions (mine) |
| Appearance | Theme, density, font size (instant apply) |
| Preferences | Locale, timezone, date format |
| Notifications | Personal inbox routing / quiet hours (user-scoped) |
| API tokens | Personal access tokens |

#### B. Administration → Settings (`/settings/*` — admin)

| Section | Contents |
|---------|----------|
| Cluster identity | Cluster name, display name, alert contact |
| Localization defaults | Default timezone/locale for new users / UI fallbacks |
| Authentication | Enabled methods (password, TOTP, passkey, LDAP, SAML), password policy, session policy — **not** “my 2FA” |
| Access defaults | Default roles for new users (links to Access → Roles) |
| Host / agent defaults | NTP, DNS resolvers, logging level, auto-update policy |
| Networking | Cluster VIP/CARP, default bridges, IP pool defaults |
| Storage defaults | Snapshot retention defaults, scrub schedule defaults, system-volume hide default |
| Integrations | Webhooks, metrics exporters |
| Licensing | License key, entitlements, usage (from current React Settings) |
| Advanced | Feature flags, rate-limit admin, error display policy |

#### C. System ops (`/system/*` — admin; not “preferences”)

| Section | Contents |
|---------|----------|
| Backups | Policies **and** job runs (merge former Settings backup-config + System backups) |
| Updates | Agent, MCP server packages, FreeBSD patches |
| Diagnostics | Auth capabilities, preflight, connection health, MCP health (absorb Status) |
| Exports / support bundle | Config, logs, cluster state (not theme-library vanity exports as primary) |
| Maintenance | Maintenance mode, drain all, emergency tools |

**Single home rules**:

- **MCP** → `/mcp` only (was “Plugins”; MCP **is** the extension/plugin model)  
- About / license summary → `/about` (license **register** may stay under Settings → Licensing)  
- Users → Access → Users (control-plane), not OS dump of `www`/`postgres` by default  

---

## 5. Screen value matrix (keep / refine / defer)

### 5.1 Product spine (implement first)

| Area | Notes |
|------|--------|
| Login / first-login / join host | Day-1 |
| Dashboard | Capacity + actionable alerts, not only sparklines |
| VMs + detail + console + snapshot + migrate | Core ESXi parity |
| Jails + detail | FreeBSD differentiator |
| Containers + detail | OCI |
| Storage / Volumes (ZFS-first) | Datastore analog; system volumes rules kept |
| Networks + map view | Inventory before pretty topology |
| Hosts + host detail | Nodes rename optional in nav label |
| Cluster (services only) | See §3.3 |
| Tasks / Jobs | Global long-running ops |
| Access: Users · Roles · API keys | Control-plane identities |
| Settings (system) + Account (user) | §4 |
| **MCP** (servers registry + add + detail) | Extension model — *was Plugins* |
| System: Backups · Updates · Audit · Diagnostics | Ops hub |
| About / License | Closed-source product surface |

### 5.2 Refine or merge

| Area | Action |
|------|--------|
| Cluster + Nodes overlap | Split per §3.3 |
| System Stats tiles (locales/themes counts) | Drop non-operational metrics |
| Notifications + preferences | Inbox vs routing rules |
| Logs | Time-range, ring buffer, seek (scale review) |
| Monitoring dashboard (68) vs Dashboard | One live health; optional capacity later |
| History vs Audit | Rename/clarify ops events vs compliance |

### 5.3 Deprioritize (polish after spine)

| Area | Why |
|------|-----|
| 15 themes + full customizer + import gallery | One light / dark / high-contrast enough for v1 |
| Density matrix × empty-state SVG explosion | Implementation detail |
| File manager (79) | Support tool; risk surface |
| Currency/billing unit kinds | Premature |
| Permanent view-only product stance | Contradicts hypervisor replacement |
| Custom MIME theater blocking first pages | Wire later; do not block Angular shell |

---

## 6. ESXi / vSphere capability map

### 6.1 ESXi-class (host + VM ops) — must have for cutover narrative

| Capability | Status |
|------------|--------|
| Host inventory, health, maintenance/drain | Partial (Hosts/Nodes) |
| VM inventory, power, console | Partial (lists + console mock; thin React VMs page) |
| Create from template / ISO library | Wizards exist; **need content library screen** |
| Snapshots / rollback | **First-class**: VM + volume tabs, Storage list, preflight, Tasks; API scopes `snapshot.create|delete|revert` (§3.2a) |
| ZFS storage | Strong direction |
| Virtual networking + host NICs | Scattered — unify per §3.4 |
| Live migrate / evacuate | Mentioned; productize |
| Resource limits / overcommit visibility | Weak |
| PCI/GPU passthrough | vGPU flag — keep as differentiator |
| Task center | Weak — add Tasks |
| Alarms that page | Notifications prefs only |

### 6.2 vSphere-class (multi-host) — phase after spine

| Capability | Status |
|------------|--------|
| Cross-host inventory | Emerging |
| HA / failover policy | CARP mock only — not VM HA |
| Affinity / placement | Missing |
| Resource pools / quotas | Missing |
| RBAC roles | Roles + **API key scopes** (§3.2a) — implement with Access |
| Content library | Library spine + **base-jail repos** (§6.4) — implement |
| Distributed switch analog | Not modeled |
| Storage policies / replication intent | ZFS send/receive tasks only |
| Tags / folders | Tags in model; no folder UX |
| Multi-tenancy | Missing |

### 6.3 FreeBSD-native differentiators (lean in)

- ZFS as primary storage story  
- Jails first-class  
- bhyve + containers on one control plane  
- PAM / host-native auth  
- CARP, pf, if_bridge as real nouns in UI  
- **Configurable base-jail repositories** (not hard-coded FreeBSD.org only) — §6.4  

### 6.4 Base jails & content repositories (required)

Jail create must not depend on a single hard-coded download URL or a free-typed path.
Operators configure **repositories**; the control plane **fetches and caches** base jail artifacts (and related sets) for selected FreeBSD releases.

#### Homes

| Surface | Purpose |
|---------|---------|
| **Library → Base jails** | Cached bases on cluster storage (release, arch, size, last sync, used by N jails) |
| **Library → Repositories** | Remote sources used to obtain bases (and optionally ISOs/templates later) |
| **Jail create wizard → Base** | **Selectable** list of ready bases (and “fetch from repo…” if missing) — no freeform URL |

#### Repository model

```
repo = {
  id, name, enabled, priority,
  kind: freebsd-release | generic-https | oci-optional-later,
  base_url,                    // https://…
  path_template,               // e.g. /releases/${ABI}/${ARCH}/${RELEASE}/base.txz
  releases: [ selectable from probe or pinned list ],
  arches: [ amd64, aarch64, … ],
  auth: { method, … },         // see below — secrets server-side only
  tls: { verify: true | custom-ca | insecure-debug },
  proxy: optional,
  last_probe, health
}
```

**Path templates** use known variables (`RELEASE`, `ARCH`, `ABI`, `COMPONENT` ∈ base|lib32|src|kernel|MANIFEST) so private mirrors and official FreeBSD layouts both work without freeform per-jail URLs.

#### HTTPS authentication (configurable per repo)

| Method | When | UI fields (secret never re-echoed) |
|--------|------|-------------------------------------|
| **None** | Public FreeBSD mirrors | — |
| **HTTP Basic** | Private mirrors | username + password |
| **Bearer token** | CI/Artifactory-style | token |
| **API key header** | Custom gateways | header name (selectable presets + custom) + secret value |
| **Client certificate (mTLS)** | Hardened enterprise mirrors | client cert + key (+ optional passphrase); upload or host path allowlist |
| **Netrc / machine identity** | Host-local agent fetch | “use agent netrc for this host” (advanced) |

Probe/test connection **before** enable: HEAD/GET MANIFEST or small object; show latency, TLS peer, HTTP status. Failures quarantine the repo (same spirit as MCP health).

#### Operator flows

1. **Add repository** → URL + path template + auth + TLS → **Test** → Save  
2. **Sync base** → pick repo + release + arch + components → Task (stream progress) → appears under Library → Base jails  
3. **Create jail** → choose base from **cached list** (filter by release/arch); if missing, “Fetch…” opens sync with repo preselected  
4. **Default repo** per cluster (Settings or Library) for auto-suggest on wizard  

#### Non-goals (v1)

- Building bases from source on the host as the primary path  
- Freeform `curl | tar` paste boxes in the jail wizard  
- Storing repo passwords in browser localStorage or mock “show secret” after save  

#### API key scopes (related)

Grant separately: `library.read`, `library.repo.manage`, `library.base.sync` — CI may sync bases without full jail create, or create jails only from already-cached bases.

---

## 7. Angular migration critical path (updated)

```
Phase 0  — Docs alignment (this document + ui-index + plan methodology)
Phase 1  — Angular shell, auth, frost-out, live stream client
Phase 2  — Backend core (envelope, PAM/session, preflight)
Phase 3  — Product spine pages (Dashboard, VMs, Hosts, Storage, Networks)
Phase 4  — Account + Settings + System ops (split IA)
Phase 5  — Access (Users/Roles), Tasks, Cluster services
Phase 6  — Visual regression, critical-path coverage, cutover
```

**Do not** start with theme customizer waves or MIME registry completeness.

---

## 8. Documentation map

| Artifact | Role after this revision |
|----------|---------------------------|
| **This file** | Product IA + value matrix + ESXi/vSphere map |
| `diagrams/architecture/02-product-ia.md` | **Mermaid** conceptual IA (Track 1) |
| `diagrams/screens/140-ia-*.svg` … `144-ia-*.svg` | **SVG** UI/UX examples for this IA (Track 2) |
| `ui-index.md` | Visual ordering rules; sidebar/settings updated to match §3–4 |
| `plans/angular-migration.md` | Execution plan; methodology Rule #1 reframed |
| `ADJUSTMENTS.md` | Screen-level delta log; IA revision rows added |
| `scale-review-2026-07-09.md` | Scale affordances (sort, virtualization) — still in force |
| `WIRE_PROTOCOL.md` | Envelope + preflight — still in force |
| `data-structures.md` | Quantity/UnitKind — still in force |
| Older mock SVGs (`01`–`17`, `60`–`84`) | Historical until redrawn; **prefer 140–144** for IA |

### Diagram tracks (Honcho / CloudBSD)

1. **Mermaid** — architecture, flows, IA structure (inline in `.md` under `diagrams/architecture/`, `diagrams/flows/`).  
2. **SVG + foreignObject** — screen mockups only; all styles inline; committed under `diagrams/screens/`.

---

## 9. Acceptance for documentation (this wave)

- [x] Product IA document committed under `.sisyphus/drafts/`  
- [x] `ui-index.md` sidebar and settings sections updated  
- [x] Plan methodology Rule #1 reframed (management + RO role)  
- [x] ADJUSTMENTS section for 2026-07-16 IA revision  
- [ ] SVG mockups reconciled to single Settings model (follow-up visual wave)  
- [x] Honcho session `cloudbsd-admin-product-2026-07-15` seeded with IA summary  
- [x] Honcho session `angular-migration-web-new-2026-07-16` seeded with W4/W5 implementation progress  


---

## 10. Author

Mark LaPointe \<mark@cloudbsd.org\>  
Classification: INTERNAL planning for CloudBSD Admin Angular migration  
License: BSD 3-Clause (project)  
