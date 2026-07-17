# Implementation handoff

> Planning complete (2026-07-16). Start coding at **W4**.  
> Read [README.md](./README.md) first.

## Status

| Wave | Status | Deliverable |
|------|--------|-------------|
| W0 Catalog | **DONE** | [component-catalog-plan.md](./component-catalog-plan.md) |
| W1 Archive map | **DONE** | [diagrams/ARCHIVED.md](../../diagrams/ARCHIVED.md) |
| W2 Spine SVGs | **DONE** | `150-spine-*`, `140-ia-*`, `160-mcp-*` |
| W3 Mermaid flows | **DONE** | `diagrams/flows`, `diagrams/architecture` |
| W4 Angular shell | **MOSTLY DONE** | Shell, shared UI, envelope mocks, preflight, toasts, stream invalidation |
| W5 Domain pages | **IN PROGRESS** | Full spine nav live; remaining: wizards, more detail shells, real backend, OpenAPI |

## Before you write code

1. [README.md](./README.md) — authority + read order  
2. [product-ia-esxi-vsphere-2026-07-16.md](./product-ia-esxi-vsphere-2026-07-16.md) — what the product is  
3. [rules.md](./rules.md) — Rules #1–#12  
4. [component-catalog-plan.md](./component-catalog-plan.md) **§7** — only allowed components  
5. Visual targets: `diagrams/screens/150-spine-*`, `140-ia-*`  
6. Optional walkthrough: `.sisyphus/plans/html-mockups/index.html`

**Do not** implement ARCHIVE / DEFER items from [diagrams/ARCHIVED.md](../../diagrams/ARCHIVED.md).

## Suggested first PR stack

1. ~~`web-new` Angular 20 shell + routing + Tailwind + signals~~ **done**  
2. ~~Auth + frost-out → `/login` + session / mock envelope client~~ **done**  
3. ~~Layout sidebar (IA groups) + header~~ **done**  
4. ~~Shared `ResourceTable` + `EmptyState` + `ConfirmActionModal`~~ **done**  
5. ~~Dashboard + VMs list (first vertical slice)~~ **done** (mocks / WIRE)  

### Status note

W5 Angular UI is **done under mocks** + **Express envelope gateway** (`POST /api`) + **@novnc/novnc RFB** wired + OpenAPI stub.

**Product Go control plane** (not Express) is scaffolded and runnable on Linux without FreeBSD:

| Piece | Location |
|-------|----------|
| Angular app | `web-new/` |
| Express interim gateway | `server/src/wire/envelope-gateway.ts` → `POST /api` |
| **Go product backend** | **`~/git/cloudbsd-admin-backend`** (`cmd/cloudbsd-admin`, default `:3080`) |
| OpenAPI | `GET /api/openapi.json`, `openapi/openapi-envelope.yaml`; Go also `GET /openapi.json` |
| noVNC | `@novnc/novnc` in VM console page |
| Unit (no Chrome) | `cd web-new && npm run test:unit` |

Go backend (pre–host agent): chi + WIRE `POST /api` + session cookie + SQLite seed inventory + preflight + stream skeleton.  
`make run` / `scripts/smoke.sh` · seed `admin` / `admin` · CORS via `CLOUDBSD_CORS`.

### Smoke

```bash
npm run smoke          # health + envelope + angular static + unit-node
npm run angular:build
npm start              # serves Angular + envelope on :3001

# Product Go control plane (separate repo)
cd ~/git/cloudbsd-admin-backend && make test && make run
./scripts/smoke.sh
```

### Remaining ops (when FreeBSD VM / hardware ready)

1. Host agent registration + live inventory (replace SQLite-only seed)  
2. Live websockify/agent for VNC (RFB client already loads)  
3. PAM on FreeBSD; set `devAuth: false`  
4. Point Angular proxy at Go `:3080`; drop Express as product path  
5. E2E in CI with headless Chrome  

### Honcho

Session **`angular-migration-web-new-2026-07-16`** (peer `mlapointe`, workspace `default`) holds W4/W5 conclusions.  
MCP endpoint: `https://mcp.honcho.cloudbsd.org/`. Query before re-planning.

## Defaults (unless product owner overrides)

- Roles as Users sub-tabs in v1  
- Audit under Observe  
- Network Map as view on Networks  
- Tasks page mandatory  
- Library spine includes Base jails + Repositories  
- MCP under Configure (not Plugins)  
- API keys always scoped; selectable catalogs only  
- Jail create uses cached bases from configured repos  
- **UI ↔ backend only** (Rule #13); backend owns OpenAPI 3.1 when ready  
- Coverage: ≥80% overall; **100%** on auth, preflight, envelope  
- Target FreeBSD; author Mark LaPointe \<mark@cloudbsd.org\>

## Non-goals (first implementers)

- Theme customizer / 15-theme gallery  
- Permanent view-only product  
- Dual Settings models  
- File manager  
- Regenerating empty theme/error SVG dirs  

## Trust boundary (mandatory)

```
User ↔ Browser (Angular) ↔ Backend only ↔ hosts/agents/storage
```

- Angular uses **HttpClient / WebSocket to the Admin backend only** (`/api`, stream).  
- **No** database drivers, raw host tools, or “open this DB in the browser” flows.  
- Rule **#13** in [rules.md](./rules.md).

### Backend message gateway (mandatory)

The **backend process** is the only party that:

1. Ingests agent/host/MCP/task events  
2. **Validates session or API key** on every HTTP and stream hop  
3. **Repackages** into canonical envelopes / StreamEvents (strip secrets, foreign tenants)  
4. **Fans out** only to connections whose principal may see that resource/topic  
5. **Stops delivery** immediately on session revoke, expiry, user disable, or key revoke  

Invalid session ⇒ no events, no action commits — not “best effort delivery.”  
Rule **#14**; wire **§2.35**.

## OpenAPI / Swagger status

| Item | Status |
|------|--------|
| OpenAPI 3.1 for **new** backend | **NOT DONE** — planned in archived plan (T4); **no** `openapi.yaml` in repo today |
| Interim contract | **`.sisyphus/plans/WIRE_PROTOCOL.md`** (envelope, actions, preflight, stream) |
| Current React UI | Talks to Express at `/api` via `src/api/client.ts` (same-origin) — pattern to keep |

### Required for Angular ↔ backend

1. Backend publishes **OpenAPI 3.1** (served as `/api/openapi.json` or static `openapi.yaml` generated in CI).  
2. UI is generated or hand-written **against that contract** (plus stream events from WIRE).  
3. Swagger UI may be embedded for **admins** at a docs route — optional; not a second control path.  
4. Until OpenAPI exists, implement only endpoints documented in WIRE + product IA; do **not** invent browser→infra shortcuts.

**OpenAPI is a backend deliverable the UI depends on for type-safe clients — it is not an excuse for the SPA to call anything except the backend.**

## Wire & data (when needed)

| Topic | Where |
|-------|--------|
| Envelope, stream, preflight | `.sisyphus/plans/WIRE_PROTOCOL.md` |
| API key scopes, library repos APIs | WIRE §2.33 |
| Schemas / StreamEvent | `.sisyphus/drafts/data-structures.md` |
| Column/tab visual order | `.sisyphus/drafts/ui-index.md` |

## Historical plan dump

The old multi-agent megadoc (~10k lines) is archived at:

`.sisyphus/plans/archive/angular-migration-full-2026-07.md`

**Do not** use it for product decisions. Use this tree instead.
