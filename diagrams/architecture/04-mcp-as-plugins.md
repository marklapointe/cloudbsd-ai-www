# MCP is the plugin system

> Product decision 2026-07-16: **no separate “Plugins” product.**  
> Operators register **MCP servers**; tools extend the control plane.

## Mental model

```mermaid
flowchart LR
  Op[Operator] --> UI[Admin UI /mcp]
  UI --> Reg[MCP registry API]
  Reg --> S1[HTTP MCP e.g. Honcho]
  Reg --> S2[SSE MCP]
  Reg --> S3[stdio MCP host sidecar]
  S1 --> T1[tools]
  S2 --> T2[tools]
  S3 --> T3[tools]
  T1 --> Act[CloudBSD actions / menus]
  T2 --> Act
  T3 --> Act
```

## Surfaces

```mermaid
flowchart TB
  List[MCP list · enable/disable/probe]
  Add[Add wizard · HTTP / SSE / stdio]
  Detail[Server detail · tools · secrets masked]
  List --> Detail
  List --> Add
  Add --> List
```

## SVG mocks

| File | Purpose |
|------|---------|
| `../screens/160-mcp-registry.svg` | Registry list |
| `../screens/161-mcp-server-detail.svg` | Detail + tools |
| `../screens/162-mcp-add-wizard.svg` | Add server |

Legacy `17-plugins`, `81`, `131–133` → SUPERSEDED (see `../ARCHIVED.md`).
