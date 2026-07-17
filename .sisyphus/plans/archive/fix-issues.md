# Fix Sensible Issues

## TL;DR

> **Quick Summary**: Fix CSS bugs, use real cluster data, resolve license seeding mismatch, and add Volume/Disk Management page.
>
> **Deliverables**:
> - `hero-bg` CSS class added to index.css
> - Old Vite template CSS removed
> - Cyan accent (#00d4ff) applied
> - Cluster.tsx uses real node metrics
> - Demo license and seeding aligned (2 VMs or 3 with updated limit)
> - Volume/Disk Management page at /volumes
>
> **Estimated Effort**: Short
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Wave 1 (CSS fixes) → Wave 2 (Cluster.tsx + Volumes page)

---

## Context

### Original Request
User wants to "make them more sensible" - fix obvious issues that make the demo/app not work correctly.

### Issues Identified

1. **CSS Bugs**:
   - `hero-bg` class referenced in Login.tsx:74, :80 but not defined in index.css
   - Old Vite template CSS at index.css lines 16-23 (colors like `#646cff`)
   - Theme accent doesn't match www-cloudbsd-org (cyan #00d4ff)

2. **Cluster.tsx Hardcoded Values**:
   - RAM progress bar: hardcoded 40% instead of `node.mem_used / node.mem_total`
   - Disk progress bar: hardcoded 25% instead of `node.disk_used / node.disk_total`
   - Health: hardcoded 100%
   - Data is fetched but ignored in calculations

3. **Demo License/Seeding Mismatch**:
   - config.ts: `vms_limit: 2`
   - db.ts seeds 3 VMs: web-server, db-server, win-dev-box
   - Causes immediate license warning on demo

4. **Missing Volume/Disk Management Page**:
   - FreeBSD has disk management (geom, zpool, etc.)
   - No /volumes route exists
   - Original plan mentioned it but it was never created

---

## Work Objectives

### Core Objective
Make the demo sensible - working CSS, real data calculations, aligned limits, complete feature set.

### Concrete Deliverables
- [ ] Login page renders background correctly (hero-bg CSS)
- [ ] Theme uses cyan accent matching www-cloudbsd-org
- [ ] Cluster page shows real node metrics in progress bars
- [ ] Demo starts without license limit warnings
- [ ] Volume/Disk Management page exists at /volumes

### Definition of Done
- [ ] Login.tsx renders without missing CSS class warning
- [ ] Cluster.tsx RAM/Disk/Health use actual `node.mem_used`, `node.disk_used`, `node.cpu_used`
- [ ] Demo license limits match seeded data
- [ ] Volume page accessible at /volumes

### Must Have
- All CSS classes referenced in components must exist in CSS files
- Real calculations replace hardcoded values
- Demo license limits consistent with seeded resources

### Must NOT Have
- Old Vite template artifacts
- Hardcoded fake values when real data exists
- Missing pages that should exist per original plan

---

## Verification Strategy

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/`.

---

## Execution Strategy

```
Wave 1 (CSS Fixes - Parallel):
├── Task 1: Add hero-bg CSS class to index.css
├── Task 2: Remove old Vite template CSS (lines 16-23)
└── Task 3: Update theme accent to cyan (#00d4ff)

Wave 2 (Data & Features - Parallel):
├── Task 4: Fix Cluster.tsx to use real node metrics
├── Task 5: Fix demo license/seeding mismatch
└── Task 6: Create Volume/Disk Management page
```

### Dependency Matrix

- **1-3**: None - Wave 1 (independent)
- **4**: None - depends only on understanding Cluster.tsx
- **5**: None - depends only on understanding config/db
- **6**: Wave 1 (needs routing/navigation setup)

---

## TODOs

- [ ] 1. Fix index.css - Add hero-bg class, remove Vite template CSS, update cyan accent

  **What to do**:
  - Add `.hero-bg` CSS class to index.css with proper background styling
  - Remove lines 16-23 from index.css (old Vite template `.logo` and related CSS)
  - Update `tailwind.config.js` to add cyan accent color matching www-cloudbsd-org (#00d4ff)

  **Must NOT do**:
  - Don't change any component logic
  - Don't remove other CSS classes

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Reason**: Simple CSS changes, no complex logic

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:
  - `src/pages/Login.tsx:74,80` - Usage of hero-bg class
  - `src/index.css:16-23` - Old Vite template CSS to remove
  - `tailwind.config.js` - Where to add cyan accent

  **Acceptance Criteria**:
  - [ ] Login page renders without CSS class warnings
  - [ ] No old Vite template CSS remains
  - [ ] Cyan accent (#00d4ff) in use

  **QA Scenarios**:

  \`\`\`
  Scenario: Login page background renders correctly
    Tool: Bash
    Preconditions: Dev server running on port 5173
    Steps:
      1. curl -s http://localhost:5173 | grep -o 'hero-bg' | head -1
      2. Check CSS file has .hero-bg defined
    Expected Result: hero-bg class exists in CSS
    Evidence: .sisyphus/evidence/task-1-css.pdf

  Scenario: Old Vite template CSS removed
    Tool: Bash
    Preconditions: index.css exists
    Steps:
      1. grep -n "646cff" src/index.css || echo "NOT FOUND"
    Expected Result: "NOT FOUND" (template color removed)
    Evidence: .sisyphus/evidence/task-1-no-vite-template.txt
  \`\`\`

  **Commit**: YES
  - Message: `fix(ui): remove Vite template CSS, add hero-bg, use cyan accent`
  - Files: `src/index.css`, `tailwind.config.js`

---

- [ ] 2. Fix Cluster.tsx - Use real node metrics for progress bars

  **What to do**:
  - In Cluster.tsx, find where RAM/Disk/Health progress bars are calculated
  - RAM: Calculate from `node.mem_used / node.mem_total` (parse GB values)
  - Disk: Calculate from `node.disk_used / node.disk_total` (parse GB values)
  - Health: Determine based on node status (online=100%, offline=0%, maintenance=50%)
  - The node data is already being fetched - just use it properly

  **Must NOT do**:
  - Don't change the API endpoint or data fetching
  - Don't add fake delays or artificial loading states
  - Don't change the UI layout unnecessarily

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Reason**: Fixing hardcoded values to use existing data

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/pages/Cluster.tsx:397,413,427` - Hardcoded values location (approx)
  - `server/src/db.ts:205-206` - Data seeded: mem_total '32GB', mem_used '8GB', disk_total '500GB', disk_used '120GB'
  - `server/src/db.ts:224-226` - Agent node metrics

  **Acceptance Criteria**:
  - [ ] RAM progress bar shows ~25% (8GB/32GB) for core node
  - [ ] Disk progress bar shows ~24% (120GB/500GB) for core node
  - [ ] Health shows correct value based on node status

  **QA Scenarios**:

  \`\`\`
  Scenario: Cluster page shows real RAM usage
    Tool: Bash
    Preconditions: Dev server running, logged in
    Steps:
      1. curl -s http://localhost:5173/cluster | grep -o 'mem_used'
    Expected Result: mem_used value appears in response
    Evidence: .sisyphus/evidence/task-2-cluster-ram.txt

  Scenario: Verify progress bar calculations use real data
    Tool: grep
    Preconditions: None
    Steps:
      1. grep -n "40%" src/pages/Cluster.tsx
      2. grep -n "25%" src/pages/Cluster.tsx
      3. grep -n "100%" src/pages/Cluster.tsx | grep -v "100" | head -5
    Expected Result: No hardcoded percentage values for progress bars
    Evidence: .sisyphus/evidence/task-2-no-hardcoded.txt
  \`\`\`

  **Commit**: YES
  - Message: `fix(cluster): use real node metrics instead of hardcoded values`
  - Files: `src/pages/Cluster.tsx`

---

- [ ] 3. Fix demo license/seeding mismatch

  **What to do**:
  - Option A: Change config.ts `vms_limit` from 2 to 3 to match seeded VMs
  - Option B: Remove one VM from seed data
  - Decision: Option A (keep all seeded VMs, increase limit to match)

  **Must NOT do**:
  - Don't change any other license logic
  - Don't change the license tier definitions

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Reason**: Simple config value change

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `server/src/config.ts:69` - `vms_limit: 2`
  - `server/src/db.ts:276-289` - Seeded VMs: web-server, db-server, win-dev-box

  **Acceptance Criteria**:
  - [ ] config vms_limit matches number of seeded VMs
  - [ ] Demo starts without immediate license warning

  **QA Scenarios**:

  \`\`\`
  Scenario: License limit matches seeded VMs
    Tool: Bash
    Preconditions: None
    Steps:
      1. grep "vms_limit" server/src/config.ts
      2. grep -c "type: 'vms'" server/src/db.ts
    Expected Result: Values match (3 VMs seeded, vms_limit >= 3)
    Evidence: .sisyphus/evidence/task-3-license-match.txt
  \`\`\`

  **Commit**: YES
  - Message: `fix(demo): align vms_limit with seeded VMs`
  - Files: `server/src/config.ts`

---

- [ ] 4. Create Volume/Disk Management page

  **What to do**:
  - Create new page at `src/pages/Volumes.tsx`
  - Route at /volumes in `src/Router.tsx`
  - Show disk volumes, ZFS pools, geom providers
  - Use existing patterns from other pages (ResourceList-style or card-based)
  - Include: volume name, type (ZFS, UFS, geom), size, used/available, mount point
  - Match existing UI style (dark theme, cards with cyan accents)

  **Must NOT do**:
  - Don't create real FreeBSD disk operations (backend handles this)
  - Don't duplicate functionality from other pages
  - Don't use fake hardcoded data - use API or show "no data" state

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - **Reason**: New page with UI components, follows existing patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: Navigation menu update
  - **Blocked By**: Wave 1 (CSS fixes should be done first)

  **References**:
  - `src/pages/Cluster.tsx` - Similar structure for node metrics
  - `src/pages/NetworkMap.tsx` - Card-based UI pattern
  - `src/Router.tsx` - How to add routes
  - `src/components/Sidebar.tsx` - How to add navigation

  **Acceptance Criteria**:
  - [ ] /volumes route exists
  - [ ] Page renders with volume listing
  - [ ] Navigation includes Volumes link

  **QA Scenarios**:

  \`\`\`
  Scenario: Volume page accessible
    Tool: Bash
    Preconditions: Dev server running
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/volumes
    Expected Result: HTTP 200
    Evidence: .sisyphus/evidence/task-4-volumes-route.txt

  Scenario: Volumes page renders without errors
    Tool: Bash
    Preconditions: Dev server running, logged in
    Steps:
      1. curl -s http://localhost:5173/volumes 2>&1 | grep -i "error" | head -3
    Expected Result: No error in response
    Evidence: .sisyphus/evidence/task-4-volumes-no-error.txt
  \`\`\`

  **Commit**: YES
  - Message: `feat(volumes): add disk volume management page`
  - Files: `src/pages/Volumes.tsx`, `src/Router.tsx`, `src/components/Sidebar.tsx`

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — Verify all issues fixed
- [ ] F2. **Code Quality Review** — No new linting issues
- [ ] F3. **Login Test** — hero-bg renders correctly
- [ ] F4. **Cluster Data Test** — Real metrics show in progress bars

---

## Commit Strategy

Group commits by wave:
- **1**: `fix(ui): remove Vite template CSS, add hero-bg, use cyan accent`
- **2**: `fix(cluster): use real node metrics instead of hardcoded values`
- **3**: `fix(demo): align vms_limit with seeded VMs`
- **4**: `feat(volumes): add disk volume management page`

---

## Success Criteria

- [ ] Login page renders background via hero-bg class
- [ ] Old Vite template CSS (#646cff) no longer present
- [ ] Cluster RAM/Disk progress bars use real node.mem_used, node.disk_used
- [ ] Demo starts without license warnings about VM limits
- [ ] Volume page exists at /volumes with working navigation
