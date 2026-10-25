import { Outlines } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { POS } from './dims';
import { bronze, gold, INK, pureGold, toon } from './materials';
import { netTexture } from './textures';

const Ink = ({ t = 1.3 }: { t?: number }) => <Outlines thickness={t} color={INK} />;

function Box({
  p,
  s,
  m,
  outline = true,
  r,
}: {
  p: [number, number, number];
  s: [number, number, number];
  m: THREE.Material;
  outline?: boolean;
  r?: [number, number, number];
}) {
  return (
    <mesh position={p} rotation={r} material={m} castShadow receiveShadow>
      <boxGeometry args={s} />
      {outline && <Ink />}
    </mesh>
  );
}

function Pole({ p, len, m, axis = 'x', r = 0.05 }: { p: [number, number, number]; len: number; m: THREE.Material; axis?: 'x' | 'z'; r?: number }) {
  return (
    <mesh position={p} rotation={axis === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]} material={m} castShadow>
      <cylinderGeometry args={[r, r, len, 8]} />
      <Ink t={1} />
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
      <Box p={[0, 0, sz / 2 - t / 2]} s={[sx, h, t]} m={m} outline={false} />
      <Box p={[0, 0, -sz / 2 + t / 2]} s={[sx, h, t]} m={m} outline={false} />
      <Box p={[sx / 2 - t / 2, 0, 0]} s={[t, h, sz - 2 * t]} m={m} outline={false} />
      <Box p={[-sx / 2 + t / 2, 0, 0]} s={[t, h, sz - 2 * t]} m={m} outline={false} />
    </group>
  );
}

// ───────────────────────── Ark & mercy seat (Ex 25:10-22) ─────────────────────────

function wingGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(-0.12, 0.4, 0.05, 0.85, 0.42, 1.0);
  s.bezierCurveTo(0.65, 1.07, 0.88, 1.02, 1.0, 0.95);
  // scalloped trailing edge: primary feathers
  const tips = [
    [0.86, 0.84],
    [0.72, 0.72],
    [0.58, 0.58],
    [0.44, 0.42],
    [0.3, 0.25],
  ];
  let prev: [number, number] = [1.0, 0.95];
  for (const [x, y] of tips) {
    s.quadraticCurveTo((prev[0] + x) / 2 + 0.05, (prev[1] + y) / 2 - 0.08, x, y);
    prev = [x, y];
  }
  s.quadraticCurveTo(0.18, 0.08, 0.1, 0.0);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1 });
}

/** Kneeling cherub facing +x, wings raised forward over the mercy seat (Ex 25:20). */
function Cherub() {
  const wing = useMemo(wingGeometry, []);
  const m = pureGold();
  return (
    <group>
      {/* robe, kneeling */}
      <mesh position={[0, 0.24, 0]} material={m} castShadow>
        <cylinderGeometry args={[0.11, 0.2, 0.48, 12]} />
        <Ink />
      </mesh>
      <mesh position={[0.1, 0.06, 0]} material={m}>
        <boxGeometry args={[0.32, 0.12, 0.3]} />
        <Ink />
      </mesh>
      {/* head bowed toward the mercy seat */}
      <mesh position={[0.06, 0.56, 0]} material={m} castShadow>
        <sphereGeometry args={[0.1, 14, 10]} />
        <Ink />
      </mesh>
      {/* arms reaching forward */}
      <mesh position={[0.16, 0.36, 0]} rotation={[0, 0, -1.1]} material={m}>
        <capsuleGeometry args={[0.035, 0.22, 3, 6]} />
      </mesh>
      {/* wings from the shoulders, stretched forward and on high */}
      {[1, -1].map((side) => (
        <group key={side} position={[-0.02, 0.42, side * 0.12]} rotation={[side * -0.28, 0, -0.18]}>
          <mesh geometry={wing} material={m} scale={[1.0, 0.75, side]} castShadow>
            <Ink t={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Ark() {
  const g = gold();
  const L = 2.5;
  const W = 1.5;
  const H = 1.5;
  const foot = 0.12;
  return (
    <group position={[POS.ark[0], 0, POS.ark[1]]} userData={{ feature: 'ark' }}>
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
      <Frame y={0.45} sx={L + 0.04} sz={W + 0.04} h={0.05} t={0.03} m={pureGold()} />
      {/* rings at the four feet, two on each side; poles never removed (Ex 25:12-15) */}
      {[1, -1].flatMap((sz) =>
        [1, -1].map((sx) => <Ring key={`${sx}${sz}`} p={[sx * (L / 2 - 0.35), 0.32, sz * (W / 2 + 0.08)]} m={g} />),
      )}
      {[1, -1].map((sz) => (
        <Pole key={sz} p={[0, 0.32, sz * (W / 2 + 0.08)]} len={7} m={g} />
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
      <pointLight position={[0, H + 1.2, 0]} color="#fff2c4" intensity={5} distance={9} decay={1.6} />
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
              <Ink t={1} />
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
        <Ink t={1} />
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

/** Almond-blossom bowl (gavia), knop (kaftor) and flower (perach). */
function Cup({ p, m }: { p: THREE.Vector3; m: THREE.Material }) {
  return (
    <group position={p}>
      <mesh position={[0, -0.05, 0]} material={m}>
        <sphereGeometry args={[0.05, 8, 6]} />
      </mesh>
      <mesh position={[0, 0.03, 0]} material={m}>
        <cylinderGeometry args={[0.07, 0.025, 0.08, 8]} />
      </mesh>
      <mesh position={[0, 0.09, 0]} material={m}>
        <cylinderGeometry args={[0.055, 0.04, 0.03, 8]} />
      </mesh>
    </group>
  );
}

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

export function Menorah() {
  const m = pureGold();
  const H = 3; // not specified in Scripture; tradition gives 18 handbreadths
  const radii = [0.35, 0.7, 1.05];
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (light.current) light.current.intensity = 9 + Math.sin(t * 7) * 0.6 + Math.sin(t * 13) * 0.4;
  });
  const branches = useMemo(
    () =>
      radii.flatMap((r) =>
        [1, -1].map((side) => {
          const pts: THREE.Vector3[] = [];
          for (let i = 0; i <= 16; i++) {
            const t = (Math.PI / 2) * (i / 16);
            pts.push(new THREE.Vector3(side * r * Math.sin(t), H - r * Math.cos(t), 0));
          }
          const curve = new THREE.CatmullRomCurve3(pts);
          const cups = [0.35, 0.62, 0.88].map((u) => curve.getPointAt(u));
          return { geom: new THREE.TubeGeometry(curve, 24, 0.035, 8), cups, tip: [side * r, H, 0] as [number, number, number] };
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const lampTops: [number, number, number][] = [[0, H, 0], ...branches.map((b) => b.tip)];
  return (
    <group position={[POS.menorah[0], 0, POS.menorah[1]]} userData={{ feature: 'menorah' }}>
      {/* base and shaft */}
      <mesh position={[0, 0.1, 0]} material={m} castShadow>
        <cylinderGeometry args={[0.22, 0.38, 0.2, 16]} />
        <Ink />
      </mesh>
      <mesh position={[0, H / 2, 0]} material={m} castShadow>
        <cylinderGeometry args={[0.045, 0.06, H, 10]} />
        <Ink t={1} />
      </mesh>
      {/* knops under each pair of branches (Ex 25:35) */}
      {radii.map((r) => (
        <mesh key={r} position={[0, H - r, 0]} material={m}>
          <sphereGeometry args={[0.08, 10, 8]} />
        </mesh>
      ))}
      {/* four bowls on the shaft (Ex 25:34) */}
      {[0.9, H - 0.88, H - 0.52, H - 0.18].map((y) => (
        <Cup key={y} p={new THREE.Vector3(0, y, 0)} m={m} />
      ))}
      {/* six branches, three bowls each (Ex 25:32-33) */}
      {branches.map((b, i) => (
        <group key={i}>
          <mesh geometry={b.geom} material={m} castShadow>
            <Ink t={1} />
          </mesh>
          {b.cups.map((c, k) => (
            <Cup key={k} p={c} m={m} />
          ))}
        </group>
      ))}
      {/* seven lamps, burning pure olive oil (Ex 25:37; Lev 24:2) */}
      {lampTops.map((p, i) => (
        <group key={i}>
          <mesh position={[p[0], p[1] + 0.04, p[2]]} scale={[1.3, 0.55, 0.9]} material={m}>
            <sphereGeometry args={[0.08, 10, 8]} />
            <Ink t={1} />
          </mesh>
          <Flame p={[p[0], p[1] + 0.17, p[2] - 0.03]} />
        </group>
      ))}
      <pointLight ref={light} position={[0, H + 0.4, -0.6]} color="#ffbe6a" intensity={9} distance={30} decay={1.3} />
      {/* tongs and snuff dishes (Ex 25:38) */}
      <mesh position={[0.5, 0.03, 0.2]} material={m}>
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
          <Ink t={1} />
        </mesh>
      ))}
      {/* two rings under the crown on two sides, poles of acacia overlaid with gold (Ex 30:4-5) */}
      {[1, -1].map((sz) => (
        <group key={sz}>
          <Ring p={[0, H - 0.35, sz * (S / 2 + 0.06)]} m={g} r={0.08} />
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
          <Ink t={1} />
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
          <Ink t={1} />
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
        <Ink />
      </mesh>
      <mesh geometry={bowl} material={b} castShadow>
        <Ink />
      </mesh>
      <mesh position={[0, 2.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.22, 28]} />
        <meshToonMaterial color="#6fb3d6" emissive="#1c4a66" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}
