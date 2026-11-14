import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Smoke } from '../scene/Furniture';
import { TOON, toon } from '../scene/materials';
import { sandTexture } from '../scene/textures';
import { Mason } from '../temple/mason';
import { pavementTexture, tex } from '../temple/textures';
import {
  BUILDING,
  GATE,
  GATE_PARTS,
  GATES,
  INNER,
  KITCHEN,
  OUTER_CHAMBER,
  PAVEMENT,
  PRIESTS,
  PRIESTS_KITCHEN,
  SEPARATE,
  SINGERS,
  STONE_TABLE,
  TABLE,
  TERRACE,
  WALL,
  Y,
  gateToWorld,
} from './dims';
import { ezekielMaterials, TILES } from './materials';

/** A horizontal plane, UVs one tile per 6 cubits in world space. */
export function floorGeometry(x0: number, x1: number, z0: number, z1: number, y: number, tile = 6) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / tile, -p.getZ(i) / tile);
  return g;
}

/** Runs of wall along x (at z0..z1) or z, from a to b, with gaps. */
function run(m: Mason, key: string, axis: 'x' | 'z', a: number, b: number, y0: number, y1: number, t0: number, t1: number, gaps: [number, number][] = []) {
  m.wall(key, axis, a, b, y0, y1, t0, t1, gaps.map(([g0, g1]): [number, number, number, number] => [g0, g1, y0 - 20, y1 + 20]));
}

/** A building of chambers: a block with a flat roof, doors and windows toward the court. `face` is the side its doors look to. */
function chamberBlock(m: Mason, x0: number, x1: number, z0: number, z1: number, y0: number, h: number, face: 'n' | 's' | 'e' | 'w', doors: number[]) {
  m.box('stone', x0, x1, y0, y0 + h, z0, z1);
  m.box('roof', x0 - 0.3, x1 + 0.3, y0 + h, y0 + h + 0.6, z0 - 0.3, z1 + 0.3);
  for (const c of doors) {
    if (face === 'n') m.box('dark', c - 1.5, c + 1.5, y0, y0 + 6, z0 - 0.05, z0);
    if (face === 's') m.box('dark', c - 1.5, c + 1.5, y0, y0 + 6, z1, z1 + 0.05);
    if (face === 'e') m.box('dark', x1, x1 + 0.05, y0, y0 + 6, c - 1.5, c + 1.5);
    if (face === 'w') m.box('dark', x0 - 0.05, x0, y0, y0 + 6, c - 1.5, c + 1.5);
  }
}

function buildCourts() {
  const m = new Mason(TILES);
  const W = WALL.half;
  const t = WALL.t;
  const top = WALL.top;
  const gap: [number, number][] = [[-GATE.half, GATE.half]];

  // the platform of the outer court, and the wall round about, a reed thick and a reed high (40:5)
  m.box('stone', -W + t, W - t, -2, Y.outer, -W + t, W - t);
  run(m, 'stone', 'x', -W, W, -1, top, -W, -W + t, gap);
  run(m, 'stone', 'x', -W, W, -1, top, W - t, W, gap);
  run(m, 'stone', 'z', -W + t, W - t, -1, top, -W, -W + t);
  run(m, 'stone', 'z', -W + t, W - t, -1, top, W - t, W, gap);
  // a coping, and a plinth outside
  run(m, 'white', 'x', -W - 0.4, W + 0.4, top, top + 0.7, -W - 0.4, -W + t + 0.4, gap);
  run(m, 'white', 'x', -W - 0.4, W + 0.4, top, top + 0.7, W - t - 0.4, W + 0.4, gap);
  run(m, 'white', 'z', -W + t + 0.4, W - t - 0.4, top, top + 0.7, -W - 0.4, -W + t + 0.4);
  run(m, 'white', 'z', -W + t + 0.4, W - t - 0.4, top, top + 0.7, W - t - 0.4, W + 0.4, gap);
  run(m, 'white', 'x', -W - 0.8, W + 0.8, -1, 1, -W - 0.8, -W, gap);
  run(m, 'white', 'x', -W - 0.8, W + 0.8, -1, 1, W, W + 0.8, gap);
  run(m, 'white', 'z', -W, W, -1, 1, -W - 0.8, -W);
  run(m, 'white', 'z', -W, W, -1, 1, W, W + 0.8, gap);

  // thirty chambers upon the pavement, ten on each side with a gate (40:17)
  const C = OUTER_CHAMBER;
  const inner = W - t;
  for (const [a, b] of C.spans) {
    for (const s of [1, -1]) {
      const [x0, x1] = s > 0 ? [a, b] : [-b, -a];
      chamberBlock(m, x0, x1, -inner, -inner + C.depth, Y.outer, C.height, 's', [(x0 + x1) / 2]);
      chamberBlock(m, x0, x1, inner - C.depth, inner, Y.outer, C.height, 'n', [(x0 + x1) / 2]);
      chamberBlock(m, inner - C.depth, inner, x0, x1, Y.outer, C.height, 'w', [(x0 + x1) / 2]);
    }
  }

  // the four courts in the corners, 40 by 30, with boiling places round about under the rows (46:21-23)
  const K = KITCHEN;
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      const xIn = sx * (inner - K.long);
      const zIn = sz * (inner - K.broad);
      const [xa, xb] = sx > 0 ? [xIn, inner] : [-inner, xIn];
      const [za, zb] = sz > 0 ? [zIn, inner] : [-inner, zIn];
      const doorX = (xa + xb) / 2;
      run(m, 'stone', 'x', xa - K.wall / 2, xb, Y.outer, Y.outer + K.height, zIn - K.wall / 2, zIn + K.wall / 2, [[doorX - 3, doorX + 3]]);
      run(m, 'stone', 'z', za, zb, Y.outer, Y.outer + K.height, xIn - K.wall / 2, xIn + K.wall / 2);
      // the row of hearths along the outer walls
      const hx = sx > 0 ? [inner - 3, inner] : [-inner, -inner + 3];
      const hz = sz > 0 ? [inner - 3, inner] : [-inner, -inner + 3];
      m.box('white', xa + 1, xb - 1, Y.outer, Y.outer + 3, hz[0], hz[1]);
      m.box('white', hx[0], hx[1], Y.outer, Y.outer + 3, za + 1, zb - 1);
      for (let i = 0; i < 6; i++) {
        const x = xa + 4 + i * ((xb - xa - 8) / 5);
        m.box('dark', x - 0.8, x + 0.8, Y.outer + 0.3, Y.outer + 1.6, sz > 0 ? hz[0] - 0.05 : hz[1], sz > 0 ? hz[0] : hz[1] + 0.05);
      }
    }
  }

  // the raised ground of the inner court and of the separate place round the house
  m.box('stone', TERRACE.minX, TERRACE.maxX + INNER.wall, Y.outer - 0.5, Y.inner, -TERRACE.half - INNER.wall, TERRACE.half + INNER.wall);
  // the inner court's wall, with its gates on the north, south and east (not measured)
  const iTop = Y.inner + INNER.height;
  run(m, 'stone', 'x', -INNER.half, INNER.half + INNER.wall, Y.inner, iTop, -INNER.half - INNER.wall, -INNER.half, gap);
  run(m, 'stone', 'x', -INNER.half, INNER.half + INNER.wall, Y.inner, iTop, INNER.half, INNER.half + INNER.wall, gap);
  run(m, 'stone', 'z', -INNER.half, INNER.half, Y.inner, iTop, INNER.half, INNER.half + INNER.wall, gap);
  run(m, 'white', 'x', -INNER.half, INNER.half + INNER.wall + 0.3, iTop, iTop + 0.6, -INNER.half - INNER.wall - 0.3, -INNER.half + 0.3, gap);
  run(m, 'white', 'x', -INNER.half, INNER.half + INNER.wall + 0.3, iTop, iTop + 0.6, INNER.half - 0.3, INNER.half + INNER.wall + 0.3, gap);
  run(m, 'white', 'z', -INNER.half, INNER.half, iTop, iTop + 0.6, INNER.half - 0.3, INNER.half + INNER.wall + 0.3, gap);
  // a low parapet along the separate place's edge
  for (const s of [1, -1]) m.box('white', SEPARATE.minX, SEPARATE.maxX, Y.inner, Y.inner + 1.2, s > 0 ? INNER.half : -INNER.half - 1, s > 0 ? INNER.half + 1 : -INNER.half);

  // chambers in the inner court by the north and south gates, for the priests (40:44-46)
  chamberBlock(m, SINGERS.minX, SINGERS.maxX, -INNER.half, -INNER.half + SINGERS.depth, Y.inner, SINGERS.height, 's', [(SINGERS.minX + SINGERS.maxX) / 2]);
  chamberBlock(m, SINGERS.minX, SINGERS.maxX, INNER.half - SINGERS.depth, INNER.half, Y.inner, SINGERS.height, 'n', [(SINGERS.minX + SINGERS.maxX) / 2]);

  // the priests' holy chambers, gallery against gallery in three storeys, the upper ones shorter (42:1-12)
  const P = PRIESTS;
  for (const s of [1, -1]) {
    const zz = (a: number, b: number): [number, number] => (s > 0 ? [a, b] : [-b, -a]);
    for (let k = 0; k < 3; k++) {
      const y0 = Y.outer + k * P.storey;
      const y1 = y0 + P.storey;
      // the long row toward the house, stepping back from the walk
      m.box('stone', P.minX, P.maxX, y0, y1, ...zz(P.innerRow[0], P.innerRow[1] - k * 2.5));
      // the short row toward the outer court, stepping back from the walk
      m.box('stone', P.outerMinX, P.maxX, y0, y1, ...zz(P.outerRow[0] + k * 2.5, P.outerRow[1]));
      // galleries: a ledge at each storey along the walk
      if (k > 0) {
        m.box('white', P.minX, P.maxX, y0 - 0.5, y0, ...zz(P.innerRow[1] - k * 2.5, P.innerRow[1] - k * 2.5 + 1.2));
        m.box('white', P.outerMinX, P.maxX, y0 - 0.5, y0, ...zz(P.outerRow[0] + k * 2.5 - 1.2, P.outerRow[0] + k * 2.5));
      }
      // doors and windows on the walk, "their doors toward the north" (42:4, 11)
      for (let x = P.minX + 6; x < P.maxX - 3; x += 9) {
        const zf = P.innerRow[1] - k * 2.5;
        m.box('dark', x - 1, x + 1, y0 + 0.4, y0 + (k ? 3.4 : 4.6), ...zz(zf, zf + 0.05));
      }
      for (let x = P.outerMinX + 6; x < P.maxX - 3; x += 9) {
        const zf = P.outerRow[0] + k * 2.5;
        m.box('dark', x - 1, x + 1, y0 + 0.4, y0 + (k ? 3.4 : 4.6), ...zz(zf - 0.05, zf));
      }
    }
    m.box('roof', P.minX, P.maxX, Y.outer + 18, Y.outer + 18.6, ...zz(P.innerRow[0], P.innerRow[1] - 5));
    m.box('roof', P.outerMinX, P.maxX, Y.outer + 18, Y.outer + 18.6, ...zz(P.outerRow[0] + 5, P.outerRow[1]));
    // the wall before the shorter row, fifty long (42:7)
    m.box('stone', P.minX, P.outerMinX, Y.outer, Y.outer + 6, ...zz(P.outerRow[1] - 1, P.outerRow[1]));
    m.box('white', P.minX - 0.3, P.outerMinX, Y.outer + 6, Y.outer + 6.5, ...zz(P.outerRow[1] - 1.3, P.outerRow[1] + 0.3));

    // the places westward where the priests boil and bake (46:19-20)
    const K = PRIESTS_KITCHEN;
    const [kz0, kz1] = zz(K.z0, K.z1);
    m.box('stone', K.minX, K.maxX, Y.outer, Y.outer + K.height, ...zz(K.z1 - 1, K.z1));
    m.wall('stone', 'z', kz0, kz1, Y.outer, Y.outer + K.height, K.minX, K.minX + 1, [[(kz0 + kz1) / 2 - 2.5, (kz0 + kz1) / 2 + 2.5, Y.outer - 1, Y.outer + 6]]);
    m.box('white', K.minX + 1, K.maxX, Y.outer, Y.outer + 3, ...zz(K.z0, K.z0 + 3));
  }

  // the building at the west, behind the separate place, its walls five thick (41:12)
  const B = BUILDING;
  m.box('stone', B.minX + t, B.maxX, -1, Y.outer + B.height, -B.half, B.half);
  m.box('white', B.minX + t, B.maxX + 0.4, Y.outer + B.height, Y.outer + B.height + 0.8, -B.half - 0.4, B.half + 0.4);
  m.box('dark', B.maxX, B.maxX + 0.05, Y.inner, Y.inner + 10, -3, 3);
  for (const z of [-30, -15, 15, 30]) m.box('dark', B.maxX, B.maxX + 0.05, Y.inner + 12, Y.inner + 16, z - 0.5, z + 0.5);
  return m.build();
}

/** The tables at the inner north gate (40:39-43): eight for slaying, two and two in its porch and beside its steps, and four of hewn stone. */
function buildTables() {
  const m = new Mason(TILES);
  const g = GATES.find((x) => x.id === 'innerNorth')!;
  const porch = GATE_PARTS.inner.porch;
  const put = (key: string, u: number, v: number, y: number, lu: number, lv: number, h: number) => {
    const [x, z] = gateToWorld(g, u, v);
    // the north gate's u runs along z, v along -x
    m.box(key, x - lv / 2, x + lv / 2, y, y + h, z - lu / 2, z + lu / 2);
  };
  for (const s of [1, -1]) {
    for (const u of [porch[0] + 2, porch[1] - 2]) put('white', u, s * 8.2, Y.inner, TABLE.long, TABLE.broad, TABLE.height);
    for (const u of [-2.5, -6]) put('white', u, s * 9.5, Y.outer, TABLE.long, TABLE.broad, TABLE.height);
    for (const u of [-3, -6.5]) put('stone', u, s * 14, Y.outer, STONE_TABLE.side, STONE_TABLE.side, STONE_TABLE.height);
  }
  return m.build();
}

/** The positions of the tables, for the nav grid: [x, z, half x, half z]. */
export function tableRects(): [number, number, number, number][] {
  const g = GATES.find((x) => x.id === 'innerNorth')!;
  const porch = GATE_PARTS.inner.porch;
  const out: [number, number, number, number][] = [];
  const add = (u: number, v: number, lu: number, lv: number) => {
    const [x, z] = gateToWorld(g, u, v);
    out.push([x - lv / 2, z - lu / 2, x + lv / 2, z + lu / 2]);
  };
  for (const s of [1, -1]) {
    for (const u of [porch[0] + 2, porch[1] - 2]) add(u, s * 8.2, TABLE.long, TABLE.broad);
    for (const u of [-2.5, -6]) add(u, s * 9.5, TABLE.long, TABLE.broad);
    for (const u of [-3, -6.5]) add(u, s * 14, STONE_TABLE.side, STONE_TABLE.side);
  }
  return out;
}

export function Courts() {
  const geos = useMemo(buildCourts, []);
  const tables = useMemo(buildTables, []);
  const mats = ezekielMaterials();
  const floors = useMemo(() => {
    const W = WALL.half - WALL.t;
    const P = PAVEMENT;
    return {
      // the lower pavement round about, as broad as the gates are long (40:17-18)
      band: mergeGeometries([
        floorGeometry(-W, W, -W, -P, Y.outer + 0.02),
        floorGeometry(-W, W, P, W, Y.outer + 0.02),
        floorGeometry(-W, -P, -P, P, Y.outer + 0.02),
        floorGeometry(P, W, -P, P, Y.outer + 0.02),
      ])!,
      ground: floorGeometry(-P, P, -P, P, Y.outer + 0.015, 40),
      inner: mergeGeometries([
        floorGeometry(-INNER.half, INNER.half + INNER.wall, -INNER.half, INNER.half, Y.inner + 0.02),
        floorGeometry(SEPARATE.minX, SEPARATE.maxX, -SEPARATE.half, SEPARATE.half, Y.inner + 0.02),
      ])!,
    };
  }, []);
  const fm = useMemo(
    () => ({
      band: toon('e-band', { map: tex(pavementTexture('e-band', '#d8c7a2')), polygonOffset: true, polygonOffsetFactor: -1 }),
      ground: toon('e-ground', { map: sandTexture(), color: TOON ? '#ffffff' : '#efe3cc', polygonOffset: true, polygonOffsetFactor: -1 }),
      inner: toon('e-innerPave', { map: tex(pavementTexture('e-innerPave', '#ebe1cb')), polygonOffset: true, polygonOffsetFactor: -1 }),
    }),
    [],
  );
  const W = WALL.half - WALL.t;
  const K = KITCHEN;
  return (
    <group>
      <group userData={{ feature: 'outer' }}>
        {Object.entries(geos).map(([k, g]) => (
          <mesh key={k} geometry={g} material={mats[k]} castShadow receiveShadow />
        ))}
      </group>
      <mesh geometry={floors.band} material={fm.band} receiveShadow userData={{ feature: 'outer' }} />
      <mesh geometry={floors.ground} material={fm.ground} receiveShadow userData={{ feature: 'outer' }} />
      <mesh geometry={floors.inner} material={fm.inner} receiveShadow userData={{ feature: 'inner' }} />
      <group userData={{ feature: 'tables' }}>
        {Object.entries(tables).map(([k, g]) => (
          <mesh key={k} geometry={g} material={mats[k]} castShadow receiveShadow />
        ))}
      </group>
      {/* smoke from the boiling places in the four corners */}
      {[1, -1].flatMap((sx) =>
        [1, -1].map((sz) => (
          <group key={`${sx}${sz}`} position={[sx * (W - K.long / 2), Y.outer + 3, sz * (W - 1.5)]} userData={{ feature: 'kitchens' }}>
            <Smoke y={0} spread={2} count={6} color="#d8d0c4" scale={2} />
          </group>
        )),
      )}
    </group>
  );
}
