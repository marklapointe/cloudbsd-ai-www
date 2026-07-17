/* CloudBSD Admin mockup runtime — makes demos feel functional */
(function () {
  "use strict";

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  var STORE_KEY = "cba-mockup-state-v1";
  var ctx = { row: null, modalId: null, name: null };

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function saveState(s) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) { /* private mode */ }
  }
  function stateGet(k, d) { var s = loadState(); return s[k] !== undefined ? s[k] : d; }
  function stateSet(k, v) { var s = loadState(); s[k] = v; saveState(s); }

  /* ── Toasts ─────────────────────────────────────────── */
  function ensureToastHost() {
    var h = qs("#toast-host");
    if (h) return h;
    h = document.createElement("div");
    h.id = "toast-host";
    h.className = "toast-host";
    h.setAttribute("aria-live", "polite");
    document.body.appendChild(h);
    return h;
  }

  function toast(msg, kind) {
    kind = kind || "ok";
    var host = ensureToastHost();
    var el = document.createElement("div");
    el.className = "toast toast-" + kind;
    el.innerHTML = '<span class="toast-icon">' +
      (kind === "ok" ? "✓" : kind === "warn" ? "!" : kind === "err" ? "✕" : "ℹ") +
      "</span><span>" + msg + "</span>";
    host.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("show"); });
    setTimeout(function () {
      el.classList.remove("show");
      setTimeout(function () { el.remove(); }, 280);
    }, 3200);
  }

  /* ── Busy overlay on buttons ────────────────────────── */
  function withBusy(btn, ms, label) {
    if (!btn) return Promise.resolve();
    var prev = btn.textContent;
    btn.disabled = true;
    btn.classList.add("is-busy");
    if (label) btn.textContent = label;
    return new Promise(function (resolve) {
      setTimeout(function () {
        btn.disabled = false;
        btn.classList.remove("is-busy");
        btn.textContent = prev;
        resolve();
      }, ms || 700);
    });
  }

  /* ── Live clock ─────────────────────────────────────── */
  function initLive() {
    qsa(".live").forEach(function (el) {
      el.classList.add("live-pulse");
    });
    var tick = 0;
    setInterval(function () {
      tick++;
      qsa(".sub .live, .page-head .live, p.sub").forEach(function (el) {
        /* update "Ns ago" patterns in parent sub lines */
      });
      qsa("[data-live-ago]").forEach(function (el) {
        el.textContent = (tick % 8) + "s ago";
      });
      /* bump generic "· 2s ago" style text in .sub */
      qsa(".page-head .sub, .sub").forEach(function (el) {
        if (/ago/.test(el.textContent) || el.querySelector(".live")) {
          el.innerHTML = el.innerHTML.replace(/\d+s ago/g, (tick % 9) + "s ago");
          if (!/\d+s ago/.test(el.textContent) && el.querySelector(".live")) {
            /* append if missing */
          }
        }
      });
    }, 1000);

    /* footer uptime tick */
    var foot = qs(".sidebar-footer");
    if (foot) {
      var base = Date.now();
      setInterval(function () {
        var sec = Math.floor((Date.now() - base) / 1000);
        var el = foot.querySelector("div:last-child");
        if (el && /Uptime/.test(el.textContent)) {
          var m = 11 + Math.floor(sec / 60);
          var s = sec % 60;
          el.textContent = "Uptime: 14d 02:" + String(m).padStart(2, "0") +
            (s % 15 === 0 ? "" : "");
        }
      }, 15000);
    }
  }

  /* ── Sidebar active ─────────────────────────────────── */
  var active = document.body.getAttribute("data-nav");
  if (active) {
    qsa(".sidebar nav a").forEach(function (a) {
      if (a.getAttribute("data-id") === active) a.classList.add("active");
    });
  }

  /* ── Tabs ───────────────────────────────────────────── */
  function activateTab(wrap, id) {
    qsa("[data-tab]", wrap).forEach(function (t) {
      t.classList.toggle("active", t.getAttribute("data-tab") === id);
    });
    qsa("[data-panel]", wrap).forEach(function (p) {
      p.hidden = p.getAttribute("data-panel") !== id;
    });
    try {
      if (history.replaceState) {
        var u = new URL(window.location.href);
        u.hash = id;
        history.replaceState(null, "", u.pathname + u.search + u.hash);
      }
    } catch (e) { /* file:// */ }
  }

  qsa("[data-tabs]").forEach(function (wrap) {
    qsa("[data-tab]", wrap).forEach(function (tab) {
      tab.addEventListener("click", function (e) {
        e.preventDefault();
        activateTab(wrap, tab.getAttribute("data-tab"));
      });
    });
    var hash = (location.hash || "").replace(/^#/, "");
    if (hash && qs('[data-tab="' + hash + '"]', wrap)) activateTab(wrap, hash);

    /* Wizard Next/Back inside tab panels */
    wrap.addEventListener("click", function (e) {
      var next = e.target.closest("[data-wiz-next], .actions .btn-primary");
      var back = e.target.closest("[data-wiz-back]");
      var tabs = qsa("[data-tab]", wrap);
      if (!tabs.length) return;
      var cur = tabs.findIndex(function (t) { return t.classList.contains("active"); });
      if (cur < 0) cur = 0;

      /* only treat as wizard if buttons say Next or are marked */
      if (next && !next.getAttribute("data-open-modal") && !next.getAttribute("href")) {
        var label = (next.textContent || "").toLowerCase();
        if (next.hasAttribute("data-wiz-next") || /^next/.test(label.trim()) || label.indexOf("next") !== -1) {
          e.preventDefault();
          if (cur < tabs.length - 1) {
            activateTab(wrap, tabs[cur + 1].getAttribute("data-tab"));
            toast("Step " + (cur + 2) + " of " + tabs.length, "info");
          } else {
            toast("Review complete — ready to submit", "ok");
          }
        }
      }
      if (back || (e.target.closest(".actions .btn") && /^back/i.test((e.target.textContent || "").trim()))) {
        var b = back || e.target.closest(".actions .btn");
        if (b && !b.classList.contains("btn-primary") && !b.getAttribute("data-open-modal")) {
          var bl = (b.textContent || "").toLowerCase();
          if (back || bl.indexOf("back") !== -1) {
            e.preventDefault();
            if (cur > 0) activateTab(wrap, tabs[cur - 1].getAttribute("data-tab"));
          }
        }
      }
    });
  });

  /* ── Density ────────────────────────────────────────── */
  qsa("[data-density]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var d = btn.getAttribute("data-density");
      var table = qs("[data-density-target]");
      if (!table) return;
      table.classList.remove("density-compact", "density-extra");
      if (d === "compact") table.classList.add("density-compact");
      if (d === "extra") table.classList.add("density-extra");
      qsa("[data-density]").forEach(function (b) { b.classList.toggle("active", b === btn); });
      stateSet("density", d);
      toast("Density: " + d, "info");
    });
  });
  var savedDensity = stateGet("density", null);
  if (savedDensity) {
    var db = qs('[data-density="' + savedDensity + '"]');
    if (db) db.click();
  }

  /* ── Filter bars (search + chips) ───────────────────── */
  function rowText(tr) {
    return (tr.getAttribute("data-filter") || tr.textContent || "").toLowerCase();
  }

  function applyFilters(bar) {
    var scope = bar.closest(".panel, .content, [data-tabs], main") || document;
    var tables = qsa("table.res", scope);
    /* prefer table immediately following filter bar */
    var card = bar.nextElementSibling;
    while (card && !card.querySelector && card.tagName) card = card.nextElementSibling;
    var table = bar.parentElement && qs("table.res", bar.parentElement);
    if (!table && card) table = qs("table.res", card);
    if (!table && tables.length) {
      /* find closest table after bar in DOM order */
      var all = qsa("table.res");
      var found = null;
      all.forEach(function (t) {
        if (bar.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING) {
          if (!found) found = t;
        }
      });
      table = found || tables[0];
    }
    if (!table) return;

    var q = (qs("input[type='search'], input", bar) || {}).value || "";
    q = q.toLowerCase().trim();
    var chip = qs(".chip.active", bar);
    var chipText = (chip && (chip.getAttribute("data-chip") || chip.textContent.trim()) || "all").toLowerCase();

    var rows = qsa("tbody tr", table);
    var shown = 0;
    rows.forEach(function (tr) {
      var text = rowText(tr);
      var st = (tr.getAttribute("data-status") || "") + " " + text;
      var okQ = !q || text.indexOf(q) !== -1;
      var okC = true;
      if (chipText && chipText !== "all") {
        if (chipText === "run" || chipText === "running") {
          okC = /\brun\b|running|status-ok/.test(st) && !/error|✕/.test(tr.innerHTML);
          if (/status-err|✕ Error/.test(tr.innerHTML)) okC = false;
          if (/status-off|○ Stop/.test(tr.innerHTML)) okC = false;
        } else if (chipText === "stop" || chipText === "exited" || chipText === "stopped") {
          okC = /status-off|○ stop|stopped|exited|off/.test(st);
        } else if (chipText === "error" || chipText === "failed") {
          okC = /status-err|✕|error|fail/.test(st);
        } else if (chipText === "ready") {
          okC = /ready/.test(st);
        } else if (chipText === "maintenance" || chipText === "maint") {
          okC = /maint|maintenance|warn/.test(st);
        } else if (chipText === "admin" || chipText === "operator" || chipText === "auditor") {
          okC = text.indexOf(chipText) !== -1;
        } else if (chipText === "auth") {
          okC = /auth/.test(text);
        } else if (chipText === "mutations") {
          okC = /vm\.|host\.|backup|snapshot|migrate|delete|create/.test(text);
        } else {
          okC = text.indexOf(chipText) !== -1 || st.indexOf(chipText) !== -1;
        }
      }
      var show = okQ && okC;
      tr.hidden = !show;
      tr.classList.toggle("filter-hide", !show);
      if (show) shown++;
    });

    var note = qs(".filter-count", bar);
    if (!note) {
      note = document.createElement("span");
      note.className = "filter-count";
      bar.appendChild(note);
    }
    note.textContent = shown + " / " + rows.length;
  }

  qsa(".filter-bar").forEach(function (bar) {
    var input = qs("input", bar);
    if (input) {
      input.addEventListener("input", function () { applyFilters(bar); });
    }
    qsa(".chip", bar).forEach(function (chip) {
      chip.addEventListener("click", function () {
        qsa(".chip", bar).forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        applyFilters(bar);
      });
    });
  });

  /* ── Modals ─────────────────────────────────────────── */
  function openModal(id, source) {
    var m = qs("#" + id);
    if (!m) {
      toast("Modal " + id + " not found", "err");
      return;
    }
    /* ensure every other overlay stays hidden (defense against CSS fights) */
    qsa(".modal-backdrop, .frost").forEach(function (el) {
      if (el !== m) {
        el.hidden = true;
        el.setAttribute("aria-hidden", "true");
      }
    });
    ctx.modalId = id;
    ctx.row = source ? source.closest("tr") : null;
    ctx.name = null;
    if (ctx.row) {
      var cells = qsa("td", ctx.row);
      /* name often 2nd column */
      if (cells[1]) ctx.name = cells[1].textContent.trim();
      ctx.row.classList.add("row-context");
    }
    /* personalize modal body with resource name */
    if (ctx.name) {
      qsa("strong", m).forEach(function (s) {
        if (!s.dataset.orig) s.dataset.orig = s.textContent;
        if (/nextcloud|win11|gitlab|redis|pkg-mirror|prod-node|honcho|jellyfin|buildkit|operant|nightly/i.test(s.dataset.orig) || s.dataset.orig.length < 40) {
          /* replace first resource-looking strong once per open */
        }
      });
      var first = qs(".modal-b p strong, .modal-b strong", m);
      if (first) first.textContent = ctx.name;
    }

    m.hidden = false;
    m.removeAttribute("aria-hidden");
    document.body.classList.add("modal-open");
    m.classList.add("modal-enter");
    setTimeout(function () { m.classList.remove("modal-enter"); }, 200);

    /* type-to-confirm */
    var confirmInput = qs(".modal-b input[placeholder='DELETE'], .modal-b input[placeholder=\"DELETE\"]", m);
    var primary = qs(".modal-f .btn-primary, .modal-f .btn-danger", m);
    if (confirmInput && primary) {
      primary.disabled = true;
      primary.classList.add("btn-disabled");
      confirmInput.value = "";
      confirmInput.oninput = function () {
        var ok = confirmInput.value.trim() === "DELETE";
        primary.disabled = !ok;
        primary.classList.toggle("btn-disabled", !ok);
      };
    } else if (primary) {
      primary.disabled = false;
      primary.classList.remove("btn-disabled");
    }

    var focusable = qs("button, [href], input, select, textarea", m);
    if (focusable) focusable.focus();
  }

  function closeModal(el) {
    var m = el && el.closest ? el.closest(".modal-backdrop, .frost") : el;
    if (!m) return;
    m.hidden = true;
    m.setAttribute("aria-hidden", "true");
    if (ctx.row) ctx.row.classList.remove("row-context");
    if (!qs(".modal-backdrop:not([hidden]), .frost:not([hidden])")) {
      document.body.classList.remove("modal-open");
    }
  }

  /* On load: force-hide every overlay (never leave dialogs blocking the page) */
  qsa(".modal-backdrop, .frost").forEach(function (el) {
    el.hidden = true;
    el.setAttribute("aria-hidden", "true");
  });

  function setRowStatus(tr, kind, label) {
    if (!tr) return;
    var cell = qs("td", tr);
    if (!cell) return;
    var map = {
      run: '<span class="status-ok">● Run</span>',
      stop: '<span class="status-off">○ Stop</span>',
      error: '<span class="status-err">✕ Error</span>',
      off: '<span class="status-off">○ Off</span>',
      ok: '<span class="status-ok">● OK</span>',
      maint: '<span class="status-warn">◐ Maint</span>',
      ready: '<span class="status-ok">● Ready</span>',
      running: '<span class="status-warn">◐ Running</span>'
    };
    cell.innerHTML = map[kind] || label || cell.innerHTML;
    tr.classList.add("row-flash");
    setTimeout(function () { tr.classList.remove("row-flash"); }, 900);
  }

  function bumpStat(labelMatch, delta) {
    qsa(".stat").forEach(function (st) {
      var lab = qs(".label", st);
      var val = qs(".value", st);
      if (!lab || !val) return;
      if (lab.textContent.toLowerCase().indexOf(labelMatch) === -1) return;
      var n = parseInt(val.textContent, 10);
      if (!isNaN(n)) val.textContent = String(Math.max(0, n + delta));
    });
  }

  function simulateProgress(container, doneMsg) {
    var bar = document.createElement("div");
    bar.className = "sim-progress";
    bar.innerHTML = '<div class="sim-progress-track"><i></i></div><div class="sim-progress-label">Working…</div>';
    container.appendChild(bar);
    var i = bar.querySelector("i");
    var pct = 0;
    return new Promise(function (resolve) {
      var t = setInterval(function () {
        pct += 8 + Math.random() * 12;
        if (pct >= 100) {
          pct = 100;
          clearInterval(t);
          bar.querySelector(".sim-progress-label").textContent = doneMsg || "Done";
          setTimeout(function () { bar.remove(); resolve(); }, 400);
        }
        i.style.width = pct + "%";
      }, 80);
    });
  }

  function runModalAction(modalId, primaryBtn) {
    var name = ctx.name || "resource";
    var row = ctx.row;
    var actions = {
      "m-stop-vm": function () {
        setRowStatus(row, "stop");
        bumpStat("running", -1);
        bumpStat("stopped", 1);
        toast("Stopped " + name, "ok");
      },
      "m-start-vm": function () {
        setRowStatus(row, "run");
        bumpStat("running", 1);
        bumpStat("stopped", -1);
        toast("Started " + name, "ok");
      },
      "m-restart-vm": function () {
        setRowStatus(row, "run");
        toast("Restarted " + name, "ok");
      },
      "m-delete-vm": function () {
        if (row) {
          row.classList.add("row-removing");
          setTimeout(function () { row.remove(); }, 350);
        }
        bumpStat("total", -1);
        toast("Deleted " + name, "warn");
      },
      "m-migrate-vm": function () {
        toast("Migration started · " + name + " → prod-node-02", "info");
        if (row) {
          var cells = qsa("td", row);
          if (cells[3]) cells[3].textContent = "prod-node-02";
          row.classList.add("row-flash");
        }
      },
      "m-snapshot": function () {
        toast("Snapshot created · " + name + "@manual-" + new Date().toISOString().slice(0, 10), "ok");
      },
      "m-delete-snapshot": function () {
        if (row) {
          row.classList.add("row-removing");
          setTimeout(function () { row.remove(); }, 350);
        }
        toast("Snapshot deleted", "warn");
      },
      "m-stop-container": function () {
        setRowStatus(row, "stop");
        toast("Stopped container " + name, "ok");
      },
      "m-start-container": function () {
        setRowStatus(row, "run");
        toast("Started container " + name, "ok");
      },
      "m-stop-jail": function () {
        setRowStatus(row, "stop");
        toast("Stopped jail " + name, "ok");
      },
      "m-start-jail": function () {
        setRowStatus(row, "run");
        toast("Started jail " + name, "ok");
      },
      "m-drain-host": function () {
        toast("Drain started on " + name, "info");
        setRowStatus(row, "maint");
      },
      "m-maint-host": function () {
        setRowStatus(row, "maint");
        toast(name + " entered maintenance", "warn");
      },
      "m-exit-maint": function () {
        setRowStatus(row, "ready");
        toast(name + " is Ready", "ok");
      },
      "m-add-host": function () {
        toast("Preflight passed · join queued", "ok");
      },
      "m-create-user": function () {
        toast("User created", "ok");
      },
      "m-edit-user": function () {
        toast("User updated", "ok");
      },
      "m-disable-user": function () {
        toast("User disabled", "warn");
        if (row) row.style.opacity = "0.5";
      },
      "m-create-role": function () {
        toast("Role saved", "ok");
      },
      "m-api-key": function () {
        toast("API key created with scopes · secret shown once (demo)", "ok");
      },
      "m-snapshot-revert": function () {
        toast("Revert to snapshot started · task queued", "info");
      },
      "m-backup-policy": function () {
        toast("Backup policy saved", "ok");
      },
      "m-backup-run": function () {
        toast("Backup task queued · see Tasks", "info");
      },
      "m-export-bundle": function () {
        toast("Support bundle ready (demo download)", "ok");
      },
      "m-maintenance-mode": function () {
        toast("Maintenance mode toggled", "warn");
        document.body.classList.toggle("maint-mode");
      },
      "m-mcp-disable": function () {
        setRowStatus(row, "off");
        toast("MCP server disabled · " + name, "warn");
        stateSet("mcp:" + name, "off");
      },
      "m-mcp-enable": function () {
        setRowStatus(row, "ok");
        toast("MCP server enabled · probing…", "info");
        setTimeout(function () { toast("Probe OK · tools discovered", "ok"); }, 900);
      },
      "m-mcp-probe": function () {
        toast("Probe OK · handshake + tools", "ok");
      },
      "m-mcp-edit": function () {
        toast("MCP server config saved", "ok");
      },
      "m-webhook": function () {
        toast("Webhook saved", "ok");
      },
      "m-ntp": function () {
        toast("NTP server added", "ok");
      },
      "m-join-token": function () {
        closeModal(qs("#m-join-token"));
        setTimeout(function () { openModal("m-join-token-result"); }, 200);
        toast("Join token generated", "ok");
        return true; /* skip default close */
      },
      "m-join-token-result": function () {
        toast("Token copied to clipboard (demo)", "ok");
        try { navigator.clipboard.writeText("cbjoin_8f3a9c2e1b7d4a6f0e5c8b2a1d9f7e3c"); } catch (e) {}
      },
      "m-change-password": function () {
        toast("Password updated", "ok");
      },
      "m-passkey": function () {
        toast("Passkey registered (demo)", "ok");
      },
      "m-totp": function () {
        toast("TOTP enabled", "ok");
      },
      "m-recovery-codes": function () {
        toast("Recovery codes acknowledged", "ok");
      },
      "m-revoke-session": function () {
        toast("Session revoked", "warn");
      },
      "m-edit-ips": function () {
        toast("IP configuration applied", "ok");
      },
      "m-edit-lacp": function () {
        toast("LACP bond updated", "ok");
      },
      "m-cancel-task": function () {
        if (row) {
          var c = qs("td", row);
          if (c) c.innerHTML = '<span class="status-off">○ Cancelled</span>';
          row.classList.add("row-flash");
        }
        toast("Task cancelled", "warn");
      },
      "m-library-upload": function () {
        toast("Upload started (demo)", "info");
      },
      "m-library-delete": function () {
        if (row) {
          row.classList.add("row-removing");
          setTimeout(function () { row.remove(); }, 350);
        }
        toast("Library item deleted", "warn");
      },
      "m-scrub": function () {
        toast("ZFS scrub started on tank", "info");
      },
      "m-clone-dataset": function () {
        toast("Clone created", "ok");
      },
      "m-create-network": function () {
        toast("Network created", "ok");
      },
      "m-delete-network": function () {
        if (row) {
          row.classList.add("row-removing");
          setTimeout(function () { row.remove(); }, 350);
        }
        toast("Network deleted", "warn");
      },
      "m-update-apply": function () {
        toast("Update applying on host…", "info");
        setTimeout(function () { toast("Update complete · agent 14.2-p3", "ok"); }, 1200);
      },
      "m-mark-read": function () {
        qsa("table.res tbody tr").forEach(function (tr) {
          var c = qs("td", tr);
          if (c && c.textContent.trim() === "●") c.textContent = "";
        });
        var bell = qs("[data-open-modal='m-mark-read']");
        if (bell) bell.textContent = "🔔 0";
        stateSet("notif", 0);
        toast("All notifications marked read", "ok");
      },
      "m-save-settings": function () {
        toast("Settings saved", "ok");
        qsa(".btn-primary").forEach(function (b) {
          if (/save/i.test(b.textContent)) {
            var t = b.textContent;
            b.textContent = "Saved ✓";
            b.classList.add("btn-saved");
            setTimeout(function () { b.textContent = t; b.classList.remove("btn-saved"); }, 1500);
          }
        });
      },
      "m-confirm-generic": function () {
        toast("Action completed", "ok");
      },
      "m-ctrl-alt-del": function () {
        toast("Sent Ctrl+Alt+Del to guest", "ok");
        var body = qs(".console-body");
        if (body) {
          body.innerHTML += "<br/><span style='color:#fbbf24'>^[[Ctrl+Alt+Del]</span>";
          body.scrollTop = body.scrollHeight;
        }
      }
    };

    var fn = actions[modalId];
    if (fn) {
      return withBusy(primaryBtn, 450, "Working…").then(function () {
        var skip = fn();
        return skip;
      });
    }
    return withBusy(primaryBtn, 300).then(function () {
      toast("Done (demo)", "ok");
    });
  }

  document.addEventListener("click", function (e) {
    var openBtn = e.target.closest("[data-open-modal]");
    if (openBtn) {
      e.preventDefault();
      openModal(openBtn.getAttribute("data-open-modal"), openBtn);
      return;
    }

    var closeBtn = e.target.closest("[data-close-modal]");
    if (closeBtn) {
      e.preventDefault();
      var modal = closeBtn.closest(".modal-backdrop, .frost");
      var isPrimary = closeBtn.classList.contains("btn-primary") || closeBtn.classList.contains("btn-danger");
      if (isPrimary && modal && !modal.hidden) {
        if (closeBtn.disabled) return;
        var id = modal.id;
        runModalAction(id, closeBtn).then(function (skipClose) {
          if (!skipClose) closeModal(modal);
          ctx.row = null;
          ctx.name = null;
        });
        return;
      }
      closeModal(closeBtn);
      return;
    }

    if (e.target.classList && e.target.classList.contains("modal-backdrop")) {
      closeModal(e.target);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var open = qs(".modal-backdrop:not([hidden]), .frost:not([hidden])");
      if (open) closeModal(open);
    }
  });

  /* ── Transport cards ────────────────────────────────── */
  qsa(".transport-card").forEach(function (card) {
    card.addEventListener("click", function () {
      qsa(".transport-card").forEach(function (c) { c.classList.remove("selected"); });
      card.classList.add("selected");
      toast("Transport: " + (qs("div", card) || card).textContent.trim().split("\n")[0], "info");
    });
  });

  /* ── Pick lists + capability matrix (no freeform scopes) ─ */
  function refreshPickCount(panel) {
    var n = qsa('input[type="checkbox"]:checked', panel).length;
    var el = qs("[data-pick-count]", panel);
    if (el) el.textContent = n + " selected";
  }

  function refreshCapSummary(root) {
    var scope = root || document;
    qsa("[data-cap-matrix]", scope).forEach(function (matrix) {
      var n = qsa('input[type="checkbox"]:checked', matrix).length;
      var sum = qs("[data-cap-summary]", matrix.closest(".modal-b") || matrix.parentElement);
      if (sum) sum.textContent = n + " capabilities selected";
    });
    var summary = qs("[data-scope-summary]");
    if (summary) {
      var acts = qsa('.modal-b [data-cap]:checked, .modal-b [data-cap-matrix] input:checked')
        .map(function (i) {
          var d = i.getAttribute("data-cap") || "";
          return d.indexOf(".") >= 0 ? d.split(".").slice(1).join(".") : (i.parentElement && i.parentElement.textContent || "").trim();
        })
        .filter(Boolean);
      /* unique */
      acts = acts.filter(function (v, i, a) { return a.indexOf(v) === i; });
      var resCount = 0;
      qsa('[data-domain-panel="list"] input:checked, [data-domain-panel="tag"] input:checked').forEach(function () { resCount++; });
      var domainChip = qs(".scope-domain-tabs .chip.active[data-domain]");
      var mode = domainChip ? domainChip.getAttribute("data-domain") : "list";
      var domainLabel = mode === "all" ? "all of type"
        : mode === "pattern" ? "pattern preview"
        : resCount + " selected";
      if (acts.length) {
        summary.innerHTML = "Summary: <strong>vm</strong> [" + acts.slice(0, 8).join(", ") +
          (acts.length > 8 ? "…" : "") + "] @ <strong>" + domainLabel + "</strong>";
      }
    }
  }

  document.addEventListener("change", function (e) {
    var t = e.target;
    if (!t) return;
    if (t.matches("[data-pick-list] input[type=checkbox], .pick-item input")) {
      var item = t.closest(".pick-item");
      if (item) item.classList.toggle("selected", t.checked);
      var panel = t.closest("[data-pick-list]");
      if (panel) refreshPickCount(panel);
      refreshCapSummary();
    }
    if (t.matches("[data-cap-matrix] input, [data-cap]")) {
      refreshCapSummary(t.closest(".modal-b") || document);
    }
  });

  document.addEventListener("input", function (e) {
    var t = e.target;
    if (t && t.matches("[data-pick-filter]")) {
      var panel = t.closest("[data-pick-list]");
      if (!panel) return;
      var q = t.value.toLowerCase().trim();
      qsa("[data-pick-item], .pick-item", panel).forEach(function (item) {
        var text = item.textContent.toLowerCase();
        item.style.display = !q || text.indexOf(q) !== -1 ? "" : "none";
      });
    }
  });

  document.addEventListener("click", function (e) {
    var modeBtn = e.target.closest("[data-domain]");
    if (modeBtn && modeBtn.closest("[data-domain-mode], .scope-domain-tabs")) {
      var wrap = modeBtn.closest(".modal-b") || modeBtn.closest("[data-tabs]") || document;
      var mode = modeBtn.getAttribute("data-domain");
      if (mode) {
        e.preventDefault();
        qsa("[data-domain]", wrap).forEach(function (b) {
          b.classList.toggle("active", b === modeBtn);
        });
        qsa("[data-domain-panel]", wrap).forEach(function (p) {
          p.hidden = p.getAttribute("data-domain-panel") !== mode;
        });
        refreshCapSummary(wrap);
        toast("Domain: " + mode, "info");
        return;
      }
    }
    var allBtn = e.target.closest("[data-cap-row-all]");
    if (allBtn) {
      e.preventDefault();
      var rtype = allBtn.getAttribute("data-cap-row-all");
      var row = allBtn.closest("tr");
      qsa("input[type=checkbox]", row).forEach(function (c) { c.checked = true; });
      refreshCapSummary(allBtn.closest(".modal-b"));
      toast("All " + rtype + " actions selected", "info");
      return;
    }
    var noneBtn = e.target.closest("[data-cap-row-none]");
    if (noneBtn) {
      e.preventDefault();
      var row2 = noneBtn.closest("tr");
      qsa("input[type=checkbox]", row2).forEach(function (c) { c.checked = false; });
      refreshCapSummary(noneBtn.closest(".modal-b"));
      return;
    }
    /* resource type chips in API key modal (non-domain) */
    var typeChip = e.target.closest(".scope-domain-tabs .chip:not([data-domain])");
    if (typeChip && typeChip.closest(".modal-b")) {
      var tabs = typeChip.parentElement;
      if (tabs && !tabs.hasAttribute("data-domain-mode") && !qs("[data-domain]", tabs)) {
        qsa(".chip", tabs).forEach(function (c) { c.classList.toggle("active", c === typeChip); });
        toast("Resource type: " + typeChip.textContent.trim(), "info");
      }
    }
  });

  qsa("[data-pick-list]").forEach(refreshPickCount);

  /* ── Table row select + bulk bar ────────────────────── */
  function initTables() {
    qsa("table.res").forEach(function (table) {
      var th = qs("thead th", table);
      if (th && !qs("input[type=checkbox]", th) && qsa("thead th", table).length > 3) {
        /* optional: skip auto checkbox inject to avoid layout shift on all tables */
      }
      qsa("tbody tr", table).forEach(function (tr) {
        tr.addEventListener("click", function (e) {
          if (e.target.closest("a, button, input, label")) return;
          tr.classList.toggle("row-selected");
        });
      });
    });
  }
  initTables();

  /* ── Log stream simulation ──────────────────────────── */
  function initLogStream() {
    var log = qs(".card.card-pad[style*='0f172a'], .card-pad .log-line");
    var host = null;
    qsa(".card-pad").forEach(function (c) {
      if (c.querySelector(".log-line") && /0f172a|background:#0f172a/.test(c.getAttribute("style") || "") || c.querySelector(".log-line")) {
        if (c.querySelector(".log-line")) host = c;
      }
    });
    /* find dark log containers */
    qsa(".card-pad").forEach(function (c) {
      if (getComputedStyle(c).backgroundColor === "rgb(15, 23, 42)" || (c.getAttribute("style") || "").indexOf("0f172a") !== -1) {
        if (c.querySelector(".log-line") || /INFO|WARN|ERROR/.test(c.textContent)) host = c;
      }
    });
    if (!host || !host.querySelector(".log-line")) return;
    var lines = [
      { cls: "info", msg: "stream tick keepalive" },
      { cls: "info", msg: "agent heartbeat prod-node-01 ok" },
      { cls: "warn", msg: "zfs scrub deferred on tank" },
      { cls: "info", msg: "mcp probe honcho tools=30" },
      { cls: "err", msg: "vm gitlab-runner qemu exit 1" },
      { cls: "info", msg: "task snapshot completed nextcloud" },
      { cls: "info", msg: "preflight ok action=vm.stop" }
    ];
    var i = 0;
    setInterval(function () {
      if (document.hidden) return;
      var L = lines[i % lines.length];
      i++;
      var t = new Date();
      var ts = String(t.getHours()).padStart(2, "0") + ":" +
        String(t.getMinutes()).padStart(2, "0") + ":" +
        String(t.getSeconds()).padStart(2, "0");
      var div = document.createElement("div");
      div.className = "log-line log-line-new";
      div.innerHTML = '<span class="ts">' + ts + '</span> <span class="' + L.cls + '">' +
        L.cls.toUpperCase() + "</span> " + L.msg;
      host.appendChild(div);
      while (host.querySelectorAll(".log-line").length > 40) {
        var first = host.querySelector(".log-line");
        if (first) first.remove();
      }
      host.scrollTop = host.scrollHeight;
    }, 2800);
  }
  initLogStream();

  /* ── Console typing demo ────────────────────────────── */
  var consoleBody = qs(".console-body");
  if (consoleBody) {
    var cmds = ["uname -a", "zfs list -r tank/vms", "top -b 1 | head"];
    var ci = 0;
    setInterval(function () {
      if (document.hidden) return;
      consoleBody.innerHTML += "<br/>root@nextcloud:~ # " + cmds[ci % cmds.length];
      ci++;
      consoleBody.innerHTML += "<br/><span style='color:#94a3b8'>(demo output)</span>";
      consoleBody.scrollTop = consoleBody.scrollHeight;
    }, 6000);
  }

  /* ── Settings form dirty tracking ───────────────────── */
  qsa(".field input, .field select, .field textarea").forEach(function (el) {
    el.addEventListener("change", function () {
      el.classList.add("field-dirty");
    });
    el.addEventListener("input", function () {
      el.classList.add("field-dirty");
    });
  });

  /* ── Keyboard: / focuses filter ─────────────────────── */
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && !e.target.matches("input, textarea, select")) {
      var fi = qs(".filter-bar input");
      if (fi) {
        e.preventDefault();
        fi.focus();
        fi.select();
      }
    }
  });

  /* ── Restore notif badge ────────────────────────────── */
  var n = stateGet("notif", null);
  if (n === 0) {
    var bell = qs("[data-open-modal='m-mark-read']");
    if (bell) bell.textContent = "🔔 0";
  }

  /* ── Demo toolbar ───────────────────────────────────── */
  function injectDemoBar() {
    if (qs("#demo-bar")) return;
    var bar = document.createElement("div");
    bar.id = "demo-bar";
    bar.className = "demo-bar";
    bar.innerHTML =
      '<span class="demo-bar-label">Demo runtime</span>' +
      '<span class="demo-bar-sep">·</span>' +
      '<span>filters work</span>' +
      '<span class="demo-bar-sep">·</span>' +
      '<span>confirms update rows</span>' +
      '<span class="demo-bar-sep">·</span>' +
      '<span>press <kbd>/</kbd> to search</span>' +
      '<button type="button" class="demo-bar-btn" id="demo-reset">Reset state</button>';
    document.body.appendChild(bar);
    qs("#demo-reset").addEventListener("click", function () {
      localStorage.removeItem(STORE_KEY);
      toast("Demo state cleared · reloading", "info");
      setTimeout(function () { location.reload(); }, 500);
    });
  }
  if (!document.body.classList.contains("auth-only") && qs(".app")) injectDemoBar();

  /* ── Welcome toast once per session ─────────────────── */
  if (qs(".app") && !sessionStorage.getItem("cba-hi")) {
    sessionStorage.setItem("cba-hi", "1");
    setTimeout(function () {
      toast("Interactive demo · try Stop on a VM or filter chips", "info");
    }, 600);
  }

  initLive();

  /* expose for console debugging */
  window.CBAMock = { toast: toast, openModal: openModal, stateGet: stateGet, stateSet: stateSet };
})();
