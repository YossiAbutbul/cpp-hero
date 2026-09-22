/*
 * tools/icon-raster.js: a tiny, dependency-free vector rasterizer + PNG encoder.
 *
 * Just enough to turn the Curlo icon scene (see build.js) into PNGs without
 * any npm packages. Supported primitives:
 *   - filled rounded rectangles, ellipses/circles (optionally rotated)
 *   - filled paths made of M/L/H/V/Q/C/Z segments (absolute or relative),
 *     flattened to polygons and filled with the nonzero winding rule
 *   - stroked paths (open or closed) with round caps and round joins, done
 *     with a distance-to-polyline test (distance <= strokeWidth / 2)
 *   - per-shape opacity, "source-over" compositing in premultiplied RGBA
 *   - SxS supersampling per pixel for anti-aliasing (default 4x4 = 16 samples)
 *
 * Coordinates: every shape is given in "design units" and mapped to pixels
 * by an affine transform { s, tx, ty }: px = x * s + tx, py = y * s + ty.
 * Rotation (for the one rotated highlight ellipse) is applied in design
 * units around the ellipse centre, like SVG's rotate(a cx cy).
 *
 * Output is deterministic: same scene + size => byte-identical PNG.
 */
'use strict';

const zlib = require('zlib');

/* ------------------------------------------------------------------ */
/* Colour helpers                                                      */
/* ------------------------------------------------------------------ */

/** "#RRGGBB" (or "#RGB") -> [r, g, b] in 0..255. */
function parseHex(hex) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error('Bad colour: ' + hex);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/* ------------------------------------------------------------------ */
/* SVG path "d" parsing                                                */
/* ------------------------------------------------------------------ */

/**
 * Parse a path string into subpaths of segments (design units).
 * Returns [{ start: [x,y], segs: [{ type: 'L'|'Q'|'C', pts: [[x,y],...] }], closed }]
 * Only M, L, H, V, Q, C, Z (upper = absolute, lower = relative) are handled;
 * anything else throws so a silent mis-render can't happen.
 */
function parsePath(d) {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
  const subpaths = [];
  let i = 0;
  let cmd = null;
  let cx = 0, cy = 0;          // current point
  let sub = null;              // current subpath
  const num = () => {
    if (i >= tokens.length || /[a-zA-Z]/.test(tokens[i])) throw new Error('Path: expected number in "' + d + '"');
    return parseFloat(tokens[i++]);
  };
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    else if (cmd === null) throw new Error('Path must start with a command: "' + d + '"');
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? cx : 0, oy = rel ? cy : 0;
    switch (cmd.toUpperCase()) {
      case 'M': {
        cx = ox + num(); cy = oy + num();
        sub = { start: [cx, cy], segs: [], closed: false };
        subpaths.push(sub);
        cmd = rel ? 'l' : 'L';   // extra coordinate pairs after M are implicit L
        break;
      }
      case 'L': { const x = ox + num(), y = oy + num(); sub.segs.push({ type: 'L', pts: [[x, y]] }); cx = x; cy = y; break; }
      case 'H': { const x = ox + num(); sub.segs.push({ type: 'L', pts: [[x, cy]] }); cx = x; break; }
      case 'V': { const y = oy + num(); sub.segs.push({ type: 'L', pts: [[cx, y]] }); cy = y; break; }
      case 'Q': {
        const p1 = [ox + num(), oy + num()], p2 = [ox + num(), oy + num()];
        sub.segs.push({ type: 'Q', pts: [p1, p2] }); [cx, cy] = p2; break;
      }
      case 'C': {
        const p1 = [ox + num(), oy + num()], p2 = [ox + num(), oy + num()], p3 = [ox + num(), oy + num()];
        sub.segs.push({ type: 'C', pts: [p1, p2, p3] }); [cx, cy] = p3; break;
      }
      case 'Z': {
        if (sub) { sub.closed = true; [cx, cy] = sub.start; }
        // A following command without M starts a new subpath at the start point.
        sub = { start: [cx, cy], segs: [], closed: false };
        subpaths.push(sub);
        cmd = null;
        break;
      }
      default: throw new Error('Unsupported path command "' + cmd + '" in "' + d + '"');
    }
  }
  return subpaths.filter((s) => s.segs.length > 0);
}

/* ------------------------------------------------------------------ */
/* Geometry -> pixel-space polylines                                   */
/* ------------------------------------------------------------------ */

const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Flatten a parsed subpath (already in pixel space) to a list of points. */
function flattenSubpath(sub) {
  const pts = [sub.start];
  let p0 = sub.start;
  for (const seg of sub.segs) {
    if (seg.type === 'L') { pts.push(seg.pts[0]); p0 = seg.pts[0]; continue; }
    // Number of steps from the control polygon length: ~1 step per 0.75px.
    const ctrl = [p0, ...seg.pts];
    let len = 0;
    for (let k = 1; k < ctrl.length; k++) len += dist(ctrl[k - 1], ctrl[k]);
    const n = Math.max(8, Math.ceil(len / 0.75));
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t;
      let x, y;
      if (seg.type === 'Q') {
        const [a, b] = seg.pts;
        x = u * u * p0[0] + 2 * u * t * a[0] + t * t * b[0];
        y = u * u * p0[1] + 2 * u * t * a[1] + t * t * b[1];
      } else {
        const [a, b, c] = seg.pts;
        x = u * u * u * p0[0] + 3 * u * u * t * a[0] + 3 * u * t * t * b[0] + t * t * t * c[0];
        y = u * u * u * p0[1] + 3 * u * u * t * a[1] + 3 * u * t * t * b[1] + t * t * t * c[1];
      }
      pts.push([x, y]);
    }
    p0 = seg.pts[seg.pts.length - 1];
  }
  return pts;
}

/** Apply { s, tx, ty } to a point. */
const xf = (T, p) => [p[0] * T.s + T.tx, p[1] * T.s + T.ty];

/** Transform every control point of parsed subpaths into pixel space. */
function transformSubpaths(subs, T) {
  return subs.map((s) => ({
    start: xf(T, s.start),
    closed: s.closed,
    segs: s.segs.map((g) => ({ type: g.type, pts: g.pts.map((p) => xf(T, p)) })),
  }));
}

/** Ellipse polygon (pixel space). rot is in degrees, applied in design units. */
function ellipsePoly(e, T) {
  const rot = ((e.rot || 0) * Math.PI) / 180;
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const circ = 2 * Math.PI * Math.max(e.rx, e.ry) * T.s;
  const n = Math.max(48, Math.ceil(circ / 0.75));
  const pts = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * 2 * Math.PI;
    const lx = Math.cos(a) * e.rx, ly = Math.sin(a) * e.ry;
    pts.push(xf(T, [e.cx + lx * cos - ly * sin, e.cy + lx * sin + ly * cos]));
  }
  return pts;
}

/** Rounded-rect polygon (pixel space); rx is clamped to half the smaller side. */
function roundRectPoly(r, T) {
  const rx = Math.min(r.rx || 0, r.w / 2, r.h / 2);
  if (rx <= 0) {
    return [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]].map((p) => xf(T, p));
  }
  const n = Math.max(12, Math.ceil(((Math.PI / 2) * rx * T.s) / 0.75));
  const corners = [
    [r.x + r.w - rx, r.y + rx, -Math.PI / 2],     // top-right, sweep from -90deg
    [r.x + r.w - rx, r.y + r.h - rx, 0],          // bottom-right
    [r.x + rx, r.y + r.h - rx, Math.PI / 2],      // bottom-left
    [r.x + rx, r.y + rx, Math.PI],                // top-left
  ];
  const pts = [];
  for (const [ccx, ccy, a0] of corners) {
    for (let k = 0; k <= n; k++) {
      const a = a0 + (k / n) * (Math.PI / 2);
      pts.push(xf(T, [ccx + Math.cos(a) * rx, ccy + Math.sin(a) * rx]));
    }
  }
  return pts;
}

/* ------------------------------------------------------------------ */
/* Raster                                                              */
/* ------------------------------------------------------------------ */

class Raster {
  /**
   * @param {number} w  width in px
   * @param {number} h  height in px
   * @param {number} ss supersampling factor per axis (ss*ss samples/pixel)
   */
  constructor(w, h, ss = 4) {
    this.w = w; this.h = h; this.ss = ss;
    this.px = new Float32Array(w * h * 4);   // premultiplied RGBA, 0..1
    this.cov = new Float32Array(w * h);      // per-shape coverage scratch buffer
  }

  /** Draw a list of shapes with transform T (default identity). */
  draw(shapes, T = { s: 1, tx: 0, ty: 0 }) {
    for (const sh of shapes) this.drawShape(sh, T);
    return this;
  }

  drawShape(sh, T) {
    const opacity = sh.opacity == null ? 1 : sh.opacity;
    if (sh.t === 'rect') {
      this._fill([roundRectPoly(sh, T)]); this._composite(sh.fill, opacity);
    } else if (sh.t === 'ellipse' || sh.t === 'circle') {
      const e = sh.t === 'circle' ? { cx: sh.cx, cy: sh.cy, rx: sh.r, ry: sh.r, rot: 0 } : sh;
      this._fill([ellipsePoly(e, T)]); this._composite(sh.fill, opacity);
    } else if (sh.t === 'path') {
      const subs = transformSubpaths(parsePath(sh.d), T);
      const lines = subs.map((s) => ({ pts: flattenSubpath(s), closed: s.closed }));
      if (sh.fill) { this._fill(lines.map((l) => l.pts)); this._composite(sh.fill, opacity); }
      if (sh.stroke) { this._stroke(lines, (sh.sw || 1) * T.s / 2); this._composite(sh.stroke, opacity); }
    } else {
      throw new Error('Unknown shape type: ' + sh.t);
    }
  }

  /** Reset coverage bbox tracking. */
  _begin() { this.bx0 = this.w; this.by0 = this.h; this.bx1 = -1; this.by1 = -1; }
  _touch(x, y) {
    if (x < this.bx0) this.bx0 = x; if (x > this.bx1) this.bx1 = x;
    if (y < this.by0) this.by0 = y; if (y > this.by1) this.by1 = y;
  }

  /**
   * Scanline fill of polygons (implicitly closed) with the nonzero rule,
   * sampled on an ss x ss grid per pixel. Accumulates into this.cov.
   */
  _fill(polys) {
    this._begin();
    const S = this.ss, inc = 1 / (S * S), W = this.w;
    const edges = [];
    let minY = Infinity, maxY = -Infinity;
    for (const pts of polys) {
      for (let k = 0; k < pts.length; k++) {
        const a = pts[k], b = pts[(k + 1) % pts.length];
        if (a[1] === b[1]) continue;                      // horizontal: no crossings
        const up = a[1] < b[1];
        const lo = up ? a : b, hi = up ? b : a;
        edges.push({ y0: lo[1], y1: hi[1], x0: lo[0], dxdy: (hi[0] - lo[0]) / (hi[1] - lo[1]), dir: up ? 1 : -1 });
        minY = Math.min(minY, lo[1]); maxY = Math.max(maxY, hi[1]);
      }
    }
    if (!edges.length) return;
    const r0 = Math.max(0, Math.floor(minY * S)), r1 = Math.min(this.h * S - 1, Math.ceil(maxY * S));
    const xs = [];
    for (let r = r0; r <= r1; r++) {
      const sy = (r + 0.5) / S;                          // sample row centre
      xs.length = 0;
      for (const e of edges) if (sy >= e.y0 && sy < e.y1) xs.push({ x: e.x0 + (sy - e.y0) * e.dxdy, dir: e.dir });
      if (xs.length < 2) continue;
      xs.sort((p, q) => p.x - q.x);
      const py = Math.floor(r / S);
      let wind = 0;
      for (let k = 0; k < xs.length - 1; k++) {
        wind += xs[k].dir;
        if (wind === 0) continue;
        // samples at (c + .5) / S inside [xa, xb)
        const c0 = Math.max(0, Math.ceil(xs[k].x * S - 0.5));
        const c1 = Math.min(W * S, Math.ceil(xs[k + 1].x * S - 0.5));
        for (let c = c0; c < c1; c++) this.cov[py * W + ((c / S) | 0)] += inc;
        if (c1 > c0) { this._touch((c0 / S) | 0, py); this._touch(((c1 - 1) / S) | 0, py); }
      }
    }
  }

  /**
   * Stroke polylines with round caps + joins: a sample is covered when its
   * distance to any segment is <= hw (half width, px). Accumulates into cov.
   */
  _stroke(lines, hw) {
    this._begin();
    const S = this.ss, inc = 1 / (S * S), W = this.w, H = this.h;
    const segs = [];
    for (const l of lines) {
      const p = l.closed ? [...l.pts, l.pts[0]] : l.pts;
      if (p.length === 1) segs.push([p[0], p[0]]);
      for (let k = 1; k < p.length; k++) segs.push([p[k - 1], p[k]]);
    }
    if (!segs.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [a, b] of segs) {
      x0 = Math.min(x0, a[0], b[0]); x1 = Math.max(x1, a[0], b[0]);
      y0 = Math.min(y0, a[1], b[1]); y1 = Math.max(y1, a[1], b[1]);
    }
    const px0 = Math.max(0, Math.floor(x0 - hw - 1)), px1 = Math.min(W - 1, Math.ceil(x1 + hw + 1));
    const py0 = Math.max(0, Math.floor(y0 - hw - 1)), py1 = Math.min(H - 1, Math.ceil(y1 + hw + 1));
    const hw2 = hw * hw;
    // Precompute segment data for the distance test.
    const sd = segs.map(([a, b]) => {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      return { ax: a[0], ay: a[1], dx, dy, l2: dx * dx + dy * dy,
        minx: Math.min(a[0], b[0]) - hw, maxx: Math.max(a[0], b[0]) + hw,
        miny: Math.min(a[1], b[1]) - hw, maxy: Math.max(a[1], b[1]) + hw };
    });
    for (let py = py0; py <= py1; py++) {
      // Segments whose (expanded) y-range touches this pixel row.
      const rowSegs = sd.filter((g) => g.maxy >= py && g.miny <= py + 1);
      if (!rowSegs.length) continue;
      for (let px = px0; px <= px1; px++) {
        const cand = rowSegs.filter((g) => g.maxx >= px && g.minx <= px + 1);
        if (!cand.length) continue;
        let hits = 0;
        for (let j = 0; j < S; j++) {
          const sy = py + (j + 0.5) / S;
          for (let i = 0; i < S; i++) {
            const sx = px + (i + 0.5) / S;
            for (const g of cand) {
              let t = g.l2 > 0 ? ((sx - g.ax) * g.dx + (sy - g.ay) * g.dy) / g.l2 : 0;
              t = t < 0 ? 0 : t > 1 ? 1 : t;
              const ex = g.ax + t * g.dx - sx, ey = g.ay + t * g.dy - sy;
              if (ex * ex + ey * ey <= hw2) { hits++; break; }
            }
          }
        }
        if (hits) { this.cov[py * W + px] += hits * inc; this._touch(px, py); }
      }
    }
  }

  /** Composite the accumulated coverage with a colour, then clear it. */
  _composite(hex, opacity) {
    if (this.bx1 < 0) return;
    const [r, g, b] = parseHex(hex).map((v) => v / 255);
    const W = this.w;
    for (let y = this.by0; y <= this.by1; y++) {
      for (let x = this.bx0; x <= this.bx1; x++) {
        const k = y * W + x;
        const c = this.cov[k];
        if (c <= 0) continue;
        this.cov[k] = 0;
        const a = Math.min(1, c) * opacity, ia = 1 - a, o = k * 4;
        this.px[o] = r * a + this.px[o] * ia;
        this.px[o + 1] = g * a + this.px[o + 1] * ia;
        this.px[o + 2] = b * a + this.px[o + 2] * ia;
        this.px[o + 3] = a + this.px[o + 3] * ia;
      }
    }
  }

  /** Straight (non-premultiplied) 8-bit RGBA bytes. */
  toRGBA() {
    const out = Buffer.alloc(this.w * this.h * 4);
    for (let k = 0; k < this.w * this.h; k++) {
      const o = k * 4, a = this.px[o + 3];
      if (a <= 0) continue;                            // stays transparent black
      for (let c = 0; c < 3; c++) out[o + c] = Math.max(0, Math.min(255, Math.round((this.px[o + c] / a) * 255)));
      out[o + 3] = Math.max(0, Math.min(255, Math.round(a * 255)));
    }
    return out;
  }

  toPNG() { return encodePNG(this.w, this.h, this.toRGBA()); }
}

/* ------------------------------------------------------------------ */
/* Minimal PNG encoder (RGBA 8-bit, filter 0, zlib via node:zlib)      */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePNG(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type: RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;   // compression, filter, interlace
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;   // filter type 0 (None)
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

module.exports = { Raster, parsePath, encodePNG, crc32 };
