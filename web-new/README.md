# CloudBSD Admin — Angular UI (`web-new`)

Angular 20 shell for the CloudBSD Admin control plane. Lives beside the legacy React app in `/src` until cutover.

## Planning authority

Start at [`docs/migration/README.md`](../docs/migration/README.md). Implementation handoff: [`docs/migration/implementation.md`](../docs/migration/implementation.md).

**Wave:** W4 (shell + shared components) → W5 (domain pages).

**Honcho:** session `angular-migration-web-new-2026-07-16` · peer `mlapointe` ·  
MCP `https://mcp.honcho.cloudbsd.org/` (workspace `default`). Use for cross-session memory.

## Stack

- Angular 20 (standalone components, signals)
- Tailwind CSS 3
- CloudBSD envelope client (`POST /api`, WIRE_PROTOCOL) with in-process mocks
- Preflight service (Rule #8, cache ≤ ttlMs)
- HttpClient + optional legacy JWT → Admin backend only (Rule #13)
- WebSocket stream client stub (Rule #4 / #14)

## Develop

```bash
cd web-new
npm install
npm start
# http://localhost:4200
```

Sign in with any credentials — default `environment.useMocks = true` serves
`auth.login`, `vms.list`, `dashboard.bootstrap`, and action preflight from
`src/app/core/protocol/mock-handlers.ts` (Rule #7 hostnames: `*.lan`).

Set `useMocks: false` to call a real backend (dev still falls back to mocks if
envelope `POST /api` is missing). Legacy Express JWT `POST /api/login` is also
supported when mocks are off.

## Build

```bash
npm run build
```

## Trust boundary

```
Operator ↔ Browser (this app) ↔ Admin backend only ↔ hosts/agents
```

No database drivers, SSH, or host tools in the browser. See `docs/migration/rules.md` Rules #13–#14.

## Layout

| Path | Purpose |
|------|---------|
| `src/app/core/` | Auth, stream, density, nav IA, envelope + preflight |
| `src/app/core/api/` | Domain APIs (`vms`, `dashboard`) |
| `src/app/layout/` | Shell: header, sidebar, live indicator |
| `src/app/pages/` | Login, dashboard, VMs, spine stubs |
| `src/app/shared/` | ResourceTable, FilterBar, ConfirmAction, EmptyState, StatCards |
| `src/environments/` | API base + `useMocks` |

## Author

Mark LaPointe \<mark@cloudbsd.org\>
