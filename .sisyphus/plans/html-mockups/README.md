# HTML mockup experiment

Browsable HTML mockups for CloudBSD Admin product spine pages and shared components.

## Location

`.sisyphus/plans/html-mockups/`

## View

Open `index.html` in a browser (double-click or `python3 -m http.server` from this directory).

## Layout

| Path | Contents |
|------|----------|
| `pages/` | Spine screens (Dashboard, VMs, Hosts, MCP, Settings, System, …) |
| `detail/` | Resource detail shells (VM, Host, Container, Jail, Volume) |
| `components/` | Shared building blocks (ResourceTable, EmptyState, …) |
| `modals/` | Confirm, frost-out, create dialogs |
| `wizards/` | Create VM/container/jail, MCP add, onboarding |
| `assets/` | Shared CSS + tiny JS |

## Product rules baked in

- **MCP is the plugin system** (`pages/mcp.html`, `wizards/mcp-add.html`)
- Account vs Settings vs System split
- Hosts inventory vs Cluster services
- Management UX: describe → preflight → confirm
- Live stream indicator; no Refresh chrome on resource pages

## Regenerate

```bash
python3 generate.py
```

Edits to generated HTML are overwritten; change `generate.py` or hand-tweak specific files and stop regenerating those.

## Authority

1. `docs/migration/product-ia-esxi-vsphere-2026-07-16.md`
2. `docs/migration/component-catalog-plan.md`
3. SVG Track 2 under `diagrams/screens/`
4. This HTML kit (interactive experiment)

## Not in scope

Production Angular, real APIs, theme customizer gallery, file manager.
