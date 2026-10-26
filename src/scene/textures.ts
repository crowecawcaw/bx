import * as THREE from 'three';
import { drawCherub } from './cherubArt';
import { curl, leaf, pomegranate, heading, strew, blossom, flush, hr, layers, palmette, runningStitch, scallops, scroll, spline, sprouts, wavyBand, ribbon, type P, type Palette } from './embroidery';

// The four commanded fabric colours (Ex 26:1, 31, 36; 27:16)
export const BLUE = '#26458f'; // tekhelet
export const PURPLE = '#6a2d78'; // argaman
export const SCARLET = '#b8232c'; // tola'at shani
export const LINEN = '#efe7d4'; // shesh moshzar, fine twined linen

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

const cache = new Map<string, THREE.CanvasTexture>();

function make(key: string, w: number, h: number, draw: Draw, repeat?: [number, number], color = true) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  cache.set(key, t);
  return t;
}

// Deterministic pseudo-random so textures look the same on every load.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Over-paints a fine plain-weave: alternating warp and weft highlights. */
function weave(ctx: CanvasRenderingContext2D, w: number, h: number, step: number, alpha: number, seed = 1) {
  const r = rng(seed);
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const over = ((x / step + y / step) & 1) === 0;
      const j = (r() - 0.5) * 0.25;
      ctx.fillStyle = over ? `rgba(255,255,255,${alpha + j * alpha})` : `rgba(0,0,0,${alpha * 0.9 + j * alpha})`;
      if (over) ctx.fillRect(x, y + step * 0.15, step, step * 0.7);
      else ctx.fillRect(x + step * 0.15, y, step * 0.7, step);
    }
  }
  // slubs: the irregular thick spots in hand-spun thread
  for (let i = 0; i < (w * h) / 900; i++) {
    ctx.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '60,40,20'},${0.05 + r() * 0.06})`;
    const horiz = r() > 0.5;
    const len = 6 + r() * 26;
    ctx.fillRect(r() * w, r() * h, horiz ? len : 1.5, horiz ? 1.5 : len);
  }
}

function noise(ctx: CanvasRenderingContext2D, w: number, h: number, n: number, rgb: string, a: number, seed = 7, size = 2) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(${rgb},${r() * a})`;
    ctx.fillRect(r() * w, r() * h, size + r() * size, size + r() * size);
  }
}


/** Plain white fine twined linen: court hangings (Ex 27:9). */
export function linenTexture() {
  return make('linen', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = LINEN;
    ctx.fillRect(0, 0, w, h);
    weave(ctx, w, h, 4, 0.07, 3);
    // a woven selvedge stripe so the hanging reads as cloth
    ctx.fillStyle = 'rgba(160,140,110,0.25)';
    ctx.fillRect(0, 250, w, 3);
  }, [1, 1]);
}

/** Weave relief for bump mapping on all cloth. */
export function weaveBump() {
  return make('weaveBump', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) {
      for (let x = 0; x < w; x += 4) {
        const over = ((x / 4 + y / 4) & 1) === 0;
        ctx.fillStyle = over ? '#c8c8c8' : '#404040';
        ctx.fillRect(x, y, 4, 4);
      }
    }
  }, [1, 1], false);
}

const INK = '#1a1630';

/** A woven border band: a small running scroll on a coloured ground, edged with stitched lines
 *  and hung with a row of scallops toward the field. Drawn at the top; mirror for the bottom. */
function scrollBorder(
  ctx: CanvasRenderingContext2D,
  w: number,
  b: number,
  ground: string,
  edge: string,
  scallop: string,
  pal: Palette,
  seed: number,
  period: number,
) {
  wavyBand(ctx, 0, w, -4, b * 0.14, edge, seed);
  wavyBand(ctx, 0, w, b * 0.14, b, ground, seed + 1);
  runningStitch(ctx, 0, w, b * 0.2, LINEN, 1.6, 7);
  runningStitch(ctx, 0, w, b * 0.94, LINEN, 1.6, 7);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, b * 0.22, w, b * 0.7);
  ctx.clip();
  const L = layers();
  scroll(ctx, { x0: 0, x1: w, y: b * 0.57, amp: b * 0.2, period, phase: seed, stemW: Math.max(3, b * 0.05), pal, inkW: 1.6, seed, scale: 1.45, kinds: [2, 0, 3, 2, 0, 3] }, L);
  flush(L);
  ctx.restore();
  wavyBand(ctx, 0, w, b, b * 1.12, edge, seed + 2);
  scallops(ctx, 0, w, b * 1.12, b * 0.95, 1, scallop, LINEN, INK, 1.6);
}

function mirrored(ctx: CanvasRenderingContext2D, h: number, f: () => void) {
  f();
  ctx.save();
  ctx.translate(0, h);
  ctx.scale(1, -1);
  f();
  ctx.restore();
}

/** Embroidered needlework (ma'aseh roqem) in blue, purple and scarlet on linen.
 *  Used for the gate (Ex 27:16) and the door of the tent (Ex 26:36). Scripture specifies
 *  colours and technique only and commands no figures here, so the design is the flowing
 *  plant ornament of ancient needlework: scrolling vines bearing pomegranates (Ex 28:33),
 *  almond blossoms (Ex 25:33) and palmettes. `cols` sets how many waves cross the width. */
export function needleworkTexture(key: string, w: number, h: number, cols: number) {
  return make(key, w, h, (ctx) => {
    ctx.fillStyle = LINEN;
    ctx.fillRect(0, 0, w, h);
    weave(ctx, w, h, 4, 0.06, 11);
    const b = 64;
    const borderPal: Palette = { stem: LINEN, leaf: LINEN, fruit: [SCARLET, PURPLE, LINEN], light: LINEN, ink: INK };
    mirrored(ctx, h, () => scrollBorder(ctx, w, b, BLUE, SCARLET, PURPLE, borderPal, 3, 150));
    const top = b * 1.12 + b * 0.5;
    const bot = h - top;
    const pal: Palette = { stem: BLUE, leaf: PURPLE, fruit: [SCARLET, PURPLE, BLUE], light: LINEN, ink: INK };
    const L = layers();
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top - 18, w, bot - top + 36);
    ctx.clip();
    if (w >= h * 2) {
      // a single great scroll along the hanging
      const fh = bot - top;
      const period = (2 * w) / cols;
      scroll(ctx, { x0: 0, x1: w, y: (top + bot) / 2, amp: fh * 0.27, period, phase: 0.4, stemW: 9, pal, inkW: 2.2, seed: 41, rich: true, scale: 1.12 }, L);
    } else {
      // upright scrolls side by side, each a half-wave out of step so their hollows interlock
      const n = Math.max(2, Math.round(cols / 2));
      const cw = w / n;
      const len = bot - top;
      const period = len / Math.max(1, Math.round(len / (cw * 1.15)));
      for (let i = 0; i < n; i++) {
        ctx.save();
        ctx.translate((i + 0.5) * cw, 0);
        ctx.rotate(Math.PI / 2);
        if (i % 2) ctx.scale(1, -1);
        scroll(ctx, { x0: top - period, x1: bot + period, y: 0, amp: cw * 0.34, period, phase: 0.6 + i * 1.3, stemW: 8, pal, inkW: 2.2, seed: 51 + i * 7, rich: true, scale: 1.12 }, L);
        flush(L);
        ctx.restore();
      }
    }
    flush(L);
    strew(ctx, 0, top - 10, w, bot + 10, LINEN, 34, 4, { ...pal, stem: PURPLE, leaf: BLUE }, 1.8, 47);
    ctx.restore();
    weave(ctx, w, h, 4, 0.035, 12);
  });
}

/** Skilful woven work (ma'aseh hoshev) with cherubim: the veil (Ex 26:31). The cherubim stand
 *  among flowing vines that weave between them, in blue, purple, scarlet and linen. */
export function veilTexture() {
  return make('veil', 1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = BLUE;
    ctx.fillRect(0, 0, w, h);
    weave(ctx, w, h, 4, 0.08, 21);
    const b = 78;
    const borderPal: Palette = { stem: LINEN, leaf: PURPLE, fruit: [LINEN, PURPLE, BLUE], light: LINEN, ink: INK };
    mirrored(ctx, h, () => scrollBorder(ctx, w, b, SCARLET, PURPLE, PURPLE, borderPal, 5, 170));
    const top = b * 1.12 + b * 0.5;
    const bot = h - top;
    const rowH = (bot - top) / 3;
    const ys = [0, 1, 2].map((r) => top + rowH * (r + 0.5));
    const pal: Palette = { stem: SCARLET, leaf: PURPLE, fruit: [SCARLET, LINEN, PURPLE], light: LINEN, ink: INK };
    const L = layers();
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top - 6, w, bot - top + 12);
    ctx.clip();
    // two great vines interlace down the middle, crossing between the figures,
    // and one meanders down each side
    const vines: P[][] = [
      [[341, top - 40], [345, ys[0] - 20], [512, ys[1]], [679, ys[2] + 20], [683, bot + 40]],
      [[683, top - 40], [679, ys[0] - 20], [512, ys[1]], [345, ys[2] + 20], [341, bot + 40]],
      [[96, top - 40], [26, ys[0]], [110, ys[1]], [26, ys[2]], [96, bot + 40]],
      [[928, top - 40], [998, ys[0]], [914, ys[1]], [998, ys[2]], [928, bot + 40]],
    ];
    vines.forEach((v, i) => {
      // a meandering wobble along each vine so none runs straight
      const base = spline(v, 24);
      const path: P[] = base.map((p, j) => {
        const a = heading(base, j);
        const o = 24 * Math.sin(j * 0.09 + i * 1.7) + 7 * Math.sin(j * 0.27 + i);
        return [p[0] - Math.sin(a) * o, p[1] + Math.cos(a) * o];
      });
      L.stem.push(() => ribbon(ctx, path, 8, 8, i < 2 ? SCARLET : PURPLE, INK, 2.2));
      sprouts(ctx, path, 34, 50, 8, i < 2 ? pal : { ...pal, stem: PURPLE, leaf: SCARLET }, 2, 61 + i * 13, L);
    });
    flush(L);
    // a great almond blossom where the middle vines cross, and palmettes rising at the sides
    blossom(ctx, 512, ys[1], 0.3, 34, LINEN, SCARLET, INK, 2.2);
    for (const [x, s] of [[110, 1], [914, -1]] as const) {
      palmette(ctx, x, ys[1] + 30, -Math.PI / 2 + s * 0.08, 70, [SCARLET, PURPLE, LINEN], INK, 2.2);
    }
    ctx.restore();
    // cherubim in rows of three, two and three, turned toward the middle (cf. Ex 25:20)
    const spots: [number, number][] = [
      [170, ys[0]], [512, ys[0]], [854, ys[0]],
      [341, ys[1]], [683, ys[1]],
      [170, ys[2]], [512, ys[2]], [854, ys[2]],
    ];
    spots.forEach(([x, y], i) => {
      const s = 112 + (hr(i, 7) - 0.5) * 6;
      ctx.save();
      ctx.translate(x + (hr(i, 8) - 0.5) * 10, y + 12 + (hr(i, 9) - 0.5) * 10);
      if (x > 512) ctx.scale(-1, 1);
      drawCherub(ctx, 0, 0, s, LINEN, i % 2 ? SCARLET : PURPLE, INK);
      ctx.restore();
    });
    strew(ctx, 0, top - 4, w, bot + 4, BLUE, 28, 3.5, { ...pal, stem: PURPLE, leaf: PURPLE }, 1.8, 29);
    weave(ctx, w, h, 4, 0.04, 22);
  });
}

/** One of the ten inner curtains: 4 cubits wide (u) by 28 long (v), with cherubim (Ex 26:1-2).
 *  Tiles across u, curtain to curtain. */
export function innerCurtainTexture() {
  return make('inner', 256, 1792, (ctx, w, h) => {
    ctx.fillStyle = BLUE;
    ctx.fillRect(0, 0, w, h);
    weave(ctx, w, h, 4, 0.08, 31);
    const n = 7;
    const cell = h / n;
    // a vine winding down the middle of the curtain, behind the cherubim
    const pal: Palette = { stem: PURPLE, leaf: SCARLET, fruit: [SCARLET, LINEN, PURPLE], light: LINEN, ink: INK };
    const L = layers();
    const vine: P[] = [];
    for (let y = -20; y <= h + 20; y += 8) vine.push([w / 2 + 30 * Math.sin((y / cell) * Math.PI * 2 + 0.5) + 6 * Math.sin(y * 0.011), y]);
    L.stem.push(() => ribbon(ctx, vine, 6, 6, PURPLE, INK, 1.8));
    sprouts(ctx, vine, 34, 30, 6, pal, 1.6, 71, L);
    flush(L);
    // the selvedges: a running scroll on scarlet between linen edges, mirrored on each side
    const sel = (seed: number) => {
      wavyBand(ctx, -2, 9, 0, h, LINEN, seed, 0);
      ctx.save();
      ctx.beginPath();
      ctx.rect(9, 0, 30, h);
      ctx.clip();
      ctx.fillStyle = SCARLET;
      ctx.fillRect(9, 0, 30, h);
      ctx.translate(24, 0);
      ctx.rotate(Math.PI / 2);
      const B = layers();
      const bp: Palette = { stem: LINEN, leaf: LINEN, fruit: [PURPLE, LINEN, BLUE], light: LINEN, ink: INK };
      scroll(ctx, { x0: 0, x1: h, y: 0, amp: 6.5, period: cell / 2, stemW: 3, pal: bp, inkW: 1.2, seed, N: 28, scale: 1.45, kinds: [2, 3, 0, 3] }, B);
      flush(B);
      ctx.restore();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(9, h);
      ctx.moveTo(39, 0);
      ctx.lineTo(39, h);
      ctx.stroke();
      ctx.fillStyle = PURPLE;
      ctx.fillRect(40, 0, 4, h);
    };
    sel(81);
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    sel(81);
    ctx.restore();
    // between the figures, a spray: an almond blossom throwing out two curling fruiting stems
    const G = layers();
    for (let i = 0; i < n; i++) {
      const gy = (i + 1) * cell + 4;
      const flip = i % 2 ? 1 : -1;
      for (const sd of [-1, 1]) {
        const br = curl(w / 2 + sd * 8, gy, sd > 0 ? -0.35 * flip : Math.PI + 0.35 * flip, 64, sd * flip, 2.6 + hr(i, sd) * 0.6, 26);
        const e = br[br.length - 1];
        G.back.push(() => ribbon(ctx, br, 5, 2.5, PURPLE, INK, 1.6));
        const li = Math.floor(br.length * 0.45);
        G.back.push(() => leaf(ctx, br[li][0], br[li][1], heading(br, li) - sd * flip * 0.9, 20, 6, SCARLET, INK, 1.4, 0.2));
        const tk = Math.floor(br.length * 0.25);
        const td = curl(br[tk][0], br[tk][1], heading(br, tk) - sd * flip * 0.9, 22, -sd * flip, 6, 20);
        G.back.push(() => ribbon(ctx, td, 2.5, 0.8, PURPLE, INK, 1.2));
        G.front.push(() => pomegranate(ctx, e[0], e[1], heading(br, br.length - 1), 8, (i + sd) % 2 ? SCARLET : PURPLE, i % 2 ? PURPLE : SCARLET, LINEN, INK, 1.4));
      }
      G.front.push(() => blossom(ctx, w / 2, gy, i * 0.7, 14, LINEN, SCARLET, INK, 1.5));
    }
    flush(G);
    // seven cherubim down the length, alternately facing
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.translate(w / 2, (i + 0.55) * cell);
      if (i % 2) ctx.scale(-1, 1);
      drawCherub(ctx, 0, 0, 86, LINEN, i % 2 ? SCARLET : PURPLE, INK);
      ctx.restore();
    }
    strew(ctx, 45, 0, w - 45, h, BLUE, 16, 2.5, pal, 1.3, 37);
    weave(ctx, w, h, 4, 0.04, 32);
  }, [1, 1]);
}

/** Goats' hair cloth (Ex 26:7): coarse black weave as in Bedouin tents. */
export function goatHairTexture() {
  return make('goat', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#4a3f37';
    ctx.fillRect(0, 0, w, h);
    const r = rng(41);
    for (let y = 0; y < h; y += 3) {
      ctx.fillStyle = `rgba(${90 + r() * 40},${70 + r() * 30},${55 + r() * 20},${0.15 + r() * 0.2})`;
      ctx.fillRect(0, y, w, 1.5);
    }
    weave(ctx, w, h, 8, 0.12, 42);
    // faint brown warp stripes
    ctx.fillStyle = 'rgba(25,18,14,0.45)';
    for (let x = 20; x < w; x += 64) ctx.fillRect(x, 0, 9, h);
    ctx.fillStyle = 'rgba(150,120,95,0.3)';
    for (let x = 52; x < w; x += 64) ctx.fillRect(x, 0, 3, h);
  }, [1, 1]);
}

/** Leather patchwork: rams' skins dyed red, or tachash skins (Ex 26:14). */
export function skinTexture(key: string, base: string, seam: string, seed: number) {
  return make(key, 512, 512, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const r = rng(seed);
    noise(ctx, w, h, 2400, '0,0,0', 0.09, seed, 3);
    noise(ctx, w, h, 900, '255,255,255', 0.05, seed + 1, 4);
    // irregular hides stitched together
    ctx.strokeStyle = seam;
    ctx.lineWidth = 3;
    const cols = 3;
    const rows = 3;
    const pts: [number, number][][] = [];
    for (let j = 0; j <= rows; j++) {
      pts.push([]);
      for (let i = 0; i <= cols; i++) {
        const edge = i === 0 || j === 0 || i === cols || j === rows;
        pts[j].push([
          (i / cols) * w + (edge ? 0 : (r() - 0.5) * 70),
          (j / rows) * h + (edge ? 0 : (r() - 0.5) * 70),
        ]);
      }
    }
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) {
        const p = pts[j][i];
        for (const q of [pts[j][i + 1], pts[j + 1]?.[i]]) {
          if (!q) continue;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(q[0], q[1]);
          ctx.stroke();
          // stitches
          ctx.setLineDash([4, 6]);
          ctx.lineWidth = 2;
          ctx.strokeStyle = 'rgba(230,210,180,0.35)';
          ctx.beginPath();
          ctx.moveTo(p[0] + 5, p[1] + 5);
          ctx.lineTo(q[0] + 5, q[1] + 5);
          ctx.stroke();
          ctx.strokeStyle = seam;
          ctx.lineWidth = 3;
        }
      }
    }
    ctx.setLineDash([]);
  }, [1, 1]);
}

/** Acacia (shittim) wood grain. */
export function woodTexture() {
  return make('wood', 128, 512, (ctx, w, h) => {
    ctx.fillStyle = '#9a5f33';
    ctx.fillRect(0, 0, w, h);
    const r = rng(51);
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(${r() > 0.5 ? '60,30,10' : '190,130,80'},${0.15 + r() * 0.2})`;
      ctx.lineWidth = 1 + r() * 3;
      const x = r() * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y <= h; y += 32) ctx.lineTo(x + Math.sin(y * 0.02 + i) * 6, y);
      ctx.stroke();
    }
  }, [1, 1]);
}

/** Desert ground. */
export function sandTexture() {
  return make('sand', 512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#d6b98a';
    ctx.fillRect(0, 0, w, h);
    // broad patches of lighter and darker sand
    noise(ctx, w, h, 40, '170,130,85', 0.12, 64, 60);
    noise(ctx, w, h, 40, '245,225,185', 0.12, 65, 60);
    // wind ripples: short wavy crests, each with a lit face and a shadowed lee
    const r = rng(66);
    for (let i = 0; i < 70; i++) {
      const x0 = r() * w;
      const y0 = r() * h;
      const len = 60 + r() * 120;
      const ph = r() * 6.28;
      for (const [dy, col] of [[0, 'rgba(255,240,210,0.22)'], [2, 'rgba(140,105,65,0.16)']] as const) {
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let t = 0; t <= len; t += 6) {
          const x = (x0 + t) % w;
          const y = y0 + dy + Math.sin(t / 22 + ph) * 3;
          if (t === 0 || x < 6) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    noise(ctx, w, h, 5000, '120,90,50', 0.16, 61, 2);
    noise(ctx, w, h, 3000, '255,240,210', 0.18, 62, 2);
    noise(ctx, w, h, 60, '150,120,80', 0.2, 63, 14);
  }, [75, 75]);
}

/** Trodden ground: smoother, darker, packed sand with soft edges (alpha). */
export function trodTexture() {
  return make('trod', 256, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(150,115,75,0)');
    g.addColorStop(0.25, 'rgba(150,115,75,0.45)');
    g.addColorStop(0.75, 'rgba(150,115,75,0.45)');
    g.addColorStop(1, 'rgba(150,115,75,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // footprints and scuffs
    const r = rng(67);
    for (let i = 0; i < 160; i++) {
      const y = h * (0.2 + r() * 0.6);
      ctx.fillStyle = `rgba(${r() < 0.5 ? '110,80,50' : '235,215,175'},0.25)`;
      ctx.beginPath();
      ctx.ellipse(r() * w, y, 3 + r() * 3, 1.5 + r() * 2, r() * 3, 0, 6.3);
      ctx.fill();
    }
  });
}

/** Gold-overlaid board: hammered gold with darker seams at each board's edges. */
export function boardTexture() {
  return make('board', 128, 512, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    const r = rng(73);
    // faint vertical grain of the acacia under the gold
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(120,80,20,${0.03 + r() * 0.05})`;
      ctx.fillRect(r() * w, 0, 1 + r() * 3, h);
    }
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(60,35,0,0.75)');
    g.addColorStop(0.06, 'rgba(60,35,0,0.0)');
    g.addColorStop(0.94, 'rgba(60,35,0,0.0)');
    g.addColorStop(1, 'rgba(60,35,0,0.75)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Hammered metal surface: subtle dents so toon gold doesn't look like plastic. */
export function hammeredTexture() {
  return make('hammered', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    const r = rng(71);
    for (let i = 0; i < 260; i++) {
      const x = r() * w;
      const y = r() * h;
      const rad = 4 + r() * 10;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(255,255,255,0.0)');
      g.addColorStop(0.7, 'rgba(0,0,0,0.05)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }, [2, 2]);
}

/** Bronze network grate (Ex 27:4): diagonal lattice on transparent ground. */
export function netTexture() {
  return make('net', 256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#c07a3c';
    ctx.lineWidth = 7;
    for (let i = -8; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 32, 0);
      ctx.lineTo(i * 32 + h, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i * 32 + h, 0);
      ctx.lineTo(i * 32, h);
      ctx.stroke();
    }
  }, [4, 1]);
}
