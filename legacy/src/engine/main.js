/* ==========================================================================
   Cpp Hero — engine/main.js
   Boot: (optionally) load the #dev sample world, load the save, build the
   content index, wire global UI (tabs, top bar, notices), register the
   service worker (guarded: skipped on file://, in iframes without support,
   or if registration throws), then show onboarding or the map.
   ========================================================================== */
(function () {
  'use strict';
  var CH = window.CH, U = CH.util;

  /** In #dev mode, load the developer sample world from the repo (not part of dist). */
  function loadDev() {
    if (!CH.dev) return Promise.resolve();
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = '../src/content/_dev-sample.js';
      s.onload = function () { resolve(); };
      s.onerror = function () { console.warn('[dev] _dev-sample.js not found (serve the repo root to use #dev).'); resolve(); };
      document.head.appendChild(s);
      setTimeout(resolve, 3000);
    });
  }

  function registerSW() {
    try {
      if (!('serviceWorker' in navigator)) return;
      if (!/^https?:$/.test(location.protocol)) return;
      if (CH.dev) return; // keep dev iterations uncached
      window.addEventListener('load', function () {
        try {
          navigator.serviceWorker.register('./sw.js').catch(function (e) { console.info('[sw] not registered:', e && e.message); });
        } catch (e) { console.info('[sw] registration skipped:', e && e.message); }
      });
    } catch (e) { /* no SW: the app still works */ }
  }

  function wireChrome() {
    U.$$('.tab').forEach(function (t) {
      t.addEventListener('click', function () {
        var cur = CH.router.current;
        if (cur && cur.name === t.dataset.go) return;
        var order = ['map', 'buddy', 'practice', 'vault', 'bestiary'];
        var dir = cur && order.indexOf(t.dataset.go) < order.indexOf(cur.def.tab || cur.name) ? -1 : 1;
        CH.audio.play('tap');
        CH.router.go(t.dataset.go, {}, { dir: dir, root: true });
      });
    });
    // Header toggles: open Stats / Settings (expanding from the button); the
    // icon morphs into an X, and tapping it again (or Esc) closes the panel.
    var PANELS = { stats: U.$('#btnStats'), settings: U.$('#btnSettings') };
    function isPanel(n) { return n === 'stats' || n === 'settings'; }
    function closePanel() { CH.router.back('map', { dir: 'close' }); }
    Object.keys(PANELS).forEach(function (name) {
      var btn = PANELS[name];
      btn.onclick = function () {
        CH.audio.play('tap');
        var c = CH.router.current;
        if (c && c.name === name) { closePanel(); return; }
        if (c && isPanel(c.name)) CH.router.go(name, {}, { dir: 'fade', replace: true, origin: { el: btn, id: 'hdr-' + name } });
        else CH.router.go(name, {}, { dir: 'expand', origin: { el: btn, id: 'hdr-' + name } });
      };
    });
    CH.events.on('screen', function (d) {
      Object.keys(PANELS).forEach(function (name) {
        var open = d.name === name, btn = PANELS[name], label = name === 'stats' ? 'Stats' : 'Settings';
        btn.classList.toggle('is-open', open);
        btn.setAttribute('aria-label', open ? 'Close ' + label.toLowerCase() : label);
        btn.title = open ? 'Close' : label;
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || U.$('#overlay-root').children.length) return;
      var c = CH.router.current;
      if (c && isPanel(c.name)) { e.preventDefault(); closePanel(); }
    });
    CH.curlo.mount(U.$('#brandMark .brand-c'));
  }

  function applySettings() {
    CH.fx.syncReduced();
    CH.screensUtil.applyTextSize();
    CH.audio.sync();
  }

  function start() {
    var s = CH.store.state;
    CH.game.ensureDaily();
    CH.game.regenHearts();
    CH.game.checkStreak();
    CH.game.checkAchievements();
    CH.game.queue = CH.game.queue.filter(function (q) { return q.type !== 'cosmetic'; }); // silent on boot
    if (!s.profile.onboarded) CH.router.go('onboarding', {}, { root: true });
    else CH.router.go('map', {}, { root: true });
  }

  function boot() {
    loadDev().then(function () {
      CH.store.load();
      CH.game.buildIndex();
      if (CH.dev) console.info('[dev] content:', CH.game.worlds().map(function (w) { return w.id; }).join(', '), '—', Object.keys(CH.game.index.challenge).length, 'challenges');
      applySettings();
      wireChrome();
      CH.events.on('store.notice', function (d) { setTimeout(function () { CH.fx.toast(d.msg, { icon: CH.ui.icon('info'), ms: 5000 }); }, 1200); });
      if (!CH.store.persistent) CH.fx.toast('Progress can’t be saved on this device. You can still play, and export from Settings.', { icon: CH.ui.icon('info'), ms: 5000 });
      CH.events.on('store.replaced', function () {
        CH.game.combo = 0; CH.game.queue = [];
        applySettings();
        CH.curlo.refreshAll();
        start();
      });
      CH.game.startClock();
      start();
      U.$('#app').classList.add('ready');
      var sp = U.$('#splash'); if (sp) { sp.classList.add('gone'); setTimeout(function () { sp.remove(); }, 500); }
    }).catch(function (e) {
      console.error('[boot] failed', e);
      var st = U.$('#stage');
      if (st) st.innerHTML = '<div class="card" style="margin:16px"><h3>Cpp Hero couldn’t start</h3><p>' + U.esc(e.message) + '</p></div>';
    });
  }

  registerSW();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
