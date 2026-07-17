# CloudBSD Admin — Planning (single entry)

**Branch:** `feat/angular-migration`  
**Product:** FreeBSD hypervisor control plane (bhyve · jails · OCI · ZFS) — ESXi replacement  

This folder is the **only planning home**. Ignore scattered `.sisyphus` drafts unless linked below.

---

## Start here (5 files)

| # | Document | Role |
|---|----------|------|
| 1 | **[product-ia-esxi-vsphere-2026-07-16.md](./product-ia-esxi-vsphere-2026-07-16.md)** | What we build (IA, scopes, library repos, MCP) |
| 2 | **[rules.md](./rules.md)** | Non-negotiable Rules #1–#14 (UI↔backend only; backend message gateway) |
| 3 | **[component-catalog-plan.md](./component-catalog-plan.md)** | KEEP/MERGE/ARCHIVE + Angular §7 checklist |
| 4 | **[implementation.md](./implementation.md)** | Waves, PR stack, handoff |
| 5 | **[../../.sisyphus/plans/WIRE_PROTOCOL.md](../../.sisyphus/plans/WIRE_PROTOCOL.md)** | Envelope, preflight, stream (interim API contract; OpenAPI still TODO) |

### Visual & interactive

| Asset | Path |
|-------|------|
| Spine / IA SVGs | `diagrams/screens/140-ia-*`, `150-spine-*`, `160-mcp-*` |
| Archive map | [diagrams/ARCHIVED.md](../../diagrams/ARCHIVED.md) |
| Mermaid | `diagrams/architecture/`, `diagrams/flows/` |
| HTML walkthrough kit | `.sisyphus/plans/html-mockups/` |
| UI chrome order | `.sisyphus/drafts/ui-index.md` |

---

## Authority (when something conflicts)

```
product-ia
  → rules.md
  → component-catalog §7
  → WIRE_PROTOCOL (API shapes)
  → ui-index (column/tab order only)
  → SVG / HTML mockups
  → anything under .sisyphus/plans/archive/ or drafts/archive/  (IGNORE)
```

---

## Diagram convention

| Track | Format | Use |
|-------|--------|-----|
| Conceptual | Mermaid in markdown | Architecture, IA, sequences |
| UI mockups | SVG `foreignObject` + **inline styles only** | Screens |
| Walkthroughs | HTML kit under `html-mockups/` | Interactive demos |

No Mermaid inside SVG. No Tailwind classes inside SVG foreignObject.

---

## Status

**Planning: DONE.** Implementation starts at **W4** (Angular shell).  
Details: [implementation.md](./implementation.md).

**OpenAPI:** not in repo yet — backend must publish OpenAPI 3.1; until then WIRE_PROTOCOL is the interim contract. UI never talks past the backend (Rule #13).

---

## What we deleted from the “agent mess”

| Before | After |
|--------|--------|
| 10k-line `angular-migration.md` as living plan | Archived; rules extracted to `rules.md` |
| Triple product-IA copies | **One** file here; drafts/history are pointers |
| Overlapping README / PLANNING-COMPLETE / sisyphus README | This index + `implementation.md` |
| Random plans (`ui-modernization`, `fix-issues`, …) | `.sisyphus/plans/archive/` |

See [ARCHIVE.md](./ARCHIVE.md).

---

## Author

Mark LaPointe \<mark@cloudbsd.org\>
