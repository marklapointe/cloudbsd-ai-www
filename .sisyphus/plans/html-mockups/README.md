# HTML mockup experiment (tabs + modals)

Browsable HTML for CloudBSD Admin spine pages, **full tab panels**, and **popup modals**.

## View

```bash
xdg-open index.html
# or
python3 -m http.server 8765
```

## Behavior

- **Tabs**: click tab labels; content panels switch (hash updated when possible).
- **Modals**: action links/buttons use `data-open-modal="m-…"`. Esc or backdrop closes.
- **Shared modal library**: injected on every shell page (stop VM, drain host, MCP edit, etc.).

## Layout

| Path | Contents |
|------|----------|
| `pages/` | Spine screens with working tabs |
| `detail/` | VM/Host/Container/Jail/Volume — all tabs |
| `modals/` | Gallery pages auto-opening each modal |
| `components/` | Shared building blocks |
| `wizards/` | Multi-step wizards as tab steppers |
| `generate.py` | Source of truth — regenerate overwrites HTML |

## Regenerate

```bash
python3 generate.py
```
