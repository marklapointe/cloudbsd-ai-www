#!/usr/bin/env python3
"""Generate CloudBSD Admin HTML mockups — full tabs + popup modals.

Run: python3 generate.py
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent

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


# ── helpers ──────────────────────────────────────────────────────────

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
            parts.append(f'<a href="{link}" data-id="{nid}"{cls_attr}><span>{label}</span></a>')
        parts.append("</nav>")
    parts.append(
        '<div class="sidebar-footer"><div>Host: prod-node-01</div>'
        "<div>Uptime: 14d 02:11</div></div>"
    )
    return "\n".join(parts)


def page_head(title: str, sub: str, actions: str = "") -> str:
    return f"""
<div class="page-head">
  <div><h1>{title}</h1><p class="sub">{sub}</p></div>
  <div class="actions">{actions}</div>
</div>"""


def stats(items: list[tuple[str, str]]) -> str:
    cells = "".join(
        f'<div class="stat"><div class="label">{k}</div><div class="value">{v}</div></div>'
        for k, v in items
    )
    return f'<div class="stats">{cells}</div>'


def filter_bar(placeholder: str, chips: list[str]) -> str:
    chip_html = "".join(
        f'<button type="button" class="chip{" active" if i == 0 else ""}" data-chip="{c.lower()}">{c}</button>'
        for i, c in enumerate(chips)
    )
    return f"""
<div class="filter-bar" data-filter-bar="1">
  <input type="search" placeholder="{placeholder}  (press /)" autocomplete="off"/>
  {chip_html}
</div>"""


def table(headers: list[str], rows: list[list[str]]) -> str:
    th = "".join(f"<th>{h}</th>" for h in headers)
    trs = []
    for row in rows:
        # Build filter text from plain bits of cells (strip tags lightly)
        plain = " ".join(re.sub(r"<[^>]+>", " ", c) for c in row)
        plain = " ".join(plain.split()).lower().replace('"', "")
        status = "unknown"
        first = row[0] if row else ""
        if "status-ok" in first or "● Run" in first or "● Ready" in first or "● OK" in first:
            status = "run ok ready"
        elif "status-off" in first or "○ Stop" in first or "○ Off" in first:
            status = "stop off"
        elif "status-err" in first or "✕" in first:
            status = "error"
        elif "status-warn" in first or "Maint" in first or "Running" in first:
            status = "warn maint running"
        tds = "".join(f"<td>{c}</td>" for c in row)
        trs.append(f'<tr data-status="{status}" data-filter="{plain}">{tds}</tr>')
    return f"""
<div class="card">
  <table class="res" data-interactive="1">
    <thead><tr>{th}</tr></thead>
    <tbody>{"".join(trs)}</tbody>
  </table>
</div>"""


def btn(label: str, *, primary: bool = False, danger: bool = False, modal: str | None = None, href: str | None = None) -> str:
    cls = "btn"
    if primary:
        cls += " btn-primary"
    if danger:
        cls += " btn-danger"
    if href:
        return f'<a class="{cls}" href="{href}">{label}</a>'
    if modal:
        return f'<button type="button" class="{cls}" data-open-modal="{modal}">{label}</button>'
    return f'<button type="button" class="{cls}">{label}</button>'


def link(label: str, modal: str | None = None, href: str | None = None, danger: bool = False) -> str:
    cls = "btn-link danger" if danger else "btn-link"
    if href:
        return f'<a class="{cls}" href="{href}">{label}</a>'
    if modal:
        return f'<button type="button" class="{cls}" data-open-modal="{modal}">{label}</button>'
    return f'<span class="{cls}">{label}</span>'


def acts(*parts: str) -> str:
    return " · ".join(parts)


def tabs(items: list[tuple[str, str, str]], *, vertical: bool = False, layout_class: str = "") -> str:
    """items: (id, label, panel_html). First tab is active."""
    tab_cls = "tabs tabs-vertical" if vertical else "tabs"
    tab_btns = []
    panels = []
    for i, (tid, label, html) in enumerate(items):
        active = " active" if i == 0 else ""
        hidden = "" if i == 0 else " hidden"
        tab_btns.append(f'<button type="button" class="{active.strip()}" data-tab="{tid}">{label}</button>')
        panels.append(f'<div class="panel" data-panel="{tid}"{hidden}>{html}</div>')
    if vertical and layout_class == "settings":
        return f"""
<div data-tabs class="settings-layout">
  <div class="{tab_cls}">{"".join(tab_btns)}</div>
  <div>{"".join(panels)}</div>
</div>"""
    return f"""
<div data-tabs>
  <div class="{tab_cls}">{"".join(tab_btns)}</div>
  {"".join(panels)}
</div>"""


def modal(
    mid: str,
    title: str,
    body: str,
    *,
    primary: str = "Confirm",
    danger: bool = False,
    wide: bool = False,
    cancel: str = "Cancel",
    hidden: bool = True,
) -> str:
    pcls = "btn btn-danger" if danger else "btn btn-primary"
    wide_cls = " wide" if wide else ""
    hid = " hidden" if hidden else ""
    return f"""
<div class="modal-backdrop" id="{mid}"{hid}>
  <div class="modal{wide_cls}" role="dialog" aria-modal="true" aria-labelledby="{mid}-title">
    <div class="modal-h">
      <h2 id="{mid}-title">{title}</h2>
      <button type="button" class="btn" data-close-modal aria-label="Close">×</button>
    </div>
    <div class="modal-b">{body}</div>
    <div class="modal-f">
      <button type="button" class="btn" data-close-modal>{cancel}</button>
      <button type="button" class="{pcls}" data-close-modal>{primary}</button>
    </div>
  </div>
</div>"""


def field(label: str, control: str) -> str:
    return f'<div class="field"><label>{label}</label>{control}</div>'


def kv(rows: list[tuple[str, str]]) -> str:
    items = "".join(f"<dt>{k}</dt><dd>{v}</dd>" for k, v in rows)
    return f'<dl class="kv">{items}</dl>'


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print("wrote", path.relative_to(ROOT))


# ── shared modal library (injected into shell pages) ─────────────────

def common_modals() -> str:
    """Popup modals available from any shell page via data-open-modal."""
    m = []

    m.append(modal(
        "m-stop-vm", "Stop virtual machine",
        """
        <p>Stop <strong>nextcloud</strong> on prod-node-01?</p>
        <div class="alert alert-info">Guest ACPI shutdown · timeout 120s · then force power off if needed.</div>
        <div class="alert alert-ok">Preflight: OK — no blockers</div>
        """
        + field("Reason (audit)", '<input placeholder="Optional note for audit log"/>'),
        primary="Stop VM",
    ))
    m.append(modal(
        "m-start-vm", "Start virtual machine",
        """
        <p>Start <strong>win11-sandbox</strong> on prod-node-03?</p>
        <div class="alert alert-ok">Preflight: host has capacity (CPU 12%, mem 30%).</div>
        """
        + field("Host", '<select><option>prod-node-03 (current)</option><option>Automatic</option><option>prod-node-01</option></select>'),
        primary="Start VM",
    ))
    m.append(modal(
        "m-restart-vm", "Restart virtual machine",
        """
        <p>Restart <strong>gitlab-runner</strong>?</p>
        <div class="alert alert-warn">Guest is in error state. Soft reboot may hang — force reset available after 60s.</div>
        """,
        primary="Restart",
    ))
    m.append(modal(
        "m-delete-vm", "Delete virtual machine",
        """
        <p>Permanently delete <strong>win11-sandbox</strong> and its boot disk?</p>
        <div class="alert alert-warn">Snapshots will be destroyed. This cannot be undone.</div>
        """
        + field('Type <code class="inline">DELETE</code> to confirm', '<input placeholder="DELETE"/>'),
        primary="Delete VM", danger=True,
    ))
    m.append(modal(
        "m-migrate-vm", "Migrate virtual machine",
        """
        <p>Live-migrate <strong>nextcloud</strong> to another host.</p>
        """
        + field("Destination", '<select><option>prod-node-02</option><option>prod-node-04</option></select>')
        + field("Mode", '<select><option>Live (shared storage)</option><option>Cold</option></select>')
        + '<div class="alert alert-ok">Preflight: shared ZFS dataset reachable · network path OK</div>',
        primary="Start migration", wide=True,
    ))
    m.append(modal(
        "m-snapshot", "Create snapshot",
        field("Name", '<input value="manual-2026-07-16"/>')
        + field("Recursive", '<select><option>Yes</option><option>No</option></select>')
        + field("Target", '<select><option>nextcloud (VM + disks)</option><option>tank/vms/nextcloud only</option></select>')
        + '<div class="alert alert-info">Describe → preflight → confirm. Snapshot is crash-consistent unless guest agent quiscing is enabled.</div>',
        primary="Create snapshot",
    ))
    m.append(modal(
        "m-delete-snapshot", "Delete snapshot",
        """
        <p>Delete snapshot <strong>nextcloud@2026-07-15</strong>?</p>
        <div class="alert alert-warn">Dependent clones: none. This cannot be undone.</div>
        """
        + field('Type <code class="inline">DELETE</code>', '<input placeholder="DELETE"/>'),
        primary="Delete snapshot", danger=True,
    ))
    m.append(modal(
        "m-stop-container", "Stop container",
        """
        <p>Stop container <strong>redis-cache</strong>?</p>
        <div class="alert alert-ok">Preflight: OK · SIGTERM then SIGKILL after 10s</div>
        """,
        primary="Stop container",
    ))
    m.append(modal(
        "m-start-container", "Start container",
        "<p>Start container <strong>buildkit</strong> on prod-node-03?</p>",
        primary="Start container",
    ))
    m.append(modal(
        "m-stop-jail", "Stop jail",
        """
        <p>Stop jail <strong>pkg-mirror</strong>?</p>
        <div class="alert alert-info">jail -r · network interfaces detached</div>
        """,
        primary="Stop jail",
    ))
    m.append(modal(
        "m-start-jail", "Start jail",
        "<p>Start jail <strong>pkg-mirror</strong> on prod-node-01?</p>",
        primary="Start jail",
    ))
    m.append(modal(
        "m-add-host", "Add host",
        """
        <div class="stepper"><span class="step active">1 Connect</span><span class="step">2 Preflight</span><span class="step">3 Join</span></div>
        """
        + field("Hostname / IP", '<input placeholder="prod-node-06.local"/>')
        + field("Join token", '<input type="password" placeholder="••••••••"/>')
        + '<div class="alert alert-info">Preflight verifies agent version, TLS, and management network reachability.</div>',
        primary="Next · Preflight", wide=True,
    ))
    m.append(modal(
        "m-drain-host", "Drain host",
        """
        <p>Drain <strong>prod-node-01</strong> — evacuate VMs/jails before maintenance.</p>
        """
        + field("Target hosts", '<select><option>Automatic (cluster)</option><option>prod-node-02</option></select>')
        + field("Mode", '<select><option>Live migrate when possible</option><option>Stop then restart elsewhere</option></select>')
        + '<div class="alert alert-warn">12 VMs will be migrated. Estimated 18–40 minutes.</div>',
        primary="Start drain", wide=True,
    ))
    m.append(modal(
        "m-maint-host", "Enter maintenance",
        """
        <p>Mark <strong>prod-node-03</strong> as maintenance?</p>
        <div class="alert alert-info">New placements disabled. Existing workloads keep running unless drained first.</div>
        """
        + field("Note", '<input placeholder="Disk replacement"/>'),
        primary="Enter maintenance",
    ))
    m.append(modal(
        "m-exit-maint", "Exit maintenance",
        "<p>Return <strong>prod-node-03</strong> to Ready and accept new placements?</p>",
        primary="Exit maintenance",
    ))
    m.append(modal(
        "m-create-user", "Create user",
        field("Username", '<input placeholder="ops-charlie"/>')
        + field("Display name", '<input placeholder="Charlie Ops"/>')
        + field("Role", '<select><option>Operator</option><option>Admin</option><option>Auditor</option></select>')
        + field("Temporary password", '<input type="password"/>')
        + field("Require password change", '<select><option>Yes</option><option>No</option></select>'),
        primary="Create user",
    ))
    m.append(modal(
        "m-edit-user", "Edit user",
        field("Username", '<input value="ops-alice" disabled/>')
        + field("Role", '<select><option>Operator</option><option selected>Admin</option><option>Auditor</option></select>')
        + field("Status", '<select><option>Active</option><option>Disabled</option></select>'),
        primary="Save",
    ))
    m.append(modal(
        "m-disable-user", "Disable user",
        """
        <p>Disable <strong>audit-bob</strong>? Sessions will be revoked.</p>
        <div class="alert alert-warn">API keys owned by this user remain until rotated.</div>
        """,
        primary="Disable user", danger=True,
    ))
    m.append(modal(
        "m-create-role", "Create role",
        field("Name", '<input placeholder="BackupOperator"/>')
        + field("Capabilities", '<textarea>system.backups:write\nstorage.snapshot:write\n*:read</textarea>')
        + '<div class="alert alert-info">v1 may ship Roles as Users sub-tabs.</div>',
        primary="Create role", wide=True,
    ))
    m.append(modal(
        "m-api-key", "Create API key",
        field("Name", '<input value="ci-deploy"/>')
        + field("Owner", '<select><option>mlapointe (personal)</option><option>Service: ci</option></select>')
        + field("Expires", '<select><option>90 days</option><option>1 year</option><option>Never</option></select>')
        + '<div class="alert alert-warn">Secret is shown once after create. Store it in a vault.</div>',
        primary="Create key",
    ))
    m.append(modal(
        "m-backup-policy", "Backup policy",
        field("Name", '<input value="nightly-zfs"/>')
        + field("Schedule (cron)", '<input value="0 2 * * *"/>')
        + field("Targets", '<input value="tank/vms/*"/>')
        + field("Retention", '<input value="14 daily · 8 weekly"/>')
        + field("Destination", '<select><option>backup pool</option><option>offsite-repl</option></select>'),
        primary="Save policy", wide=True,
    ))
    m.append(modal(
        "m-backup-run", "Run backup now",
        """
        <p>Run policy <strong>nightly-zfs</strong> immediately?</p>
        <div class="alert alert-info">Creates task under Tasks · does not change schedule.</div>
        """,
        primary="Run backup",
    ))
    m.append(modal(
        "m-export-bundle", "Export support bundle",
        """
        <p>Collect logs, config (redacted secrets), cluster state, and recent tasks.</p>
        """
        + field("Include", '<select><option>Last 24h logs</option><option>Last 7d logs</option></select>')
        + '<div class="alert alert-ok">Bundle is encrypted at rest · download once</div>',
        primary="Generate bundle",
    ))
    m.append(modal(
        "m-maintenance-mode", "Cluster maintenance mode",
        """
        <p>Enable global maintenance mode? API writes (except admin break-glass) will be rejected.</p>
        """
        + field("Message for operators", '<input value="Planned maintenance until 04:00 UTC"/>'),
        primary="Enable maintenance", danger=True,
    ))
    m.append(modal(
        "m-mcp-disable", "Disable MCP server",
        """
        <p>Disable <strong>honcho</strong>? Tools disappear from agents until re-enabled.</p>
        <div class="alert alert-warn">In-flight tool calls may fail.</div>
        """,
        primary="Disable", danger=True,
    ))
    m.append(modal(
        "m-mcp-enable", "Enable MCP server",
        "<p>Enable <strong>operant</strong> and probe tools?</p>",
        primary="Enable &amp; probe",
    ))
    m.append(modal(
        "m-mcp-probe", "Probe MCP server",
        """
        <p>Probe <strong>honcho</strong> — handshake + list tools.</p>
        <div class="card card-pad mono" style="background:#0f172a;color:#86efac;margin-top:8px">
          handshake OK · protocol 2025-06-18<br/>
          tools: 30 · latency 42ms
        </div>
        """,
        primary="Done", cancel="Close",
    ))
    m.append(modal(
        "m-mcp-edit", "Edit MCP server",
        field("Name", '<input value="honcho"/>')
        + field("URL", '<input class="mono" value="https://mcp.honcho.example.lan/"/>')
        + field("Authorization", '<input type="password" value="••••••••" placeholder="Leave blank to keep"/>')
        + field("Timeout (tools)", '<input value="600"/>'),
        primary="Save", wide=True,
    ))
    m.append(modal(
        "m-webhook", "Create webhook",
        field("URL", '<input placeholder="https://hooks.example.lan/cloudbsd"/>')
        + field("Events", '<select multiple size="4"><option selected>task.failed</option><option selected>host.offline</option><option>vm.error</option><option>backup.failed</option></select>')
        + field("Secret", '<input type="password"/>'),
        primary="Create webhook", wide=True,
    ))
    m.append(modal(
        "m-ntp", "Add NTP server",
        field("Server", '<input placeholder="0.freebsd.pool.ntp.org"/>')
        + field("Prefer", '<select><option>No</option><option>Yes</option></select>'),
        primary="Add NTP server",
    ))
    m.append(modal(
        "m-join-token", "Create join token",
        field("Label", '<input value="rack-b-hosts"/>')
        + field("Expires", '<select><option>1 hour</option><option>24 hours</option><option>7 days</option></select>')
        + field("Max uses", '<input value="5"/>')
        + '<div class="alert alert-warn">Token shown once. Treat as a secret.</div>',
        primary="Generate token",
    ))
    m.append(modal(
        "m-join-token-result", "Join token created",
        """
        <p>Copy now — will not be shown again.</p>
        <div class="card card-pad mono" style="word-break:break-all">cbjoin_8f3a9c2e1b7d4a6f0e5c8b2a1d9f7e3c</div>
        """,
        primary="Copied", cancel="Close",
    ))
    m.append(modal(
        "m-change-password", "Change password",
        field("Current password", '<input type="password"/>')
        + field("New password", '<input type="password"/>')
        + field("Confirm", '<input type="password"/>'),
        primary="Update password",
    ))
    m.append(modal(
        "m-passkey", "Register passkey",
        """
        <p>Your browser will prompt for a security key or platform authenticator.</p>
        <div class="alert alert-info">Passkeys are personal (My Account), not cluster auth policy.</div>
        """,
        primary="Continue in browser",
    ))
    m.append(modal(
        "m-totp", "Set up authenticator (TOTP)",
        """
        <p>Scan with your authenticator app, then enter a code.</p>
        <div class="card card-pad" style="text-align:center;font-family:monospace">QR · JBSWY3DPEHPK3PXP</div>
        """
        + field("Verification code", '<input placeholder="123456"/>'),
        primary="Enable TOTP",
    ))
    m.append(modal(
        "m-recovery-codes", "Recovery codes",
        """
        <p>Store these codes offline. Each works once.</p>
        <div class="card card-pad mono">
          A1B2-C3D4<br/>E5F6-G7H8<br/>I9J0-K1L2<br/>M3N4-O5P6<br/>Q7R8-S9T0
        </div>
        <div class="alert alert-warn">Download or print now. Codes will not be shown again in full.</div>
        """,
        primary="I saved them", cancel="Close",
    ))
    m.append(modal(
        "m-revoke-session", "Revoke session",
        "<p>Revoke Safari session last active 2h ago? That device must sign in again.</p>",
        primary="Revoke", danger=True,
    ))
    m.append(modal(
        "m-edit-ips", "Edit IP addresses",
        field("Interface", '<select><option>vtnet0</option><option>vtnet1</option></select>')
        + field("Addresses", '<textarea>10.0.10.21/24\nfe80::1/64</textarea>')
        + '<div class="alert alert-warn">Preflight: changing management IP may disconnect this session.</div>',
        primary="Apply", wide=True,
    ))
    m.append(modal(
        "m-edit-lacp", "Edit LACP / bond",
        field("Bond", '<select><option>lagg0</option></select>')
        + field("Members", '<input value="igb0, igb1"/>')
        + field("LACP mode", '<select><option>active</option><option>passive</option></select>')
        + '<div class="alert alert-ok">Preflight: peer switch config assumed correct</div>',
        primary="Apply", wide=True,
    ))
    m.append(modal(
        "m-cancel-task", "Cancel task",
        """
        <p>Cancel <strong>ZFS send backup/nightly</strong>?</p>
        <div class="alert alert-warn">Partial receive may need cleanup on destination.</div>
        """,
        primary="Cancel task", danger=True,
    ))
    m.append(modal(
        "m-library-upload", "Upload to library",
        field("Type", '<select><option>ISO</option><option>Cloud image</option><option>Jail template</option></select>')
        + field("File", '<input type="file"/>')
        + field("Name", '<input placeholder="FreeBSD-14.3-RELEASE-amd64-disc1.iso"/>'),
        primary="Upload", wide=True,
    ))
    m.append(modal(
        "m-library-delete", "Delete library item",
        """
        <p>Delete <strong>ubuntu-24.04-cloudimg</strong>? 8 VMs reference this image as template source (clones unaffected).</p>
        """,
        primary="Delete", danger=True,
    ))
    m.append(modal(
        "m-scrub", "Start ZFS scrub",
        """
        <p>Start scrub on pool <strong>tank</strong>?</p>
        <div class="alert alert-info">I/O impact medium · estimated 4–6 hours</div>
        """,
        primary="Start scrub",
    ))
    m.append(modal(
        "m-clone-dataset", "Clone dataset",
        field("Source", '<input value="tank/vms/nextcloud@2026-07-15" disabled/>')
        + field("Clone path", '<input value="tank/vms/nextcloud-clone"/>'),
        primary="Clone",
    ))
    m.append(modal(
        "m-create-network", "Quick create network",
        field("Name", '<input value="vm-lab"/>')
        + field("CIDR", '<input value="10.0.50.0/24"/>')
        + field("Type", '<select><option>bridge</option><option>vlan</option></select>')
        + f'<p style="font-size:12px;color:var(--muted)">Or use full wizard: <a href="../wizards/network-create.html">Create network wizard</a></p>',
        primary="Create",
    ))
    m.append(modal(
        "m-delete-network", "Delete network",
        """
        <p>Delete network <strong>guest-vlan40</strong>?</p>
        <div class="alert alert-warn">3 attachments must be moved first. Preflight will block if still attached.</div>
        """,
        primary="Delete", danger=True,
    ))
    m.append(modal(
        "m-update-apply", "Apply updates",
        """
        <p>Apply agent update <strong>14.2-p3</strong> to prod-node-03?</p>
        <div class="alert alert-info">Rolling update · host enters brief maintenance · VMs stay running</div>
        """,
        primary="Apply update",
    ))
    m.append(modal(
        "m-mark-read", "Mark notifications read",
        "<p>Mark all notifications as read?</p>",
        primary="Mark all read",
    ))
    m.append(modal(
        "m-save-settings", "Save settings",
        """
        <p>Apply cluster identity changes?</p>
        <div class="alert alert-info">Some changes propagate via stream within a few seconds.</div>
        """,
        primary="Save",
    ))
    m.append(modal(
        "m-confirm-generic", "Confirm action",
        """
        <p>Proceed with the selected action?</p>
        <div class="alert alert-ok">Preflight: OK</div>
        """
        + field("Reason (audit)", '<input placeholder="Optional"/>'),
        primary="Confirm",
    ))
    m.append(modal(
        "m-ctrl-alt-del", "Send Ctrl+Alt+Del",
        "<p>Send Ctrl+Alt+Del to the guest console for <strong>nextcloud</strong>?</p>",
        primary="Send",
    ))

    # Session expired is a *page* (pages/session-expired.html), not a blocking
    # overlay injected on every shell page. Do not re-add m-frost here.

    return "\n".join(m)


def shell(
    title: str,
    body: str,
    *,
    active: str | None = None,
    bare: bool = False,
    depth: str = "pages",
    include_modals: bool = True,
) -> str:
    if depth == "root":
        css, js, index = "assets/mockup.css", "assets/mockup.js", "index.html"
        nav_rel = ""
    elif depth == "pages":
        css, js, index = "../assets/mockup.css", "../assets/mockup.js", "../index.html"
        nav_rel = "pages"
    else:
        css, js, index = "../assets/mockup.css", "../assets/mockup.js", "../index.html"
        nav_rel = "../pages/"

    if bare:
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>CloudBSD Admin — {title}</title>
  <link rel="stylesheet" href="{css}"/>
</head>
<body>
{body}
<script src="{js}"></script>
</body>
</html>
"""

    if depth != "pages" and depth != "root":
        side = sidebar_html(active, rel="../pages/")
    elif depth == "root":
        side = sidebar_html(active, rel="")
    else:
        side = sidebar_html(active, rel="pages")

    modals = common_modals() if include_modals else ""
    if depth != "pages":
        # login links inside any remaining modal copy
        modals = modals.replace('href="login.html"', 'href="../pages/login.html"')
        modals = modals.replace('href="session-expired.html"', 'href="../pages/session-expired.html"')

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>CloudBSD Admin — {title}</title>
  <link rel="stylesheet" href="{css}"/>
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
      <button type="button" class="btn-link" data-open-modal="m-mark-read" title="Notifications">🔔 2</button>
      <select style="padding:3px 6px;font-size:11px;border:1px solid #cbd5e1;border-radius:5px"><option>UTC</option></select>
      <a class="avatar" href="{'account.html' if depth == 'pages' else '../pages/account.html'}" title="My Account">M</a>
    </div>
  </header>
  <div class="body">
    <aside class="sidebar">{side}</aside>
    <main class="content">
{body}
      <p class="mock-note">HTML mockup · tabs + modals filled · MCP = plugins · .sisyphus/plans/html-mockups/</p>
    </main>
  </div>
</div>
{modals}
<script src="{js}"></script>
</body>
</html>
"""


# ── pages ────────────────────────────────────────────────────────────

def pages() -> dict[str, tuple[str, str, str]]:
    out: dict[str, tuple[str, str, str]] = {}

    out["dashboard"] = (
        "dashboard.html", "Dashboard",
        page_head(
            "Dashboard",
            'Cluster capacity · <span class="live">● live</span> · 2s ago',
            btn("Export support bundle", modal="m-export-bundle")
            + btn("Maintenance mode", danger=True, modal="m-maintenance-mode"),
        )
        + stats([("Hosts", "5"), ("VMs running", "39 / 47"), ("CPU", "62%"), ("Memory", "71%"), ("Alerts", "2")])
        + f"""
<div class="grid-2">
  <div class="card card-pad">
    <div style="font-weight:700;margin-bottom:10px">Actionable alerts</div>
    <div class="alert alert-warn">zpool tank: scrub deferred 14d — {link("Start scrub", modal="m-scrub")}</div>
    <div class="alert alert-info">Host prod-node-03 agent update available — {link("Apply", modal="m-update-apply")}</div>
  </div>
  <div class="card card-pad">
    <div style="font-weight:700;margin-bottom:10px">Recent tasks</div>
    {table(["Task", "State", "When"], [
        ["Snapshot nextcloud", '<span class="status-ok">OK</span>', "2m ago"],
        ["Migrate jellyfin → node-02", '<span class="status-ok">OK</span>', "1h ago"],
        ["Backup policy nightly", '<span class="status-warn">Running</span>', "now"],
    ])}
  </div>
</div>
<div class="card card-pad" style="margin-top:12px">
  <div style="font-weight:700;margin-bottom:8px">Capacity trend (mock)</div>
  <div class="spark"><span style="height:40%"></span><span style="height:55%"></span><span style="height:48%"></span><span style="height:70%"></span><span style="height:62%"></span><span style="height:75%"></span><span style="height:68%"></span><span style="height:80%"></span></div>
</div>
""",
    )

    out["vms"] = (
        "vms.html", "Virtual Machines",
        page_head(
            "Virtual Machines",
            '47 VMs across 5 hosts · <span class="live">● live</span> · <span data-live-ago>2s ago</span>',
            btn("+ Create VM", primary=True, href="../wizards/vm-create.html")
            + btn("Snapshot…", modal="m-snapshot"),
        )
        + stats([("Total", "47"), ("Running", "39"), ("Stopped", "6"), ("Error", "1"), ("Paused", "1")])
        + filter_bar("Filter VMs…", ["All", "Run", "Stop", "Error"])
        + table(
            ["Status", "Name", "OS", "Host", "vCPU", "RAM", "IPs", "Uptime", "Actions"],
            [
                ['<span class="status-ok">● Run</span>', '<a href="../detail/vm.html">nextcloud</a>', "FreeBSD 14", "prod-node-01", "4", "8 GB", "10.0.10.21", "14d",
                 acts(link("View", href="../detail/vm.html"), link("Console", href="console.html"), link("Stop", modal="m-stop-vm"), link("Migrate", modal="m-migrate-vm"))],
                ['<span class="status-ok">● Run</span>', "jellyfin", "Linux", "prod-node-02", "8", "16 GB", "10.0.10.22", "7d",
                 acts(link("View", href="../detail/vm.html"), link("Stop", modal="m-stop-vm"), link("Snapshot", modal="m-snapshot"))],
                ['<span class="status-off">○ Stop</span>', "win11-sandbox", "Windows", "prod-node-03", "4", "8 GB", "—", "—",
                 acts(link("Start", modal="m-start-vm"), link("Delete", modal="m-delete-vm", danger=True))],
                ['<span class="status-err">✕ Error</span>', "gitlab-runner", "Linux", "prod-node-02", "2", "4 GB", "10.0.10.30", "2h",
                 acts(link("Console", href="console.html"), link("Restart", modal="m-restart-vm"), link("Delete", modal="m-delete-vm", danger=True))],
            ],
        ),
    )

    out["containers"] = (
        "containers.html", "Containers",
        page_head("Containers", "OCI · podman · live",
                  btn("+ Create container", primary=True, href="../wizards/container-create.html"))
        + stats([("Total", "18"), ("Running", "14"), ("Exited", "3"), ("Restarting", "1")])
        + filter_bar("Filter containers…", ["All", "Running", "Exited"])
        + table(
            ["Status", "Name", "Image", "Host", "CPU", "Mem", "Actions"],
            [
                ['<span class="status-ok">●</span>', '<a href="../detail/container.html">redis-cache</a>', "redis:7", "prod-node-01", "2%", "128 MB",
                 acts(link("View", href="../detail/container.html"), link("Stop", modal="m-stop-container"), link("Logs", href="logs.html"))],
                ['<span class="status-ok">●</span>', "traefik", "traefik:v3", "prod-node-01", "4%", "64 MB",
                 acts(link("Stop", modal="m-stop-container"), link("Logs", href="logs.html"))],
                ['<span class="status-off">○</span>', "buildkit", "moby/buildkit", "prod-node-03", "—", "—",
                 acts(link("Start", modal="m-start-container"))],
            ],
        ),
    )

    out["jails"] = (
        "jails.html", "Jails",
        page_head("Jails", "FreeBSD jails", btn("+ Create jail", primary=True, href="../wizards/jail-create.html"))
        + stats([("Total", "12"), ("Running", "11"), ("Stopped", "1")])
        + filter_bar("Filter jails…", ["All", "Running", "Stopped"])
        + table(
            ["Status", "Name", "Release", "Host", "IPs", "Actions"],
            [
                ['<span class="status-ok">●</span>', '<a href="../detail/jail.html">pkg-mirror</a>', "14.2-RELEASE", "prod-node-01", "10.0.20.10",
                 acts(link("View", href="../detail/jail.html"), link("Stop", modal="m-stop-jail"), link("Shell", modal="m-confirm-generic"))],
                ['<span class="status-ok">●</span>', "dns-ns1", "14.2-RELEASE", "prod-node-02", "10.0.20.53",
                 acts(link("Stop", modal="m-stop-jail"))],
            ],
        ),
    )

    storage_datasets = (
        filter_bar("Filter datasets…", ["All", "VMs", "Jails", "System"])
        + table(
            ["Name", "Pool", "Used", "Avail", "Compression", "Actions"],
            [
                ['<a href="../detail/volume.html">tank/vms/nextcloud</a>', "tank", "120 GB", "2.1 TB", "lz4",
                 acts(link("View", href="../detail/volume.html"), link("Snapshot", modal="m-snapshot"), link("Clone", modal="m-clone-dataset"))],
                ["tank/jails", "tank", "80 GB", "2.1 TB", "lz4", acts(link("Snapshot", modal="m-snapshot"))],
                ["backup/nightly", "backup", "4.2 TB", "8 TB", "zstd", acts(link("Scrub", modal="m-scrub"))],
            ],
        )
    )
    storage_snaps = table(
        ["Snapshot", "Dataset", "Created", "Used", "Actions"],
        [
            ["nextcloud@2026-07-15", "tank/vms/nextcloud", "2026-07-15 02:00", "2.1 GB",
             acts(link("Clone", modal="m-clone-dataset"), link("Delete", modal="m-delete-snapshot", danger=True))],
            ["nextcloud@2026-07-14", "tank/vms/nextcloud", "2026-07-14 02:00", "1.8 GB",
             acts(link("Delete", modal="m-delete-snapshot", danger=True))],
            ["jails@weekly", "tank/jails", "2026-07-13", "400 MB", acts(link("Delete", modal="m-delete-snapshot", danger=True))],
        ],
    )
    storage_scrubs = (
        table(
            ["Pool", "Last scrub", "Errors", "Status", "Actions"],
            [
                ["tank", "14d ago", "0", '<span class="pill warn">Due</span>', link("Start scrub", modal="m-scrub")],
                ["backup", "2d ago", "0", '<span class="pill ok">OK</span>', link("Start scrub", modal="m-scrub")],
            ],
        )
        + '<div class="alert alert-info" style="margin-top:12px">Scrubs are scheduled under Settings → Storage defaults; run ad-hoc here.</div>'
    )

    out["storage"] = (
        "storage.html", "Storage",
        page_head("Storage", "ZFS pools · datasets · snapshots",
                  btn("+ Create volume", primary=True, href="../wizards/volume-create.html")
                  + btn("Snapshot…", modal="m-snapshot"))
        + stats([("Pools", "3"), ("Datasets", "48"), ("Snapshots", "210"), ("Used", "12.4 TB")])
        + tabs([
            ("datasets", "Datasets", storage_datasets),
            ("snapshots", "Snapshots", storage_snaps),
            ("scrubs", "Scrubs", storage_scrubs),
        ]),
    )

    net_list = table(
        ["Name", "Type", "CIDR", "VLAN", "Hosts", "Actions"],
        [
            ["vm-public", "bridge", "10.0.10.0/24", "—", "5",
             acts(link("Edit IPs", modal="m-edit-ips"), link("Delete", modal="m-delete-network", danger=True))],
            ["vm-storage", "bridge", "10.0.30.0/24", "—", "5", acts(link("Edit IPs", modal="m-edit-ips"))],
            ["guest-vlan40", "vlan", "10.40.0.0/22", "40", "3",
             acts(link("Edit", modal="m-create-network"), link("Delete", modal="m-delete-network", danger=True))],
        ],
    )
    net_map = """
<div class="card card-pad">
  <div style="font-weight:700;margin-bottom:10px">Topology (view mode)</div>
  <div style="height:280px;border:1px dashed #cbd5e1;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--muted);background:#f8fafc">
    [ Map canvas mock — bridges · VLANs · host uplinks ]
  </div>
  <p style="font-size:12px;color:var(--muted);margin:10px 0 0">Visualization only; IPAM stays on List / IP pools.</p>
</div>"""
    net_pools = table(
        ["Pool", "CIDR", "Used", "Free", "Actions"],
        [
            ["vm-public-pool", "10.0.10.0/24", "61", "193", link("Edit", modal="m-edit-ips")],
            ["storage-pool", "10.0.30.0/24", "12", "242", link("Edit", modal="m-edit-ips")],
            ["vlan40-pool", "10.40.0.0/22", "40", "984", link("Edit", modal="m-edit-ips")],
        ],
    )

    out["networks"] = (
        "networks.html", "Networks",
        page_head("Networks", "Bridges · VLANs · IP pools · map is a view",
                  btn("Map focus", modal="m-confirm-generic")
                  + btn("+ Create network", primary=True, href="../wizards/network-create.html")
                  + btn("Quick create", modal="m-create-network"))
        + stats([("Bridges", "4"), ("VLANs", "12"), ("IP pools", "3"), ("Attached", "61")])
        + tabs([
            ("list", "List", net_list),
            ("map", "Map", net_map),
            ("pools", "IP pools", net_pools),
        ]),
    )

    out["hosts"] = (
        "hosts.html", "Hosts",
        page_head(
            "Hosts",
            "Inventory · drain · maintenance · agent (not Cluster services)",
            btn("+ Add host", primary=True, modal="m-add-host")
            + btn("Join token", modal="m-join-token"),
        )
        + stats([("Hosts", "5"), ("Ready", "4"), ("Maintenance", "1"), ("Agent", "14.2")])
        + filter_bar("Filter hosts…", ["All", "Ready", "Maintenance", "Offline"])
        + table(
            ["Status", "Name", "CPU", "Memory", "VMs", "Agent", "Actions"],
            [
                ['<span class="status-ok">● Ready</span>', '<a href="../detail/host.html">prod-node-01</a>', "62%", "71%", "12", "14.2-p2",
                 acts(link("View", href="../detail/host.html"), link("Drain", modal="m-drain-host"), link("Maintenance", modal="m-maint-host"))],
                ['<span class="status-ok">● Ready</span>', "prod-node-02", "48%", "55%", "10", "14.2-p2",
                 acts(link("Drain", modal="m-drain-host"))],
                ['<span class="status-warn">◐ Maint</span>', "prod-node-03", "12%", "30%", "4", "14.1",
                 acts(link("Exit maint", modal="m-exit-maint"), link("Update", modal="m-update-apply"))],
            ],
        ),
    )

    out["cluster"] = (
        "cluster.html", "Cluster",
        page_head("Cluster", "Services only — membership, CARP/VIP, replication",
                  btn("Join token", modal="m-join-token")
                  + btn("Show token result", modal="m-join-token-result"))
        + f"""
<div class="grid-2">
  <div class="card card-pad">
    <div style="font-weight:700;color:#1d4ed8;text-transform:uppercase;font-size:11px;margin-bottom:10px">Membership</div>
    {kv([("Quorum", "<strong>3 / 5</strong> voting"), ("Policy", "majority · auto-rejoin on"), ("Witness", "none")])}
  </div>
  <div class="card card-pad">
    <div style="font-weight:700;color:#1d4ed8;text-transform:uppercase;font-size:11px;margin-bottom:10px">CARP / VIP</div>
    {kv([("VIP", '<span class="mono">10.0.0.10</span>'), ("Master", "prod-node-01"), ("advbase", "1")])}
  </div>
</div>
"""
        + tabs([
            ("jobs", "Cluster jobs", table(
                ["Job", "State", "Started", "Detail", "Actions"],
                [
                    ["replication-sync", '<span class="status-ok">OK</span>', "02:00 UTC", "lag 0s", "—"],
                    ["cert-rotate", '<span class="status-warn">Queued</span>', "—", "Sunday window", link("Run now", modal="m-confirm-generic")],
                ],
            )),
            ("events", "Events", table(
                ["Time", "Event", "Detail"],
                [
                    ["01:12", "quorum.ok", "3 voters"],
                    ["00:40", "vip.master", "prod-node-01"],
                    ["Yesterday", "node.joined", "prod-node-05"],
                ],
            )),
            ("replication", "Replication", """
<div class="card card-pad">
  """ + kv([("Mode", "async ZFS send/recv"), ("Target", "offsite-repl"), ("Last OK", "02:11 UTC"), ("Lag", "0s")]) + """
  <div style="margin-top:12px">""" + btn("Run sync now", modal="m-confirm-generic") + """</div>
</div>"""),
        ]),
    )

    out["tasks"] = (
        "tasks.html", "Tasks",
        page_head("Tasks", "Global long-running ops · stream-backed", "")
        + filter_bar("Filter tasks…", ["All", "Running", "OK", "Failed"])
        + table(
            ["State", "Task", "Target", "Started", "Duration", "Actions"],
            [
                ['<span class="status-warn">◐</span>', "ZFS send backup/nightly", "backup", "00:15", "41m",
                 acts(link("View", modal="m-confirm-generic"), link("Cancel", modal="m-cancel-task", danger=True))],
                ['<span class="status-ok">●</span>', "VM migrate jellyfin", "prod-node-02", "1h ago", "12m", link("View", modal="m-confirm-generic")],
                ['<span class="status-err">✕</span>', "Snapshot win11-sandbox", "prod-node-03", "3h ago", "12s",
                 acts(link("View", modal="m-confirm-generic"), link("Retry", modal="m-snapshot"))],
            ],
        ),
    )

    out["library"] = (
        "library.html", "Library",
        page_head("Content Library", "ISOs · templates · cloud images",
                  btn("+ Upload", primary=True, modal="m-library-upload"))
        + tabs([
            ("isos", "ISOs", table(
                ["Name", "Size", "Used by", "Actions"],
                [["FreeBSD-14.2-RELEASE-amd64-disc1.iso", "1.2 GB", "3 VMs",
                  acts(link("Use", href="../wizards/vm-create.html"), link("Delete", modal="m-library-delete", danger=True))]],
            )),
            ("images", "Images", table(
                ["Name", "Size", "Used by", "Actions"],
                [["ubuntu-24.04-cloudimg", "640 MB", "8 VMs",
                  acts(link("Use", href="../wizards/vm-create.html"), link("Delete", modal="m-library-delete", danger=True))]],
            )),
            ("templates", "Templates", table(
                ["Name", "Size", "Used by", "Actions"],
                [["jail-base-14.2", "320 MB", "5 jails",
                  acts(link("Use", href="../wizards/jail-create.html"), link("Delete", modal="m-library-delete", danger=True))]],
            )),
        ]),
    )

    out["users"] = (
        "users.html", "Users",
        page_head("Users", "Control-plane identities",
                  btn("+ Create user", primary=True, modal="m-create-user")
                  + btn("API key", modal="m-api-key"))
        + filter_bar("Filter users…", ["All", "Admin", "Operator", "Auditor"])
        + table(
            ["User", "Role", "2FA", "Last active", "Actions"],
            [
                ["mlapointe", "Admin", "TOTP", "now", acts(link("Edit", modal="m-edit-user"))],
                ["ops-alice", "Operator", "Passkey", "2h ago", acts(link("Edit", modal="m-edit-user"), link("Disable", modal="m-disable-user", danger=True))],
                ["audit-bob", "Auditor", "—", "1d ago", acts(link("Edit", modal="m-edit-user"), link("Disable", modal="m-disable-user", danger=True))],
            ],
        ),
    )

    out["roles"] = (
        "roles.html", "Roles",
        page_head("Roles", "RBAC · may ship as Users sub-tab in v1",
                  btn("+ Role", primary=True, modal="m-create-role"))
        + table(
            ["Role", "Users", "Capabilities", "Actions"],
            [
                ["Admin", "2", "all", link("Edit", modal="m-create-role")],
                ["Operator", "5", "workload:write, hosts:drain", link("Edit", modal="m-create-role")],
                ["Auditor", "1", "*:read", link("Edit", modal="m-create-role")],
            ],
        ),
    )

    out["logs"] = (
        "logs.html", "Logs",
        page_head("Logs", "Streaming buffer · time range · no Refresh chrome",
                  btn("Export slice", modal="m-export-bundle"))
        + """
<div class="filter-bar">
  <input type="search" placeholder="Search log lines…"/>
  <select style="padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px">
    <option>Last 15m</option><option>Last 1h</option><option>Last 24h</option>
  </select>
  <button type="button" class="chip active">All</button>
  <button type="button" class="chip">Error</button>
  <button type="button" class="chip">Warn</button>
</div>
<div class="card card-pad" style="background:#0f172a;color:#e2e8f0;min-height:360px">
  <div class="log-line"><span class="ts">02:11:04</span> <span class="info">INFO</span> agent heartbeat prod-node-01 ok</div>
  <div class="log-line"><span class="ts">02:11:08</span> <span class="warn">WARN</span> zfs scrub deferred on tank</div>
  <div class="log-line"><span class="ts">02:11:12</span> <span class="info">INFO</span> stream client connected peer=ui</div>
  <div class="log-line"><span class="ts">02:11:19</span> <span class="err">ERROR</span> vm gitlab-runner qemu exit 1</div>
  <div class="log-line"><span class="ts">02:11:22</span> <span class="info">INFO</span> mcp probe honcho tools=30</div>
</div>
""",
    )

    out["notifications"] = (
        "notifications.html", "Notifications",
        page_head("Notifications", "Inbox · routing under Account prefs",
                  btn("Mark all read", modal="m-mark-read"))
        + tabs([
            ("inbox", "Inbox", table(
                ["", "Message", "When", ""],
                [
                    ["●", "Backup nightly completed (backup/nightly)", "12m ago", link("Dismiss", modal="m-mark-read")],
                    ["●", "Agent update available on prod-node-03", "1h ago",
                     acts(link("Apply", modal="m-update-apply"), link("Dismiss", modal="m-mark-read"))],
                    ["", "User ops-alice created API key", "1d ago", ""],
                ],
            )),
            ("prefs", "Delivery prefs", f"""
<div class="card card-pad" style="max-width:520px">
  <p style="margin-top:0;color:var(--muted);font-size:12px">Personal routing — also under My Account → Preferences.</p>
  {field("Email digest", '<select><option>Daily</option><option>Immediate</option><option>Off</option></select>')}
  {field("Quiet hours", '<input value="22:00 – 07:00"/>')}
  {btn("Save", primary=True, modal="m-save-settings")}
</div>"""),
        ]),
    )

    out["audit"] = (
        "audit.html", "Audit",
        page_head("Audit", "Compliance trail · Observe",
                  btn("Export", modal="m-export-bundle"))
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

    # Settings — all tabs filled
    set_cluster = f"""
<div class="card card-pad">
  {field("Cluster name", '<input value="prod-lab"/>')}
  {field("Display name", '<input value="Production Lab"/>')}
  {field("Alert contact", '<input value="ops@example.lan"/>')}
  {btn("Save", primary=True, modal="m-save-settings")}
</div>"""
    set_auth = f"""
<div class="card card-pad">
  <p style="margin-top:0;font-size:12px;color:var(--muted)">Cluster auth methods — not personal 2FA (that is My Account).</p>
  {field("Password", '<select><option>Enabled</option><option>Disabled</option></select>')}
  {field("TOTP", '<select><option>Optional</option><option>Required</option><option>Off</option></select>')}
  {field("Passkeys", '<select><option>Enabled</option><option>Off</option></select>')}
  {field("LDAP", '<select><option>Disabled</option><option>Enabled</option></select>')}
  {field("Session max age", '<input value="12h"/>')}
  {field("Password policy", '<input value="min 12 · complexity on"/>')}
  {btn("Save", primary=True, modal="m-save-settings")}
</div>"""
    set_host = f"""
<div class="card card-pad">
  {field("Default timezone", '<input value="UTC"/>')}
  {field("DNS resolvers", '<input value="10.0.0.53, 1.1.1.1"/>')}
  {field("NTP servers", '<input value="0.freebsd.pool.ntp.org"/>')}
  <div style="margin-bottom:12px">{btn("+ Add NTP", modal="m-ntp")}</div>
  {field("Agent auto-update", '<select><option>Notify only</option><option>Auto patch</option><option>Off</option></select>')}
  {field("Log level default", '<select><option>info</option><option>debug</option></select>')}
  {btn("Save", primary=True, modal="m-save-settings")}
</div>"""
    set_net = f"""
<div class="card card-pad">
  {field("Cluster VIP / CARP", '<input class="mono" value="10.0.0.10"/>')}
  {field("Default bridge", '<input value="vm-public"/>')}
  {field("Default IP pool", '<input value="vm-public-pool"/>')}
  <div class="alert alert-info">Host NICs / LACP are on Host detail — not here.</div>
  {btn("Save", primary=True, modal="m-save-settings")}
</div>"""
    set_storage = f"""
<div class="card card-pad">
  {field("Snapshot retention default", '<input value="14 daily · 8 weekly"/>')}
  {field("Scrub schedule default", '<input value="0 3 * * 0"/>')}
  {field("Hide system volumes by default", '<select><option>Yes</option><option>No</option></select>')}
  {btn("Save", primary=True, modal="m-save-settings")}
</div>"""
    set_int = f"""
<div class="card card-pad">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
    <strong>Webhooks</strong>
    {btn("+ Webhook", primary=True, modal="m-webhook")}
  </div>
  {table(["URL", "Events", "Actions"], [
      ["https://hooks.example.lan/cb", "task.failed, host.offline", acts(link("Edit", modal="m-webhook"), link("Delete", modal="m-confirm-generic", danger=True))],
  ])}
  <div style="margin-top:16px">
    {field("Metrics exporter", '<select><option>Prometheus /metrics</option><option>Off</option></select>')}
    {btn("Save", primary=True, modal="m-save-settings")}
  </div>
</div>"""
    set_lic = f"""
<div class="card card-pad">
  {kv([("License", "Enterprise"), ("Status", '<span class="pill ok">Valid</span>'), ("Seats", "25 hosts"), ("Expires", "2027-01-15")])}
  {field("License key", '<input type="password" value="••••-••••-••••"/>')}
  {btn("Activate", primary=True, modal="m-save-settings")}
</div>"""
    set_adv = f"""
<div class="card card-pad">
  {field("Feature flags", '<textarea>mcp.registry=true\nconsole.novnc=true\ngpu.pools=false</textarea>')}
  {field("Admin rate limit", '<input value="120/min"/>')}
  {field("Error display", '<select><option>Operator detail</option><option>Generic only</option></select>')}
  {btn("Save", primary=True, modal="m-save-settings")}
  <div style="margin-top:16px">
    <a class="btn" href="session-expired.html">View session-expired page</a>
    <span style="font-size:12px;color:var(--muted);margin-left:8px">Rule #2 demo — normal page, not a blocking overlay</span>
  </div>
</div>"""

    out["settings"] = (
        "settings.html", "Settings",
        page_head("Settings", "System configuration only — not My Account",
                  btn("Save", primary=True, modal="m-save-settings"))
        + tabs([
            ("cluster", "Cluster identity", set_cluster),
            ("auth", "Authentication", set_auth),
            ("host", "Host / agent defaults", set_host),
            ("networking", "Networking", set_net),
            ("storage", "Storage defaults", set_storage),
            ("integrations", "Integrations", set_int),
            ("licensing", "Licensing", set_lic),
            ("advanced", "Advanced", set_adv),
        ], vertical=True, layout_class="settings"),
    )

    out["mcp"] = (
        "mcp.html", "MCP",
        page_head(
            "MCP",
            'MCP servers = extension system · was Plugins · <span class="live">● live</span>',
            btn("Probe all", modal="m-mcp-probe")
            + btn("+ Add MCP server", primary=True, href="../wizards/mcp-add.html"),
        )
        + stats([("Servers", "4"), ("Healthy", "3"), ("Tools", "112"), ("Disabled", "1")])
        + table(
            ["Status", "Name", "Transport", "Endpoint / command", "Tools", "Actions"],
            [
                ['<span class="status-ok">● OK</span>', '<a href="mcp-detail.html">honcho</a>', "HTTP",
                 '<span class="mono">https://mcp.honcho.example.lan/</span>', "30",
                 acts(link("View", href="mcp-detail.html"), link("Probe", modal="m-mcp-probe"),
                      link("Edit", modal="m-mcp-edit"), link("Disable", modal="m-mcp-disable", danger=True))],
                ['<span class="status-ok">● OK</span>', "cluster-bridge", "HTTP",
                 '<span class="mono">https://127.0.0.1:8787/mcp</span>', "48",
                 acts(link("Probe", modal="m-mcp-probe"), link("Disable", modal="m-mcp-disable", danger=True))],
                ['<span class="status-ok">● OK</span>', "hexstrike-local", "stdio",
                 '<span class="mono">python hexstrike_mcp.py …</span>', "150",
                 acts(link("Probe", modal="m-mcp-probe"), link("Disable", modal="m-mcp-disable", danger=True))],
                ['<span class="status-off">○ Off</span>', "operant", "stdio",
                 '<span class="mono">npx -y operant-mcp</span>', "—",
                 acts(link("Enable", modal="m-mcp-enable"), link("Edit", modal="m-mcp-edit"))],
            ],
        )
        + '<p style="font-size:11px;color:var(--muted);margin-top:10px">MCP replaces Plugins. Register servers; tools feed agents and optional UI actions.</p>',
    )

    mcp_conn = f"""
<div class="grid-2">
  <div class="card card-pad">
    <div style="font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;margin-bottom:10px">Connection</div>
    {kv([("URL", '<span class="mono">https://mcp.honcho.example.lan/</span>'),
         ("Auth", "Bearer ••••CeE_XI (masked)"),
         ("Header", "X-Honcho-User-Name: mlapointe"),
         ("Timeout", "30s startup · 600s tools")])}
    <div style="margin-top:12px">{btn("Edit", modal="m-mcp-edit")}</div>
  </div>
  <div class="card card-pad">
    <div style="font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;margin-bottom:10px">Health</div>
    {kv([("Protocol", "2025-06-18"), ("Server", "Honcho MCP Server 3.0.0"),
         ("Last probe", "4s ago"), ("Tools", "30 discovered")])}
    <div style="margin-top:12px">{btn("Probe", modal="m-mcp-probe")}</div>
  </div>
</div>"""
    mcp_tools = table(
        ["Tool", "Description", "Actions"],
        [
            ['<span class="mono">honcho__chat</span>', "Dialectic query about a peer", link("Try", modal="m-confirm-generic")],
            ['<span class="mono">honcho__list_peers</span>', "List workspace peers", link("Try", modal="m-confirm-generic")],
            ['<span class="mono">honcho__inspect_workspace</span>', "Workspace summary", link("Try", modal="m-confirm-generic")],
            ['<span class="mono">honcho__create_session</span>', "Create session", link("Try", modal="m-confirm-generic")],
        ],
    )
    mcp_logs = """
<div class="card card-pad" style="background:#0f172a;color:#e2e8f0;min-height:200px">
  <div class="log-line"><span class="ts">02:11:01</span> <span class="info">INFO</span> probe ok tools=30</div>
  <div class="log-line"><span class="ts">02:10:55</span> <span class="info">INFO</span> tool honcho__list_peers 12ms</div>
  <div class="log-line"><span class="ts">02:09:00</span> <span class="warn">WARN</span> slow tool honcho__chat 2.1s</div>
</div>"""

    out["mcp-detail"] = (
        "mcp-detail.html", "MCP server detail",
        """<div class="breadcrumb">MCP / <strong>honcho</strong></div>"""
        + page_head(
            "honcho",
            'HTTP · streamable · <span class="status-ok">handshake OK</span>',
            btn("Probe", modal="m-mcp-probe")
            + btn("Edit", modal="m-mcp-edit")
            + btn("Disable", danger=True, modal="m-mcp-disable"),
        )
        + tabs([
            ("connection", "Connection", mcp_conn),
            ("tools", "Tools", mcp_tools),
            ("logs", "Probe log", mcp_logs),
        ]),
    )

    sys_backups = (
        page_head("Backups", "Policies and job runs",
                  btn("+ Policy", primary=True, modal="m-backup-policy")
                  + btn("Restore wizard", href="../wizards/restore.html"))
        + table(
            ["Policy", "Schedule", "Last run", "Status", "Actions"],
            [
                ["nightly-zfs", "0 2 * * *", "today 02:00", '<span class="status-ok">OK</span>',
                 acts(link("Run", modal="m-backup-run"), link("Edit", modal="m-backup-policy"))],
                ["weekly-full", "0 3 * * 0", "Sun 03:00", '<span class="status-ok">OK</span>',
                 acts(link("Run", modal="m-backup-run"), link("Edit", modal="m-backup-policy"))],
            ],
        )
        + '<div style="margin-top:12px;font-weight:700">Recent runs</div>'
        + table(
            ["Started", "Policy", "Duration", "Result"],
            [
                ["today 02:00", "nightly-zfs", "41m", "OK"],
                ["yesterday 02:00", "nightly-zfs", "38m", "OK"],
            ],
        )
    )
    sys_updates = (
        page_head("Updates", "Agent · MCP packages · FreeBSD patches", btn("Check now", modal="m-confirm-generic"))
        + table(
            ["Component", "Current", "Available", "Host", "Actions"],
            [
                ["Agent", "14.2-p2", "14.2-p3", "prod-node-03", link("Apply", modal="m-update-apply")],
                ["Agent", "14.2-p2", "—", "prod-node-01", "Up to date"],
                ["MCP: honcho", "3.0.0", "—", "cluster", "—"],
                ["FreeBSD base", "14.2", "14.2-p1 advisory", "all", link("Details", modal="m-confirm-generic")],
            ],
        )
    )
    sys_diag = (
        page_head("Diagnostics", "Auth · preflight · connections · MCP health", "")
        + stats([("Backend", "UP"), ("Stream", "OK"), ("MCP", "3/4"), ("Preflight", "OK")])
        + table(
            ["Check", "Result", "Detail", "Actions"],
            [
                ["Auth methods", "OK", "password, TOTP, passkey", "—"],
                ["Preflight service", "OK", "latency 12ms", link("Run suite", modal="m-confirm-generic")],
                ["CARP VIP", "OK", "10.0.0.10 master node-01", "—"],
                ["MCP honcho", "OK", "30 tools", link("Probe", modal="m-mcp-probe")],
                ["MCP operant", "Off", "disabled", link("Enable", modal="m-mcp-enable")],
            ],
        )
    )
    sys_exports = (
        page_head("Exports", "Support bundle · not theme vanity exports",
                  btn("Generate support bundle", primary=True, modal="m-export-bundle"))
        + table(
            ["Bundle", "Created", "Size", "Actions"],
            [
                ["support-2026-07-15.tar.enc", "yesterday", "48 MB", link("Download", modal="m-confirm-generic")],
            ],
        )
    )
    sys_maint = (
        page_head("Maintenance", "Drain-all · maintenance mode · break-glass", "")
        + f"""
<div class="grid-2">
  <div class="card card-pad">
    <strong>Cluster maintenance mode</strong>
    <p style="font-size:12px;color:var(--muted)">Rejects non-admin writes while enabled.</p>
    {btn("Enable maintenance mode", danger=True, modal="m-maintenance-mode")}
  </div>
  <div class="card card-pad">
    <strong>Drain all hosts</strong>
    <p style="font-size:12px;color:var(--muted)">Emergency evacuate — use with care.</p>
    {btn("Drain all…", danger=True, modal="m-drain-host")}
  </div>
</div>
"""
    )

    out["system"] = (
        "system.html", "System",
        page_head("System", "Ops hub — not preferences", "")
        + tabs([
            ("backups", "Backups", sys_backups),
            ("updates", "Updates", sys_updates),
            ("diagnostics", "Diagnostics", sys_diag),
            ("exports", "Exports", sys_exports),
            ("maintenance", "Maintenance", sys_maint),
        ]),
    )

    # keep system-diagnostics as deep link alias content
    out["system-diagnostics"] = (
        "system-diagnostics.html", "System · Diagnostics",
        page_head("System", "Ops hub", "")
        + tabs([
            ("diagnostics", "Diagnostics", sys_diag),
            ("backups", "Backups", sys_backups),
            ("updates", "Updates", sys_updates),
            ("exports", "Exports", sys_exports),
            ("maintenance", "Maintenance", sys_maint),
        ]),
    )

    out["about"] = (
        "about.html", "About",
        page_head("About", "Product versions · license · support",
                  btn("License", href="settings.html#licensing"))
        + f"""
<div class="card card-pad" style="max-width:520px">
  {kv([
      ("Product", "CloudBSD Admin"),
      ("UI", "Angular 20 (planned) · HTML mockups"),
      ("Agent", "14.2-p2"),
      ("License", "Enterprise · valid"),
      ("MCP servers", "4 registered"),
  ])}
</div>
""",
    )

    acc_profile = f"""
<div class="card card-pad" style="max-width:520px">
  {field("Display name", '<input value="Mark LaPointe"/>')}
  {field("Email", '<input value="mark@example.lan"/>')}
  {btn("Save", primary=True, modal="m-save-settings")}
</div>"""
    acc_security = f"""
<div class="card card-pad" style="max-width:560px">
  <div class="field"><label>Password</label>{btn("Change password", modal="m-change-password")}</div>
  <div class="field"><label>Two-factor (TOTP)</label>
    <div>Enabled · {btn("Manage", modal="m-totp")} · {btn("Recovery codes", modal="m-recovery-codes")}</div>
  </div>
  <div class="field"><label>Passkeys</label>
    <div>1 registered · {btn("Add passkey", modal="m-passkey")}</div>
  </div>
  <div class="field"><label>Active sessions</label>
    <table class="res">
      <tr><td>Firefox · this device</td><td>now</td><td></td></tr>
      <tr><td>Safari · 2h ago</td><td>2h</td><td>{link("Revoke", modal="m-revoke-session", danger=True)}</td></tr>
    </table>
  </div>
</div>"""
    acc_appearance = f"""
<div class="card card-pad" style="max-width:520px">
  {field("Theme", '<select><option>System</option><option>Light</option><option>Dark</option><option>High contrast</option></select>')}
  {field("Density", '<select><option>Cozy</option><option>Compact</option><option>Extra compact</option></select>')}
  {field("Font size", '<select><option>Default</option><option>Large</option></select>')}
  <div class="alert alert-info">Appearance applies instantly (personal) — not cluster Settings.</div>
  {btn("Save", primary=True, modal="m-save-settings")}
</div>"""
    acc_prefs = f"""
<div class="card card-pad" style="max-width:520px">
  {field("Locale", '<input value="en-US"/>')}
  {field("Timezone", '<input value="UTC"/>')}
  {field("Date format", '<select><option>ISO 8601</option><option>US</option><option>EU</option></select>')}
  {field("Notification quiet hours", '<input value="22:00 – 07:00"/>')}
  {btn("Save", primary=True, modal="m-save-settings")}
</div>"""
    acc_tokens = f"""
<div class="card card-pad">
  <div style="display:flex;justify-content:space-between;margin-bottom:10px">
    <strong>Personal API tokens</strong>
    {btn("+ Token", primary=True, modal="m-api-key")}
  </div>
  {table(["Name", "Created", "Expires", "Actions"], [
      ["laptop-dev", "2026-06-01", "2026-09-01", link("Revoke", modal="m-confirm-generic", danger=True)],
      ["ci-readonly", "2026-05-12", "Never", link("Revoke", modal="m-confirm-generic", danger=True)],
  ])}
</div>"""

    out["account"] = (
        "account.html", "My Account",
        page_head("My Account", "Personal surface — not Admin Settings", "")
        + tabs([
            ("profile", "Profile", acc_profile),
            ("security", "Security", acc_security),
            ("appearance", "Appearance", acc_appearance),
            ("preferences", "Preferences", acc_prefs),
            ("tokens", "API tokens", acc_tokens),
        ]),
    )

    out["console"] = (
        "console.html", "VM console",
        """<div class="breadcrumb"><a href="vms.html">VMs</a> / nextcloud / <strong>Console</strong></div>"""
        + page_head("Console · nextcloud", "noVNC · keyboard capture",
                    btn("Send Ctrl+Alt+Del", modal="m-ctrl-alt-del")
                    + btn("Disconnect", href="vms.html"))
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

    for code, title, msg in [
        ("403", "403 Forbidden", "You do not have permission to view this resource."),
        ("404", "404 Not found", "That page does not exist in this cluster."),
        ("500", "500 Server error", "The control plane hit an unexpected error."),
        ("503", "503 Maintenance", "Cluster is in maintenance mode."),
    ]:
        out[f"error-{code}"] = (
            f"error-{code}.html", title,
            f"""
<div class="card card-pad" style="max-width:480px;margin:40px auto;text-align:center">
  <div style="font-size:40px;font-weight:700;color:var(--muted)">{code}</div>
  <h1 style="margin:8px 0">{title}</h1>
  <p style="color:var(--muted)">{msg}</p>
  <a class="btn btn-primary" href="dashboard.html">Back to Dashboard</a>
  {"<div style='margin-top:12px'>" + btn("Exit maintenance", modal="m-maintenance-mode") + "</div>" if code == "503" else ""}
</div>
""",
        )

    # Session expired — dedicated page (Rule #2), not a blocking frost overlay on every screen
    out["session-expired"] = (
        "session-expired.html",
        "Session expired",
        """
<div class="card card-pad" style="max-width:480px;margin:48px auto;text-align:center">
  <div style="width:48px;height:48px;border-radius:50%;background:#fef3c7;color:#92400e;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:22px;font-weight:700">!</div>
  <h1 style="margin:0 0 8px;font-size:22px">Session expired</h1>
  <p style="color:var(--muted);margin:0 0 16px;line-height:1.5">
    Your session is no longer valid. Sign in again to continue managing this cluster.
  </p>
  <div class="alert alert-info" style="text-align:left;margin-bottom:16px">
    <strong>Product rule #2</strong> — on real auth/session failure the app frosts the UI and returns the operator to
    <code class="inline">/login</code>. This mock is a <em>page</em> so planners can review the copy and layout without a global blocking overlay.
  </div>
  <div class="actions" style="justify-content:center">
    <a class="btn btn-primary" href="login.html">Sign in</a>
    <a class="btn" href="dashboard.html">Back to mockups</a>
  </div>
</div>
""",
    )

    return out


def detail_pages() -> dict[str, tuple[str, str, str]]:
    """filename -> (title, nav_active, body)"""
    vm_overview = f"""
<div class="grid-2">
  <div class="card card-pad">
    <div style="font-weight:700;margin-bottom:8px">Resources</div>
    {kv([("vCPU", "4"), ("RAM", "8 GB"), ("Boot disk", "tank/vms/nextcloud 120 GB"), ("Host", "prod-node-01")])}
  </div>
  <div class="card card-pad">
    <div style="font-weight:700;margin-bottom:8px">Guest</div>
    {kv([("IP", "10.0.10.21"), ("OS", "FreeBSD 14.2"), ("Uptime", "14d 02:11"), ("Agent", "guest tools OK")])}
  </div>
</div>"""
    vm_disks = table(
        ["Disk", "Dataset", "Size", "Actions"],
        [
            ["disk0", "tank/vms/nextcloud", "120 GB", acts(link("Snapshot", modal="m-snapshot"), link("Resize", modal="m-confirm-generic"))],
            ["disk1", "tank/vms/nextcloud-data", "500 GB", acts(link("Snapshot", modal="m-snapshot"))],
        ],
    )
    vm_net = table(
        ["NIC", "Network", "MAC", "IP", "Actions"],
        [["vtnet0", "vm-public", "58:9c:fc:0a:10:15", "10.0.10.21", link("Edit IPs", modal="m-edit-ips")]],
    )
    vm_snaps = table(
        ["Snapshot", "Created", "Used", "Actions"],
        [
            ["@2026-07-15", "2026-07-15 02:00", "2.1 GB",
             acts(link("Clone", modal="m-clone-dataset"), link("Delete", modal="m-delete-snapshot", danger=True))],
            ["@2026-07-14", "2026-07-14 02:00", "1.8 GB", link("Delete", modal="m-delete-snapshot", danger=True)],
        ],
    ) + f'<div style="margin-top:10px">{btn("+ Snapshot", primary=True, modal="m-snapshot")}</div>'
    vm_metrics = """
<div class="card card-pad metric-bars">
  <div class="row"><label>CPU</label><div class="bar"><i style="width:42%"></i></div><span>42%</span></div>
  <div class="row"><label>Memory</label><div class="bar"><i style="width:68%"></i></div><span>68%</span></div>
  <div class="row"><label>Disk r/w</label><div class="bar"><i style="width:25%"></i></div><span>25 MB/s</span></div>
  <div class="row"><label>Net</label><div class="bar"><i style="width:15%"></i></div><span>12 Mbps</span></div>
</div>"""
    vm_events = table(
        ["Time", "Event", "Detail"],
        [
            ["02:10", "vm.stop requested", "mlapointe"],
            ["Yesterday", "snapshot", "@2026-07-15"],
            ["Jul 10", "migrate", "node-02 → node-01"],
        ],
    )

    host_overview = f"""
<div class="grid-3">
  <div class="card card-pad"><div class="label" style="font-size:10px;font-weight:600;color:var(--muted)">CPU</div><div style="font-size:20px;font-weight:700">62%</div><div class="progress"><span style="width:62%"></span></div></div>
  <div class="card card-pad"><div class="label" style="font-size:10px;font-weight:600;color:var(--muted)">Memory</div><div style="font-size:20px;font-weight:700">71%</div><div class="progress"><span style="width:71%"></span></div></div>
  <div class="card card-pad"><div class="label" style="font-size:10px;font-weight:600;color:var(--muted)">VMs</div><div style="font-size:20px;font-weight:700">12</div></div>
</div>
<div class="card card-pad" style="margin-top:12px">
  {kv([("Agent", "14.2-p2"), ("OS", "FreeBSD 14.2-RELEASE"), ("Uptime", "14d 02:11"), ("Status", "Ready")])}
</div>"""
    host_net = table(
        ["Interface", "Type", "Speed", "IPs", "Actions"],
        [
            ["igb0", "physical", "10G", "10.0.0.11/24", link("Edit", modal="m-edit-ips")],
            ["igb1", "physical", "10G", "—", link("Edit", modal="m-edit-ips")],
            ["lagg0", "LACP", "20G", "10.0.0.11/24", link("Edit LACP", modal="m-edit-lacp")],
        ],
    )
    host_storage = table(
        ["Pool", "Health", "Used", "Actions"],
        [
            ["tank", "ONLINE", "4.2T / 8T", link("Scrub", modal="m-scrub")],
            ["boot", "ONLINE", "12G / 100G", "—"],
        ],
    )
    host_gpu = """
<div class="card card-pad">
  <p>No GPU pools on this host. <span class="pill">feature-flag gpu.pools=false</span></p>
</div>"""
    host_vms = table(
        ["VM", "Status", "Actions"],
        [
            ['<a href="vm.html">nextcloud</a>', "Run", link("Stop", modal="m-stop-vm")],
            ["gitlab-ci", "Run", link("Stop", modal="m-stop-vm")],
        ],
    )
    host_ct = table(["Container", "Status", "Actions"], [["redis-cache", "Run", link("Stop", modal="m-stop-container")]])
    host_jails = table(["Jail", "Status", "Actions"], [["pkg-mirror", "Run", link("Stop", modal="m-stop-jail")]])

    return {
        "vm.html": (
            "VM detail", "vms",
            """<div class="breadcrumb"><a href="../pages/vms.html">VMs</a> / <strong>nextcloud</strong></div>"""
            + page_head(
                "nextcloud",
                'FreeBSD 14 · prod-node-01 · <span class="status-ok">● running</span> · <span class="live">● live</span>',
                btn("Console", href="../pages/console.html")
                + btn("Stop", modal="m-stop-vm")
                + btn("Snapshot", modal="m-snapshot")
                + btn("Migrate", modal="m-migrate-vm")
                + btn("Delete", danger=True, modal="m-delete-vm"),
            )
            + tabs([
                ("overview", "Overview", vm_overview),
                ("disks", "Disks", vm_disks),
                ("network", "Network", vm_net),
                ("snapshots", "Snapshots", vm_snaps),
                ("metrics", "Metrics", vm_metrics),
                ("events", "Events", vm_events),
            ]),
        ),
        "host.html": (
            "Host detail", "hosts",
            """<div class="breadcrumb"><a href="../pages/hosts.html">Hosts</a> / <strong>prod-node-01</strong></div>"""
            + page_head(
                "prod-node-01",
                'Ready · agent 14.2-p2 · <span class="live">● live</span>',
                btn("Drain", modal="m-drain-host")
                + btn("Maintenance", modal="m-maint-host")
                + btn("Update", modal="m-update-apply"),
            )
            + tabs([
                ("overview", "Overview", host_overview),
                ("network", "Network", host_net),
                ("storage", "Storage", host_storage),
                ("gpus", "GPUs", host_gpu),
                ("vms", "VMs", host_vms),
                ("containers", "Containers", host_ct),
                ("jails", "Jails", host_jails),
            ]),
        ),
        "container.html": (
            "Container detail", "containers",
            page_head("redis-cache", "Image redis:7 · prod-node-01 · running",
                      btn("Stop", modal="m-stop-container") + btn("Logs", href="../pages/logs.html"))
            + tabs([
                ("overview", "Overview", f'<div class="card card-pad">{kv([("Image", "redis:7"), ("Restart", "unless-stopped"), ("Ports", "6379/tcp"), ("Host", "prod-node-01")])}</div>'),
                ("network", "Network", table(["Network", "IP"], [["vm-public", "10.0.10.40"]])),
                ("logs", "Logs", '<div class="card card-pad mono" style="background:#0f172a;color:#86efac;min-height:160px">1:M 02:11:00 Ready to accept connections</div>'),
                ("events", "Events", table(["Time", "Event"], [["02:00", "start"], ["Yesterday", "image pull"]])),
            ]),
        ),
        "jail.html": (
            "Jail detail", "jails",
            page_head("pkg-mirror", "14.2-RELEASE · prod-node-01",
                      btn("Stop", modal="m-stop-jail") + btn("Shell", modal="m-confirm-generic"))
            + tabs([
                ("overview", "Overview", f'<div class="card card-pad">{kv([("Release", "14.2-RELEASE"), ("IP", "10.0.20.10"), ("vnet", "on"), ("Host", "prod-node-01")])}</div>'),
                ("network", "Network", table(["Iface", "IP"], [["epair0b", "10.0.20.10"]])),
                ("mounts", "Mounts", table(["Source", "Dest", "Opts"], [["tank/jails/pkg-mirror", "/", "nullfs"], ["/usr/ports", "/usr/ports", "ro"]])),
                ("events", "Events", table(["Time", "Event"], [["01:00", "start"]])),
            ]),
        ),
        "volume.html": (
            "Volume detail", "storage",
            page_head("tank/vms/nextcloud", "dataset · lz4 · 120 GB used",
                      btn("Snapshot", modal="m-snapshot")
                      + btn("Clone", modal="m-clone-dataset")
                      + btn("Scrub pool", modal="m-scrub"))
            + tabs([
                ("overview", "Overview", f'<div class="card card-pad">{kv([("Pool", "tank"), ("Compression", "lz4"), ("Atime", "off"), ("Used", "120 GB"), ("Avail", "2.1 TB")])}</div>'),
                ("snapshots", "Snapshots", vm_snaps),
                ("scrubs", "Scrubs", table(["Started", "Errors", "Status"], [["14d ago", "0", "Finished"], ["—", "—", "Due"]])),
                ("permissions", "Permissions", table(["Principal", "Access"], [["cluster-admin", "full"], ["ops-alice", "snapshot"]])),
            ]),
        ),
    }


def components() -> dict[str, tuple[str, str]]:
    c = {}
    c["resource-table.html"] = (
        "ResourceTableComponent",
        page_head("ResourceTableComponent", "Shared list + density", "")
        + """
<div class="actions" style="margin-bottom:10px">
  <button type="button" class="chip active" data-density="cozy">Cozy</button>
  <button type="button" class="chip" data-density="compact">Compact</button>
  <button type="button" class="chip" data-density="extra">Extra</button>
</div>
"""
        + filter_bar("Search…", ["All", "Running", "Stopped"])
        + """
<div class="card" data-density-target>
  <table class="res">
    <thead><tr><th><input type="checkbox"/></th><th>Status ⇅</th><th>Name ⇅</th><th>Host</th><th>Actions</th></tr></thead>
    <tbody>
      <tr><td><input type="checkbox"/></td><td class="status-ok">●</td><td>nextcloud</td><td>prod-node-01</td><td>"""
        + acts(link("Stop", modal="m-stop-vm"), link("Snapshot", modal="m-snapshot"))
        + """</td></tr>
      <tr><td><input type="checkbox"/></td><td class="status-ok">●</td><td>jellyfin</td><td>prod-node-02</td><td>"""
        + link("Stop", modal="m-stop-vm")
        + """</td></tr>
    </tbody>
  </table>
  <div class="card-pad" style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted)">
    <span>1–2 of 47</span><span>Per page: 50 · ‹ Prev · Next ›</span>
  </div>
</div>
""",
    )
    c["empty-state.html"] = (
        "EmptyStateComponent",
        page_head("EmptyStateComponent", "No-data / no-match", "")
        + f"""
<div class="grid-2">
  <div class="card empty"><h3>No virtual machines</h3><p>Create a VM to get started.</p>{btn("+ Create VM", primary=True, href="../wizards/vm-create.html")}</div>
  <div class="card empty"><h3>No matches</h3><p>No VMs match “gpu-only”.</p>{btn("Clear filters")}</div>
</div>
""",
    )
    c["stat-cards.html"] = ("StatCardsRowComponent", page_head("StatCardsRowComponent", "KPI tiles", "") + stats([("Total", "47"), ("Running", "39"), ("Stopped", "6"), ("Error", "1"), ("Paused", "1")]))
    c["filter-bar.html"] = ("FilterBarComponent", page_head("FilterBarComponent", "Search + chips", "") + filter_bar("Filter…", ["All", "Run", "Stop", "Error"]))
    c["detail-shell.html"] = (
        "DetailShellComponent",
        """<div class="breadcrumb">VMs / <strong>nextcloud</strong></div>"""
        + page_head("nextcloud", "running", btn("Stop", modal="m-stop-vm") + btn("Snapshot", modal="m-snapshot"))
        + tabs([
            ("overview", "Overview", '<div class="card card-pad">Overview content</div>'),
            ("disks", "Disks", '<div class="card card-pad">Disks content</div>'),
            ("network", "Network", '<div class="card card-pad">Network content</div>'),
        ]),
    )
    c["wizard-shell.html"] = (
        "WizardShellComponent",
        page_head("WizardShellComponent", "Stepper chrome", "")
        + """
<div class="stepper">
  <span class="step done">1 Template</span><span class="step active">2 Identity</span>
  <span class="step">3 Resources</span><span class="step">4 Review</span>
</div>
<div class="card card-pad" style="max-width:560px">
"""
        + field("Name", '<input value="nextcloud-02"/>')
        + f'<div class="actions" style="justify-content:flex-end">{btn("Back")} {btn("Next", primary=True)}</div></div>',
    )
    c["live-indicator.html"] = (
        "LiveIndicatorComponent",
        page_head("LiveIndicatorComponent", "Stream primary", "")
        + '<div class="card card-pad"><p><span class="live">● live</span> · updated 2s ago</p>'
        + '<p style="font-size:12px;color:var(--muted)">Session expiry is a page, not a modal: '
        '<a href="../pages/session-expired.html">session-expired.html</a></p></div>',
    )
    c["capability-menu.html"] = (
        "CapabilityActionMenu",
        page_head("CapabilityActionMenu", "After preflight", "")
        + f"""
<div class="card card-pad">
  <p>Preflight for <strong>Stop VM nextcloud</strong>:</p>
  <div class="alert alert-ok">OK — no blockers</div>
  <div class="actions">{btn("Cancel")} {btn("Stop VM…", primary=True, modal="m-stop-vm")}</div>
</div>
""",
    )
    c["sidebar.html"] = (
        "SidebarComponent",
        page_head("SidebarComponent", "IA groups", "")
        + '<div class="card card-pad"><p>Workload · Access · Observe · Configure · Operate</p>'
        + "<p><strong>MCP</strong> under Configure. Status not top-level.</p></div>",
    )
    c["header.html"] = (
        "HeaderComponent",
        page_head("HeaderComponent", "Brand · host · notif · avatar", "")
        + f"""
<div class="card" style="overflow:hidden">
  <div class="header" style="position:static">
    <div class="logo">C</div><span class="brand">CloudBSD Admin</span>
    <span class="host-chip">prod-node-01.local</span>
    <div class="header-right">
      <span class="live">● live</span>
      {link("🔔 2", modal="m-mark-read")}
      <div class="avatar">M</div>
    </div>
  </div>
</div>
""",
    )
    c["density.html"] = (
        "DensityService",
        page_head("DensityService", "CSS vars", "")
        + """
<div class="actions" style="margin-bottom:12px">
  <button type="button" class="chip active" data-density="cozy">Cozy</button>
  <button type="button" class="chip" data-density="compact">Compact</button>
  <button type="button" class="chip" data-density="extra">Extra</button>
</div>
<div class="card" data-density-target>
  <table class="res"><thead><tr><th>Name</th><th>Host</th></tr></thead>
  <tbody><tr><td>nextcloud</td><td>prod-node-01</td></tr><tr><td>jellyfin</td><td>prod-node-02</td></tr></tbody></table>
</div>
""",
    )
    return c


def modals_gallery() -> dict[str, tuple[str, str]]:
    """Standalone modal gallery pages — each shows one modal open."""
    specs = [
        ("confirm-action.html", "ConfirmActionModal", "m-stop-vm", "Primary mutation confirm"),

        ("add-host.html", "AddHostDialog", "m-add-host", "Join host wizard-ish"),
        ("create-user.html", "CreateUserModal", "m-create-user", "Access"),
        ("api-key-create.html", "CreateApiKeyModal", "m-api-key", "API key"),
        ("backup-create.html", "BackupCreateModal", "m-backup-policy", "Backup policy"),
        ("snapshot.html", "ManualSnapshotModal", "m-snapshot", "Snapshot"),
        ("migrate-vm.html", "MigrateVmModal", "m-migrate-vm", "Live migrate"),
        ("delete-vm.html", "DeleteVmModal", "m-delete-vm", "Destructive confirm"),
        ("drain-host.html", "DrainHostModal", "m-drain-host", "Host drain"),
        ("mcp-edit.html", "McpEditModal", "m-mcp-edit", "Edit MCP server"),
        ("webhook.html", "WebhookModal", "m-webhook", "Integrations"),
        ("ntp.html", "NtpModal", "m-ntp", "Host defaults"),
        ("join-token.html", "JoinTokenModal", "m-join-token", "Cluster join"),
        ("recovery-codes.html", "RecoveryCodesModal", "m-recovery-codes", "Account security"),
        ("passkey.html", "PasskeyModal", "m-passkey", "Passkey register"),
        ("edit-ips.html", "EditIpsModal", "m-edit-ips", "Network edit + preflight"),
        ("edit-lacp.html", "EditLacpModal", "m-edit-lacp", "LACP bond"),
        ("export-bundle.html", "ExportBundleModal", "m-export-bundle", "Support bundle"),
        ("user-menu.html", "UserMenuDropdown", None, "dropdown"),
        ("notifications-dropdown.html", "NotificationsDropdown", None, "dropdown"),
    ]
    out = {}
    for fname, title, mid, blurb in specs:
        if mid is None:
            # dropdown demos
            if "user-menu" in fname:
                body = page_head(title, blurb, "") + """
<div class="card" style="max-width:240px;margin-left:auto">
  <div class="card-pad" style="border-bottom:1px solid var(--border)"><strong>mlapointe</strong><div style="font-size:11px;color:var(--muted)">Admin</div></div>
  <nav style="padding:6px">
    <a href="../pages/account.html" style="display:block;padding:8px 10px;color:#334155">Profile</a>
    <a href="../pages/account.html#security" style="display:block;padding:8px 10px;color:#334155">Security</a>
    <a href="../pages/account.html#tokens" style="display:block;padding:8px 10px;color:#334155">API tokens</a>
    <a href="../pages/about.html" style="display:block;padding:8px 10px;color:#334155">About</a>
    <hr style="border:0;border-top:1px solid var(--border)"/>
    <a href="../pages/login.html" style="display:block;padding:8px 10px;color:#b91c1c">Sign out</a>
  </nav>
</div>"""
            else:
                body = page_head(title, blurb, "") + f"""
<div class="card" style="max-width:320px;margin-left:auto">
  <div class="card-pad" style="font-weight:700;border-bottom:1px solid var(--border)">Notifications</div>
  <div class="card-pad" style="border-bottom:1px solid #f1f5f9">Backup nightly completed <div style="font-size:11px;color:var(--muted)">12m ago</div></div>
  <div class="card-pad" style="border-bottom:1px solid #f1f5f9">Agent update on node-03 <div style="font-size:11px;color:var(--muted)">1h ago</div></div>
  <div class="card-pad"><a href="../pages/notifications.html">View all</a> · {link("Mark read", modal="m-mark-read")}</div>
</div>"""
        else:
            body = (
                page_head(title, blurb + f" · modal id <code class='inline'>{mid}</code>",
                          btn("Open modal", primary=True, modal=mid))
                + f'<p style="font-size:12px;color:var(--muted)">Gallery page — click <strong>Open modal</strong> to preview. '
                f'</p>'
            )
        out[fname] = (title, body)
    return out


def wizards() -> dict[str, tuple[str, str]]:
    w = {}
    w["vm-create.html"] = (
        "Create VM wizard",
        page_head("Create virtual machine", "5-step wizard", "")
        + tabs([
            ("template", "1 Template", field("Template / ISO", '<select><option>FreeBSD-14.2 ISO</option><option>ubuntu-24.04-cloudimg</option></select>')
             + f'<div class="actions" style="justify-content:flex-end"><button type="button" class="btn btn-primary" data-wiz-next>Next →</button></div>'),
            ("identity", "2 Identity", field("Name", '<input value="nextcloud-02" id="wiz-vm-name"/>')
             + field("Description", '<textarea>Secondary Nextcloud</textarea>')
             + f'<div class="actions" style="justify-content:flex-end"><button type="button" class="btn" data-wiz-back>← Back</button> <button type="button" class="btn btn-primary" data-wiz-next>Next →</button></div>'),
            ("resources", "3 Resources", field("vCPU", '<input value="4"/>') + field("RAM (GB)", '<input value="8"/>')
             + field("Host", '<select><option>Automatic</option><option>prod-node-01</option></select>')
             + f'<div class="actions" style="justify-content:flex-end"><button type="button" class="btn" data-wiz-back>← Back</button> <button type="button" class="btn btn-primary" data-wiz-next>Next →</button></div>'),
            ("storage", "4 Storage / net", field("Disk GB", '<input value="120"/>')
             + field("Network", '<select><option>vm-public</option></select>')
             + f'<div class="actions" style="justify-content:flex-end"><button type="button" class="btn" data-wiz-back>← Back</button> <button type="button" class="btn btn-primary" data-wiz-next>Next →</button></div>'),
            ("review", "5 Review", f"""
<div class="card card-pad">{kv([("Name", "nextcloud-02"), ("vCPU/RAM", "4 / 8 GB"), ("Disk", "120 GB"), ("Network", "vm-public")])}
<div class="alert alert-ok">Preflight: capacity OK · click Create to simulate submit</div>
<div class="actions" style="justify-content:flex-end"><button type="button" class="btn" data-wiz-back>← Back</button> {btn("Create VM", primary=True, modal="m-confirm-generic")}</div>
</div>"""),
        ]),
    )
    w["mcp-add.html"] = (
        "Add MCP server",
        page_head("Add MCP server", "Replaces plugin install wizard", "")
        + tabs([
            ("transport", "1 Transport", """
<div class="grid-3">
  <div class="transport-card selected"><div style="font-weight:700">HTTP</div><div style="font-size:11px;color:var(--muted);margin-top:4px">Streamable HTTP</div></div>
  <div class="transport-card"><div style="font-weight:700">SSE</div><div style="font-size:11px;color:var(--muted);margin-top:4px">Server-Sent Events</div></div>
  <div class="transport-card"><div style="font-weight:700">stdio</div><div style="font-size:11px;color:var(--muted);margin-top:4px">Local command</div></div>
</div>"""),
            ("connection", "2 Connection", field("Name", '<input value="honcho"/>')
             + field("URL", '<input class="mono" value="https://mcp.honcho.example.lan/"/>')
             + field("Authorization", '<input type="password" value="secret"/>')),
            ("probe", "3 Probe &amp; enable", f"""
<div class="alert alert-ok">Probe preview: handshake OK · 30 tools</div>
{btn("Save &amp; enable", primary=True, href="../pages/mcp.html")}
"""),
        ]),
    )
    w["container-create.html"] = (
        "Create container",
        page_head("Create container", "Image → review", "")
        + tabs([
            ("image", "1 Image", field("Image", '<input value="redis:7"/>')),
            ("identity", "2 Identity", field("Name", '<input value="redis-cache-2"/>')),
            ("resources", "3 Resources", field("CPU", '<input value="1"/>') + field("Memory", '<input value="256m"/>')),
            ("review", "4 Review", btn("Create", primary=True, modal="m-confirm-generic")),
        ]),
    )
    w["jail-create.html"] = (
        "Create jail",
        page_head("Create jail", "Template → review", "")
        + tabs([
            ("template", "1 Template", field("Release", '<select><option>14.2-RELEASE</option></select>')),
            ("identity", "2 Identity", field("Name", '<input value="pkg-mirror-2"/>')),
            ("resources", "3 Resources", field("IP", '<input value="10.0.20.11"/>')),
            ("review", "4 Review", btn("Create", primary=True, modal="m-confirm-generic")),
        ]),
    )
    w["volume-create.html"] = (
        "Create volume",
        page_head("Create volume", "Basics → review", "")
        + tabs([
            ("basics", "1 Basics", field("Path", '<input value="tank/vms/new"/>')),
            ("props", "2 Properties", field("Compression", '<select><option>lz4</option><option>zstd</option></select>')),
            ("review", "3 Review", btn("Create", primary=True, modal="m-confirm-generic")),
        ]),
    )
    w["network-create.html"] = (
        "Create network",
        page_head("Create network", "Subnet → review", "")
        + tabs([
            ("subnet", "1 Subnet", field("Name", '<input value="vm-lab"/>') + field("CIDR", '<input value="10.0.50.0/24"/>')),
            ("dhcp", "2 DHCP", field("DHCP", '<select><option>Off</option><option>On</option></select>')),
            ("review", "3 Review", btn("Create", primary=True, modal="m-confirm-generic")),
        ]),
    )
    w["onboarding.html"] = (
        "Onboarding",
        page_head("Welcome", "Day-1 onboarding", "")
        + tabs([
            ("welcome", "1 Welcome", "<p>Welcome to CloudBSD Admin.</p>" + btn("Next", primary=True)),
            ("cluster", "2 Cluster", field("Cluster name", '<input value="prod-lab"/>') + btn("Join token", modal="m-join-token")),
            ("resource", "3 First resource", btn("Create VM", href="vm-create.html") + " " + btn("Skip")),
            ("done", "4 Done", '<div class="alert alert-ok">You are ready.</div>' + btn("Open Dashboard", primary=True, href="../pages/dashboard.html")),
        ]),
    )
    w["first-login.html"] = (
        "First login",
        page_head("Secure your account", "First-login wizard", "")
        + tabs([
            ("verify", "1 Verify", field("Email code", '<input placeholder="6-digit"/>')),
            ("secure", "2 Secure", btn("Set up TOTP", modal="m-totp") + " " + btn("Add passkey", modal="m-passkey")
             + " " + btn("Change password", modal="m-change-password")),
            ("prefs", "3 Preferences", field("Timezone", '<input value="UTC"/>')),
            ("codes", "4 Recovery codes", btn("Show recovery codes", primary=True, modal="m-recovery-codes")
             + " " + btn("Finish", href="../pages/dashboard.html")),
        ]),
    )
    w["restore.html"] = (
        "Restore",
        page_head("Restore", "Pick → target → review", "")
        + tabs([
            ("pick", "1 Pick", field("Backup", '<select><option>nightly-zfs · today 02:00</option></select>')),
            ("target", "2 Target", field("Restore to", '<select><option>Original path</option><option>New dataset…</option></select>')),
            ("review", "3 Review", btn("Start restore", primary=True, modal="m-confirm-generic")),
        ]),
    )
    return w


def login_page_fixed() -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>CloudBSD Admin — Login</title>
  <link rel="stylesheet" href="../assets/mockup.css"/>
</head>
<body>
<div class="auth-wrap">
  <div class="auth-card">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <div class="logo">C</div><strong>CloudBSD Admin</strong>
    </div>
    <h1>Sign in</h1>
    <p class="sub">Self-hosted FreeBSD control plane</p>
    {field("Username", '<input value="mlapointe"/>')}
    {field("Password", '<input type="password" value="••••••••"/>')}
    <button class="btn btn-primary" style="width:100%;margin-bottom:10px" onclick="location.href='dashboard.html'">Sign in</button>
    <button class="btn" style="width:100%;margin-bottom:10px" data-open-modal="m-passkey" type="button">Sign in with passkey</button>
    <div style="text-align:center;font-size:12px"><button type="button" class="btn-link" data-open-modal="m-change-password">Forgot password</button></div>
  </div>
</div>
{common_modals()}
<script src="../assets/mockup.js"></script>
</body>
</html>
"""


def build_index(catalog: dict) -> str:
    sections = []
    for section, items in catalog.items():
        cards = "".join(
            f'<a class="catalog-card" href="{href}"><h3>{title}</h3><p>{blurb}</p>'
            f'<span class="tag">{tag}</span></a>'
            for href, title, blurb, tag in items
        )
        sections.append(f'<div class="section-title">{section}</div><div class="catalog-grid">{cards}</div>')
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
  <p class="lead">Full tabs + popup modals experiment under <code>.sisyphus/plans/html-mockups/</code>.</p>
  <div class="banner">
    <strong>View:</strong> open this file in a browser.
    Tabs switch panels; buttons with actions open modals (Esc / backdrop to close).
    Regenerate: <code>python3 generate.py</code>
  </div>
  {"".join(sections)}
  <p class="mock-note">MCP = plugins · Account ≠ Settings ≠ System · Hosts ≠ Cluster</p>
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
        "Modals (gallery)": [],
        "Wizards": [],
        "Errors": [],
    }

    write(ROOT / "pages" / "login.html", login_page_fixed())
    catalog["Auth & shell"].append(("pages/login.html", "Login", "Sign-in + passkey/forgot modals", "AUTH"))

    for key, (fname, title, body) in pages().items():
        active = key
        if key.startswith("error-") or key == "session-expired":
            active = "dashboard"
            section = "Errors" if key.startswith("error-") else "Auth & shell"
        elif key in ("mcp", "mcp-detail", "settings", "system", "system-diagnostics", "about"):
            section = "Configure & Operate"
            active = {"mcp": "mcp", "mcp-detail": "mcp", "settings": "settings",
                      "system": "system", "system-diagnostics": "system", "about": "about"}[key]
        elif key == "account":
            section = "Auth & shell"
            active = None
        elif key in ("users", "roles", "logs", "notifications", "audit"):
            section = "Access & Observe"
        elif key == "console":
            section = "Workload"
            active = "vms"
        else:
            section = "Workload"

        write(ROOT / "pages" / fname, shell(title, body, active=active, depth="pages"))
        catalog[section].append((f"pages/{fname}", title, title, key[:12].upper()))

    for fname, (title, active, body) in detail_pages().items():
        write(ROOT / "detail" / fname, shell(title, body, active=active, depth="detail"))
        catalog["Detail shells"].append((f"detail/{fname}", title, "All tabs filled", "DETAIL"))

    for fname, (title, body) in components().items():
        write(ROOT / "components" / fname, shell(title, body, active=None, depth="components"))
        catalog["Shared components"].append((f"components/{fname}", title, "Shared building block", "COMP"))

    for fname, (title, body) in modals_gallery().items():
        write(ROOT / "modals" / fname, shell(title, body, active=None, depth="modals"))
        catalog["Modals (gallery)"].append((f"modals/{fname}", title, "Popup demo", "MODAL"))

    for fname, (title, body) in wizards().items():
        write(ROOT / "wizards" / fname, shell(title, body, active=None, depth="wizards"))
        catalog["Wizards"].append((f"wizards/{fname}", title, "Wizard with tab steps", "WIZ"))

    write(ROOT / "index.html", build_index(catalog))

    readme = """# HTML mockup experiment (tabs + modals)

Browsable HTML for CloudBSD Admin spine pages, **full tab panels**, and **popup modals**.

## View

```bash
xdg-open index.html
# or
python3 -m http.server 8765
```

## Behavior

- **Tabs**: click tab labels; content panels switch (hash updated when possible).
- **Modals**: action links/buttons use `data-open-modal="m-…"`. Esc or backdrop closes.
- **Shared modal library**: injected on every shell page (stop VM, drain host, MCP edit, etc.).

## Layout

| Path | Contents |
|------|----------|
| `pages/` | Spine screens with working tabs |
| `detail/` | VM/Host/Container/Jail/Volume — all tabs |
| `modals/` | Gallery pages auto-opening each modal |
| `components/` | Shared building blocks |
| `wizards/` | Multi-step wizards as tab steppers |
| `generate.py` | Source of truth — regenerate overwrites HTML |

## Regenerate

```bash
python3 generate.py
```
"""
    write(ROOT / "README.md", readme)
    print("done.")


if __name__ == "__main__":
    main()
