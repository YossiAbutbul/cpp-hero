/* ==========================================================================
   Cpp Hero — engine/core.js
   Namespace, small DOM/utility helpers and a tiny event bus.
   Loaded FIRST (before any content file), so content files can safely do
   `CH.content.worlds.push({...})`.
   ========================================================================== */
(function () {
  'use strict';

  var CH = (window.CH = window.CH || {});

  /* ---- content registry (filled by src/content/*.js) ---- */
  CH.content = CH.content || {};
  ['worlds', 'bestiary', 'achievements', 'cosmetics', 'quests'].forEach(function (k) {
    if (!Array.isArray(CH.content[k])) CH.content[k] = [];
  });

  /**
   * Feature flags. SOUND_ENABLED=false turns ALL audio off: no AudioContext is
   * ever created, SFX/music are no-ops and the Sound/Music settings are hidden.
   * (settings.sound / settings.music stay in the save for format stability.)
   */
  CH.config = CH.config || { SOUND_ENABLED: false };

  /** Build version stamped by build.js (same value as the SW cache name). */
  CH.VERSION = '__BUILD_VERSION__';

  /** Developer mode: URL hash contains "dev" (e.g. index.html#dev). */
  CH.dev = /(^|[#&])dev\b/.test(location.hash || '');

  /* ======================================================================
     Utilities
     ====================================================================== */
  var U = (CH.util = {});

  U.$ = function (sel, root) { return (root || document).querySelector(sel); };
  U.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /** HTML-escape any value. */
  U.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /** Create an element from an HTML string (first element child). */
  U.h = function (html) {
    var t = document.createElement('template');
    t.innerHTML = String(html).trim();
    return t.content.firstElementChild;
  };

  /** Markdown-lite used by content: `code` and **bold** only (input is escaped first). */
  U.md = function (s) {
    var out = U.esc(s);
    out = out.replace(/`([^`]+)`/g, function (_, c) { return '<code class="i">' + c + '</code>'; });
    out = out.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    return out;
  };

  U.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  U.rand = function (n) { return Math.floor(Math.random() * n); };
  U.pick = function (arr) { return arr[U.rand(arr.length)]; };

  /** Fisher–Yates shuffle (returns a new array). Optional seeded rng. */
  U.shuffle = function (arr, rng) {
    var a = arr.slice(), r = rng || Math.random;
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  /** Deterministic PRNG (mulberry32) from a string seed. */
  U.seeded = function (seedStr) {
    var s = U.hash(seedStr);
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /** 32-bit FNV-1a hash of a string. */
  U.hash = function (str) {
    var h = 0x811c9dc5;
    str = String(str);
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  };

  U.isoNow = function () { return new Date().toISOString(); };

  /** Local calendar day "YYYY-MM-DD". */
  U.dayStr = function (d) {
    d = d || new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  };

  /** Whole days from day string a to day string b (b - a). */
  U.dayDiff = function (a, b) {
    if (!a || !b) return Infinity;
    var pa = a.split('-').map(Number), pb = b.split('-').map(Number);
    var ta = Date.UTC(pa[0], pa[1] - 1, pa[2]), tb = Date.UTC(pb[0], pb[1] - 1, pb[2]);
    return Math.round((tb - ta) / 86400000);
  };

  U.plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); };

  /** Format seconds as "1h 05m", "12m", "45s". */
  U.fmtDuration = function (sec) {
    sec = Math.max(0, Math.round(sec || 0));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    if (h) return h + 'h ' + (m < 10 ? '0' : '') + m + 'm';
    if (m) return m + 'm';
    return sec + 's';
  };

  /** "mm:ss" */
  U.fmtClock = function (sec) {
    sec = Math.max(0, Math.ceil(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  };

  U.debounce = function (fn, ms) {
    var t;
    return function () {
      var a = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, a); }, ms);
    };
  };

  /** Plain setTimeout promise (NOT motion-aware; see CH.fx.pause for that). */
  U.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  /** Deep clone of JSON-able data. */
  U.clone = function (o) { return JSON.parse(JSON.stringify(o)); };

  /** Is `o` a plain object? */
  U.isObj = function (o) { return !!o && typeof o === 'object' && !Array.isArray(o); };

  /** Show visible glyphs for whitespace in exact-output answers: ␣ for spaces, ↵ for \n, → for tabs. */
  U.visibleWS = function (s) {
    return U.esc(s)
      .replace(/ /g, '<span class="ws">␣</span>')
      .replace(/\t/g, '<span class="ws">→</span>')
      .replace(/\n/g, '<span class="ws">↵</span><br>');
  };

  /** Stable unique id for DOM (aria) references. */
  var uidN = 0;
  U.uid = function (p) { return (p || 'ch') + '-' + (++uidN); };

  /* ======================================================================
     Event bus
     ====================================================================== */
  var handlers = {};
  CH.events = {
    /** Subscribe; returns an unsubscribe function. */
    on: function (evt, fn) {
      (handlers[evt] = handlers[evt] || []).push(fn);
      return function () { CH.events.off(evt, fn); };
    },
    off: function (evt, fn) {
      var l = handlers[evt];
      if (l) handlers[evt] = l.filter(function (f) { return f !== fn; });
    },
    emit: function (evt, data) {
      (handlers[evt] || []).slice().forEach(function (fn) {
        try { fn(data, evt); } catch (e) { console.error('[CH.events] handler for', evt, 'failed', e); }
      });
      (handlers['*'] || []).slice().forEach(function (fn) {
        try { fn(data, evt); } catch (e) { console.error(e); }
      });
    }
  };
})();
