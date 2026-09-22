/* ==========================================================================
   Cpp Hero — engine/audio.js
   Web Audio generated SFX + an optional generated ambient music loop.
   No audio files. Everything respects settings.sound / settings.music.
   The AudioContext is created lazily on the first user gesture (autoplay rules).
   ========================================================================== */
(function () {
  'use strict';
  var CH = window.CH;

  var ac = null, sfxGain = null, musicGain = null;

  function settings() { return (CH.store && CH.store.state && CH.store.state.settings) || {}; }

  /** Get (and resume) the shared AudioContext. Returns null if unsupported. */
  function ctx() {
    try {
      if (!ac) {
        var A = window.AudioContext || window.webkitAudioContext;
        if (!A) return null;
        ac = new A();
        sfxGain = ac.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(ac.destination);
        musicGain = ac.createGain(); musicGain.gain.value = 0.0001; musicGain.connect(ac.destination);
      }
      if (ac.state === 'suspended') ac.resume().catch(function () {});
    } catch (e) { ac = null; }
    return ac;
  }

  /** One oscillator note with a quick attack and exponential decay. */
  function tone(f, d, type, vol, at, f2, dest) {
    try {
      var c = ctx(); if (!c) return;
      var t = c.currentTime + (at || 0);
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(dest || sfxGain);
      o.start(t); o.stop(t + d + 0.03);
    } catch (e) { /* ignore audio errors */ }
  }

  /** Band-passed noise burst (crashes, whooshes). */
  function noise(d, vol, freq, at) {
    try {
      var c = ctx(); if (!c) return;
      var len = Math.max(1, Math.floor(c.sampleRate * d));
      var b = c.createBuffer(1, len, c.sampleRate), a = b.getChannelData(0);
      for (var i = 0; i < len; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var s = c.createBufferSource(), g = c.createGain(), fl = c.createBiquadFilter();
      fl.type = 'bandpass'; fl.frequency.value = freq || 900;
      s.buffer = b; g.gain.value = vol || 0.2;
      s.connect(fl); fl.connect(g); g.connect(sfxGain);
      s.start(c.currentTime + (at || 0));
    } catch (e) { /* ignore */ }
  }

  /* ---------------- SFX palette ---------------- */
  var SFX = {
    tap: function () { tone(620, 0.07, 'triangle', 0.06, 0, 820); },
    pop: function () { tone(420, 0.12, 'sine', 0.12, 0, 900); },
    select: function () { tone(520, 0.08, 'triangle', 0.08, 0, 700); },
    correct: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.16, 'triangle', 0.11, i * 0.07); }); },
    wrong: function () { tone(330, 0.2, 'square', 0.05, 0, 220); tone(247, 0.28, 'triangle', 0.08, 0.12, 160); },
    shield: function () { tone(1250, 0.05, 'square', 0.05); tone(1800, 0.25, 'triangle', 0.1, 0.03, 1400); tone(900, 0.2, 'sine', 0.08, 0.05); },
    crash: function () { noise(0.45, 0.22); tone(180, 0.4, 'sawtooth', 0.06, 0, 50); },
    levelup: function () {
      [392, 523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.22, 'triangle', 0.1, i * 0.09); });
      tone(1568, 0.5, 'sine', 0.08, 0.6);
    },
    unlock: function () { tone(784, 0.1, 'triangle', 0.09); tone(1175, 0.12, 'triangle', 0.09, 0.08); tone(1568, 0.3, 'sine', 0.08, 0.16); },
    coin: function () { tone(988, 0.07, 'square', 0.04); tone(1319, 0.18, 'square', 0.04, 0.06); },
    heart: function () { tone(300, 0.18, 'sine', 0.1, 0, 180); },
    heal: function () { tone(523, 0.1, 'sine', 0.09); tone(784, 0.16, 'sine', 0.09, 0.08); },
    hit: function () { noise(0.12, 0.25, 1600); tone(220, 0.14, 'square', 0.06, 0, 110); },
    whoosh: function () { noise(0.25, 0.12, 2200); },
    tick: function () { tone(1400, 0.03, 'square', 0.025); },
    boss: function () { tone(110, 0.6, 'sawtooth', 0.07, 0, 70); tone(165, 0.6, 'sawtooth', 0.05, 0.05, 90); noise(0.5, 0.1, 400); },
    evolve: function () {
      for (var i = 0; i < 10; i++) tone(300 + i * 90, 0.16, 'triangle', 0.06, i * 0.08, 400 + i * 110);
      [523, 659, 784, 1047].forEach(function (f) { tone(f, 0.9, 'sine', 0.06, 0.9); });
    },
    streak: function () { tone(440, 0.1, 'triangle', 0.08); tone(660, 0.1, 'triangle', 0.08, 0.07); tone(880, 0.2, 'triangle', 0.09, 0.14); }
  };

  /* ---------------- ambient music ----------------
     A soft generative loop: a slow pad chord progression + a sparse pentatonic
     "music box" melody. Scheduled with a lookahead timer. */
  var music = { on: false, timer: 0, next: 0, step: 0 };
  var CHORDS = [[261.63, 329.63, 392.0], [220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [196.0, 246.94, 293.66]];
  var PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
  var BEAT = 0.5; // seconds per step

  function schedule() {
    var c = ac; if (!c || !music.on) return;
    while (music.next < c.currentTime + 1.2) {
      var t = music.next - c.currentTime, s = music.step;
      if (s % 8 === 0) {
        var ch = CHORDS[(s / 8) % CHORDS.length];
        ch.forEach(function (f) { tone(f / 2, BEAT * 8, 'sine', 0.035, Math.max(0, t), null, musicGain); });
      }
      // sparse melody: deterministic-ish pattern with a bit of randomness
      if ((s % 2 === 0 && Math.random() < 0.55) || s % 8 === 3) {
        var f = PENTA[(s * 3 + (Math.random() < 0.3 ? 2 : 0)) % PENTA.length];
        tone(f, 0.6, 'triangle', 0.03, Math.max(0, t), null, musicGain);
      }
      music.step++;
      music.next += BEAT;
    }
  }

  function startMusic() {
    var c = ctx(); if (!c || music.on) return;
    music.on = true;
    music.next = c.currentTime + 0.1;
    try {
      musicGain.gain.cancelScheduledValues(c.currentTime);
      musicGain.gain.setValueAtTime(Math.max(0.0001, musicGain.gain.value), c.currentTime);
      musicGain.gain.exponentialRampToValueAtTime(0.6, c.currentTime + 1.5);
    } catch (e) { /* ignore */ }
    clearInterval(music.timer);
    music.timer = setInterval(schedule, 300);
    schedule();
  }

  function stopMusic() {
    if (!music.on) return;
    music.on = false;
    clearInterval(music.timer);
    try {
      var c = ac;
      musicGain.gain.cancelScheduledValues(c.currentTime);
      musicGain.gain.setValueAtTime(Math.max(0.0001, musicGain.gain.value), c.currentTime);
      musicGain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.6);
    } catch (e) { /* ignore */ }
  }

  CH.audio = {
    /** Play a named SFX (no-op when sound is off). */
    play: function (name) {
      if (!settings().sound) return;
      var f = SFX[name];
      if (f) try { f(); } catch (e) { /* ignore */ }
    },
    names: Object.keys(SFX),
    /** Call after settings change or first gesture. */
    sync: function () {
      if (settings().music && gestured) startMusic(); else stopMusic();
    },
    unlock: function () { ctx(); }
  };

  // First user gesture: create/resume the context and start music if enabled.
  var gestured = false;
  function onGesture() {
    if (gestured) return;
    gestured = true;
    ctx();
    CH.audio.sync();
  }
  window.addEventListener('pointerdown', onGesture, { capture: true });
  window.addEventListener('keydown', onGesture, { capture: true });
  // Pause music when hidden.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') stopMusic(); else if (gestured) CH.audio.sync();
  });
})();
