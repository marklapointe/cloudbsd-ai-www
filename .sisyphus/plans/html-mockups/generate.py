#!/usr/bin/env python3
"""Generate CloudBSD Admin HTML mockups under this directory.

Experiment kit for product IA spine + shared components.
Run: python3 generate.py
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
ASSETS = "../assets"  # relative from pages/, components/, etc.

NAV = [
    ("Workload", [
        ("dashboard", "Dashboard", "dashboard.html"),
        ("vms", "Virtual Machines", "vms.html"),
        ("containers", "Containers", "containers.html"),
        ("jails", "Jails", "jails.html"),
        ("storage", "Storage", "storage.html"),
        ("networks", "Networks", "networks.html"),
        ("hosts", "Hosts", "hosts.html"),
        ("cluster", "Cluster", "cluster.html"),
        ("tasks", "Tasks", "tasks.html"),
        ("library", "Library", "library.html"),
    ]),
    ("Access", [
        ("users", "Users", "users.html"),
        ("roles", "Roles", "roles.html"),
    ]),
    ("Observe", [
        ("logs", "Logs", "logs.html"),
        ("notifications", "Notifications", "notifications.html"),
        ("audit", "Audit", "audit.html"),
    ]),
    ("Configure", [
        ("settings", "Settings", "settings.html"),
        ("mcp", "MCP", "mcp.html"),
    ]),
    ("Operate", [
        ("system", "System", "system.html"),
        ("about", "About", "about.html"),
    ]),
]


def sidebar_html(active: str | None, rel: str = "pages/") -> str:
    parts = []
    for group, items in NAV:
        parts.append(f'<div class="nav-group">{group}</div><nav>')
        for nid, label, href in items:
            cls_attr = ' class="active"' if nid == active else ""
            if rel.startswith("../"):
                link = f"../pages/{href}"
            elif rel == "":
                link = f"pages/{href}"
            else:
                link = href
            parts.append(
                f'<a href="{link}" data-id="{nid}"{cls_attr}>'
                f"<span>{label}</span></a>"
            )
        parts.append("</nav>")
    parts.append(
        '<div class="sidebar-footer"><div>Host: prod-node-01</div>'
        "<div>Uptime: 14d 02:11</div></div>"
    )
    return "\n".join(parts)


def shell(
    title: str,
    body: str,
    *,
    active: str | None = None,
    bare: bool = False,
    depth: str = "pages",
    extra_head: str = "",
) -> str:
    """depth: pages | components | modals | wizards | detail | root"""
    if depth == "root":
        css = "assets/mockup.css"
        js = "assets/mockup.js"
        nav_rel = ""
        index = "index.html"
    elif depth == "pages":
        css = "../assets/mockup.css"
        js = "../assets/mockup.js"
        nav_rel = "pages"
        index = "../index.html"
    else:
        css = "../assets/mockup.css"
        js = "../assets/mockup.js"
        nav_rel = "../pages/"
        index = "../index.html"

    if bare:
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>CloudBSD Admin — {title}</title>
  <link rel="stylesheet" href="{css}"/>
  {extra_head}
</head>
<body data-nav="">
{body}
<script src="{js}"></script>
</body>
</html>
"""

    side = sidebar_html(active, rel=nav_rel)
    # fix sidebar links for non-pages
    if depth != "pages" and depth != "root":
        side = sidebar_html(active, rel="../pages/")
    elif depth == "root":
        side = sidebar_html(active, rel="")
        # special: rewrite for root index is not used with shell usually

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>CloudBSD Admin — {title}</title>
  <link rel="stylesheet" href="{css}"/>
  {extra_head}
</head>
<body data-nav="{active or ''}">
<div class="app">
  <header class="header">
    <div class="logo">C</div>
    <span class="brand">CloudBSD Admin</span>
    <span class="host-chip">prod-node-01.local</span>
    <div class="header-right">
      <a href="{index}" style="font-size:11px;color:var(--muted)">Mockup index</a>
      <span class="live">● live</span>
      <select style="padding:3px 6px;font-size:11px;border:1px solid #cbd5e1;border-radius:5px">
        <option>UTC</option>
      </select>
      <div class="avatar" title="My Account">M</div>
    </div>
  </header>
  <div class="body">
    <aside class="sidebar">
{side}
    </aside>
    <main class="content">
{body}
      <p class="mock-note">HTML mockup experiment · not production · IA: MCP is plugins · path: .sisyphus/plans/html-mockups/</p>
    </main>
  </div>
</div>
<script src="{js}"></script>
</body>
</html>
"""


def page_head(title: str, sub: str, actions: str = "") -> str:
    return f"""
<div class="page-head">
  <div>
    <h1>{title}</h1>
    <p class="sub">{sub}</p>
  </div>
  <div class="actions">{actions}</div>
</div>
"""


def stats(items: list[tuple[str, str]]) -> str:
    cells = "".join(
        f'<div class="stat"><div class="label">{k}</div><div class="value">{v}</div></div>'
        for k, v in items
    )
    return f'<div class="stats">{cells}</div>'


def filter_bar(placeholder: str, chips: list[str]) -> str:
    chip_html = "".join(
        f'<button type="button" class="chip{" active" if i == 0 else ""}">{c}</button>'
        for i, c in enumerate(chips)
    )
    return f"""
<div class="filter-bar">
  <input type="search" placeholder="{placeholder}"/>
  {chip_html}
</div>
"""


def table(headers: list[str], rows: list[list[str]]) -> str:
    th = "".join(f"<th>{h}</th>" for h in headers)
    trs = []
    for row in rows:
        tds = "".join(f"<td>{c}</td>" for c in row)
        trs.append(f"<tr>{tds}</tr>")
    return f"""
<div class="card">
  <table class="res">
    <thead><tr>{th}</tr></thead>
    <tbody>
      {"".join(trs)}
    </tbody>
  </table>
</div>
"""


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print("wrote", path.relative_to(ROOT))


# ─── Page content builders ───────────────────────────────────────────

def pages() -> dict[str, tuple[str, str, str]]:
    """id -> (filename, title, html body)"""
    out: dict[str, tuple[str, str, str]] = {}

    out["dashboard"] = (
        "dashboard.html",
        "Dashboard",
        page_head(
            "Dashboard",
            'Cluster capacity · <span class="live">● live</span> · 2s ago',
            '<button class="btn">Export support bundle</button>',
        )
        + stats(
            [
                ("Hosts", "5"),
                ("VMs running", "39 / 47"),
                ("CPU", "62%"),
                ("Memory", "71%"),
                ("Alerts", "2"),
            ]
        )
        + """
<div class="grid-2">
  <div class="card card-pad">
    <div style="font-weight:700;margin-bottom:10px">Actionable alerts</div>
    <div class="alert alert-warn">zpool tank: scrub deferred 14d — schedule under Storage</div>
    <div class="alert alert-info">Host prod-node-03 agent update available (14.2-p3)</div>
  </div>
  <div class="card card-pad">
    <div style="font-weight:700;margin-bottom:10px">Recent tasks</div>
    <table class="res">
      <tr><td>Snapshot nextcloud</td><td class="status-ok">OK</td><td>2m ago</td></tr>
      <tr><td>Migrate jellyfin → node-02</td><td class="status-ok">OK</td><td>1h ago</td></tr>
      <tr><td>Backup policy nightly</td><td class="status-warn">Running</td><td>now</td></tr>
    </table>
  </div>
</div>
""",
    )

    out["vms"] = (
        "vms.html",
        "Virtual Machines",
        page_head(
            "Virtual Machines",
            '47 VMs across 5 hosts · <span class="live">● live</span>',
            '<a class="btn btn-primary" href="../wizards/vm-create.html">+ Create VM</a>',
        )
        + stats([("Total", "47"), ("Running", "39"), ("Stopped", "6"), ("Error", "1"), ("Paused", "1")])
        + filter_bar("Filter VMs…", ["All", "Run", "Stop", "Error"])
        + table(
            ["Status", "Name", "OS", "Host", "vCPU", "RAM", "IPs", "Uptime", "Actions"],
            [
                ['<span class="status-ok">● Run</span>', '<a href="../detail/vm.html">nextcloud</a>', "FreeBSD 14", "prod-node-01", "4", "8 GB", "10.0.10.21", "14d", "View · Console · Stop"],
                ['<span class="status-ok">● Run</span>', "jellyfin", "Linux", "prod-node-02", "8", "16 GB", "10.0.10.22", "7d", "View · Console · Stop"],
                ['<span class="status-off">○ Stop</span>', "win11-sandbox", "Windows", "prod-node-03", "4", "8 GB", "—", "—", "View · Start · Delete"],
                ['<span class="status-err">✕ Error</span>', "gitlab-runner", "Linux", "prod-node-02", "2", "4 GB", "10.0.10.30", "2h", "View · Console · Restart"],
            ],
        ),
    )

    out["containers"] = (
        "containers.html",
        "Containers",
        page_head("Containers", "OCI containers · podman · live", '<button class="btn btn-primary">+ Create container</button>')
        + stats([("Total", "18"), ("Running", "14"), ("Exited", "3"), ("Restarting", "1")])
        + filter_bar("Filter containers…", ["All", "Running", "Exited"])
        + table(
            ["Status", "Name", "Image", "Host", "CPU", "Mem", "Actions"],
            [
                ['<span class="status-ok">●</span>', "redis-cache", "redis:7", "prod-node-01", "2%", "128 MB", "View · Stop · Logs"],
                ['<span class="status-ok">●</span>', "traefik", "traefik:v3", "prod-node-01", "4%", "64 MB", "View · Stop · Logs"],
                ['<span class="status-off">○</span>', "buildkit", "moby/buildkit", "prod-node-03", "—", "—", "View · Start"],
            ],
        ),
    )

    out["jails"] = (
        "jails.html",
        "Jails",
        page_head("Jails", "FreeBSD jails · differentiator", '<button class="btn btn-primary">+ Create jail</button>')
        + stats([("Total", "12"), ("Running", "11"), ("Stopped", "1")])
        + filter_bar("Filter jails…", ["All", "Running", "Stopped"])
        + table(
            ["Status", "Name", "Release", "Host", "IPs", "Actions"],
            [
                ['<span class="status-ok">●</span>', "pkg-mirror", "14.2-RELEASE", "prod-node-01", "10.0.20.10", "View · Stop · Shell"],
                ['<span class="status-ok">●</span>', "dns-ns1", "14.2-RELEASE", "prod-node-02", "10.0.20.53", "View · Stop · Shell"],
            ],
        ),
    )

    out["storage"] = (
        "storage.html",
        "Storage",
        page_head("Storage", "ZFS pools · datasets · snapshots", '<button class="btn btn-primary">+ Create volume</button>')
        + stats([("Pools", "3"), ("Datasets", "48"), ("Snapshots", "210"), ("Used", "12.4 TB")])
        + filter_bar("Filter volumes…", ["All", "Datasets", "Snapshots", "Scrubs"])
        + table(
            ["Name", "Pool", "Type", "Used", "Avail", "Compression", "Actions"],
            [
                ["tank/vms/nextcloud", "tank", "dataset", "120 GB", "2.1 TB", "lz4", "View · Snapshot · Clone"],
                ["tank/jails", "tank", "dataset", "80 GB", "2.1 TB", "lz4", "View · Snapshot"],
                ["backup/nightly", "backup", "dataset", "4.2 TB", "8 TB", "zstd", "View · Scrub"],
            ],
        ),
    )

    out["networks"] = (
        "networks.html",
        "Networks",
        page_head(
            "Networks",
            "Bridges · VLANs · IP pools · map is a view mode",
            '<button class="btn">Map view</button><button class="btn btn-primary">+ Create network</button>',
        )
        + stats([("Bridges", "4"), ("VLANs", "12"), ("IP pools", "3"), ("Attached", "61")])
        + """
<div class="tabs">
  <a href="#" class="active">List</a>
  <a href="#">Map</a>
  <a href="#">IP pools</a>
</div>
"""
        + table(
            ["Name", "Type", "CIDR", "VLAN", "Hosts", "Actions"],
            [
                ["vm-public", "bridge", "10.0.10.0/24", "—", "5", "View · Edit · Delete"],
                ["vm-storage", "bridge", "10.0.30.0/24", "—", "5", "View · Edit"],
                ["guest-vlan40", "vlan", "10.40.0.0/22", "40", "3", "View · Edit"],
            ],
        ),
    )

    out["hosts"] = (
        "hosts.html",
        "Hosts",
        page_head(
            "Hosts",
            "Inventory · drain · maintenance · agent version (not Cluster services)",
            '<button class="btn btn-primary" data-open-modal="add-host">+ Add host</button>',
        )
        + stats([("Hosts", "5"), ("Ready", "4"), ("Maintenance", "1"), ("Agent", "14.2")])
        + filter_bar("Filter hosts…", ["All", "Ready", "Maintenance", "Offline"])
        + table(
            ["Status", "Name", "CPU", "Memory", "VMs", "Agent", "Actions"],
            [
                ['<span class="status-ok">● Ready</span>', '<a href="../detail/host.html">prod-node-01</a>', "62%", "71%", "12", "14.2-p2", "View · Drain · Maintenance"],
                ['<span class="status-ok">● Ready</span>', "prod-node-02", "48%", "55%", "10", "14.2-p2", "View · Drain"],
                ['<span class="status-warn">◐ Maint</span>', "prod-node-03", "12%", "30%", "4", "14.1", "View · Exit maint"],
            ],
        )
        + """
<div class="modal-backdrop" id="add-host" hidden>
  <div class="modal">
    <div class="modal-h"><h2>Add host</h2><button class="btn" data-close-modal>×</button></div>
    <div class="modal-b">
      <div class="field"><label>Hostname / IP</label><input placeholder="prod-node-06.local"/></div>
      <div class="field"><label>Join token</label><input type="password" placeholder="••••••••"/></div>
      <div class="alert alert-info">Preflight will verify agent version and network reachability before join.</div>
    </div>
    <div class="modal-f">
      <button class="btn" data-close-modal>Cancel</button>
      <button class="btn btn-primary">Preflight &amp; join</button>
    </div>
  </div>
</div>
""",
    )

    out["cluster"] = (
        "cluster.html",
        "Cluster",
        page_head(
            "Cluster",
            "Services only — membership, CARP/VIP, replication (not a host table)",
            "",
        )
        + """
<div class="grid-2">
  <div class="card card-pad">
    <div style="font-weight:700;color:#1d4ed8;text-transform:uppercase;font-size:11px;margin-bottom:10px">Membership</div>
    <div>Quorum: <strong>3 / 5</strong> voting nodes</div>
    <div style="margin-top:6px">Policy: majority · auto-rejoin on</div>
  </div>
  <div class="card card-pad">
    <div style="font-weight:700;color:#1d4ed8;text-transform:uppercase;font-size:11px;margin-bottom:10px">CARP / VIP</div>
    <div>VIP: <span class="mono">10.0.0.10</span></div>
    <div style="margin-top:6px">Master: prod-node-01 · advbase 1</div>
  </div>
</div>
<div class="card" style="margin-top:12px">
  <div class="card-pad" style="font-weight:700">Cluster jobs</div>
"""
        + table(
            ["Job", "State", "Started", "Detail"],
            [
                ["replication-sync", '<span class="status-ok">OK</span>', "02:00 UTC", "lag 0s"],
                ["cert-rotate", '<span class="status-warn">Queued</span>', "—", "Sunday window"],
            ],
        )
        + "</div>",
    )

    out["tasks"] = (
        "tasks.html",
        "Tasks",
        page_head("Tasks", "Global long-running ops · stream-backed", "")
        + filter_bar("Filter tasks…", ["All", "Running", "OK", "Failed"])
        + table(
            ["State", "Task", "Target", "Started", "Duration", "Actions"],
            [
                ['<span class="status-warn">◐</span>', "ZFS send backup/nightly", "backup", "00:15", "41m", "View · Cancel"],
                ['<span class="status-ok">●</span>', "VM migrate jellyfin", "prod-node-02", "1h ago", "12m", "View"],
                ['<span class="status-err">✕</span>', "Snapshot win11-sandbox", "prod-node-03", "3h ago", "12s", "View · Retry"],
            ],
        ),
    )

    out["library"] = (
        "library.html",
        "Library",
        page_head("Content Library", "ISOs · templates · cloud images", '<button class="btn btn-primary">+ Upload</button>')
        + table(
            ["Name", "Type", "Size", "Used by", "Actions"],
            [
                ["FreeBSD-14.2-RELEASE-amd64-disc1.iso", "ISO", "1.2 GB", "3 VMs", "Use · Delete"],
                ["ubuntu-24.04-cloudimg", "Image", "640 MB", "8 VMs", "Use · Delete"],
                ["jail-base-14.2", "Template", "320 MB", "5 jails", "Use · Delete"],
            ],
        ),
    )

    out["users"] = (
        "users.html",
        "Users",
        page_head(
            "Users",
            "Control-plane identities (not OS dump of www/postgres)",
            '<button class="btn btn-primary">+ Create user</button>',
        )
        + filter_bar("Filter users…", ["All", "Admin", "Operator", "Auditor"])
        + table(
            ["User", "Role", "2FA", "Last active", "Actions"],
            [
                ["mlapointe", "Admin", "TOTP", "now", "Edit · Disable"],
                ["ops-alice", "Operator", "Passkey", "2h ago", "Edit · Disable"],
                ["audit-bob", "Auditor", "—", "1d ago", "Edit · Disable"],
            ],
        ),
    )

    out["roles"] = (
        "roles.html",
        "Roles",
        page_head("Roles", "RBAC · may ship as Users sub-tab in v1", '<button class="btn btn-primary">+ Role</button>')
        + table(
            ["Role", "Users", "Capabilities", "Actions"],
            [
                ["Admin", "2", "all", "Edit"],
                ["Operator", "5", "workload:write, hosts:drain", "Edit"],
                ["Auditor", "1", "*:read", "Edit"],
            ],
        ),
    )

    out["logs"] = (
        "logs.html",
        "Logs",
        page_head("Logs", "Streaming buffer · time range · no Refresh chrome", "")
        + """
<div class="filter-bar">
  <input type="search" placeholder="Search log lines…"/>
  <select style="padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px">
    <option>Last 15m</option><option>Last 1h</option><option>Last 24h</option>
  </select>
  <button class="chip active">All</button>
  <button class="chip">Error</button>
  <button class="chip">Warn</button>
</div>
<div class="card card-pad mono" style="background:#0f172a;color:#e2e8f0;min-height:360px;line-height:1.55">
  <div><span style="color:#64748b">02:11:04</span> <span style="color:#86efac">INFO</span> agent heartbeat prod-node-01 ok</div>
  <div><span style="color:#64748b">02:11:08</span> <span style="color:#fbbf24">WARN</span> zfs scrub deferred on tank</div>
  <div><span style="color:#64748b">02:11:12</span> <span style="color:#86efac">INFO</span> stream client connected peer=ui</div>
  <div><span style="color:#64748b">02:11:19</span> <span style="color:#f87171">ERROR</span> vm gitlab-runner qemu exit 1</div>
</div>
""",
    )

    out["notifications"] = (
        "notifications.html",
        "Notifications",
        page_head("Notifications", "Inbox · personal routing under Account prefs", '<button class="btn">Mark all read</button>')
        + table(
            ["", "Message", "When"],
            [
                ["●", "Backup nightly completed (backup/nightly)", "12m ago"],
                ["●", "Agent update available on prod-node-03", "1h ago"],
                ["", "User ops-alice created API key", "1d ago"],
            ],
        ),
    )

    out["audit"] = (
        "audit.html",
        "Audit",
        page_head("Audit", "Compliance trail · Observe (not buried only in System)", "")
        + filter_bar("Filter audit…", ["All", "Auth", "Mutations", "Admin"])
        + table(
            ["Time", "Actor", "Action", "Target", "Result"],
            [
                ["02:10:01", "mlapointe", "vm.stop", "nextcloud", "OK"],
                ["01:55:12", "ops-alice", "host.drain", "prod-node-03", "OK"],
                ["01:40:00", "system", "backup.run", "nightly", "OK"],
                ["00:12:44", "unknown", "auth.fail", "api", "DENY"],
            ],
        ),
    )

    out["settings"] = (
        "settings.html",
        "Settings",
        page_head(
            "Settings",
            "System configuration only — not My Account",
            '<button class="btn btn-primary">Save</button>',
        )
        + """
<div class="grid-2">
  <div>
    <div class="tabs" style="flex-direction:column;border:0;align-items:stretch">
      <button class="active" style="text-align:left;border-left:3px solid #2563eb;background:#eff6ff">Cluster identity</button>
      <button style="text-align:left">Authentication</button>
      <button style="text-align:left">Host / agent defaults</button>
      <button style="text-align:left">Networking</button>
      <button style="text-align:left">Storage defaults</button>
      <button style="text-align:left">Integrations</button>
      <button style="text-align:left">Licensing</button>
      <button style="text-align:left">Advanced</button>
    </div>
  </div>
  <div class="card card-pad">
    <div class="field"><label>Cluster name</label><input value="prod-lab"/></div>
    <div class="field"><label>Display name</label><input value="Production Lab"/></div>
    <div class="field"><label>Alert contact</label><input value="ops@example.lan"/></div>
  </div>
</div>
""",
    )

    out["mcp"] = (
        "mcp.html",
        "MCP",
        page_head(
            "MCP",
            'MCP servers are the extension system · was Plugins · <span class="live">● live</span>',
            '<button class="btn">Probe all</button><a class="btn btn-primary" href="../wizards/mcp-add.html">+ Add MCP server</a>',
        )
        + stats([("Servers", "4"), ("Healthy", "3"), ("Tools", "112"), ("Disabled", "1")])
        + table(
            ["Status", "Name", "Transport", "Endpoint / command", "Tools", "Actions"],
            [
                ['<span class="status-ok">● OK</span>', '<a href="mcp-detail.html">honcho</a>', "HTTP", '<span class="mono">https://mcp.honcho.example.lan/</span>', "30", "View · Probe · Disable"],
                ['<span class="status-ok">● OK</span>', "cluster-bridge", "HTTP", '<span class="mono">https://127.0.0.1:8787/mcp</span>', "48", "View · Probe · Disable"],
                ['<span class="status-ok">● OK</span>', "hexstrike-local", "stdio", '<span class="mono">python hexstrike_mcp.py …</span>', "150", "View · Probe · Disable"],
                ['<span class="status-off">○ Off</span>', "operant", "stdio", '<span class="mono">npx -y operant-mcp</span>', "—", "View · Enable"],
            ],
        )
        + '<p style="font-size:11px;color:var(--muted);margin-top:10px">MCP replaces the old Plugins product. Register servers here; tools become available to agents and optional UI actions.</p>',
    )

    out["mcp-detail"] = (
        "mcp-detail.html",
        "MCP server detail",
        """
<div class="breadcrumb">MCP / <strong>honcho</strong></div>
"""
        + page_head(
            "honcho",
            'HTTP · streamable · workspace default · <span class="status-ok">handshake OK</span>',
            '<button class="btn">Probe</button><button class="btn">Edit</button><button class="btn btn-danger">Disable</button>',
        )
        + """
<div class="grid-2">
  <div class="card card-pad">
    <div style="font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;margin-bottom:10px">Connection</div>
    <div><strong>URL</strong> · <span class="mono">https://mcp.honcho.example.lan/</span></div>
    <div><strong>Auth</strong> · Bearer ••••CeE_XI (masked)</div>
    <div><strong>Header</strong> · X-Honcho-User-Name: mlapointe</div>
    <div><strong>Timeout</strong> · 30s startup · 600s tools</div>
  </div>
  <div class="card card-pad">
    <div style="font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;margin-bottom:10px">Health</div>
    <div><strong>Protocol</strong> · 2025-06-18</div>
    <div><strong>Server</strong> · Honcho MCP Server 3.0.0</div>
    <div><strong>Last probe</strong> · 4s ago</div>
    <div><strong>Tools</strong> · 30 discovered</div>
  </div>
</div>
<div class="card" style="margin-top:12px">
  <div class="card-pad" style="font-weight:700">Tools (sample)</div>
"""
        + table(
            ["Tool", "Description"],
            [
                ['<span class="mono">honcho__chat</span>', "Dialectic query about a peer"],
                ['<span class="mono">honcho__list_peers</span>', "List workspace peers"],
                ['<span class="mono">honcho__inspect_workspace</span>', "Workspace summary"],
            ],
        )
        + "</div>",
    )

    out["system"] = (
        "system.html",
        "System",
        page_head("System", "Ops hub — not preferences", "")
        + """
<div class="tabs">
  <a class="active" href="#">Backups</a>
  <a href="#">Updates</a>
  <a href="system-diagnostics.html">Diagnostics</a>
  <a href="#">Exports</a>
  <a href="#">Maintenance</a>
</div>
"""
        + page_head("Backups", "Policies and job runs in one place", '<button class="btn btn-primary">+ Policy</button>')
        + table(
            ["Policy", "Schedule", "Last run", "Status", "Actions"],
            [
                ["nightly-zfs", "0 2 * * *", "today 02:00", '<span class="status-ok">OK</span>', "Run · Edit"],
                ["weekly-full", "0 3 * * 0", "Sun 03:00", '<span class="status-ok">OK</span>', "Run · Edit"],
            ],
        ),
    )

    out["system-diagnostics"] = (
        "system-diagnostics.html",
        "System · Diagnostics",
        page_head("Diagnostics", "Auth capabilities · preflight · connection · MCP health (absorbs Status)", "")
        + """
<div class="tabs">
  <a href="system.html">Backups</a>
  <a href="#">Updates</a>
  <a class="active" href="#">Diagnostics</a>
  <a href="#">Exports</a>
  <a href="#">Maintenance</a>
</div>
<div class="grid-3">
  <div class="card card-pad"><div class="label" style="font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase">Backend</div><div class="value status-ok" style="font-size:18px;font-weight:700">UP · 18ms</div></div>
  <div class="card card-pad"><div class="label" style="font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase">Stream</div><div class="value status-ok" style="font-size:18px;font-weight:700">connected</div></div>
  <div class="card card-pad"><div class="label" style="font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase">MCP</div><div class="value" style="font-size:18px;font-weight:700">3 / 4 healthy</div></div>
</div>
"""
        + table(
            ["Check", "Result", "Detail"],
            [
                ["Auth methods", "OK", "password, TOTP, passkey"],
                ["Preflight service", "OK", "latency 12ms"],
                ["CARP VIP", "OK", "10.0.0.10 master node-01"],
            ],
        ),
    )

    out["about"] = (
        "about.html",
        "About",
        page_head("About", "Product versions · license · support", "")
        + """
<div class="card card-pad" style="max-width:520px">
  <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Product</span><strong>CloudBSD Admin</strong></div>
  <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>UI</span><strong>Angular 20 (planned)</strong></div>
  <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Agent</span><strong>14.2-p2</strong></div>
  <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>License</span><strong>Enterprise · valid</strong></div>
  <div style="display:flex;justify-content:space-between"><span>MCP servers</span><strong>4 registered</strong></div>
</div>
""",
    )

    out["account"] = (
        "account.html",
        "My Account",
        page_head("My Account · Security", "Personal surface — not Admin Settings", '<button class="btn btn-primary">Save</button>')
        + """
<div class="tabs">
  <a href="#">Profile</a>
  <a class="active" href="#">Security</a>
  <a href="#">Appearance</a>
  <a href="#">Preferences</a>
  <a href="#">API tokens</a>
</div>
<div class="card card-pad" style="max-width:520px">
  <div class="field"><label>Password</label><button class="btn">Change password</button></div>
  <div class="field"><label>Two-factor</label><div>TOTP enabled · <button class="btn">Manage</button></div></div>
  <div class="field"><label>Passkeys</label><div>1 registered · <button class="btn">Add passkey</button></div></div>
  <div class="field"><label>Active sessions</label>
    <table class="res">
      <tr><td>Firefox · this device</td><td>now</td><td></td></tr>
      <tr><td>Safari · last active 2h ago</td><td>2h</td><td><button class="btn btn-danger">Revoke</button></td></tr>
    </table>
  </div>
</div>
""",
    )

    out["console"] = (
        "console.html",
        "VM console",
        """
<div class="breadcrumb"><a href="vms.html">VMs</a> / nextcloud / <strong>Console</strong></div>
"""
        + page_head("Console · nextcloud", "noVNC · keyboard capture", '<button class="btn">Send Ctrl+Alt+Del</button><button class="btn">Disconnect</button>')
        + """
<div class="console-frame">
  <div class="console-bar"><span>noVNC · connected</span><span class="live">● live</span></div>
  <div class="console-body">
FreeBSD/amd64 (nextcloud) (ttyv0)<br/><br/>
login: root<br/>
Password:<br/>
Last login: Thu Jul 16 02:01:11 on ttyv0<br/>
root@nextcloud:~ #
  </div>
</div>
""",
    )

    # errors
    for code, title, msg in [
        ("403", "403 Forbidden", "You do not have permission to view this resource."),
        ("404", "404 Not found", "That page does not exist in this cluster."),
        ("500", "500 Server error", "The control plane hit an unexpected error."),
        ("503", "503 Maintenance", "Cluster is in maintenance mode."),
    ]:
        out[f"error-{code}"] = (
            f"error-{code}.html",
            title,
            f"""
<div class="card card-pad" style="max-width:480px;margin:40px auto;text-align:center">
  <div style="font-size:40px;font-weight:700;color:var(--muted)">{code}</div>
  <h1 style="margin:8px 0">{title}</h1>
  <p style="color:var(--muted)">{msg}</p>
  <a class="btn btn-primary" href="dashboard.html">Back to Dashboard</a>
</div>
""",
        )

    return out


def login_page() -> str:
    body = """
<div class="auth-wrap">
  <div class="auth-card">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <div class="logo">C</div>
      <strong>CloudBSD Admin</strong>
    </div>
    <h1>Sign in</h1>
    <p class="sub">Self-hosted FreeBSD control plane</p>
    <div class="field"><label>Username</label><input value="mlapointe"/></div>
    <div class="field"><label>Password</label><input type="password" value="••••••••"/></div>
    <button class="btn btn-primary" style="width:100%;margin-bottom:10px" onclick="location.href='dashboard.html'">Sign in</button>
    <button class="btn" style="width:100%;margin-bottom:10px">Sign in with passkey</button>
    <div style="text-align:center;font-size:12px"><a href="#">Forgot password</a></div>
  </div>
</div>
"""
    return shell("Login", body, bare=True, depth="pages")


def components() -> dict[str, tuple[str, str]]:
    """filename -> (title, body)"""
    c: dict[str, tuple[str, str]] = {}

    c["resource-table.html"] = (
        "ResourceTableComponent",
        page_head("ResourceTableComponent", "Shared list: status, sort, pagination, bulk select", "")
        + """
<div class="actions" style="margin-bottom:10px">
  <button class="chip active" data-density="cozy">Cozy</button>
  <button class="chip" data-density="compact">Compact</button>
  <button class="chip" data-density="extra">Extra</button>
</div>
"""
        + filter_bar("Search…", ["All", "Running", "Stopped"])
        + """
<div class="card" data-density-target>
  <table class="res">
    <thead><tr>
      <th><input type="checkbox"/></th>
      <th>Status ⇅</th><th>Name ⇅</th><th>Host</th><th>Actions</th>
    </tr></thead>
    <tbody>
      <tr><td><input type="checkbox"/></td><td class="status-ok">●</td><td>nextcloud</td><td>prod-node-01</td><td>View · Stop</td></tr>
      <tr><td><input type="checkbox"/></td><td class="status-ok">●</td><td>jellyfin</td><td>prod-node-02</td><td>View · Stop</td></tr>
      <tr><td><input type="checkbox"/></td><td class="status-off">○</td><td>win11-sandbox</td><td>prod-node-03</td><td>View · Start</td></tr>
    </tbody>
  </table>
  <div class="card-pad" style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--muted)">
    <span>1–3 of 47</span>
    <span>Per page: <strong>50</strong> · ‹ Prev · Next ›</span>
  </div>
</div>
<p class="mock-note">Replaces per-resource table forks and compact/extra-compact SVG variants (density = CSS).</p>
""",
    )

    c["empty-state.html"] = (
        "EmptyStateComponent",
        page_head("EmptyStateComponent", "One empty pattern for no-data and no-filter-match", "")
        + """
<div class="grid-2">
  <div class="card empty">
    <h3>No virtual machines</h3>
    <p>Create a VM to get started on this cluster.</p>
    <button class="btn btn-primary">+ Create VM</button>
  </div>
  <div class="card empty">
    <h3>No matches</h3>
    <p>No VMs match “gpu-only”. Clear filters or adjust search.</p>
    <button class="btn">Clear filters</button>
  </div>
</div>
""",
    )

    c["stat-cards.html"] = (
        "StatCardsRowComponent",
        page_head("StatCardsRowComponent", "3–5 KPI tiles reused on list pages", "")
        + stats([("Total", "47"), ("Running", "39"), ("Stopped", "6"), ("Error", "1"), ("Paused", "1")]),
    )

    c["filter-bar.html"] = (
        "FilterBarComponent",
        page_head("FilterBarComponent", "Search + status chips", "")
        + filter_bar("Filter resources…", ["All", "Run", "Stop", "Error", "Paused"]),
    )

    c["detail-shell.html"] = (
        "DetailShellComponent",
        """
<div class="breadcrumb">VMs / <strong>nextcloud</strong></div>
"""
        + page_head(
            "nextcloud",
            'FreeBSD 14 · prod-node-01 · <span class="status-ok">● running</span>',
            '<button class="btn">Console</button><button class="btn">Stop</button><button class="btn">Snapshot</button>',
        )
        + """
<div class="tabs">
  <a class="active" href="#">Overview</a>
  <a href="#">Disks</a>
  <a href="#">Network</a>
  <a href="#">Snapshots</a>
  <a href="#">Metrics</a>
  <a href="#">Events</a>
</div>
<div class="grid-2">
  <div class="card card-pad">
    <div style="font-weight:700;margin-bottom:8px">Resources</div>
    <div>vCPU 4 · RAM 8 GB · disk 120 GB</div>
  </div>
  <div class="card card-pad">
    <div style="font-weight:700;margin-bottom:8px">Network</div>
    <div>10.0.10.21 · vm-public</div>
  </div>
</div>
<p class="mock-note">One shell per resource type; tab content is outlet, not separate routes.</p>
""",
    )

    c["wizard-shell.html"] = (
        "WizardShellComponent",
        page_head("WizardShellComponent", "Stepper + back/next/review chrome", "")
        + """
<div class="stepper">
  <span class="step done">1 Template</span>
  <span class="step active">2 Identity</span>
  <span class="step">3 Resources</span>
  <span class="step">4 Storage / net</span>
  <span class="step">5 Review</span>
</div>
<div class="card card-pad" style="max-width:560px">
  <div class="field"><label>Name</label><input value="nextcloud-02"/></div>
  <div class="field"><label>Description</label><textarea>Secondary Nextcloud</textarea></div>
  <div class="actions" style="justify-content:flex-end">
    <button class="btn">Back</button>
    <button class="btn btn-primary">Next</button>
  </div>
</div>
""",
    )

    c["live-indicator.html"] = (
        "LiveIndicatorComponent",
        page_head("LiveIndicatorComponent", "● live · Xs ago — stream primary, no Refresh", "")
        + """
<div class="card card-pad">
  <p><span class="live">● live</span> · updated 2s ago</p>
  <p style="color:var(--muted);font-size:12px">On disconnect: small reconnect affordance only — not a full-page Refresh button.</p>
</div>
""",
    )

    c["capability-menu.html"] = (
        "CapabilityActionMenu",
        page_head("CapabilityActionMenu", "Actions after preflight (Rule #8)", "")
        + """
<div class="card card-pad">
  <p style="margin-top:0">Preflight result for <strong>Stop VM nextcloud</strong>:</p>
  <div class="alert alert-ok">OK — no blockers</div>
  <div class="actions">
    <button class="btn">Cancel</button>
    <button class="btn btn-primary" data-open-modal="confirm-demo">Stop VM…</button>
  </div>
  <p style="font-size:12px;color:var(--muted)">Blocked actions are hidden, not shown disabled with mystery tooltips.</p>
</div>
<div class="modal-backdrop" id="confirm-demo" hidden>
  <div class="modal">
    <div class="modal-h"><h2>Stop virtual machine</h2><button class="btn" data-close-modal>×</button></div>
    <div class="modal-b">
      <p>Stop <strong>nextcloud</strong> on prod-node-01?</p>
      <div class="alert alert-info">Guest ACPI shutdown · timeout 120s · then force power off</div>
    </div>
    <div class="modal-f">
      <button class="btn" data-close-modal>Cancel</button>
      <button class="btn btn-primary">Confirm stop</button>
    </div>
  </div>
</div>
""",
    )

    c["sidebar.html"] = (
        "SidebarComponent",
        page_head("SidebarComponent", "IA groups from product IA §3", "")
        + """
<div class="card card-pad">
  <p>Groups: Workload · Access · Observe · Configure · Operate</p>
  <p><strong>MCP</strong> under Configure (not Plugins). Status is not top-level.</p>
  <p>Footer: host display name + uptime only.</p>
</div>
""",
    )

    c["header.html"] = (
        "HeaderComponent",
        page_head("HeaderComponent", "Brand · host chip · timezone · notifications · avatar", "")
        + """
<div class="card" style="overflow:hidden">
  <div class="header" style="position:static">
    <div class="logo">C</div>
    <span class="brand">CloudBSD Admin</span>
    <span class="host-chip">prod-node-01.local</span>
    <div class="header-right">
      <span class="live">● live</span>
      <span>UTC ▾</span>
      <span title="Notifications">🔔</span>
      <div class="avatar">M</div>
    </div>
  </div>
</div>
""",
    )

    c["density.html"] = (
        "DensityService",
        page_head("DensityService", "cozy / compact / extra — CSS vars, not N×M components", "")
        + """
<div class="actions" style="margin-bottom:12px">
  <button class="chip active" data-density="cozy">Cozy</button>
  <button class="chip" data-density="compact">Compact</button>
  <button class="chip" data-density="extra">Extra</button>
</div>
<div class="card" data-density-target>
  <table class="res">
    <thead><tr><th>Name</th><th>Host</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>nextcloud</td><td>prod-node-01</td><td>Run</td></tr>
      <tr><td>jellyfin</td><td>prod-node-02</td><td>Run</td></tr>
      <tr><td>dns-ns1</td><td>prod-node-02</td><td>Run</td></tr>
    </tbody>
  </table>
</div>
""",
    )

    return c


def modals() -> dict[str, tuple[str, str]]:
    m: dict[str, tuple[str, str]] = {}

    m["confirm-action.html"] = (
        "ConfirmActionModal",
        page_head("ConfirmActionModal", "Describe → preflight warnings → confirm (Rule #1)", "")
        + """
<div class="modal-backdrop" style="position:relative;min-height:420px">
  <div class="modal">
    <div class="modal-h"><h2>Delete snapshot</h2></div>
    <div class="modal-b">
      <p>Delete snapshot <strong>nextcloud@2026-07-15</strong>?</p>
      <div class="alert alert-warn">This cannot be undone. Dependent clones: none.</div>
      <div class="field"><label>Type DELETE to confirm</label><input placeholder="DELETE"/></div>
    </div>
    <div class="modal-f">
      <button class="btn">Cancel</button>
      <button class="btn btn-danger">Delete snapshot</button>
    </div>
  </div>
</div>
""",
    )

    m["frost-out.html"] = (
        "FrostOutModal",
        page_head("FrostOutModal", "Session/auth failure → frost → return to /login", "")
        + """
<div class="frost" style="position:relative;min-height:400px;border-radius:12px">
  <div class="modal">
    <div class="modal-h"><h2>Session expired</h2></div>
    <div class="modal-b">
      <p>Your session is no longer valid. Sign in again to continue.</p>
    </div>
    <div class="modal-f">
      <a class="btn btn-primary" href="../pages/login.html">Sign in</a>
    </div>
  </div>
</div>
""",
    )

    m["user-menu.html"] = (
        "UserMenuDropdown",
        page_head("UserMenuDropdown", "Avatar menu → Account routes", "")
        + """
<div class="card" style="max-width:240px;margin-left:auto">
  <div class="card-pad" style="border-bottom:1px solid var(--border)">
    <strong>mlapointe</strong><div style="font-size:11px;color:var(--muted)">Admin</div>
  </div>
  <nav style="padding:6px">
    <a href="../pages/account.html" style="display:block;padding:8px 10px;color:#334155">Profile</a>
    <a href="../pages/account.html" style="display:block;padding:8px 10px;color:#334155">Preferences</a>
    <a href="../pages/account.html" style="display:block;padding:8px 10px;color:#334155">API tokens</a>
    <a href="../pages/about.html" style="display:block;padding:8px 10px;color:#334155">About</a>
    <hr style="border:0;border-top:1px solid var(--border);margin:4px 0"/>
    <a href="../pages/login.html" style="display:block;padding:8px 10px;color:#b91c1c">Sign out</a>
  </nav>
</div>
""",
    )

    m["notifications-dropdown.html"] = (
        "NotificationsDropdown",
        page_head("NotificationsDropdown", "Header inbox peek", "")
        + """
<div class="card" style="max-width:320px;margin-left:auto">
  <div class="card-pad" style="font-weight:700;border-bottom:1px solid var(--border)">Notifications</div>
  <div class="card-pad" style="border-bottom:1px solid #f1f5f9">Backup nightly completed <div style="font-size:11px;color:var(--muted)">12m ago</div></div>
  <div class="card-pad" style="border-bottom:1px solid #f1f5f9">Agent update on node-03 <div style="font-size:11px;color:var(--muted)">1h ago</div></div>
  <div class="card-pad"><a href="../pages/notifications.html">View all</a></div>
</div>
""",
    )

    m["add-host.html"] = (
        "AddHostDialog",
        page_head("AddHostDialog", "Join host with preflight", "")
        + """
<div class="modal-backdrop" style="position:relative;min-height:420px">
  <div class="modal wide">
    <div class="modal-h"><h2>Add host</h2></div>
    <div class="modal-b">
      <div class="stepper">
        <span class="step active">1 Connect</span>
        <span class="step">2 Preflight</span>
        <span class="step">3 Join</span>
      </div>
      <div class="field"><label>Hostname</label><input placeholder="prod-node-06.local"/></div>
      <div class="field"><label>Join token</label><input type="password"/></div>
    </div>
    <div class="modal-f">
      <button class="btn">Cancel</button>
      <button class="btn btn-primary">Next · Preflight</button>
    </div>
  </div>
</div>
""",
    )

    m["create-user.html"] = (
        "CreateUserModal",
        page_head("Create user", "Access · control-plane user", "")
        + """
<div class="modal-backdrop" style="position:relative;min-height:420px">
  <div class="modal">
    <div class="modal-h"><h2>Create user</h2></div>
    <div class="modal-b">
      <div class="field"><label>Username</label><input/></div>
      <div class="field"><label>Role</label><select><option>Operator</option><option>Admin</option><option>Auditor</option></select></div>
      <div class="field"><label>Temporary password</label><input type="password"/></div>
    </div>
    <div class="modal-f">
      <button class="btn">Cancel</button>
      <button class="btn btn-primary">Create</button>
    </div>
  </div>
</div>
""",
    )

    m["api-key-create.html"] = (
        "CreateApiKeyModal",
        page_head("Create API key", "Personal token or service principal", "")
        + """
<div class="modal-backdrop" style="position:relative;min-height:360px">
  <div class="modal">
    <div class="modal-h"><h2>Create API key</h2></div>
    <div class="modal-b">
      <div class="field"><label>Name</label><input value="ci-deploy"/></div>
      <div class="field"><label>Expires</label><select><option>90 days</option><option>1 year</option><option>Never</option></select></div>
      <div class="alert alert-warn">Secret shown once after create.</div>
    </div>
    <div class="modal-f">
      <button class="btn">Cancel</button>
      <button class="btn btn-primary">Create key</button>
    </div>
  </div>
</div>
""",
    )

    m["backup-create.html"] = (
        "BackupCreateModal",
        page_head("Create backup policy", "System · Backups", "")
        + """
<div class="modal-backdrop" style="position:relative;min-height:420px">
  <div class="modal wide">
    <div class="modal-h"><h2>Backup policy</h2></div>
    <div class="modal-b">
      <div class="field"><label>Name</label><input value="nightly-zfs"/></div>
      <div class="field"><label>Schedule (cron)</label><input value="0 2 * * *"/></div>
      <div class="field"><label>Targets</label><input value="tank/vms/*"/></div>
    </div>
    <div class="modal-f">
      <button class="btn">Cancel</button>
      <button class="btn btn-primary">Save policy</button>
    </div>
  </div>
</div>
""",
    )

    m["snapshot.html"] = (
        "ManualSnapshotModal",
        page_head("Manual snapshot", "VM / volume detail", "")
        + """
<div class="modal-backdrop" style="position:relative;min-height:360px">
  <div class="modal">
    <div class="modal-h"><h2>Create snapshot</h2></div>
    <div class="modal-b">
      <div class="field"><label>Name</label><input value="manual-2026-07-16"/></div>
      <div class="field"><label>Recursive</label><select><option>Yes</option><option>No</option></select></div>
    </div>
    <div class="modal-f">
      <button class="btn">Cancel</button>
      <button class="btn btn-primary">Snapshot</button>
    </div>
  </div>
</div>
""",
    )

    return m


def wizards() -> dict[str, tuple[str, str]]:
    w: dict[str, tuple[str, str]] = {}

    w["vm-create.html"] = (
        "Create VM wizard",
        page_head("Create virtual machine", "WizardShell · 5 steps", "")
        + """
<div class="stepper">
  <span class="step done">1 Template</span>
  <span class="step done">2 Identity</span>
  <span class="step active">3 Resources</span>
  <span class="step">4 Storage / net</span>
  <span class="step">5 Review</span>
</div>
<div class="card card-pad" style="max-width:640px">
  <div class="grid-2">
    <div class="field"><label>vCPU</label><input value="4"/></div>
    <div class="field"><label>RAM (GB)</label><input value="8"/></div>
  </div>
  <div class="field"><label>Host placement</label><select><option>Automatic</option><option>prod-node-01</option></select></div>
  <div class="actions" style="justify-content:flex-end">
    <button class="btn">Back</button>
    <button class="btn btn-primary">Next</button>
  </div>
</div>
""",
    )

    w["mcp-add.html"] = (
        "Add MCP server",
        page_head("Add MCP server", "Replaces old plugin install wizard · HTTP / SSE / stdio", "")
        + """
<div class="stepper">
  <span class="step active">1 Transport</span>
  <span class="step">2 Connection</span>
  <span class="step">3 Probe &amp; enable</span>
</div>
<div class="card card-pad" style="max-width:720px">
  <div style="font-size:12px;font-weight:600;margin-bottom:10px">Transport</div>
  <div class="grid-3">
    <div class="transport-card selected"><div style="font-weight:700">HTTP</div><div style="font-size:11px;color:var(--muted);margin-top:4px">Streamable HTTP</div></div>
    <div class="transport-card"><div style="font-weight:700">SSE</div><div style="font-size:11px;color:var(--muted);margin-top:4px">Server-Sent Events</div></div>
    <div class="transport-card"><div style="font-weight:700">stdio</div><div style="font-size:11px;color:var(--muted);margin-top:4px">Local command</div></div>
  </div>
  <div class="field" style="margin-top:14px"><label>Name</label><input value="honcho"/></div>
  <div class="field"><label>URL</label><input class="mono" value="https://mcp.honcho.example.lan/"/></div>
  <div class="field"><label>Authorization header</label><input type="password" value="secret"/></div>
  <div class="actions" style="justify-content:flex-end">
    <a class="btn" href="../pages/mcp.html">Cancel</a>
    <button class="btn btn-primary">Next · Probe</button>
  </div>
</div>
""",
    )

    w["container-create.html"] = (
        "Create container wizard",
        page_head("Create container", "Image → identity → resources → review", "")
        + """
<div class="stepper">
  <span class="step active">1 Image</span>
  <span class="step">2 Identity</span>
  <span class="step">3 Resources</span>
  <span class="step">4 Review</span>
</div>
<div class="card card-pad" style="max-width:560px">
  <div class="field"><label>Image</label><input value="redis:7"/></div>
  <div class="actions" style="justify-content:flex-end"><button class="btn btn-primary">Next</button></div>
</div>
""",
    )

    w["jail-create.html"] = (
        "Create jail wizard",
        page_head("Create jail", "Template → identity → resources → review", "")
        + """
<div class="stepper">
  <span class="step active">1 Template</span>
  <span class="step">2 Identity</span>
  <span class="step">3 Resources</span>
  <span class="step">4 Review</span>
</div>
<div class="card card-pad" style="max-width:560px">
  <div class="field"><label>Release</label><select><option>14.2-RELEASE</option></select></div>
  <div class="actions" style="justify-content:flex-end"><button class="btn btn-primary">Next</button></div>
</div>
""",
    )

    w["volume-create.html"] = (
        "Create volume wizard",
        page_head("Create volume", "Basics → properties → review", "")
        + """
<div class="stepper">
  <span class="step active">1 Basics</span>
  <span class="step">2 Properties</span>
  <span class="step">3 Review</span>
</div>
<div class="card card-pad" style="max-width:560px">
  <div class="field"><label>Dataset path</label><input value="tank/vms/new"/></div>
  <div class="actions" style="justify-content:flex-end"><button class="btn btn-primary">Next</button></div>
</div>
""",
    )

    w["network-create.html"] = (
        "Create network wizard",
        page_head("Create network", "Subnet → DHCP → review", "")
        + """
<div class="stepper">
  <span class="step active">1 Subnet</span>
  <span class="step">2 DHCP</span>
  <span class="step">3 Review</span>
</div>
<div class="card card-pad" style="max-width:560px">
  <div class="field"><label>Name</label><input value="vm-lab"/></div>
  <div class="field"><label>CIDR</label><input value="10.0.50.0/24"/></div>
  <div class="actions" style="justify-content:flex-end"><button class="btn btn-primary">Next</button></div>
</div>
""",
    )

    w["onboarding.html"] = (
        "Onboarding wizard",
        page_head("Welcome", "Day-1 onboarding · single path", "")
        + """
<div class="stepper">
  <span class="step active">1 Welcome</span>
  <span class="step">2 Cluster</span>
  <span class="step">3 First resource</span>
  <span class="step">4 Done</span>
</div>
<div class="card card-pad" style="max-width:560px">
  <p>Welcome to CloudBSD Admin. This wizard configures your first cluster host and optional first VM.</p>
  <button class="btn btn-primary">Get started</button>
</div>
""",
    )

    w["first-login.html"] = (
        "First-login wizard",
        page_head("Secure your account", "Verify · secure · preferences · recovery codes", "")
        + """
<div class="stepper">
  <span class="step done">1 Verify</span>
  <span class="step active">2 Secure</span>
  <span class="step">3 Preferences</span>
  <span class="step">4 Recovery codes</span>
</div>
<div class="card card-pad" style="max-width:560px">
  <div class="field"><label>Enable TOTP</label><button class="btn">Set up authenticator</button></div>
  <div class="field"><label>Add passkey</label><button class="btn">Register passkey</button></div>
  <button class="btn btn-primary">Continue</button>
</div>
""",
    )

    w["restore.html"] = (
        "Restore wizard",
        page_head("Restore", "Pick backup → target → review", "")
        + """
<div class="stepper">
  <span class="step active">1 Pick</span>
  <span class="step">2 Target</span>
  <span class="step">3 Review</span>
</div>
<div class="card card-pad" style="max-width:560px">
  <div class="field"><label>Backup</label><select><option>nightly-zfs · today 02:00</option></select></div>
  <button class="btn btn-primary">Next</button>
</div>
""",
    )

    return w


def detail_pages() -> dict[str, tuple[str, str, str]]:
    """filename, title, nav active, body"""
    return {
        "vm.html": (
            "VM detail",
            "vms",
            """
<div class="breadcrumb"><a href="../pages/vms.html">VMs</a> / <strong>nextcloud</strong></div>
"""
            + page_head(
                "nextcloud",
                'FreeBSD 14 · prod-node-01 · <span class="status-ok">● running</span> · <span class="live">● live</span>',
                '<a class="btn" href="../pages/console.html">Console</a><button class="btn">Stop</button><button class="btn">Snapshot</button><button class="btn">Migrate</button>',
            )
            + """
<div class="tabs">
  <a class="active" href="#">Overview</a>
  <a href="#">Disks</a>
  <a href="#">Network</a>
  <a href="#">Snapshots</a>
  <a href="#">Metrics</a>
  <a href="#">Events</a>
</div>
<div class="grid-2">
  <div class="card card-pad">
    <div style="font-weight:700;margin-bottom:8px">Resources</div>
    <div>vCPU 4 · RAM 8 GB</div>
    <div style="margin-top:6px">Boot disk tank/vms/nextcloud 120 GB</div>
  </div>
  <div class="card card-pad">
    <div style="font-weight:700;margin-bottom:8px">Guest</div>
    <div>IP 10.0.10.21</div>
    <div style="margin-top:6px">Uptime 14d 02:11</div>
  </div>
</div>
""",
        ),
        "host.html": (
            "Host detail",
            "hosts",
            """
<div class="breadcrumb"><a href="../pages/hosts.html">Hosts</a> / <strong>prod-node-01</strong></div>
"""
            + page_head(
                "prod-node-01",
                'Ready · agent 14.2-p2 · <span class="live">● live</span>',
                '<button class="btn">Drain</button><button class="btn">Maintenance</button>',
            )
            + """
<div class="tabs">
  <a class="active" href="#">Overview</a>
  <a href="#">Network</a>
  <a href="#">Storage</a>
  <a href="#">GPUs</a>
  <a href="#">VMs</a>
  <a href="#">Containers</a>
  <a href="#">Jails</a>
</div>
<div class="grid-3">
  <div class="card card-pad"><div class="label" style="font-size:10px;font-weight:600;color:var(--muted)">CPU</div><div style="font-size:20px;font-weight:700">62%</div></div>
  <div class="card card-pad"><div class="label" style="font-size:10px;font-weight:600;color:var(--muted)">Memory</div><div style="font-size:20px;font-weight:700">71%</div></div>
  <div class="card card-pad"><div class="label" style="font-size:10px;font-weight:600;color:var(--muted)">VMs</div><div style="font-size:20px;font-weight:700">12</div></div>
</div>
""",
        ),
        "container.html": (
            "Container detail",
            "containers",
            page_head("redis-cache", "Image redis:7 · prod-node-01 · running", '<button class="btn">Stop</button><button class="btn">Logs</button>')
            + """
<div class="tabs"><a class="active" href="#">Overview</a><a href="#">Network</a><a href="#">Logs</a><a href="#">Events</a></div>
<div class="card card-pad">Restart policy: unless-stopped · ports 6379/tcp</div>
""",
        ),
        "jail.html": (
            "Jail detail",
            "jails",
            page_head("pkg-mirror", "14.2-RELEASE · prod-node-01", '<button class="btn">Stop</button><button class="btn">Shell</button>')
            + """
<div class="tabs"><a class="active" href="#">Overview</a><a href="#">Network</a><a href="#">Mounts</a><a href="#">Events</a></div>
<div class="card card-pad">IP 10.0.20.10 · vnet on</div>
""",
        ),
        "volume.html": (
            "Volume detail",
            "storage",
            page_head("tank/vms/nextcloud", "dataset · lz4 · 120 GB used", '<button class="btn">Snapshot</button><button class="btn">Clone</button>')
            + """
<div class="tabs"><a class="active" href="#">Overview</a><a href="#">Snapshots</a><a href="#">Scrubs</a><a href="#">Permissions</a></div>
<div class="card card-pad">Pool tank · compression lz4 · atime off</div>
""",
        ),
    }


def build_index(catalog: dict) -> str:
    """catalog: section -> list of (href, title, blurb, tag)"""
    sections_html = []
    for section, items in catalog.items():
        cards = "".join(
            f'<a class="catalog-card" href="{href}"><h3>{title}</h3>'
            f'<p>{blurb}</p><span class="tag">{tag}</span></a>'
            for href, title, blurb, tag in items
        )
        sections_html.append(
            f'<div class="section-title">{section}</div><div class="catalog-grid">{cards}</div>'
        )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>CloudBSD Admin — HTML mockup kit</title>
  <link rel="stylesheet" href="assets/mockup.css"/>
</head>
<body>
<div class="catalog">
  <h1>CloudBSD Admin · HTML mockups</h1>
  <p class="lead">Experiment kit under <code>.sisyphus/plans/html-mockups/</code>. Browsable HTML for product spine pages, shared components, modals, and wizards. Aligns with product IA (MCP = plugins). Not production Angular.</p>
  <div class="banner">
    <strong>How to view:</strong> open <code>index.html</code> in a browser (file:// works).
    Authority remains: product IA → component catalog → these mocks / SVGs → Angular.
    Regenerate with <code>python3 generate.py</code>.
  </div>
  {"".join(sections_html)}
  <p class="mock-note">Author: Mark LaPointe · branch feat/angular-migration · 2026-07-16</p>
</div>
</body>
</html>
"""


def main() -> None:
    catalog: dict[str, list[tuple[str, str, str, str]]] = {
        "Auth & shell": [],
        "Workload": [],
        "Access & Observe": [],
        "Configure & Operate": [],
        "Detail shells": [],
        "Shared components": [],
        "Modals": [],
        "Wizards": [],
        "Errors": [],
    }

    # Login bare
    write(ROOT / "pages" / "login.html", login_page())
    catalog["Auth & shell"].append(("pages/login.html", "Login", "Sign-in + passkey", "S20"))

    for key, (fname, title, body) in pages().items():
        active = key
        if key.startswith("error-"):
            active = "dashboard"
            cat = "Errors"
        elif key in ("mcp", "mcp-detail", "settings"):
            cat = "Configure & Operate"
            active = "mcp" if key.startswith("mcp") else "settings"
        elif key in ("system", "system-diagnostics", "about", "account"):
            cat = "Configure & Operate" if key != "account" else "Auth & shell"
            active = {"system": "system", "system-diagnostics": "system", "about": "about", "account": None}.get(key)
            if key == "account":
                active = None
        elif key in ("users", "roles", "logs", "notifications", "audit"):
            cat = "Access & Observe"
        elif key == "console":
            cat = "Workload"
            active = "vms"
        else:
            cat = "Workload"

        if key == "mcp-detail":
            active = "mcp"
        if key == "system-diagnostics":
            active = "system"

        html = shell(title, body, active=active, depth="pages")
        write(ROOT / "pages" / fname, html)

        section = cat
        if key.startswith("error-"):
            section = "Errors"
        elif key in ("dashboard", "vms", "containers", "jails", "storage", "networks", "hosts", "cluster", "tasks", "library", "console"):
            section = "Workload"
        elif key in ("users", "roles", "logs", "notifications", "audit"):
            section = "Access & Observe"
        elif key in ("settings", "mcp", "mcp-detail", "system", "system-diagnostics", "about"):
            section = "Configure & Operate"
        elif key == "account":
            section = "Auth & shell"
        elif key == "login":
            section = "Auth & shell"

        blurb = title
        catalog[section].append((f"pages/{fname}", title, blurb, key.upper()[:8]))

    for fname, (title, body) in components().items():
        write(ROOT / "components" / fname, shell(title, body, active=None, depth="components"))
        catalog["Shared components"].append((f"components/{fname}", title, "Shared building block", "COMP"))

    for fname, (title, body) in modals().items():
        write(ROOT / "modals" / fname, shell(title, body, active=None, depth="modals"))
        catalog["Modals"].append((f"modals/{fname}", title, "Modal / overlay", "MODAL"))

    for fname, (title, body) in wizards().items():
        write(ROOT / "wizards" / fname, shell(title, body, active=None, depth="wizards"))
        catalog["Wizards"].append((f"wizards/{fname}", title, "Multi-step wizard", "WIZ"))

    for fname, (title, active, body) in detail_pages().items():
        write(ROOT / "detail" / fname, shell(title, body, active=active, depth="detail"))
        catalog["Detail shells"].append((f"detail/{fname}", title, "Detail shell + tabs", "DETAIL"))

    write(ROOT / "index.html", build_index(catalog))

    readme = """# HTML mockup experiment

Browsable HTML mockups for CloudBSD Admin product spine pages and shared components.

## Location

`.sisyphus/plans/html-mockups/`

## View

Open `index.html` in a browser (double-click or `python3 -m http.server` from this directory).

## Layout

| Path | Contents |
|------|----------|
| `pages/` | Spine screens (Dashboard, VMs, Hosts, MCP, Settings, System, …) |
| `detail/` | Resource detail shells (VM, Host, Container, Jail, Volume) |
| `components/` | Shared building blocks (ResourceTable, EmptyState, …) |
| `modals/` | Confirm, frost-out, create dialogs |
| `wizards/` | Create VM/container/jail, MCP add, onboarding |
| `assets/` | Shared CSS + tiny JS |

## Product rules baked in

- **MCP is the plugin system** (`pages/mcp.html`, `wizards/mcp-add.html`)
- Account vs Settings vs System split
- Hosts inventory vs Cluster services
- Management UX: describe → preflight → confirm
- Live stream indicator; no Refresh chrome on resource pages

## Regenerate

```bash
python3 generate.py
```

Edits to generated HTML are overwritten; change `generate.py` or hand-tweak specific files and stop regenerating those.

## Authority

1. `docs/migration/product-ia-esxi-vsphere-2026-07-16.md`
2. `docs/migration/component-catalog-plan.md`
3. SVG Track 2 under `diagrams/screens/`
4. This HTML kit (interactive experiment)

## Not in scope

Production Angular, real APIs, theme customizer gallery, file manager.
"""
    write(ROOT / "README.md", readme)
    print("done.")


if __name__ == "__main__":
    main()
