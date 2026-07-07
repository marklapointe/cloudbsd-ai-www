# 11-settings.svg — Detailed Spec

**Target size**: 70-90 KB (largest)
**Viewport**: 1280×800
**View-only**: All save buttons disabled. Read-only banner.

## Layout

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ HEADER (canonical)                                                               │
├──────────────────────────────────────────────────────────────────────────────────┤
│ SETTINGS SIDEBAR (w-60, white bg, slate-200 right border)  │ MAIN                │
│                                                            │                      │
│  General                                                  │  ┌─Section Header──┐│
│  Appearance                                          [active]│ │ Appearance       ││
│  Theme                                                      │ │ Customize how the ││
│  Theme Customizer                                     🔒    │ │ app looks         ││
│  Language                                                   │ └──────────────────┘│
│  Locale                                                     │                      │
│  Notifications                                              │ ┌─Theme subsection─┐│
│  Error Display                                       🔒    │ │ Active: CloudBSD ││
│  Plugins                                             🔒    │ │ [4 theme cards]  ││
│  Users                                                🔒    │ └──────────────────┘│
│  Sessions                                              🔒    │                      │
│  API Keys                                               🔒    │ ┌─Colors───────────┐│
│  Backup                                                       │ │ Primary: [#3b82f6]││
│  Logs                                                          │ │ Accent:  [#10b981]││
│  About                                                         │ │ Surface: [#f8fafc]││
│                                                                │ │ Border:  [sm|md|lg]│
│                                                                │ │ Density: [compact] ││
│                                                                │ └──────────────────┘│
│                                                                │                      │
│                                                                │ ┌─Typography───────┐│
│                                                                │ │ Font: [system-ui▾]││
│                                                                │ │ Size: 14px [─────●]││
│                                                                │ │ Mono:  [SF Mono ▾]││
│                                                                │ │ Line:  [1.5       ]││
│                                                                │ └──────────────────┘│
│                                                                │                      │
│                                                                │ ┌─Layout───────────┐│
│                                                                │ │ Sidebar: [220px] ││
│                                                                │ │ Position:[Left ▾]││
│                                                                │ │ Breadcrumbs [ON] ││
│                                                                │ │ Status bar  [ON] ││
│                                                                │ └──────────────────┘│
│                                                                │                      │
│                                                                │ ┌─Accessibility────┐│
│                                                                │ │ Reduce motion ●  ││
│                                                                │ │ High contrast  ○  ││
│                                                                │ │ Underline links ○││
│                                                                │ │ Focus ring: med ▾││
│                                                                │ │ Screen reader ●  ││
│                                                                │ └──────────────────┘│
│                                                                │                      │
│                                                                │ ┌─Behavior─────────┐│
│                                                                │ │ Auto-refresh:15s││
│                                                                │ │ Confirm actions●││
│                                                                │ │ Restore session●││
│                                                                │ │ Language: [en_US▾]││
│                                                                │ └──────────────────┘│
│                                                                │                      │
│                                                                │ ┌─Footer (read-only)┐│
│                                                                │ │ ⚠ Read-only mode —││
│                                                                │ │   mutations queued││
│                                                                │ │   for milestone 2 ││
│                                                                │ │ [Save (disabled)] ││
│                                                                │ │ [Discard] [Reset] ││
│                                                                │ └──────────────────┘│
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Settings Sections (15)

```
General
Appearance ← active
Theme
Theme Customizer 🔒
Language
Locale
Notifications
Error Display 🔒
Plugins 🔒
Users 🔒
Sessions 🔒
API Keys 🔒
Backup
Logs
About
```

🔒 = admin-only section

## Appearance Section Controls (30+)

### Theme Subsection
- Active theme radio: [CloudBSD ✓] [Dark midnight] [High contrast] [Solarized]
- "Customize theme" button (gray, disabled)

### Colors
- Primary color picker (#3b82f6 blue)
- Accent color picker (#10b981 green)
- Surface color picker (#f8fafc slate-50)
- Border radius select: [none | small | medium ✓ | large | pill]
- Density select: [compact | comfortable ✓ | spacious]

### Typography
- Font family select: [system-ui ✓ | Inter | SF Pro | Roboto | JetBrains Mono]
- Base font size slider: 12 ──●── 18px (current: 14)
- Monospace font select: [SF Mono ✓ | JetBrains Mono | Menlo | Cascadia Code]
- Line height select: [1.4 | 1.5 ✓ | 1.6 | 1.75]

### Layout
- Sidebar width slider: 200 ──●── 320px (current: 220)
- Sidebar position: [Left ✓ | Right]
- Show breadcrumbs: [ON ✓ | OFF]
- Show status bar: [ON ✓ | OFF]
- Compact header: [ON | OFF ✓]

### Accessibility
- Reduce motion: [ON ✓ | OFF]
- High contrast: [ON | OFF ✓]
- Underline links: [ON | OFF ✓]
- Focus ring thickness: [thin | medium ✓ | thick]
- Screen reader announcements: [ON ✓ | OFF]

### Behavior
- Auto-refresh interval slider: 5 ──●── 60s (current: 15)
- Confirm destructive actions: [ON ✓ | OFF]
- Restore last session: [ON ✓ | OFF]
- Language select: [47 options, en_US ✓]

## Read-Only Banner

```
⚠ Read-only mode — mutations queued for milestone 2.
  Backend write actions will be available in v1.1.
```

## Footer Buttons (all visible but Save is disabled)

```
[Save (disabled, opacity-50, cursor-not-allowed)]  [Discard]  [Reset to defaults]
```

## Right Rail Info (small panel)

```
Last modified: 2026-07-06 12:14 UTC
Modified by: mlapointe
Section size: 32 controls
Doc link: /docs/settings/appearance
```

## SVG Skeleton

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" width="1280" height="800" font-family="system-ui, sans-serif">
  <title>CloudBSD Admin — Settings: Appearance</title>
  <foreignObject x="0" y="0" width="1280" height="800">
    <div xmlns="http://www.w3.org/1999/xhtml" class="h-full bg-slate-50 text-slate-900">
      <g id="header">[canonical]</g>
      <div class="flex" style="height: calc(800px - 56px)">
        <g id="sidebar">
          <aside class="w-60 bg-white border-r border-slate-200 p-3 overflow-y-auto">
            <h2 class="text-xs font-bold text-slate-500 uppercase tracking-wide px-3 mb-2">Settings</h2>
            <nav class="space-y-1 text-sm">
              <a class="block px-3 py-2 rounded text-slate-700 hover:bg-slate-50">General</a>
              <a class="block px-3 py-2 rounded bg-blue-50 text-blue-700 font-medium">Appearance</a>
              <a class="block px-3 py-2 rounded text-slate-700 hover:bg-slate-50">Theme</a>
              <a class="block px-3 py-2 rounded text-slate-700 hover:bg-slate-50 flex items-center justify-between">
                <span>Theme Customizer</span>
                <span class="text-xs">🔒</span>
              </a>
              [etc. for all 15 sections]
            </nav>
          </aside>
        </g>
        <g id="content" class="flex-1 p-6 space-y-4 overflow-auto">
          [Theme subsection]
          [Colors]
          [Typography]
          [Layout]
          [Accessibility]
          [Behavior]
          [Footer banner]
          [Footer buttons]
        </g>
      </div>
    </div>
  </foreignObject>
</svg>
```

## Constraints

- ALL Save buttons disabled (opacity-50, cursor-not-allowed)
- 30+ form controls visible
- 15 settings sidebar sections
- 🔒 icons on admin-only sections
- Read-only banner prominent

## Files Referenced

- Existing simple version: `diagrams/screens/11-settings.svg` (8KB)
- Theme ref: `diagrams/themes/01-cloudbsd-revytech.svg`