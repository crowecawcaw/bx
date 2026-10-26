import { Html, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
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
  // a second tap close to the first, soon after, blinks you there instead of walking
  const now = performance.now();
  const sx = e.nativeEvent.clientX;
  const sy = e.nativeEvent.clientY;
  if (now - lastTap.t < 320 && Math.hypot(sx - lastTap.x, sy - lastTap.y) < 40) {
    lastTap.t = 0;
    teleportTo(p.x, p.z, level);
    return;
  }
  lastTap.t = now;
  lastTap.x = sx;
  lastTap.y = sy;
  walkTo(p.x, p.z, level);
}
const lastTap = { t: 0, x: 0, y: 0 };

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
