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
- **STRUCTURED JSONL LOGGING (NEW)**: Current `console.log/warn/error` (40+ in server/index.ts) is unstructured plaintext. Replace with JSONL (newline-delimited JSON) output. Each log entry follows a strict data structure.
- **MODULAR/SWAPPABLE LOGGING (NEW)**: Logger is an interface, not a singleton. Implementations can be swapped without changing call sites. Default = JSONL stdout. Pluggable: file, remote (Loki/Datadog/etc.), null (for tests), multi (combine).
- **FRONTEND LOGGING (NEW)**: Same structured logger module in Angular. Frontend logs go to backend `/api/logs.ingest` endpoint with custom MIME.

## COMPREHENSIVE THEME CUSTOMIZATION + BRANDING (NEW)

### User Requirements
- Users can customize themes (colors, fonts, etc.)
- Users can brand themes (custom logo, name)
- Import/export themes (share, backup)
- Theme editor (visual editor for creating themes)
- Menu systems for theme management

### Theme Customization

Users can edit ANY theme token and save as a custom variant.

**Editable token categories:**
- Colors: primary, secondary, accent, all bg/text/border tokens
- Typography: font family, sizes
- Effects: shadows, border-radius, glass blur
- Signature elements: scanlines on/off, pixel borders on/off, etc.

**Custom theme storage:**
- User's custom themes stored per-user in `user_themes` table.
- Schema: `{id, user_id, base_theme_id, name, description, tokens, branding, created_at, updated_at}`.
- Frontend reads from `GET /api/users/me/themes`.
- Max 50 custom themes per user (configurable).

### Theme Branding

Each custom theme can have:
- **Name** (e.g., "Acme Corp Admin Theme")
- **Description** (e.g., "For Acme internal use")
- **Logo** (uploaded SVG/PNG, max 200KB)
- **Author info** (optional): author name, contact email, website
- **License** (default: BSD-3-Clause)
- **Tags** (free-form: ["corporate", "high-contrast", "minimal"])
- **Visibility** (private / shared-with-team / public)

### Theme Import/Export

**Export format** (`.cbsd-theme.json`):
```json
{
  "$schema": "https://cloudbsd.org/schemas/theme/v1.json",
  "format_version": "1.0.0",
  "id": "uuid",
  "name": "My Custom Theme",
  "description": "...",
  "author": {
    "name": "...",
    "email": "...",
    "website": "..."
  },
  "license": "BSD-3-Clause",
  "tags": ["custom", "corporate"],
  "based_on": "cloudsbsd-revytech",
  "tokens": {
    "primary": "#ff5500",
    "primaryHover": "#ff7733",
    "bgBase": "#1a1a1a",
    "textPrimary": "#ffffff",
    "fontSans": "Inter",
    "borderRadius": "8px",
    "scanlines": false,
    "glass": true
    // ... all theme tokens
  },
  "branding": {
    "logo_data_url": "data:image/svg+xml;base64,...",
    "logo_alt_text": "Acme Corp"
  },
  "signature": "sha256:..."  // hash for integrity verification
}
```

**Import flow:**
1. User uploads `.cbsd-theme.json` file OR pastes JSON.
2. Frontend validates against schema (Zod or JSON Schema).
3. Compute signature, verify integrity.
4. Show preview with theme applied.
5. User confirms: Save as new / Replace existing / Cancel.
6. POST to `/api/users/me/themes`.

**Validation rules:**
- All required token fields present.
- Color values valid hex.
- Font names from allowed list (or Google Fonts subset).
- Logo size ≤ 200KB.
- Signature valid (if present).
- No executable code in JSON (rejects `__proto__`, `constructor`, etc.).

### Theme Editor

**Visual editor (no code required):**
- **Color picker** for each token (swatches + hex input + alpha slider).
- **Font selector** with live preview (dropdown of allowed fonts).
- **Slider inputs** for border-radius, shadow blur.
- **Toggle switches** for signature elements (scanlines, pixel borders, etc.).
- **Live preview** panel showing current state of selected page (e.g., Dashboard).
- **Side-by-side** compare with base theme.

**Editor tabs:**
1. **Colors** — primary, secondary, accent, bg, text, borders, semantic.
2. **Typography** — fonts, sizes.
3. **Effects** — shadows, radius, blur.
4. **Branding** — name, description, logo upload.
5. **Preview** — live view of dashboard in current edit state.
6. **Metadata** — tags, author, license.

**Save options:**
- "Save as new" — creates new custom theme.
- "Update existing" — overwrites (with confirmation).
- "Export" — download as `.cbsd-theme.json`.
- "Reset" — revert to base theme tokens.

### Menu System

**Settings → Themes menu structure:**
```
Settings
└── Appearance
    ├── Theme
    │   ├── Gallery (browse all 15 built-in + user's custom)
    │   ├── Editor (create/edit custom theme)
    │   ├── My Themes (user's custom themes)
    │   ├── Import
    │   └── Export
    └── ...
```

### Mock-ups Required

- `diagrams/screens/theme-editor.svg` — Full theme editor with all tabs.
- `diagrams/screens/theme-editor-colors.svg` — Colors tab detail.
- `diagrams/screens/theme-editor-branding.svg` — Branding tab with logo upload.
- `diagrams/screens/theme-import.svg` — Import dialog with preview.
- `diagrams/screens/theme-export.svg` — Export dialog with JSON preview.
- `diagrams/screens/theme-gallery.svg` — Theme gallery (grid of all themes).
- `diagrams/modals/theme-conflict.svg` — "Theme already exists, replace?" modal.
- `diagrams/modals/theme-validation-error.svg` — "Invalid theme file" modal.

### Backend Support

- `GET /api/users/me/themes` — list user's custom themes.
- `POST /api/users/me/themes` — create new custom theme.
- `PUT /api/users/me/themes/:id` — update existing.
- `DELETE /api/users/me/themes/:id` — delete custom theme.
- `GET /api/users/me/themes/:id/export` — download as `.cbsd-theme.json`.
- `POST /api/users/me/themes/import` — upload/import (multipart or JSON body).

All endpoints use custom MIME types per CloudBSD convention.

### Schema URL

Theme schema hosted at: `https://cloudbsd.org/schemas/theme/v1.json`
Stored as `diagrams/theme-schema.json` (also) so it works offline.

### Logging

```json
{"timestamp":"...","level":"info","module":"themes","message":"Custom theme created","user_id":1,"theme_id":"...","based_on":"miami-vice"}
{"timestamp":"...","level":"info","module":"themes","message":"Theme imported","user_id":1,"theme_name":"Acme Corp","theme_id":"..."}
{"timestamp":"...","level":"warn","module":"themes","message":"Theme validation failed","user_id":1,"error":"invalid_color","field":"primary"}
```

### Tasks to Add

**Wave 0 (Documentation):**
- **T3m**: Theme customizer mock-ups (8 SVG files)
- **T3n**: Theme JSON schema (`diagrams/theme-schema.json`)

**Wave 1 (Backend):**
- **T14b**: Custom theme CRUD endpoints (`/api/users/me/themes/*`)
- **T14c**: Theme import validation (Zod schema + sandboxed eval protection)

**Wave 2 (Frontend):**
- **T16b**: Theme customizer service (token editor, save/load)
- **T16c**: Theme import/export service (JSON parsing, validation, signature verification)

**Wave 3 (Settings page):**
- **T22b**: Theme editor UI (full editor with tabs)
- **T22c**: Theme gallery UI (browse all themes)
- **T22d**: Theme import/export UI

## COMPREHENSIVE THEME SYSTEM (NEW)

### Theme Catalog (15 themes)

Per user requirement: "CloudBSD/REVYTECH, Miami Cyberpunk, Retro Gamer, [Beige Box era], [Pearl Luna era], CDE, Solaris-inspired, Mac OSX-inspired, RetroCRT, Modern Glass bright, Modern Glass dark, plus a few OS-inspired themes — avoid copyright/trademark terms."

All names are generic/descriptive to avoid trademark issues.

| # | Theme Name | Inspired By | Era | Color Palette | Typography |
|---|---|---|---|---|---|
| 1 | **CloudBSD/REVYTECH** | Current brand | 2024+ | Sky blue (#0ea5e9), white, dark slate | Inter + Outfit |
| 2 | **Miami Vice** | 80s Miami Cyberpunk | 80s | Hot pink (#ff1493), cyan (#00ffff), black, sun yellow | Orbitron + Audiowide |
| 3 | **Pixel Pop** | Retro 8-bit gaming | 80s-90s | Bright primary (red, blue, yellow, green), black borders | "Press Start 2P" / monospace pixel font |
| 4 | **Beige Box** | Mid-90s PC era | 1995-2000 | Beige (#c0c0c0), gray (#808080), 3D bevel effects | Tahoma / MS Sans Serif equivalent |
| 5 | **Pearl Luna** | Early-2000s Bliss era | 2001-2007 | Sky blue gradient, green grass, white, soft shadows | Tahoma / Verdana |
| 6 | **CDE Motif** | Common Desktop Environment | 1990s Unix | Muted blue/gray, low contrast, textured backgrounds | Lucida / fixed-width |
| 7 | **SunOS Sunburst** | Sun Microsystems era | 1990s-2000s | Warm orange/sun yellow, beige, deep blue | Lucida Sans |
| 8 | **Aqua Pinstripe** | Early Mac OS X | 2001-2010 | Aqua blue gradient, brushed metal, pinstripe | Lucida Grande |
| 9 | **Phosphor CRT** | Retro terminal | 1970s-80s | Monochrome green (#00ff00) or amber (#ffaa00), scanlines, CRT glow | VT323 / monospace |
| 10 | **Glass Light** | Modern glassmorphism (bright) | 2020s | Frosted white, soft pastels, blurred backdrops | Inter + SF Pro |
| 11 | **Glass Dark** | Modern glassmorphism (dark) | 2020s | Frosted dark, neon accents, blurred backdrops | Inter + SF Pro |
| 12 | **Workbench** | Amiga Workbench | 1985-1995 | Cyan-blue (#0055aa), orange highlights, gray | Topaz / proportional |
| 13 | **Haiku** | BeOS-inspired | 1995-2000 | Warm gray, tab accent colors (yellow/cyan/magenta) | Primate / sans-serif |
| 14 | **Cube** | NeXT-inspired | 1988-1997 | Graphite gray, brushed metal, subtle gradients | Helvetica / Univers |
| 15 | **Warp** | OS/2-inspired | 1987-2000 | Deep blue (#000080), yellow accent, system fonts | Helvetica / WarpSans |

### Theme Token Schema

Each theme defines a complete token set:

```typescript
interface ThemeTokens {
  // Brand colors
  primary: string;
  primaryHover: string;
  primaryActive: string;
  secondary: string;
  accent: string;
  
  // Backgrounds
  bgBase: string;        // page background
  bgSurface: string;     // cards, panels
  bgElevated: string;    // modals, dropdowns
  bgOverlay: string;     // modal backdrop
  
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;
  textInverse: string;
  
  // Borders
  borderSubtle: string;
  borderDefault: string;
  borderStrong: string;
  
  // Semantic
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Effects
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  borderRadius: string;  // 0px for sharp, 4-8px for modern, 16px+ for glass
  glassBlur: string;    // 'blur(12px)' for glass, 'none' for solid
  
  // Typography
  fontSans: string;
  fontDisplay: string;
  fontMono: string;
  fontSize: { base, sm, lg, xl, '2xl', '3xl' };
  
  // Theme-specific
  scanlines?: boolean;     // Phosphor CRT
  pixelated?: boolean;     // Pixel Pop
  textured?: boolean;      // CDE
  pinstripes?: boolean;    // Aqua Pinstripe
  glass?: boolean;         // Glass themes
  bevel?: boolean;         // Beige Box (3D button effects)
}
```

### Theme Persistence

- User preference stored in `AuthStore.user.themeId`.
- Default theme per user: CloudBSD/REVYTECH.
- Theme switcher in Settings page.
- Real-time apply (no page reload).
- All themes inherit WCAG 2.1 AA contrast for text/bg combinations.

### Theme Mock-ups

For each of the 15 themes, create a mock-up SVG showing:
- **Dashboard view** in that theme
- Color tokens visible (header bar, sidebar, stat card, chart card, table row)
- Typography sample
- One signature element unique to theme (e.g., scanlines for CRT, pixel borders for Pixel Pop)

**File:** `diagrams/themes/<theme-slug>.svg` × 15.

Plus a comparison grid SVG showing all 15 themes side-by-side at thumbnail scale.

### Theme Implementation (Frontend)

```typescript
// web-new/src/app/themes/
├── tokens/
│   ├── cloudsbsd-revytech.ts
│   ├── miami-vice.ts
│   ├── pixel-pop.ts
│   ├── beige-box.ts
│   ├── pearl-luna.ts
│   ├── cde-motif.ts
│   ├── sunos-sunburst.ts
│   ├── aqua-pinstripe.ts
│   ├── phosphor-crt.ts
│   ├── glass-light.ts
│   ├── glass-dark.ts
│   ├── workbench.ts
│   ├── haiku.ts
│   ├── cube.ts
│   └── warp.ts
├── theme.service.ts        // applies theme via CSS variables
├── theme.types.ts          // ThemeTokens interface
└── theme-preview.component.ts  // for settings page
```

CSS variables approach:
```css
:root[data-theme="miami-vice"] {
  --color-primary: #ff1493;
  --color-bg-base: #0a0a14;
  --color-text-primary: #00ffff;
  /* ... */
}
```

Theme switch: set `document.documentElement.dataset.theme = themeId`.

### Theme Selector (Settings Page)

- Grid of theme previews (15 thumbnails).
- Click → live preview applies theme.
- Selected theme highlighted with border.
- "Apply" button or instant-apply.
- Search/filter themes by name.

### Logging Integration

Theme changes logged:
```json
{"timestamp":"...","level":"info","module":"settings","message":"User changed theme","user_id":1,"old_theme":"cloudsbsd-revytech","new_theme":"miami-vice"}
```

### Tasks to Add

**Wave 0 (Documentation):**
- **T3k**: Theme catalog design doc (15 themes with token specs) — `diagrams/themes/README.md`
- **T3l**: 15 theme mock-up SVGs (one per theme) + 1 comparison grid SVG

**Wave 2 (Frontend Foundation):**
- **T16a**: Theme system implementation (tokens, CSS variables, theme service)

**Wave 3 (Settings page):**
- **T22a**: Theme selector UI in Settings

## COMPREHENSIVE UI MOCK-UP SCOPE (NEW - prevents later rework)

Per user requirement: "SVG for every UI item in the plan. See what errors, notifications, etc. look like. Clear this up now."

### Mock-up Categories

#### 1. Screens (14 files) — `diagrams/screens/*.svg`
Already covered in T02.

#### 2. Error States (12 files) — `diagrams/errors/*.svg`
Already covered in T3a.
Each with detail-level variants (4 levels) inline as collapsible section.

#### 3. Notifications (5 files) — `diagrams/notifications/*.svg`
NEW — T3c.
- `info-toast.svg` — Blue accent, info icon, "VM metadata refreshed", auto-dismiss 5s.
- `success-toast.svg` — Green accent, check icon, "Preferences saved", auto-dismiss 5s.
- `warning-toast.svg` — Yellow accent, warning icon, "Backend slow response", auto-dismiss 8s.
- `error-toast.svg` — Red accent, error icon, "Failed to refresh", manual dismiss.
- `system-notification.svg` — System notifications from backend (e.g., "VM started by admin"), persistent until read.

#### 4. Modals (6 files) — `diagrams/modals/*.svg`
NEW — T3d.
- `error-modal.svg` — Reusable error modal (with 4 detail-level variants shown side-by-side).
- `frost-out-modal.svg` — Session expired modal (full-page overlay).
- `confirmation-modal.svg` — Generic confirmation ("Are you sure?", OK/Cancel).
- `resource-details-modal.svg` — View-only resource details (VM/container info).
- `about-modal.svg` — App info modal (version, license, links).
- `logout-confirmation.svg` — Confirm logout modal.

#### 5. Core UI Components (15 files) — `diagrams/components/*.svg`
NEW — T3e.
- `sidebar-expanded.svg` — Full sidebar with all menu items, active state, badges.
- `sidebar-collapsed.svg` — Collapsed sidebar (icons only).
- `mobile-sidebar.svg` — Mobile drawer overlay with hamburger trigger.
- `header.svg` — Top header with user menu, theme toggle, locale switcher.
- `mobile-topbar.svg` — Mobile header (compact, hamburger).
- `stat-card.svg` — Stat card with value, label, trend indicator.
- `chart-card.svg` — Card with embedded chart (line/bar/donut).
- `data-table.svg` — Data table with sortable columns, pagination, search.
- `data-table-empty.svg` — Empty table state.
- `badge.svg` — Badge variants (default, success, warning, error, info).
- `form-input.svg` — Text input (default, focus, error, disabled).
- `form-select.svg` — Dropdown select (closed, open with options).
- `form-toggle.svg` — Toggle switch (on, off, disabled).
- `button-variants.svg` — All button styles (primary, secondary, tertiary, danger, ghost, icon).
- `tree-item.svg` — Collapsible tree node with children.

#### 6. Theme Variants (3 files) — `diagrams/themes/*.svg`
NEW — T3f.
- `login-light.svg` — Login screen in light mode.
- `login-dark.svg` — Login screen in dark mode.
- `dashboard-high-contrast.svg` — Dashboard in WCAG AAA high contrast mode.

#### 7. Mobile Variants (3 files) — `diagrams/mobile/*.svg`
NEW — T3g.
- `mobile-dashboard.svg` — Dashboard at 375×812 (iPhone).
- `mobile-vms-list.svg` — VM list view on mobile.
- `mobile-vm-detail.svg` — VM detail view on mobile.

#### 8. Loading/State Variants (4 files) — `diagrams/states/*.svg`
NEW — T3h.
- `loading-skeleton.svg` — Skeleton placeholder while data loads.
- `loading-spinner.svg` — Centered spinner with optional message.
- `progress-bar.svg` — Linear progress bar (for long ops like file upload).
- `empty-state-illustration.svg` — Generic empty state with illustration.

#### 9. Plugin Manifest Items (3 files) — `diagrams/plugins/*.svg`
NEW — T3i.
- `new-menu-item-toast.svg` — Toast notification when new plugin menu item appears.
- `plugin-page-rendered.svg` — Dynamic plugin page rendered from manifest.
- `plugin-modal-rendered.svg` — Dynamic modal triggered by plugin event.

#### 10. Interaction Flows (5 files) — `diagrams/flows/*.svg`
Already covered in T03.

### Total Mock-up Count

| Category | Count | Task |
|---|---|---|
| Screens | 14 | T02 |
| Errors (with detail variants) | 12 | T3a |
| Settings → Error Display | 1 | T3b |
| Notifications | 5 | T3c (NEW) |
| Modals | 6 | T3d (NEW) |
| Core UI Components | 15 | T3e (NEW) |
| Theme Variants | 3 | T3f (NEW) |
| Mobile Variants | 3 | T3g (NEW) |
| Loading/State Variants | 4 | T3h (NEW) |
| Plugin Manifest Items | 3 | T3i (NEW) |
| Interaction Flows | 5 | T03 |
| **TOTAL** | **71 SVG files** | |

### `diagrams/ui-coverage-matrix.md`

A single document listing every UI surface in the plan and its corresponding mock-up file. Used by reviewer to confirm nothing was missed.

```markdown
| UI Surface | Severity/Type | Mock-up File | Status |
|---|---|---|---|
| Login page | screen | diagrams/screens/login.svg | ✓ |
| Dashboard | screen | diagrams/screens/dashboard.svg | ✓ |
| VMs list | screen | diagrams/screens/vms.svg | ✓ |
| ... (71 rows total) | | | |
```

### Why This Scope

User quote: "I want to clear this up now because I've had to fight in the past with what is where and a bunch of heavy lifting later to correct the problems."

By producing 71 mock-ups upfront:
1. **No "where is this thing" debates** during implementation.
2. **Visual reference for every component** — dev doesn't guess.
3. **Review checkpoint** — user can spot issues in mockups, fix in mockups, not in code.
4. **Test reference** — Playwright tests use mockups as ground truth for visual assertions.
5. **Onboarding artifact** — new devs see the full UI surface area immediately.

### Tasks to Add (Wave 0)

- **T3c**: Notifications mock-ups (5 SVG files)
- **T3d**: Modals mock-ups (6 SVG files)
- **T3e**: Core UI components (15 SVG files)
- **T3f**: Theme variants (3 SVG files)
- **T3g**: Mobile variants (3 SVG files)
- **T3h**: Loading/state variants (4 SVG files)
- **T3i**: Plugin manifest items (3 SVG files)
- **T3j**: UI coverage matrix (1 markdown file)

Total new SVG artifacts: 41 files.

## PRE-FLIGHT CHECK + ERROR PRESENTATIONS (NEW)

### Pre-Flight Check Concept
On app startup, the frontend runs a **pre-flight check** to detect backend availability BEFORE rendering the main UI. The app can still start (so the user sees SOMETHING), but displays a clear "backend unavailable" state.

### Pre-Flight Check Sequence

```
[App Boot]
   ↓
[PreFlightService.run()]
   ↓ GET /api/health (no auth required, lightweight)
[Backend responds]
   ↓ 200 OK + body {status, version, uptime, services: {...}}
[App marks backend healthy]
   ↓
[Continue to auth check]
   ↓ GET /api/session.validate (with cookie if present)
[Backend responds]
   ↓ 200 (authenticated) or 401 (not authenticated)
[App routes to /login or /dashboard accordingly]
   ↓
[Connect Socket.IO + global state store subscription]
```

### Pre-Flight Check Levels

Three progressive levels, each more detailed than the last:

1. **L1 - Basic reachability** (`GET /api/health`)
   - Is the server reachable at all?
   - Response time < 5s?
   - 200 OK + valid JSON?

2. **L2 - Service health** (`GET /api/health` with detail)
   - All backend subsystems OK?
   - Database reachable?
   - PAM service available?
   - Plugin registry initialized?

3. **L3 - Auth health** (`POST /api/session.validate`)
   - If cookie present, is session valid?
   - Routes to login or dashboard based on result.

### Backend Unavailable UI

When pre-flight fails, the app renders a **degraded shell**:
- Top banner: red strip with "Backend Unavailable" + retry button
- Main content area: explainer with retry button, status details, support link
- Sidebar nav: visible but disabled (greyed out, with "Backend offline" tooltips)
- Pages: show skeleton/placeholder with "Waiting for backend..." text
- Frost-out modal: suppressed (no point, session can't be validated)
- Auto-retry: every 30s with exponential backoff
- Manual retry: user-initiated via button

### Pre-Flight Service (Angular)

```typescript
@Injectable({providedIn: 'root'})
class PreFlightService {
  readonly state = signal<PreFlightState>({status: 'pending'});
  
  async run(): Promise<void> {
    // L1: basic reachability
    try {
      const res = await fetch('/api/health', {signal: AbortSignal.timeout(5000)});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      this.state.update(s => ({...s, status: 'reachable', version: body.version}));
    } catch (err) {
      this.state.set({status: 'unreachable', error: err.message, lastAttempt: new Date().toISOString()});
      this.scheduleRetry();
      return;
    }
    
    // L2: service health (skipped if L1 failed)
    // ...
    
    // L3: auth check
    // ...
  }
  
  private scheduleRetry(): void {
    // Exponential backoff: 30s, 60s, 120s, capped at 5min
  }
}
```

### Error Presentation Mock-ups (SVG)

Visual designs for all error states. Each as SVG `<foreignObject>` file in `diagrams/errors/`.

| File | Error State | Trigger | Severity |
|---|---|---|---|
| `backend-unavailable.svg` | Backend down | Pre-flight L1 fail | CRITICAL |
| `backend-degraded.svg` | Backend partial | Some subsystems OK, some failed | WARN |
| `session-expired.svg` | Session timeout | 401 from any endpoint | CRITICAL |
| `session-revoked.svg` | Session killed by admin | Backend returns `session_revoked` | CRITICAL |
| `permission-denied.svg` | 403 from backend | User lacks permission for resource | ERROR |
| `network-timeout.svg` | Request timeout | Fetch takes > 30s | ERROR |
| `server-error.svg` | 500 from backend | Unhandled exception | ERROR |
| `validation-error.svg` | Form validation | Invalid input on form | INFO |
| `empty-state.svg` | No data | Search returns 0 results | INFO |
| `connection-lost.svg` | WebSocket disconnect | Socket.IO drops | WARN |
| `plugin-error.svg` | Plugin manifest error | Backend plugin registry fails | ERROR |
| `csrf-failure.svg` | CSRF validation failed | 403 with csrf in error | ERROR |

### Error Severity → Presentation Mapping

| Severity | Presentation | Notes |
|---|---|---|
| **CRITICAL** | Full-screen modal (blocks everything) | Frost-out style, "OK" or "Login Again" button |
| **ERROR** | Centered modal (blocks page but not app) | Dismissable, with detail toggle |
| **WARN** | Top banner (persistent until resolved) | Sidebar still accessible, pages show degraded |
| **INFO** | Toast (auto-dismiss after 5s) | Non-blocking notification |

**Big errors → MODAL** (per user requirement). Backend unavailable, session expired, server errors, permission denied → all modals.

### Detail Level Settings (Per-User)

User setting controls how much error detail is shown. Located in **Admin Settings → Error Display** section.

#### Detail Levels

**1. MINIMAL** (regular users default)
- Error type only ("Network Error", "Server Error", "Permission Denied")
- Generic actionable message ("Please try again", "Contact your administrator")
- Single primary button ("OK", "Retry")
- No technical details visible
- No error IDs shown

**2. STANDARD** (regular users opt-in)
- Error type + human-readable description
- Actionable suggestion ("Check your network connection", "Try again in a moment")
- Error ID shown (for support reference)
- Primary button + "Copy Error ID" secondary button

**3. DETAILED** (admin default)
- Everything in STANDARD
- Stack trace (truncated to 1KB)
- Request ID for log correlation
- Endpoint that failed
- HTTP status code
- Timestamp
- "Copy Full Details" button (copies JSON to clipboard)

**4. DEBUG** (admin opt-in, dev only)
- Everything in DETAILED
- Full untruncated stack trace
- Request headers (sanitized — no auth headers)
- Response headers
- Internal state snapshot
- "Download Debug Bundle" button (JSON file)

#### Detail Level Selection Rules

| User Role | Available Options | Default |
|---|---|---|
| **Admin** | Minimal / Standard / Detailed / Debug | Detailed |
| **Operator** | Minimal / Standard / Detailed | Standard |
| **Viewer** | Minimal / Standard | Minimal |

#### Setting Storage
- Per-user setting stored in user profile (PUT `/api/users/profile`)
- Sent in JWT/session payload as `error_detail_level`
- Frontend reads from `AuthStore.user.errorDetailLevel`
- Default for new users = role-based default

### Modal Error Component (Angular)

```typescript
@Component({
  selector: 'app-error-modal',
  template: `
    @if (visible()) {
      <div class="error-modal-backdrop" (click)="onBackdropClick()">
        <div class="error-modal" role="alertdialog" aria-modal="true">
          <header>
            <icon [name]="iconFor(error().severity)" />
            <h2>{{ error().title }}</h2>
            <span class="severity-badge">{{ error().severity }}</span>
          </header>
          
          <section class="error-message">
            {{ error().message }}
          </section>
          
          @if (shouldShowDetail()) {
            <details class="error-detail">
              <summary>Technical Details</summary>
              <pre>{{ formatDetail(error()) }}</pre>
            </details>
          }
          
          <footer>
            @if (error().errorId) {
              <button class="secondary" (click)="copyErrorId()">
                Copy Error ID
              </button>
            }
            <button class="primary" (click)="onPrimaryAction()">
              {{ error().primaryAction }}
            </button>
            @if (canDismiss()) {
              <button class="tertiary" (click)="onDismiss()">Dismiss</button>
            }
          </footer>
        </div>
      </div>
    }
  `
})
class ErrorModalComponent {
  visible = signal(false);
  error = signal<ErrorPayload | null>(null);
  detailLevel = inject(AuthStore).user().errorDetailLevel;
  
  shouldShowDetail = computed(() => {
    const level = this.detailLevel;
    const severity = this.error()?.severity;
    if (severity === 'CRITICAL') return level !== 'MINIMAL';  // CRITICAL always shows some detail
    return level === 'DETAILED' || level === 'DEBUG';
  });
  
  formatDetail(error: ErrorPayload): string {
    if (this.detailLevel === 'DEBUG') {
      return JSON.stringify({
        error_id: error.errorId,
        request_id: error.requestId,
        endpoint: error.endpoint,
        status_code: error.statusCode,
        timestamp: error.timestamp,
        stack: error.stack,
        headers: error.headers,
      }, null, 2);
    }
    return JSON.stringify({
      error_id: error.errorId,
      request_id: error.requestId,
      timestamp: error.timestamp,
    }, null, 2);
  }
}
```

### Admin Settings → Error Display

Settings page section:
- **Title**: "Error Display"
- **Description**: "How much detail to show when errors occur"
- **Options** (radio buttons):
  - `MINIMAL`: "Show only error type. Best for general users."
  - `STANDARD`: "Show error details and IDs for support. Recommended."
  - `DETAILED`: "Show technical details, request IDs, stack traces. Recommended for admins."
  - `DEBUG`: "Show full debug info including headers. Use only when troubleshooting."
- **Admin only**: All 4 options visible.
- **Non-admin**: Only MINIMAL and STANDARD.
- **Save**: PUT `/api/users/profile` with `{error_detail_level: <value>}`.

### Error Payload Schema (Backend → Frontend)

```typescript
interface ErrorPayload {
  // Always present
  severity: 'CRITICAL' | 'ERROR' | 'WARN' | 'INFO';
  code: string;              // machine-readable: 'BACKEND_UNAVAILABLE', 'SESSION_EXPIRED'
  message: string;           // human-readable
  
  // Conditional
  errorId?: string;          // server-generated ID for support
  requestId?: string;        // correlation ID
  endpoint?: string;         // which API was called
  statusCode?: number;       // HTTP status
  timestamp?: string;        // when error occurred
  
  // Debug only
  stack?: string;
  headers?: Record<string, string>;
  metadata?: Record<string, unknown>;
  
  // Actions
  primaryAction: 'OK' | 'Retry' | 'Login Again' | 'Reload' | 'Contact Support';
  canDismiss: boolean;       // false for CRITICAL
}
```

### Tasks to Add (additional refinement)

**Wave 0 (Documentation):**
- Update T3a (already added) — error mock-ups now include detail-level variants (4 versions each = 48 SVGs OR 12 SVGs with collapsible detail section showing all 4 levels)
- New T3b: Admin Settings → Error Display mock-up (1 SVG)

**Wave 2 (Frontend):**
- Update T15e: Error components now role-aware + detail-level aware
- New T15f: Error Modal component (reusable)
- New T15g: Admin Settings → Error Display section

**Wave 3 (Settings page):**
- T22 (Settings) updated to include Error Display section

### Logging Integration

User detail-level changes logged:
```json
{"timestamp":"...","level":"info","module":"settings","message":"User updated error detail level","user_id":1,"old_level":"STANDARD","new_level":"DETAILED"}
```

Error presentations logged:
```json
{"timestamp":"...","level":"warn","module":"ui","message":"Error presented to user","error_type":"backend_unavailable","error_id":"err_abc123","severity":"CRITICAL","user_detail_level":"MINIMAL","presentation":"modal"}
```

### Tasks to Add

**Wave 0 (Documentation):**
- **T02a**: SVG error mock-ups (12 files: `diagrams/errors/*.svg`)

**Wave 1 (Backend):**
- **T14a**: Enhanced `/api/health` endpoint with deep checks (L2 detail)
- **T58a-c**: State broadcaster (already added in previous turn)

**Wave 2 (Frontend):**
- **T15c**: Pre-flight check service (L1/L2/L3 sequence)
- **T15d**: Backend unavailable UI components (banner + shell)
- **T15e**: Error presentation components (12 components matching mock-ups)

### Logging Integration

Pre-flight failures logged via JSONL:
```json
{"timestamp":"...","level":"error","module":"preflight","message":"Backend unreachable","error":{"name":"TimeoutError","message":"..."},"attempt":3,"next_retry_at":"..."}
```

Each error presentation (frost-out, banner) also emits a log:
```json
{"timestamp":"...","level":"warn","module":"ui","message":"Error presented","error_type":"backend_unavailable","error_id":"err_abc123"}
```

## GLOBAL STATE STORE WITH STREAMING UPDATES (NEW)

### Core Concept
Instead of each page polling its own endpoint, all data lives in a **single global state store** on the frontend. The backend **streams updates** to this store via Socket.IO. Pages **read from the store**, never fetch directly. Updates happen:
- On app boot (initial snapshot)
- When backend pushes changes (state upsert/delete)
- On explicit user refresh (manual request)

### Why This Architecture
1. **No polling overhead** — backend pushes only when something changes.
2. **Consistent state across pages** — navigating between pages shows fresh data instantly.
3. **Real-time updates** — VM starts, container stops, jail boots → UI updates without reload.
4. **Reduced network chatter** — 1 persistent WebSocket vs N HTTP polls.
5. **Better UX** — no loading spinners per page; data is already there.

### State Update Schema (Server → Client via Socket.IO)

```typescript
interface StateUpdate {
  topic: 'vms' | 'containers' | 'jails' | 'volumes' | 'disks' | 'notifications' | 'cluster' | 'system' | 'users' | 'services' | 'plugins';
  action: 'snapshot' | 'upsert' | 'delete' | 'clear';
  resource_id?: string;       // for upsert/delete
  data?: unknown;              // resource payload (snapshot/upsert)
  timestamp: string;           // ISO 8601 UTC
  request_id?: string;         // correlation ID
}
```

### Socket.IO Events

**Server → Client:**
- `state:snapshot` — full state for subscribed topics on connect
- `state:upsert` — `{topic, resource_id, data}` — new or updated resource
- `state:delete` — `{topic, resource_id}` — resource removed
- `state:clear` — `{topic}` — clear entire topic (rare, e.g., on reset)

**Client → Server:**
- `state:subscribe` — `{topics: string[]}` — subscribe to topics
- `state:unsubscribe` — `{topics: string[]}` — unsubscribe
- `state:refresh` — `{topic}` — request fresh snapshot for a topic

### Frontend Global State Store (NgRx SignalStore)

```typescript
interface GlobalState {
  // Resource collections (keyed by ID for O(1) lookup)
  vms: Map<string, VM>;
  containers: Map<string, Container>;
  jails: Map<string, Jail>;
  volumes: Map<string, Volume>;
  disks: Map<string, Disk>;
  notifications: Notification[];
  cluster: ClusterState;
  system: SystemStats;
  users: Map<string, User>;
  services: Service[];           // discovered services from plugins
  plugins: PluginManifest[];
  
  // Connection state
  connection: {
    status: 'connected' | 'disconnected' | 'reconnecting';
    lastSync: string;            // ISO timestamp of last snapshot received
    subscribedTopics: Set<string>;
  };
  
  // Per-topic last-update timestamps (for "stale" detection)
  lastUpdate: Map<string, string>;
}
```

### Selector Examples (for pages)

```typescript
// In Dashboard component
const vms = inject(GlobalStateStore).vms;        // Map<string, VM>
const runningVms = computed(() => 
  [...vms()].filter(([_, vm]) => vm.status === 'running').length
);

// In Volumes page
const volumes = inject(GlobalStateStore).volumes;
const sortedVolumes = computed(() => 
  [...volumes()].sort((a, b) => a.name.localeCompare(b.name))
);

// In NetworkMap
const nodes = computed(() => {
  const all = [...globalState.vms(), ...globalState.containers(), ...globalState.jails()];
  return all.map(r => ({id: r.id, label: r.name, type: r.type}));
});
```

### Subscription Lifecycle

```
[App Boot]
   ↓
[GlobalStateStore.connect()]
   ↓ Socket.IO auth with session cookie
[Server validates session, sends snapshot]
   ↓ state:snapshot {vms: [...], containers: [...], ...}
[Store hydrates Maps from snapshot]
   ↓
[App renders, pages read from store]
   ↓
[User navigates to /vms]
[VMs page reads globalState.vms() — no HTTP call]
   ↓
[Backend detects VM state change (e.g., user starts VM via PAM CLI)]
[Server emits state:upsert {topic: 'vms', resource_id: 'vm-123', data: {...}}]
[Store updates Map entry]
[VMs page re-renders via computed signal]
   ↓
[User clicks "Refresh" button]
[VMs page emits state:refresh {topic: 'vms'} via Socket.IO]
[Server re-sends snapshot for vms topic]
[Store replaces vms Map]
[Page re-renders]
```

### Backend State Broadcaster

```typescript
// server-new/src/state/broadcaster.ts
class StateBroadcaster {
  private io: Server;
  private subscribers: Map<string, Set<SocketId>>;  // topic → subscribers
  
  // Called by discoverers / state sources
  publishUpsert(topic: string, resourceId: string, data: unknown): void {
    // Log via structured logger
    logger.debug({module: 'state', topic, action: 'upsert', resource_id: resourceId}, 'State update');
    
    // Emit to subscribers
    this.io.to(`state:${topic}`).emit('state:upsert', {
      topic,
      action: 'upsert',
      resource_id: resourceId,
      data,
      timestamp: new Date().toISOString(),
    });
  }
  
  publishDelete(topic: string, resourceId: string): void { /* ... */ }
  publishSnapshot(socket: Socket, topic: string): void { /* ... */ }
}
```

### Backend Integration with Discoverers

Each discoverer (T40-T44) becomes both:
1. **Poller** — periodically queries the source (e.g., `bhyve vm list`)
2. **Broadcaster** — emits state updates via `StateBroadcaster`

```typescript
// BhyveVMDiscoverer
class BhyveVMDiscoverer {
  async discover(): Promise<void> {
    const currentVMs = await queryBhyveVMs();
    const knownVMs = this.stateStore.getVms();
    
    // Compute delta
    const added = currentVMs.filter(vm => !knownVMs.has(vm.id));
    const removed = [...knownVMs.keys()].filter(id => !currentVMs.has(id));
    const updated = currentVMs.filter(vm => 
      knownVMs.has(vm.id) && !isEqual(knownVMs.get(vm.id), vm)
    );
    
    // Emit updates
    added.forEach(vm => this.broadcaster.publishUpsert('vms', vm.id, vm));
    updated.forEach(vm => this.broadcaster.publishUpsert('vms', vm.id, vm));
    removed.forEach(id => this.broadcaster.publishDelete('vms', id));
  }
}
```

### Refresh Strategy (User-Initiated)

When user clicks "Refresh" button on any page:
1. Page emits `state:refresh {topic}` via Socket.IO
2. Server re-queries source for that topic
3. Server emits `state:snapshot` for that topic (full replacement)
4. Store replaces the topic's Map
5. Computed signals re-derive, page re-renders

### Auth + Connection State

- Socket.IO connection **requires session cookie** (validated on connect)
- If session expires → connection closes → `connection.status = 'disconnected'` → frost-out modal triggers
- Auto-reconnect with exponential backoff (socket.io-client default)
- On reconnect: re-subscribe to all topics, request snapshot

### What STAYS as HTTP

Not everything moves to streaming. HTTP remains for:
- **Login/logout** (one-shot, no state involved)
- **Session validation** (`POST /api/session.validate`)
- **Plugin manifest** (changes infrequently, polling acceptable)
- **Logs ingestion** (`POST /api/logs.ingest`)
- **Health checks** (operational)
- **Initial bootstrap** (if WebSocket fails, fallback to HTTP)

### Migration Impact on Plan

- **T19 (HttpClient interceptors)**: Still needed, but scope narrows to non-data calls.
- **T22-T25 (vertical slice)**: Settings page still uses HTTP (settings aren't streamable).
- **T26-T39 (page migration)**: Pages switch from HTTP fetch → store read.
- **T40-T44 (discoverers)**: Now also act as broadcasters, not just data sources.
- **OpenAPI spec**: HTTP read endpoints documented as fallback, but primary path is Socket.IO streaming.

### Tasks to Add

**Wave 1 (Backend):**
- **T58a**: Backend state broadcaster module (Socket.IO state events)
- **T58b**: Backend snapshot endpoint logic (initial state on connect)
- **T58c**: Backend subscription manager (per-topic subscription tracking)

**Wave 2 (Frontend):**
- **T58d**: Frontend global state store (NgRx SignalStore with Maps)
- **T58e**: Frontend Socket.IO state consumer (subscribe + apply deltas)
- **T58f**: Frontend state selectors (computed signals per page concern)

**Wave 5 (Page Migration) updates:**
- Each page task (T26-T39) updated to read from store, not fetch.

### Logging Integration

Every state update gets logged via JSONL:
```json
{"timestamp":"...","level":"debug","module":"state","message":"State update pushed","topic":"vms","action":"upsert","resource_id":"vm-123","subscriber_count":3}
```

This makes state changes fully auditable in JSONL logs.

## LOGGING ARCHITECTURE (NEW)

### Log Entry Schema (strict)
```typescript
interface LogEntry {
  // Required (always present)
  timestamp: string;        // ISO 8601 UTC, e.g. "2026-07-05T22:00:00.000Z"
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  service: 'cloudbsd-admin' | 'cloudbsd-frontend' | string;
  version: string;          // semver
  message: string;          // human-readable message
  
  // Context (extensible, all optional)
  module?: string;          // subsystem, e.g. 'auth', 'api', 'pam', 'plugins', 'http'
  request_id?: string;      // correlation ID for tracing
  session_id?: string;
  user_id?: number | string;
  ip?: string;
  user_agent?: string;
  duration_ms?: number;     // for timing logs
  status_code?: number;     // for HTTP logs
  method?: string;          // for HTTP logs
  path?: string;            // for HTTP logs
  
  // Error context
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  
  // Free-form metadata
  metadata?: Record<string, unknown>;
}
```

### JSONL Output Format
- Each line = one complete JSON object
- Newline-delimited (NDJSON / JSON Lines)
- Streamable, grep-able, parseable
- No pretty-printing (single line per entry)

Example:
```
{"timestamp":"2026-07-05T22:00:00.000Z","level":"info","service":"cloudbsd-admin","version":"2.0.0","module":"auth","message":"User logged in","user_id":1,"ip":"127.0.0.1","request_id":"req_abc123"}
{"timestamp":"2026-07-05T22:00:01.234Z","level":"warn","service":"cloudbsd-admin","version":"2.0.0","module":"csrf","message":"Missing CSRF token on POST /api/users","ip":"127.0.0.1","method":"POST","path":"/api/users","status_code":403,"request_id":"req_def456"}
```

### Logger Interface (modular/swappable)
```typescript
interface Logger {
  debug(entry: LogEntry | string, context?: Partial<LogEntry>): void;
  info(entry: LogEntry | string, context?: Partial<LogEntry>): void;
  warn(entry: LogEntry | string, context?: Partial<LogEntry>): void;
  error(entry: LogEntry | string, context?: Partial<LogEntry>): void;
  fatal(entry: LogEntry | string, context?: Partial<LogEntry>): void;
  
  // Module-scoped logger (auto-attaches `module` field)
  child(module: string): Logger;
  
  // With persistent context (e.g., request_id, user_id)
  withContext(context: Partial<LogEntry>): Logger;
}
```

### Pluggable Implementations
- `ConsoleJsonlLogger` (default) — writes JSONL to stdout
- `FileJsonlLogger` — writes JSONL to rotating files (`/var/log/cloudbsd/admin.log`)
- `RemoteLogger` — POSTs to remote endpoint (Loki/Datadog/Elastic)
- `NullLogger` — no-op (for tests)
- `MultiLogger` — combines multiple loggers (e.g., stdout + remote)

### Configuration-Driven Selection
```json
{
  "logging": {
    "implementation": "multi",
    "level": "info",
    "loggers": [
      { "type": "console-jsonl" },
      { "type": "file-jsonl", "path": "/var/log/cloudbsd/admin.log", "rotate": "daily" },
      { "type": "remote", "endpoint": "https://logs.example.com/ingest", "auth": "..." }
    ]
  }
}
```

### Module Structure
```
server-new/src/logging/
├── types.ts              # LogLevel, LogEntry, Logger interface
├── console-jsonl.ts      # default stdout JSONL impl
├── file-jsonl.ts         # rotating file JSONL impl
├── remote.ts             # remote endpoint impl
├── null.ts               # no-op impl (tests)
├── multi.ts              # composite impl
├── factory.ts            # config-driven factory
├── context.ts            # request-scoped context (request_id, user_id, etc.)
└── index.ts              # default exported logger

web-new/src/app/logging/
├── types.ts              # shared types (same as backend)
├── console-jsonl.ts      # browser console JSONL impl (dev)
├── remote.ts             # POSTs to /api/logs.ingest
├── null.ts
├── multi.ts
├── factory.ts
├── context.ts            # route/component-scoped context
└── index.ts
```

### Backend `/api/logs.ingest` Endpoint
- Accepts JSONL batches from frontend (newline-delimited)
- Each line parsed and re-logged with frontend context
- Authenticated (requires session cookie)
- Rate-limited per session

### Replacement Targets (Mechanical)
**Backend (`server-new/src/`):**
- 40+ `console.log/warn/error/debug` in `server/src/index.ts` → `logger.info/warn/error/debug`
- `logAction()` SQLite function → `logger.info({module: 'audit', action, ...}, "...")`
- `console.error` in `db.ts` migrations → `logger.error({module: 'db', error: {...}}, "Migration failed")`

**Frontend (`web-new/src/`):**
- 6 `console.error` in `src/api/client.ts` → `logger.error({module: 'auth', ...}, "...")`
- 1 `console.warn` for CSRF prime failure → `logger.warn(...)`

### Tests
- Unit: each logger implementation
- Contract: any impl satisfies `Logger` interface (parameterized test)
- Factory: picks correct impl from config
- Format: output is valid JSONL (parseable line-by-line)
- Context propagation: child loggers inherit module, withContext preserves

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