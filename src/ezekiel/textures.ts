import * as THREE from 'three';
import { drawCherub } from '../scene/cherubArt';
import { fbm, grain, make, makeBumped, putRGB, smooth } from '../scene/textures';

// Carved wood for Ezekiel's house: the walls "cieled with wood round about" (41:16), carved from the
// ground to above the door with cherubim and palm trees, a palm between cherub and cherub, and every
// cherub with two faces, a man's toward the palm on one side and a young lion's toward the palm on
// the other (41:17-20, 25). Scripture does not say they were overlaid with gold, so they are left as wood.

const W_HI = '#d3a061';
const W_MID = '#bb8649';
const W_DEEP = '#6e4520';
const W_LINE = '#3d220d';

let RS = 1;
function relief(ctx: CanvasRenderingContext2D, f: () => void, k = 1) {
  ctx.save();
  ctx.shadowColor = 'rgba(40,20,4,0.6)';
  ctx.shadowOffsetX = 2.5 * k * RS;
  ctx.shadowOffsetY = 3.5 * k * RS;
  ctx.shadowBlur = 3 * k * RS;
  f();
  ctx.restore();
}

/** A date palm, carved: a scaled trunk and a crown of fronds. */
function palm(ctx: CanvasRenderingContext2D, x: number, base: number, top: number, spread: number, cols = { body: W_MID, hi: W_HI, line: W_LINE, deep: W_DEEP }) {
  relief(ctx, () => {
    const tw = spread * 0.12;
    ctx.fillStyle = cols.body;
    ctx.strokeStyle = cols.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - tw, base);
    ctx.quadraticCurveTo(x - tw * 0.5, (base + top) / 2, x - tw * 0.6, top);
    ctx.lineTo(x + tw * 0.6, top);
    ctx.quadraticCurveTo(x + tw * 0.5, (base + top) / 2, x + tw, base);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 1.2;
    for (let y = base - 10; y > top + 6; y -= 14) {
      ctx.beginPath();
      ctx.moveTo(x - tw * 0.8, y);
      ctx.lineTo(x, y - 9);
      ctx.lineTo(x + tw * 0.8, y);
      ctx.stroke();
    }
    const fronds = 9;
    for (let i = 0; i < fronds; i++) {
      const t = i / (fronds - 1);
      const a = -Math.PI + t * Math.PI;
      const len = spread * (0.8 + 0.25 * Math.sin(t * Math.PI));
      const ex = x + Math.cos(a) * len;
      const ey = top + Math.sin(a) * len * 0.55 + len * 0.35 * Math.abs(Math.cos(a));
      const cx = x + Math.cos(a) * len * 0.5;
      const cy = top + Math.sin(a) * len * 0.7 - 10;
      ctx.fillStyle = i % 2 ? cols.body : cols.hi;
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
    for (const s of [-1, 1]) {
      ctx.fillStyle = cols.deep;
      for (let k = 0; k < 7; k++) {
        ctx.beginPath();
        ctx.arc(x + s * (tw + 6 + (k % 3) * 5), top + 10 + Math.floor(k / 3) * 7, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  });
}

/**
 * The two faces over the cherub's shoulders, drawn in the cherub's own frame (its head at 0, -48):
 * a man's face in profile looking to one side and a young lion's looking to the other (41:19).
 */
function twoFaces(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.translate(0, -50);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = W_LINE;
  ctx.lineWidth = 2.4;
  // the lion's mane behind, covering the woven head beneath
  ctx.fillStyle = W_DEEP;
  ctx.beginPath();
  for (let i = 0; i <= 18; i++) {
    const a = -Math.PI * 0.55 + (i / 18) * Math.PI * 1.25;
    const r = i % 2 ? 19 : 24;
    const px = 4 + Math.cos(a) * r;
    const py = 2 + Math.sin(a) * r * 0.92;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.lineTo(-6, 20);
  ctx.lineTo(-16, 10);
  ctx.lineTo(-17, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // the man's face, looking left: brow, nose, lips and beard
  ctx.fillStyle = W_HI;
  ctx.beginPath();
  ctx.moveTo(2, -16);
  ctx.bezierCurveTo(-8, -18, -14, -10, -14, -4);
  ctx.lineTo(-19, 3); // the nose
  ctx.lineTo(-14, 5);
  ctx.lineTo(-15, 8);
  ctx.lineTo(-13, 10);
  ctx.bezierCurveTo(-14, 16, -10, 22, -2, 22); // beard
  ctx.lineTo(2, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-10, -3);
  ctx.lineTo(-6, -4); // eye
  ctx.moveTo(-11, 12);
  ctx.lineTo(-4, 20);
  ctx.moveTo(-7, 11);
  ctx.lineTo(-1, 18);
  ctx.stroke();
  // the young lion's face, looking right: muzzle, eye and ear
  ctx.lineWidth = 2.4;
  ctx.fillStyle = W_MID;
  ctx.beginPath();
  ctx.moveTo(2, -12);
  ctx.bezierCurveTo(10, -14, 16, -8, 18, -2);
  ctx.lineTo(24, 2);
  ctx.bezierCurveTo(25, 6, 23, 9, 19, 10); // the muzzle
  ctx.bezierCurveTo(16, 14, 10, 15, 6, 12);
  ctx.lineTo(2, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(12, -4);
  ctx.lineTo(16, -3); // eye
  ctx.moveTo(19, 6);
  ctx.lineTo(23, 6); // mouth
  ctx.moveTo(18, 3);
  ctx.lineTo(26, 0); // whiskers
  ctx.moveTo(18, 5);
  ctx.lineTo(26, 5);
  ctx.stroke();
  ctx.fillStyle = W_DEEP;
  ctx.beginPath();
  ctx.ellipse(7, -12, 3, 4, -0.4, 0, Math.PI * 2); // ear
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function woodGrain(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const broad = fbm(w, h, 3, 6, 4, seed, 0.55);
  const streak = fbm(w, h, 24, 2, 3, seed + 1, 0.55);
  const fine = grain(w, h, seed + 2);
  const R = new Float32Array(w * h);
  const G = new Float32Array(w * h);
  const B = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const t = Math.min(1, Math.max(0, 0.55 + 0.18 * broad[i] + 0.14 * streak[i] + 0.04 * fine[i]));
    R[i] = 120 + 70 * t;
    G[i] = 78 + 52 * t;
    B[i] = 40 + 32 * t;
  }
  putRGB(ctx, w, h, R, G, B);
}

/** Wood carved with cherubim and palm trees. One tile is 5 cubits wide by 10 high: a palm between two cherubim. */
export function carvedWoodTexture() {
  return makeBumped('e-carved', 512, 1024, (ctx, w, h) => {
    woodGrain(ctx, w, h, 501);
    const c = h / 10;
    // framing rails top and bottom
    ctx.fillStyle = 'rgba(60,30,8,0.25)';
    ctx.fillRect(0, c * 1.2, w, 4);
    ctx.fillRect(0, c * 8.8 - 4, w, 4);
    ctx.fillStyle = 'rgba(255,220,170,0.25)';
    ctx.fillRect(0, c * 1.2 + 4, w, 1.5);
    ctx.fillRect(0, c * 8.8, w, 1.5);
    palm(ctx, w / 2, c * 8.7, c * 3.1, c * 0.95);
    for (const x of [0, w]) {
      relief(ctx, () => {
        drawCherub(ctx, x, c * 5.4, c * 2.5, W_HI, W_MID, W_LINE, W_DEEP, W_HI);
        ctx.save();
        ctx.translate(x, c * 5.4);
        ctx.scale((c * 2.5) / 100, (c * 2.5) / 100);
        twoFaces(ctx);
        ctx.restore();
      }, 1.2);
    }
    const d = ctx.getImageData(0, 0, w, h).data;
    const height = new Float32Array(w * h);
    for (let i = 0, p = 0; i < w * h; i++, p += 4) height[i] = 0.5 + 0.6 * ((0.3 * d[p] + 0.59 * d[p + 1] + 0.11 * d[p + 2]) / 255 - 0.5);
    return height;
  });
}

/** Plain boards of the same wood, for the doors' backs, the planks and the wooden altar. */
export function plainWoodTexture() {
  return make('e-wood', 256, 512, (ctx, w, h) => {
    woodGrain(ctx, w, h, 511);
    ctx.strokeStyle = 'rgba(50,25,6,0.45)';
    ctx.lineWidth = 2;
    for (const x of [0, w / 2]) {
      ctx.beginPath();
      ctx.moveTo(x + 1, 0);
      ctx.lineTo(x + 1, h);
      ctx.stroke();
    }
  });
}

/** A palm tree cut in the stone of a gate's post (40:16), on a transparent ground: one tile 4 × 10 cubits. */
export function stonePalmTexture() {
  return make('e-stonePalm', 256, 640, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    RS = 1;
    palm(ctx, w / 2, h * 0.97, h * 0.32, w * 0.42, { body: '#e9dcc0', hi: '#f6eedb', line: '#7d6a4c', deep: '#b9a47f' });
  });
}

/** Water that catches the sky: soft ripples, tiling, for the stream and the river. */
export function waterTexture() {
  const t = make('e-water', 256, 256, (ctx, w, h) => {
    const n = fbm(w, h, 6, 18, 3, 521, 0.55);
    const m = fbm(w, h, 12, 4, 2, 523, 0.5);
    const R = new Float32Array(w * h);
    const G = new Float32Array(w * h);
    const B = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const t = smooth(0.2, 0.9, 0.5 + 0.5 * n[i] + 0.25 * m[i]);
      R[i] = 70 + 120 * t;
      G[i] = 120 + 100 * t;
      B[i] = 130 + 95 * t;
    }
    putRGB(ctx, w, h, R, G, B);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
