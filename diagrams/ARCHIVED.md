# Diagram archive map (planning)

> Generated from `docs/migration/component-catalog-plan.md`.  
> **Do not regenerate or implement** files marked ARCHIVE / DEFER for v1.  
> Canonical mocks: `screens/140-ia-*.svg` … `144-ia-*.svg` plus spine redraws `150-spine-*.svg`.

## Legend

| Tag | Meaning |
|-----|---------|
| ARCHIVE | Keep file for history; not a product requirement |
| DEFER | Valid later; not v1 spine |
| SUPERSEDED | Replaced by named canonical mock |
| MERGE-INTO | Concept lives on another surface |

---

## Screens

| File | Tag | Notes |
|------|-----|-------|
| `11-settings.svg` | SUPERSEDED | Dual Settings model; use `143-ia-settings-cluster.svg` + Account |
| `14-status.svg` | MERGE-INTO | System → Diagnostics |
| `15-nodes.svg` | SUPERSEDED | Use `140-ia-shell-hosts.svg` / `150-spine-hosts.svg` |
| `07-cluster.svg` | SUPERSEDED | Host-table cluster; use `141-ia-cluster-services.svg` |
| `67-cluster-overview.svg` | SUPERSEDED | Same as above |
| `12-login.svg` | MERGE-INTO | Prefer single login path (`51` or redraw `150-spine-login`) |
| `51-login.svg` | REFINE | Canonical login candidate |
| `13-about.svg` / `85-about-page.svg` | MERGE | One About only |
| `16-system-3-stats.svg` | ARCHIVE | Vanity KPIs (themes/locales) |
| `16-system-4-history.svg` | MERGE-INTO | Tasks / Audit filters |
| `60-settings-general.svg` | MERGE-INTO | Settings · identity fields only |
| `61–64` account-ish under settings path | MERGE-INTO | My Account (`142-ia-*`) |
| `63-settings-appearance.svg` | MERGE-INTO | Account · Appearance |
| `64-settings-api-keys.svg` | MERGE-INTO | Account · tokens (personal) vs Access |
| `65-settings-webhooks.svg` | REFINE | Settings · Integrations |
| `66-themes-browser.svg` | DEFER | Post-spine polish |
| `68-monitoring-dashboard.svg` | DEFER/MERGE | Dashboard covers v1 |
| `79-file-manager.svg` | ARCHIVE | Out of spine |
| `80-notifications-preferences.svg` | MERGE-INTO | Account prefs / Notifications |
| `82-help-docs-page.svg` | DEFER | Minimal / external |
| `83-settings-backup-config.svg` | MERGE-INTO | System · Backups |
| `21-theme-import` (modal) | DEFER | — |
| Plan T64 theme/customizer/error regen | CANCEL | Do not regenerate empty dirs for v1 |

## Components

| Files | Tag | Notes |
|-------|-----|-------|
| `24–32` compact-list-* | ARCHIVE | Density CSS |
| `33–41` extra-compact-list-* | ARCHIVE | Density CSS |
| `42–50` empty-list-* | ARCHIVE | EmptyStateComponent |

## Keep / refine (do not archive)

Spine lists, detail panels `19–23`, tab contents `90–111`, add-host `18`, vGPU `17`, chrome menus `88–89`, wizards `102–134`, system backups/updates/exports/audit, plugins, console `78`, preflight `92–93`, IA set `140–144`, spine set `150-*`.

---

## Empty directories (do not populate in v1)

`diagrams/themes/`, `customizer/`, `errors/`, `notifications/`, `loading/`, `mobile/`, `variants/` — leave empty or add README pointing here.
