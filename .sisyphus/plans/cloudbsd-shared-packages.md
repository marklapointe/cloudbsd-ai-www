# @cloudbsd/ui + @cloudbsd/hooks + @cloudbsd/ui-admin Package Creation

## TL;DR

Create 3 internal npm packages for sharing code across cloudbsd-ai-www, www-cloudbsd-org, and revytechinc. Packages will be published to private Nexus 3 registry once set up.

**Estimated Effort**: Large
**Parallel Execution**: YES - packages are independent
**Critical Path**: Extract LanguageSelector first → Build common → Build admin

---

## Context

### Goal
Establish shared npm package architecture to DRY up code across CloudBSD and RevyTech projects, ensuring uniform components and consistent patterns.

### User Requirements
- Separate npm packages (not monorepo)
- Packages: `@cloudbsd/ui`, `@cloudbsd/hooks`, `@cloudbsd/ui-admin`
- User handles Nexus 3 setup separately
- Start with highest-value extractions

### Packages Scope

**@cloudbsd/ui** - Shared UI primitives (all 3 projects)
- LanguageSelector
- ThemeToggle
- Button variants
- Badge/StatusBadge
- Card primitives
- Glass morphism utilities

**@cloudbsd/hooks** - Shared React hooks (all 3 projects)
- useTheme
- useLanguage
- useAuth (extract from cloudbsd-ai-www)

**@cloudbsd/ui-admin** - Admin-specific components (cloudbsd-ai-www only, but structured for potential future sharing)
- ResourceList
- ResourceModal
- ConfirmationModal
- ConsoleModal
- CustomPageSizeModal

---

## Work Objectives

### Package 1: @cloudbsd/ui

**Purpose**: Shared UI primitives used across all projects

#### Components to Extract

| Component | Source | Lines | Priority |
|-----------|--------|-------|----------|
| LanguageSelector | www-cloudbsd-org + revytechinc (duplicated) | ~120-136 each | HIGH |
| ThemeToggle | cloudbsd-ai-www + www-cloudbsd-org | ~20 each | HIGH |
| FeatureCard | www-cloudbsd-org | 29 | MEDIUM |
| Button primitives | All projects have similar buttons | - | MEDIUM |

#### Must Have
- TypeScript support
- Tailwind CSS styling (not inline styles)
- Dark mode support
- i18n integration via react-i18next
- Proper peer dependencies (@react, @i18next, tailwindcss)

#### Must NOT Have
- No business logic (that's @cloudbsd/hooks)
- No admin-specific components (that's @cloudbsd/ui-admin)
- No API calls (that's the consuming app's responsibility)

#### Exports
```typescript
// Components
export { LanguageSelector } from './components/LanguageSelector';
export { ThemeToggle } from './components/ThemeToggle';
export { FeatureCard } from './components/FeatureCard';
export { GlassCard } from './components/GlassCard';
// Primitives
export { Button, type ButtonProps } from './components/Button';
export { Badge, type BadgeProps } from './components/Badge';
export { Card, type CardProps } from './components/Card';
```

---

### Package 2: @cloudbsd/hooks

**Purpose**: Shared React hooks for cross-project logic reuse

#### Hooks to Extract

| Hook | Source | Priority |
|------|--------|----------|
| useTheme | cloudbsd-ai-www (ThemeContext.tsx), www-cloudbsd-org (inline in Navbar) | HIGH |
| useLanguage | All 3 projects have language selection logic | HIGH |
| useAuth | cloudbsd-ai-www (localStorage.getItem patterns) | HIGH |
| useNotifications | cloudbsd-ai-www (NotificationContext.tsx) | MEDIUM |

#### Must Have
- TypeScript generics where applicable
- Proper cleanup in useEffect
- No UI components (pure logic only)
- Peer dependency on react

#### Must NOT Have
- No UI components (use @cloudbsd/ui for that)
- No API calls directly (use @cloudbsd/api or app's api client)

#### Exports
```typescript
export { useTheme, type ThemeContextValue } from './useTheme';
export { useLanguage, type LanguageOption } from './useLanguage';
export { useAuth, type AuthState } from './useAuth';
export { useNotifications } from './useNotifications';
```

---

### Package 3: @cloudbsd/ui-admin

**Purpose**: Admin panel specific components (cloudbsd-ai-www today, potentially shared later)

#### Components to Extract

| Component | Source | Lines | Priority |
|-----------|--------|-------|----------|
| ResourceList | cloudbsd-ai-www | 671 | HIGH |
| ResourceModal | cloudbsd-ai-www | 206 | HIGH |
| ConfirmationModal | cloudbsd-ai-www | 108 | HIGH |
| ConsoleModal | cloudbsd-ai-www | 145 | MEDIUM |
| CustomPageSizeModal | cloudbsd-ai-www | 98 | MEDIUM |

#### Must Have
- TypeScript support
- Peer dependencies: react, framer-motion, lucide-react
- Props for customization (onSubmit, onDelete, etc.)
- Dark mode support via @cloudbsd/hooks

#### Must NOT Have
- No direct API calls (consuming app passes data or api client)
- No hardcoded API endpoints

---

## Verification Strategy

### QA Policy
Every task includes agent-executed QA:
- Build each package: `npm run build` must pass
- TypeScript check: `tsc --noEmit` must pass
- Lint check: `eslint src --ext .ts,.tsx` must pass (if configured)
- Export verification: all exports must be importable

### Evidence to Capture
- Build output showing successful compilation
- Package.json showing correct dependencies
- TypeScript compilation output

---

## Execution Strategy

### Wave 1: Infrastructure (Start Immediately - all 3 packages can scaffold in parallel)

**Package 1 (@cloudbsd/ui) - Scaffolding**
```
packages/
└── ui/
    ├── src/
    │   ├── components/
    │   │   ├── LanguageSelector/
    │   │   ├── ThemeToggle/
    │   │   ├── Button/
    │   │   ├── Badge/
    │   │   └── Card/
    │   └── index.ts
    ├── package.json
    ├── tsconfig.json
    └── README.md
```

**Package 2 (@cloudbsd/hooks) - Scaffolding**
```
packages/
└── hooks/
    ├── src/
    │   ├── useTheme/
    │   ├── useLanguage/
    │   ├── useAuth/
    │   └── index.ts
    ├── package.json
    ├── tsconfig.json
    └── README.md
```

**Package 3 (@cloudbsd/ui-admin) - Scaffolding**
```
packages/
└── ui-admin/
    ├── src/
    │   ├── components/
    │   │   ├── ResourceList/
    │   │   ├── ResourceModal/
    │   │   ├── ConfirmationModal/
    │   │   ├── ConsoleModal/
    │   │   └── CustomPageSizeModal/
    │   └── index.ts
    ├── package.json
    ├── tsconfig.json
    └── README.md
```

### Wave 2: LanguageSelector First (HIGHEST VALUE - 3 projects need this)

Extract and unify LanguageSelector from www-cloudbsd-org and revytechinc:
1. Read both implementations
2. Identify common props API
3. Create unified component
4. Add to @cloudbsd/ui
5. Update www-cloudbsd-org to use package
6. Update revytechinc to use package

### Wave 3: ThemeToggle + useTheme

Extract ThemeToggle and useTheme hook:
1. Extract useTheme to @cloudbsd/hooks
2. Extract ThemeToggle to @cloudbsd/ui
3. Update www-cloudbsd-org Navbar
4. Update cloudbsd-ai-www Layout.tsx

### Wave 4: Button + Badge primitives

Create base Button and Badge components:
1. Design Button API (variant, size, loading, disabled props)
2. Design Badge API (status colors, size props)
3. Add glass morphism variant

### Wave 5: ResourceList (ui-admin)

Extract the big one - ResourceList.tsx:
1. Analyze dependencies (api, socket, other components)
2. Design clean props API that allows customization
3. Extract to @cloudbsd/ui-admin
4. Update cloudbsd-ai-www VMs, Jails, OCI pages

### Wave 6: ResourceModal + ConfirmationModal

Extract modals:
1. ResourceModal - make API calls configurable via props
2. ConfirmationModal - simpler, just props

### Wave 7: Remaining admin components

- ConsoleModal (depends on xterm)
- CustomPageSizeModal

### Wave 8: useAuth + useLanguage hooks

1. useAuth - wrap localStorage patterns
2. useLanguage - unify language selection

### Wave 9: Final polish

- Update all 3 consuming projects to use packages
- Ensure dark mode works consistently
- Document migration path

---

## Commit Strategy

Each wave should commit:
- `feat(ui): add LanguageSelector component`
- `feat(hooks): add useTheme hook`
- `chore: update cloudbsd-ai-www to use @cloudbsd/ui`
- etc.

---

## Success Criteria

### @cloudbsd/ui ✅ EXTRACTED
- [x] LanguageSelector implemented with variant support (cloudbsd/revy)
- [x] ThemeToggle implemented using @cloudbsd/hooks
- [x] Dark mode support via useTheme hook
- [x] TypeScript compilation clean
- [x] Build produces correct dist/
- [x] Button component with variants (primary, secondary, ghost, danger)
- [x] Badge component with variants (default, success, warning, danger, info)

### @cloudbsd/hooks ✅ EXTRACTED
- [x] useTheme with localStorage persistence
- [x] useAuth with login/logout/setRole
- [x] useLanguage with i18n integration
- [x] No UI code included

### @cloudbsd/ui-admin ✅ EXTRACTED
- [x] ResourceList with callback-based API (onFetch, onAction, onDelete)
- [x] ResourceModal with onSubmit/onUpdate callbacks
- [x] ConfirmationModal with danger/warning/info variants
- [x] ConsoleModal with socket prop
- [x] CustomPageSizeModal

### General
- [x] Packages scaffolded with tsup + TypeScript
- [x] All 3 packages build successfully
- [ ] Nexus 3 publishing (PENDING - user's task)
- [ ] Consuming projects updated to use packages (PENDING - requires Nexus)

### Nexus Publishing Configuration

**Nexus URL:** `https://nexus.cloudbsd.org/repository/npm-private/`

**Publishing credentials:** PENDING - user to create service account for automation

**Setup steps when ready:**
```bash
# Add to ~/.npmrc for each package directory:
echo "@cloudbsd:registry=https://nexus.cloudbsd.org/repository/npm-private/" >> ~/.npmrc

# Publish (once credentials available):
npm publish --registry=https://nexus.cloudbsd.org/repository/npm-private/
```

**Package scopes:**
- `@cloudbsd/ui` - Shared UI components
- `@cloudbsd/hooks` - Shared React hooks
- `@cloudbsd/ui-admin` - Admin-specific components

### Remaining Work
1. User creates automation service account in Nexus
2. User provides credentials (or uses token auth)
3. Publish packages to Nexus: `npm publish --registry=<nexus-url>`
4. Update consuming projects to install from Nexus

### Package Locations
- `@cloudbsd/ui`: `/home/mlapointe/secure/git/cloudbsd-ai-www/packages/ui/`
- `@cloudbsd/hooks`: `/home/mlapointe/secure/git/cloudbsd-ai-www/packages/hooks/`
- `@cloudbsd/ui-admin`: `/home/mlapointe/secure/git/cloudbsd-ai-www/packages/ui-admin/`
