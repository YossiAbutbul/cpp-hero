/* ==========================================================================
   Cpp Hero — engine/curlo.js
   Curlo, the brace-bean companion. The base SVG and its CSS are copied
   VERBATIM from designs/5-springboard.html (moods happy/celebrate/worried/
   thinking/bracing, shield tiers 1..3). Everything else is purely additive:
     - evolution gear layers (Form 2: scarf + goggles; Form 3: + cape, boots,
       star pin) drawn in extra <g> groups on top of / behind the body,
     - hats (cosmetics), color variants (CSS override of the body fill only),
     - mood reactions (WAAPI), voice lines, speech bubbles,
     - the dramatic, tap-skippable evolution sequence.
   ========================================================================== */
(function () {
  'use strict';
  var CH = window.CH, U = CH.util;

  function S() { return CH.store.state; }

  /* ---------------- state derived from the save ---------------- */

  /** Shield tier from the Defense stat (1 wood, 2 steel + helm, 3 golden guard). */
  function tierFor(def) { return def >= 60 ? 3 : def >= 25 ? 2 : 1; }
  var TIERS = {
    1: { name: 'Wooden Shield', next: 'Steel Shield + Helm at Defense 25' },
    2: { name: 'Steel Shield + Helm', next: 'Golden Guard at Defense 60' },
    3: { name: 'Golden Guard', next: 'Maxed out! Plume included, at no extra charge.' }
  };

  /** Evolution form: 1 base; 2 after World 4's boss; 3 after World 8's boss. */
  var FORMS = {
    1: { name: 'Sprout', gear: 'Just Curlo, full of potential' },
    2: { name: 'Trailblazer', gear: 'Scarf + goggles', after: 4 },
    3: { name: 'Champion', gear: 'Cape + boots + star pin', after: 8 }
  };
  function beatWorldNum(n) {
    var bosses = S().bosses || {};
    return Object.keys(bosses).some(function (id) {
      var m = /^w(\d+)\.boss$/.exec(id);
      return m && +m[1] >= n && bosses[id] && bosses[id].beaten;
    });
  }
  function formNow() {
    if (curlo.devForm) return curlo.devForm;
    return beatWorldNum(8) ? 3 : beatWorldNum(4) ? 2 : 1;
  }

  /* ---------------- color variants + shield skins ----------------
     Classic uses the original CSS untouched. Other variants override only the
     body/belly fills through CSS custom properties. */
  var FALLBACK_COLORS = { classic: '#F2641B', berry: '#FF5A70', mint: '#0FA898', sky: '#3D8BFF', sunny: '#FFC62E', grape: '#7A4FD0', midnight: '#2A2140' };
  function variantColor(id) {
    var d = CH.game && CH.game.cosmeticDef ? CH.game.cosmeticDef(id) : null;
    return (d && d.color) || FALLBACK_COLORS[id] || FALLBACK_COLORS.classic;
  }
  function mix(hex, w, t) {
    var n = parseInt(String(hex).replace('#', ''), 16);
    if (isNaN(n)) return hex;
    var r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    var W = w === 'black' ? 0 : 255;
    r = Math.round(r + (W - r) * t); g = Math.round(g + (W - g) * t); b = Math.round(b + (W - b) * t);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function variantStyle(id) {
    if (!id || id === 'classic') return '';
    var c = variantColor(id);
    return '--cv:' + c + ';--cvb:' + mix(c, 'white', 0.42) + ';';
  }

  /* ---------------- gear + hats (additive layers) ---------------- */

  // Behind the body (inserted before the body rect so the body covers it).
  function gearBack(form) {
    if (form < 3) return '';
    return '<g class="g-cape">' +
      '<path d="M48 60 Q26 108 16 160 Q48 150 80 164 Q112 150 144 160 Q134 108 112 60 Z" fill="#7A4FD0" stroke="#5B35AE" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M40 120 Q60 116 80 124 Q100 116 120 120" fill="none" stroke="#9D7BEA" stroke-width="3" stroke-linecap="round" opacity=".8"/>' +
      '</g>';
  }

  // On top of the face (inside the breathing body group).
  function gearFront(form, hat) {
    var s = '';
    if (form >= 3) {
      s += '<g class="g-boots">' +
        '<rect x="50" y="144" width="24" height="15" rx="7" fill="#2A2140"/><rect x="86" y="144" width="24" height="15" rx="7" fill="#2A2140"/>' +
        '<rect x="50" y="144" width="24" height="5" rx="2.5" fill="#FFC62E"/><rect x="86" y="144" width="24" height="5" rx="2.5" fill="#FFC62E"/>' +
        '</g>';
    }
    if (form >= 2) {
      // Scarf band + fluttering tail.
      s += '<g class="g-scarf">' +
        '<path class="g-scarf-tail" d="M98 134 L114 162 L103 166 L91 138 Z" fill="#FF5A70" stroke="#D0324C" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M39 124 Q80 138 121 124 L121 137 Q80 151 39 137 Z" fill="#FF5A70" stroke="#D0324C" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M52 131 L56 141 M66 134 L69 144 M92 134 L90 144 M106 131 L103 141" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>' +
        (form >= 3
          ? '<path d="M98 126 L101.5 133 L109 133.6 L103.3 138.4 L105 146 L98 142 L91 146 L92.7 138.4 L87 133.6 L94.5 133Z" fill="#FFC62E" stroke="#C98C00" stroke-width="2" stroke-linejoin="round"/>'
          : '<circle cx="98" cy="136" r="5.5" fill="#FFC62E" stroke="#C98C00" stroke-width="2"/>') +
        '</g>';
      // Goggles pushed up on the forehead.
      s += '<g class="g-goggles">' +
        '<path d="M41 49 Q80 36 119 49" fill="none" stroke="#2A2140" stroke-width="5" stroke-linecap="round"/>' +
        '<circle cx="66" cy="44" r="9.5" fill="#C4F1EA" stroke="#2A2140" stroke-width="3.5"/>' +
        '<circle cx="94" cy="44" r="9.5" fill="#C4F1EA" stroke="#2A2140" stroke-width="3.5"/>' +
        '<path d="M75.5 44 L84.5 44" stroke="#2A2140" stroke-width="3.5"/>' +
        '<ellipse cx="63" cy="41" rx="3.5" ry="2.4" fill="#fff"/><ellipse cx="91" cy="41" rx="3.5" ry="2.4" fill="#fff"/>' +
        '</g>';
    }
    if (hat) s += hatSVG(hat);
    return s;
  }

  /** Hat art keyed by cosmetic id keywords; unknown ids get a party hat tinted by hash. */
  function hatSVG(id) {
    var k = String(id).toLowerCase();
    var tints = ['#3D8BFF', '#0FA898', '#FF5A70', '#7A4FD0', '#FFC62E'];
    var c = tints[U.hash(k) % tints.length];
    var g = '<g class="g-hat" transform="translate(80 36)">';
    if (/bowtie|bow-tie/.test(k)) {
      // Bow tie sits at the neck, below the mouth.
      g += '<g transform="translate(0 84)"><path d="M0 0 L-17 -9 L-17 9 Z M0 0 L17 -9 L17 9 Z" fill="#7A4FD0" stroke="#5B35AE" stroke-width="3" stroke-linejoin="round"/><circle r="5" fill="#0FA898" stroke="#077A6F" stroke-width="2"/></g>';
    } else if (/helm/.test(k)) {
      // Chunky stone-grey helmet with a sun-yellow rune.
      g += '<path d="M-38 16 Q-40 -26 0 -28 Q40 -26 38 16 Q20 8 0 8 Q-20 8 -38 16Z" fill="#A89C8C" stroke="#6E6457" stroke-width="3" stroke-linejoin="round"/>' +
           '<path d="M-14 -8 L-6 -16 M4 -18 L12 -8" stroke="#6E6457" stroke-width="2.5" stroke-linecap="round"/>' +
           '<path d="M-5 -2 Q-9 -2 -8 2 Q-8 5 -10 6 Q-8 7 -8 10 Q-9 13 -5 13 M5 -2 Q9 -2 8 2 Q8 5 10 6 Q8 7 8 10 Q9 13 5 13" fill="none" stroke="#FFC62E" stroke-width="2.5" stroke-linecap="round"/>';
    } else if (/horn/.test(k)) {
      g += '<path d="M-24 6 Q-40 -6 -36 -26 Q-28 -12 -14 -4 Z" fill="#7A4FD0" stroke="#5B35AE" stroke-width="3" stroke-linejoin="round"/>' +
           '<path d="M24 6 Q40 -6 36 -26 Q28 -12 14 -4 Z" fill="#7A4FD0" stroke="#5B35AE" stroke-width="3" stroke-linejoin="round"/>';
    } else if (/crown/.test(k)) {
      g += '<path d="M-22 4 L-24 -18 L-12 -6 L0 -22 L12 -6 L24 -18 L22 4 Z" fill="#FFC62E" stroke="#C98C00" stroke-width="3" stroke-linejoin="round"/>' +
           '<circle cx="0" cy="-6" r="3.5" fill="#FF5A70"/><circle cx="-13" cy="-2" r="2.5" fill="#3D8BFF"/><circle cx="13" cy="-2" r="2.5" fill="#0FA898"/>';
    } else if (/wizard|mage/.test(k)) {
      g += '<path d="M-28 4 Q0 -4 28 4 Q20 10 0 10 Q-20 10 -28 4Z" fill="#5B35AE"/>' +
           '<path d="M-20 4 Q-6 -24 10 -44 Q6 -20 20 4 Z" fill="#7A4FD0" stroke="#5B35AE" stroke-width="3" stroke-linejoin="round"/>' +
           '<path d="M-2 -16 L0 -21 L2 -16 L7 -15 L3 -12 L4 -7 L0 -10 L-4 -7 L-3 -12 L-7 -15Z" fill="#FFC62E"/>';
    } else if (/halo/.test(k)) {
      g += '<ellipse cx="0" cy="-16" rx="22" ry="6" fill="none" stroke="#FFC62E" stroke-width="5"/>';
    } else if (/antenna|robot/.test(k)) {
      g += '<path d="M0 0 L0 -24" stroke="#2A2140" stroke-width="4" stroke-linecap="round"/><circle cx="0" cy="-28" r="6" fill="' + c + '" stroke="#2A2140" stroke-width="3"/>';
    } else if (/bow|ribbon/.test(k)) {
      g += '<g transform="translate(20 -2) rotate(18)"><path d="M0 0 L-16 -10 L-16 10 Z M0 0 L16 -10 L16 10 Z" fill="#FF5A70" stroke="#D0324C" stroke-width="3" stroke-linejoin="round"/><circle r="5" fill="#D0324C"/></g>';
    } else if (/top|tophat/.test(k)) {
      g += '<rect x="-26" y="-2" width="52" height="7" rx="3.5" fill="#2A2140"/><rect x="-16" y="-30" width="32" height="30" rx="4" fill="#2A2140"/><rect x="-16" y="-10" width="32" height="6" fill="#FF5A70"/>';
    } else if (/cap|beanie|hat-cap/.test(k)) {
      g += '<path d="M-24 4 Q-24 -24 0 -24 Q24 -24 24 4 Z" fill="' + c + '" stroke="#2A2140" stroke-width="3" stroke-linejoin="round"/>' +
           '<path d="M8 4 Q30 0 40 8 Q24 12 8 8 Z" fill="' + c + '" stroke="#2A2140" stroke-width="3" stroke-linejoin="round"/><circle cx="0" cy="-24" r="4" fill="#fff" stroke="#2A2140" stroke-width="2.5"/>';
    } else {
      // party hat
      g += '<path d="M-17 4 L0 -36 L17 4 Z" fill="' + c + '" stroke="#2A2140" stroke-width="3" stroke-linejoin="round"/>' +
           '<path d="M-11 -9 L9 -1 M-6 -21 L6 -16" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><circle cx="0" cy="-38" r="6" fill="#FFC62E" stroke="#2A2140" stroke-width="2.5"/>';
    }
    return g + '</g>';
  }

  /* ---------------- the ORIGINAL Curlo SVG (verbatim from the design) ----------------
     Only change: two empty groups (c-gear-back / c-gear-front) where additive
     gear is layered, and data-variant / data-form attributes. */
  function svg(opts) {
    opts = opts || {};
    var s = S(), form = opts.form || formNow(), tier = opts.tier || tierFor(s.stats.defense);
    var variant = opts.variant || (s.cosmetics.equipped && s.cosmetics.equipped.color) || s.profile.variant || 'classic';
    var hat = opts.hat !== undefined ? opts.hat : (s.cosmetics.equipped && s.cosmetics.equipped.hat);
    var shield = opts.shield !== undefined ? opts.shield : (s.cosmetics.equipped && s.cosmetics.equipped.shield) || '';
    var extra = opts.cls || '';
    return '<svg class="curlo ' + extra + '" viewBox="0 0 160 172" data-mood="' + (opts.mood || 'happy') + '" data-tier="' + tier + '" data-variant="' + U.esc(variant) + '" data-shield="' + U.esc(shield || '') + '" data-form="' + form + '"' + (opts.fixed ? ' data-fixed="1"' : '') + ' style="' + variantStyle(variant) + '" aria-hidden="true" focusable="false">' +
    '<ellipse cx="80" cy="162" rx="44" ry="7" fill="rgba(90,45,10,.13)"/>' +
    '<g class="c-move"><g class="c-body">' +
      '<g class="c-gear-back">' + gearBack(form) + '</g>' +
      '<rect class="bd" x="40" y="34" width="80" height="120" rx="40"/>' +
      '<ellipse class="belly" cx="80" cy="126" rx="25" ry="20"/>' +
      '<ellipse cx="60" cy="50" rx="12" ry="6" fill="#fff" opacity=".4" transform="rotate(-28 60 50)"/>' +
      '<path class="helm" d="M44 56 C46 22 114 22 116 56 C100 48 60 48 44 56Z"/>' +
      '<path class="helm" d="M74 30 L86 30 L84 50 L76 50Z" style="stroke-width:2"/>' +
      '<ellipse class="plume" cx="80" cy="18" rx="9" ry="12" fill="#FF5A70" stroke="#D0324C" stroke-width="3"/>' +
      '<path class="brace" d="M46 42 C33 42 37 66 35 80 C34 88 27 90 22 92 C27 94 34 96 35 104 C37 118 33 144 46 144"/>' +
      '<path class="brace" d="M114 42 C127 42 123 66 125 80 C126 88 133 90 138 92 C133 94 126 96 125 104 C123 118 127 144 114 144"/>' +
      '<g class="c-eyes">' +
        '<ellipse cx="64" cy="80" rx="13" ry="15" fill="#fff"/><ellipse cx="96" cy="80" rx="13" ry="15" fill="#fff"/>' +
        '<g class="c-pupils"><circle cx="66" cy="83" r="7.5" fill="#2A2140"/><circle cx="98" cy="83" r="7.5" fill="#2A2140"/><circle cx="69" cy="79" r="2.6" fill="#fff"/><circle cx="101" cy="79" r="2.6" fill="#fff"/></g>' +
      '</g>' +
      '<g fill="none" stroke="#2A2140" stroke-width="3.5" stroke-linecap="round">' +
        '<path class="brw b-worr" d="M52 64 L72 58 M88 58 L108 64"/>' +
        '<path class="brw b-think" d="M53 60 Q62 53 72 58 M88 62 L106 62"/>' +
        '<path class="brw b-brace" d="M52 58 L72 64 M88 64 L108 58"/>' +
      '</g>' +
      '<ellipse cx="51" cy="101" rx="7" ry="4" fill="#FF5A70" opacity=".55"/><ellipse cx="109" cy="101" rx="7" ry="4" fill="#FF5A70" opacity=".55"/>' +
      '<path class="mth m-happy" d="M68 100 Q80 116 92 100 Q80 104 68 100Z" fill="#2A2140" stroke="#2A2140" stroke-width="2" stroke-linejoin="round"/>' +
      '<g class="mth m-cele"><path d="M64 98 Q80 126 96 98 Q80 103 64 98Z" fill="#2A2140" stroke="#2A2140" stroke-width="2" stroke-linejoin="round"/><ellipse cx="80" cy="112" rx="7" ry="4" fill="#FF5A70"/></g>' +
      '<path class="mth m-worr" d="M67 110 Q73 103 80 107 Q87 111 93 104" fill="none" stroke="#2A2140" stroke-width="3.5" stroke-linecap="round"/>' +
      '<circle class="mth m-think" cx="87" cy="107" r="4.5" fill="#2A2140"/>' +
      '<g class="mth m-brace"><rect x="66" y="100" width="28" height="11" rx="5" fill="#fff" stroke="#2A2140" stroke-width="3"/><path d="M73 101v9M80 101v9M87 101v9" stroke="#2A2140" stroke-width="2"/></g>' +
      '<g class="c-gear-front">' + gearFront(form, hat) + '</g>' +
    '</g></g>' +
    '<g class="c-shield">' +
      '<path class="sh-face" d="M0 -26 L22 -18 Q23 10 0 25 Q-23 10 -22 -18Z"/>' +
      '<path class="sh-in" d="M-5 -10 Q-10 -10 -9 -4 Q-9 0 -12 1 Q-9 2 -9 6 Q-10 12 -5 12 M5 -10 Q10 -10 9 -4 Q9 0 12 1 Q9 2 9 6 Q10 12 5 12"/>' +
      '<path class="gstar" d="M0 -21 L2.2 -16 L7 -15.4 L3.4 -12 L4.4 -7 L0 -9.6 L-4.4 -7 L-3.4 -12 L-7 -15.4 L-2.2 -16Z" fill="#fff"/>' +
    '</g></svg>';
  }

  /** Mount a Curlo into a host element; returns the <svg>. */
  function mount(host, opts) {
    if (!host) return null;
    host.innerHTML = svg(opts);
    return host.querySelector('svg.curlo');
  }

  /** Update tier/variant/form/hat on every live Curlo (except fixed ones). */
  function refreshAll() {
    var s = S(), tier = tierFor(s.stats.defense), form = formNow();
    var variant = (s.cosmetics.equipped && s.cosmetics.equipped.color) || s.profile.variant || 'classic';
    var hat = s.cosmetics.equipped && s.cosmetics.equipped.hat;
    var shield = (s.cosmetics.equipped && s.cosmetics.equipped.shield) || '';
    U.$$('svg.curlo').forEach(function (el) {
      if (el.getAttribute('data-fixed')) return;
      el.setAttribute('data-tier', tier);
      el.setAttribute('data-variant', variant);
      el.setAttribute('data-shield', shield);
      el.setAttribute('style', variantStyle(variant));
      if (+el.getAttribute('data-form') !== form || el._hat !== hat) {
        el.setAttribute('data-form', form);
        el._hat = hat;
        var b = el.querySelector('.c-gear-back'), f = el.querySelector('.c-gear-front');
        if (b) b.innerHTML = gearBack(form);
        if (f) f.innerHTML = gearFront(form, hat);
      }
    });
  }

  /* ---------------- reactions (from the design) ---------------- */
  var moveAnims = {
    celebrate: [[{ transform: 'none' }, { transform: 'translateY(6px) scale(1.12,.86)', offset: 0.18 }, { transform: 'translateY(-30px) scale(.9,1.12)', offset: 0.45 }, { transform: 'translateY(4px) scale(1.1,.9)', offset: 0.72 }, { transform: 'translateY(-6px) scale(.98,1.03)', offset: 0.86 }, { transform: 'none' }], 820],
    worried: [[{ transform: 'none' }, { transform: 'translateX(-4px) rotate(-3deg)' }, { transform: 'translateX(4px) rotate(3deg)' }, { transform: 'translateX(-3px) rotate(-2deg)' }, { transform: 'translateX(2px)' }, { transform: 'scale(.97,1.02)' }], 560],
    thinking: [[{ transform: 'none' }, { transform: 'rotate(-9deg) translateX(-3px)', offset: 0.6 }, { transform: 'rotate(-6deg) translateX(-2px)' }], 520],
    bracing: [[{ transform: 'none' }, { transform: 'translateY(8px) scale(1.12,.86)', offset: 0.5 }, { transform: 'translateY(5px) scale(1.07,.92)' }], 420],
    happy: [[{ transform: 'scale(1.04,.96)' }, { transform: 'none' }], 300]
  };

  /** Set a mood with its body motion; optionally return to happy after `back` ms. */
  function react(el, mood, back) {
    if (!el) return;
    if (!moveAnims[mood]) mood = 'happy';
    el.setAttribute('data-mood', mood);
    el.classList.toggle('shield-up', mood === 'bracing');
    var mv = el.querySelector('.c-move');
    if (mv && mv.getAnimations) mv.getAnimations().forEach(function (a) { a.cancel(); });
    if (mv && mv.animate && !CH.fx.reduced()) {
      var kf = moveAnims[mood][0], d = moveAnims[mood][1], hold = mood === 'thinking' || mood === 'bracing';
      try { mv.animate(kf, { duration: d, easing: mood === 'celebrate' ? 'ease-out' : CH.fx.SPRING, fill: hold ? 'forwards' : 'none' }); } catch (e) { /* ignore */ }
    }
    clearTimeout(el._t);
    if (back) el._t = setTimeout(function () { react(el, 'happy'); }, back);
  }

  /* ---------------- voice lines ----------------
     {name} = Curlo's (user-chosen) name. HTML allowed (<b>). */
  var LINES = {
    greet: ['Hey hey! Ready to write some C++?', 'You’re back! My braces were getting lonely.', 'Let’s make some code that can’t be broken.', 'Welcome back, hero! Bugs beware.'],
    idle: ['Psst! Always initialize your variables. An empty <b>int</b> is a mystery lunchbox.', 'I once forgot a semicolon. We don’t talk about it. <b>;</b>', 'Validate your input! Users type <b>anything</b>. My cousin typed "banana" into an age field.', 'Braces come in pairs, like me! Open one, close one. <b>{ }</b>', 'Compiler warnings are free advice. I frame mine.', 'Undefined behavior is sneaky: it can <b>seem</b> to work. Don’t trust it!', 'Fun fact: C++ was first called “C with Classes”.'],
    poke: ['Hee! That tickles!', 'Boop received.', 'Careful, I’m load-bearing punctuation!', 'Hey! I’m compiling a thought here.', '{ squish }'],
    thinking: ['Hmm, read it line by line with me.', 'Take a breath. You’ve got this!', 'What would the computer do, exactly?', 'Trace it slowly. Every character counts.'],
    correct: ['YES! Nailed it!', 'Boom! Correct!', 'You’re on fire! (The good kind.)', 'Textbook! My braces are doing a happy dance.', 'Exactly right!', 'Clean as a fresh compile!'],
    combo: ['Combo x{n}! Unstoppable!', 'x{n} in a row! Are you a compiler?', '{n} straight! The bugs are nervous.'],
    wrong: ['Oof, close! Let’s look at why.', 'No worries, mistakes are how we learn.', 'Hmm, not quite. Check the explanation with me?', 'That one’s sneaky. Here’s the trick.', 'Plot twist! Let’s see what really happens.'],
    hint: ['Here’s a little nudge…', 'Okay, a bigger clue…', 'Here’s the full answer. Let’s understand it!'],
    shield: ['Shields up! Nothing gets past us!', 'Blocked! That’s defensive coding!', 'Clang! Deflected!'],
    crash: ['Yikes! That input broke it!', 'Uh-oh… the program went sideways!', 'Crash! Let’s patch that hole.'],
    lessonDone: ['Lesson complete! I’m so proud I could curl.', 'Another concept in the bag!', 'Look at you go!'],
    noHearts: ['Out of hearts! A quick review will refill one.', 'We’re out of hearts. Let’s practice to earn one back!'],
    streak: ['{n}-day streak! Keep the flame alive!'],
    boss: ['That boss won’t know what hit it.', 'Stay calm. Harden everything.']
  };
  function line(cat, vars) {
    var arr = LINES[cat] || LINES.idle, l = U.pick(arr);
    vars = vars || {};
    vars.name = vars.name || S().profile.name || 'Curlo';
    return l.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? U.esc(vars[k]) : ''; });
  }

  /** Put HTML into a speech bubble with a springy pop. */
  function say(bubble, html) {
    if (!bubble) return;
    bubble.innerHTML = html;
    CH.fx.anim(bubble, [{ transform: 'scale(.85)', opacity: 0.3 }, { transform: 'scale(1.04)', opacity: 1 }, { transform: 'none' }],
      { duration: 420, easing: CH.fx.SPRING });
  }

  /* ---------------- evolution sequence ---------------- */
  /**
   * Dramatic evolution overlay from `from` form to `to` form.
   * Tap / Enter / Escape skips straight to the end state. Resolves when closed.
   */
  function evolve(from, to) {
    return new Promise(function (resolve) {
      var host = U.$('#overlay-root') || document.body;
      var f = FORMS[to] || FORMS[2];
      var ov = U.h(
        '<div class="evo" role="dialog" aria-modal="true" aria-label="Curlo is evolving" tabindex="-1">' +
          '<div class="evo-rays" aria-hidden="true"></div><div class="evo-flash" aria-hidden="true"></div>' +
          '<div class="evo-in">' +
            '<div class="evo-t1">What?!</div>' +
            '<div class="evo-stage"><div class="evo-old"></div><div class="evo-new"></div><div class="evo-glow" aria-hidden="true"></div></div>' +
            '<div class="evo-t2" aria-live="polite">' + U.esc(S().profile.name) + ' is evolving…</div>' +
            '<button class="pbtn sun evo-close" hidden>Amazing!</button>' +
            '<div class="skip">Tap anywhere to skip</div>' +
          '</div></div>');
      host.appendChild(ov);
      var oldEl = mount(ov.querySelector('.evo-old'), { form: from, fixed: true, mood: 'bracing' });
      var newEl = mount(ov.querySelector('.evo-new'), { form: to, fixed: true, mood: 'celebrate' });
      var newWrap = ov.querySelector('.evo-new'), oldWrap = ov.querySelector('.evo-old');
      newWrap.style.opacity = 0;
      var timers = [], done = false, closed = false;
      function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
      CH.audio.play('evolve');
      ov.focus();
      react(oldEl, 'bracing');

      function finish() {
        if (done) return;
        done = true;
        timers.forEach(clearTimeout);
        oldWrap.style.opacity = 0; newWrap.style.opacity = 1;
        oldWrap.classList.remove('evo-shake');
        ov.querySelector('.evo-t1').textContent = 'Evolution!';
        ov.querySelector('.evo-t2').innerHTML = U.esc(S().profile.name) + ' reached <b>Form ' + to + ': ' + f.name + '</b>!<br><span class="evo-gear">New gear: ' + U.esc(f.gear) + '</span>';
        ov.querySelector('.skip').textContent = 'Tap anywhere to continue';
        var btn = ov.querySelector('.evo-close');
        btn.hidden = false;
        btn.focus();
        react(newEl, 'celebrate', 1400);
        CH.fx.burstAt(newWrap, { n: 160 });
        CH.fx.rain(90);
      }
      function close() {
        if (!done) { finish(); return; }
        if (closed) return;
        closed = true;
        CH.fx.clearConfetti();
        document.removeEventListener('keydown', onKey, true);
        CH.fx.anim(ov, [{ opacity: 1 }, { opacity: 0 }], { duration: 220, rm: 'keep' }).then(function () { ov.remove(); resolve(); });
        refreshAll();
      }
      function onKey(e) {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); close(); }
      }
      document.addEventListener('keydown', onKey, true);
      ov.addEventListener('click', close);

      if (CH.fx.reduced()) { later(finish, 400); return; }
      // Sequence: shake → flicker between forms (accelerating) → white flash → reveal.
      oldWrap.classList.add('evo-shake');
      var flick = [900, 1150, 1350, 1500, 1620, 1720, 1800, 1870, 1930, 1980, 2020];
      flick.forEach(function (t, i) {
        later(function () {
          var showNew = i % 2 === 0;
          newWrap.style.opacity = showNew ? 1 : 0; oldWrap.style.opacity = showNew ? 0 : 1;
          CH.audio.play('tick');
        }, t);
      });
      later(function () {
        CH.fx.anim(ov.querySelector('.evo-flash'), [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 700, rm: 'keep' });
      }, 2050);
      later(finish, 2350);
    });
  }

  var curlo = (CH.curlo = {
    svg: svg,
    mount: mount,
    react: react,
    say: say,
    line: line,
    refreshAll: refreshAll,
    evolve: evolve,
    tierFor: tierFor,
    tier: function () { return tierFor(S().stats.defense); },
    TIERS: TIERS,
    FORMS: FORMS,
    form: formNow,
    hatSVG: hatSVG,
    variantColor: variantColor,
    devForm: 0,
    FALLBACK_COLORS: FALLBACK_COLORS
  });
})();
