# `.sisyphus/` — local planning store

Tracked and untracked planning artifacts for CloudBSD Admin.

## Start here (agents)

**Primary index (tracked, preferred):**  
[`docs/migration/README.md`](../docs/migration/README.md)

| Need | File |
|------|------|
| Product IA | `drafts/product-ia-esxi-vsphere-2026-07-16.md` or `docs/migration/…` |
| UI order rules | `drafts/ui-index.md` |
| Execution plan | `plans/angular-migration.md` |
| Wire protocol | `plans/WIRE_PROTOCOL.md` |
| Data models | `drafts/data-structures.md` |
| Screen deltas | `drafts/ADJUSTMENTS.md` |

## Layout

```
.sisyphus/
  plans/          # Long-form plans (angular-migration, WIRE_PROTOCOL, …)
  drafts/         # Specs, IA, audits, lessons
  notepads/       # Wave learnings
  tools/          # e.g. svg_validate.py
```

## Conflict rule

`docs/migration/README.md` authority order applies.  
`drafts/angular-migration.md` is **historical only**.
