# MCP server registration / discovery flow

> **2026-07-16**: MCP **is** the plugin system. Legacy “plugin package” discovery is SUPERSEDED.  
> UI: Configure → **MCP** (`/mcp`). Mocks: `screens/160-mcp-*.svg`.

```mermaid
flowchart TD
  Open[Admin opens MCP registry] --> List[GET /api/mcp/servers]
  List --> Table[Render servers + health]
  Table --> Add[Add MCP server wizard]
  Add --> Transport{Transport}
  Transport -->|HTTP / SSE| HttpCfg[URL + auth headers]
  Transport -->|stdio| StdioCfg[command + args + env]
  HttpCfg --> Save[POST /api/mcp/servers]
  StdioCfg --> Save
  Save --> Probe[Probe: list tools / ping]
  Probe -->|fail| Quarantine[Mark unhealthy + ErrorHandlingService]
  Probe -->|ok| Register[Register tools → action/manifest projection]
  Register --> Live[Subscribe StreamEvents mcp.* domain]
  Table --> Toggle[Enable / disable server]
  Toggle --> Save
```

## Notes

- Secrets (headers, env) are stored server-side; UI never echoes full secret values after save.
- Tools may project into menus/actions via backend envelope/manifest — operator mental model remains **MCP registry**, not a separate Plugins product.
- Legacy flow names (`plugin`, `/api/plugins`) in older plan tasks map here.
