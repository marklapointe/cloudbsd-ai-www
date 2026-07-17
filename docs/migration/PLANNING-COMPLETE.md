# Planning complete — handoff to implementation

> **Date**: 2026-07-16  
> **Branch**: `feat/angular-migration`  
> **Status**: **PLANNING DONE** — implementers may start **W4** (Angular shell + shared components) after reading the index.

---

## What was planned (artifacts)

| Artifact | Path |
|----------|------|
| Agent index | [README.md](./README.md) |
| Product IA | [product-ia-esxi-vsphere-2026-07-16.md](./product-ia-esxi-vsphere-2026-07-16.md) |
| Component catalog | [component-catalog-plan.md](./component-catalog-plan.md) |
| Archive map | [../../diagrams/ARCHIVED.md](../../diagrams/ARCHIVED.md) |
| Mermaid IA | [../../diagrams/architecture/02-product-ia.md](../../diagrams/architecture/02-product-ia.md) |
| Mermaid catalog | [../../diagrams/architecture/03-component-catalog.md](../../diagrams/architecture/03-component-catalog.md) |
| Mermaid system arch | [../../diagrams/architecture/01-system-architecture.md](../../diagrams/architecture/01-system-architecture.md) |
| Mermaid flows | [../../diagrams/flows/](../../diagrams/flows/) `01`–`05` (`04` = MCP registration) |
| Mermaid MCP model | [../../diagrams/architecture/04-mcp-as-plugins.md](../../diagrams/architecture/04-mcp-as-plugins.md) |
| IA SVG examples | `diagrams/screens/140-ia-*.svg` … `144-ia-*.svg` |
| Spine SVG set | `diagrams/screens/150-spine-*.svg` |
| **MCP registry** (extension model; was Plugins) | `diagrams/screens/160-mcp-*.svg` + product IA §3.5 |
| Execution plan | `.sisyphus/plans/angular-migration.md` (methodology updated) |
| UI order | `.sisyphus/drafts/ui-index.md` §8 |

---

## Planning waves status

| Wave | Status | Deliverable |
|------|--------|-------------|
| W0 Catalog | **DONE** | component-catalog-plan.md |
| W1 Archive map | **DONE** | diagrams/ARCHIVED.md |
| W2 Spine SVGs | **DONE** | 150-spine-* + 140-ia-* reference set |
| W3 Mermaid flows | **DONE** | diagrams/flows + architecture |
| W4 Angular shell | **NOT STARTED** | Implementation |
| W5 Domain pages | **NOT STARTED** | Implementation |

---

## Implementation entry (next agent)

1. Read `docs/migration/README.md` authority order.  
2. Build **only** components listed in component-catalog-plan.md **§7**.  
3. Use **150-spine-*** and **140-ia-*** as visual targets for chrome and lists.  
4. Do **not** implement ARCHIVE/DEFER items from ARCHIVED.md.  
5. Prefer shared `ResourceTable` / `EmptyState` / density CSS over per-resource forks.  
6. Management UX: describe → preflight → confirm → execute; view-only is a role.  
7. **MCP is the plugin system** — implement Configure → MCP (`/mcp`), not a separate Plugins product.  
8. Target FreeBSD; no Linux-only assumptions; git author Mark LaPointe \<mark@cloudbsd.org\>.

### Suggested first implementation PR stack

1. `web-new` Angular 20 shell + routing + Tailwind + signals  
2. Auth + frost-out + session cookie client  
3. Layout sidebar (IA groups) + header menus  
4. Shared ResourceTable + EmptyState + ConfirmActionModal  
5. Dashboard + VMs list (first vertical slice with mock or envelope client)  

---

## Explicit non-goals for first implementers

- Regenerating theme/customizer/error SVG directories  
- Permanent view-only product  
- Dual Settings models  
- File manager  
- 15-theme gallery  
- 100% coverage on non-critical code (use ≥80% + 100% auth/preflight/envelope)  

---

## Defaults locked (unless product owner overrides)

- Roles as Users sub-tabs in v1  
- Audit under Observe  
- Network Map as view on Networks  
- Tasks page mandatory  
- Content Library (ISOs/templates) is spine (150-spine-library)  
- Hosts vs Cluster split as IA  
- Account vs Settings vs System split as IA  
- **MCP is the plugin system** — Configure → MCP (`/mcp`); no separate Plugins product  

---

## Author

Mark LaPointe \<mark@cloudbsd.org\>
