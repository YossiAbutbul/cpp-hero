/*
 * Cpp Hero — procedural SVG art ("Pop Path" visual direction).
 *
 * Exposes CH.art with three string factories:
 *   CH.art.icon(key, opts)  -> world icon, viewBox 0 0 48 48, drawn in white
 *                              so it sits on any coloured map node.
 *   CH.art.boss(key, opts)  -> boss monster, viewBox 0 0 200 200.
 *   CH.art.beast(key, opts) -> Bug Bestiary creature, viewBox 0 0 120 120.
 *   CH.art.keys             -> { icons, bosses, beasts } key lists.
 *
 * Rules every piece follows (the engine CSS depends on them):
 *   - root <svg> has aria-hidden, focusable="false", a viewBox, a class and
 *     NO width/height (size comes from CSS);
 *   - no id attributes (many copies share a page), so no gradients/filters:
 *     flat fills plus translucent white highlight shapes instead;
 *   - animated hook groups (.b-body, .b-eyes, .b-limb, .bs-body, .bs-eyes)
 *     never carry a transform attribute themselves, because a CSS animation
 *     transform would replace it. Any positioning transform goes on an inner,
 *     unclassed <g>.
 *
 * Plain ES2019 script, no modules. Loads after window.CH exists.
 */
(function () {
  'use strict';

  var CH = (window.CH = window.CH || {});

  /* ------------------------------------------------------------------ *
   * Palette (mirrors the CSS tokens in designs/5-springboard.html)
   * ------------------------------------------------------------------ */
  var C = {
    ink: '#2A2140',
    white: '#fff',
    tang: '#F2641B', tangD: '#BF4808', tangL: '#FFD2B3',
    sun: '#FFC62E', sunD: '#D69500', sunL: '#FFEDB0',
    coral: '#FF5A70', coralD: '#D0324C', coralL: '#FFD6DC',
    teal: '#0FA898', tealD: '#077A6F', tealL: '#C4F1EA',
    sky: '#3D8BFF', skyD: '#2463C4', skyL: '#BFD8FF',
    lock: '#E6DED3', lockD: '#C6BBAC', lockX: '#B3A797',
    purple: '#7A4FD0', purpleD: '#5A33A8', purpleL: '#D9C6FF',
    green: '#6CCB5F', greenD: '#3E9B3A', greenL: '#CDF2C0',
    stone: '#A89C8C', stoneD: '#857968', stoneL: '#C4B9AA',
    shadow: 'rgba(90,45,10,.13)'
  };

  /* ------------------------------------------------------------------ *
   * Small utilities
   * ------------------------------------------------------------------ */

  /** Round to 1 decimal so generated markup stays short and NaN-free. */
  function n(v) {
    return Math.round(v * 10) / 10;
  }

  /**
   * Lighten (amt > 0) or darken (amt < 0) a hex colour by mixing it with
   * white or black. Accepts #rgb or #rrggbb; anything else is returned as-is.
   */
  function shade(hex, amt) {
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return hex;
    var h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var out = '#';
    for (var i = 0; i < 3; i++) {
      var c = parseInt(h.substr(i * 2, 2), 16);
      c = amt < 0 ? c * (1 + amt) : c + (255 - c) * amt;
      out += ('0' + Math.round(Math.max(0, Math.min(255, c))).toString(16)).slice(-2);
    }
    return out;
  }

  /** Root <svg> wrapper with the required accessibility/structure attrs. */
  function svg(cls, size, inner) {
    return '<svg class="' + cls + '" viewBox="0 0 ' + size + ' ' + size +
      '" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }

  /** Soft ground shadow. */
  function shadow(cx, cy, rx, ry) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry +
      '" fill="' + C.shadow + '"/>';
  }

  /** Glossy highlight: white ellipse at ~.4 opacity, optionally rotated. */
  function hl(cx, cy, rx, ry, rot, op) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry +
      '" fill="#fff" opacity="' + (op == null ? 0.4 : op) + '"' +
      (rot ? ' transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')"' : '') + '/>';
  }

  /** A pair of blush cheeks. */
  function cheeks(x1, x2, y, rx, ry, color, op) {
    var a = ' cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + (color || C.coral) +
      '" opacity="' + (op == null ? 0.5 : op) + '"/>';
    return '<ellipse cx="' + x1 + '"' + a + '<ellipse cx="' + x2 + '"' + a;
  }

  /** Mirror some markup horizontally about the centre of a `w`-wide canvas. */
  function flip(inner, w) {
    return '<g transform="matrix(-1 0 0 1 ' + w + ' 0)">' + inner + '</g>';
  }

  /** Round-capped ink stroke path (brows, mouths, antennae...). */
  function line(d, w, color) {
    return '<path d="' + d + '" fill="none" stroke="' + (color || C.ink) +
      '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>';
  }

  /** Small downward white fang whose top edge is centred at (x, y). */
  function fang(x, y, s) {
    s = s || 5;
    return '<path d="M' + n(x - s * 0.7) + ' ' + y + 'L' + x + ' ' + n(y + s * 1.3) +
      'L' + n(x + s * 0.7) + ' ' + y + 'Z" fill="#fff"/>';
  }

  /** Upward fang whose base is centred at (x, y). */
  function fangUp(x, y, s) {
    s = s || 5;
    return '<path d="M' + n(x - s * 0.7) + ' ' + y + 'L' + x + ' ' + n(y - s * 1.3) +
      'L' + n(x + s * 0.7) + ' ' + y + 'Z" fill="#fff"/>';
  }

  /** "X" knocked-out eye (used for hurt bosses). */
  function xEye(cx, cy, s, color) {
    return line('M' + n(cx - s) + ' ' + n(cy - s) + 'L' + n(cx + s) + ' ' + n(cy + s) +
      'M' + n(cx + s) + ' ' + n(cy - s) + 'L' + n(cx - s) + ' ' + n(cy + s), n(s * 0.55), color);
  }

  /**
   * Boss "glowing" eye: translucent halo, white sclera, coloured iris,
   * ink pupil and a white glint. dx/dy nudge the gaze.
   */
  function glowEye(cx, cy, r, iris, dx, dy) {
    dx = dx || 0; dy = dy || 0;
    var px = n(cx + dx), py = n(cy + dy);
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + n(r * 1.38) + '" fill="' + iris + '" opacity=".3"/>' +
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + r + '" ry="' + n(r * 1.08) + '" fill="#fff"/>' +
      '<circle cx="' + px + '" cy="' + py + '" r="' + n(r * 0.66) + '" fill="' + iris + '"/>' +
      '<circle cx="' + px + '" cy="' + py + '" r="' + n(r * 0.36) + '" fill="' + C.ink + '"/>' +
      '<circle cx="' + n(px + r * 0.28) + '" cy="' + n(py - r * 0.3) + '" r="' + n(r * 0.2) + '" fill="#fff"/>';
  }

  /** Cute round eye (beasts): white, big ink pupil, glint. */
  function cuteEye(cx, cy, r, dx, dy) {
    dx = dx || 0; dy = dy == null ? r * 0.12 : dy;
    var px = n(cx + dx), py = n(cy + dy);
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + r + '" ry="' + n(r * 1.12) + '" fill="#fff"/>' +
      '<circle cx="' + px + '" cy="' + py + '" r="' + n(r * 0.62) + '" fill="' + C.ink + '"/>' +
      '<circle cx="' + n(px + r * 0.24) + '" cy="' + n(py - r * 0.28) + '" r="' + n(r * 0.24) + '" fill="#fff"/>';
  }

  /** Dizzy wavy mouth with tongue out (hurt bosses). */
  function hurtMouth(cx, cy, w) {
    var h = w / 2;
    return '<path d="M' + n(cx - 5) + ' ' + n(cy + 1) + 'v5a5 5 0 0 0 10 0v-5Z" fill="' + C.coral + '"/>' +
      line('M' + n(cx - w) + ' ' + cy + 'q' + n(h / 2) + ' -5 ' + h + ' 0t' + h + ' 0t' + h + ' 0t' + h + ' 0', 3.5);
  }

  /** Eyes group for bosses: glowing eyes normally, X eyes when hurt. */
  function bossEyes(list, r, iris, hurt, dy) {
    var s = '';
    for (var i = 0; i < list.length; i++) {
      s += hurt ? xEye(list[i][0], list[i][1], n(r * 0.62)) :
        glowEye(list[i][0], list[i][1], r, iris, list[i][2] || 0, dy || 0);
    }
    return '<g class="b-eyes">' + s + '</g>';
  }

  /** Classed hook groups (never given a transform attribute). */
  function limb(inner) { return '<g class="b-limb">' + inner + '</g>'; }

  /* ================================================================== *
   * WORLD ICONS (48 x 48). Main fill `c` (default white), accent `a`
   * (default sun) and detail ink `k`. When opts.color is supplied (e.g. the
   * locked grey) the accents are derived from it so the icon stays muted,
   * unless opts.accent is also given.
   * ================================================================== */
  var ICONS = {
    rocket: function (c, a, k) {
      return '<g transform="rotate(40 24 24) translate(-3 -3) scale(1.12)">' +
        '<path d="M19 31L24 44L29 31Z" fill="' + a + '"/>' +
        '<path d="M17 22L10 31L17 32ZM31 22L38 31L31 32Z" fill="' + c + '"/>' +
        '<path d="M24 4C32 10 33 21 31 32H17C15 21 16 10 24 4Z" fill="' + c + '"/>' +
        '<circle cx="24" cy="18" r="4.2" fill="' + k + '"/>' +
        '<circle cx="22.6" cy="16.6" r="1.3" fill="' + c + '"/></g>';
    },
    box: function (c, a) {
      return '<path d="M24 7L40 15L24 23L8 15Z" fill="' + c + '"/>' +
        '<path d="M8 15L24 23V41L8 33Z" fill="' + c + '" opacity=".88"/>' +
        '<path d="M40 15V33L24 41V23Z" fill="' + c + '" opacity=".72"/>' +
        '<path d="M15 11.5L31 19.5V25L15 17Z" fill="' + a + '"/>';
    },
    calc: function (c, a, k) {
      var b = '';
      for (var r = 0; r < 3; r++) {
        for (var q = 0; q < 3; q++) {
          b += '<circle cx="' + (18 + q * 6) + '" cy="' + (26 + r * 6) + '" r="2.3" fill="' +
            (q === 2 ? a : k) + '"' + (q === 2 ? '' : ' opacity=".45"') + '/>';
        }
      }
      return '<rect x="11" y="5" width="26" height="38" rx="6" fill="' + c + '"/>' +
        '<rect x="15" y="9" width="18" height="9" rx="2.5" fill="' + k + '"/>' +
        '<rect x="24" y="12" width="6" height="3" rx="1.5" fill="' + a + '"/>' + b;
    },
    fork: function (c, a) {
      return line('M24 42V27L12 14M24 27L36 14M10 21V12H19M38 21V12H29', 5, c) +
        '<circle cx="24" cy="27" r="5" fill="' + a + '"/>';
    },
    loop: function (c, a) {
      return '<path d="M24 10.5A13.5 13.5 0 1 1 10.5 24" fill="none" stroke="' + c +
        '" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M4.5 25.5H16.5L10.5 16Z" fill="' + c + '" stroke="' + c +
        '" stroke-width="2" stroke-linejoin="round"/>' +
        '<circle cx="24" cy="24" r="5" fill="' + a + '"/>';
    },
    func: function (c, a) {
      return line('M14 8C6 17 6 31 14 40M34 8C42 17 42 31 34 40', 4.5, c) +
        line('M29 14.5C27 11.5 21.5 11.8 21.5 17.5V34M17 22.5H27', 4.5, c) +
        '<circle cx="28" cy="33" r="3.2" fill="' + a + '"/>';
    },
    list: function (c, a, k) {
      var s = '<rect x="8" y="7" width="32" height="34" rx="7" fill="' + c + '"/>';
      for (var i = 0; i < 3; i++) {
        var y = 16 + i * 8;
        s += '<circle cx="15.5" cy="' + y + '" r="2.8" fill="' + a + '"/>' +
          '<rect x="21" y="' + (y - 1.7) + '" width="' + (i === 2 ? 9 : 13) +
          '" height="3.4" rx="1.7" fill="' + k + '" opacity=".45"/>';
      }
      return s;
    },
    arrow: function (c, a) {
      return '<rect x="29" y="29" width="14" height="14" rx="4" fill="' + a + '"/>' +
        line('M8 8L19 19', 5.5, c) +
        '<path d="M28 28L12.5 24.8L24.8 12.5Z" fill="' + c + '" stroke="' + c +
        '" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<circle cx="8" cy="8" r="4" fill="' + c + '"/>';
    },
    memory: function (c, a, k) {
      return line('M18 6V12M24 6V12M30 6V12M18 36V42M24 36V42M30 36V42' +
        'M6 18H12M6 24H12M6 30H12M36 18H42M36 24H42M36 30H42', 3.2, c) +
        '<rect x="11" y="11" width="26" height="26" rx="5" fill="' + c + '"/>' +
        '<rect x="17.5" y="17.5" width="13" height="13" rx="3" fill="' + a + '"/>' +
        '<circle cx="15.5" cy="15.5" r="1.6" fill="' + k + '" opacity=".5"/>';
    },
    class: function (c, a, k) {
      return '<rect x="8" y="7" width="32" height="34" rx="7" fill="' + c + '"/>' +
        '<path d="M8 18V14A7 7 0 0 1 15 7H33A7 7 0 0 1 40 14V18Z" fill="' + a + '"/>' +
        '<rect x="13" y="23" width="22" height="3.4" rx="1.7" fill="' + k + '" opacity=".45"/>' +
        '<rect x="13" y="31" width="15" height="3.4" rx="1.7" fill="' + k + '" opacity=".45"/>' +
        '<path d="M24 10L27 12.5L24 15L21 12.5Z" fill="' + c + '"/>';
    },
    tree: function (c, a) {
      return line('M24 11L13 25M24 11L35 25M13 25L7 38M13 25L19 38M35 25L35 38', 3.5, c) +
        '<circle cx="24" cy="11" r="6" fill="' + a + '"/>' +
        '<circle cx="13" cy="25" r="5" fill="' + c + '"/><circle cx="35" cy="25" r="5" fill="' + c + '"/>' +
        '<circle cx="7" cy="38" r="4" fill="' + c + '"/><circle cx="19" cy="38" r="4" fill="' + c + '"/>' +
        '<circle cx="35" cy="38" r="4" fill="' + c + '"/>';
    },
    castle: function (c, a, k) {
      return line('M24 22V6', 2.5, c) +
        '<path d="M24 6L34 9.5L24 13Z" fill="' + a + '"/>' +
        '<path d="M6 42V12H9.5V16H12.5V12H16V16H19V12H22.5V22H25.5V12H29V16H32V12H35.5V16H38.5V12H42V42Z" fill="' + c + '"/>' +
        '<path d="M19 42V34A5 5 0 0 1 29 34V42Z" fill="' + k + '"/>' +
        '<rect x="10.5" y="22" width="4" height="6" rx="2" fill="' + k + '" opacity=".6"/>' +
        '<rect x="33.5" y="22" width="4" height="6" rx="2" fill="' + k + '" opacity=".6"/>';
    },
    template: function (c, a) {
      return line('M16 12L6 24L16 36M32 12L42 24L32 36', 5, c) +
        line('M18 15H30M24 15V34', 5, a);
    },
    stl: function (c, a, k) {
      return line('M17.5 17V13.5A3.5 3.5 0 0 1 21 10H27A3.5 3.5 0 0 1 30.5 13.5V17', 4, c) +
        '<rect x="6" y="17" width="36" height="24" rx="5" fill="' + c + '"/>' +
        '<rect x="6" y="25" width="36" height="3" fill="' + k + '" opacity=".22"/>' +
        '<rect x="20" y="22" width="8" height="9" rx="2" fill="' + a + '"/>';
    },
    star: function (c, a) {
      return '<path d="M24 5L29.2 16.4L41.5 17.6L32.2 25.9L34.9 38L24 31.7L13.1 38L15.8 25.9L6.5 17.6L18.8 16.4Z" fill="' +
        c + '" stroke="' + c + '" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M40 30L41.3 33.7L45 35L41.3 36.3L40 40L38.7 36.3L35 35L38.7 33.7Z" fill="' + a + '"/>' +
        '<circle cx="24" cy="23" r="3.5" fill="' + a + '"/>';
    },
    crown: function (c, a) {
      return '<path d="M9 35L6 16L16 24L24 10L32 24L42 16L39 35Z" fill="' + c +
        '" stroke="' + c + '" stroke-width="2" stroke-linejoin="round"/>' +
        '<rect x="8" y="33" width="32" height="7" rx="2.5" fill="' + c + '"/>' +
        '<circle cx="6" cy="15" r="3" fill="' + c + '"/><circle cx="24" cy="9" r="3" fill="' + c + '"/>' +
        '<circle cx="42" cy="15" r="3" fill="' + c + '"/>' +
        '<circle cx="24" cy="28" r="3.4" fill="' + a + '"/>' +
        '<circle cx="15.5" cy="29.5" r="2.4" fill="' + a + '"/><circle cx="32.5" cy="29.5" r="2.4" fill="' + a + '"/>';
    }
  };

  function icon(key, opts) {
    opts = opts || {};
    var draw = ICONS[key] || ICONS.star;
    var c = opts.color || C.white;
    var a = opts.accent || (opts.color ? shade(opts.color, -0.25) : C.sun);
    var k = opts.color ? shade(opts.color, -0.45) : C.ink;
    return svg('art-icon', 48, draw(c, a, k));
  }

  /* ================================================================== *
   * BOSSES (200 x 200). Each builder receives `hurt` and returns the
   * markup that goes inside <g class="b-body">. The ground shadow is added
   * outside that group by boss().
   * ================================================================== */
  var BOSSES = {
    /* Gremlin: impish green creature, big ears, purple horns, toothy grin,
       clutching a broken semicolon. */
    gremlin: function (hurt) {
      var m = C.green, d = C.greenD, l = C.greenL;
      var ear = '<path d="M62 94C42 84 24 74 8 64C16 88 34 110 62 120Z" fill="' + m + '"/>' +
        '<path d="M58 98C44 90 32 82 21 75C27 90 38 104 58 112Z" fill="#FFB3C0"/>';
      var horn = '<path d="M76 70C68 54 70 40 80 30C83 44 88 54 94 62Z" fill="' + C.purple + '"/>' +
        '<path d="M79 60C75 50 76 42 80 36" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/>';
      /* The broken semicolon: dot, upper half of the comma, and the
         snapped-off tail below a jagged crack. */
      var semi = '<circle cx="22" cy="100" r="7.5" fill="' + C.ink + '"/>' +
        '<path d="M14.5 121A7.5 7.5 0 0 1 29.5 121V124L26 122L22 126L18 122L14.5 124Z" fill="' + C.ink + '"/>' +
        '<path d="M16 133L19.5 129.5L23 133L27 130.5C28 141 24 147 14 151C19 144 19 138 16 133Z" fill="' + C.ink + '"/>' +
        line('M5 125L10 126M34 124L39 121M7 134L11 131', 2.5, C.sun);
      var mouth = hurt ? hurtMouth(100, 136, 22) :
        '<path d="M70 128Q100 160 130 128Q100 137 70 128Z" fill="' + C.ink + '"/>' +
        '<ellipse cx="100" cy="143" rx="9" ry="4.5" fill="' + C.coral + '"/>' +
        fang(80, 130.5, 5) + fang(91, 132.5, 5) + fang(109, 132.5, 5) + fang(120, 130.5, 5) +
        fangUp(94, 145, 3.5) + fangUp(106, 145, 3.5);
      var brows = hurt ? line('M66 90L90 86M134 90L110 86', 6) : line('M64 86L91 97M136 86L109 97', 6.5);
      return limb('<path d="M140 150C170 152 176 124 162 108" fill="none" stroke="' + d +
          '" stroke-width="7" stroke-linecap="round"/>' +
          '<path d="M162 94L172 108L162 114L152 107Z" fill="' + C.purple + '"/>') +
        '<ellipse cx="78" cy="174" rx="18" ry="9" fill="' + d + '"/><ellipse cx="122" cy="174" rx="18" ry="9" fill="' + d + '"/>' +
        ear + flip(ear, 200) + horn + flip(horn, 200) +
        '<circle cx="100" cy="118" r="56" fill="' + m + '"/>' +
        '<ellipse cx="100" cy="146" rx="34" ry="24" fill="' + l + '"/>' +
        hl(74, 84, 15, 7, -32) +
        limb(semi + line('M56 134Q46 144 36 142', 13, m) + '<circle cx="34" cy="141" r="9.5" fill="' + m + '"/>') +
        limb(line('M146 132Q164 128 170 110', 13, m) + '<circle cx="171" cy="106" r="9.5" fill="' + m + '"/>' +
          '<path d="M164 98L163 89L169 96ZM171 96L173 87L176 96ZM177 99L182 92L181 102Z" fill="' + C.purple + '"/>') +
        cheeks(64, 136, 124, 8, 4.5, C.coral, 0.45) +
        bossEyes([[80, 108, 2], [120, 108, -2]], 14, C.sun, hurt, 1) + brows + mouth;
    },

    /* Blob: gooey purple slime, one huge teal eye, teal bubbles, drips. */
    blob: function (hurt) {
      var m = '#9B6BE8', d = C.purple, bub = C.tealL;
      function bubble(x, y, r) {
        return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + bub + '" opacity=".8"/>' +
          '<circle cx="' + n(x - r * 0.35) + '" cy="' + n(y - r * 0.35) + '" r="' + n(r * 0.3) + '" fill="#fff"/>';
      }
      var mouth = hurt ? hurtMouth(100, 142, 20) :
        '<path d="M66 134Q83 146 100 138Q117 146 134 134Q124 164 100 160Q76 164 66 134Z" fill="' + C.ink + '"/>' +
        fang(82, 139, 5.5) + fang(118, 139, 5.5) +
        '<ellipse cx="100" cy="153" rx="10" ry="4" fill="' + C.coral + '"/>';
      var brow = hurt ? line('M72 62Q100 52 128 62', 7) : line('M70 60L100 74L130 60', 7.5);
      return '<ellipse cx="100" cy="172" rx="66" ry="12" fill="' + d + '"/>' +
        limb('<path d="M50 122C28 118 18 100 24 84C28 76 40 78 39 88C38 98 46 104 58 104Z" fill="' + m + '"/>' +
          '<circle cx="31" cy="82" r="3" fill="#fff" opacity=".45"/>') +
        limb('<path d="M150 126C172 128 184 144 178 156C174 162 164 160 166 152C168 144 160 140 148 140Z" fill="' + m + '"/>') +
        '<path d="M34 170C26 120 44 56 100 50C156 56 174 120 166 170Z" fill="' + m + '"/>' +
        '<path d="M100 26Q92 40 100 46Q108 40 100 26Z" fill="' + m + '"/>' +
        '<path d="M48 150Q44 166 50 172Q56 166 52 150Z" fill="' + d + '" opacity=".6"/>' +
        '<path d="M146 146Q142 162 148 170Q154 162 150 146Z" fill="' + d + '" opacity=".6"/>' +
        hl(68, 78, 17, 8, -38) + hl(56, 108, 4, 8, -10, 0.3) +
        bubble(62, 138, 7) + bubble(138, 112, 5) + bubble(128, 150, 8) + bubble(80, 70, 4) + bubble(150, 86, 3.5) +
        cheeks(58, 142, 124, 9, 5, C.coral, 0.45) +
        bossEyes([[100, 100, 0]], 25, C.teal, hurt, 2) + brow + mouth;
    },

    /* Golem: chunky stone blocks, glowing sun cracks, "{ }" chest rune. */
    golem: function (hurt) {
      var m = C.stone, d = C.stoneD, l = C.stoneL, g = C.sun;
      function glow(dd, w) {
        return line(dd, w * 3, g).replace('/>', ' opacity=".28"/>') + line(dd, w, g);
      }
      var arm = '<rect x="20" y="84" width="34" height="56" rx="13" fill="' + m + '"/>' +
        '<rect x="14" y="130" width="44" height="34" rx="12" fill="' + l + '"/>' +
        line('M20 146H34M22 154H36', 3, d) + hl(27, 96, 4, 9, 0, 0.3);
      var eyes = hurt ? '<g class="b-eyes">' + xEye(86, 66, 6) + xEye(114, 66, 6) + '</g>' :
        '<g class="b-eyes">' +
        '<ellipse cx="86" cy="66" rx="13" ry="8.5" fill="' + g + '" opacity=".3"/>' +
        '<ellipse cx="114" cy="66" rx="13" ry="8.5" fill="' + g + '" opacity=".3"/>' +
        '<ellipse cx="86" cy="66" rx="8" ry="5" fill="' + g + '"/><ellipse cx="114" cy="66" rx="8" ry="5" fill="' + g + '"/>' +
        '<circle cx="87" cy="65" r="2.3" fill="#FFF8DC"/><circle cx="115" cy="65" r="2.3" fill="#FFF8DC"/></g>';
      var mouth = hurt ? hurtMouth(100, 76, 12) :
        '<rect x="87" y="73" width="26" height="7" rx="3.5" fill="' + C.ink + '"/>' + fangUp(92, 80, 3) + fangUp(108, 80, 3);
      return '<rect x="62" y="146" width="30" height="34" rx="10" fill="' + d + '"/>' +
        '<rect x="108" y="146" width="30" height="34" rx="10" fill="' + d + '"/>' +
        limb(arm) + limb(flip(arm, 200)) +
        '<rect x="46" y="76" width="108" height="86" rx="24" fill="' + m + '"/>' +
        hl(66, 90, 12, 6, -25) +
        '<rect x="70" y="98" width="60" height="46" rx="13" fill="' + d + '"/>' +
        glow('M93 106Q87 106 87 112V116Q87 121 82 121Q87 121 87 126V130Q87 136 93 136' +
          'M107 106Q113 106 113 112V116Q113 121 118 121Q113 121 113 126V130Q113 136 107 136', 4.5) +
        glow('M54 96L62 104L58 110L66 116', 3) + glow('M146 146L138 140L142 134L136 128', 3) +
        '<rect x="64" y="30" width="72" height="56" rx="17" fill="' + l + '"/>' +
        '<path d="M70 38Q74 28 86 32Q92 26 100 32Q88 36 70 40Z" fill="' + C.teal + '"/>' +
        '<circle cx="124" cy="36" r="4" fill="' + C.teal + '"/>' +
        hl(80, 44, 8, 4, -20) + glow('M128 46L122 52L126 56', 2.5) +
        '<path d="M68 48H132V53L100 62L68 53Z" fill="' + d + '"/>' +
        eyes + mouth;
    },

    /* Phantom: pale floating sheet ghost with hollow eyes, ball and chain. */
    phantom: function (hurt) {
      var m = '#E9E4FF', d = '#B9ABEE';
      var chain = '';
      for (var i = 0; i < 3; i++) {
        chain += '<ellipse cx="' + (22 - (i % 2) * 2) + '" cy="' + (98 + i * 11) +
          '" rx="4" ry="6.5" fill="none" stroke="' + C.sun + '" stroke-width="3.5"/>';
      }
      var eyes = hurt ? '<g class="b-eyes">' + xEye(82, 96, 9) + xEye(118, 96, 9) + '</g>' :
        '<g class="b-eyes">' +
        '<ellipse cx="82" cy="96" rx="13" ry="17" fill="' + C.ink + '"/><ellipse cx="118" cy="96" rx="13" ry="17" fill="' + C.ink + '"/>' +
        '<circle cx="84" cy="99" r="8" fill="' + C.coral + '" opacity=".35"/><circle cx="116" cy="99" r="8" fill="' + C.coral + '" opacity=".35"/>' +
        '<circle cx="84" cy="99" r="4.5" fill="' + C.coral + '"/><circle cx="116" cy="99" r="4.5" fill="' + C.coral + '"/>' +
        '<circle cx="78" cy="89" r="3" fill="#fff"/><circle cx="114" cy="89" r="3" fill="#fff"/></g>';
      var mouth = hurt ? hurtMouth(100, 130, 14) :
        '<ellipse cx="100" cy="131" rx="11" ry="13" fill="' + C.ink + '"/>' +
        '<ellipse cx="100" cy="138" rx="6" ry="4" fill="' + C.coral + '"/>' + fang(94, 119.5, 3.5) + fang(106, 119.5, 3.5);
      return limb('<path d="M56 100C38 104 26 98 18 86C30 86 42 86 56 88Z" fill="' + m + '"/>' + chain +
          '<circle cx="22" cy="140" r="11" fill="' + C.ink + '"/>' + hl(18, 136, 4, 2.5, -30, 0.5)) +
        limb('<path d="M144 100C164 106 176 122 174 138C166 126 156 118 144 116Z" fill="' + m + '"/>') +
        '<path d="M52 150V92C52 44 148 44 148 92V150Q140 140 132 152Q124 166 116 152Q108 140 100 152Q92 166 84 152Q76 140 68 152Q60 164 52 150Z" fill="' + m + '"/>' +
        '<path d="M132 152Q124 166 116 152Q108 140 100 152Q92 166 84 152L84 158Q92 170 100 160Q108 150 116 160Q124 170 132 158Z" fill="' + d + '" opacity=".6"/>' +
        hl(74, 64, 14, 7, -30, 0.7) +
        cheeks(66, 134, 118, 8, 4.5, C.coral, 0.4) +
        (hurt ? line('M66 76L92 72M134 76L108 72', 5) : line('M66 72L94 80M134 72L106 80', 5.5)) +
        eyes + mouth;
    },

    /* Hydra: teal three-headed serpent; each head carries its own eyes. */
    hydra: function (hurt) {
      var m = C.teal, d = C.tealD, l = C.tealL;
      /* One head drawn at (cx, cy) with scale s. The outer group positions
         it; the b-eyes group inside stays transform-free. */
      /* Compact sun-iris eye (no halo) to keep three heads lightweight. */
      /* Eye layers are grouped by fill to keep the markup small. */
      var dots = function (r, dy, fill) {
        return '<g fill="' + fill + '"><circle cx="-8" cy="' + dy + '" r="' + r + '"/><circle cx="8" cy="' + dy +
          '" r="' + r + '"/></g>';
      };
      var headEyes = hurt ? xEye(-8, -4, 4.5) + xEye(8, -4, 4.5) :
        dots(6.5, -4, '#fff') + dots(4.2, -3, C.sun) + dots(2.3, -3, C.ink) +
        '<g fill="#fff"><circle cx="-6.5" cy="-5" r="1.2"/><circle cx="9.5" cy="-5" r="1.2"/></g>';
      function head(cx, cy, s) {
        var eyes = headEyes;
        /* Brows + smirk share one ink path; both fangs share one white path. */
        var mouth = hurt ? hurtMouth(0, 11, 8) :
          line('M-15 -13L-3 -8M15 -13L3 -8M-8 10Q0 15 8 10', 3) +
          '<path d="M-6.6 11.5L-4.5 15.4L-2.4 11.5ZM2.4 11.5L4.5 15.4L6.6 11.5Z" fill="#fff"/>';
        return '<g transform="translate(' + cx + ' ' + cy + ') scale(' + s + ')">' +
          '<path d="M-12 -14L-9 -26L-4 -16ZM-3 -18L1 -30L5 -18ZM6 -16L11 -26L13 -13Z" fill="' + C.sun + '"/>' +
          '<ellipse cx="0" cy="0" rx="21" ry="18" fill="' + m + '"/>' +
          '<ellipse cx="0" cy="9" rx="14" ry="8" fill="' + l + '"/>' +
          hl(-10, -9, 6, 3, -30) +
          '<g class="b-eyes">' + eyes + '</g>' + mouth + '</g>';
      }
      return limb('<path d="M146 162C172 166 184 150 180 134" fill="none" stroke="' + m +
          '" stroke-width="12" stroke-linecap="round"/><path d="M180 122L188 134L176 138Z" fill="' + C.sun + '"/>') +
        '<ellipse cx="72" cy="178" rx="15" ry="8" fill="' + d + '"/><ellipse cx="128" cy="178" rx="15" ry="8" fill="' + d + '"/>' +
        limb(line('M78 140C58 122 44 106 44 88', 20, m) + head(44, 82, 1.05)) +
        limb(line('M122 140C142 122 156 106 156 88', 20, m) + head(156, 82, 1.05)) +
        '<ellipse cx="100" cy="148" rx="54" ry="34" fill="' + m + '"/>' +
        line('M100 136V74', 24, m) +
        '<ellipse cx="100" cy="158" rx="32" ry="18" fill="' + l + '"/>' +
        hl(70, 132, 12, 5, -20) +
        head(100, 60, 1.35);
    },

    /* Wraith: dark hooded cloak, void face, glowing teal eyes, floating hands. */
    wraith: function (hurt) {
      var m = '#4B3A7A', d = '#2F2356', hand = '#CBBEF5', glow = '#5FF0DC';
      function orbHand(x, y) {
        return '<circle cx="' + x + '" cy="' + (y - 20) + '" r="15" fill="' + glow + '" opacity=".25"/>' +
          '<circle cx="' + x + '" cy="' + (y - 20) + '" r="9" fill="' + glow + '"/>' +
          '<circle cx="' + (x - 3) + '" cy="' + (y - 23) + '" r="3" fill="#fff"/>' +
          '<ellipse cx="' + x + '" cy="' + y + '" rx="11" ry="8" fill="' + hand + '"/>' +
          line('M' + (x - 8) + ' ' + (y - 4) + 'l-3 -7M' + x + ' ' + (y - 6) + 'v-7M' + (x + 8) + ' ' + (y - 4) + 'l3 -7', 4, hand);
      }
      var eyes = hurt ? '<g class="b-eyes">' + xEye(84, 96, 7, glow) + xEye(116, 96, 7, glow) + '</g>' :
        '<g class="b-eyes">' +
        '<circle cx="84" cy="96" r="13" fill="' + glow + '" opacity=".22"/><circle cx="116" cy="96" r="13" fill="' + glow + '" opacity=".22"/>' +
        '<path d="M72 90L96 98Q92 106 82 104Q74 100 72 90Z" fill="' + glow + '"/>' +
        '<path d="M128 90L104 98Q108 106 118 104Q126 100 128 90Z" fill="' + glow + '"/>' +
        '<circle cx="86" cy="100" r="2.5" fill="#fff"/><circle cx="114" cy="100" r="2.5" fill="#fff"/></g>';
      var mouth = hurt ? hurtMouth(100, 114, 12) :
        line('M84 114L88 118L92 114L96 118L100 114L104 118L108 114L112 118L116 114', 2.5, glow);
      return limb(orbHand(32, 132)) + limb(orbHand(168, 124)) +
        '<path d="M40 172C42 120 50 72 100 38C150 72 158 120 160 172L147 160L134 174L121 160L108 174L100 162L92 174L79 160L66 174L53 160Z" fill="' + m + '"/>' +
        '<path d="M53 160L66 174L79 160L92 174L100 162L108 174L121 160L134 174L147 160L148 150Q100 166 52 150Z" fill="' + d + '"/>' +
        '<path d="M64 112C64 78 82 62 100 60C118 62 136 78 136 112C124 128 76 128 64 112Z" fill="#1A1330"/>' +
        hl(72, 70, 12, 5, -45, 0.2) +
        line('M60 118Q100 140 140 118', 5, d) +
        '<circle cx="100" cy="132" r="7" fill="' + C.sun + '"/><circle cx="98" cy="130" r="2" fill="#fff"/>' +
        eyes + mouth;
    },

    /* Sentinel: sky-blue guard robot with a single coral visor eye. */
    sentinel: function (hurt) {
      var m = C.sky, d = C.skyD, l = C.skyL;
      var eye = hurt ? '<g class="b-eyes">' + xEye(100, 70, 6.5, C.coral) + '</g>' :
        '<g class="b-eyes"><ellipse cx="100" cy="70" rx="19" ry="10" fill="' + C.coral + '" opacity=".35"/>' +
        '<circle cx="100" cy="70" r="8" fill="' + C.coral + '"/><circle cx="100" cy="70" r="3.5" fill="#FFE3E7"/>' +
        '<circle cx="103.5" cy="66.5" r="2" fill="#fff"/></g>';
      var grill = hurt ? hurtMouth(100, 88, 10) :
        '<rect x="86" y="85" width="28" height="7" rx="3.5" fill="' + C.ink + '"/>' + line('M93 86V91M100 86V91M107 86V91', 1.8, l);
      var claw = '<circle cx="46" cy="110" r="11" fill="' + d + '"/>' +
        '<rect x="22" y="108" width="18" height="42" rx="9" fill="' + m + '"/>' +
        '<path d="M20 150Q16 166 26 170M42 150Q46 166 36 170" fill="none" stroke="' + d + '" stroke-width="6" stroke-linecap="round"/>' +
        '<circle cx="31" cy="150" r="7" fill="' + d + '"/>';
      return '<rect x="66" y="156" width="26" height="26" rx="8" fill="' + d + '"/><rect x="108" y="156" width="26" height="26" rx="8" fill="' + d + '"/>' +
        limb(claw) + limb(flip(claw, 200)) +
        '<rect x="48" y="92" width="104" height="72" rx="26" fill="' + m + '"/>' +
        hl(66, 104, 10, 5, -25) +
        '<rect x="70" y="112" width="60" height="34" rx="10" fill="' + d + '"/>' +
        '<circle cx="85" cy="129" r="5.5" fill="' + C.sun + '"/><circle cx="100" cy="129" r="5.5" fill="' + C.coral + '"/>' +
        '<circle cx="115" cy="129" r="5.5" fill="' + C.tealL + '"/>' +
        line('M100 52V32', 4, d) + '<circle cx="100" cy="28" r="8" fill="' + C.sun + '"/>' + hl(97, 25, 3, 2, 0, 0.7) +
        '<path d="M56 96C56 40 144 40 144 96Z" fill="' + l + '"/>' +
        hl(76, 58, 10, 5, -30, 0.6) +
        '<rect x="62" y="58" width="76" height="24" rx="12" fill="' + C.ink + '"/>' +
        (hurt ? '' : '<path d="M70 57L100 63L130 57V53H70Z" fill="' + d + '"/>') +
        '<path d="M52 98L42 82L64 92ZM148 98L158 82L136 92Z" fill="' + C.sun + '"/>' +
        '<circle cx="62" cy="92" r="3" fill="' + d + '"/><circle cx="138" cy="92" r="3" fill="' + d + '"/>' +
        eye + grill;
    },

    /* Dragon: chubby coral dragon, tangerine wings, sun horns, smoke puffs. */
    dragon: function (hurt) {
      var m = C.coral, d = C.coralD, l = C.coralL;
      var wing = '<path d="M60 104C38 82 18 78 6 88C16 92 18 100 14 108C24 106 30 112 30 120C38 114 50 114 60 122Z" fill="' + C.tang + '"/>' +
        line('M58 108L16 92M58 114L28 110', 2.5, C.tangD);
      var horn = '<path d="M72 54C62 40 60 28 64 16C72 28 80 38 86 46Z" fill="' + C.sun + '"/>';
      var mouth = hurt ? hurtMouth(100, 106, 16) :
        line('M82 104Q100 114 118 104', 3.5) + fang(89, 107, 4.5) + fang(111, 107, 4.5);
      return limb('<path d="M136 162C168 168 184 150 178 128" fill="none" stroke="' + m +
          '" stroke-width="12" stroke-linecap="round"/><path d="M178 112L188 128L176 134L168 124Z" fill="' + C.sun + '"/>') +
        limb(wing) + limb(flip(wing, 200)) +
        '<ellipse cx="76" cy="176" rx="16" ry="9" fill="' + d + '"/><ellipse cx="124" cy="176" rx="16" ry="9" fill="' + d + '"/>' +
        '<ellipse cx="100" cy="138" rx="46" ry="42" fill="' + m + '"/>' +
        '<ellipse cx="100" cy="148" rx="28" ry="28" fill="' + C.sunL + '"/>' +
        line('M80 138H120M78 150H122M82 162H118', 2.5, C.sunD).replace('/>', ' opacity=".35"/>') +
        horn + flip(horn, 200) +
        '<path d="M92 44L100 30L108 44Z" fill="' + d + '"/>' +
        '<ellipse cx="100" cy="78" rx="44" ry="37" fill="' + m + '"/>' +
        hl(74, 56, 13, 6, -30) +
        '<ellipse cx="100" cy="98" rx="25" ry="15" fill="' + l + '"/>' +
        '<ellipse cx="92" cy="93" rx="3" ry="2.2" fill="' + d + '"/><ellipse cx="108" cy="93" rx="3" ry="2.2" fill="' + d + '"/>' +
        '<circle cx="140" cy="48" r="6" fill="#fff" opacity=".6"/><circle cx="150" cy="38" r="4.5" fill="#fff" opacity=".5"/>' +
        '<circle cx="157" cy="29" r="3" fill="#fff" opacity=".4"/>' +
        cheeks(64, 136, 92, 7, 4, '#fff', 0.35) +
        bossEyes([[80, 72, 2], [120, 72, -2]], 12, C.sun, hurt, 1) +
        (hurt ? line('M66 56L90 54M134 56L110 54', 5.5) : line('M64 54L92 63M136 54L108 63', 6)) +
        mouth;
    }
  };

  function boss(key, opts) {
    opts = opts || {};
    if (!BOSSES[key]) key = 'gremlin';
    var hurt = !!opts.hurt;
    return svg('art-boss art-boss-' + key, 200,
      shadow(100, 188, key === 'phantom' || key === 'wraith' ? 42 : 58, 8) +
      '<g class="b-body">' + BOSSES[key](hurt) + '</g>');
  }

  /* ================================================================== *
   * BESTIARY BEASTS (120 x 120). Builders receive a paint kit `p`:
   *   p.m / p.d / p.l   main, darker, much lighter body colour
   *   p.s               slightly lighter body colour (alternating segments)
   *   p.a(col)          an accent fill (-> lock grey when locked)
   *   p.x(col)          a small detail (-> slightly darker grey when locked)
   *   p.L               true when rendering the locked silhouette
   *   p.hl / p.cheeks / p.eye  decorations that vanish when locked
   * Builders return { body, eyes } so beast() can wrap the hook groups.
   * ================================================================== */
  function paint(main, locked) {
    var L = !!locked;
    return {
      L: L,
      m: L ? C.lockD : main,
      d: L ? C.lockD : shade(main, -0.22),
      l: L ? C.lockD : shade(main, 0.5),
      s: L ? C.lockD : shade(main, 0.22),
      a: function (col) { return L ? C.lockD : col; },
      x: function (col) { return L ? C.lockX : col; },
      hl: function (cx, cy, rx, ry, rot, op) { return L ? '' : hl(cx, cy, rx, ry, rot, op); },
      cheeks: function (x1, x2, y, rx, ry) { return L ? '' : cheeks(x1, x2, y, rx, ry, C.coral, 0.5); },
      eye: function (cx, cy, r, dx, dy) { return L ? '' : cuteEye(cx, cy, r, dx, dy); },
      ink: function (d, w) { return L ? '' : line(d, w); },
      white: function (s) { return L ? '' : s; }
    };
  }

  var BEASTS = {
    /* Imp: little coral devil with bat wings and a spade tail. */
    imp: {
      color: C.coral,
      draw: function (p) {
        var wing = '<path d="M38 64C26 50 14 52 8 60C14 62 14 68 12 74C20 72 26 76 28 82Z" fill="' + p.d + '"/>';
        var horn = '<path d="M42 50L36 30L54 44Z" fill="' + p.a(C.sun) + '"/>';
        return {
          body: '<path d="M80 90C96 94 100 78 94 70" fill="none" stroke="' + p.d + '" stroke-width="4" stroke-linecap="round"/>' +
            '<path d="M94 60L100 72L90 72Z" fill="' + p.d + '"/>' +
            wing + flip(wing, 120) + horn + flip(horn, 120) +
            '<ellipse cx="50" cy="99" rx="9" ry="5" fill="' + p.d + '"/><ellipse cx="70" cy="99" rx="9" ry="5" fill="' + p.d + '"/>' +
            '<circle cx="60" cy="70" r="28" fill="' + p.m + '"/>' +
            '<ellipse cx="60" cy="84" rx="15" ry="10" fill="' + p.l + '"/>' +
            p.hl(46, 54, 8, 4, -30) + p.cheeks(42, 78, 76, 5, 3) +
            p.ink('M52 80Q60 86 68 80', 3) + p.white(fang(64, 82, 3)) +
            p.ink('M42 56L54 60M78 56L66 60', 3),
          eyes: p.eye(51, 66, 7, 1) + p.eye(69, 66, 7, -1)
        };
      }
    },

    /* Bug: tangerine ladybird with ink spots and curly antennae. */
    bug: {
      color: C.tang,
      draw: function (p) {
        var legs = 'M36 64L24 58M34 76L20 76M38 88L26 96';
        var headC = p.a('#3A2F55');
        return {
          body: '<path d="' + legs + '" fill="none" stroke="' + p.x(C.ink) + '" stroke-width="4" stroke-linecap="round"/>' +
            flip('<path d="' + legs + '" fill="none" stroke="' + p.x(C.ink) + '" stroke-width="4" stroke-linecap="round"/>', 120) +
            '<path d="M52 30Q44 16 36 20M68 30Q76 16 84 20" fill="none" stroke="' + p.x(C.ink) + '" stroke-width="3" stroke-linecap="round"/>' +
            '<circle cx="36" cy="20" r="4" fill="' + p.a(C.sun) + '"/><circle cx="84" cy="20" r="4" fill="' + p.a(C.sun) + '"/>' +
            '<circle cx="60" cy="44" r="18" fill="' + headC + '"/>' +
            '<ellipse cx="60" cy="76" rx="32" ry="28" fill="' + p.m + '"/>' +
            '<path d="M60 50V104" stroke="' + p.d + '" stroke-width="3"/>' +
            '<circle cx="44" cy="70" r="6" fill="' + p.x(C.ink) + '"/><circle cx="78" cy="68" r="5" fill="' + p.x(C.ink) + '"/>' +
            '<circle cx="48" cy="90" r="4.5" fill="' + p.x(C.ink) + '"/><circle cx="74" cy="90" r="6" fill="' + p.x(C.ink) + '"/>' +
            p.hl(42, 58, 9, 4, -30) + p.cheeks(46, 74, 52, 4, 2.5),
          eyes: p.eye(53, 42, 5.5, 0.5) + p.eye(67, 42, 5.5, -0.5)
        };
      }
    },

    /* Ghost: small pale lavender ghost going "ooh". */
    ghost: {
      color: '#E9E4FF',
      draw: function (p) {
        return {
          body: '<path d="M36 72C22 74 14 66 14 58C20 62 28 62 36 58Z" fill="' + p.d + '"/>' +
            '<path d="M84 72C98 74 106 66 106 58C100 62 92 62 84 58Z" fill="' + p.d + '"/>' +
            '<path d="M30 96V56C30 18 90 18 90 56V96Q85 90 80 98Q75 106 70 98Q65 90 60 98Q55 106 50 98Q45 90 40 98Q35 104 30 96Z" fill="' + p.m + '"/>' +
            (p.L ? '' : '<path d="M30 86V96Q35 104 40 98Q45 90 50 98Q55 106 60 98Q65 90 70 98Q75 106 80 98Q85 90 90 96V86Q60 96 30 86Z" fill="' + p.d + '" opacity=".45"/>') +
            p.hl(44, 38, 9, 5, -30, 0.7) + (p.L ? '' : cheeks(40, 80, 68, 5, 3, C.coral, 0.4)) +
            (p.L ? '' : '<ellipse cx="60" cy="74" rx="5" ry="6" fill="' + C.ink + '"/>'),
          eyes: p.L ? '' : '<ellipse cx="50" cy="58" rx="5.5" ry="8" fill="' + C.ink + '"/><ellipse cx="70" cy="58" rx="5.5" ry="8" fill="' + C.ink + '"/>' +
            '<circle cx="52" cy="54" r="2" fill="#fff"/><circle cx="72" cy="54" r="2" fill="#fff"/>'
        };
      }
    },

    /* Slime: teal jelly drop with bubbles. */
    slime: {
      color: C.teal,
      draw: function (p) {
        return {
          body: '<ellipse cx="60" cy="102" rx="38" ry="6" fill="' + p.d + '"/>' +
            '<path d="M20 98C18 64 38 42 60 42C82 42 102 64 100 98C100 106 20 106 20 98Z" fill="' + p.m + '"/>' +
            '<path d="M54 44C52 34 58 26 68 24C64 30 64 36 68 44Z" fill="' + p.m + '"/>' +
            p.hl(40, 58, 9, 4.5, -40) +
            (p.L ? '' : '<circle cx="80" cy="84" r="5" fill="#fff" opacity=".35"/><circle cx="36" cy="88" r="3" fill="#fff" opacity=".35"/>' +
              '<circle cx="74" cy="56" r="2.5" fill="#fff" opacity=".35"/>') +
            p.cheeks(40, 80, 80, 5, 3) + p.ink('M52 80Q60 88 68 80', 3),
          eyes: p.eye(50, 70, 7, 0.5) + p.eye(70, 70, 7, -0.5)
        };
      }
    },

    /* Worm: segmented pink worm peeking up. */
    worm: {
      color: '#FF8FA8',
      draw: function (p) {
        var segs = [[22, 96, 11], [38, 94, 13], [55, 90, 14], [70, 80, 15]];
        var s = '';
        for (var i = 0; i < segs.length; i++) {
          s += '<circle cx="' + segs[i][0] + '" cy="' + segs[i][1] + '" r="' + segs[i][2] + '" fill="' + (i % 2 ? p.m : p.s) + '"/>';
        }
        return {
          body: s + '<circle cx="80" cy="54" r="24" fill="' + p.m + '"/>' +
            '<path d="M74 32Q70 20 62 18M86 32Q92 20 100 20" fill="none" stroke="' + p.x(C.ink) + '" stroke-width="3" stroke-linecap="round"/>' +
            '<circle cx="62" cy="18" r="4" fill="' + p.a(C.sun) + '"/><circle cx="100" cy="20" r="4" fill="' + p.a(C.sun) + '"/>' +
            p.hl(70, 40, 7, 4, -30) + p.cheeks(64, 96, 64, 4.5, 3) + p.ink('M74 66Q80 72 86 66', 3),
          eyes: p.eye(72, 52, 6, 0.5) + p.eye(89, 52, 6, -0.5)
        };
      }
    },

    /* Spider: round purple spider with eight bendy legs and tiny fangs. */
    spider: {
      color: C.purple,
      draw: function (p) {
        var legs = 'M40 62Q22 44 12 56M38 72Q18 66 10 78M40 82Q22 88 16 102M46 90Q36 102 36 110';
        var st = '" fill="none" stroke="' + p.d + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>';
        return {
          body: '<path d="' + legs + st + flip('<path d="' + legs + st, 120) +
            '<path d="M60 4V42" stroke="' + p.x(C.ink) + '" stroke-width="2" opacity=".35"/>' +
            '<circle cx="60" cy="70" r="28" fill="' + p.m + '"/>' +
            p.hl(46, 54, 9, 4, -30) + p.cheeks(42, 78, 80, 5, 3) +
            p.white(fang(55, 86, 3.5) + fang(65, 86, 3.5)) + p.ink('M52 85Q60 89 68 85', 2.5),
          eyes: p.eye(51, 68, 7, 0.5) + p.eye(69, 68, 7, -0.5) +
            (p.L ? '' : '<circle cx="46" cy="55" r="3" fill="' + C.ink + '"/><circle cx="74" cy="55" r="3" fill="' + C.ink + '"/>')
        };
      }
    },

    /* Moth: fluffy sky-blue moth with big spotted wings. */
    moth: {
      color: C.sky,
      draw: function (p) {
        var wings = '<ellipse cx="34" cy="50" rx="24" ry="20" fill="' + p.m + '" transform="rotate(-25 34 50)"/>' +
          '<ellipse cx="38" cy="82" rx="16" ry="13" fill="' + p.d + '" transform="rotate(20 38 82)"/>' +
          '<circle cx="30" cy="48" r="7" fill="' + p.a(C.sun) + '"/><circle cx="30" cy="48" r="3" fill="' + p.x(C.ink) + '"/>' +
          (p.L ? '' : '<circle cx="36" cy="84" r="4" fill="#fff" opacity=".45"/>');
        return {
          body: wings + flip(wings, 120) +
            '<path d="M54 34Q48 18 38 16M66 34Q72 18 82 16" fill="none" stroke="' + p.x(C.ink) + '" stroke-width="3" stroke-linecap="round"/>' +
            '<ellipse cx="60" cy="72" rx="15" ry="30" fill="' + p.l + '"/>' +
            '<circle cx="60" cy="48" r="17" fill="' + p.l + '"/>' +
            p.hl(54, 40, 6, 3, -30, 0.6) + p.cheeks(48, 72, 56, 4, 2.5) + p.ink('M55 57Q60 61 65 57', 2.5),
          eyes: p.eye(53, 47, 5.5, 0.5) + p.eye(67, 47, 5.5, -0.5)
        };
      }
    },

    /* Gremlin: pocket-size version of the boss gremlin. */
    gremlin: {
      color: C.green,
      draw: function (p) {
        var ear = '<path d="M38 60C26 54 16 48 6 42C12 58 22 70 38 76Z" fill="' + p.m + '"/>' +
          (p.L ? '' : '<path d="M35 63C27 58 20 54 14 50C18 60 25 68 35 72Z" fill="#FFB3C0"/>');
        var horn = '<path d="M46 46C40 36 42 28 48 22C50 30 54 36 58 42Z" fill="' + p.a(C.purple) + '"/>';
        return {
          body: ear + flip(ear, 120) + horn + flip(horn, 120) +
            '<ellipse cx="48" cy="101" rx="10" ry="5" fill="' + p.d + '"/><ellipse cx="72" cy="101" rx="10" ry="5" fill="' + p.d + '"/>' +
            '<circle cx="60" cy="72" r="30" fill="' + p.m + '"/>' +
            '<ellipse cx="60" cy="88" rx="17" ry="11" fill="' + p.l + '"/>' +
            p.hl(46, 54, 8, 4, -30) + p.cheeks(40, 80, 80, 5, 3) +
            (p.L ? '' : '<path d="M46 80Q60 96 74 80Q60 85 46 80Z" fill="' + C.ink + '"/>' +
              fang(52, 81.8, 3) + fang(60, 83.5, 3) + fang(68, 81.8, 3)) +
            p.ink('M42 58L54 63M78 58L66 63', 3.5),
          eyes: p.eye(51, 68, 7, 0.5) + p.eye(69, 68, 7, -0.5)
        };
      }
    }
  };

  function beast(key, opts) {
    opts = opts || {};
    var def = BEASTS[key] || BEASTS.bug;
    var p = paint(opts.color || def.color, opts.locked);
    var parts = def.draw(p);
    return svg('art-beast', 120,
      shadow(60, 110, 32, 5) +
      '<g class="bs-body">' + parts.body + '<g class="bs-eyes">' + parts.eyes + '</g></g>');
  }

  CH.art = {
    icon: icon,
    boss: boss,
    beast: beast,
    keys: {
      icons: Object.keys(ICONS),
      bosses: Object.keys(BOSSES),
      beasts: Object.keys(BEASTS)
    }
  };
})();
