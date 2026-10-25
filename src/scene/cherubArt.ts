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
