# Draft: CloudBSD-Admin Angular Migration Plan

## User Requirements (confirmed)
- Plan Angular migration for cloudbsd-admin web UI
- Check Honcho MCP for diagram and UI/UX guidelines
- **NEW: Create a new branch for this work BEFORE any work is completed**

## Current Codebase Summary
- **Project**: CloudBSD Admin Web UI (`cloudbsd-admin`)
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, framer-motion, react-router-dom 7, react-i18next, @xyflow/react (network diagrams), @xterm/xterm (terminal)
- **Backend**: Node.js 24+, Express 5, SQLite (better-sqlite3), JWT, Socket.IO, Swagger
- **Testing**: Vitest, React Testing Library

### Frontend Source Inventory (React)
- `/src/App.tsx` (6066B) - Main app + routing
- `/src/main.tsx` (246B) - Entry
- `/src/index.css` - Tailwind imports
- **Pages** (12): Dashboard, Login, VMs, Jails, OCIContainers, Volumes, NetworkMap, Notifications, Logs, Settings, Users, Cluster, Index, NotFound
- **Components** (9 root): BackendStatusProvider, ConfirmationModal, ConsoleModal, CustomPageSizeModal, ErrorBoundary, Layout, ResourceList (35KB - big!), ResourceModal
- **Component subdirs**: cluster, disks, layout, network, storage, ui, volumes
- **API**: client.ts, socket.ts
- **Contexts**: NotificationContext, ThemeContext
- **Locales**: 44 language files
- **Utils**: dateUtils, sizeFormat
- **Assets**: logos/icons

### Backend (UNCHANGED in scope)
- `/server/src/index.ts` (71KB - main API)
- `/server/src/db.ts` (17KB - SQLite)
- `/server/src/config.ts`, `ssl.ts`

## Honcho MCP Research Plan
- Inspect sessions: `application-guidelines-content`, `zathrasask-plan-diagram-conventions-2026-06-08`, `plan-honcho-image-consolidation-20260607`
- Check `cloudbawt` peer (project-specific context)
- Check `prometheus` peer for plan conventions

## Codebase Inventory (Confirmed from read)
- **Total LOC**: ~34,476 lines across TS/TSX files
- **Largest files**:
  - `src/pages/Volumes.tsx` (979 lines)
  - `src/components/ResourceList.tsx` (671 lines)
  - `src/pages/Settings.tsx` (~530 lines)
  - `src/pages/Cluster.tsx`, `Dashboard.tsx`, `NetworkMap.tsx` (each 200-400 lines)
- **Pages**: 14 lazy-loaded (Index, Login, Dashboard, VMs, OCIContainers, Jails, Cluster, Volumes, NetworkMap, Users, Logs, Notifications, Settings, NotFound)
- **Components**: 9 root + 7 subdirs (cluster, disks, layout, network, storage, ui, volumes) - 30+ components
- **Locales**: 47 language files (44 real + 3 constructed)
- **Server**: 71KB index.ts (untouched by migration)

## Honcho Research Findings (Confirmed)
- **Diagram Convention** (from `zathrasask-plan-diagram-conventions-2026-06-08`):
  - Track 1: Mermaid inline (```mermaid``` blocks) for conceptual structure
  - Track 2: SVG with `<foreignObject>` committed as files in `diagrams/` for visual UI mockups
  - NEVER raw HTML for UI mockups (GitHub strips it)
  - NEVER Mermaid in SVG files
- **WebUI Guidelines** (from `application-guidelines-content`):
  - React is PRIMARY framework (DEVIATION REQUIRED for Angular migration)
  - Tailwind CSS is mandatory
  - TypeScript mandatory
  - WCAG 2.1 Level AA accessibility
  - Strict CSP, HTTPS-only, XSS/CSRF protection
  - Core Web Vitals optimization
- **i18n Guidelines**: i18next for JS/TS (47 languages supported)
- **Test Guidelines**: TDD, isolated, 80% coverage, AI-parseable output (JSON/TAP/JUnit XML)
- **Configuration**: XDG Base Directory mandatory
- **Author**: Mark LaPointe <mark@cloudbsd.org>
- **License**: BSD 3-Clause
- **Target platform**: FreeBSD (not Linux)

## Conflict Surfaced
- The user's WebUI standards explicitly state React is primary. Angular is a deliberate override.
- The user has Angular experience (zathrasask project uses Angular 22).
- Tailwind/TypeScript/i18next/WCAG 2.1 AA/CSP/HTTPS constraints STILL APPLY for Angular migration.

## Technical Decisions (TBD - needs user input)
- Angular version (20.x latest vs 19 LTS vs 18 LTS?)
- UI library: Angular Material vs PrimeNG vs custom Tailwind+Angular
- State management: Signals (modern) vs NgRx vs Services
- i18n: Keep i18next via @ngx-translate/i18next-compat vs Angular's native i18n vs migrate to $localize
- Charts/Diagrams: @xyflow/angular (exists, port from @xyflow/react) vs different lib
- Migration strategy: Big-bang vs incremental (route-by-route)
- Build system: Angular CLI default (esbuild) vs Nx vs custom
- Test framework: Vitest (works with Angular via Analog/Jest config) vs Karma+Jasmine (Angular CLI default)
- Branch name preference

## NEW REQUIREMENTS (from user follow-up) - LOCKED IN
- **VIEW-ONLY frontend**: Hide all write UI controls. Read-only views: Dashboards, Lists, Details, Logs, Metrics. Frontend consumes current backend for reads initially; new backend will replace entirely.
- **BACKEND REPLACEMENT**: Current `/server` (Express 5 + SQLite) gets replaced entirely. New backend must support PAM authentication. Both frontend (Angular) and backend are being rebuilt.
- **SVG DIAGRAMS REQUIRED**: All 14 screens + key interaction flows committed as SVG with `<foreignObject>` to `diagrams/`. Per Honcho convention.
- **MODULAR AUTH (PAM)**: Backend authenticates via PAM. Frontend VALIDATES session. On validation failure → frost-out modal with reason.
- **FROST-OUT MODAL UX**: When session validation fails, page frosts out (blocks interaction, HIDES information underneath for security), shows modal with reason (e.g., "session expired", "session revoked"), user clicks OK → guided to login screen.
- **ADJUSTMENTS**: After plan generation (during Momus review or after seeing plan).
- **COMMIT & PUSH PLANNING**: After Metis/Momus/planning tasks complete, commit and push planning artifacts (`.sisyphus/plans/*.md`, `.sisyphus/drafts/*.md`, `diagrams/*.svg`) to `feat/angular-migration`.
- **PLUGIN SYSTEM (NEW)**: Backend can dynamically add menu items, pages, modals, wizards. Frontend must be extensible to render templates fed from the backend. New services picked up by backend = new screens available without redeploy.
- **CUSTOM MIME TYPES (NEW)**: No more generic `application/json`. Use specific types like `cloudbsd/login`, `cloudbsd/createvm`. Required headers: `who`, `what`, `why`, `where`.
- **PLAYWRIGHT VISUAL INSPECTIONS (NEW)**: Visual regression with Playwright for all 14 pages.
- **OPENAPI SPEC (NEW)**: Generate OpenAPI 3.1 spec as the contract for the new PAM-auth backend.

## PLUGIN SYSTEM ARCHITECTURE (derived from user description)
- **Backend side**: Plugin/service registry. Backend picks up new services, exposes them via API.
- **Frontend side**: Template renderer. Receives screen templates from backend (JSON schema describing layout, components, data bindings), renders them dynamically.
- **Menu extensibility**: Sidebar nav driven by manifest from `/api/manifest`. New menu items appear without code change.
- **Page extensibility**: Dynamic route loader. `/ext/<pluginId>/<pageId>` resolves to a dynamically-registered component from the manifest.
- **Modal/Wizard extensibility**: Modal service exposes a render-by-template API. Backend can request a modal be shown via plugin manifest events.
- **Template format**: JSON schema with: `{type: 'page'|'modal'|'wizard'|'menu', id, title, icon, layout: [...components], dataBindings: {...}}`
- **Component library**: Set of well-known components available to templates (`Card`, `Table`, `Form`, `Chart`, `Tree`, `Badge`, etc.)
- **Data fetching**: Templates declare data endpoints; renderer fetches and binds.

## CUSTOM MIME TYPE + HEADER SCHEMA (derived from user description)
- **Content-Type format**: `application/vnd.cloudbsd+<action>` where action is a verb-noun like:
  - `application/vnd.cloudbsd+login`
  - `application/vnd.cloudbsd+createvm`
  - `application/vnd.cloudbsd+startcontainer`
  - `application/vnd.cloudbsd+listvolumes`
  - `application/vnd.cloudbsd+manifest` (for plugin manifests)
  - `application/vnd.cloudbsd+template` (for screen templates)
  - `application/vnd.cloudbsd+session.validate`
- **Required headers**:
  - `X-CloudBSD-Who`: user identifier / session token
  - `X-CloudBSD-What`: action being performed (e.g., "list_vms")
  - `X-CloudBSD-Why`: reason/intent (e.g., "user_request", "scheduled_sync")
  - `X-CloudBSD-Where`: source/origin (e.g., "dashboard_view", "vm_detail_panel")
- **Accept header**: Client requests specific MIME type for response

## NEW ARCHITECTURE
```
[CloudBSD Admin - View-Only Angular Frontend with Plugin Renderer]
   |   ↑↑↑ Templates, manifests, data fetched with cloudbsd/* MIME types
   |   ↑↑↑ X-CloudBSD-Who/What/Why/Where headers
   v
[New PAM-Auth Backend with Plugin Registry]
   |   Discovers services (FreeBSD: bhyve, podman, jails)
   v
[PAM] [SQLite/Postgres] [Service Registry]
```

## Plan Structure (Updated)
- Phase 0: Branch creation + planning artifacts commit
- Phase 1: Documentation (SVG diagrams + OpenAPI spec + plugin contract doc)
- Phase 2: New backend (PAM + plugin registry + custom MIME types)
- Phase 3: Angular foundation (shell, Tailwind, CDK, $localize, NgRx SignalStore, Karma+Jasmine, plugin template renderer, frost-out modal)
- Phase 4: View-only pages (14 pages with hidden writes + plugin-ready)
- Phase 5: Playwright visual inspections + E2E
- Phase 6: Cutover, decommission React
- Final: Momus review + commit/push

## Branch Strategy
- Create `feat/angular-migration` from f01c24b (current HEAD on vstest)
- Branch receives planning artifacts AND code
- Push branch to origin after each phase
- Note: Existing branch `vstest` should NOT be deleted; new branch coexists

## Scope Boundaries
- INCLUDE: Migrate frontend React → Angular
- INCLUDE: Preserve backend unchanged
- INCLUDE: Migrate 44 locale files
- INCLUDE: Preserve all functionality (Dashboard, VMs, Jails, OCI, Volumes, Network, Notifications, Logs, Settings, Users, Cluster)
- EXCLUDE: Backend refactoring
- EXCLUDE: Adding new features

## Branch Strategy
- Create new branch BEFORE work begins
- Branch should isolate Angular migration work