/* Lightweight mockup helpers — no framework */
(function () {
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  // Highlight sidebar active link from data-nav or path
  var active = document.body.getAttribute('data-nav');
  if (active) {
    qsa('.sidebar nav a').forEach(function (a) {
      if (a.getAttribute('data-id') === active) a.classList.add('active');
    });
  }

  // Tabs
  qsa('[data-tabs]').forEach(function (wrap) {
    var tabs = qsa('[data-tab]', wrap);
    var panels = qsa('[data-panel]', wrap);
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function (e) {
        e.preventDefault();
        var id = tab.getAttribute('data-tab');
        tabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
        panels.forEach(function (p) {
          p.hidden = p.getAttribute('data-panel') !== id;
        });
      });
    });
  });

  // Demo density toggles
  qsa('[data-density]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var d = btn.getAttribute('data-density');
      var table = qs('[data-density-target]');
      if (!table) return;
      table.classList.remove('density-compact', 'density-extra');
      if (d === 'compact') table.classList.add('density-compact');
      if (d === 'extra') table.classList.add('density-extra');
      qsa('[data-density]').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
    });
  });

  // Modal open/close
  qsa('[data-open-modal]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-open-modal');
      var m = qs('#' + id);
      if (m) m.hidden = false;
    });
  });
  qsa('[data-close-modal]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var m = btn.closest('.modal-backdrop, .frost');
      if (m) m.hidden = true;
    });
  });

  // Filter chip toggle (visual only)
  qsa('.filter-bar .chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var bar = chip.closest('.filter-bar');
      if (!bar) return;
      qsa('.chip', bar).forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
    });
  });
})();
