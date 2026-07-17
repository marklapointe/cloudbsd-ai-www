# Component catalog (Mermaid)

> Companion to `docs/migration/component-catalog-plan.md`.  
> **Planning only** — defines what is allowed before Angular implementation.

## Canonical vs archive volume

```mermaid
pie title SVG inventory treatment (planning target)
  "Spine KEEP/REFINE" : 35
  "MERGE into spine" : 40
  "ARCHIVE/DEFER" : 94
```

*Approximate counts from ~169 SVGs; exact triage tables live in the catalog plan.*

## Shared components replace SVG sprawl

```mermaid
flowchart LR
  subgraph before [Previous agent sprawl]
    C1[9 empty-list SVGs]
    C2[18 density list SVGs]
    C3[N resource tables]
  end

  subgraph after [Sane v1]
    E[EmptyStateComponent]
    D[DensityService + CSS]
    T[ResourceTableComponent]
  end

  C1 --> E
  C2 --> D
  C3 --> T
```

## Implementation order after W0 approval

```mermaid
flowchart TD
  A[W0 Approve catalog] --> B[W1 ARCHIVED.md]
  B --> C[W2 Redraw spine SVGs]
  C --> D[W3 Mermaid flows]
  D --> E[W4 Angular shell + shared]
  E --> F[W5 Domain pages]
```
