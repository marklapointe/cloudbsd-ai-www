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
| W4 Angular shell | **NOT STARTED** | Layout, auth, stream, shared components |
| W5 Domain pages | **NOT STARTED** | Spine pages per catalog §7 |

## Before you write code

1. [README.md](./README.md) — authority + read order  
2. [product-ia-esxi-vsphere-2026-07-16.md](./product-ia-esxi-vsphere-2026-07-16.md) — what the product is  
3. [rules.md](./rules.md) — Rules #1–#12  
4. [component-catalog-plan.md](./component-catalog-plan.md) **§7** — only allowed components  
5. Visual targets: `diagrams/screens/150-spine-*`, `140-ia-*`  
6. Optional walkthrough: `.sisyphus/plans/html-mockups/index.html`

**Do not** implement ARCHIVE / DEFER items from [diagrams/ARCHIVED.md](../../diagrams/ARCHIVED.md).

## Suggested first PR stack

1. `web-new` Angular 20 shell + routing + Tailwind + signals  
2. Auth + frost-out → `/login` + session cookie client  
3. Layout sidebar (IA groups) + header  
4. Shared `ResourceTable` + `EmptyState` + `ConfirmActionModal`  
5. Dashboard + VMs list (first vertical slice)

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
