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
