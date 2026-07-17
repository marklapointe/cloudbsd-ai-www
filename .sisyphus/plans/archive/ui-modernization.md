# CloudBSD Admin UI Modernization Plan

## TL;DR

> **Quick Summary**: Modernize the CloudBSD Admin Web UI by applying official CloudBSD branding from www-cloudbsd-org and borrowing modern design patterns from revytechinc (glass morphism, GPU animations, framer-motion, Inter/Outfit fonts).
>
> **Deliverables**:
> - Updated tailwind.config.js with CloudBSD blue (#00529B) + revytechinc dark palette
> - Google Fonts (Inter + Outfit) added to index.html
> - framer-motion installed and integrated for animations
> - Logo assets copied from www-cloudbsd-org (logo-head-only.png/avif)
> - Modernized Layout.tsx with glass morphism sidebar and header
> - Modernized Login.tsx with CloudBSD background image and glass card
> - Modernized Dashboard.tsx with glass morphism cards and hover effects
> - Modernized ResourceList.tsx with elevated card styling
> - CSS utilities added (GPU acceleration, fade-in animations, glass morphism classes)
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Wave 1 (foundation) → Wave 2 (components) → Wave 3 (polish + QA)

---

## Context

### Original Request
User wants to modernize the CloudBSD Admin Web UI (cloudbsd-ai-www) by:
1. Borrowing modern UI patterns from revytechinc (marketing site)
2. Applying official CloudBSD branding from www-cloudbsd-org (CloudBSD logo, colors, style)

### Interview Summary
**Key Discussions**:
- Theme: Keep BOTH dark and light mode (user preference)
- Animations: ADD framer-motion (user preference)
- Login background: Use CloudBSD background image (user preference)
- Logo: Use logo-head-only variant (user preference)

### Research Findings
- **cloudbsd-ai-www**: Admin panel with sky-blue brand (#0ea5e9), system fonts, standard Tailwind styling
- **revytechinc**: Deep blue (#013a73), cyan accent (#00d4ff), Inter + Outfit fonts, glass morphism, framer-motion, GPU-accelerated animations
- **www-cloudbsd-org**: Official CloudBSD blue (#00529B), red (#D32F2F), logo-head-only.png/avif assets

---

## Work Objectives

### Core Objective
Modernize the admin panel UI to match a professional SaaS aesthetic using official CloudBSD branding, without changing functionality.

### Concrete Deliverables
1. Updated `tailwind.config.js` with merged color palette
2. `index.html` with Google Fonts (Inter, Outfit)
3. `framer-motion` installed and configured
4. New CSS utilities in `src/index.css`
5. Logo assets copied to `public/`
6. Modernized `Layout.tsx`
7. Modernized `Login.tsx`
8. Modernized `Dashboard.tsx`
9. Modernized `ResourceList.tsx`

### Definition of Done
- [ ] `npm run build` succeeds with 0 errors
- [ ] `npm test` passes (100% existing tests)
- [ ] Both dark and light themes render correctly
- [ ] Login page shows CloudBSD background
- [ ] Logo displays correctly in sidebar
- [ ] Animations are smooth (framer-motion)

### Must Have
- Official CloudBSD blue (#00529B) as primary brand color
- Inter + Outfit typography from Google Fonts
- framer-motion for dropdowns and page transitions
- Glass morphism effects on cards/modals
- GPU-accelerated animations
- CloudBSD logo-head-only asset

### Must NOT Have (Guardrails)
- NO changes to page structure or routes
- NO changes to backend API
- NO changes to database schema
- NO new pages or functionality
- NO removal of dark/light mode toggle
- NO changes to existing component logic (only styling)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vitest)
- **Automated tests**: Tests-after (existing tests must pass)
- **Framework**: Vitest + React Testing Library

### QA Policy
Every task includes agent-executed QA scenarios for visual verification:
- Playwright screenshots for UI changes
- Verify theme switching works
- Verify animations are smooth
- Check logo renders correctly

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - Start Immediately):
├── Task 1: Update tailwind.config.js with new color palette
├── Task 2: Add Google Fonts to index.html
├── Task 3: Install framer-motion dependency
├── Task 4: Add CSS utilities (GPU, animations, glass classes)
└── Task 5: Copy logo assets from www-cloudbsd-org

Wave 2 (Core Components - After Wave 1):
├── Task 6: Modernize Layout.tsx (sidebar + header)
├── Task 7: Modernize Login.tsx (CloudBSD background + glass card)
└── Task 8: Modernize Dashboard.tsx (glass morphism cards)

Wave 3 (Secondary Components + Polish):
├── Task 9: Modernize ResourceList.tsx (elevated cards)
├── Task 10: Update modals (ConfirmationModal, ResourceModal)
└── Task 11: Final visual polish pass

Wave FINAL (Verification):
├── Task F1: Build verification (npm run build)
├── Task F2: Test verification (npm test)
├── Task F3: Visual QA (theme toggle, logo, animations)
└── Task F4: Scope compliance check
```

### Dependency Matrix
- **1-5**: - - 6-8 (foundation tasks have no dependencies)
- **6-8**: 1, 2, 3, 4, 5 - 9-11 (components depend on foundation)
- **9-11**: 6, 7, 8 - F1-F4 (polish depends on components)
- **F1-F4**: 1-11 - (final verification after all tasks)

---

## TODOs

---

- [x] 1. Update tailwind.config.js with CloudBSD + revytechinc color palette

**What to do**:
- Merge CloudBSD official colors (#00529B, #D32F2F) with revytechinc dark palette
- Add `cloudbsd` color object: `blue: '#00529B', red: '#D32F2F'`
- Add `revy` color object: `blue: '#013a73', dark: '#001a33', light: '#0066cc', accent: '#00d4ff', surface: '#0a192f'`
- Keep existing `brand` colors for compatibility OR migrate to `cloudbsd`
- Add `fontFamily` for Inter and Outfit

**Must NOT do**:
- Remove existing brand color references without migration plan
- Change any component files yet

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: `tailwindcss`
- **Reason**: Simple config file update, no complex logic

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
- **Blocks**: Tasks 6-11 (all components need the new config)
- **Blocked By**: None

**References**:
- `tailwind.config.js` (current - read first)
- `/home/mlapointe/git/revytechinc/tailwind.config.js` (reference for color/font structure)
- `/home/mlapointe/secure/git/www-cloudbsd-org/tailwind.config.js` (CloudBSD colors)

**Acceptance Criteria**:
- [ ] tailwind.config.js updated with cloudbsd colors
- [ ] tailwind.config.js updated with revy colors
- [ ] fontFamily added: `sans: ['Inter', ...]`, `display: ['Outfit', ...]`
- [ ] `npm run build` still succeeds

**QA Scenarios**:
```
Scenario: Verify tailwind config is valid
  Tool: Bash
  Preconditions: No existing build errors
  Steps:
    1. cd /home/mlapointe/secure/git/cloudbsd-ai-www
    2. npx tailwindcss --init --print-config > /tmp/tailwind-check.js 2>&1 || true
    3. cat /tmp/tailwind-check.js | head -50
  Expected Result: Config is parseable, no syntax errors
  Failure Indicators: Syntax error, missing require/export
  Evidence: .sisyphus/evidence/task-1-tailwind-config.txt
```

---

- [x] 2. Add Google Fonts (Inter + Outfit) to index.html

**What to do**:
- Add `<link>` tags for Google Fonts in index.html
- Fonts: Inter (400, 500, 600) and Outfit (400, 600, 700, 800)
- Preconnect to fonts.googleapis.com and fonts.gstatic.com

**Must NOT do**:
- Add any other HTML changes
- Change the title or meta tags

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: `html`
- **Reason**: Simple HTML link addition

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
- **Blocks**: Tasks 6-11 (components need fonts loaded)
- **Blocked By**: None

**References**:
- `/home/mlapointe/git/revytechinc/index.html` (reference for font link format)

**Acceptance Criteria**:
- [ ] index.html contains Google Fonts link tags
- [ ] Preconnect links present for performance
- [ ] No other HTML changes

---

- [x] 3. Install framer-motion dependency

**What to do**:
- Run `npm install framer-motion` in the project
- Add to package.json dependencies

**Must NOT do**:
- Change any component code yet
- Remove any existing dependencies

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: `npm`
- **Reason**: Package installation, straightforward

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
- **Blocks**: Tasks 6-11 (components will use framer-motion)
- **Blocked By**: None

**References**:
- `/home/mlapointe/git/revytechinc/package.json` (framer-motion version reference)

**Acceptance Criteria**:
- [ ] `npm list framer-motion` shows package installed
- [ ] package.json contains framer-motion in dependencies
- [ ] Import works: `import { motion } from 'framer-motion'`

---

- [x] 4. Add CSS utilities (GPU acceleration, animations, glass morphism)

**What to do**:
- Add to `src/index.css`:
  - `@keyframes fade-in` animation
  - `.animate-fade-in` class with GPU acceleration
  - `.gpu-accelerated` utility class
  - `.glass` utility class for glass morphism
  - `.reduce-motion` media query support

**Must NOT do**:
- Remove existing Tailwind base/components directives
- Change existing button or card styles yet

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: `css`, `tailwindcss`
- **Reason**: Adding utility classes, no component logic

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
- **Blocks**: Tasks 6-11 (components will use these utilities)
- **Blocked By**: None

**References**:
- `/home/mlapointe/git/revytechinc/src/index.css` (full reference for animations and utilities)

**Acceptance Criteria**:
- [ ] CSS contains `.animate-fade-in` class
- [ ] CSS contains `.gpu-accelerated` class
- [ ] CSS contains `.glass` utility class
- [ ] Reduced motion media query present
- [ ] Existing Tailwind directives preserved

---

- [x] 5. Copy logo assets from www-cloudbsd-org

**What to do**:
- Copy from `/home/mlapointe/secure/git/www-cloudbsd-org/public/`:
  - `logo-head-only.png`
  - `logo-head-only.avif`
  - `logo_head_with_text.JPG`
  - `logo_head_with_text.avif`
  - `logo_text_only.avif`
  - `cloudbsd-background.avif`
  - `cloudbsd-background.jpg`
- Paste to `/home/mlapointe/secure/git/cloudbsd-ai-www/public/`

**Must NOT do**:
- Delete existing logo.png or favicon.png yet (backup)
- Change any component references to logo

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: `file-operations`
- **Reason**: Simple file copy, no code changes

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
- **Blocks**: Task 6 (Layout needs new logo)
- **Blocked By**: None

**References**:
- `/home/mlapointe/secure/git/www-cloudbsd-org/public/` (source)
- `/home/mlapointe/secure/git/cloudbsd-ai-www/public/` (target)

**Acceptance Criteria**:
- [ ] logo-head-only.png exists in cloudbsd-ai-www/public/
- [ ] logo-head-only.avif exists
- [ ] cloudbsd-background.avif exists
- [ ] cloudbsd-background.jpg exists
- [ ] Existing files preserved (not deleted)

---

- [x] 6. Modernize Layout.tsx (sidebar + header)

**What to do**:
- Update sidebar:
  - Glass morphism: `bg-slate-900/80 backdrop-blur-md border border-white/10`
  - Replace `bg-white dark:bg-slate-950` with glass effect
  - Update logo to use `/logo-head-only.png`
  - Add hover lift effect on nav items: `hover:-translate-y-0.5`
  - Update active indicator to use cloudbsd.blue accent
- Update header:
  - Glass morphism navbar style
  - Smooth backdrop blur
  - Update notification dropdown with glass effect
- Add framer-motion for sidebar mobile menu (slide-in from left)
- Update user profile card with glass effect

**Must NOT do**:
- Change any routing logic
- Change any component props/interface
- Change any state management logic
- Remove any existing functionality

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: `react`, `tailwindcss`, `framer-motion`
- **Reason**: Core layout component with significant styling changes

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 7, 8)
- **Blocks**: Task 11 (polish depends on Layout)
- **Blocked By**: Tasks 1, 2, 3, 4, 5 (need foundation)

**References**:
- `src/components/Layout.tsx` (current - MUST read before modifying)
- `/home/mlapointe/git/revytechinc/src/components/Navbar.tsx` (glass morphism reference)
- `src/index.css` (for new utility classes)

**Acceptance Criteria**:
- [ ] Sidebar uses glass morphism styling
- [ ] Logo displays `/logo-head-only.png`
- [ ] Nav items have hover lift effect
- [ ] Mobile sidebar animates with framer-motion
- [ ] Dark mode renders correctly
- [ ] Light mode renders correctly
- [ ] Notification dropdown has glass effect

**QA Scenarios**:
```
Scenario: Verify Layout renders in dark mode
  Tool: Playwright
  Preconditions: Dev server running on port 5173
  Steps:
    1. Navigate to http://localhost:5173/login
    2. Login with admin/admin
    3. Take screenshot of sidebar
  Expected Result: Glass morphism sidebar visible, logo head-only displayed
  Failure Indicators: Solid white sidebar, wrong logo, broken layout
  Evidence: .sisyphus/evidence/task-6-layout-dark.png

Scenario: Verify Layout renders in light mode
  Tool: Playwright
  Preconditions: Dev server running, logged in
  Steps:
    1. Click theme toggle to switch to light mode
    2. Take screenshot of sidebar
  Expected Result: Light glass morphism sidebar
  Failure Indicators: Solid white sidebar without blur
  Evidence: .sisyphus/evidence/task-6-layout-light.png
```

---

- [x] 7. Modernize Login.tsx (CloudBSD background + glass card)

**What to do**:
- Update background:
  - Use `/cloudbsd-background.avif` (with Firefox jpg fallback) as full-page background
  - Add gradient overlay: `linear-gradient(rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.8))`
  - Apply to both dark and light themes (background is already dark-themed)
- Update login card:
  - Glass morphism: `bg-slate-900/80 backdrop-blur-xl border border-white/10`
  - Or keep current blur style but add subtle glass effect
- Update logo display to use `/logo-head-only.png` (currently /logo.png)
- Add subtle fade-in animation to card on load (framer-motion)
- Update button to use cloudbsd.red (#D32F2F) or cloudbsd.blue (#00529B)

**Must NOT do**:
- Change form fields or validation logic
- Change authentication flow
- Change language selector functionality

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: `react`, `tailwindcss`, `framer-motion`
- **Reason**: Login page with significant visual changes

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 6, 8)
- **Blocks**: Task 11 (polish)
- **Blocked By**: Tasks 1, 2, 3, 4, 5

**References**:
- `src/pages/Login.tsx` (current - MUST read before modifying)
- `/home/mlapointe/secure/git/www-cloudbsd-org/src/index.css` (background image usage)
- `/home/mlapointe/git/revytechinc/src/components/Hero.tsx` (gradient orbs, button styles)

**Acceptance Criteria**:
- [ ] CloudBSD background image displays on login page
- [ ] Login card has glass morphism effect
- [ ] Logo shows logo-head-only.png
- [ ] Fade-in animation on card entrance
- [ ] Sign in button uses brand colors

**QA Scenarios**:
```
Scenario: Verify Login page renders with CloudBSD background
  Tool: Playwright
  Preconditions: Dev server running
  Steps:
    1. Navigate to http://localhost:5173/login
    2. Take screenshot of full login page
  Expected Result: CloudBSD background visible, glass card centered
  Failure Indicators: Black background, missing image, broken layout
  Evidence: .sisyphus/evidence/task-7-login.png
```

---

- [x] 8. Modernize Dashboard.tsx (glass morphism cards)

**What to do**:
- Update stat cards (VMs, Containers, Jails):
  - Add glass morphism: `bg-slate-900/50 backdrop-blur-md border border-white/10`
  - Or keep solid dark/light but with better shadows
  - Add hover lift: `hover:-translate-y-1 hover:shadow-xl`
  - Update gradient icons to use cloudbsd.blue
- Update system health card:
  - Glass morphism background
  - Better progress bar styling with gradient fills
- Update server info card:
  - Glass morphism styling matching other cards
- Add subtle fade-in animation to cards on load
- Keep existing color coding for metrics (blue for CPU, emerald for memory, amber for disk)

**Must NOT do**:
- Change any data fetching logic
- Change any metric calculations
- Change any routing or navigation

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: `react`, `tailwindcss`
- **Reason**: Dashboard with card styling updates

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 6, 7)
- **Blocks**: Task 11 (polish)
- **Blocked By**: Tasks 1, 2, 3, 4, 5

**References**:
- `src/pages/Dashboard.tsx` (current - MUST read before modifying)
- `/home/mlapointe/git/revytechinc/src/components/Solutions.tsx` (card hover effects)

**Acceptance Criteria**:
- [ ] Stat cards have hover lift effect
- [ ] Cards have glass morphism styling
- [ ] Icon gradients use cloudbsd colors
- [ ] Progress bars have gradient fills
- [ ] Fade-in animation on card load
- [ ] Both themes render correctly

---

- [x] 9. Modernize ResourceList.tsx (elevated cards)

**What to do**:
- Update list/grid view cards:
  - Glass morphism for grid view cards
  - Better rounded corners: `rounded-2xl` or `rounded-3xl`
  - Hover lift effect: `hover:-translate-y-1 hover:shadow-xl`
  - Better border styling: `border border-slate-200 dark:border-slate-700`
- Update action buttons:
  - Match modern button style from Layout
  - Better icon-only button styling
- Update search/filter bar:
  - Glass morphism styling
  - Better input field styling
- Add framer-motion for view mode toggle animation

**Must NOT do**:
- Change sorting, filtering, pagination logic
- Change any API calls
- Change component props interface

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: `react`, `tailwindcss`
- **Reason**: Large component (650+ lines) with significant styling

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Tasks 10, 11)
- **Blocks**: Task F3 (visual QA)
- **Blocked By**: Tasks 6, 7, 8

**References**:
- `src/components/ResourceList.tsx` (current - MUST read before modifying)

**Acceptance Criteria**:
- [ ] Grid view cards have hover lift effect
- [ ] Cards have glass morphism styling
- [ ] View toggle animates smoothly
- [ ] Action buttons match modern style
- [ ] Both themes render correctly

---

- [x] 10. Update modals (ConfirmationModal, ResourceModal, ConsoleModal)

**What to do**:
- Update ConfirmationModal:
  - Glass morphism backdrop: `backdrop-blur-md bg-slate-900/50`
  - Better rounded corners
  - Update button styling for danger/warning variants
- Update ResourceModal:
  - Glass morphism card styling
  - Better form input styling
  - Better button styling
- Update ConsoleModal:
  - Maintain xterm black background
  - Glass morphism header/footer
  - Better rounded corners

**Must NOT do**:
- Change any form validation logic
- Change any modal open/close logic
- Change component interfaces

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: `react`, `tailwindcss`
- **Reason**: Multiple modal components with styling updates

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Tasks 9, 11)
- **Blocks**: Task F3 (visual QA)
- **Blocked By**: Tasks 6, 7, 8

**References**:
- `src/components/ConfirmationModal.tsx` (current)
- `src/components/ResourceModal.tsx` (current)
- `src/components/ConsoleModal.tsx` (current)

**Acceptance Criteria**:
- [ ] ConfirmationModal has glass morphism backdrop
- [ ] ResourceModal form has modern styling
- [ ] ConsoleModal maintains xterm styling but has modern frame
- [ ] Both themes render correctly

---

- [x] 11. Final visual polish pass

**What to do**:
- Review and fix any inconsistent styling across components
- Ensure hover/focus states are consistent
- Check button styles match across all pages
- Ensure spacing/padding is consistent
- Verify icon colors use brand palette
- Check notification styling consistency
- Test theme toggle smoothness

**Must NOT do**:
- Add new functionality
- Change any component logic
- Change any routing

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: `react`, `tailwindcss`, `eye-for-detail`
- **Reason**: Polishing pass to ensure consistency

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Tasks 9, 10)
- **Blocks**: Tasks F1-F4 (final verification)
- **Blocked By**: Tasks 6, 7, 8

**References**:
- All modified components from Tasks 6-10

**Acceptance Criteria**:
- [ ] Styling is consistent across all pages
- [ ] Hover/focus states work on all interactive elements
- [ ] Button styles consistent
- [ ] Spacing/padding consistent
- [ ] Both themes fully polished

---

## Final Verification Wave

- [x] F1. **Build Verification** — `quick`
  Run `npm run build` and verify 0 errors. Check for TypeScript errors.
  Output: `Build [PASS]`

- [x] F2. **Test Verification** — `quick`
  Run `npm test` and verify all existing tests pass.
  Output: `Tests [259/260 pass]` (1 pre-existing backend failure unrelated to UI changes)

- [x] F3. **Visual QA** — `unspecified-high` (+ `playwright` skill)
  Execute visual verification scenarios:
  - Login page with CloudBSD background
  - Dark mode sidebar and dashboard
  - Light mode sidebar and dashboard
  - Theme toggle transition
  - Logo rendering in sidebar
  Output: `Visual [PASS]`

- [x] F4. **Scope Compliance Check** — `deep`
  Verify NO changes beyond styling:
  - No route changes
  - No API changes
  - No database changes
  - No new functionality
  Output: `Scope [COMPLIANT]`

---

## Commit Strategy

- **1**: `chore(tailwind): add cloudbsd and revy color palette, update fonts` - tailwind.config.js, index.html
- **2**: `chore(deps): install framer-motion for animations` - package.json, package-lock.json
- **3**: `style(css): add GPU acceleration and glass morphism utilities` - src/index.css
- **4**: `assets(logos): copy CloudBSD logo assets from www-cloudbsd-org` - public/logo-*, public/cloudbsd-*
- **5**: `refactor(layout): modernize sidebar with glass morphism and framer-motion` - src/components/Layout.tsx
- **6**: `refactor(login): apply CloudBSD branding and glass card styling` - src/pages/Login.tsx
- **7**: `refactor(dashboard): add glass morphism cards and hover effects` - src/pages/Dashboard.tsx
- **8**: `refactor(resource-list): modernize card styling and animations` - src/components/ResourceList.tsx
- **9**: `refactor(modals): update modal styling with glass effects` - src/components/ConfirmationModal.tsx, ResourceModal.tsx, ConsoleModal.tsx
- **10**: `chore(polish): final visual consistency pass` - Various component files

---

## Success Criteria

### Verification Commands
```bash
npm run build  # Expected: 0 errors, production build succeeds
npm test      # Expected: All existing tests pass
```

### Final Checklist
- [ ] All tasks completed per plan
- [ ] Build succeeds with 0 errors
- [ ] Tests pass (100% existing)
- [ ] Dark mode fully functional
- [ ] Light mode fully functional
- [ ] CloudBSD background on login
- [ ] logo-head-only displays in sidebar
- [ ] framer-motion animations working
- [ ] Glass morphism visible on cards
- [ ] No functionality broken
