import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { gold } from '../scene/materials';

/*
 * One of the two great cherubim of the oracle (1 Kgs 6:23-28; 2 Chr 3:10-13): olive wood overlaid
 * with gold, ten cubits high, standing on its feet and facing +x (east, "toward the house").
 * Its two wings stretch out level to either side, five cubits each from the centre, so the
 * pair together fill the twenty-cubit room from wall to wall.
 * Scripture gives only height, span and stance; the robed figure and the feathering are artistic.
 */

const H = 10;
const WING = 5;

function bare(g: THREE.BufferGeometry) {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
  return n;
}

function lathe(pts: [number, number][], seg = 28) {
  const curve = new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y)));
  return new THREE.LatheGeometry(curve.getPoints(40), seg);
}

/** A feather: a flattened, pointed blade lying in the local xy-plane, base at the origin, tip at +x. */
function feather(len: number, wid: number) {
  const s = new THREE.Shape();
  s.moveTo(0, -wid * 0.3);
  s.quadraticCurveTo(len * 0.5, -wid * 0.6, len, 0);
  s.quadraticCurveTo(len * 0.5, wid * 0.6, 0, wid * 0.3);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, steps: 1 });
  g.translate(0, 0, -0.025);
  return g;
}

/**
 * One wing reaching along +z from the shoulder, built of overlapping feathers on a solid vane.
 * The vane's top edge runs nearly level at about 8½ cubits; the flight feathers hang beneath it.
 */
function wing(side: number) {
  const parts: THREE.BufferGeometry[] = [];
  const root = new THREE.Vector3(-0.35, 7.6, side * 0.45);
  const span = WING - 0.45 - 0.8; // leaves room for the primaries, so the tips land exactly at 5
  // the vane: a tapering slab that rises a little and then levels out toward the tip
  const vane = new THREE.Shape();
  const top = (u: number) => 0.9 + 0.35 * Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.5) - 0.25 * u * u;
  const bot = (u: number) => -0.8 + 0.95 * u * u;
  vane.moveTo(0, bot(0));
  for (let i = 0; i <= 20; i++) vane.lineTo((i / 20) * span, top(i / 20));
  for (let i = 20; i >= 0; i--) vane.lineTo((i / 20) * span, bot(i / 20));
  const vg = new THREE.ExtrudeGeometry(vane, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 });
  vg.translate(0, 0, -0.08);
  parts.push(vg);
  // rows of feathers on both faces: small coverts near the top edge, long flight feathers below
  const rows: [number, number, number, number][] = [
    // [v offset from top, length, width, count]
    [-0.15, 0.55, 0.22, 12],
    [-0.45, 0.8, 0.26, 11],
    [-0.85, 1.25, 0.3, 10],
  ];
  for (const face of [1, -1]) {
    for (const [dv, len, wid, n] of rows) {
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n;
        const x = u * span * 0.98;
        const yTop = top(u);
        const yBot = bot(u);
        const y = Math.max(yBot + 0.2, yTop + dv * (0.6 + 0.4 * (1 - u)));
        const f = feather(len * (0.75 + 0.35 * (1 - u)), wid);
        // feathers point down and outward along the wing
        f.rotateZ(-Math.PI / 2 + 0.5 + u * 0.7);
        f.translate(x, y, face * 0.14);
        parts.push(f);
      }
    }
  }
  // primaries fanning out beyond the tip edge
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const f = feather(1.0 - t * 0.25, 0.3);
    f.rotateZ(-0.15 - t * 1.0);
    f.translate(span - 0.2, top(1) - 0.15 - t * 0.6, (i % 2 ? 0.06 : -0.06));
    parts.push(f);
  }
  const g = mergeGeometries(parts.map(bare))!;
  // lay the wing along ±z: shape x → world z, shape y → up, thickness → x; sweep the tip slightly forward
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const sx = p.getX(i);
    const sy = p.getY(i);
    const sz = p.getZ(i);
    const u = Math.max(0, sx) / span;
    p.setXYZ(i, root.x + sz + 0.35 * u * u, root.y + sy, root.z + side * sx);
  }
  g.computeVertexNormals();
  return g;
}

function cherubGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  // a long robe from the shoulders to the feet, a little broader across than front to back
  const robe = lathe([
    [1.25, 0.0],
    [1.1, 0.6],
    [0.9, 2.2],
    [0.78, 4.2],
    [0.8, 5.4],
    [0.92, 6.6],
    [0.95, 7.3],
    [0.5, 7.8],
    [0.3, 8.0],
  ]);
  robe.scale(0.78, 1, 1);
  parts.push(robe);
  // a girdle at the waist
  const girdle = new THREE.TorusGeometry(0.8, 0.07, 6, 24);
  girdle.rotateX(Math.PI / 2);
  girdle.scale(0.8, 1, 1);
  girdle.translate(0, 4.6, 0);
  parts.push(girdle);
  // head and hair: the top of the head at ten cubits (1 Kgs 6:26)
  const head = new THREE.SphereGeometry(0.62, 18, 14);
  head.scale(0.95, 1.12, 0.9);
  head.translate(0.05, H - 0.72, 0);
  parts.push(head);
  const hair = new THREE.SphereGeometry(0.68, 16, 12, Math.PI * 0.55, Math.PI * 0.9);
  hair.scale(1, 1.15, 1);
  hair.translate(-0.02, H - 0.68, 0);
  parts.push(hair);
  for (const s of [1, -1]) {
    // locks falling to the shoulders
    const lock = new THREE.CapsuleGeometry(0.16, 0.9, 4, 8);
    lock.translate(-0.22, H - 1.45, s * 0.45);
    parts.push(lock);
    // sleeves from the shoulders, hands joined before the breast
    const arm = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 7.2, s * 0.75),
        new THREE.Vector3(0.35, 6.4, s * 0.72),
        new THREE.Vector3(0.75, 5.95, s * 0.35),
        new THREE.Vector3(0.82, 6.15, s * 0.06),
      ]),
      20,
      0.2,
      8,
      false,
    );
    parts.push(arm);
  }
  const hands = new THREE.SphereGeometry(0.2, 10, 8);
  hands.scale(1, 1.5, 0.9);
  hands.translate(0.85, 6.3, 0);
  parts.push(hands);
  // feet showing beneath the hem: it stood on its feet (2 Chr 3:13)
  for (const s of [1, -1]) {
    const foot = new THREE.SphereGeometry(0.25, 10, 8);
    foot.scale(1.6, 0.6, 0.9);
    foot.translate(0.95, 0.12, s * 0.32);
    parts.push(foot);
  }
  parts.push(wing(1), wing(-1));
  const g = mergeGeometries(parts.map(bare))!;
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

let shared: THREE.BufferGeometry | null = null;

export function TempleCherub({ position }: { position: [number, number, number] }) {
  const geo = useMemo(() => (shared ??= cherubGeometry()), []);
  return <mesh geometry={geo} material={gold()} position={position} castShadow receiveShadow />;
}
