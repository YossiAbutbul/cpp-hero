#!/usr/bin/env node
/*
 * build.js: Cpp Hero build script (node >= 18, no npm dependencies).
 *
 *   node legacy/build.js [--src <dir>] [--out <dir>] [--public <dir>]
 *
 *   --src     source dir holding index.template.html      (default: legacy/src)
 *   --out     output dir                                   (default: legacy/dist)
 *   --public  static PWA files (manifest, sw.js, icons/)   (default: legacy/public)
 *
 * Steps:
 *   1. Read <src>/index.template.html and replace inline markers:
 *        <!--INLINE:styles.css-->        required; missing file = build error
 *        <!--INLINE?:content/world02.js--> optional; missing file = skipped + note
 *      Paths are relative to <src>. .css becomes <style>, .js becomes <script>.
 *      "</script" in JS and "</style" in CSS are escaped so an inlined file
 *      can never terminate its own tag early. Inlined content is NOT scanned
 *      for further markers (single pass).
 *   2. Compute the build version "<package.json version>-<hash8>", where hash8
 *      is the first 8 hex chars of sha256(inlined html, placeholder intact),
 *      then replace every "__BUILD_VERSION__" in the html with it.
 *   3. Regenerate the icons (Curlo mascot) into <public>/icons/ (every build;
 *      output is deterministic, so git only sees a change when the art does).
 *   4. Write <out>/index.html, <out>/manifest.webmanifest, <out>/sw.js (with
 *      the same version stamped in, so the SW cache name changes whenever the
 *      html changes) and copy <public>/icons/* to <out>/icons/.
 *   5. Print a summary.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Raster } = require('./tools/icon-raster');

// This script lives in legacy/; src/public/dist default to siblings of it,
// while package.json and .artifact/ live at the repo root.
const ROOT = __dirname;
const REPO = path.join(__dirname, '..');
const PLACEHOLDER = '__BUILD_VERSION__';

/* ------------------------------------------------------------------ */
/* CLI                                                                 */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const opts = { src: path.join(ROOT, 'src'), out: path.join(ROOT, 'dist'), public: path.join(ROOT, 'public') };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      console.log('Usage: node legacy/build.js [--src <dir>] [--out <dir>] [--public <dir>]');
      process.exit(0);
    }
    const m = /^--(src|out|public)(?:=(.*))?$/.exec(a);
    if (!m) fail('Unknown argument: ' + a);
    const val = m[2] !== undefined ? m[2] : argv[++i];
    if (!val) fail('Missing value for --' + m[1]);
    opts[m[1]] = path.resolve(val);
  }
  return opts;
}

function fail(msg) {
  console.error('\n[build] ERROR: ' + msg + '\n');
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Small fs helpers                                                    */
/* ------------------------------------------------------------------ */

const written = [];   // [{ file, bytes }] for the summary

function writeFile(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  written.push({ file, bytes: Buffer.byteLength(data) });
}

function readText(file) {
  // Normalise line endings and strip a UTF-8 BOM so the output (and the
  // version hash) is the same on Windows and elsewhere.
  return fs.readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
}

const fmtBytes = (n) => (n < 1024 ? n + ' B' : (n / 1024).toFixed(1) + ' KB');
// Repo-relative when inside the repo, absolute otherwise (e.g. --out elsewhere).
const rel = (f) => {
  const r = path.relative(REPO, f);
  return r.startsWith('..') || path.isAbsolute(r) ? f : r.split(path.sep).join('/');
};

/* ------------------------------------------------------------------ */
/* 1. Inlining                                                         */
/* ------------------------------------------------------------------ */

/**
 * Replace <!--INLINE:path--> / <!--INLINE?:path--> markers in the template.
 * Returns { html, inlined: [...], skipped: [...] }.
 */
function inlineTemplate(srcDir) {
  const templatePath = path.join(srcDir, 'index.template.html');
  if (!fs.existsSync(templatePath)) fail('Template not found: ' + templatePath);
  const template = readText(templatePath);

  const inlined = [], skipped = [], errors = [];
  const MARKER = /<!--\s*INLINE(\?)?:\s*([^\s>]+?)\s*-->/g;

  // A replacer *function* is used so "$&", "$1" etc. inside file contents are
  // never interpreted as replacement patterns.
  const html = template.replace(MARKER, (whole, optional, relPath) => {
    const file = path.resolve(srcDir, relPath);
    // Refuse paths that escape the src dir (e.g. ../../secret).
    if (path.relative(srcDir, file).startsWith('..') || path.isAbsolute(relPath)) {
      errors.push('Marker path escapes the src dir: ' + relPath);
      return '';
    }
    const ext = path.extname(file).toLowerCase();
    if (ext !== '.css' && ext !== '.js') {
      errors.push('Unsupported file type for inlining (only .css / .js): ' + relPath);
      return '';
    }
    if (!fs.existsSync(file)) {
      if (optional) {
        skipped.push(relPath);
        return '';
      }
      errors.push('Missing file for <!--INLINE:' + relPath + '--> (expected ' + file + ')');
      return '';
    }
    let body = readText(file).replace(/\s+$/, '');
    inlined.push({ relPath, bytes: Buffer.byteLength(body) });
    if (ext === '.js') {
      // "<\/script" is identical to "</script" inside JS strings/regexes/comments.
      body = body.replace(/<\/script/gi, '<\\/script');
      return '<script>\n/* ' + relPath + ' */\n' + body + '\n</script>';
    }
    // In CSS "\/" is an escaped "/", so this is equivalent inside strings.
    body = body.replace(/<\/style/gi, '<\\/style');
    return '<style>\n/* ' + relPath + ' */\n' + body + '\n</style>';
  });

  if (errors.length) fail(errors.join('\n[build] ERROR: '));
  return { html, inlined, skipped };
}

/* ------------------------------------------------------------------ */
/* 2. Version                                                          */
/* ------------------------------------------------------------------ */

function computeVersion(html) {
  let pkgVersion = '0.0.0';
  try {
    pkgVersion = JSON.parse(readText(path.join(REPO, 'package.json'))).version || pkgVersion;
  } catch (e) {
    console.warn('[build] note: could not read package.json version (' + e.message + '), using 0.0.0');
  }
  const hash = crypto.createHash('sha256').update(html, 'utf8').digest('hex').slice(0, 8);
  return pkgVersion + '-' + hash;
}

/* ------------------------------------------------------------------ */
/* 3. Icons: Curlo, transcribed from designs/5-springboard.html curlo() */
/* ------------------------------------------------------------------ */

const COLORS = { cream: '#FFF4E6', sunL: '#FFEDB0', tang: '#F2641B', teal: '#0FA898', ink: '#2A2140' };

/*
 * Curlo in its 160x172 design viewBox, happy mood, no shield/helm/plume.
 * This single list drives BOTH icon.svg and the PNGs so they always match.
 * Shape keys: t = rect|ellipse|circle|path; fill/stroke = hex; sw = stroke
 * width (design units); opacity; rot = degrees around (cx, cy).
 */
const CURLO = [
  // ground shadow: rgba(90,45,10,.13)
  { t: 'ellipse', cx: 80, cy: 162, rx: 44, ry: 7, fill: '#5A2D0A', opacity: 0.13 },
  // jellybean body + belly
  { t: 'rect', x: 40, y: 34, w: 80, h: 120, rx: 40, fill: COLORS.tang },
  { t: 'ellipse', cx: 80, cy: 126, rx: 25, ry: 20, fill: '#FFAE78' },
  // glossy highlight
  { t: 'ellipse', cx: 60, cy: 50, rx: 12, ry: 6, fill: '#FFFFFF', opacity: 0.4, rot: -28 },
  // the { } braces
  { t: 'path', stroke: COLORS.teal, sw: 8, d: 'M46 42 C33 42 37 66 35 80 C34 88 27 90 22 92 C27 94 34 96 35 104 C37 118 33 144 46 144' },
  { t: 'path', stroke: COLORS.teal, sw: 8, d: 'M114 42 C127 42 123 66 125 80 C126 88 133 90 138 92 C133 94 126 96 125 104 C123 118 127 144 114 144' },
  // eyes, pupils, glints
  { t: 'ellipse', cx: 64, cy: 80, rx: 13, ry: 15, fill: '#FFFFFF' },
  { t: 'ellipse', cx: 96, cy: 80, rx: 13, ry: 15, fill: '#FFFFFF' },
  { t: 'circle', cx: 66, cy: 83, r: 7.5, fill: COLORS.ink },
  { t: 'circle', cx: 98, cy: 83, r: 7.5, fill: COLORS.ink },
  { t: 'circle', cx: 69, cy: 79, r: 2.6, fill: '#FFFFFF' },
  { t: 'circle', cx: 101, cy: 79, r: 2.6, fill: '#FFFFFF' },
  // cheeks
  { t: 'ellipse', cx: 51, cy: 101, rx: 7, ry: 4, fill: '#FF5A70', opacity: 0.55 },
  { t: 'ellipse', cx: 109, cy: 101, rx: 7, ry: 4, fill: '#FF5A70', opacity: 0.55 },
  // happy mouth (filled + 2-unit stroke with round joins, as in the design)
  { t: 'path', fill: COLORS.ink, stroke: COLORS.ink, sw: 2, d: 'M68 100 Q80 116 92 100 Q80 104 68 100Z' },
];

// Visual bounds of CURLO in design units (brace tips 22..138 +/- 4 stroke,
// body top 34, shadow bottom 169). Used to centre and scale.
const CURLO_BOX = { x0: 18, y0: 34, x1: 142, y1: 169 };
const CURLO_CX = (CURLO_BOX.x0 + CURLO_BOX.x1) / 2;
const CURLO_CY = (CURLO_BOX.y0 + CURLO_BOX.y1) / 2;
const CURLO_H = CURLO_BOX.y1 - CURLO_BOX.y0;
const CURLO_HALF_DIAG = Math.hypot(CURLO_BOX.x1 - CURLO_BOX.x0, CURLO_H) / 2;

/**
 * Layout for one icon. kind:
 *   'any'      rounded-square cream tile (transparent corners), Curlo ~62% tall
 *   'maskable' full-bleed cream square; Curlo's whole bounding box fits in
 *              the central safe-zone circle (radius 40% of size)
 *   'apple'    full-bleed square (iOS masks it itself), Curlo like 'any'
 * Returns { background: [shapes in px], T: transform for CURLO }.
 */
function iconLayout(size, kind) {
  const bg = [];
  if (kind === 'any') bg.push({ t: 'rect', x: 0, y: 0, w: size, h: size, rx: size * 0.225, fill: COLORS.cream });
  else bg.push({ t: 'rect', x: 0, y: 0, w: size, h: size, rx: 0, fill: COLORS.cream });
  // soft sunny disc behind the mascot
  bg.push({ t: 'circle', cx: size / 2, cy: size / 2, r: size * (kind === 'maskable' ? 0.33 : 0.4), fill: COLORS.sunL });

  const s = kind === 'maskable'
    ? (size * 0.38) / CURLO_HALF_DIAG        // bbox corners stay inside r = 0.4 * size
    : (size * 0.62) / CURLO_H;
  return { background: bg, T: { s, tx: size / 2 - CURLO_CX * s, ty: size / 2 - CURLO_CY * s } };
}

function renderPNG(size, kind) {
  const { background, T } = iconLayout(size, kind);
  return new Raster(size, size, 4).draw(background).draw(CURLO, T).toPNG();
}

/** Serialise one scene shape as SVG markup (design units). */
function shapeToSVG(sh) {
  const n = (v) => +v.toFixed(4);
  const op = sh.opacity != null && sh.opacity !== 1 ? ` opacity="${sh.opacity}"` : '';
  switch (sh.t) {
    case 'rect':
      return `<rect x="${n(sh.x)}" y="${n(sh.y)}" width="${n(sh.w)}" height="${n(sh.h)}"${sh.rx ? ` rx="${n(sh.rx)}"` : ''} fill="${sh.fill}"${op}/>`;
    case 'circle':
      return `<circle cx="${n(sh.cx)}" cy="${n(sh.cy)}" r="${n(sh.r)}" fill="${sh.fill}"${op}/>`;
    case 'ellipse':
      return `<ellipse cx="${n(sh.cx)}" cy="${n(sh.cy)}" rx="${n(sh.rx)}" ry="${n(sh.ry)}" fill="${sh.fill}"${op}` +
        (sh.rot ? ` transform="rotate(${sh.rot} ${sh.cx} ${sh.cy})"` : '') + '/>';
    case 'path':
      return `<path d="${sh.d}" fill="${sh.fill || 'none'}"` +
        (sh.stroke ? ` stroke="${sh.stroke}" stroke-width="${sh.sw}" stroke-linecap="round" stroke-linejoin="round"` : '') + `${op}/>`;
    default:
      throw new Error('shapeToSVG: unknown shape ' + sh.t);
  }
}

/** icon.svg: the 'any' layout at 512, Curlo markup inside a transform group. */
function renderSVG() {
  const size = 512;
  const { background, T } = iconLayout(size, 'any');
  const r = (v) => +v.toFixed(4);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`,
    '  <title>Cpp Hero</title>',
    ...background.map((b) => '  ' + shapeToSVG(b)),
    `  <g transform="translate(${r(T.tx)} ${r(T.ty)}) scale(${r(T.s)})">`,
    ...CURLO.map((c) => '    ' + shapeToSVG(c)),
    '  </g>',
    '</svg>',
    '',
  ].join('\n');
}

const ICONS = [
  { name: 'icon-192.png', size: 192, kind: 'any' },
  { name: 'icon-512.png', size: 512, kind: 'any' },
  { name: 'icon-maskable-512.png', size: 512, kind: 'maskable' },
  { name: 'apple-touch-icon.png', size: 180, kind: 'apple' },
];

function generateIcons(iconDir) {
  writeFile(path.join(iconDir, 'icon.svg'), renderSVG());
  for (const ic of ICONS) writeFile(path.join(iconDir, ic.name), renderPNG(ic.size, ic.kind));
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

function main() {
  const t0 = Date.now();
  const opts = parseArgs(process.argv.slice(2));

  // 1. inline
  const { html: rawHtml, inlined, skipped } = inlineTemplate(opts.src);
  for (const s of skipped) console.log('[build] note: optional file not found, skipped: ' + s);

  // 2. version (hash with the placeholder still in place, then substitute)
  const version = computeVersion(rawHtml);
  const html = rawHtml.split(PLACEHOLDER).join(version);
  if (!rawHtml.includes(PLACEHOLDER)) console.log('[build] note: template contains no ' + PLACEHOLDER + ' placeholder');

  // 3. icons -> public/icons (committed source of truth)
  const pubIcons = path.join(opts.public, 'icons');
  generateIcons(pubIcons);

  // 4. dist
  writeFile(path.join(opts.out, 'index.html'), html);

  const manifestSrc = path.join(opts.public, 'manifest.webmanifest');
  if (!fs.existsSync(manifestSrc)) fail('Missing ' + manifestSrc);
  const manifest = readText(manifestSrc);
  try { JSON.parse(manifest); } catch (e) { fail('manifest.webmanifest is not valid JSON: ' + e.message); }
  writeFile(path.join(opts.out, 'manifest.webmanifest'), manifest);

  const swSrc = path.join(opts.public, 'sw.js');
  if (!fs.existsSync(swSrc)) fail('Missing ' + swSrc);
  const sw = readText(swSrc);
  if (!sw.includes(PLACEHOLDER)) console.log('[build] note: sw.js contains no ' + PLACEHOLDER + ' placeholder');
  writeFile(path.join(opts.out, 'sw.js'), sw.split(PLACEHOLDER).join(version));

  for (const f of fs.readdirSync(pubIcons).sort()) {
    const from = path.join(pubIcons, f);
    if (fs.statSync(from).isFile()) writeFile(path.join(opts.out, 'icons', f), fs.readFileSync(from));
  }

  // 5. artifact preview: the same page without the document wrapper tags, for
  //    hosts that add their own <!doctype>/<head>/<body> skeleton (claude.ai
  //    Artifacts). No service worker or manifest there; the app runs without both.
  const artifact = html
    .replace(/<!doctype html>\s*/i, '')
    .replace(/<\/?html[^>]*>\s*/gi, '')
    .replace(/<\/?head>\s*/gi, '')
    .replace(/<\/?body[^>]*>\s*/gi, '')
    .replace(/<link rel="manifest"[^>]*>\s*/i, '');
  const titleMatch = artifact.match(/<title>[\s\S]*?<\/title>/i);
  writeFile(path.join(REPO, '.artifact', 'cpp-hero.html'),
    titleMatch ? titleMatch[0] + '\n' + artifact.replace(titleMatch[0], '') : artifact);

  // 6. summary
  console.log('\nCpp Hero build ' + version + '  (' + (Date.now() - t0) + ' ms)');
  console.log('  inlined ' + inlined.length + ' file(s): ' + inlined.map((x) => x.relPath).join(', '));
  if (skipped.length) console.log('  skipped (optional, missing): ' + skipped.join(', '));
  console.log('  wrote:');
  for (const w of written) console.log('    ' + rel(w.file).padEnd(40) + fmtBytes(w.bytes).padStart(10));
}

try {
  main();
} catch (e) {
  fail(e && e.stack ? e.stack : String(e));
}
