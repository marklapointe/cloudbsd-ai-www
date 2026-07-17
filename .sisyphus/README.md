# `.sisyphus/` — local planning store

Tracked and untracked planning artifacts for CloudBSD Admin.

## Start here (agents)

**Primary index (tracked, preferred):**  
[`docs/migration/README.md`](../docs/migration/README.md)

| Need | File |
|------|------|
| Product IA | `docs/migration/product-ia-esxi-vsphere-2026-07-16.md` (canonical) · `drafts/` mirror |
| UI order rules | `drafts/ui-index.md` (incl. Rules #10–12 notes) |
| Execution plan + **Canonical Methodology** | `plans/angular-migration.md` (**Rules #1–#12**) |
| Wire protocol | `plans/WIRE_PROTOCOL.md` |
| Component catalog | `docs/migration/component-catalog-plan.md` |
| HTML mockup kit | `plans/html-mockups/` |
| Data models | `drafts/data-structures.md` |
| Screen deltas | `drafts/ADJUSTMENTS.md` |
| Planning handoff | `docs/migration/PLANNING-COMPLETE.md` |

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
