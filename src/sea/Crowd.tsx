import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon } from '../scene/materials';
import { DEBUG } from '../scene/dims';
import { player } from '../scene/Player';
import { CROWD_MAX, CROWD_MIN_STOP, WALK_HALF, groundH, rng, vnoise } from './dims';
import { tide } from './tide';

/*
 * The children of Israel, "about six hundred thousand on foot that were men, beside children",
 * with a mixed multitude, "and flocks, and herds, even very much cattle" (Ex 12:37-38).
 * A few hundred walkers are kept around you and recycled as you go.
 *
 * Each figure is jointed so it reads as a person at a glance: a head on a neck, a nose to show
 * which way it faces, a headcloth, veil or hair (and some beards), a belted robe to mid-calf,
 * arms that swing with hands, and legs that stride in sandals. Parts are instanced, one draw call
 * each, and posed every frame. Local frame: +x forward, +y up, z across; a person is 1 unit tall.
 */

const PEOPLE = 480;
const SHEEP = 80;
const CATTLE = 18;
const AHEAD = 900;
const BEHIND = 500;
const DRAW = 640;

/* ------------------------------------------------------------------ geometry */

function paint(g: THREE.BufferGeometry, k = 1) {
  const g2 = g.index ? g.toNonIndexed() : g;
  const n = g2.attributes.position.count;
  g2.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(k), 3));
  return g2;
}
const merge = (...gs: THREE.BufferGeometry[]) => mergeGeometries(gs.map((g) => (g.attributes.color ? g : paint(g))))!;

const NECK_Y = 0.8;
const HIP_Y = 0.46;
const SHOULDER_Y = 0.765;
const SHOULDER_Z = 0.135;
const ELBOW = 0.35;
const HAND = new THREE.Vector3(Math.sin(ELBOW) * 0.17 + 0.006, -0.18 - Math.cos(ELBOW) * 0.17 - 0.012, 0);

function personGeometries() {
  // robe: a tunic from the shoulders to mid-calf, flattened front to back, with a darker sash
  const prof: [number, number][] = [
    [0.16, 0.235], [0.157, 0.3], [0.138, 0.42], [0.12, 0.5], [0.122, 0.56], [0.13, 0.64],
    [0.142, 0.72], [0.142, 0.76], [0.118, 0.795], [0.06, 0.815], [0.0, 0.82],
  ];
  const robe = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 12).toNonIndexed();
  robe.scale(0.74, 1, 1);
  const rp = robe.attributes.position;
  const rc = new Float32Array(rp.count * 3);
  for (let i = 0; i < rp.count; i++) {
    const y = rp.getY(i);
    const k = y > 0.5 && y < 0.56 ? 0.55 : y < 0.25 ? 0.82 : 1; // sash, and a worn hem
    rc.fill(k, i * 3, i * 3 + 3);
  }
  robe.setAttribute('color', new THREE.BufferAttribute(rc, 3));

  // head parts are built about the base of the neck, so the head can turn and children's be larger
  const at = (g: THREE.BufferGeometry, x: number, y: number, z = 0) => g.translate(x, y - NECK_Y, z);
  const head = merge(
    at(new THREE.CylinderGeometry(0.032, 0.036, 0.09, 8), 0, 0.835),
    at(new THREE.SphereGeometry(0.068, 12, 9).scale(0.95, 1.05, 0.92), 0.004, 0.915),
    at(new THREE.ConeGeometry(0.016, 0.04, 5).rotateZ(-Math.PI / 2), 0.07, 0.905), // nose
  );
  const cover = merge(
    paint(at(new THREE.SphereGeometry(0.075, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), -0.004, 0.918)),
    paint(at(new THREE.CylinderGeometry(0.073, 0.115, 0.15, 12, 1, true, Math.PI * 0.92, Math.PI * 1.16).scale(0.9, 1, 1), -0.01, 0.85), 0.9),
    paint(at(new THREE.TorusGeometry(0.072, 0.009, 5, 14).rotateX(Math.PI / 2), -0.002, 0.945), 0.45), // the band
  );
  const veil = merge(
    paint(at(new THREE.SphereGeometry(0.077, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.58), -0.004, 0.918)),
    paint(at(new THREE.CylinderGeometry(0.074, 0.15, 0.32, 12, 1, true, Math.PI * 0.9, Math.PI * 1.2).scale(0.85, 1, 1), -0.02, 0.77), 0.92),
  );
  const hair = merge(
    at(new THREE.SphereGeometry(0.071, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), -0.006, 0.92),
    at(new THREE.SphereGeometry(0.06, 8, 6).scale(0.7, 0.9, 1), -0.03, 0.9),
  );
  const beard = merge(at(new THREE.SphereGeometry(0.05, 8, 6).scale(0.7, 1.05, 1.08), 0.04, 0.87));

  const upper = new THREE.CylinderGeometry(0.03, 0.035, 0.19, 7).translate(0, -0.09, 0);
  const fore = new THREE.CylinderGeometry(0.025, 0.03, 0.18, 7).translate(0, -0.085, 0).rotateZ(ELBOW).translate(0, -0.18, 0);
  const arm = merge(upper, fore);
  const hand = merge(new THREE.SphereGeometry(0.031, 7, 5).scale(1, 1.2, 0.8));
  const leg = merge(
    paint(new THREE.CylinderGeometry(0.034, 0.042, 0.44, 7).translate(0, -0.22, 0)),
    paint(new THREE.BoxGeometry(0.1, 0.03, 0.058).translate(0.028, -0.448, 0), 0.42), // sandal
  );
  return {
    robe,
    head,
    cover,
    veil,
    hair,
    beard,
    arm,
    hand,
    leg,
    // Ex 12:34, "their kneadingtroughs being bound up in their clothes upon their shoulders"
    bundle: merge(new THREE.BoxGeometry(0.2, 0.11, 0.18).translate(0, 1.035, 0)),
    shoulderPack: merge(new THREE.SphereGeometry(0.1, 8, 6).scale(1.15, 0.85, 0.8).translate(-0.04, 0.845, 0.115)),
    backPack: merge(new THREE.SphereGeometry(0.11, 8, 6).scale(0.75, 1.2, 1.05).translate(-0.15, 0.6, 0)),
    staff: merge(new THREE.CylinderGeometry(0.011, 0.013, 1.08, 5).translate(0, 0.2, 0)),
  };
}

/** Sheep and cattle: a body, a head with ears (and horns on cattle), four legs. Units are cubits. */
function beastGeometries(kind: 'sheep' | 'cattle') {
  if (kind === 'sheep') {
    const body = new THREE.IcosahedronGeometry(1, 1);
    const p = body.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const d = 1 + (vnoise(p.getX(i) * 3 + 2, p.getZ(i) * 3 + p.getY(i) * 2) - 0.5) * 0.35; // wool
      p.setXYZ(i, p.getX(i) * d, p.getY(i) * d, p.getZ(i) * d);
    }
    body.scale(1.2, 0.62, 0.6).translate(0, 1.25, 0);
    body.computeVertexNormals();
    return {
      body: merge(body),
      head: merge(
        new THREE.SphereGeometry(1, 9, 7).scale(0.36, 0.26, 0.22).rotateZ(-0.5).translate(1.3, 1.5, 0),
        new THREE.BoxGeometry(0.22, 0.06, 0.14).rotateX(0.5).translate(1.18, 1.62, 0.22),
        new THREE.BoxGeometry(0.22, 0.06, 0.14).rotateX(-0.5).translate(1.18, 1.62, -0.22),
      ),
      leg: merge(new THREE.CylinderGeometry(0.06, 0.07, 0.95, 6).translate(0, -0.47, 0)),
      hips: [0.72, 0.95, 0.3] as const,
    };
  }
  return {
    body: merge(new THREE.SphereGeometry(1, 12, 9).scale(2.0, 0.88, 0.8).translate(0, 2.35, 0)),
    head: merge(
      paint(new THREE.SphereGeometry(1, 9, 7).scale(0.62, 0.42, 0.36).rotateZ(-0.7).translate(2.25, 2.65, 0), 0.85),
      paint(new THREE.BoxGeometry(0.3, 0.08, 0.22).translate(2.1, 3.0, 0.38), 0.85),
      paint(new THREE.BoxGeometry(0.3, 0.08, 0.22).translate(2.1, 3.0, -0.38), 0.85),
      paint(new THREE.ConeGeometry(0.06, 0.42, 5).rotateX(-1.1).translate(2.15, 3.15, 0.32), 1.6),
      paint(new THREE.ConeGeometry(0.06, 0.42, 5).rotateX(1.1).translate(2.15, 3.15, -0.32), 1.6),
    ),
    leg: merge(new THREE.CylinderGeometry(0.13, 0.15, 1.85, 6).translate(0, -0.92, 0)),
    hips: [1.35, 1.85, 0.48] as const,
  };
}

/* ------------------------------------------------------------------ walkers */

const c = (h: string) => new THREE.Color(h);
const ROBE = ['#9e4433', '#6d7d97', '#d8cdb4', '#b08a52', '#7b8763', '#c4703c', '#4f5f78', '#e0d3b0', '#8a6d4e', '#a35a48'];
const SKIN = ['#9c6b45', '#b07a52', '#86583a', '#c08d63', '#a46c42'];
const CLOTH = ['#d9cba8', '#a89275', '#e8e0cc', '#8a6d4e', '#c9b38a', '#f0e8d6'];
const VEIL = ['#6d7d97', '#9e4433', '#e0d3b0', '#7b5c86', '#c4703c', '#4f5f78'];
const HAIR = ['#2a1a10', '#3b2616', '#1c120b', '#5a4632', '#8c8578'];
const WOOL = ['#efe6d2', '#e2d6bd', '#d9ccb2', '#efe6d2', '#6b5644', '#3a2f28'];
const HIDE = ['#8a5a3a', '#a8774e', '#5b4030', '#c9b08a', '#3d2e24'];

type Kind = 'person' | 'sheep' | 'cattle';
interface Walker {
  kind: Kind;
  x: number;
  z: number;
  lane: number;
  speed: number;
  phase: number;
  wob: number;
  size: number;
  /** How far the head turns to look about, and how fast. */
  look: number;
  stride: number;
  /** Where this walker comes to rest on the far shore. */
  stop: number;
}

/** Somewhere along the walk, more of them ahead of you than behind. */
const spawnX = (rnd: () => number) => -57 + Math.pow(rnd(), 0.6) * (CROWD_MAX - 57);

function makeWalkers(rnd: () => number) {
  const w: Walker[] = [];
  const add = (kind: Kind, n: number) => {
    for (let i = 0; i < n; i++) {
      const child = kind === 'person' && rnd() < 0.2;
      const size = kind === 'person' ? (child ? 2.2 + rnd() * 0.6 : 3.55 + rnd() * 0.45) : 0.88 + rnd() * 0.25;
      const lane = (rnd() - 0.5) * 2;
      w.push({
        kind,
        x: spawnX(rnd),
        z: lane * 10,
        lane,
        speed: kind === 'cattle' ? 1.8 + rnd() * 0.5 : 1.75 + rnd() * 1.3,
        phase: rnd() * 7,
        wob: 0.45 + rnd() * 1.1,
        size,
        look: rnd() < 0.45 ? 0.3 + rnd() * 0.5 : 0.08,
        stride: child ? 1.25 : 1,
        stop: CROWD_MAX - rnd() * (CROWD_MAX - CROWD_MIN_STOP),
      });
    }
  };
  add('person', PEOPLE);
  add('sheep', SHEEP);
  add('cattle', CATTLE);
  return w;
}

/** Keeps the crowd around the player: walkers far ahead or behind are moved to the other end. */
function recycle(w: Walker, px: number, rnd: () => number, dt: number) {
  if (tide.returned) return; // everyone is across
  const dx = w.x - px;
  const stopped = w.x >= w.stop - 1;
  // gathered at the end of the walk: drift away (out of sight) only when you are not near them
  const leave = stopped && Math.abs(dx) > 160 && rnd() < dt * 0.5;
  if (dx > AHEAD || leave) w.x = Math.max(-85, px - 70 - rnd() * 60);
  else if (dx < -BEHIND) w.x = px + 300 + rnd() * 500 < w.stop - 10 ? px + 300 + rnd() * 500 : Math.max(-85, px - 70 - rnd() * 60);
  else return;
  w.lane = (rnd() - 0.5) * 2;
  w.z = w.lane * 10;
}

/* ------------------------------------------------------------------ the crowd */

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

function useInstances(geo: THREE.BufferGeometry, count: number) {
  return useMemo(() => {
    const m = new THREE.InstancedMesh(geo, toon('sea:figure', { vertexColors: true }), count);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    for (let i = 0; i < count; i++) m.setMatrixAt(i, ZERO);
    return m;
  }, [geo, count]);
}

export function Crowd() {
  const G = useMemo(personGeometries, []);
  const S = useMemo(() => beastGeometries('sheep'), []);
  const C = useMemo(() => beastGeometries('cattle'), []);
  const rnd = useMemo(() => rng(77), []);
  const walkers = useMemo(() => makeWalkers(rnd), [rnd]);
  if (DEBUG) (window as unknown as Record<string, unknown>).__crowd = walkers;
  const people = walkers.filter((w) => w.kind === 'person');
  const sheep = walkers.filter((w) => w.kind === 'sheep');
  const cattle = walkers.filter((w) => w.kind === 'cattle');

  const m = {
    robe: useInstances(G.robe, PEOPLE),
    head: useInstances(G.head, PEOPLE),
    cover: useInstances(G.cover, PEOPLE),
    veil: useInstances(G.veil, PEOPLE),
    hair: useInstances(G.hair, PEOPLE),
    beard: useInstances(G.beard, PEOPLE),
    arm: useInstances(G.arm, PEOPLE * 2),
    hand: useInstances(G.hand, PEOPLE * 2),
    leg: useInstances(G.leg, PEOPLE * 2),
    bundle: useInstances(G.bundle, PEOPLE),
    shoulderPack: useInstances(G.shoulderPack, PEOPLE),
    backPack: useInstances(G.backPack, PEOPLE),
    staff: useInstances(G.staff, PEOPLE),
    sheepBody: useInstances(S.body, SHEEP),
    sheepHead: useInstances(S.head, SHEEP),
    sheepLeg: useInstances(S.leg, SHEEP * 4),
    cowBody: useInstances(C.body, CATTLE),
    cowHead: useInstances(C.head, CATTLE),
    cowLeg: useInstances(C.leg, CATTLE * 4),
  };

  // What each person wears and carries, fixed for the visit.
  const looks = useMemo(() => {
    const r = rng(31);
    const pick = (a: string[]) => a[Math.floor(r() * a.length)];
    return people.map((w, i) => {
      const child = w.size < 3;
      const robe = c(pick(ROBE));
      const skin = c(pick(SKIN));
      const roll = r();
      const head: 'cover' | 'veil' | 'hair' = roll < 0.45 ? 'cover' : roll < 0.75 ? 'veil' : 'hair';
      const beard = !child && head !== 'veil' && r() < 0.6;
      const carry = child ? r() * 0.5 + 0.5 : r();
      const extra = carry < 0.2 ? 'bundle' : carry < 0.36 ? 'staff' : carry < 0.5 ? 'shoulderPack' : carry < 0.62 ? 'backPack' : null;
      m.robe.setColorAt(i, robe);
      m.head.setColorAt(i, skin);
      m.cover.setColorAt(i, c(pick(CLOTH)));
      m.veil.setColorAt(i, c(pick(VEIL)));
      m.hair.setColorAt(i, c(pick(HAIR.slice(0, child ? 3 : 5))));
      m.beard.setColorAt(i, c(pick(HAIR)));
      for (const k of [0, 1]) {
        m.arm.setColorAt(i * 2 + k, robe);
        m.hand.setColorAt(i * 2 + k, skin);
        m.leg.setColorAt(i * 2 + k, skin);
      }
      m.bundle.setColorAt(i, c(pick(['#c9b189', '#a8865a', '#d8c8a0'])));
      m.shoulderPack.setColorAt(i, c(pick(['#d0bb92', '#8a6a3c', '#b89a6c'])));
      m.backPack.setColorAt(i, c(pick(['#8a6a3c', '#a07a4a', '#6e5636'])));
      m.staff.setColorAt(i, c('#6a4a24'));
      return { child, head, beard, extra, headScale: child ? 1.22 : 1 };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLayoutEffect(() => {
    const r = rng(41);
    const pick = (a: string[]) => a[Math.floor(r() * a.length)];
    sheep.forEach((_, i) => {
      const wool = pick(WOOL);
      m.sheepBody.setColorAt(i, c(wool));
      m.sheepHead.setColorAt(i, c(r() < 0.6 ? '#3a2f28' : '#e0d2b8'));
      for (let k = 0; k < 4; k++) m.sheepLeg.setColorAt(i * 4 + k, c('#4a3a30'));
    });
    cattle.forEach((_, i) => {
      const hide = c(pick(HIDE));
      m.cowBody.setColorAt(i, hide);
      m.cowHead.setColorAt(i, hide);
      for (let k = 0; k < 4; k++) m.cowLeg.setColorAt(i * 4 + k, hide);
    });
    for (const mesh of Object.values(m)) if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tmp = useRef({
    base: new THREE.Matrix4(),
    part: new THREE.Matrix4(),
    local: new THREE.Matrix4(),
    arm: new THREE.Matrix4(),
    hand: new THREE.Matrix4().makeTranslation(HAND.x, HAND.y, HAND.z),
    q: new THREE.Quaternion(),
    e: new THREE.Euler(),
    p: new THREE.Vector3(),
    s: new THREE.Vector3(),
  });
  const clock = useRef(0);
  const seen = useRef(tide.version);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const t = (clock.current += dt);
    const T = tmp.current;
    const px = player.x;

    if (seen.current !== tide.version) {
      seen.current = tide.version;
      for (const w of walkers) {
        // the waters return: all Israel is across, gathered on the shore with you (Ex 14:29-31)
        if (tide.returned) {
          if (w.x < CROWD_MIN_STOP - 10) w.x = CROWD_MIN_STOP - 10 + rnd() * (w.stop - CROWD_MIN_STOP + 10);
        } else w.x = spawnX(rnd); // crossing again: back along the path
      }
    }

    /** Moves a walker along, and places its body. Returns the walk phase, or null if out of sight. */
    const step = (w: Walker, height: number) => {
      recycle(w, px, rnd, dt);
      // slow to a halt on the far shore
      const go = Math.min(1, Math.max(0, (w.stop - w.x) / 12));
      w.x += w.speed * go * dt;
      const dx = w.x - px;
      const spread = 10 * (1 - Math.min(1, Math.max(0, dx) / 830) * 0.66); // the column narrows into the distance
      const tz = w.lane * spread + Math.sin(t * 0.25 + w.phase) * w.wob;
      w.z += (tz - w.z) * Math.min(1, dt * 0.6);
      w.z = Math.max(-WALK_HALF, Math.min(WALK_HALF, w.z));
      if (Math.abs(dx) > DRAW) return null;
      // steps per second follow the pace; a stride is about 0.37 of the walker's height
      w.phase += ((Math.PI * w.speed * go) / (0.37 * height)) * w.stride * dt;
      return go;
    };

    people.forEach((w, i) => {
      const L = looks[i];
      const go = step(w, w.size);
      const hide = (keys: (keyof typeof m)[], n = 1) => keys.forEach((k) => { for (let j = 0; j < n; j++) m[k].setMatrixAt(i * n + j, ZERO); });
      if (go === null) {
        hide(['robe', 'head', 'cover', 'veil', 'hair', 'beard', 'bundle', 'shoulderPack', 'backPack', 'staff']);
        hide(['arm', 'hand', 'leg'], 2);
        return;
      }
      const ph = w.phase;
      const swing = Math.sin(ph) * 0.42 * go;
      const bob = (1 - Math.abs(Math.cos(ph))) * 0.018 * go;
      T.p.set(w.x, groundH(w.x, w.z) + bob * w.size, w.z);
      T.e.set(0, Math.sin(ph) * 0.05 + Math.sin(t * 0.3 + w.phase * 0.1) * 0.08, -0.04 * go, 'YXZ');
      T.base.compose(T.p, T.q.setFromEuler(T.e), T.s.setScalar(w.size));

      m.robe.setMatrixAt(i, T.base);
      // the head turns to look at the walls now and then
      const yaw = Math.sin(t * 0.21 + i) * w.look;
      T.local.makeRotationY(yaw).scale(T.s.setScalar(L.headScale)).setPosition(0, NECK_Y, 0);
      T.part.multiplyMatrices(T.base, T.local);
      m.head.setMatrixAt(i, T.part);
      m.cover.setMatrixAt(i, L.head === 'cover' ? T.part : ZERO);
      m.veil.setMatrixAt(i, L.head === 'veil' ? T.part : ZERO);
      m.hair.setMatrixAt(i, L.head === 'hair' ? T.part : ZERO);
      m.beard.setMatrixAt(i, L.beard ? T.part : ZERO);

      for (const k of [0, 1]) {
        const side = k ? 1 : -1;
        // legs stride in turn; each arm swings against its leg
        T.local.makeRotationZ(side * swing).setPosition(0, HIP_Y, side * 0.058);
        m.leg.setMatrixAt(i * 2 + k, T.part.multiplyMatrices(T.base, T.local));
        const holding = k === 1 && L.extra === 'staff';
        const a = holding ? 0.1 : -side * swing * 0.8;
        T.e.set(side * 0.1, 0, a, 'XYZ');
        T.local.makeRotationFromEuler(T.e).setPosition(0, SHOULDER_Y, side * SHOULDER_Z);
        T.arm.multiplyMatrices(T.base, T.local);
        m.arm.setMatrixAt(i * 2 + k, T.arm);
        T.part.multiplyMatrices(T.arm, T.hand);
        m.hand.setMatrixAt(i * 2 + k, T.part);
        if (k === 1) {
          if (holding) {
            // keep the staff upright in the hand
            T.local.makeRotationZ(-a);
            m.staff.setMatrixAt(i, T.part.multiply(T.local));
          } else m.staff.setMatrixAt(i, ZERO);
        }
      }
      m.bundle.setMatrixAt(i, L.extra === 'bundle' ? T.base : ZERO);
      m.shoulderPack.setMatrixAt(i, L.extra === 'shoulderPack' ? T.base : ZERO);
      m.backPack.setMatrixAt(i, L.extra === 'backPack' ? T.base : ZERO);
    });

    const beasts = (list: Walker[], body: THREE.InstancedMesh, head: THREE.InstancedMesh, leg: THREE.InstancedMesh, hips: readonly [number, number, number], height: number) => {
      list.forEach((w, i) => {
        const go = step(w, height);
        if (go === null) {
          body.setMatrixAt(i, ZERO);
          head.setMatrixAt(i, ZERO);
          for (let k = 0; k < 4; k++) leg.setMatrixAt(i * 4 + k, ZERO);
          return;
        }
        const ph = w.phase;
        T.p.set(w.x, groundH(w.x, w.z), w.z);
        T.e.set(0, Math.sin(t * 0.3 + w.phase * 0.1) * 0.15, 0, 'YXZ');
        T.base.compose(T.p, T.q.setFromEuler(T.e), T.s.setScalar(w.size));
        body.setMatrixAt(i, T.base);
        // grazing nods
        T.local.makeRotationZ(Math.sin(t * 0.8 + w.phase) * 0.06);
        head.setMatrixAt(i, T.part.multiplyMatrices(T.base, T.local));
        // trot: diagonal pairs move together
        for (let k = 0; k < 4; k++) {
          const fx = k < 2 ? hips[0] : -hips[0];
          const fz = k % 2 ? hips[2] : -hips[2];
          const pair = k === 0 || k === 3 ? 1 : -1;
          T.local.makeRotationZ(pair * Math.sin(ph) * 0.22 * go).setPosition(fx, hips[1], fz);
          leg.setMatrixAt(i * 4 + k, T.part.multiplyMatrices(T.base, T.local));
        }
      });
    };
    beasts(sheep, m.sheepBody, m.sheepHead, m.sheepLeg, S.hips, 3);
    beasts(cattle, m.cowBody, m.cowHead, m.cowLeg, C.hips, 5);

    for (const mesh of Object.values(m)) mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      {Object.entries(m).map(([k, mesh]) => (
        <primitive key={k} object={mesh} />
      ))}
    </>
  );
}
