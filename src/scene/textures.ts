import * as THREE from 'three';

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

/** A stylised cherub, seen from the front: robed figure with two great wings lifted
 *  up and outward. Scripture commands cherubim on the veil and inner curtains (Ex 26:1, 31)
 *  without describing their form; this is a restrained, symmetric rendering. */
export function drawCherub(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, body: string, wing: string, line: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s / 100, s / 100);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = line;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    // wing outline: from the shoulder up to a high tip, then scalloped primaries back down
    ctx.beginPath();
    ctx.moveTo(10, -26);
    ctx.bezierCurveTo(30, -70, 60, -96, 92, -104);
    ctx.bezierCurveTo(90, -80, 84, -60, 78, -46);
    const scallops = [
      [70, -34],
      [60, -22],
      [48, -12],
      [34, -4],
      [20, 0],
    ];
    let px = 78;
    let py = -46;
    for (const [x, y] of scallops) {
      ctx.quadraticCurveTo((px + x) / 2 - 6, (py + y) / 2 + 8, x, y);
      px = x;
      py = y;
    }
    ctx.lineTo(12, -10);
    ctx.closePath();
    ctx.fillStyle = wing;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.stroke();
    // covert feathers: two rows of short arcs
    ctx.lineWidth = 2;
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 4; i++) {
        const t = (i + 0.5) / 4;
        const x = 18 + t * (60 - row * 14);
        const y = -30 - t * (52 - row * 6) + row * 18;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }
    }
    // primaries: long strokes toward the tip
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(26 + i * 10, -12 - i * 6);
      ctx.lineTo(62 + i * 7, -44 - i * 14);
      ctx.stroke();
    }
    ctx.restore();
  }
  // robe
  ctx.fillStyle = body;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-14, -30);
  ctx.lineTo(14, -30);
  ctx.bezierCurveTo(20, 10, 28, 50, 34, 78);
  ctx.lineTo(-34, 78);
  ctx.bezierCurveTo(-28, 50, -20, 10, -14, -30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // girdle and hem
  ctx.lineWidth = 4;
  ctx.strokeStyle = wing;
  ctx.beginPath();
  ctx.moveTo(-18, 8);
  ctx.lineTo(18, 8);
  ctx.moveTo(-32, 70);
  ctx.lineTo(32, 70);
  ctx.stroke();
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.lineTo(0, 76);
  ctx.stroke();
  // head
  ctx.fillStyle = body;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -44, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function band(ctx: CanvasRenderingContext2D, y: number, h: number, w: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, y, w, h);
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

/** Embroidered needlework (ma'aseh roqem) in blue, purple and scarlet on linen.
 *  Used for the gate (Ex 27:16) and the door of the tent (Ex 26:36).
 *  Scripture specifies colours and technique only; no figures are commanded here. */
export function needleworkTexture(key: string, w: number, h: number, cols: number) {
  return make(key, w, h, (ctx) => {
    ctx.fillStyle = LINEN;
    ctx.fillRect(0, 0, w, h);
    weave(ctx, w, h, 4, 0.06, 11);
    const colors = [BLUE, PURPLE, SCARLET];
    // top and bottom borders
    const bh = h * 0.07;
    [[0, BLUE], [bh, PURPLE], [bh * 1.6, SCARLET]].forEach(([y, c]) => {
      band(ctx, y as number, bh * 0.6, w, c as string);
      band(ctx, h - (y as number) - bh * 0.6, bh * 0.6, w, c as string);
    });
    // vertical embroidered panels with lozenges and rosettes
    const cw = w / cols;
    for (let i = 0; i < cols; i++) {
      const x0 = i * cw;
      const c = colors[i % 3];
      ctx.strokeStyle = c;
      ctx.lineWidth = Math.max(2, cw * 0.035);
      const top = bh * 2.4;
      const bot = h - bh * 2.4;
      const rows = Math.max(1, Math.round((bot - top) / cw));
      const rh = (bot - top) / rows;
      for (let r = 0; r < rows; r++) {
        const cx = x0 + cw / 2;
        const cy = top + rh * (r + 0.5);
        // lozenge
        ctx.beginPath();
        ctx.moveTo(cx, cy - rh * 0.45);
        ctx.lineTo(cx + cw * 0.42, cy);
        ctx.lineTo(cx, cy + rh * 0.45);
        ctx.lineTo(cx - cw * 0.42, cy);
        ctx.closePath();
        ctx.stroke();
        // rosette of six petals
        const pr = Math.min(cw, rh) * 0.16;
        for (let p = 0; p < 6; p++) {
          const a = (p / 6) * Math.PI * 2;
          ctx.fillStyle = colors[(i + p) % 3];
          ctx.beginPath();
          ctx.ellipse(cx + Math.cos(a) * pr, cy + Math.sin(a) * pr, pr * 0.75, pr * 0.38, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = colors[(i + 1) % 3];
        ctx.beginPath();
        ctx.arc(cx, cy, pr * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      // column dividers: twisted cord stitch
      ctx.strokeStyle = colors[(i + 2) % 3];
      ctx.lineWidth = Math.max(1.5, cw * 0.02);
      ctx.setLineDash([cw * 0.05, cw * 0.04]);
      ctx.beginPath();
      ctx.moveTo(x0, top);
      ctx.lineTo(x0, bot);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    weave(ctx, w, h, 4, 0.035, 12);
  });
}

/** Skilful woven work (ma'aseh hoshev) with cherubim: the veil (Ex 26:31). */
export function veilTexture() {
  return make('veil', 1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = BLUE;
    ctx.fillRect(0, 0, w, h);
    weave(ctx, w, h, 4, 0.08, 21);
    // borders
    const b = 40;
    band(ctx, 0, b, w, SCARLET);
    band(ctx, b, b * 0.5, w, PURPLE);
    band(ctx, b * 1.5, 6, w, LINEN);
    band(ctx, h - b, b, w, SCARLET);
    band(ctx, h - b * 1.5, b * 0.5, w, PURPLE);
    band(ctx, h - b * 1.5 - 6, 6, w, LINEN);
    // lattice of purple and scarlet
    ctx.lineWidth = 5;
    const cell = 170;
    for (let i = -6; i < 12; i++) {
      ctx.strokeStyle = i % 2 ? PURPLE : SCARLET;
      ctx.beginPath();
      ctx.moveTo(i * cell, b * 1.7);
      ctx.lineTo(i * cell + (h - b * 3.4), h - b * 1.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i * cell + (h - b * 3.4), b * 1.7);
      ctx.lineTo(i * cell, h - b * 1.7);
      ctx.stroke();
    }
    // cherubim in pairs facing one another, woven in linen, scarlet and purple
    const rows = 3;
    const per = 4;
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k < per; k++) {
        const cx = (k + 0.5) * (w / per);
        const cy = b * 2 + (r + 0.58) * ((h - b * 4) / rows);
        drawCherub(ctx, cx, cy, 108, LINEN, (r + k) % 2 ? SCARLET : PURPLE, '#1a1630');
      }
    }
    weave(ctx, w, h, 4, 0.04, 22);
  });
}

/** One of the ten inner curtains: 4 cubits wide (u) by 28 long (v), with cherubim (Ex 26:1-2). */
export function innerCurtainTexture() {
  return make('inner', 256, 1792, (ctx, w, h) => {
    ctx.fillStyle = BLUE;
    ctx.fillRect(0, 0, w, h);
    weave(ctx, w, h, 4, 0.08, 31);
    // linen selvedges with purple and scarlet stripes at each edge of the curtain
    for (const x of [0, w - 14]) {
      ctx.fillStyle = LINEN;
      ctx.fillRect(x, 0, 14, h);
    }
    ctx.fillStyle = SCARLET;
    ctx.fillRect(14, 0, 10, h);
    ctx.fillRect(w - 24, 0, 10, h);
    ctx.fillStyle = PURPLE;
    ctx.fillRect(24, 0, 6, h);
    ctx.fillRect(w - 30, 0, 6, h);
    // seven cherubim down the length; alternate facing
    const n = 7;
    for (let i = 0; i < n; i++) {
      const cy = (i + 0.56) * (h / n);
      drawCherub(ctx, w / 2, cy, 98, LINEN, i % 2 ? SCARLET : PURPLE, '#141228');
      // a small purple and scarlet medallion between figures
      ctx.fillStyle = SCARLET;
      ctx.beginPath();
      ctx.arc(w / 2, (i + 1) * (h / n) - 10, 10, 0, Math.PI * 2);
      ctx.fill();
    }
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
    noise(ctx, w, h, 5000, '120,90,50', 0.18, 61, 2);
    noise(ctx, w, h, 3000, '255,240,210', 0.2, 62, 2);
    noise(ctx, w, h, 60, '150,120,80', 0.25, 63, 14);
  }, [40, 40]);
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
