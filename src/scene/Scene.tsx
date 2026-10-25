import { Html } from '@react-three/drei';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { Suspense, useEffect, useState } from 'react';
import * as THREE from 'three';
import { FEATURES } from '../data/specs';
import { useStore, type CurtainId } from '../store';
import { Courtyard } from './Courtyard';
import { World } from './Environment';
import { Ark, BronzeAltar, IncenseAltar, Laver, Menorah, Table } from './Furniture';
import { lookAt, player, Player, walkTo } from './Player';
import { regionOf } from './dims';
import { Tent } from './Tent';

const CURTAIN_REACH = 14;

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
  walkTo(p.x, p.z);
}

function Bubbles() {
  const [visible, setVisible] = useState<string[]>([]);
  const select = useStore((s) => s.select);
  const discovered = useStore((s) => s.discovered);
  useEffect(() => {
    const id = setInterval(() => {
      const r = regionOf(player.x, player.z);
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

export function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 70, near: 0.1, far: 2000 }}
      onCreated={({ gl }) => {
        (window as unknown as Record<string, unknown>).__gl = gl;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <Suspense fallback={null}>
        <group raycast={() => null}>
          <World />
        </group>
        <group onClick={onTap}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} visible={false} userData={{ ground: true }}>
            <planeGeometry args={[400, 400]} />
          </mesh>
          <Courtyard />
          <Tent />
          <Ark />
          <Table />
          <Menorah />
          <IncenseAltar />
          <BronzeAltar />
          <Laver />
        </group>
        <Bubbles />
        <Player />
      </Suspense>
    </Canvas>
  );
}
