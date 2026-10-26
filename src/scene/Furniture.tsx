import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { POS } from './dims';
import { bronze, gold, pureGold, toon } from './materials';
import { Cherub } from './Cherub';
import { netTexture } from './textures';

const boxes = new Map<string, THREE.BufferGeometry>();
/** Boxes with a slight bevel, so edges catch the light like worked wood and metal. */
function rounded(s: [number, number, number]) {
  const key = s.join();
  let g = boxes.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(s[0], s[1], s[2], 2, Math.min(0.05, Math.min(...s) * 0.2));
    boxes.set(key, g);
  }
  return g;
}

function Box({
  p,
  s,
  m,
  r,
}: {
  p: [number, number, number];
  s: [number, number, number];
  m: THREE.Material;
  r?: [number, number, number];
}) {
  return (
    <mesh position={p} rotation={r} material={m} castShadow receiveShadow>
      <primitive object={rounded(s)} attach="geometry" />
    </mesh>
  );
}

function Pole({ p, len, m, axis = 'x', r = 0.05 }: { p: [number, number, number]; len: number; m: THREE.Material; axis?: 'x' | 'z'; r?: number }) {
  return (
    <mesh position={p} rotation={axis === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]} material={m} castShadow>
      <cylinderGeometry args={[r, r, len, 8]} />
    </mesh>
  );
}

function Ring({ p, m, axis = 'x', r = 0.1 }: { p: [number, number, number]; m: THREE.Material; axis?: 'x' | 'z'; r?: number }) {
  return (
    <mesh position={p} rotation={axis === 'x' ? [0, Math.PI / 2, 0] : [0, 0, 0]} material={m}>
      <torusGeometry args={[r, r * 0.28, 6, 14]} />
    </mesh>
  );
}

/** A rectangular frame of four thin bars: used for crowns (zer) and borders. */
function Frame({ y, sx, sz, h, t, m }: { y: number; sx: number; sz: number; h: number; t: number; m: THREE.Material }) {
  return (
    <group position={[0, y, 0]}>
      <Box p={[0, 0, sz / 2 - t / 2]} s={[sx, h, t]} m={m} />
      <Box p={[0, 0, -sz / 2 + t / 2]} s={[sx, h, t]} m={m} />
      <Box p={[sx / 2 - t / 2, 0, 0]} s={[t, h, sz - 2 * t]} m={m} />
      <Box p={[-sx / 2 + t / 2, 0, 0]} s={[t, h, sz - 2 * t]} m={m} />
    </group>
  );
}

// ───────────────────────── Ark & mercy seat (Ex 25:10-22) ─────────────────────────

export function Ark() {
  const g = gold();
  const L = 2.5;
  const W = 1.5;
  const H = 1.5;
  const foot = 0.12;
  return (
    // Length runs north–south and the poles east–west, so from the door you face the long side
    // and see both cherubim; the pole ends press toward the veil (1 Kgs 8:8; Rashi on Ex 25:12).
    <group position={[POS.ark[0], 0, POS.ark[1]]} rotation={[0, Math.PI / 2, 0]} userData={{ feature: 'ark' }}>
      {/* four feet */}
      {[
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ].map(([sx, sz], i) => (
        <Box key={i} p={[sx * (L / 2 - 0.12), foot / 2, sz * (W / 2 - 0.12)]} s={[0.22, foot, 0.22]} m={g} />
      ))}
      {/* chest, overlaid within and without */}
      <Box p={[0, foot + (H - foot) / 2, 0]} s={[L, H - foot, W]} m={g} />
      {/* crown of gold round about */}
      <Frame y={H - 0.1} sx={L + 0.08} sz={W + 0.08} h={0.1} t={0.05} m={pureGold()} />
      {/* rings at the four feet, two on each end; poles never removed (Ex 25:12-15) */}
      {[1, -1].flatMap((sx) =>
        [1, -1].map((sz) => <Ring key={`${sx}${sz}`} axis="z" p={[sx * (L / 2 + 0.08), 0.32, sz * (W / 2 - 0.3)]} m={g} />),
      )}
      {[1, -1].map((sx) => (
        <Pole key={sx} axis="z" p={[sx * (L / 2 + 0.08), 0.32, 0]} len={9} m={g} />
      ))}
      {/* mercy seat of pure gold, 2½ x 1½ (Ex 25:17) */}
      <Box p={[0, H + 0.06, 0]} s={[L, 0.12, W]} m={pureGold()} />
      {/* two cherubim of one piece with it, facing one another (Ex 25:18-20) */}
      <group position={[-L / 2 + 0.22, H + 0.12, 0]}>
        <Cherub />
      </group>
      <group position={[L / 2 - 0.22, H + 0.12, 0]} rotation={[0, Math.PI, 0]}>
        <Cherub />
      </group>
      {/* the Presence above the mercy seat (illustrative) */}
      <pointLight position={[0, H + 1.9, 0]} color="#fff2c4" intensity={3.5} distance={9} decay={1.6} />
    </group>
  );
}

// ───────────────────────── Table of showbread (Ex 25:23-30) ─────────────────────────

export function Table() {
  const g = gold();
  const L = 2;
  const W = 1;
  const H = 1.5;
  const hand = 1 / 6; // a handbreadth is one sixth of a cubit
  const bread = toon('bread', { color: '#d9a35c' });
  const legs: [number, number][] = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  return (
    <group position={[POS.table[0], 0, POS.table[1]]} userData={{ feature: 'table' }}>
      <Box p={[0, H - 0.04, 0]} s={[L, 0.08, W]} m={g} />
      {legs.map(([sx, sz], i) => (
        <Box key={i} p={[sx * (L / 2 - 0.07), (H - 0.08) / 2, sz * (W / 2 - 0.07)]} s={[0.1, H - 0.08, 0.1]} m={g} />
      ))}
      {/* crown round the top, and the border of a handbreadth with its crown (Ex 25:24-25) */}
      <Frame y={H + 0.04} sx={L} sz={W} h={0.08} t={0.04} m={pureGold()} />
      <Frame y={H - 0.4} sx={L - 0.1} sz={W - 0.1} h={hand} t={0.03} m={g} />
      <Frame y={H - 0.4 + hand / 2 + 0.02} sx={L - 0.06} sz={W - 0.06} h={0.04} t={0.03} m={pureGold()} />
      {/* rings at the feet by the border, poles along the length (Ex 25:26-28) */}
      {legs.map(([sx, sz], i) => (
        <Ring key={i} p={[sx * (L / 2 - 0.2), H - 0.55, sz * (W / 2 + 0.06)]} m={g} r={0.08} />
      ))}
      {[1, -1].map((sz) => (
        <Pole key={sz} p={[0, H - 0.55, sz * (W / 2 + 0.06)]} len={3.4} m={g} r={0.04} />
      ))}
      {/* twelve loaves in two rows of six, frankincense on each (Lev 24:5-7) */}
      {[-0.48, 0.48].map((x) => (
        <group key={x} position={[x, H + 0.08, 0]}>
          {Array.from({ length: 6 }, (_, i) => (
            <mesh key={i} position={[0, 0.06 + i * 0.11, 0]} material={bread} castShadow>
              <cylinderGeometry args={[0.36, 0.38, 0.1, 18]} />
            </mesh>
          ))}
          <mesh position={[0, 0.76, 0]} material={pureGold()}>
            <cylinderGeometry args={[0.1, 0.06, 0.08, 10]} />
          </mesh>
          <mesh position={[0, 0.8, 0]} material={toon('frankincense', { color: '#f4ecd2' })}>
            <sphereGeometry args={[0.07, 8, 6]} />
          </mesh>
        </group>
      ))}
      {/* dishes, spoons (pans), flagons and bowls of pure gold (Ex 25:29) */}
      <mesh position={[0.92, H + 0.14, 0.36]} material={pureGold()}>
        <cylinderGeometry args={[0.05, 0.08, 0.2, 10]} />
      </mesh>
      <mesh position={[-0.92, H + 0.06, -0.36]} material={pureGold()}>
        <cylinderGeometry args={[0.1, 0.07, 0.05, 12]} />
      </mesh>
      <mesh position={[0.92, H + 0.06, -0.36]} material={pureGold()}>
        <cylinderGeometry args={[0.1, 0.07, 0.05, 12]} />
      </mesh>
    </group>
  );
}

// ───────────────────────── Golden lampstand (Ex 25:31-40) ─────────────────────────

function Flame({ p }: { p: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  const seed = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 9 + seed;
    ref.current!.scale.set(1, 1 + Math.sin(t) * 0.12 + Math.sin(t * 2.7) * 0.06, 1);
  });
  return (
    <mesh ref={ref} position={p}>
      <coneGeometry args={[0.04, 0.16, 8]} />
      <meshBasicMaterial color="#ffd27a" toneMapped={false} />
    </mesh>
  );
}

/** A tube along a curve that tapers from r0 to r1, like a growing stem. */
function taperedTube(curve: THREE.Curve<THREE.Vector3>, r0: number, r1: number, segs = 32, radial = 10) {
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const p = g.attributes.position as THREE.BufferAttribute;
  const c = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, c);
    const r = r0 + (r1 - r0) * t;
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(p, k).sub(c).multiplyScalar(r).add(c);
      p.setXYZ(k, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** Lathe from (radius, y) pairs, smoothed through a spline. */
function lathe(pts: [number, number][], seg = 14, div = 24) {
  const spline = new THREE.SplineCurve(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.LatheGeometry(spline.getPoints(div), seg);
}

/**
 * One "cup made like an almond, a knop and a flower" (Ex 25:33): a round knop (bud),
 * an almond-shaped cup above it, and five petals opening at the rim. Axis +y, origin at the knop.
 */
function blossomGeometry() {
  const knop = lathe([[0.001, -0.07], [0.045, -0.055], [0.062, -0.02], [0.05, 0.015], [0.022, 0.03]]);
  const cup = lathe([[0.02, 0.03], [0.04, 0.06], [0.055, 0.1], [0.05, 0.14], [0.06, 0.155]]);
  const petals: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const petal = new THREE.SphereGeometry(0.045, 8, 6);
    petal.scale(0.55, 1, 0.22);
    petal.translate(0, 0.04, 0);
    petal.rotateX(-0.75); // flare outward
    petal.translate(0, 0.14, 0.04);
    petal.rotateY(a);
    petals.push(petal);
  }
  const strip = (g: THREE.BufferGeometry) => {
    const n = g.index ? g.toNonIndexed() : g;
    n.deleteAttribute('uv');
    return n;
  };
  const merged = mergeGeometries([knop, cup, ...petals].map(strip))!;
  merged.computeVertexNormals();
  return merged;
}

function OilLamp({ p, m }: { p: [number, number, number]; m: THREE.Material }) {
  // a small bowl with a pinched spout toward the front (-z), "to give light over against it" (Ex 25:37)
  const geo = useMemo(() => {
    const g = lathe([[0.012, 0], [0.07, 0.015], [0.085, 0.045], [0.07, 0.065]], 16);
    g.scale(1, 1, 1.25);
    return g;
  }, []);
  return (
    <group position={p}>
      <mesh geometry={geo} material={m} castShadow />
      <mesh position={[0, 0.055, -0.1]} rotation={[-1.2, 0, 0]} material={m}>
        <coneGeometry args={[0.03, 0.09, 8, 1, true]} />
      </mesh>
      <Flame p={[0, 0.13, -0.125]} />
    </group>
  );
}

/**
 * The lampstand, of one beaten piece (Ex 25:31-40): a tapering shaft, six branches that sweep
 * out of its sides like almond boughs, almond blossoms along every branch, standing on three feet.
 * Its front (lamps and light) faces local -z; the parent turns it to face the entrance.
 */
export function Menorah() {
  const m = pureGold();
  const H = 3; // not specified in Scripture; tradition gives 18 handbreadths
  const radii = [0.36, 0.7, 1.04];
  const light = useRef<THREE.PointLight>(null);
  const blossoms = useRef<THREE.InstancedMesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (light.current) light.current.intensity = 9 + Math.sin(t * 7) * 0.6 + Math.sin(t * 13) * 0.4;
  });

  const parts = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const bloomAt: THREE.Matrix4[] = [];
    const place = (p: THREE.Vector3, dir: THREE.Vector3, s = 1) =>
      bloomAt.push(new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize()), new THREE.Vector3(s, s, s)));

    // shaft: a slender stem that swells gently at the joints
    const shaft = lathe(
      [[0.075, 0.42], [0.06, 0.9], [0.052, 1.6], [0.05, 2.2], [0.046, 2.7], [0.042, H - 0.1]],
      12,
      30,
    );
    shaft.translate(0, 0, 0);

    // three curved legs (Rashi: the base stood on three feet)
    const legs = [0, 1, 2].map((i) => {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
      const d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(0, 0.5, 0),
        d.clone().multiplyScalar(0.08).setY(0.3),
        d.clone().multiplyScalar(0.34).setY(0.2),
        d.clone().multiplyScalar(0.42).setY(0.03),
      );
      return { geo: taperedTube(curve, 0.06, 0.035, 20, 8), foot: d.clone().multiplyScalar(0.44).setY(0.03) };
    });

    // six branches out of the sides, three on each side (Ex 25:32)
    const branches = radii.flatMap((r) =>
      [1, -1].map((side) => {
        const yb = H - r * 1.08;
        const curve = new THREE.CubicBezierCurve3(
          new THREE.Vector3(0, yb, 0),
          new THREE.Vector3(side * r * 0.62, yb + r * 0.02, 0),
          new THREE.Vector3(side * r, yb + r * 0.3, 0),
          new THREE.Vector3(side * r, H - 0.12, 0),
        );
        // three almond blossoms along each branch (Ex 25:33)
        for (const u of [0.38, 0.62, 0.84]) place(curve.getPointAt(u), curve.getTangentAt(u), 0.95);
        return { geo: taperedTube(curve, 0.042, 0.03, 36, 10), tip: [side * r, H - 0.12, 0] as [number, number, number], yb };
      }),
    );
    // four on the shaft (Ex 25:34), clear of the branch joints
    for (const y of [0.95, 1.5, 2.08, 2.46]) place(new THREE.Vector3(0, y, 0), up, 1.15);
    // a knop under each pair of branches (Ex 25:35)
    const knops = radii.map((r) => H - r * 1.08);
    return { shaft, legs, branches, bloomAt, knops, knop: lathe([[0.001, -0.06], [0.07, -0.035], [0.08, 0.0], [0.065, 0.04], [0.001, 0.06]]) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const blossomGeo = useMemo(blossomGeometry, []);
  useLayoutEffect(() => {
    parts.bloomAt.forEach((mx, i) => blossoms.current!.setMatrixAt(i, mx));
    blossoms.current!.instanceMatrix.needsUpdate = true;
    blossoms.current!.computeBoundingSphere();
  }, [parts]);

  const lampTops: [number, number, number][] = [[0, H - 0.12, 0], ...parts.branches.map((b) => b.tip)];
  return (
    <group position={[POS.menorah[0], 0, POS.menorah[1]]} rotation={[0, -Math.PI / 2, 0]} userData={{ feature: 'menorah' }}>
      <mesh geometry={parts.shaft} material={m} castShadow />
      {parts.legs.map((l, i) => (
        <group key={i}>
          <mesh geometry={l.geo} material={m} castShadow />
          <mesh position={l.foot} scale={[1.3, 0.5, 1.3]} material={m}>
            <sphereGeometry args={[0.05, 10, 6]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.5, 0]} geometry={parts.knop} material={m} castShadow />
      {parts.knops.map((y) => (
        <mesh key={y} position={[0, y, 0]} geometry={parts.knop} material={m} castShadow />
      ))}
      {parts.branches.map((b, i) => (
        <mesh key={i} geometry={b.geo} material={m} castShadow />
      ))}
      <instancedMesh ref={blossoms} args={[blossomGeo, m, parts.bloomAt.length]} castShadow />
      {/* seven lamps, burning pure olive oil (Ex 25:37; Lev 24:2) */}
      {lampTops.map((p, i) => (
        <OilLamp key={i} p={p} m={m} />
      ))}
      <pointLight ref={light} position={[0, H + 0.4, -0.6]} color="#ffbe6a" intensity={9} distance={30} decay={1.3} />
      {/* tongs and snuff dishes (Ex 25:38) */}
      <mesh position={[0.5, 0.03, -0.3]} material={m}>
        <cylinderGeometry args={[0.1, 0.08, 0.04, 10]} />
      </mesh>
    </group>
  );
}

// ───────────────────────── Altar of incense (Ex 30:1-10) ─────────────────────────

function Smoke({ y, spread, count, color, scale = 1 }: { y: number; spread: number; count: number; color: string; scale?: number }) {
  const group = useRef<THREE.Group>(null);
  const mat = useMemo(() => new THREE.MeshToonMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false }), [color]);
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => ({ o: i / count, a: Math.random() * 6.28 })), [count]);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    g.children.forEach((c, i) => {
      const s = seeds[i];
      const t = (clock.elapsedTime * 0.18 + s.o) % 1;
      c.position.set(Math.sin(t * 6 + s.a) * spread * t, y + t * 3 * scale, Math.cos(t * 5 + s.a) * spread * t);
      const k = (0.12 + t * 0.4) * scale;
      c.scale.setScalar(k);
    });
    mat.opacity = 0.45;
  });
  return (
    <group ref={group}>
      {seeds.map((_, i) => (
        <mesh key={i} material={mat}>
          <sphereGeometry args={[1, 8, 6]} />
        </mesh>
      ))}
    </group>
  );
}

export function IncenseAltar() {
  const g = gold();
  const S = 1;
  const H = 2;
  return (
    <group position={[POS.incense[0], 0, POS.incense[1]]} userData={{ feature: 'incense' }}>
      <Box p={[0, H / 2, 0]} s={[S, H, S]} m={g} />
      {/* crown of gold round about (Ex 30:3) */}
      <Frame y={H - 0.12} sx={S + 0.08} sz={S + 0.08} h={0.1} t={0.05} m={pureGold()} />
      {/* horns of one piece with it (Ex 30:2) */}
      {[
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * 0.42, H + 0.08, sz * 0.42]} material={g}>
          <boxGeometry args={[0.14, 0.16, 0.14]} />
        </mesh>
      ))}
      {/* two rings under the crown "by the two corners thereof, upon the two sides"; gold-covered poles (Ex 30:4-5) */}
      {[1, -1].map((sz) => (
        <group key={sz}>
          <Ring p={[sz * 0.3, H - 0.35, sz * (S / 2 + 0.06)]} m={g} r={0.08} />
          <Pole p={[0, H - 0.35, sz * (S / 2 + 0.06)]} len={2.6} m={g} r={0.035} />
        </group>
      ))}
      {/* coals and sweet incense, morning and evening (Ex 30:7-8) */}
      <mesh position={[0, H + 0.02, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.03, 12]} />
        <meshBasicMaterial color="#ff7a2a" toneMapped={false} />
      </mesh>
      <Smoke y={H + 0.1} spread={0.25} count={9} color="#efe9f5" scale={0.8} />
    </group>
  );
}

// ───────────────────────── Altar of burnt offering (Ex 27:1-8) ─────────────────────────

export function BronzeAltar() {
  const b = bronze();
  const S = 5;
  const H = 3;
  const t = 0.18;
  const net = useMemo(() => {
    const tex = netTexture();
    return toon('net', { map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
  }, []);
  const coal = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff6a1f', toneMapped: false }), []);
  const flame = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffb340', toneMapped: false }), []);
  const fire = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const tt = clock.elapsedTime;
    fire.current?.children.forEach((c, i) => {
      c.scale.y = 1 + Math.sin(tt * 6 + i * 1.7) * 0.25;
    });
  });
  return (
    <group position={[POS.altar[0], 0, POS.altar[1]]} userData={{ feature: 'altar' }}>
      {/* hollow with boards: four walls, open top (Ex 27:8) */}
      <Box p={[0, H / 2, S / 2 - t / 2]} s={[S, H, t]} m={b} />
      <Box p={[0, H / 2, -S / 2 + t / 2]} s={[S, H, t]} m={b} />
      <Box p={[S / 2 - t / 2, H / 2, 0]} s={[t, H, S - 2 * t]} m={b} />
      <Box p={[-S / 2 + t / 2, H / 2, 0]} s={[t, H, S - 2 * t]} m={b} />
      {/* horns on the four corners (Ex 27:2) */}
      {[
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (S / 2 - 0.2), H + 0.18, sz * (S / 2 - 0.2)]} material={b} castShadow>
          <coneGeometry args={[0.2, 0.42, 4]} />
        </mesh>
      ))}
      {/* the ledge (compass) halfway up, and the bronze network beneath it (Ex 27:4-5) */}
      <Frame y={H / 2} sx={S + 0.5} sz={S + 0.5} h={0.12} t={0.25} m={b} />
      {[0, 1, 2, 3].map((k) => {
        const a = (k * Math.PI) / 2;
        return (
          <mesh
            key={k}
            position={[Math.sin(a) * (S / 2 + 0.24), H / 4, Math.cos(a) * (S / 2 + 0.24)]}
            rotation={[0, a, 0]}
            material={net}
          >
            <planeGeometry args={[S + 0.5, H / 2]} />
          </mesh>
        );
      })}
      {/* four bronze rings at the corners of the net, poles on two sides (Ex 27:4, 6-7) */}
      {[1, -1].flatMap((sz) =>
        [1, -1].map((sx) => (
          <Ring key={`${sx}${sz}`} p={[sx * (S / 2 - 0.3), H / 2 - 0.25, sz * (S / 2 + 0.38)]} m={b} r={0.14} />
        )),
      )}
      {[1, -1].map((sz) => (
        <Pole key={sz} p={[0, H / 2 - 0.25, sz * (S / 2 + 0.38)]} len={8} m={b} r={0.08} />
      ))}
      {/* the inner grate with fire on it */}
      <mesh position={[0, H / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} material={net}>
        <planeGeometry args={[S - 2 * t, S - 2 * t]} />
      </mesh>
      <mesh position={[0, H / 2 + 0.1, 0]} material={coal}>
        <boxGeometry args={[S - 1.2, 0.2, S - 1.2]} />
      </mesh>
      <group ref={fire} position={[0, H / 2 + 0.2, 0]}>
        {[
          [0, 0, 1.3],
          [1, 0.6, 0.9],
          [-0.9, -0.5, 1.0],
          [0.5, -1.0, 0.8],
          [-0.6, 0.9, 0.85],
        ].map(([x, z, h], i) => (
          <mesh key={i} position={[x, (h as number) / 2, z]} material={i % 2 ? coal : flame}>
            <coneGeometry args={[0.35, h as number, 6]} />
          </mesh>
        ))}
      </group>
      <pointLight position={[0, H + 0.8, 0]} color="#ff9a4a" intensity={4} distance={12} decay={1.6} />
      <Smoke y={H + 0.6} spread={1.2} count={12} color="#8a8178" scale={2.2} />
      {/* pans, shovels, basins, flesh-hooks, firepans of bronze (Ex 27:3) */}
      <group position={[S / 2 + 1.1, 0, 3.4]}>
        <mesh position={[0, 0.25, 0]} material={b} castShadow>
          <cylinderGeometry args={[0.35, 0.25, 0.5, 12]} />
        </mesh>
        <mesh position={[0.8, 0.05, 0.2]} rotation={[0, 0.6, 0]} material={b}>
          <boxGeometry args={[0.5, 0.05, 0.35]} />
        </mesh>
        <mesh position={[0.3, 0.06, 0.9]} rotation={[0, 0.3, Math.PI / 2 - 0.02]} material={b}>
          <cylinderGeometry args={[0.025, 0.025, 1.4, 5]} />
        </mesh>
      </group>
    </group>
  );
}

// ───────────────────────── Laver (Ex 30:17-21; 38:8) ─────────────────────────

export function Laver() {
  const b = useMemo(
    () => toon('laverBronze', { color: '#d79a55', emissive: '#3a1c00', emissiveIntensity: 0.35 }),
    [],
  );
  const foot = useMemo(
    () =>
      new THREE.LatheGeometry(
        [
          [0.7, 0],
          [0.7, 0.12],
          [0.35, 0.3],
          [0.18, 0.8],
          [0.16, 1.5],
          [0.3, 1.75],
          [0.01, 1.8],
        ].map(([x, y]) => new THREE.Vector2(x, y)),
        20,
      ),
    [],
  );
  const bowl = useMemo(
    () =>
      new THREE.LatheGeometry(
        [
          [0.01, 1.75],
          [0.5, 1.8],
          [1.0, 2.05],
          [1.25, 2.45],
          [1.32, 2.6],
          [1.22, 2.6],
        ].map(([x, y]) => new THREE.Vector2(x, y)),
        28,
      ),
    [],
  );
  return (
    <group position={[POS.laver[0], 0, POS.laver[1]]} userData={{ feature: 'laver' }}>
      <mesh geometry={foot} material={b} castShadow>
      </mesh>
      <mesh geometry={bowl} material={b} castShadow>
      </mesh>
      <mesh position={[0, 2.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.22, 28]} />
        <meshToonMaterial color="#6fb3d6" emissive="#1c4a66" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}
