# CloudBSD Admin — Canonical rules

> **Non-negotiable.** Any wave that violates these must be re-planned.  
> **Authority**: product IA → component catalog → these rules → wire protocol → mockups.  
> Extracted 2026-07-16 from the multi-agent plan mess into one living file.

Product detail lives in [product-ia-esxi-vsphere-2026-07-16.md](./product-ia-esxi-vsphere-2026-07-16.md).  
Wire detail lives in [WIRE_PROTOCOL.md](../../.sisyphus/plans/WIRE_PROTOCOL.md).

---

## 1. Management by default

Describe → **preflight** → confirm → execute.  
Full hypervisor control plane. **View-only is a role** (auditor), not the product default.  
Mutations use CloudBSD MIME actions + Who/What/Why/Where headers.  
No silent inline edits without confirm.

## 2. Session failure → frost → `/login`

On auth/session failure, frost the live UI and return to login.  
Mockups may have a **non-blocking** `session-expired` page for copy only — never a global overlay on every screen.

## 3. MCP is the plugin system

Configure → **MCP** (`/mcp`): register HTTP/SSE/stdio servers, probe, tools.  
No separate “Plugins” product. Legacy plugin mocks SUPERSEDED by `160-mcp-*`.

## 4. Live data

Stream is primary (`wss://…/api/stream`). No Refresh / View JSON / Reload chrome.  
`● live` (+ optional Xs ago). Small reconnect only when socket is dead.

## 5. No body-text navigation

No “see Network tab…” hints. Sidebar + breadcrumb only. Inline data or omit.

## 6. (reserved)

*(Numbering preserved for continuity with older notes.)*

## 7. Sample data hostnames

No `cloudbsd.*` / `revytech.*` as **customer service** hostnames in mocks.  
Use `*.lan` / `example.lan` / `prod-node-NN`. Product wordmarks OK.

## 8. Preflight before actions

`POST /api/<resource>/<id>/<action>/preflight` before showing an action.  
Blocker ⇒ **hide** action. Warning ⇒ show with badge + re-check on confirm.  
Cache ≤ 30s or until invalidating StreamEvent. See WIRE §2.31–2.32.

## 9. Account · Settings · System

| Surface | Route | Audience |
|---------|-------|----------|
| My Account | `/account/*` | All users — profile, 2FA, appearance, personal tokens |
| Settings | `/settings/*` | Admin — cluster, auth methods, defaults, licensing |
| System | `/system/*` | Admin — backups, updates, diagnostics, exports, maintenance |

**Hosts** = inventory. **Cluster** = services (not a second host table).  
**Users** = control-plane identities (not full OS dump).

## 10. API keys need scopes

- Personal tokens: Account. Service/CI keys: Access → API keys. Same model.
- Scope = **resource type** × **actions** × **domain** (`all` | `list` | `tag` | `pattern`).
- System types first: vm, jail, container, volume, network, host, …
- Snapshot actions are separate: `snapshot.create` | `snapshot.delete` | `snapshot.revert`.
- Deny by default; cannot exceed principal role.
- Detail: product IA §3.2a; wire §2.33.

## 11. Selectable catalogs only

**Forbidden:** freeform text for role capabilities or resource name lists.  
**Required:** catalog checklists / multi-select inventory / existing tags; pattern needs live match preview.  
Detail: product IA §3.2a UI rules.

## 12. Base jails via HTTPS repositories

- Library → **Repositories** (HTTPS + auth: none/basic/bearer/header/mTLS + path templates + probe).
- Library → **Base jails** (cached after fetch Task).
- Jail create: **select cached base only** (or Fetch from repo) — no freeform URL.
- Detail: product IA §6.4; wire §2.33.

## 13. Trust boundary — UI is a view only (security)

> The Angular app is **not** a host agent, not a DB client, not a package
> manager, and not a tunnel for the operator into infrastructure.

### Allowed communication

```
Operator  ←→  Browser (Angular UI)  ←→  CloudBSD Admin backend
                                          ↓
                                   hosts / zfs / bhyve / jails / …
                                   (only via backend + agents)
```

| Party | May talk to |
|-------|-------------|
| **User / operator** | **Only** the UI (browser pages) |
| **Angular UI** | **Only** the Admin **backend** (`/api/*`, `wss://…/api/stream`, same-origin static assets) |
| **Backend** | Host agents, FreeBSD tools, SQLite/Postgres **server-side**, MCP servers, configured HTTPS repos |

### Forbidden (block the PR)

- Browser → database (SQL, Mongo, Redis, etc.) — **ever**
- Browser → host SSH, bhyve, zfs, jail, pf, raw sockets
- Browser → third-party infra “for convenience” (direct S3, vault, etc.) except **backend-mediated** redirects if product-approved
- Asking the operator to “run this against the DB” or paste connection strings into the UI that the **browser** then uses
- Embedding credentials for infra in the frontend bundle
- “Thick client” logic that mutates cluster state without a backend action + preflight + audit trail

### How the UI talks about resources

1. **Read**: HTTP GET/list or StreamEvent push from **backend** only.  
2. **Mutate**: POST action (MIME + Who/What/Why/Where) → preflight → confirm → backend executes.  
3. **Console**: noVNC/websocket **through backend/agent**, not a direct VM IP from the SPA.  
4. **Secrets**: enter in UI forms; stored/used **only server-side**; never re-echo full secrets.

### OpenAPI

The backend **shall** expose OpenAPI 3.1 (`/api/openapi.json` or equivalent) as the HTTP contract the UI generates against.  
Until that file exists, **WIRE_PROTOCOL.md** is the interim contract — not ad-hoc browser endpoints.  
See [implementation.md](./implementation.md) § OpenAPI.

---

## PR blockers (quick)

| Regression | Rule |
|------------|------|
| Permanent product-wide view-only | #1 |
| Session-expired blocking every mock page | #2 |
| Separate Plugins product UI | #3 |
| Refresh / View JSON on resource pages | #4 |
| Body-text “go to X tab” | #5 |
| cloudbsd/revytech as customer endpoints | #7 |
| Action shown without preflight | #8 |
| Account mixed into admin Settings | #9 |
| Unscoped API keys | #10 |
| Freeform capability / resource boxes | #11 |
| Freeform jail base download URL | #12 |
| Browser→DB / browser→host / user told to talk to infra | #13 |
| UI mutating state without backend action | #13 |
