import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Smoke, lathe } from '../scene/Furniture';
import { toon } from '../scene/materials';
import { ALTAR, POS, RAMP, SEA } from './dims';
import { templeMaterials } from './House';
import { worldUV } from './mason';
import { brightBronze } from './Pillars';
import { basePanelTexture, tex } from './textures';

/** Strips a geometry to position + normal so different kinds can be merged. */
function bare(g: THREE.BufferGeometry) {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
  return n;
}

function useInstances(ref: React.RefObject<THREE.InstancedMesh>, mats: THREE.Matrix4[]) {
  useLayoutEffect(() => {
    mats.forEach((m, i) => ref.current!.setMatrixAt(i, m));
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [mats, ref]);
}

// ───────────────────────── Altar of brass (2 Chr 4:1) ─────────────────────────

export function BrassAltar() {
  const b = brightBronze();
  const S = ALTAR.size;
  const H = ALTAR.height;
  const coal = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff6a1f', toneMapped: false }), []);
  const flame = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffb340', toneMapped: false }), []);
  const fire = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    fire.current?.children.forEach((c, i) => {
      c.scale.y = 1 + Math.sin(t * 5 + i * 1.7) * 0.25;
    });
  });
  const [ramp, kerbs] = useMemo(() => {
    // a wedge from the hearth's edge down to the pavement, on the south side, with a low kerb each side
    const top = H - 0.4;
    const wedge = (x0: number, x1: number, extra: number) => {
      const g = new THREE.BoxGeometry(x1 - x0, top, RAMP.length);
      g.translate((x0 + x1) / 2, top / 2, S / 2 + RAMP.length / 2);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        if (p.getY(i) > 0.01) p.setY(i, Math.max(0.02, top * (1 - (p.getZ(i) - S / 2) / RAMP.length)) + extra);
      }
      g.computeVertexNormals();
      worldUV(g, [8, 3]);
      return g;
    };
    const k = [wedge(RAMP.minX - 0.4, RAMP.minX, 0.7), wedge(RAMP.maxX, RAMP.maxX + 0.4, 0.7)];
    return [wedge(RAMP.minX, RAMP.maxX, 0), mergeGeometries(k)!];
  }, [H, S]);
  const horns: [number, number][] = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  return (
    <group userData={{ feature: 'altar' }}>
      <group position={[POS.altar[0], 0, POS.altar[1]]}>
        {/* the body, with a base course and a ledge halfway up */}
        <mesh position={[0, H / 2, 0]} material={b} castShadow receiveShadow>
          <boxGeometry args={[S, H, S]} />
        </mesh>
        <mesh position={[0, 0.5, 0]} material={b} castShadow receiveShadow>
          <boxGeometry args={[S + 1.2, 1, S + 1.2]} />
        </mesh>
        <mesh position={[0, H / 2, 0]} material={b} castShadow receiveShadow>
          <boxGeometry args={[S + 0.8, 0.5, S + 0.8]} />
        </mesh>
        <mesh position={[0, H - 0.25, 0]} material={b} castShadow>
          <boxGeometry args={[S + 0.3, 0.5, S + 0.3]} />
        </mesh>
        {horns.map(([sx, sz], i) => (
          <mesh key={i} position={[sx * (S / 2 - 0.6), H + 0.7, sz * (S / 2 - 0.6)]} material={b} castShadow>
            <coneGeometry args={[0.6, 1.4, 4]} />
          </mesh>
        ))}
        {/* the hearth */}
        <mesh position={[0, H + 0.12, 0]} material={coal}>
          <boxGeometry args={[S - 6, 0.25, S - 6]} />
        </mesh>
        <group ref={fire} position={[0, H + 0.25, 0]}>
          {[
            [0, 0, 2.6],
            [3, 2, 2],
            [-2.8, -1.6, 2.2],
            [1.6, -3, 1.8],
            [-2, 2.8, 1.9],
            [3.4, -1.2, 1.6],
            [-3.6, 0.8, 1.7],
          ].map(([x, z, h], i) => (
            <mesh key={i} position={[x, h / 2, z]} material={i % 2 ? coal : flame}>
              <coneGeometry args={[0.9, h, 6]} />
            </mesh>
          ))}
        </group>
        <pointLight position={[0, H + 3, 0]} color="#ff9a4a" intensity={10} distance={40} decay={1.4} />
        <Smoke y={H + 1.5} spread={3.2} count={14} color="#8a8178" scale={5} />
      </group>
      <mesh geometry={ramp} material={templeMaterials().stone} castShadow receiveShadow />
      <mesh geometry={kerbs} material={templeMaterials().stone} castShadow receiveShadow />
    </group>
  );
}

// ───────────────────────── The molten sea (1 Kgs 7:23-26) ─────────────────────────

/** A stylized ox facing +x, built to size in cubits: its back carries the sea at y = SEA.oxHeight. */
function oxGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const body = new THREE.SphereGeometry(1, 16, 10);
  body.scale(1.3, 0.62, 0.52);
  body.translate(0, 1.85, 0);
  parts.push(body);
  const hump = new THREE.SphereGeometry(0.45, 10, 8);
  hump.scale(1.1, 0.55, 1);
  hump.translate(0.6, 2.35, 0);
  parts.push(hump);
  const neck = new THREE.CylinderGeometry(0.3, 0.42, 0.8, 10);
  neck.rotateZ(-1.0);
  neck.translate(1.35, 1.95, 0);
  parts.push(neck);
  const head = new THREE.SphereGeometry(0.34, 10, 8);
  head.scale(1.35, 0.85, 0.85);
  head.translate(1.8, 1.75, 0);
  parts.push(head);
  for (const s of [1, -1]) {
    const horn = new THREE.ConeGeometry(0.07, 0.5, 6);
    horn.rotateX(s * 1.15);
    horn.translate(1.68, 2.08, s * 0.33);
    parts.push(horn);
    for (const x of [-0.85, 0.8]) {
      const leg = new THREE.CylinderGeometry(0.17, 0.13, 1.4, 8);
      leg.translate(x, 0.7, s * 0.26);
      parts.push(leg);
      const hoof = new THREE.CylinderGeometry(0.15, 0.17, 0.15, 8);
      hoof.translate(x, 0.075, s * 0.26);
      parts.push(hoof);
    }
  }
  const tail = new THREE.CylinderGeometry(0.04, 0.05, 1.2, 5);
  tail.rotateZ(-0.15);
  tail.translate(-1.32, 1.4, 0);
  parts.push(tail);
  const g = mergeGeometries(parts.map(bare))!;
  g.computeVertexNormals();
  return g;
}

export function MoltenSea() {
  const b = brightBronze();
  const R = SEA.radius;
  const base = SEA.oxHeight;
  const top = base + SEA.height;
  const hand = 1 / 6; // an handbreadth thick (1 Kgs 7:26)
  const { bowl, oxen, knops } = useMemo(() => {
    // outer face and inner face in one lathe: up the outside, over the lily brim, down the inside
    const outer: [number, number][] = [
      [0.01, base - 0.05],
      [1.8, base],
      [3.4, base + 0.6],
      [4.4, base + 1.8],
      [4.85, base + 3.4],
      [4.8, top - 0.6],
      [4.95, top - 0.1],
      [R, top],
    ];
    const inner: [number, number][] = [
      [R - 0.12, top + 0.04],
      [4.8 - hand, top - 0.4],
      [4.65 - hand, base + 3.4],
      [4.2 - hand, base + 1.8],
      [3.2 - hand, base + 0.7],
      [0.01, base + hand],
    ];
    const pts = [...outer, ...inner].map(([x, y]) => new THREE.Vector2(x, y));
    const bowl = new THREE.LatheGeometry(pts, 64);
    bowl.computeVertexNormals();

    // twelve oxen, three facing each way, hinder parts inward (1 Kgs 7:25)
    const oxen: THREE.Matrix4[] = [];
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const ring = 2.75;
    for (let d = 0; d < 4; d++) {
      const a = (d * Math.PI) / 2; // east, north, west, south
      for (const k of [-1, 0, 1]) {
        // the three of a group stand side by side round the ring, all looking nearly the same way
        const pa = a + (k * Math.PI) / 6;
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a + (k * Math.PI) / 18);
        oxen.push(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(pa) * ring, 0, -Math.sin(pa) * ring), q, one));
      }
    }
    // two rows of knops under the brim, ten in a cubit (1 Kgs 7:24)
    const knops: THREE.Matrix4[] = [];
    for (const [y, r] of [
      [top - 0.75, 4.86],
      [top - 1.1, 4.86],
    ]) {
      const n = 300; // ten in a cubit, round a line of thirty cubits
      for (let i = 0; i < n; i++) {
        const a = ((i + (y < top - 1 ? 0.5 : 0)) / n) * Math.PI * 2;
        knops.push(new THREE.Matrix4().makeTranslation(Math.cos(a) * r, y, Math.sin(a) * r));
      }
    }
    return { bowl, oxen, knops };
  }, [R, base, top, hand]);
  const oxRef = useRef<THREE.InstancedMesh>(null);
  const knopRef = useRef<THREE.InstancedMesh>(null);
  const oxGeo = useMemo(oxGeometry, []);
  const knopGeo = useMemo(() => new THREE.SphereGeometry(0.055, 6, 4), []);
  useInstances(oxRef, oxen);
  useInstances(knopRef, knops);
  // flowers of lilies round the brim (1 Kgs 7:26)
  const lilyRef = useRef<THREE.InstancedMesh>(null);
  const lilies = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2 - a, 0));
      out.push(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * (R - 0.08), top - 0.2, Math.sin(a) * (R - 0.08)), q, new THREE.Vector3(1, 1, 1)));
    }
    return out;
  }, [R, top]);
  const lilyGeo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(0.22, 0.42, 0.07);
    g.rotateX(0.7);
    return g;
  }, []);
  useInstances(lilyRef, lilies);
  return (
    <group position={[POS.sea[0], 0, POS.sea[1]]} userData={{ feature: 'sea' }}>
      <mesh geometry={bowl} material={b} castShadow receiveShadow />
      <mesh position={[0, top - 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.75 - hand, 48]} />
        <meshToonMaterial color="#5fa7cf" emissive="#173f5c" emissiveIntensity={0.45} />
      </mesh>
      <instancedMesh ref={oxRef} args={[oxGeo, b, 12]} castShadow receiveShadow />
      <instancedMesh ref={knopRef} args={[knopGeo, b, knops.length]} />
      <instancedMesh ref={lilyRef} args={[lilyGeo, b, lilies.length]} castShadow />
      <mesh position={[0, 0.15, 0]} material={templeMaterials().stone} receiveShadow>
        <cylinderGeometry args={[3.6, 3.8, 0.3, 32]} />
      </mesh>
    </group>
  );
}

// ───────────────────────── Ten bases with their lavers (1 Kgs 7:27-39) ─────────────────────────

/** One base, as one bronze geometry plus the four figured panels. Origin at its centre on the ground. */
function baseGeometry() {
  const L = 4; // 4 cubits square, 3 high (1 Kgs 7:27)
  const H = 3;
  const wheelR = 0.75; // a cubit and a half high (1 Kgs 7:32)
  const parts: THREE.BufferGeometry[] = [];
  const box = (sx: number, sy: number, sz: number, x: number, y: number, z: number) => {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    g.translate(x, y, z);
    parts.push(g);
  };
  // the ledges: corner posts and rails framing the borders (1 Kgs 7:28)
  for (const sx of [1, -1]) for (const sz of [1, -1]) box(0.3, H - 0.6, 0.3, sx * (L / 2 - 0.15), 0.6 + (H - 0.6) / 2, sz * (L / 2 - 0.15));
  for (const y of [1.25, H - 0.1]) {
    box(L, 0.2, 0.2, 0, y, L / 2 - 0.1);
    box(L, 0.2, 0.2, 0, y, -L / 2 + 0.1);
    box(0.2, 0.2, L, L / 2 - 0.1, y, 0);
    box(0.2, 0.2, L, -L / 2 + 0.1, y, 0);
  }
  // top plate and the round compass, half a cubit high (1 Kgs 7:35), the mouth 1½ cubits (7:31)
  box(L, 0.15, L, 0, H + 0.05, 0);
  const compass = new THREE.CylinderGeometry(0.75, 0.9, 0.5, 24);
  compass.translate(0, H + 0.38, 0);
  parts.push(compass);
  // undersetters: braces from the corners up to the laver (1 Kgs 7:30, 34)
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      const g = new THREE.CylinderGeometry(0.06, 0.08, 1.4, 6);
      g.rotateZ(-sx * 0.75);
      g.rotateY(sz * sx > 0 ? -Math.PI / 4 : Math.PI / 4);
      g.translate(sx * 1.3, H + 0.5, sz * 1.3);
      parts.push(g);
    }
  }
  // four wheels like chariot wheels: felloes, spokes and naves, axletrees joined to the base (1 Kgs 7:32-33)
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      const cx = sx * 1.2;
      const cz = sz * (L / 2 + 0.12);
      const rim = new THREE.TorusGeometry(wheelR - 0.06, 0.06, 6, 20);
      rim.translate(cx, wheelR, cz);
      parts.push(rim);
      const nave = new THREE.CylinderGeometry(0.12, 0.12, 0.26, 10);
      nave.rotateX(Math.PI / 2);
      nave.translate(cx, wheelR, cz);
      parts.push(nave);
      for (let k = 0; k < 6; k++) {
        const sp = new THREE.CylinderGeometry(0.03, 0.03, wheelR * 2 - 0.12, 5);
        sp.rotateZ((k * Math.PI) / 6);
        sp.translate(cx, wheelR, cz);
        parts.push(sp);
      }
    }
    const axle = new THREE.CylinderGeometry(0.05, 0.05, L + 0.3, 6);
    axle.rotateX(Math.PI / 2);
    axle.translate(sx * 1.2, wheelR, 0);
    parts.push(axle);
  }
  // the laver: four cubits across, forty baths (1 Kgs 7:38)
  const laver = lathe(
    [
      [0.7, H + 0.55],
      [1.3, H + 0.75],
      [1.8, H + 1.3],
      [2.0, H + 2.0],
      [2.05, H + 2.15],
    ],
    32,
    16,
  );
  parts.push(laver);
  const metal = mergeGeometries(parts.map(bare))!;
  metal.computeVertexNormals();

  // the borders between the ledges, cast with lions, oxen, cherubim and palm trees (1 Kgs 7:29, 36)
  const panels: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 4; k++) {
    const g = new THREE.PlaneGeometry(L - 0.3, H - 1.45);
    g.translate(0, 1.35 + (H - 1.45) / 2, L / 2 - 0.12);
    g.rotateY((k * Math.PI) / 2);
    panels.push(g);
  }
  const panel = mergeGeometries(panels)!;
  return { metal, panel };
}

export function Bases() {
  const b = brightBronze();
  const panelMat = useMemo(
    () => toon('t-basePanel', { map: tex(basePanelTexture(), false), emissive: '#2a1200', emissiveIntensity: 0.3, side: THREE.DoubleSide }),
    [],
  );
  const water = useMemo(() => toon('t-laverWater', { color: '#5fa7cf', emissive: '#173f5c', emissiveIntensity: 0.45 }), []);
  const { metal, panel } = useMemo(baseGeometry, []);
  const waterGeo = useMemo(() => {
    const g = new THREE.CircleGeometry(1.85, 28);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 4.9, 0);
    return g;
  }, []);
  const at = useMemo(
    () => POS.basesX.flatMap((x) => [1, -1].map((s) => new THREE.Matrix4().makeTranslation(x, 0, s * POS.basesZ))),
    [],
  );
  const a = useRef<THREE.InstancedMesh>(null);
  const p = useRef<THREE.InstancedMesh>(null);
  const w = useRef<THREE.InstancedMesh>(null);
  useInstances(a, at);
  useInstances(p, at);
  useInstances(w, at);
  return (
    <group userData={{ feature: 'bases' }}>
      <instancedMesh ref={a} args={[metal, b, at.length]} castShadow receiveShadow />
      <instancedMesh ref={p} args={[panel, panelMat, at.length]} receiveShadow />
      <instancedMesh ref={w} args={[waterGeo, water, at.length]} />
    </group>
  );
}
