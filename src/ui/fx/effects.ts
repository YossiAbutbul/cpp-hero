/**
 * Screen-level effects drawn by <FxLayer/> (mounted once by the app shell):
 * confetti / particles on a canvas, a gentle full-screen color flash,
 * floating "+XP" text and shield shock rings. All are no-ops (or opacity-only)
 * under reduced motion, and all coordinates are viewport (client) pixels.
 */
import { anim, reduced } from './motion';
import styles from './fx.module.css';

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let flashEl: HTMLElement | null = null;
let layerEl: HTMLElement | null = null;

/** Called by <FxLayer/>. */
export function registerFxLayer(parts: {
  canvas: HTMLCanvasElement | null;
  flash: HTMLElement | null;
  layer: HTMLElement | null;
}): void {
  canvas = parts.canvas;
  ctx = canvas?.getContext('2d') ?? null;
  flashEl = parts.flash;
  layerEl = parts.layer;
  W = H = 0;
}

/* ---------------- confetti ---------------- */

export const CONFETTI_COLORS = ['#F2641B', '#FFC62E', '#FF5A70', '#0FA898', '#3D8BFF', '#ffffff'];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  r: number;
  vr: number;
  w: number;
  h: number;
  c: string;
  sh: number;
  life: number;
  max: number;
}
let parts: Particle[] = [];
let raf = 0;
let W = 0;
let H = 0;
let left = 0;
let top = 0;

function size(): boolean {
  if (!canvas || !ctx) return false;
  const r = canvas.getBoundingClientRect();
  left = r.left;
  top = r.top;
  if (r.width !== W || r.height !== H) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  return W > 0 && H > 0;
}

export interface BurstOptions {
  n?: number;
  colors?: string[];
  /** radians around "up" (default 2.4) */
  spread?: number;
  speed?: number;
  /** false = explode in every direction */
  up?: boolean;
  gravity?: number;
  /** 0 rect, 1 circle, 2 triangle (default: mixed) */
  shape?: number;
  /** frames (default 240) */
  life?: number;
}

/** Particle burst at viewport point (x, y). */
export function burst(x: number, y: number, opts: BurstOptions = {}): void {
  if (reduced() || !size()) return;
  const n = opts.n ?? 80;
  const colors = opts.colors ?? CONFETTI_COLORS;
  const spread = opts.spread ?? 2.4;
  const sp = opts.speed ?? 1;
  for (let i = 0; i < n; i++) {
    const a = opts.up === false ? Math.random() * Math.PI * 2 : -Math.PI / 2 + (Math.random() - 0.5) * spread;
    const s = (5 + Math.random() * 9) * sp;
    parts.push({
      x: x - left,
      y: y - top,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      g: opts.gravity ?? 0.28 + Math.random() * 0.12,
      r: Math.random() * 6.3,
      vr: (Math.random() - 0.5) * 0.4,
      w: 6 + Math.random() * 7,
      h: 4 + Math.random() * 6,
      c: colors[i % colors.length]!,
      sh: opts.shape ?? i % 3,
      life: 0,
      max: opts.life ?? 240,
    });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}

/** Burst from the center of an element. */
export function burstAt(el: Element | null | undefined, opts: BurstOptions | number = {}): void {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, typeof opts === 'number' ? { n: opts } : opts);
}

/** Confetti rain from the top edge (big celebrations). */
export function rain(n = 140): void {
  if (reduced() || !size()) return;
  for (let i = 0; i < n; i++) {
    parts.push({
      x: Math.random() * W,
      y: -20 - Math.random() * H * 0.6,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 3,
      g: 0.05,
      r: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.3,
      w: 6 + Math.random() * 7,
      h: 4 + Math.random() * 6,
      c: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
      sh: i % 3,
      life: 0,
      max: 420,
    });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}

function tick(): void {
  if (!ctx || !size()) {
    raf = 0;
    parts = [];
    return;
  }
  ctx.clearRect(0, 0, W, H);
  parts = parts.filter((p) => p.y < H + 30 && p.life < p.max);
  for (const p of parts) {
    p.life++;
    p.vx *= 0.985;
    p.vy = p.vy * 0.985 + p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.r += p.vr;
    ctx.save();
    ctx.globalAlpha = p.life > p.max - 30 ? Math.max(0, (p.max - p.life) / 30) : 1;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.r);
    ctx.fillStyle = p.c;
    if (p.sh === 0) ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    else if (p.sh === 1) {
      ctx.beginPath();
      ctx.arc(0, 0, p.h / 1.4, 0, 7);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -p.w / 2);
      ctx.lineTo(p.w / 2, p.w / 2);
      ctx.lineTo(-p.w / 2, p.w / 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  raf = parts.length ? requestAnimationFrame(tick) : 0;
  if (!raf) ctx.clearRect(0, 0, W, H);
}

/** Remove every particle now (closing a celebration, reduced motion turned on). */
export function clearConfetti(): void {
  parts = [];
  ctx?.clearRect(0, 0, W, H);
}

/* ---------------- flash / floating text / shock ring ---------------- */

/** Gentle full-screen color flash (opacity only, so it also runs under reduced motion). */
export function flash(color = 'var(--coral)'): Promise<unknown> {
  if (!flashEl) return Promise.resolve();
  flashEl.style.background = color;
  return anim(flashEl, [{ opacity: 0 }, { opacity: 0.22 }, { opacity: 0 }], {
    duration: reduced() ? 300 : 420,
    rm: 'keep',
  });
}

/** Floating text rising from an element: "+20 XP" (tone 'pos'), "-1" ('neg'), damage ('dmg'). */
export function floatText(el: Element | null | undefined, text: string, tone: 'pos' | 'neg' | 'dmg' = 'pos'): void {
  if (!el || !layerEl) return;
  const r = el.getBoundingClientRect();
  const lr = layerEl.getBoundingClientRect();
  const t = document.createElement('div');
  t.className = `${styles.floaty} ${styles[tone] ?? ''}`;
  t.setAttribute('aria-hidden', 'true');
  t.textContent = text;
  t.style.left = `${r.left - lr.left + r.width / 2}px`;
  t.style.top = `${r.top - lr.top + r.height / 3}px`;
  layerEl.appendChild(t);
  void anim(
    t,
    [
      { transform: 'translate(-50%,0) scale(.6)', opacity: 0 },
      { transform: 'translate(-50%,-18px) scale(1.15)', opacity: 1, offset: 0.25 },
      { transform: 'translate(-50%,-56px) scale(1)', opacity: 0 },
    ],
    { duration: 900, rm: 'fade' },
  ).then(() => t.remove());
  setTimeout(() => t.remove(), 1400);
}

/** Expanding ring at (x, y) inside `host` (host must be position:relative). */
export function shock(host: HTMLElement | null, x: number, y: number, color?: string): void {
  if (!host) return;
  const s = document.createElement('div');
  s.className = styles.shock ?? '';
  s.setAttribute('aria-hidden', 'true');
  s.style.left = `${x - 35}px`;
  s.style.top = `${y - 35}px`;
  if (color) s.style.borderColor = color;
  host.appendChild(s);
  void anim(s, [{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(2)', opacity: 0 }], { duration: 460 }).then(
    () => s.remove(),
  );
  setTimeout(() => s.remove(), 900);
}
