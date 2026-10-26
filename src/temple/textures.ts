import * as THREE from 'three';
import { drawCherub } from '../scene/cherubArt';
import { make, noise, rng } from '../scene/textures';

// Gold relief palette: carved cedar and cypress overlaid with gold (1 Kgs 6:18, 29, 32, 35).
const G_BASE = '#d6a43a';
const G_HI = '#f6d67a';
const G_MID = '#e7bb52';
const G_DEEP = '#a8741e';
const G_LINE = '#5a3608';

/** Raised relief: everything drawn inside gets a soft shadow down and to the right. */
function relief(ctx: CanvasRenderingContext2D, f: () => void, k = 1) {
  ctx.save();
  ctx.shadowColor = 'rgba(70,38,0,0.65)';
  ctx.shadowOffsetX = 2.5 * k;
  ctx.shadowOffsetY = 3.5 * k;
  ctx.shadowBlur = 3 * k;
  f();
  ctx.restore();
}

function hammer(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const r = rng(seed);
  for (let i = 0; i < (w * h) / 700; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = 3 + r() * 8;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(255,240,190,${0.05 + r() * 0.06})`);
    g.addColorStop(1, 'rgba(120,70,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}

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
 */
export function carvedGoldTexture() {
  return make('t-carved', 512, 1024, (ctx, w, h) => {
    ctx.fillStyle = G_BASE;
    ctx.fillRect(0, 0, w, h);
    hammer(ctx, w, h, 301);
    const c = h / 10; // pixels per cubit
    // recessed main panel
    ctx.fillStyle = 'rgba(120,70,0,0.18)';
    ctx.fillRect(0, c * 1.9, w, c * 6.3);
    ctx.fillStyle = G_DEEP;
    ctx.fillRect(0, c * 1.9, w, 4);
    ctx.fillRect(0, c * 8.2 - 4, w, 4);
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
  }, undefined);
}

/** Plain gold leaf over wood: the porch, door frames and the backs of things. */
export function plainGoldTexture() {
  return make('t-plaingold', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = G_BASE;
    ctx.fillRect(0, 0, w, h);
    hammer(ctx, w, h, 311);
    noise(ctx, w, h, 400, '120,70,0', 0.08, 312, 2);
  });
}

/** The floor: planks of fir (cypress) overlaid with gold (1 Kgs 6:15, 30). One tile = 4 cubits. */
export function goldFloorTexture() {
  return make('t-goldfloor', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#cf9c34';
    ctx.fillRect(0, 0, w, h);
    hammer(ctx, w, h, 321);
    const r = rng(322);
    const ph = h / 8; // planks half a cubit wide
    for (let j = 0; j < 8; j++) {
      ctx.fillStyle = `rgba(${r() > 0.5 ? '255,230,160' : '110,60,0'},${0.05 + r() * 0.06})`;
      ctx.fillRect(0, j * ph, w, ph);
      ctx.fillStyle = 'rgba(80,45,0,0.55)';
      ctx.fillRect(0, j * ph, w, 1.5);
      const joint = r() * w;
      ctx.fillRect(joint, j * ph, 1.5, ph);
      // gold nail heads (2 Chr 3:9)
      ctx.fillStyle = 'rgba(255,240,180,0.8)';
      for (const x of [joint - 5, joint + 6]) {
        ctx.beginPath();
        ctx.arc(x, j * ph + ph / 2, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

/** The ceiling: fir boards and beams overlaid with gold (2 Chr 3:5, 7). One tile = 5 cubits. */
export function ceilingTexture() {
  return make('t-ceiling', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#c99633';
    ctx.fillRect(0, 0, w, h);
    hammer(ctx, w, h, 331);
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
      rosette(ctx, x0 + 54, 144, 30, GEMS[i * 2]);
    }
  });
}

/** Hewn limestone ashlar ("costly stones, hewed", 1 Kgs 5:17; 7:9). One tile = 8 × 3 cubits (two courses). */
export function ashlarTexture() {
  return make('t-ashlar', 512, 192, (ctx, w, h) => {
    ctx.fillStyle = '#e2d2ae';
    ctx.fillRect(0, 0, w, h);
    const r = rng(341);
    const course = h / 2;
    for (let row = 0; row < 2; row++) {
      let x = row ? -w / 6 : 0;
      while (x < w) {
        const bw = (w / 8) * (2 + Math.floor(r() * 3)) * 0.75;
        const tone = 200 + r() * 30;
        ctx.fillStyle = `rgb(${tone + 22},${tone + 8},${tone - 22})`;
        ctx.fillRect(x + 2, row * course + 2, bw - 4, course - 4);
        // drafted margin round each face
        ctx.strokeStyle = 'rgba(255,248,228,0.55)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 7, row * course + 7, bw - 14, course - 14);
        ctx.strokeStyle = 'rgba(120,96,60,0.35)';
        ctx.strokeRect(x + 10, row * course + 10, bw - 20, course - 20);
        x += bw;
      }
    }
    noise(ctx, w, h, 2400, '120,95,60', 0.12, 342, 2);
    noise(ctx, w, h, 1200, '255,250,235', 0.12, 343, 2);
    // mortar joints
    ctx.fillStyle = 'rgba(110,88,58,0.6)';
    ctx.fillRect(0, 0, w, 2);
    ctx.fillRect(0, course - 1, w, 2);
  }, undefined);
}

/** Courtyard pavement (2 Chr 7:3). One tile = 6 cubits. */
export function pavementTexture(key = 't-pave', base = '#d9c7a0') {
  return make(key, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const r = rng(key.length * 31 + 7);
    const n = 4;
    const s = w / n;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const off = j % 2 ? s / 2 : 0;
        const t = (r() - 0.5) * 22;
        ctx.fillStyle = `rgba(${t > 0 ? '255,248,230' : '110,85,50'},${Math.abs(t) / 90})`;
        ctx.fillRect(i * s + off, j * s, s, s);
        ctx.fillRect(i * s + off - w, j * s, s, s);
      }
    }
    ctx.fillStyle = 'rgba(100,78,48,0.45)';
    for (let j = 0; j < n; j++) {
      ctx.fillRect(0, j * s, w, 2);
      for (let i = 0; i <= n; i++) ctx.fillRect(i * s + (j % 2 ? s / 2 : 0), j * s, 2, s);
    }
    noise(ctx, w, h, 1500, '100,80,50', 0.12, 351, 2);
    noise(ctx, w, h, 800, '255,250,235', 0.14, 352, 2);
  }, undefined);
}

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

/** Cedar of Lebanon: the beam course on the court walls (1 Kgs 6:36) and the chambers' doors. */
export function cedarTexture() {
  return make('t-cedar', 128, 512, (ctx, w, h) => {
    ctx.fillStyle = '#8a4a2a';
    ctx.fillRect(0, 0, w, h);
    const r = rng(371);
    for (let i = 0; i < 46; i++) {
      ctx.strokeStyle = `rgba(${r() > 0.5 ? '50,22,10' : '190,120,80'},${0.15 + r() * 0.2})`;
      ctx.lineWidth = 1 + r() * 3;
      const x = r() * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y <= h; y += 24) ctx.lineTo(x + Math.sin(y * 0.03 + i) * 4, y);
      ctx.stroke();
    }
  }, undefined);
}

/** Cast bronze panel for the bases: cherubim, lions, oxen and palm trees (1 Kgs 7:29, 36). One tile = 4 × 2 cubits. */
export function basePanelTexture() {
  return make('t-basepanel', 512, 256, (ctx, w, h) => {
    const B = '#b9773a';
    const HI = '#e6a865';
    const LO = '#6d3e14';
    ctx.fillStyle = B;
    ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 900, '60,30,0', 0.12, 381, 2);
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

/** Inner court gate leaves: wood overlaid with bronze plates and studs (2 Chr 4:9). */
export function bronzeDoorTexture() {
  return make('t-bronzedoor', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#a8662e';
    ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 800, '60,30,0', 0.14, 391, 2);
    ctx.strokeStyle = '#5a3210';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.beginPath();
    ctx.moveTo(10, h / 2);
    ctx.lineTo(w - 10, h / 2);
    ctx.stroke();
    ctx.fillStyle = '#e2a66a';
    for (let x = 24; x < w; x += 26) {
      for (const y of [24, h / 2 - 14, h / 2 + 14, h - 24]) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, undefined);
}

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
