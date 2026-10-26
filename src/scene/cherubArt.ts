/**
 * A stylised woven cherub, seen from the front: a robed, human-like figure with hands joined
 * in prayer and two great wings lifted on high, their long feathers sweeping up and curling
 * inward over the head. Scripture commands cherubim on the veil and inner curtains
 * (Ex 26:1, 31) without describing their form, so this follows the ark's cherubim
 * (Ex 25:20: wings stretched forth on high) in the manner of ancient embroidery: bold outlines,
 * layered feathers, and a robe whose folds sway to one side for movement.
 *
 * Drawn in a 100-unit space scaled by s/100; it spans about ±95 across and -105..+80 down,
 * the same box the call sites in textures.ts were laid out for.
 */

// The commanded colours (Ex 26:1). Hard-coded: textures.ts imports this module.
const PURPLE = '#6a2d78';
const SCARLET = '#b8232c';
const LINEN = '#efe7d4';

type Pt = [number, number];

function bez(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

function bezTan(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const x = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const y = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
}

/** A curved feather blade from (x, y) along angle a, bending by `bend` radians toward its tip. */
function blade(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, len: number, w: number, bend: number) {
  const a2 = a + bend;
  const mx = x + Math.cos(a + bend * 0.4) * len * 0.55;
  const my = y + Math.sin(a + bend * 0.4) * len * 0.55;
  const tx = mx + Math.cos(a2) * len * 0.45;
  const ty = my + Math.sin(a2) * len * 0.45;
  const nx = -Math.sin(a + bend * 0.4);
  const ny = Math.cos(a + bend * 0.4);
  ctx.beginPath();
  ctx.moveTo(x - nx * w * 0.3, y - ny * w * 0.3);
  ctx.bezierCurveTo(mx - nx * w * 1.05, my - ny * w * 1.05, tx - nx * w * 0.6 - Math.cos(a2) * w * 0.4, ty - ny * w * 0.6 - Math.sin(a2) * w * 0.4, tx, ty);
  ctx.bezierCurveTo(tx + nx * w * 0.6 - Math.cos(a2) * w * 0.4, ty + ny * w * 0.6 - Math.sin(a2) * w * 0.4, mx + nx * w * 1.05, my + ny * w * 1.05, x + nx * w * 0.3, y + ny * w * 0.3);
  ctx.closePath();
  return { mx, my, tx, ty };
}

/** One wing (the right one; the left is mirrored): a crescent that rises from the shoulder,
 *  swells outward and curls back in over the head, with a band of scaled coverts along its
 *  inner edge over a fan of broad, overlapping flight feathers. */
function drawWing(ctx: CanvasRenderingContext2D, wing: string, cover: string, line: string, thread: string) {
  const b0: Pt = [10, -30], b1: Pt = [46, -30], b2: Pt = [70, -48], b3: Pt = [60, -72];
  const at = (u: number) => bez(b0, b1, b2, b3, u);
  // outward normal: the tangent turned a quarter clockwise (canvas y runs down)
  const out = (u: number): Pt => {
    const [tx, ty] = bezTan(b0, b1, b2, b3, u);
    return [-ty, tx];
  };

  // long primaries behind, staggered between the flights, sweeping out and up
  const k = 7;
  for (let i = k - 1; i >= 0; i--) {
    const u = 0.12 + (i / (k - 1)) * 0.86;
    const [x, y] = at(u);
    const [tx, ty] = bezTan(b0, b1, b2, b3, u);
    const a = Math.atan2(ty, tx) + 1.0 - u * 0.45;
    const len = 36 + 16 * Math.sin(u * Math.PI * 0.85);
    ctx.fillStyle = wing;
    ctx.lineWidth = 2.4;
    blade(ctx, x, y, a, len, 7.5, -0.55 - u * 0.25);
    ctx.fill();
    ctx.stroke();
  }

  // flight feathers, from the tip back toward the body so the inner ones lie on top
  const n = 10;
  for (let i = n - 1; i >= 0; i--) {
    const u = 0.04 + (i / (n - 1)) * 0.96;
    const [x, y] = at(u);
    const [tx, ty] = bezTan(b0, b1, b2, b3, u);
    const a = Math.atan2(ty, tx) + 1.2 - u * 0.55;
    const len = 24 + 18 * Math.pow(u, 0.8);
    const bend = -0.5 - u * 0.3;
    ctx.fillStyle = wing;
    ctx.lineWidth = 2.4;
    const { mx, my, tx: ex, ty: ey } = blade(ctx, x, y, a, len, 9 + u * 2.5, bend);
    ctx.fill();
    ctx.stroke();
    // quill: a single curved line along the blade, stopping short of the tip
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(mx, my, x + (ex - x) * 0.8 + (mx - (x + ex) / 2) * 0.3, y + (ey - y) * 0.8 + (my - (y + ey) / 2) * 0.3);
    ctx.stroke();
  }

  // coverts: a band along the inner edge with a scalloped outer border
  const m = 8;
  const inner: Pt[] = [];
  const outer: Pt[] = [];
  for (let i = 0; i <= m; i++) {
    const u = i / m;
    const [x, y] = at(u);
    const [nx, ny] = out(u);
    const w = 11 - u * 6;
    inner.push([x - nx * 4, y - ny * 4]);
    outer.push([x + nx * w, y + ny * w]);
  }
  ctx.fillStyle = cover;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(inner[0][0], inner[0][1]);
  for (let i = 1; i <= m; i++) {
    const [px, py] = inner[i - 1];
    const [x, y] = inner[i];
    ctx.quadraticCurveTo(px + (x - px) * 0.5, py + (y - py) * 0.5, x, y);
  }
  for (let i = m; i > 0; i--) {
    const [px, py] = outer[i];
    const [x, y] = outer[i - 1];
    // each scallop bulges outward, like the rounded end of a covert feather
    const [nx, ny] = out((i - 0.5) / m);
    const bulge = 5 - (i / m) * 2;
    ctx.quadraticCurveTo((px + x) / 2 + nx * bulge, (py + y) / 2 + ny * bulge, x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // a staggered row of small scale-feathers inside the band, in linen thread
  ctx.strokeStyle = thread;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < m - 1; i++) {
    const u = (i + 0.9) / m;
    const [x, y] = at(u);
    const [nx, ny] = out(u);
    const w = (11 - u * 6) * 0.5;
    const a = Math.atan2(ny, nx);
    ctx.beginPath();
    ctx.arc(x + nx * (w - 1), y + ny * (w - 1), 3.2 + (1 - u) * 1.5, a - 1.2, a + 1.2);
    ctx.stroke();
  }
  ctx.strokeStyle = line;
}

/** `cover` (coverts and hair) and `thread` (feather lines) default to the woven colours; carved gold passes its own. */
export function drawCherub(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  body: string,
  wing: string,
  line: string,
  cover = wing === SCARLET ? PURPLE : SCARLET,
  thread = LINEN,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s / 100, s / 100);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = line;

  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    drawWing(ctx, wing, cover, line, thread);
    ctx.restore();
  }

  // robe: narrow at the shoulders, flaring to a hem that sweeps to one side
  ctx.fillStyle = body;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-15, -32);
  ctx.bezierCurveTo(-6, -36, 6, -36, 15, -32);
  ctx.bezierCurveTo(22, 0, 26, 40, 46, 70);
  // hem: a wave that lifts as it sweeps
  ctx.bezierCurveTo(30, 82, 16, 70, 4, 78);
  ctx.bezierCurveTo(-10, 86, -24, 74, -36, 78);
  ctx.bezierCurveTo(-28, 50, -26, 10, -15, -32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // folds sweeping down and across
  ctx.lineWidth = 2;
  const folds: [Pt, Pt, Pt, Pt][] = [
    [[-6, -2], [-10, 30], [-18, 55], [-22, 78]],
    [[2, -2], [2, 30], [-4, 58], [-6, 80]],
    [[9, -2], [14, 30], [16, 55], [18, 74]],
    [[14, 10], [22, 34], [30, 54], [38, 70]],
  ];
  for (const [a, b, c, d] of folds) {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.bezierCurveTo(b[0], b[1], c[0], c[1], d[0], d[1]);
    ctx.stroke();
  }
  // girdle and hem band in the wing colour
  ctx.strokeStyle = wing;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(-19, -4);
  ctx.quadraticCurveTo(0, 2, 19, -4);
  ctx.moveTo(-31, 70);
  ctx.bezierCurveTo(-20, 66, -8, 76, 4, 70);
  ctx.bezierCurveTo(16, 64, 28, 74, 40, 64);
  ctx.stroke();
  ctx.strokeStyle = line;

  // sleeves: wide, falling from the shoulders to hands joined before the breast
  ctx.fillStyle = body;
  ctx.lineWidth = 2.6;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.beginPath();
    ctx.moveTo(13, -33);
    ctx.bezierCurveTo(24, -30, 26, -16, 26, 2);
    ctx.bezierCurveTo(20, 8, 10, 6, 4, -6);
    ctx.bezierCurveTo(3, -14, 4, -20, 2, -22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(18, -24);
    ctx.quadraticCurveTo(22, -10, 18, 2);
    ctx.stroke();
    ctx.restore();
  }
  // joined hands
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.bezierCurveTo(5, -26, 5, -16, 0, -12);
  ctx.bezierCurveTo(-5, -16, -5, -26, 0, -30);
  ctx.fill();
  ctx.stroke();

  // head, bowed a little, with hair flowing to the shoulders
  ctx.save();
  ctx.translate(0, -48);
  ctx.rotate(0.12);
  ctx.fillStyle = cover;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-12, -4);
  ctx.bezierCurveTo(-14, -18, 14, -18, 12, -4);
  ctx.bezierCurveTo(16, 6, 14, 14, 20, 18);
  ctx.bezierCurveTo(10, 18, 8, 12, 6, 8);
  ctx.lineTo(-6, 8);
  ctx.bezierCurveTo(-8, 12, -10, 18, -20, 18);
  ctx.bezierCurveTo(-14, 14, -16, 6, -12, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 1, 8.5, 10.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // closed eyes, downcast
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(-3.6, 1, 2.2, 0.3, Math.PI - 0.3);
  ctx.moveTo(5.6, 1.6);
  ctx.arc(3.6, 1, 2.2, 0.3, Math.PI - 0.3);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}
