/* Lightweight mockup helpers — tabs, modals, density, chips */
(function () {
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  var active = document.body.getAttribute("data-nav");
  if (active) {
    qsa(".sidebar nav a").forEach(function (a) {
      if (a.getAttribute("data-id") === active) a.classList.add("active");
    });
  }

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
    var tabs = qsa("[data-tab]", wrap);
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function (e) {
        e.preventDefault();
        activateTab(wrap, tab.getAttribute("data-tab"));
      });
    });
    var hash = (location.hash || "").replace(/^#/, "");
    if (hash && qs('[data-tab="' + hash + '"]', wrap)) {
      activateTab(wrap, hash);
    }
  });

  qsa("[data-density]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var d = btn.getAttribute("data-density");
      var table = qs("[data-density-target]");
      if (!table) return;
      table.classList.remove("density-compact", "density-extra");
      if (d === "compact") table.classList.add("density-compact");
      if (d === "extra") table.classList.add("density-extra");
      qsa("[data-density]").forEach(function (b) {
        b.classList.toggle("active", b === btn);
      });
    });
  });

  function openModal(id) {
    var m = qs("#" + id);
    if (!m) return;
    m.hidden = false;
    document.body.classList.add("modal-open");
    var focusable = qs("button, [href], input, select, textarea", m);
    if (focusable) focusable.focus();
  }

  function closeModal(el) {
    var m = el && el.closest ? el.closest(".modal-backdrop, .frost") : el;
    if (!m) return;
    m.hidden = true;
    if (!qs(".modal-backdrop:not([hidden]), .frost:not([hidden])")) {
      document.body.classList.remove("modal-open");
    }
  }

  document.addEventListener("click", function (e) {
    var openBtn = e.target.closest("[data-open-modal]");
    if (openBtn) {
      e.preventDefault();
      openModal(openBtn.getAttribute("data-open-modal"));
      return;
    }
    var closeBtn = e.target.closest("[data-close-modal]");
    if (closeBtn) {
      e.preventDefault();
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

  qsa(".filter-bar .chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var bar = chip.closest(".filter-bar");
      if (!bar) return;
      qsa(".chip", bar).forEach(function (c) { c.classList.remove("active"); });
      chip.classList.add("active");
    });
  });

  // Transport cards in MCP wizard
  qsa(".transport-card").forEach(function (card) {
    card.addEventListener("click", function () {
      qsa(".transport-card").forEach(function (c) { c.classList.remove("selected"); });
      card.classList.add("selected");
    });
  });
})();
