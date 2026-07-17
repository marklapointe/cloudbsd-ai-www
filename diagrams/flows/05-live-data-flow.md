# Live data stream flow

```mermaid
sequenceDiagram
  autonumber
  participant UI as Angular page
  participant WS as Stream gateway
  participant Ag as Host agents

  UI->>WS: subscribe topics for view
  WS->>Ag: fan-out if needed
  Ag-->>WS: metrics / state
  WS-->>UI: StreamEvent envelope
  UI->>UI: Update signals / table rows
  Note over UI: ● live indicator; no full Refresh button
  alt socket dead
    UI->>UI: Show reconnect control
    UI->>WS: resubscribe
  end
```
