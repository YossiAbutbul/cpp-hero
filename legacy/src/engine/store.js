/* ==========================================================================
   Cpp Hero — engine/store.js
   Versioned save: load / save / migrate / validate / export / import / reset.
   Every storage access is wrapped in try/catch. If localStorage is unavailable
   (private mode, sandboxed iframe, file:// quirks, quota) we keep the state in
   memory and show a small notice.
   Save format: see docs/ARCHITECTURE.md ("Save format"). Keep it stable.
   ========================================================================== */
(function () {
  'use strict';
  var CH = window.CH, U = CH.util;

  var KEY = 'cpphero.save';
  var SAVE_VERSION = 1;

  /** Fresh default save. */
  function defaults() {
    var now = U.isoNow();
    return {
      v: SAVE_VERSION,
      createdAt: now, updatedAt: now,
      profile: { name: 'Curlo', variant: 'classic', dailyGoalMin: 10, onboarded: false, placementDone: false },
      settings: { sound: true, music: false, reduceMotion: false, textSize: 'm' },
      xp: 0, level: 1,
      hearts: { n: 5, max: 5, lastRefill: now },
      streak: { days: 0, lastDay: '', freezes: 0, best: 0 },
      daily: { day: '', minutes: 0, quests: [] },
      stats: { logic: 0, structure: 0, memory: 0, toolkit: 0, defense: 0 },
      lessons: {},
      projects: {},
      bosses: {},
      worldsUnlocked: ['w1'],
      srs: {},
      vault: [],
      bestiary: [],
      achievements: {},
      cosmetics: { owned: ['classic'], equipped: { hat: null, color: 'classic', shield: null } },
      counters: { correct: 0, wrong: 0, bestCombo: 0, hardened: 0, reviews: 0, secondsPlayed: 0, byTag: {} }
    };
  }

  /**
   * Fill missing keys from defaults (recursively for plain objects) so a save
   * written by an older build (or hand-edited) still has every field.
   * Values present in `obj` always win; types that don't match are replaced.
   */
  function fillDefaults(obj, def) {
    Object.keys(def).forEach(function (k) {
      var dv = def[k], ov = obj[k];
      if (ov === undefined || ov === null && dv !== null) { obj[k] = U.clone(dv === undefined ? null : dv); return; }
      if (U.isObj(dv)) {
        if (!U.isObj(ov)) { obj[k] = U.clone(dv); return; }
        // Maps keyed by id (lessons, srs, ...) have empty defaults: keep as is.
        if (Object.keys(dv).length) fillDefaults(ov, dv);
      } else if (Array.isArray(dv)) {
        if (!Array.isArray(ov)) obj[k] = U.clone(dv);
      } else if (typeof dv !== typeof ov && dv !== null) {
        obj[k] = dv;
      }
    });
    return obj;
  }

  /**
   * Upgrade older saves step by step. Add a case per version bump:
   *   if (s.v === 1) { ...transform to v2...; s.v = 2; }
   */
  function migrate(s) {
    if (!U.isObj(s)) throw new Error('Save is not an object');
    if (typeof s.v !== 'number') s.v = 1;           // pre-versioned saves = v1 shape
    if (s.v > SAVE_VERSION) throw new Error('This save comes from a newer version of Cpp Hero (v' + s.v + ').');
    // (No migrations yet: v1 is the first format.)
    fillDefaults(s, defaults());
    // Sanity clamps.
    s.hearts.max = U.clamp(+s.hearts.max || 5, 1, 10);
    s.hearts.n = U.clamp(+s.hearts.n || 0, 0, s.hearts.max);
    Object.keys(s.stats).forEach(function (k) { s.stats[k] = U.clamp(+s.stats[k] || 0, 0, 100); });
    if (['s', 'm', 'l'].indexOf(s.settings.textSize) < 0) s.settings.textSize = 'm';
    if (s.worldsUnlocked.indexOf('w1') < 0) s.worldsUnlocked.unshift('w1');
    if (s.cosmetics.owned.indexOf('classic') < 0) s.cosmetics.owned.unshift('classic');
    if (!U.isObj(s.cosmetics.equipped)) s.cosmetics.equipped = { hat: null, color: 'classic', shield: null };
    s.xp = Math.max(0, Math.round(+s.xp || 0));
    // Level is derived from XP (keeps imported / hand-edited saves consistent).
    if (CH.game && CH.game.levelInfo) s.level = CH.game.levelInfo(s.xp).level;
    s.v = SAVE_VERSION;
    return s;
  }

  /** Light shape validation for imported files. Throws with a friendly message. */
  function validate(o) {
    if (!U.isObj(o)) throw new Error('That file isn’t a Cpp Hero save.');
    if (typeof o.v !== 'number') throw new Error('Missing save version (v).');
    if (!U.isObj(o.profile) || !U.isObj(o.settings)) throw new Error('The save is missing profile or settings.');
    if (o.lessons != null && !U.isObj(o.lessons)) throw new Error('Lessons data is malformed.');
    if (o.worldsUnlocked != null && !Array.isArray(o.worldsUnlocked)) throw new Error('worldsUnlocked is malformed.');
    return true;
  }

  /* ---------------- persistence ---------------- */
  var persistent = true;   // false once a storage operation failed
  var noticeShown = false;

  function storageOK() {
    try {
      var k = '__ch_probe__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }

  function readRaw() {
    try { return window.localStorage.getItem(KEY); } catch (e) { persistent = false; return null; }
  }

  function writeRaw(str) {
    try { window.localStorage.setItem(KEY, str); return true; }
    catch (e) { persistent = false; showNotice(); return false; }
  }

  function showNotice() {
    if (noticeShown) return;
    noticeShown = true;
    CH.events.emit('store.notice', { msg: 'Progress can’t be saved on this device. You can still play, and export your progress from Settings.' });
  }

  var store = (CH.store = {
    KEY: KEY,
    SAVE_VERSION: SAVE_VERSION,
    state: null,
    defaults: defaults,
    migrate: migrate,
    validate: validate,
    get persistent() { return persistent; },

    /** Load (or create) the save. Never throws. */
    load: function () {
      persistent = storageOK();
      var raw = persistent ? readRaw() : null, s = null;
      if (raw) {
        try { s = migrate(JSON.parse(raw)); }
        catch (e) {
          console.warn('[store] save unreadable, starting fresh', e);
          // Keep the broken save around in case the user wants it back.
          try { window.localStorage.setItem(KEY + '.broken', raw); } catch (e2) { /* ignore */ }
          s = null;
        }
      }
      store.state = s || defaults();
      if (!persistent) showNotice();
      return store.state;
    },

    /** Debounced save (coalesces bursts of updates). */
    save: U.debounce(function () { store.saveNow(); }, 250),

    saveNow: function () {
      var s = store.state;
      if (!s) return false;
      s.updatedAt = U.isoNow();
      if (!persistent) { showNotice(); return false; }
      var ok = writeRaw(JSON.stringify(s));
      if (ok) CH.events.emit('store.saved');
      return ok;
    },

    /** Replace the whole state (import / reset). */
    replace: function (s) {
      store.state = migrate(s);
      store.saveNow();
      CH.events.emit('store.replaced', store.state);
    },

    reset: function () {
      try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      store.state = defaults();
      store.saveNow();
      CH.events.emit('store.replaced', store.state);
    },

    /**
     * Download the save as a JSON file. Resolves true on success.
     * Inside a claude.ai Artifact, plain downloads are blocked, so use the
     * host's `downloads` capability there; everywhere else Blob + <a download>.
     */
    exportFile: function () {
      var s = store.state;
      s.updatedAt = U.isoNow();
      var json = JSON.stringify(s, null, 2);
      var name = 'cpp-hero-save-' + U.dayStr() + '.json';
      var host = window.claude && typeof window.claude.use === 'function' ? window.claude : null;
      if (host) {
        return host.use('downloads').then(function (dl) {
          if (!dl) return store._anchorDownload(json, name);
          return dl.save({ filename: name, data: json }).then(function () { return true; }, function (e) {
            if (e && e.code === 'declined') return 'declined';
            console.error('[store] export failed', e);
            return false;
          });
        }, function () { return store._anchorDownload(json, name); });
      }
      return Promise.resolve(store._anchorDownload(json, name));
    },

    _anchorDownload: function (json, name) {
      try {
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = name; a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
        return true;
      } catch (e) {
        console.error('[store] export failed', e);
        return false;
      }
    },

    /**
     * Read + validate + migrate a user-picked File. Resolves with the migrated
     * save object; the caller confirms (in-app dialog) and then calls replace().
     */
    readImport: function (file) {
      return new Promise(function (resolve, reject) {
        if (!file) return reject(new Error('No file selected.'));
        if (file.size > 5 * 1024 * 1024) return reject(new Error('That file is too big to be a save.'));
        var fr = new FileReader();
        fr.onerror = function () { reject(new Error('Couldn’t read that file.')); };
        fr.onload = function () {
          try {
            var o = JSON.parse(String(fr.result));
            validate(o);
            resolve(migrate(o));
          } catch (e) {
            reject(e instanceof SyntaxError ? new Error('That file isn’t valid JSON.') : e);
          }
        };
        fr.readAsText(file);
      });
    }
  });

  // Flush pending writes when the page is hidden/closed.
  function flush() { try { store.saveNow(); } catch (e) { /* ignore */ } }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);
})();
