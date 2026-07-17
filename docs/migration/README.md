# CloudBSD Admin — Migration planning index

**Branch**: `feat/angular-migration`  
**Product**: FreeBSD hypervisor control plane (bhyve · jails · OCI · ZFS) — ESXi replacement, eventual vSphere-class  

Use this file as the **entry point**. Prefer these paths over older plan prose when they conflict.

---

## Diagram convention (two tracks — never mix)

Per Honcho session `zathrasask-plan-diagram-conventions-2026-06-08` and `lessons.md`:

| Track | Format | Where | Use for |
|-------|--------|-------|---------|
| **1 Conceptual** | Mermaid in ` ```mermaid ` blocks | Markdown under `diagrams/architecture/`, `diagrams/flows/`, plans | Architecture, IA, sequence, state, ER |
| **2 UI / UX mockups** | SVG + `<foreignObject>` + **inline styles only** | `diagrams/screens/*.svg`, `diagrams/components/*.svg` | Pixel layout of shell, pages, modals |

- No Mermaid inside SVG files.  
- No raw HTML mockups in markdown (GitHub strips styles).  
- No Tailwind `class=` inside SVG foreignObject.  

### Product IA diagrams (2026-07-16)

| Track | Path |
|-------|------|
| Mermaid | [diagrams/architecture/02-product-ia.md](../../diagrams/architecture/02-product-ia.md) |
| SVG shell + Hosts | [diagrams/screens/140-ia-shell-hosts.svg](../../diagrams/screens/140-ia-shell-hosts.svg) |
| SVG Cluster services | [diagrams/screens/141-ia-cluster-services.svg](../../diagrams/screens/141-ia-cluster-services.svg) |
| SVG My Account · Security | [diagrams/screens/142-ia-account-security.svg](../../diagrams/screens/142-ia-account-security.svg) |
| SVG Settings · Cluster identity | [diagrams/screens/143-ia-settings-cluster.svg](../../diagrams/screens/143-ia-settings-cluster.svg) |
| SVG System · Backups | [diagrams/screens/144-ia-system-backups.svg](../../diagrams/screens/144-ia-system-backups.svg) |

Older screens (`01`–`17`, `60`–`84`, …) remain until redrawn; **140–144 are the IA reference set**.

## Read order (agents)

| Order | Document | Why |
|------:|----------|-----|
| 1 | [product-ia-esxi-vsphere-2026-07-16.md](./product-ia-esxi-vsphere-2026-07-16.md) | **Canonical product IA** — sidebar, Settings/Account/System, keep/defer matrix |
| 2 | [component-catalog-plan.md](./component-catalog-plan.md) | **Component/screen triage** — KEEP/MERGE/ARCHIVE; Angular module map; **approve before code** |
| 3 | [diagrams/architecture/02-product-ia.md](../../diagrams/architecture/02-product-ia.md) | Mermaid IA (sidebar, settings split, action sequence) |
| 4 | [diagrams/architecture/03-component-catalog.md](../../diagrams/architecture/03-component-catalog.md) | Mermaid catalog waves |
| 5 | SVG `140-ia-*` + `150-spine-*` | UI/UX examples (IA chrome + spine pages) |
| [PLANNING-COMPLETE.md](./PLANNING-COMPLETE.md) | Handoff: planning done, implementation entry |
| 6 | [../../.sisyphus/drafts/ui-index.md](../../.sisyphus/drafts/ui-index.md) | Universal visual order (columns, tabs, chrome). Sidebar §8 matches product IA |
| 7 | [../../.sisyphus/plans/angular-migration.md](../../.sisyphus/plans/angular-migration.md) | Execution plan, methodology Rules #1–#9, waves/tasks |
| 8 | [../../.sisyphus/plans/WIRE_PROTOCOL.md](../../.sisyphus/plans/WIRE_PROTOCOL.md) | Envelope, actions, preflight §2.31–2.32, stream |
| 9 | [../../.sisyphus/drafts/data-structures.md](../../.sisyphus/drafts/data-structures.md) | Quantity, UnitKind, resource schemas |
| 10 | [../../.sisyphus/drafts/ADJUSTMENTS.md](../../.sisyphus/drafts/ADJUSTMENTS.md) | Screen deltas + 2026-07-16 IA revision table |
| 11 | [../../diagrams/README.md](../../diagrams/README.md) | SVG mockup conventions |

**Planning status:** complete — [PLANNING-COMPLETE.md](./PLANNING-COMPLETE.md).  
**Implementation starts at catalog wave W4** (shell + shared components). Do not implement ARCHIVE/DEFER items.

Mirror copies:

- `.sisyphus/drafts/product-ia-esxi-vsphere-2026-07-16.md` (same body as #1)  
- `history/PRODUCT-IA-2026-07-16-angular-migration.md` (immutable snapshot)

---

## Authority when docs conflict

```
product-ia (2026-07-16)
  > component-catalog-plan (KEEP/MERGE/ARCHIVE + Angular §7 checklist)
  > ui-index §8/§8.1/§16
  > angular-migration methodology Rules
  > ADJUSTMENTS IA table
  > SVG mockups (prefer 140–144; spine redraws)
  > older plan body text / drafts/angular-migration.md (historical)
```

**Do not treat as canonical for product direction:**

| Artifact | Role now |
|----------|----------|
| `drafts/angular-migration.md` | Early draft / interview notes — historical |
| `plans/ui-modernization.md` | Pre-Angular React polish plan — archive context |
| `plans/fix-issues.md`, `cloudbsd-shared-packages.md` | Adjacent / older workstreams |
| SVG Settings dual models (`11-settings` vs `60–84`) | Non-canonical until redrawn to product IA §4 |
| Permanent “view-only product” language in old SVGs/README lines | Superseded — view-only is a **role** |

---

## Methodology cheat-sheet (post–2026-07-16)

| Rule | One-liner |
|------|-----------|
| #1 | **Management by default**: describe → preflight → confirm → execute. View-only = auditor role |
| #2 | Frost-out on session/auth failure; return to `/login` |
| #3 | **MCP-extensible** — MCP servers are the plugin system; tools/actions from registered servers |
| #4 | Live stream primary; no Refresh/View JSON chrome; small reconnect if socket dead |
| #5 | No body-text nav hints; sidebar + breadcrumb only |
| #7 | No cloudbsd/revytech as customer service hostnames in mock data |
| #8 | Preflight before presenting actions (hide blockers) |
| #9 | Account vs Settings vs System; Hosts vs Cluster; Users = control-plane |

Full text: `angular-migration.md` “Canonical Methodology”.

---

## HTML mockup experiment

Browsable HTML kit (pages + shared components + modals + wizards):

**`.sisyphus/plans/html-mockups/`** — open `index.html` in a browser.  
Regenerate: `python3 .sisyphus/plans/html-mockups/generate.py`.  
Complements SVG Track 2; not production Angular.

---

## Critical path (implementation)

```
0 Docs/IA (done baseline 2026-07-16)
1 Angular shell + auth + frost-out + stream client
2 Backend core (envelope, session, preflight)
3 Product spine: Dashboard, VMs, Hosts, Storage, Networks, Jails, Containers
4 Account + Settings + System (split IA)
5 Access (Users/Roles), Tasks, Cluster services
6 Visual regression + critical-path coverage + cutover
```

Spine detail: product IA §5 and §7.

---

## Key routes (target)

| Area | Route pattern |
|------|----------------|
| My Account | `/account/*` |
| Settings (admin system) | `/settings/*` |
| System ops | `/system/*` |
| Hosts | `/hosts` or `/nodes` (inventory) |
| Cluster | `/cluster` (services, not host table) |
| Networks | `/networks` (+ map view) |
| Tasks | `/tasks` |
| **MCP** | `/mcp` only (was Plugins — MCP **is** the plugin system) |
| **API keys** | Access → `/access/api-keys` (service/CI); Account → `/account/tokens` (personal) — both **scoped** (resource × action × domain); see product IA §3.2a |
| **Snapshots** | VM/volume detail + Storage; actions include create / delete / **revert**; grant via API key scopes |

---

## Honcho (self-hosted)

- MCP: `https://mcp.honcho.cloudbsd.org/` (workspace `default`)  
- Product session: `cloudbsd-admin-product-2026-07-15`  
- Connectivity session: `grok-honcho-connectivity-2026-07-16`  

---

## Security / analysis tooling (local env)

See `~/tools/SECURITY-ANALYSIS.md` (host-level). For this repo: `security-scan .`, `npm run security-audit`, semgrep/gitleaks/trivy.

---

## Author policy

- Maintainer: Mark LaPointe \<mark@cloudbsd.org\>  
- No Co-authored-by trailers  
- English + UTF-8  
- Target host OS: FreeBSD / CloudBSD  
