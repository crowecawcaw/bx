import { Html, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Sea } from '../sea/Sea';
import { SeaWorld } from '../sea/SeaWorld';
import { SITE } from '../sites';
import { useStore, type CurtainId } from '../store';
import { Temple } from '../temple/Temple';
import { TempleWorld } from '../temple/TempleWorld';
import { Courtyard } from './Courtyard';
import { World } from './Environment';
import { Ark, BronzeAltar, IncenseAltar, Laver, Menorah, Table } from './Furniture';
import { lookAt, player, Player, teleportTo, walkTo } from './Player';
import { DEBUG } from './dims';
import { levelFor } from './nav';
import { Post } from './Post';
import { Tent } from './Tent';

const POST = !new URLSearchParams(location.search).has('nopost');

const CURTAIN_REACH = SITE.reach;
const FEATURES = SITE.features;
const TEMPLE = SITE.id === 'temple';
const SEA = SITE.id === 'sea';

function tagOf(o: THREE.Object3D | null) {
  let curtain: CurtainId | undefined;
  let feature: string | undefined;
  for (let n = o; n; n = n.parent) {
    curtain ??= n.userData.curtain as CurtainId | undefined;
    feature ??= n.userData.feature as string | undefined;
  }
  return { curtain, feature };
}

function onTap(e: ThreeEvent<MouseEvent>) {
  e.stopPropagation();
  if (e.delta > 8) return; // that was a drag to look around
  if (performance.now() < skipClickUntil) return; // the second tap of a double-tap
  const { curtain } = tagOf(e.object);
  const p = e.point;
  if (curtain) {
    const d = Math.hypot(p.x - player.x, p.z - player.z);
    if (d < CURTAIN_REACH) {
      useStore.getState().toggleCurtain(curtain);
      return;
    }
  }
  const level = levelFor(p.x, p.y, p.z, player.level);
  firstTap.spot = [p.x, p.z, level];
  walkTo(p.x, p.z, level);
}

/**
 * Double-tap to jump. The second tap is recognised on the screen, by time and by how many pixels
 * it lands from the first, not by what it hits: walking off after the first tap turns the view,
 * so the second may land on a wall or the sky. You jump to the spot the first tap chose.
 * Times are the events' own timestamps (when the finger touched), so a busy frame between the
 * two taps doesn't make a quick double-tap look slow.
 */
const DOUBLE_MS = 450;
const DOUBLE_PX = 60;
const firstTap = { t: -Infinity, x: 0, y: 0, spot: null as [number, number, number] | null };
let skipClickUntil = 0;

function DoubleTap() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const el = gl.domElement;
    let down = { t: 0, x: 0, y: 0 };
    const onDown = (e: PointerEvent) => {
      if (e.isPrimary) down = { t: e.timeStamp, x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      const now = e.timeStamp;
      // a drag to look, or a long press, is not a tap
      if (now - down.t > 400 || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) return;
      const spot = firstTap.spot;
      if (spot && now - firstTap.t < DOUBLE_MS && Math.hypot(e.clientX - firstTap.x, e.clientY - firstTap.y) < DOUBLE_PX) {
        firstTap.t = -Infinity;
        firstTap.spot = null;
        skipClickUntil = performance.now() + 300; // this tap's click must not also start a walk
        teleportTo(spot[0], spot[1], spot[2]);
        return;
      }
      // a first tap; its click (which follows) records where it landed
      Object.assign(firstTap, { t: now, x: e.clientX, y: e.clientY, spot: null });
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
    };
  }, [gl]);
  return null;
}

function Bubbles() {
  const [visible, setVisible] = useState<string[]>([]);
  const select = useStore((s) => s.select);
  const discovered = useStore((s) => s.discovered);
  useEffect(() => {
    const id = setInterval(() => {
      const r = SITE.regionOf(player.x, player.z);
      const v = FEATURES.filter((f) => {
        if (!f.regions.includes(r)) return false;
        const d = Math.hypot(f.bubble[0] - player.x, f.bubble[2] - player.z);
        return d < f.radius;
      }).map((f) => f.id);
      setVisible((old) => (old.join() === v.join() ? old : v));
    }, 250);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      {FEATURES.filter((f) => visible.includes(f.id)).map((f) => (
        <Html key={f.id} position={f.bubble} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <button
            className={`bubble ${discovered.includes(f.id) ? 'seen' : ''}`}
            onClick={(ev) => {
              ev.stopPropagation();
              select(f.id);
              lookAt(f.bubble[0], f.bubble[2]);
            }}
            onPointerDown={(ev) => ev.stopPropagation()}
          >
            <span className="bubble-i">i</span>
            <span className="bubble-label">{f.name}</span>
          </button>
        </Html>
      ))}
    </>
  );
}

/**
 * Nothing that casts a shadow moves except the curtains, so the shadow map is drawn only
 * while things load and while a curtain moves (Cloth asks for it). That halves the per-frame work.
 */
function ShadowWarmup() {
  const n = useRef(0);
  useFrame(({ gl }) => {
    if (n.current++ < 90) gl.shadowMap.needsUpdate = true;
  });
  return null;
}

/** Quality steps: [max pixel ratio, post level]. Drops a step when frames run slow (e.g. a phone heating up). */
const STEPS: [number, number][] = [
  [1, 0],
  [1.25, 1],
  [1.5, 2],
];

export function Scene() {
  const [step, setStep] = useState(2);
  const dpr = Math.min(window.devicePixelRatio || 1, STEPS[step][0]);
  return (
    <Canvas
      shadows
      dpr={dpr}
      gl={{ antialias: !POST, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: 70, near: 0.2, far: 3000 }}
      onCreated={({ gl }) => {
        if (DEBUG) (window as unknown as Record<string, unknown>).__gl = gl;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.shadowMap.autoUpdate = false;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <PerformanceMonitor
        onDecline={() => setStep((s) => Math.max(0, s - 1))}
        onIncline={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
        flipflops={4}
        onFallback={() => setStep(0)}
      />
      <ShadowWarmup />
      <DoubleTap />
      <Suspense fallback={null}>
        <group raycast={() => null}>{SEA ? <SeaWorld /> : TEMPLE ? <TempleWorld /> : <World />}</group>
        <group onClick={onTap}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} visible={false} userData={{ ground: true }}>
            <planeGeometry args={[1000, 1000]} />
          </mesh>
          {SEA ? (
            <Sea />
          ) : TEMPLE ? (
            <Temple />
          ) : (
            <>
              <Courtyard />
              <Tent />
              <Ark />
              <Table />
              <Menorah />
              <IncenseAltar />
              <BronzeAltar />
              <Laver />
            </>
          )}
        </group>
        <Bubbles />
        <Player />
        {POST && <Post quality={STEPS[step][1]} dpr={dpr} />}
      </Suspense>
    </Canvas>
  );
}
