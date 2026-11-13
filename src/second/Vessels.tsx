import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Smoke } from '../scene/Furniture';
import { bronze, toon } from '../scene/materials';
import { Mason, worldUV } from '../temple/mason';
import { brightBronze } from '../temple/Pillars';
import { cedarTexture, tex } from '../temple/textures';
import { ALTAR, LAVER, POS, RAMP, Y } from './dims';

/**
 * The altar of unhewn stones, whitened (Middot 3:1-4): a base a cubit high and 32 square, then 5
 * cubits up to 30 square, then 3 up to 28, with horns a cubit each and the priests' ledge round the
 * top, leaving 24 square for the fire. A red line runs round the middle.
 */
export function Altar() {
  const cx = (ALTAR.minX + ALTAR.maxX) / 2;
  const geos = useMemo(() => {
    const m = new Mason({ stone: [4, 2], line: [4, 1] });
    const sq = (half: number, y0: number, y1: number, key = 'stone') => m.box(key, cx - half, cx + half, y0, y1, -half, half);
    sq(16, 0, 1);
    sq(15, 1, 6);
    sq(14, 6, 9);
    // the red line, halfway up
    m.box('line', cx - 15.03, cx + 15.03, 3.3, 3.7, -15.03, 15.03);
    // the horns, a cubit square and a cubit high
    for (const sx of [1, -1]) for (const sz of [1, -1]) m.box('stone', cx + sx * 14 - (sx > 0 ? 1 : 0), cx + sx * 14 + (sx > 0 ? 0 : 1), 9, 10, sz * 14 - (sz > 0 ? 1 : 0), sz * 14 + (sz > 0 ? 0 : 1));
    // the ramp on the south, 32 long and 16 broad (Middot 3:3)
    const top = ALTAR.height - 0.3;
    const g = new THREE.BoxGeometry(RAMP.maxX - RAMP.minX, top, RAMP.z1 - RAMP.z0);
    g.translate((RAMP.minX + RAMP.maxX) / 2, top / 2, (RAMP.z0 + RAMP.z1) / 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0.01) p.setY(i, Math.max(0.05, top * (1 - (p.getZ(i) - RAMP.z0) / (RAMP.z1 - RAMP.z0))));
    g.computeVertexNormals();
    worldUV(g, [4, 2]);
    const built = m.build();
    built.stone = mergeGeometries([built.stone, g.index ? g.toNonIndexed() : g].map((x) => (x.index ? x.toNonIndexed() : x)))!;
    return built;
  }, [cx]);
  const mats = useMemo(
    () => ({
      stone: toon('s-altarStone', { color: '#efe9de', map: tex(roughStoneTexture()) }),
      line: toon('s-redLine', { color: '#9c2a22' }),
    }),
    [],
  );
  const coal = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff6a1f', toneMapped: false }), []);
  const flame = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffb340', toneMapped: false }), []);
  const fire = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    fire.current?.children.forEach((c, i) => {
      c.scale.y = 1 + Math.sin(t * 5 + i * 1.7) * 0.25;
    });
  });
  return (
    <group position={[0, Y.priests, 0]} userData={{ feature: 'altar' }}>
      {Object.entries(geos).map(([k, g]) => (
        <mesh key={k} geometry={g} material={mats[k as keyof typeof mats]} castShadow receiveShadow />
      ))}
      {/* the great fire on the hearth (Lev 6:13) */}
      <mesh position={[cx - 3, ALTAR.height + 0.05, -2]} rotation={[-Math.PI / 2, 0, 0]} material={coal}>
        <circleGeometry args={[4.5, 20]} />
      </mesh>
      <group ref={fire} position={[cx - 3, ALTAR.height, -2]}>
        {[
          [0, 0, 2.6],
          [1.6, 1, 1.8],
          [-1.5, 0.6, 2],
          [0.6, -1.6, 1.6],
          [-0.8, -1.2, 1.4],
        ].map(([x, z, h], i) => (
          <mesh key={i} position={[x, h / 2, z]} material={flame}>
            <coneGeometry args={[0.7, h, 7]} />
          </mesh>
        ))}
      </group>
      <group position={[cx - 3, ALTAR.height + 1, -2]}>
        <Smoke y={0} spread={2} count={18} color="#d9d2c8" scale={3} />
      </group>
    </group>
  );
}

let roughCache: THREE.Texture | null = null;
/** Whole fieldstones, whitewashed, with their joints showing through. */
function roughStoneTexture() {
  if (roughCache) return roughCache;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f2ede3';
  ctx.fillRect(0, 0, 256, 256);
  let s = 77;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  ctx.strokeStyle = 'rgba(120,105,85,0.45)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    const x = rnd() * 256;
    const y = rnd() * 256;
    const r = 18 + rnd() * 26;
    ctx.beginPath();
    for (let k = 0; k <= 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      const rr = r * (0.75 + rnd() * 0.4);
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr * 0.7;
      if (k) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,250' : '150,135,110'},${0.12 * rnd()})`;
    ctx.fillRect(rnd() * 256, rnd() * 256, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (roughCache = t);
}

/** The laver of bronze between the porch and the altar, drawn to the south, with twelve spigots (Middot 3:6; Yoma 3:10). */
export function Laver() {
  const parts = useMemo(() => {
    const body = new THREE.LatheGeometry(
      [
        [0, 0],
        [1.3, 0],
        [1.1, 0.4],
        [0.7, 0.9],
        [0.7, 2],
        [1.6, 2.4],
        [LAVER.r, 3.2],
        [LAVER.r, 4.4],
        [LAVER.r - 0.15, 4.4],
        [LAVER.r - 0.15, 3.4],
        [0, 3.4],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
      28,
    );
    const spigots: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const g = new THREE.CylinderGeometry(0.09, 0.09, 0.7, 6);
      g.rotateZ(Math.PI / 2 - 0.4);
      g.rotateY(-a);
      g.translate(Math.cos(a) * (LAVER.r + 0.3), 3.5, Math.sin(a) * (LAVER.r + 0.3));
      spigots.push(g.toNonIndexed());
    }
    return { body, spigots: mergeGeometries(spigots.map((g) => { g.deleteAttribute('uv'); return g; }))! };
  }, []);
  return (
    <group position={[LAVER.x, Y.priests, LAVER.z]} userData={{ feature: 'laver' }}>
      <mesh geometry={parts.body} material={brightBronze()} castShadow receiveShadow />
      <mesh geometry={parts.spigots} material={bronze()} castShadow />
      <mesh position={[0, 4.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[LAVER.r - 0.15, 28]} />
        <meshStandardMaterial color="#6f8c8f" roughness={0.1} metalness={0.2} />
      </mesh>
    </group>
  );
}

/** North of the altar: low pillars with cedar blocks and hooks, and marble tables (Middot 3:5). */
export function Slaughter() {
  const geos = useMemo(() => {
    const m = new Mason({ stone: [4, 2], cedar: [2, 4], marble: [4, 4] });
    for (const x of POS.pillarsX) {
      for (const z of POS.pillarsZ) {
        m.box('stone', x - 0.6, x + 0.6, 0, 4, z - 0.6, z + 0.6);
        m.box('cedar', x - 1.6, x + 1.6, 4, 4.8, z - 0.8, z + 0.8);
      }
    }
    for (const x of POS.tablesX) {
      m.box('marble', x - 1.5, x + 1.5, 2.2, 2.6, POS.tablesZ - 1, POS.tablesZ + 1);
      for (const sx of [1, -1]) m.box('marble', x + sx * 1.1 - 0.25, x + sx * 1.1 + 0.25, 0, 2.2, POS.tablesZ - 0.7, POS.tablesZ + 0.7);
    }
    return m.build();
  }, []);
  const mats = useMemo(
    () => ({
      stone: toon('s-pillarStone', { color: '#e6dccb' }),
      cedar: toon('s-cedarBlock', { map: tex(cedarTexture()) }),
      marble: toon('s-tableMarble', { color: '#f3efe8' }),
    }),
    [],
  );
  const hooks = useMemo(() => {
    const out: THREE.BufferGeometry[] = [];
    for (const x of POS.pillarsX) {
      for (const z of POS.pillarsZ) {
        for (const dx of [-1.1, -0.4, 0.4, 1.1]) {
          const g = new THREE.TorusGeometry(0.16, 0.035, 4, 8, Math.PI * 1.4);
          g.rotateY(Math.PI / 2);
          g.translate(x + dx, 3.75, z + 0.85);
          out.push(g.toNonIndexed());
        }
      }
    }
    return mergeGeometries(out.map((g) => { g.deleteAttribute('uv'); return g; }))!;
  }, []);
  return (
    <group position={[0, Y.priests, 0]} userData={{ feature: 'slaughter' }}>
      {Object.entries(geos).map(([k, g]) => (
        <mesh key={k} geometry={g} material={mats[k as keyof typeof mats]} castShadow receiveShadow />
      ))}
      <mesh geometry={hooks} material={toon('s-iron', { color: '#55504a' })} />
    </group>
  );
}
