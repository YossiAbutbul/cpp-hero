/**
 * The inline icon set (24×24), ported verbatim from legacy engine/ui.js plus
 * the header/tab icons from legacy index.template.html. Trusted constant
 * markup, rendered by <Icon name=… />. Multi-color icons carry their own
 * fills; the rest use currentColor.
 */
export const ICONS = {
  heart:
    '<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" fill="#FF5A70" stroke="#D0324C" stroke-width="1.5"/><ellipse cx="8" cy="9" rx="1.8" ry="1.2" fill="#fff" opacity=".7"/>',
  flame:
    '<g class="fo"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 0 2 1 3 2 3 0-3 0-5 1-8z" fill="#F2641B"/><path d="M12 11c.5 2 3 3 3 5.5a3 3 0 0 1-6 0c0-1.5 1-2.5 1.5-3.5.3 1 .8 1.3 1.2 1.3 0-1.3-.2-2 .3-3.3z" fill="#FFC62E"/></g>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor"/>',
  check:
    '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>',
  x: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  ok: '<circle cx="12" cy="12" r="11" fill="#077A6F"/><path d="M6.5 12.5l3.5 3.5 7.5-8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  no: '<circle cx="12" cy="12" r="11" fill="#D0324C"/><path d="M8 8l8 8M16 8l-8 8" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="3" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.6"/>',
  star: '<path d="M12 2.5l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.8 6.2 20l1.4-6.4L2.7 9.2l6.5-.7z" fill="currentColor"/>',
  gear: '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  chart:
    '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  map: '<path d="M4 20c3-1 3-5 8-6s5-5 8-8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="6" r="2" fill="currentColor"/><circle cx="4" cy="20" r="2" fill="currentColor"/>',
  buddy:
    '<g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="6" y="4" width="12" height="16" rx="6"/><path d="M3 8c-1 2-1 6 0 8M21 8c1 2 1 6 0 8"/></g><circle cx="10" cy="11" r="1.2" fill="currentColor"/><circle cx="14" cy="11" r="1.2" fill="currentColor"/>',
  practice:
    '<g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/></g><circle cx="12" cy="12" r="1.8" fill="currentColor"/>',
  vault:
    '<g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/></g><path d="M9 8h6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  bug: '<g fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><ellipse cx="12" cy="14" rx="5.5" ry="6.5"/><path d="M12 8v12M6.5 11H3M21 11h-3.5M6.5 16H3.5M20.5 16H17.5M9 6L7 3.5M15 6l2-2.5"/></g>',
  freeze:
    '<g stroke="#3D8BFF" stroke-width="2.4" stroke-linecap="round" fill="none"><path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10"/><path d="M9 3.5L12 6l3-2.5M9 20.5L12 18l3 2.5"/></g>',
  quest:
    '<path d="M6 3h9l4 4v14H6z" fill="#FFEDB0" stroke="#D69500" stroke-width="2" stroke-linejoin="round"/><path d="M9 10h6M9 14h6M9 18h4" stroke="#BF4808" stroke-width="2" stroke-linecap="round"/>',
  target:
    '<circle cx="12" cy="12" r="9" fill="#FFD6DC"/><circle cx="12" cy="12" r="5.5" fill="#fff"/><circle cx="12" cy="12" r="2.5" fill="#FF5A70"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="2" fill="#FF5A70"/><rect x="3" y="7" width="18" height="4" rx="1.5" fill="#FFC62E"/><path d="M12 7v13" stroke="#fff" stroke-width="2.4"/><path d="M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0" fill="none" stroke="#D69500" stroke-width="2"/>',
  bulb: '<path d="M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z" fill="#FFC62E" stroke="#D69500" stroke-width="1.8"/><path d="M9.5 19h5M10.5 21.5h3" stroke="#2A2140" stroke-width="2" stroke-linecap="round"/>',
  play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>',
  step: '<path d="M5 5l9 7-9 7z" fill="currentColor"/><rect x="16" y="5" width="3" height="14" rx="1" fill="currentColor"/>',
  retype:
    '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  back: '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  next: '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  sound:
    '<path d="M4 9v6h4l5 4V5L8 9z" fill="#FFC62E" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  music:
    '<path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="3" fill="#FF5A70"/><circle cx="17.5" cy="16" r="3" fill="#0FA898"/>',
  motion:
    '<circle cx="12" cy="12" r="8" fill="#C4F1EA"/><path d="M9 9v6M15 9v6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  text: '<path d="M4 19l5-14 5 14M5.8 14h6.4M15 19l3-8 3 8M15.9 16.5h4.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  download:
    '<path d="M12 4v11M7 10l5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  upload:
    '<path d="M12 16V5M7 10l5-5 5 5M5 20h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  trash:
    '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>',
  shield:
    '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="#fff"/><path d="M8.5 12l2.5 2.5 4.5-5" stroke="#077A6F" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  shieldO:
    '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9.5C7.4 20 4 16.5 4 12V6z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>',
  warn: '<path d="M12 3l10 18H2z" fill="#fff"/><path d="M12 10v5M12 17.5v.5" stroke="#D0324C" stroke-width="2.6" stroke-linecap="round"/>',
  alert:
    '<path d="M12 2.8l9.8 17.4H2.2z" fill="#D0324C" stroke="#D0324C" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 9.5v5M12 17.2v.3" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>',
  info: '<circle cx="12" cy="12" r="10" fill="#FFC62E"/><path d="M12 7v6M12 16.5v.5" stroke="#2A2140" stroke-width="2.6" stroke-linecap="round"/>',
  clock:
    '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  trophy:
    '<path d="M7 4h10v5a5 5 0 0 1-10 0z" fill="#FFC62E" stroke="#D69500" stroke-width="1.8"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" fill="none" stroke="#D69500" stroke-width="1.8"/><path d="M12 14v3M8 20h8l-1-3H9z" fill="#D69500" stroke="#D69500" stroke-width="1.5" stroke-linejoin="round"/>',
  sparkle:
    '<path d="M12 2l2.6 6.6L21 11l-6.4 2.4L12 20l-2.6-6.6L3 11l6.4-2.4z" fill="#fff" stroke="#2A2140" stroke-width="2" stroke-linejoin="round"/>',
  grip: '<g fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></g>',
  up: '<path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  down: '<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  project:
    '<path d="M4 20l3-9 5-5 6 6-5 5z" fill="#FFC62E" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M14 4l6 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  wand: '<path d="M4 20L16 8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M17 2l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="#FFC62E"/>',
  swords:
    '<path d="M4 4l10 10M20 4L10 14M6 18l-2 2M18 18l2 2M7 15l2 2M17 15l-2 2" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  /* header buttons (legacy index.template.html) */
  stats:
    '<rect x="3.5" y="12" width="4" height="8" rx="1.2" fill="#0FA898"/><rect x="10" y="6" width="4" height="14" rx="1.2" fill="#F2641B"/><rect x="16.5" y="9" width="4" height="11" rx="1.2" fill="#FFC62E"/><path d="M2.5 21h19" stroke="#2A2140" stroke-width="2" stroke-linecap="round"/>',
  settings:
    '<g transform="translate(12 12) scale(.88) translate(-12 -12)"><path d="M9.27 4.27L9.69 1.66L14.31 1.66L14.73 4.27L15.53 4.60L17.68 3.05L20.95 6.32L19.40 8.47L19.73 9.27L22.34 9.69L22.34 14.31L19.73 14.73L19.40 15.53L20.95 17.68L17.68 20.95L15.53 19.40L14.73 19.73L14.31 22.34L9.69 22.34L9.27 19.73L8.47 19.40L6.32 20.95L3.05 17.68L4.60 15.53L4.27 14.73L1.66 14.31L1.66 9.69L4.27 9.27L4.60 8.47L3.05 6.32L6.32 3.05L8.47 4.60Z" fill="#FFE6C7" stroke="#2A2140" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.6" fill="#fff" stroke="#2A2140" stroke-width="2"/></g>',
  close:
    '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="#2A2140" stroke-width="2.8" stroke-linecap="round"/>',
} as const;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];
