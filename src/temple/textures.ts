import * as THREE from 'three';
import { drawCherub } from '../scene/cherubArt';
import { addNoise, bumpOf, FACET_MASK, FACET_SHIFT, fbm, grain, hammerFacets, make, makeBumped, noise, pits, putRGB, rng, smooth } from '../scene/textures';

// Gold relief palette: carved cedar and cypress overlaid with gold (1 Kgs 6:18, 29, 32, 35).
const G_BASE = '#d6a43a';
const G_HI = '#f6d67a';
const G_MID = '#e7bb52';
const G_DEEP = '#a8741e';
const G_LINE = '#5a3608';

/** Scale of the canvas being drawn on, relative to the size the motifs were laid out at.
 *  Shadow offsets ignore the canvas transform, so relief() multiplies by it. */
let RS = 1;

/** Raised relief: everything drawn inside gets a soft shadow down and to the right. */
function relief(ctx: CanvasRenderingContext2D, f: () => void, k = 1) {
  ctx.save();
  ctx.shadowColor = 'rgba(70,38,0,0.65)';
  ctx.shadowOffsetX = 2.5 * k * RS;
  ctx.shadowOffsetY = 3.5 * k * RS;
  ctx.shadowBlur = 3 * k * RS;
  f();
  ctx.restore();
}

/** Draws a motif layout made for a lw × lh canvas onto the full-size one. */
function scaled(ctx: CanvasRenderingContext2D, W: number, lw: number, lh: number, f: (w: number, h: number) => void) {
  ctx.save();
  RS = W / lw;
  ctx.scale(RS, RS);
  f(lw, lh);
  ctx.restore();
  RS = 1;
}

/** Noise lattice counts for a w × h texture, so features are about `px` pixels across. */
const lat = (n: number) => Math.max(1, Math.round(n));

/**
 * Gold leaf, beaten and burnished, over whatever has been drawn: small hammer facets, fine burnish
 * streaks along x, broad warm tonal drift and a little grain. Brighter areas go paler, darker ones
 * deeper and more orange, as real gold does. Returns heights for a bump map, taken from the drawing
 * (outlines and relief shadows sink, raised highlights rise) plus the facets.
 */
function goldFinish(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, o: { relief?: number; streak?: number } = {}) {
  const rel = o.relief ?? 0.55;
  const sk = o.streak ?? 1;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const broad = fbm(w, h, lat(w / 340), lat(h / 340), 5, seed, 0.55, 2);
  const burn = fbm(w, h, lat(w / 512), lat(h / 6), 3, seed + 1, 0.6);
  addNoise(burn, w, h, lat(w / 160), lat(h / 2.5), 0.45, seed + 2);
  const F = hammerFacets();
  const gr = grain(w, h, seed + 4);
  const height = new Float32Array(w * h);
  for (let y = 0, i = 0, p = 0; y < h; y++) {
    const row = (y & FACET_MASK) << FACET_SHIFT;
    for (let x = 0; x < w; x++, i++, p += 4) {
      const lum = (0.3 * d[p] + 0.59 * d[p + 1] + 0.11 * d[p + 2]) / 255;
      const f = F[row | (x & FACET_MASK)];
      const e = 0.085 * broad[i] + 0.04 * sk * burn[i] + 0.05 * f + 0.018 * gr[i];
      // ≈ m, m^1.18 and m^1.6 for m = 1 + e
      d[p] = d[p] * (1 + e);
      d[p + 1] = d[p + 1] * (1 + 1.18 * e);
      d[p + 2] = d[p + 2] * (1 + 1.6 * e);
      height[i] = 0.5 + rel * (lum - 0.62) + 0.06 * f + 0.015 * sk * burn[i];
    }
  }
  ctx.putImageData(img, 0, 0);
  return height;
}

/** Heights from the luminance of what's on the canvas (0..1), for drawn reliefs. */
function lumHeight(ctx: CanvasRenderingContext2D, w: number, h: number, k = 1, base = 0.5) {
  const d = ctx.getImageData(0, 0, w, h).data;
  const height = new Float32Array(w * h);
  for (let i = 0, p = 0; i < w * h; i++, p += 4) height[i] = base + k * ((0.3 * d[p] + 0.59 * d[p + 1] + 0.11 * d[p + 2]) / 255 - 0.5);
  return height;
}

/**
 * Cast and polished brass ("bright brass", 1 Kgs 7:45) as colour and height fields: fine burnish
 * streaks along x (round a turned pillar), tonal mottling at several scales, faint casting pores and
 * a darker patina gathering in places. No big round marks.
 */
function brassFields(w: number, h: number, seed: number) {
  const n = w * h;
  const broad = fbm(w, h, lat(w / 256), lat(h / 256), 5, seed, 0.55, 2);
  const mid = fbm(w, h, lat(w / 90), lat(h / 90), 3, seed + 1, 0.5, 2);
  const streak = fbm(w, h, lat(w / 340), lat(h / 6.5), 3, seed + 2, 0.6);
  addNoise(streak, w, h, lat(w / 128), lat(h / 1.6), 0.4, seed + 3);
  const gr = grain(w, h, seed + 4);
  const pit = pits(new Float32Array(n), w, h, Math.round(n / 1600), 0.7, 2.4, seed + 5);
  // a few larger, shallower shrinkage pores
  pits(pit, w, h, Math.round(n / 9000), 2, 4.5, seed + 6, 0.45);
  const R = new Float32Array(n);
  const G = new Float32Array(n);
  const B = new Float32Array(n);
  const H = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = Math.min(1, Math.max(0, 0.52 + 0.24 * broad[i] + 0.09 * streak[i] + 0.06 * mid[i] + 0.03 * gr[i]));
    // dark burnt bronze to pale polished brass
    let r = 150 + 96 * t;
    let g = 86 + 98 * t;
    let b = 36 + 66 * t;
    // patina: a dull dark brown, gathering softly where the mid and broad noise agree
    const pw = 0.38 * smooth(0.05, 1.05, 0.65 * mid[i] + 0.45 * broad[i]);
    r += (116 - r) * pw;
    g += (78 - g) * pw;
    b += (44 - b) * pw;
    const k = 1 - 0.42 * pit[i];
    R[i] = r * k;
    G[i] = g * k;
    B[i] = b * k;
    H[i] = 0.62 + 0.04 * broad[i] + 0.05 * streak[i] + 0.012 * gr[i] - 0.03 * pw - 0.45 * pit[i];
  }
  return { R, G, B, H };
}

/** The bright brass of Jachin and Boaz, the altar, the sea and the bases. */
export function brassTexture() {
  return makeBumped(
    't-brass',
    1024,
    1024,
    (ctx, w, h) => {
      const f = brassFields(w, h, 401);
      putRGB(ctx, w, h, f.R, f.G, f.B);
      return f.H;
    },
    [3, 3],
    1,
  );
}
export const brassBump = () => (brassTexture(), bumpOf('t-brass'));

/** An open flower: an eight-petalled rosette with a precious stone at its heart (2 Chr 3:6). */
function rosette(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, gem: string) {
  relief(ctx, () => {
    ctx.fillStyle = G_MID;
    ctx.strokeStyle = G_LINE;
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.45, r * 0.22, a, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  });
  ctx.fillStyle = G_HI;
  ctx.strokeStyle = G_LINE;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = gem;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(x - r * 0.06, y - r * 0.06, r * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

/** A band of knops (gourds) on a running tendril (1 Kgs 6:18). */
function gourdBand(ctx: CanvasRenderingContext2D, w: number, y: number, h: number, n: number) {
  ctx.strokeStyle = G_LINE;
  ctx.fillStyle = G_DEEP;
  ctx.fillRect(0, y, w, 3);
  ctx.fillRect(0, y + h - 3, w, 3);
  relief(ctx, () => {
    ctx.lineWidth = 3;
    ctx.strokeStyle = G_DEEP;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 4) ctx.lineTo(x, y + h / 2 + Math.sin((x / w) * n * Math.PI * 2) * h * 0.18);
    ctx.stroke();
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.25) / n) * w;
      ctx.fillStyle = G_MID;
      ctx.strokeStyle = G_LINE;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x, y + h / 2, h * 0.32, h * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - h * 0.15, y + h / 2 - h * 0.12);
      ctx.quadraticCurveTo(x, y + h / 2, x - h * 0.15, y + h / 2 + h * 0.12);
      ctx.stroke();
    }
  });
}

/** A date palm: scaled trunk and a crown of arching fronds with date clusters. */
function palm(ctx: CanvasRenderingContext2D, x: number, base: number, top: number, spread: number) {
  relief(ctx, () => {
    const tw = spread * 0.12;
    ctx.fillStyle = G_MID;
    ctx.strokeStyle = G_LINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - tw, base);
    ctx.quadraticCurveTo(x - tw * 0.5, (base + top) / 2, x - tw * 0.6, top);
    ctx.lineTo(x + tw * 0.6, top);
    ctx.quadraticCurveTo(x + tw * 0.5, (base + top) / 2, x + tw, base);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // diamond scales up the trunk
    ctx.lineWidth = 1.2;
    for (let y = base - 10; y > top + 6; y -= 14) {
      ctx.beginPath();
      ctx.moveTo(x - tw * 0.8, y);
      ctx.lineTo(x, y - 9);
      ctx.lineTo(x + tw * 0.8, y);
      ctx.stroke();
    }
    // fronds
    const fronds = 9;
    for (let i = 0; i < fronds; i++) {
      const t = i / (fronds - 1);
      const a = -Math.PI + t * Math.PI;
      const len = spread * (0.8 + 0.25 * Math.sin(t * Math.PI));
      const ex = x + Math.cos(a) * len;
      const ey = top + Math.sin(a) * len * 0.55 + len * 0.35 * Math.abs(Math.cos(a));
      const cx = x + Math.cos(a) * len * 0.5;
      const cy = top + Math.sin(a) * len * 0.7 - 10;
      ctx.fillStyle = i % 2 ? G_MID : G_HI;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.quadraticCurveTo(cx - 8, cy - 8, ex, ey);
      ctx.quadraticCurveTo(cx + 8, cy + 10, x, top + 4);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      for (let k = 1; k < 9; k++) {
        const u = k / 9;
        const px = x + (ex - x) * u;
        const py = top + (ey - top) * u - Math.sin(u * Math.PI) * 12;
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(a + 1.2) * 10, py + Math.sin(a + 1.2) * 10);
      }
      ctx.stroke();
    }
    // date clusters
    for (const s of [-1, 1]) {
      ctx.fillStyle = G_DEEP;
      for (let k = 0; k < 7; k++) {
        ctx.beginPath();
        ctx.arc(x + s * (tw + 6 + (k % 3) * 5), top + 10 + Math.floor(k / 3) * 7, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  });
}

/** A chain swag of round links (2 Chr 3:5). */
function chain(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, sag: number) {
  relief(ctx, () => {
    ctx.strokeStyle = G_LINE;
    ctx.lineWidth = 1.4;
    ctx.fillStyle = G_HI;
    const n = Math.round((x1 - x0) / 9);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = x0 + (x1 - x0) * t;
      const yy = y + Math.sin(t * Math.PI) * sag;
      ctx.beginPath();
      ctx.ellipse(x, yy, 5, 3.4, i % 2 ? 0.4 : -0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, 0.6);
}

const GEMS = ['#b3123a', '#1f5fb8', '#1e8a5a', '#7a2aa0', '#d06a10'];

/**
 * The walls of the house: cedar carved with cherubim, palm trees and open flowers, and bands of
 * gourds, all overlaid with gold and set with stones (1 Kgs 6:18, 29; 2 Chr 3:5-7).
 * One tile is 5 cubits wide by 10 high: a palm between cherubim, like Ezekiel's temple (Ezek 41:18).
 * Laid out at 512 × 1024 and drawn half as large again.
 */
export function carvedGoldTexture() {
  return makeBumped('t-carved', 768, 1536, (ctx, W, H) => {
    ctx.fillStyle = G_BASE;
    ctx.fillRect(0, 0, W, H);
    scaled(ctx, W, 512, 1024, (w, h) => {
      const c = h / 10; // layout units per cubit
      // recessed main panel
      ctx.fillStyle = 'rgba(120,70,0,0.18)';
      ctx.fillRect(0, c * 1.9, w, c * 6.3);
      ctx.fillStyle = G_DEEP;
      ctx.fillRect(0, c * 1.9, w, 4);
      ctx.fillRect(0, c * 8.2 - 4, w, 4);
      ctx.fillStyle = G_HI;
      ctx.fillRect(0, c * 1.9 + 4, w, 1.5);
      ctx.fillRect(0, c * 8.2, w, 1.5);
      // open flowers at top and bottom, gems at their hearts
      for (let i = 0; i < 5; i++) {
        rosette(ctx, (i + 0.5) * (w / 5), c * 0.5, c * 0.4, GEMS[i % GEMS.length]);
        rosette(ctx, (i + 0.5) * (w / 5), c * 9.5, c * 0.4, GEMS[(i + 2) % GEMS.length]);
      }
      gourdBand(ctx, w, c * 1.05, c * 0.6, 10);
      gourdBand(ctx, w, c * 8.35, c * 0.6, 10);
      // chains hung below the upper band
      chain(ctx, 0, w / 2, c * 1.95, c * 0.35);
      chain(ctx, w / 2, w, c * 1.95, c * 0.35);
      // palm tree between two cherubim (drawn at both edges so the tile repeats)
      palm(ctx, w / 2, c * 8.1, c * 3.2, c * 0.95);
      for (const x of [0, w]) {
        relief(ctx, () => drawCherub(ctx, x, c * 5.3, c * 2.5, G_HI, G_MID, G_LINE, G_DEEP, G_HI), 1.2);
      }
    });
    return goldFinish(ctx, W, H, 301);
  });
}
export const carvedGoldBump = () => (carvedGoldTexture(), bumpOf('t-carved'));

/** Plain gold over wood: the porch, door frames and the backs of things. Spans 9 cubits (3 tiles). */
export function plainGoldTexture() {
  return makeBumped('t-plaingold', 1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = G_BASE;
    ctx.fillRect(0, 0, w, h);
    return goldFinish(ctx, w, h, 311, { relief: 0.3 });
  }, [1 / 3, 1 / 3]);
}
export const plainGoldBump = () => (plainGoldTexture(), bumpOf('t-plaingold'));

/** The floor: planks of fir (cypress) overlaid with gold and fastened with gold nails
 *  (1 Kgs 6:15, 30; 2 Chr 3:9). The texture spans 8 cubits (2 tiles); planks half a cubit wide. */
export function goldFloorTexture() {
  return makeBumped('t-goldfloor', 1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#cf9c34';
    ctx.fillRect(0, 0, w, h);
    const r = rng(322);
    const C = w / 8;
    const ph = C / 2;
    for (let j = 0; j < 16; j++) {
      const y = j * ph;
      ctx.fillStyle = `rgba(${r() > 0.5 ? '255,230,160' : '110,60,0'},${0.04 + r() * 0.07})`;
      ctx.fillRect(0, y, w, ph);
      // the long seam between planks, with a lit arris below it
      ctx.fillStyle = 'rgba(80,45,0,0.6)';
      ctx.fillRect(0, y, w, 2);
      ctx.fillStyle = 'rgba(255,236,170,0.35)';
      ctx.fillRect(0, y + 2, w, 1.5);
      // butt joints, staggered, with a gold nail either side
      let x = r() * w;
      const end = x + w;
      while (x < end - C * 2) {
        for (const xx of [x % w, (x % w) - w]) {
          ctx.fillStyle = 'rgba(80,45,0,0.6)';
          ctx.fillRect(xx - 1, y, 2, ph);
          ctx.fillStyle = 'rgba(255,236,170,0.3)';
          ctx.fillRect(xx + 1, y, 1.5, ph);
          for (const nx of [xx - 9, xx + 10]) {
            for (const ny of [y + ph * 0.3, y + ph * 0.7]) {
              const g = ctx.createRadialGradient(nx - 1, ny - 1, 0, nx, ny, 3.6);
              g.addColorStop(0, '#fff3c4');
              g.addColorStop(0.6, '#e9bb55');
              g.addColorStop(1, 'rgba(90,50,0,0.8)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(nx, ny, 3.6, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        x += C * (3 + Math.floor(r() * 4));
      }
    }
    return goldFinish(ctx, w, h, 321, { streak: 1.6 });
  }, [0.5, 0.5]);
}
export const goldFloorBump = () => (goldFloorTexture(), bumpOf('t-goldfloor'));

/** The ceiling: fir boards and beams overlaid with gold (2 Chr 3:5, 7). One tile = 5 cubits. */
export function ceilingTexture() {
  return makeBumped('t-ceiling', 512, 512, (ctx, W, H) => {
    ctx.fillStyle = '#c99633';
    ctx.fillRect(0, 0, W, H);
    scaled(ctx, W, 256, 256, (w) => {
      // beams across, coffers between
      ctx.fillStyle = '#9a6a18';
      ctx.fillRect(0, 0, w, 26);
      ctx.fillStyle = G_HI;
      ctx.fillRect(0, 26, w, 3);
      ctx.fillStyle = 'rgba(90,50,0,0.4)';
      ctx.fillRect(0, 0, w, 3);
      for (let i = 0; i < 2; i++) {
        const x0 = 14 + i * 120;
        ctx.strokeStyle = G_DEEP;
        ctx.lineWidth = 4;
        ctx.strokeRect(x0, 46, 108, 196);
        ctx.strokeStyle = 'rgba(255,236,170,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x0 + 2.5, 48.5, 103, 191);
        rosette(ctx, x0 + 54, 144, 30, GEMS[i * 2]);
      }
    });
    return goldFinish(ctx, W, H, 331);
  });
}
export const ceilingBump = () => (ceilingTexture(), bumpOf('t-ceiling'));

/**
 * Lays out courses of blocks on a w × h tile that wraps both ways: `rows` courses, each block a
 * random choice of `lens` pixels long, each course starting at a random offset. Per pixel: the
 * block's index, the distance in pixels to its nearest edge, and whether that edge is a vertical joint.
 */
function masonry(w: number, h: number, rows: number, lens: number[], seed: number) {
  const r = rng(seed);
  const id = new Int32Array(w * h);
  const dist = new Float32Array(w * h);
  const vert = new Uint8Array(w * h);
  const ch = h / rows;
  const minL = Math.min(...lens);
  const bu = new Int32Array(w);
  const b0 = new Int32Array(w);
  const b1 = new Int32Array(w);
  let n = 0;
  for (let row = 0; row < rows; row++) {
    const s = Math.floor(r() * w);
    for (let u = 0; u < w; n++) {
      let L = lens[Math.floor(r() * lens.length)];
      if (u + L > w || w - (u + L) < minL * 0.75) L = w - u;
      for (let k = u; k < u + L; k++) {
        bu[k] = n;
        b0[k] = u;
        b1[k] = u + L;
      }
      u += L;
    }
    const y0 = Math.round(row * ch);
    const y1 = Math.round((row + 1) * ch);
    for (let y = y0; y < y1; y++) {
      const dy = Math.min(y - y0 + 0.5, y1 - y - 0.5);
      for (let x = 0; x < w; x++) {
        const u = (x - s + w) % w;
        const dx = Math.min(u - b0[u] + 0.5, b1[u] - u - 0.5);
        const o = y * w + x;
        id[o] = bu[u];
        if (dx < dy) {
          dist[o] = dx;
          vert[o] = 1;
        } else dist[o] = dy;
      }
    }
  }
  return { id, dist, vert, n };
}

/**
 * Hewn limestone ashlar ("costly stones, hewed", 1 Kgs 5:17; 7:9). The wall tile is 8 × 3 cubits;
 * this texture spans two tiles across (16 cubits, two courses) so the blocks repeat less often.
 * Each block has a drafted margin tooled across its edge round a slightly proud, diagonally
 * chiselled face, its own tone of warm limestone, and arrises worn and chipped.
 */
export function ashlarTexture() {
  return makeBumped('t-ashlar', 2048, 512, (ctx, w, h) => {
    const C = w / 16; // pixels per cubit
    const m = masonry(w, h, 2, [2, 2.5, 3, 3.5, 4, 5].map((l) => Math.round(l * C)), 341);
    const r = rng(342);
    const tone = new Float32Array(m.n);
    const warm = new Float32Array(m.n);
    const phase = new Float32Array(m.n);
    const dir = new Float32Array(m.n);
    for (let b = 0; b < m.n; b++) {
      tone[b] = 0.9 + r() * 0.12;
      warm[b] = r() - 0.5;
      phase[b] = r() * 40;
      dir[b] = r() < 0.5 ? 0.7 : -0.7;
    }
    const broad = fbm(w, h, 16, 4, 5, 343, 0.55, 2);
    const mid = fbm(w, h, 64, 16, 3, 344, 0.5, 2);
    const fine = grain(w, h, 345);
    const tool = addNoise(new Float32Array(w * h), w, h, 40, 10, 1, 346);
    const wear = fbm(w, h, 128, 32, 3, 347, 0.6, 2);
    const pk = pits(new Float32Array(w * h), w, h, Math.round((w * h) / 1100), 0.7, 2.2, 348);
    const M = 0.17 * C; // the drafted margin
    const R = new Float32Array(w * h);
    const G = new Float32Array(w * h);
    const B = new Float32Array(w * h);
    const height = new Float32Array(w * h);
    const TAU = Math.PI * 2;
    for (let y = 0, o = 0; y < h; y++) {
      for (let x = 0; x < w; x++, o++) {
        const b = m.id[o];
        const d = m.dist[o];
        const wearW = 1.5 + 7 * Math.max(0, wear[o] + 0.1);
        const edge = smooth(1, 1 + wearW, d);
        const face = smooth(M - 2, M + 3, d);
        // margins are combed across the edge; the face is struck in diagonal batches
        const stripe =
          face < 0.5
            ? Math.sin((m.vert[o] ? y : x) * (TAU / 5) + 2 * tool[o]) * 0.6
            : Math.sin((x * dir[b] + y + phase[b]) * (TAU / 8) + 2.5 * tool[o]) * (0.25 + 0.75 * smooth(-0.3, 0.5, tool[o]));
        // chipped arrises show fresher, paler stone with a thin shadowed lip at the joint
        const k =
          tone[b] * (1 + 0.04 * broad[o] + 0.02 * mid[o] + 0.025 * fine[o] + 0.022 * stripe + 0.03 * (1 - face) + 0.04 * (1 - edge)) * (0.9 + 0.1 * smooth(0, 2.5, d)) - 0.28 * pk[o];
        const ochre = 0.35 * smooth(0.35, 0.9, broad[o] + 0.4 * mid[o]);
        let rr = (228 + warm[b] * 10) * k;
        let gg = 212 * k;
        let bb = (178 - warm[b] * 14) * k;
        rr += (212 - rr) * ochre * 0.4;
        gg += (172 - gg) * ochre * 0.4;
        bb += (118 - bb) * ochre * 0.4;
        const joint = 1 - smooth(0.6, 2.2, d);
        R[o] = rr + (140 - rr) * joint;
        G[o] = gg + (122 - gg) * joint;
        B[o] = bb + (96 - bb) * joint;
        height[o] = 0.2 + 0.5 * edge + 0.07 * face + 0.03 * stripe + 0.025 * mid[o] - 0.3 * pk[o];
      }
    }
    putRGB(ctx, w, h, R, G, B);
    return height;
  }, [0.5, 1]);
}
export const ashlarBump = () => (ashlarTexture(), bumpOf('t-ashlar'));

let paveCache: { k: Float32Array; hue: Float32Array; height: Float32Array } | null = null;

/** Brightness, hue shift and height of the courtyard paving, shared by every pavement colour. */
function paveFields(w: number, h: number) {
  if (paveCache) return paveCache;
  const C = w / 12; // pixels per cubit: the texture spans 12 cubits (2 tiles)
  const m = masonry(w, h, 8, [1.5, 2, 2.5, 3].map((l) => Math.round(l * C)), 351);
  const r = rng(352);
  const tone = new Float32Array(m.n);
  const hueB = new Float32Array(m.n);
  const dish = new Float32Array(m.n);
  for (let b = 0; b < m.n; b++) {
    tone[b] = 0.88 + r() * 0.16;
    hueB[b] = (r() - 0.5) * 2;
    dish[b] = r();
  }
  const broad = fbm(w, h, 6, 6, 5, 353, 0.55, 2);
  const mid = fbm(w, h, 32, 32, 3, 354, 0.5, 2);
  const fine = grain(w, h, 355);
  const wear = fbm(w, h, 64, 64, 3, 356, 0.6, 2);
  const pk = pits(new Float32Array(w * h), w, h, Math.round((w * h) / 1600), 0.8, 2.6, 357);
  const k = new Float32Array(w * h);
  const hue = new Float32Array(w * h);
  const height = new Float32Array(w * h);
  for (let o = 0; o < w * h; o++) {
    const b = m.id[o];
    const d = m.dist[o];
    const wearW = 2 + 8 * Math.max(0, wear[o] + 0.2);
    const edge = smooth(0.8, 0.8 + wearW, d);
    // footworn: broad paler, smoother patches
    const worn = smooth(0.1, 0.7, broad[o]);
    const joint = 1 - smooth(0.6, 2.4, d);
    k[o] = (tone[b] * (1 + 0.025 * mid[o] * (1 - 0.6 * worn) + 0.03 * fine[o] * (1 - 0.5 * worn) + 0.05 * worn) * (0.94 + 0.06 * edge) - 0.22 * pk[o]) * (1 - 0.45 * joint);
    hue[o] = hueB[b] + 0.3 * mid[o];
    height[o] = 0.2 + 0.5 * edge + 0.03 * mid[o] * (1 - worn) - 0.03 * dish[b] * smooth(0, 40, d) - 0.3 * pk[o];
  }
  return (paveCache = { k, hue, height });
}

/** Courtyard pavement (2 Chr 7:3): stones of varied size and shade in courses, joints, wear.
 *  The texture spans 12 cubits (two 6-cubit tiles). Each colour gets the same stones, shifted. */
export function pavementTexture(key = 't-pave', base = '#d9c7a0') {
  return makeBumped(key, 1024, 1024, (ctx, w, h) => {
    const f = paveFields(w, h);
    const hex = parseInt(base.slice(1), 16);
    const [br, bg, bb] = [hex >> 16, (hex >> 8) & 255, hex & 255];
    let s = 0;
    for (const ch of key) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
    const ox = s % w;
    const oy = Math.floor(s / w) % h;
    const R = new Float32Array(w * h);
    const G = new Float32Array(w * h);
    const B = new Float32Array(w * h);
    const height = new Float32Array(w * h);
    for (let y = 0, o = 0; y < h; y++) {
      const row = ((y + oy) % h) * w;
      for (let x = 0; x < w; x++, o++) {
        const i = row + ((x + ox) % w);
        const k = f.k[i];
        const hu = f.hue[i];
        // some stones greyer, some warmer or pinker
        R[o] = br * k * (1 + 0.045 * hu);
        G[o] = bg * k * (1 + 0.01 * hu);
        B[o] = bb * k * (1 - 0.06 * hu);
        height[o] = f.height[i];
      }
    }
    putRGB(ctx, w, h, R, G, B);
    return height;
  }, [0.5, 0.5]);
}
export const pavementBump = (key = 't-pave', base?: string) => (pavementTexture(key, base), bumpOf(key));

/** Terra rossa and limestone hillside with scrub, for the ground beyond the courts. */
export function hillGroundTexture() {
  return make('t-hill', 512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#c9a982';
    ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 50, '170,110,80', 0.15, 361, 70);
    noise(ctx, w, h, 50, '235,220,190', 0.14, 362, 60);
    noise(ctx, w, h, 400, '120,128,72', 0.35, 363, 6);
    noise(ctx, w, h, 5000, '120,90,60', 0.15, 364, 2);
    noise(ctx, w, h, 3000, '250,240,215', 0.16, 365, 2);
  }, [90, 90]);
}

/**
 * Cedar of Lebanon: the beam course on the court walls (1 Kgs 6:36) and the chambers' doors.
 * Flat-sawn grain running along v: growth rings drawn as contours that nest into arches
 * (the "cathedral" figure), soft earlywood, sharp dark latewood, fine pores and tonal drift.
 * One tile = 2 × 6 cubits.
 */
export function cedarTexture() {
  return makeBumped('t-cedar', 256, 1024, (ctx, w, h) => {
    const warp = fbm(w, h, 2, 4, 4, 371, 0.5);
    const wig = fbm(w, h, 8, 24, 3, 375, 0.5);
    const pores = fbm(w, h, 96, 6, 2, 372, 0.5);
    const broad = fbm(w, h, 2, 6, 3, 373, 0.5);
    const fine = grain(w, h, 374);
    const R = new Float32Array(w * h);
    const G = new Float32Array(w * h);
    const B = new Float32Array(w * h);
    const height = new Float32Array(w * h);
    const TAU = Math.PI * 2;
    for (let y = 0, o = 0; y < h; y++) {
      for (let x = 0; x < w; x++, o++) {
        const u = x / w;
        const v = y / h;
        // distance from the heart, folded so the tile wraps, bent into arches along the board
        const across = Math.abs(u - 0.5) * 2;
        const g = 10 * across + 0.8 * Math.sin(TAU * v + 0.6 * Math.sin(TAU * u)) + 0.35 * Math.sin(TAU * 2 * v + 1.3) + 1.6 * warp[o] + 0.35 * wig[o];
        const ring = g - Math.floor(g);
        const late = smooth(0.58, 0.8, ring) * (1 - smooth(0.9, 0.97, ring));
        const t = Math.min(1, Math.max(0, 0.62 + 0.12 * broad[o] + 0.05 * pores[o] + 0.04 * fine[o] - 0.55 * late));
        // latewood brown to pale reddish earlywood
        R[o] = 104 + 92 * t;
        G[o] = 50 + 66 * t;
        B[o] = 30 + 44 * t;
        height[o] = 0.5 + 0.12 * late + 0.04 * pores[o] + 0.01 * fine[o];
      }
    }
    putRGB(ctx, w, h, R, G, B);
    return height;
  });
}
export const cedarBump = () => (cedarTexture(), bumpOf('t-cedar'));

/** Cast bronze panel for the bases: cherubim, lions, oxen and palm trees (1 Kgs 7:29, 36). One tile = 4 × 2 cubits. */
export function basePanelTexture() {
  return make('t-basepanel', 512, 256, (ctx, w, h) => {
    const B = '#b9773a';
    const HI = '#e6a865';
    const LO = '#6d3e14';
    const f = brassFields(w, h, 381);
    putRGB(ctx, w, h, f.R, f.G, f.B);
    // ledges framing the borders (1 Kgs 7:28)
    ctx.fillStyle = LO;
    ctx.fillRect(0, 0, w, 16);
    ctx.fillRect(0, h - 16, w, 16);
    ctx.fillRect(0, 0, 14, h);
    ctx.fillRect(w - 14, 0, 14, h);
    ctx.fillStyle = HI;
    ctx.fillRect(0, 16, w, 2);
    // wreaths ("additions") along the bottom ledge
    ctx.strokeStyle = HI;
    ctx.lineWidth = 2;
    for (let x = 18; x < w - 18; x += 22) {
      ctx.beginPath();
      ctx.arc(x + 11, h - 16, 10, 0, Math.PI);
      ctx.stroke();
    }
    const fig = (f: () => void) =>
      relief(ctx, () => {
        ctx.fillStyle = HI;
        ctx.strokeStyle = LO;
        ctx.lineWidth = 2;
        f();
      });
    const y0 = h * 0.82;
    // lion (left), walking right
    fig(() => {
      const x = 60;
      ctx.beginPath();
      ctx.ellipse(x + 40, y0 - 50, 44, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 88, y0 - 70, 24, 0, Math.PI * 2); // mane
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 96, y0 - 68, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      for (const lx of [x + 8, x + 26, x + 58, x + 74]) {
        ctx.fillRect(lx, y0 - 38, 9, 38);
        ctx.strokeRect(lx, y0 - 38, 9, 38);
      }
      ctx.beginPath();
      ctx.moveTo(x - 2, y0 - 56);
      ctx.quadraticCurveTo(x - 26, y0 - 86, x - 14, y0 - 98);
      ctx.stroke();
    });
    // palm tree
    palmBronze(ctx, 220, y0, HI, LO);
    // cherub in the middle-right
    relief(ctx, () => drawCherub(ctx, 318, y0 - 86, 92, HI, B, LO, LO, HI));
    // ox (right), walking left
    fig(() => {
      const x = 420;
      ctx.beginPath();
      ctx.ellipse(x, y0 - 52, 46, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x - 50, y0 - 62, 16, 13, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 56, y0 - 74);
      ctx.quadraticCurveTo(x - 70, y0 - 92, x - 58, y0 - 96);
      ctx.moveTo(x - 44, y0 - 74);
      ctx.quadraticCurveTo(x - 36, y0 - 94, x - 48, y0 - 98);
      ctx.stroke();
      for (const lx of [x - 34, x - 18, x + 14, x + 30]) {
        ctx.fillRect(lx, y0 - 36, 10, 36);
        ctx.strokeRect(lx, y0 - 36, 10, 36);
      }
    });
  }, undefined);
}

function palmBronze(ctx: CanvasRenderingContext2D, x: number, base: number, hi: string, lo: string) {
  relief(ctx, () => {
    ctx.fillStyle = hi;
    ctx.strokeStyle = lo;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 7, base);
    ctx.lineTo(x - 4, base - 130);
    ctx.lineTo(x + 4, base - 130);
    ctx.lineTo(x + 7, base);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI + (i / 6) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(x, base - 130);
      ctx.quadraticCurveTo(x + Math.cos(a) * 30, base - 150 + Math.sin(a) * 20, x + Math.cos(a) * 46, base - 120 + Math.abs(Math.cos(a)) * 14);
      ctx.quadraticCurveTo(x + Math.cos(a) * 26, base - 136, x, base - 126);
      ctx.fill();
      ctx.stroke();
    }
  });
}

/** Checker-work network for the chapiters (1 Kgs 7:17): a bronze lattice on a transparent ground. */
export function checkerNetTexture() {
  return make('t-checker', 256, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#d08a46';
    ctx.lineWidth = 5;
    const s = 16;
    for (let x = -h; x < w + h; x += s) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h, h);
      ctx.moveTo(x + h, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.fillStyle = '#7a4418';
    for (let x = 0; x < w; x += s) for (let y = 0; y < h; y += s) ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
  }, [8, 1]);
}

/** Inner court gate leaves: wood overlaid with brass plates and studs (2 Chr 4:9). Laid out at 256². */
export function bronzeDoorTexture() {
  return makeBumped('t-bronzedoor', 512, 512, (ctx, W, H) => {
    const f = brassFields(W, H, 391);
    for (let i = 0; i < f.R.length; i++) {
      // a little darker and redder than the polished vessels
      f.R[i] *= 0.88;
      f.G[i] *= 0.8;
      f.B[i] *= 0.74;
    }
    putRGB(ctx, W, H, f.R, f.G, f.B);
    scaled(ctx, W, 256, 256, (w, h) => {
      ctx.strokeStyle = '#5a3210';
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.beginPath();
      ctx.moveTo(10, h / 2);
      ctx.lineTo(w - 10, h / 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(240,190,120,0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(13.5, 13.5, w - 27, h - 27);
      for (let x = 24; x < w; x += 26) {
        for (const y of [24, h / 2 - 14, h / 2 + 14, h - 24]) {
          const g = ctx.createRadialGradient(x - 1.3, y - 1.3, 0, x, y, 4.5);
          g.addColorStop(0, '#ffe2a8');
          g.addColorStop(0.55, '#d0924f');
          g.addColorStop(1, '#4a2a0c');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
    const height = lumHeight(ctx, W, H, 0.8);
    for (let i = 0; i < height.length; i++) height[i] = 0.5 * height[i] + 0.5 * f.H[i];
    return height;
  });
}
export const bronzeDoorBump = () => (bronzeDoorTexture(), bumpOf('t-bronzedoor'));

export function tex(t: THREE.Texture, wrap = true) {
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Rough-dressed limestone of the great retaining walls under the courts. One tile = 12 × 6 cubits. */
export function terraceWallTexture() {
  return make('t-terraceWall', 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#cdbb95';
    ctx.fillRect(0, 0, w, h);
    const r = rng(371);
    const rows = 4;
    const ch = h / rows;
    for (let row = 0; row < rows; row++) {
      let x = row % 2 ? -w / 7 : 0;
      while (x < w) {
        const bw = (w / 6) * (0.8 + r() * 0.9);
        const tone = 190 + r() * 35;
        ctx.fillStyle = `rgb(${tone + 20},${tone + 6},${tone - 24})`;
        ctx.fillRect(x + 2, row * ch + 2, bw - 3, ch - 3);
        // drafted margin, rough boss
        ctx.strokeStyle = 'rgba(250,240,215,0.45)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 5, row * ch + 5, bw - 9, ch - 9);
        x += bw;
      }
    }
    noise(ctx, w, h, 1600, '110,90,60', 0.16, 372, 2);
    noise(ctx, w, h, 700, '255,248,230', 0.14, 373, 2);
  }, undefined);
}
