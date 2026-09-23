/**
 * Curlo, the brace-bean. The base SVG is the ORIGINAL design from
 * designs/5-springboard.html, copied verbatim via legacy engine/curlo.js;
 * everything else is additive (evolution gear, hats, color variants, shield
 * skins), exactly as in the approved vanilla app. Do not redesign.
 */
import { hash } from '@/engine/util';

export type CurloMood = 'happy' | 'celebrate' | 'worried' | 'thinking' | 'bracing';
export const CURLO_MOODS: readonly CurloMood[] = ['happy', 'celebrate', 'worried', 'thinking', 'bracing'];
export type CurloTier = 1 | 2 | 3;
export type CurloFormN = 1 | 2 | 3;

/** Shield tier from the Defense stat (1 wood, 2 steel + helm, 3 golden guard). */
export const tierFor = (defense: number): CurloTier => (defense >= 60 ? 3 : defense >= 25 ? 2 : 1);

export const TIERS: Record<CurloTier, { name: string; next: string }> = {
  1: { name: 'Wooden Shield', next: 'Steel Shield + Helm at Defense 25' },
  2: { name: 'Steel Shield + Helm', next: 'Golden Guard at Defense 60' },
  3: { name: 'Golden Guard', next: 'Maxed out! Plume included, at no extra charge.' },
};

/** Evolution forms: 1 base; 2 after World 4's boss; 3 after World 8's boss. */
export const FORMS: Record<CurloFormN, { name: string; gear: string; after?: number }> = {
  1: { name: 'Sprout', gear: 'Just Curlo, full of potential' },
  2: { name: 'Trailblazer', gear: 'Scarf + goggles', after: 4 },
  3: { name: 'Champion', gear: 'Cape + boots + star pin', after: 8 },
};

/** Color variants when the content has no color for the id. */
export const FALLBACK_COLORS: Record<string, string> = {
  classic: '#F2641B',
  berry: '#FF5A70',
  mint: '#0FA898',
  sky: '#3D8BFF',
  sunny: '#FFC62E',
  grape: '#7A4FD0',
  midnight: '#2A2140',
};

function mix(hex: string, toward: 'white' | 'black', t: number): string {
  const n = parseInt(String(hex).replace('#', ''), 16);
  if (Number.isNaN(n)) return hex;
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const W = toward === 'black' ? 0 : 255;
  r = Math.round(r + (W - r) * t);
  g = Math.round(g + (W - g) * t);
  b = Math.round(b + (W - b) * t);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/** CSS custom properties for a body color (classic = the original CSS, untouched). */
export function variantVars(color: string | null | undefined): Record<string, string> | undefined {
  if (!color || color.toLowerCase() === '#f2641b') return undefined;
  return { '--cv': color, '--cvb': mix(color, 'white', 0.42) };
}

/* ---------------- gear + hats (additive layers) ---------------- */

/** Behind the body. */
export function gearBack(form: CurloFormN): string {
  if (form < 3) return '';
  return (
    '<g class="g-cape">' +
    '<path d="M48 60 Q26 108 16 160 Q48 150 80 164 Q112 150 144 160 Q134 108 112 60 Z" fill="#7A4FD0" stroke="#5B35AE" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M40 120 Q60 116 80 124 Q100 116 120 120" fill="none" stroke="#9D7BEA" stroke-width="3" stroke-linecap="round" opacity=".8"/>' +
    '</g>'
  );
}

/** On top of the face (inside the breathing body group). */
export function gearFront(form: CurloFormN, hat: string | null | undefined): string {
  let s = '';
  if (form >= 3) {
    s +=
      '<g class="g-boots">' +
      '<rect x="50" y="144" width="24" height="15" rx="7" fill="#2A2140"/><rect x="86" y="144" width="24" height="15" rx="7" fill="#2A2140"/>' +
      '<rect x="50" y="144" width="24" height="5" rx="2.5" fill="#FFC62E"/><rect x="86" y="144" width="24" height="5" rx="2.5" fill="#FFC62E"/>' +
      '</g>';
  }
  if (form >= 2) {
    s +=
      '<g class="g-scarf">' +
      '<path class="g-scarf-tail" d="M98 134 L114 162 L103 166 L91 138 Z" fill="#FF5A70" stroke="#D0324C" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M39 124 Q80 138 121 124 L121 137 Q80 151 39 137 Z" fill="#FF5A70" stroke="#D0324C" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M52 131 L56 141 M66 134 L69 144 M92 134 L90 144 M106 131 L103 141" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>' +
      (form >= 3
        ? '<path d="M98 126 L101.5 133 L109 133.6 L103.3 138.4 L105 146 L98 142 L91 146 L92.7 138.4 L87 133.6 L94.5 133Z" fill="#FFC62E" stroke="#C98C00" stroke-width="2" stroke-linejoin="round"/>'
        : '<circle cx="98" cy="136" r="5.5" fill="#FFC62E" stroke="#C98C00" stroke-width="2"/>') +
      '</g>';
    s +=
      '<g class="g-goggles">' +
      '<path d="M41 49 Q80 36 119 49" fill="none" stroke="#2A2140" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="66" cy="44" r="9.5" fill="#C4F1EA" stroke="#2A2140" stroke-width="3.5"/>' +
      '<circle cx="94" cy="44" r="9.5" fill="#C4F1EA" stroke="#2A2140" stroke-width="3.5"/>' +
      '<path d="M75.5 44 L84.5 44" stroke="#2A2140" stroke-width="3.5"/>' +
      '<ellipse cx="63" cy="41" rx="3.5" ry="2.4" fill="#fff"/><ellipse cx="91" cy="41" rx="3.5" ry="2.4" fill="#fff"/>' +
      '</g>';
  }
  if (hat) s += hatSvg(hat);
  return s;
}

/** Hat art keyed by cosmetic id keywords; unknown ids get a party hat tinted by hash. */
export function hatSvg(id: string): string {
  const k = String(id).toLowerCase();
  const tints = ['#3D8BFF', '#0FA898', '#FF5A70', '#7A4FD0', '#FFC62E'];
  const c = tints[hash(k) % tints.length];
  let g = '<g class="g-hat" transform="translate(80 36)">';
  // Boss rewards from Worlds 4-8 (matched first so the keyword rules below can't catch them).
  if (/phantom|veil/.test(k)) {
    // Branch Phantom: a floaty lilac veil with a wavy hem and a trailing tail
    g +=
      '<path d="M22 4 Q40 10 44 30 Q48 44 40 52 Q42 36 30 22 Z" fill="#E6DCFF" stroke="#7A4FD0" stroke-width="2.5" stroke-linejoin="round" opacity=".95"/>' +
      '<path d="M-33 14 Q-34 -24 0 -26 Q34 -24 33 14 Q27 8 22 14 Q16 20 11 13 Q5 7 0 13 Q-5 19 -11 13 Q-16 7 -22 14 Q-27 20 -33 14Z" fill="#E6DCFF" stroke="#7A4FD0" stroke-width="3" stroke-linejoin="round" opacity=".95"/>' +
      '<path d="M-20 -8 Q-10 -18 4 -16" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".85"/>' +
      '<path d="M0 -26 Q2 -34 8 -36" fill="none" stroke="#7A4FD0" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="9" cy="-37" r="3.5" fill="#FFC62E" stroke="#7A4FD0" stroke-width="2"/>';
  } else if (/hydra|crest/.test(k)) {
    // Loop Hydra: three little serpent heads curling up as a crest
    const head = (x: number, y: number, r: number) =>
      `<g transform="translate(${x} ${y}) rotate(${r})">` +
      '<path d="M-5 14 Q-7 -2 0 -10 Q8 -14 11 -7 Q12 -2 5 -1 Q3 6 5 14 Z" fill="#0FA898" stroke="#077A6F" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<circle cx="4" cy="-7" r="1.8" fill="#fff"/><circle cx="4.5" cy="-7" r=".9" fill="#2A2140"/>' +
      '<path d="M-3 4 L1 4 M-3 9 L1 9" stroke="#8FD9CF" stroke-width="2" stroke-linecap="round"/></g>';
    g +=
      '<path d="M-26 8 Q0 -6 26 8 Q0 2 -26 8Z" fill="#077A6F" stroke="#077A6F" stroke-width="3" stroke-linejoin="round"/>' +
      head(-16, -4, -24) +
      head(16, -4, 24) +
      head(0, -12, 0) +
      '<circle cx="0" cy="4" r="3.5" fill="#FFC62E" stroke="#C98C00" stroke-width="1.8"/>';
  } else if (/sentinel|visor/.test(k)) {
    // Scope Sentinel: a steel forehead visor with a glowing scan slit and a fin
    g +=
      '<path d="M-5 -2 L0 -22 L5 -2 Z" fill="#6C87A3" stroke="#2A2140" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M-31 6 Q0 -6 31 6 L36 19 Q0 7 -36 19 Z" fill="#6C87A3" stroke="#2A2140" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M-24 11 Q0 3 24 11" fill="none" stroke="#7FF0DF" stroke-width="3.5" stroke-linecap="round"/>' +
      '<path d="M-24 11 Q0 3 24 11" fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>' +
      '<circle cx="-33" cy="13" r="3.5" fill="#FFC62E" stroke="#2A2140" stroke-width="2"/><circle cx="33" cy="13" r="3.5" fill="#FFC62E" stroke="#2A2140" stroke-width="2"/>';
  } else if (/pointer|goggle/.test(k)) {
    // Dangling Wraith: goggles pushed up on the head, with arrow (->) lenses
    const lens = (x: number) =>
      `<circle cx="${x}" cy="-9" r="9" fill="#FFD2B3" stroke="#2A2140" stroke-width="3.5"/>` +
      `<path d="M${x - 5} -9 L${x + 4} -9 M${x + 1} -12.5 L${x + 4.5} -9 L${x + 1} -5.5" fill="none" stroke="#BF4808" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<ellipse cx="${x - 3.5}" cy="-12.5" rx="2.6" ry="1.8" fill="#fff" opacity=".9"/>`;
    g +=
      '<path d="M-34 8 Q0 -16 34 8" fill="none" stroke="#2A2140" stroke-width="5" stroke-linecap="round"/>' +
      lens(-12) +
      lens(12) +
      '<path d="M-3 -9 L3 -9" stroke="#2A2140" stroke-width="3.5"/>';
  } else if (/bowtie|bow-tie/.test(k)) {
    g +=
      '<g transform="translate(0 84)"><path d="M0 0 L-17 -9 L-17 9 Z M0 0 L17 -9 L17 9 Z" fill="#7A4FD0" stroke="#5B35AE" stroke-width="3" stroke-linejoin="round"/><circle r="5" fill="#0FA898" stroke="#077A6F" stroke-width="2"/></g>';
  } else if (/helm/.test(k)) {
    g +=
      '<path d="M-38 16 Q-40 -26 0 -28 Q40 -26 38 16 Q20 8 0 8 Q-20 8 -38 16Z" fill="#A89C8C" stroke="#6E6457" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M-14 -8 L-6 -16 M4 -18 L12 -8" stroke="#6E6457" stroke-width="2.5" stroke-linecap="round"/>' +
      '<path d="M-5 -2 Q-9 -2 -8 2 Q-8 5 -10 6 Q-8 7 -8 10 Q-9 13 -5 13 M5 -2 Q9 -2 8 2 Q8 5 10 6 Q8 7 8 10 Q9 13 5 13" fill="none" stroke="#FFC62E" stroke-width="2.5" stroke-linecap="round"/>';
  } else if (/horn/.test(k)) {
    g +=
      '<path d="M-24 6 Q-40 -6 -36 -26 Q-28 -12 -14 -4 Z" fill="#7A4FD0" stroke="#5B35AE" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M24 6 Q40 -6 36 -26 Q28 -12 14 -4 Z" fill="#7A4FD0" stroke="#5B35AE" stroke-width="3" stroke-linejoin="round"/>';
  } else if (/crown/.test(k)) {
    g +=
      '<path d="M-22 4 L-24 -18 L-12 -6 L0 -22 L12 -6 L24 -18 L22 4 Z" fill="#FFC62E" stroke="#C98C00" stroke-width="3" stroke-linejoin="round"/>' +
      '<circle cx="0" cy="-6" r="3.5" fill="#FF5A70"/><circle cx="-13" cy="-2" r="2.5" fill="#3D8BFF"/><circle cx="13" cy="-2" r="2.5" fill="#0FA898"/>';
  } else if (/wizard|mage/.test(k)) {
    g +=
      '<path d="M-28 4 Q0 -4 28 4 Q20 10 0 10 Q-20 10 -28 4Z" fill="#5B35AE"/>' +
      '<path d="M-20 4 Q-6 -24 10 -44 Q6 -20 20 4 Z" fill="#7A4FD0" stroke="#5B35AE" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M-2 -16 L0 -21 L2 -16 L7 -15 L3 -12 L4 -7 L0 -10 L-4 -7 L-3 -12 L-7 -15Z" fill="#FFC62E"/>';
  } else if (/halo/.test(k)) {
    g += '<ellipse cx="0" cy="-16" rx="22" ry="6" fill="none" stroke="#FFC62E" stroke-width="5"/>';
  } else if (/antenna|robot/.test(k)) {
    g +=
      '<path d="M0 0 L0 -24" stroke="#2A2140" stroke-width="4" stroke-linecap="round"/><circle cx="0" cy="-28" r="6" fill="' +
      c +
      '" stroke="#2A2140" stroke-width="3"/>';
  } else if (/bow|ribbon/.test(k)) {
    g +=
      '<g transform="translate(20 -2) rotate(18)"><path d="M0 0 L-16 -10 L-16 10 Z M0 0 L16 -10 L16 10 Z" fill="#FF5A70" stroke="#D0324C" stroke-width="3" stroke-linejoin="round"/><circle r="5" fill="#D0324C"/></g>';
  } else if (/top|tophat/.test(k)) {
    g +=
      '<rect x="-26" y="-2" width="52" height="7" rx="3.5" fill="#2A2140"/><rect x="-16" y="-30" width="32" height="30" rx="4" fill="#2A2140"/><rect x="-16" y="-10" width="32" height="6" fill="#FF5A70"/>';
  } else if (/cap|beanie|hat-cap/.test(k)) {
    g +=
      '<path d="M-24 4 Q-24 -24 0 -24 Q24 -24 24 4 Z" fill="' +
      c +
      '" stroke="#2A2140" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M8 4 Q30 0 40 8 Q24 12 8 8 Z" fill="' +
      c +
      '" stroke="#2A2140" stroke-width="3" stroke-linejoin="round"/><circle cx="0" cy="-24" r="4" fill="#fff" stroke="#2A2140" stroke-width="2.5"/>';
  } else {
    // party hat
    g +=
      '<path d="M-17 4 L0 -36 L17 4 Z" fill="' +
      c +
      '" stroke="#2A2140" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M-11 -9 L9 -1 M-6 -21 L6 -16" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><circle cx="0" cy="-38" r="6" fill="#FFC62E" stroke="#2A2140" stroke-width="2.5"/>';
  }
  return g + '</g>';
}

/**
 * Everything inside the root <svg class="curlo" viewBox="0 0 160 172">
 * (verbatim from the design; the gear groups are the only additions).
 */
export function curloInner(form: CurloFormN, hat: string | null | undefined): string {
  return (
    '<ellipse cx="80" cy="162" rx="44" ry="7" fill="rgba(90,45,10,.13)"/>' +
    '<g class="c-move"><g class="c-body">' +
    '<g class="c-gear-back">' +
    gearBack(form) +
    '</g>' +
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
    '<g class="c-gear-front">' +
    gearFront(form, hat) +
    '</g>' +
    '</g></g>' +
    '<g class="c-shield">' +
    '<path class="sh-face" d="M0 -26 L22 -18 Q23 10 0 25 Q-23 10 -22 -18Z"/>' +
    '<path class="sh-in" d="M-5 -10 Q-10 -10 -9 -4 Q-9 0 -12 1 Q-9 2 -9 6 Q-10 12 -5 12 M5 -10 Q10 -10 9 -4 Q9 0 12 1 Q9 2 9 6 Q10 12 5 12"/>' +
    '<path class="gstar" d="M0 -21 L2.2 -16 L7 -15.4 L3.4 -12 L4.4 -7 L0 -9.6 L-4.4 -7 L-3.4 -12 L-7 -15.4 L-2.2 -16Z" fill="#fff"/>' +
    '</g>'
  );
}

/** Body motion per mood (from the design). `hold` poses stay until the next reaction. */
export const MOVES: Record<CurloMood, { kf: Keyframe[]; ms: number; hold?: boolean; easing?: string }> = {
  celebrate: {
    kf: [
      { transform: 'none' },
      { transform: 'translateY(6px) scale(1.12,.86)', offset: 0.18 },
      { transform: 'translateY(-30px) scale(.9,1.12)', offset: 0.45 },
      { transform: 'translateY(4px) scale(1.1,.9)', offset: 0.72 },
      { transform: 'translateY(-6px) scale(.98,1.03)', offset: 0.86 },
      { transform: 'none' },
    ],
    ms: 820,
    easing: 'ease-out',
  },
  worried: {
    kf: [
      { transform: 'none' },
      { transform: 'translateX(-4px) rotate(-3deg)' },
      { transform: 'translateX(4px) rotate(3deg)' },
      { transform: 'translateX(-3px) rotate(-2deg)' },
      { transform: 'translateX(2px)' },
      { transform: 'scale(.97,1.02)' },
    ],
    ms: 560,
  },
  thinking: {
    kf: [
      { transform: 'none' },
      { transform: 'rotate(-9deg) translateX(-3px)', offset: 0.6 },
      { transform: 'rotate(-6deg) translateX(-2px)' },
    ],
    ms: 520,
    hold: true,
  },
  bracing: {
    kf: [
      { transform: 'none' },
      { transform: 'translateY(8px) scale(1.12,.86)', offset: 0.5 },
      { transform: 'translateY(5px) scale(1.07,.92)' },
    ],
    ms: 420,
    hold: true,
  },
  happy: { kf: [{ transform: 'scale(1.04,.96)' }, { transform: 'none' }], ms: 300 },
};
