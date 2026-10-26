import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SITE } from '../sites';
import { useStore } from '../store';
import { DEBUG, EYE_HEIGHT } from './dims';
import { buildNav, findPath, walkable } from './nav';

/** Mutable player state shared with the HUD (mini-map) without React re-renders. */
export const player = {
  x: SITE.start.x,
  z: SITE.start.z,
  yaw: SITE.start.yaw,
  pitch: -0.04,
  path: [] as [number, number][],
  lastLook: 0,
  walkStart: 0,
  target: null as [number, number] | null,
};

const SPEED = 5.5; // cubits per second (≈ 2.5 m/s)

export function walkTo(x: number, z: number) {
  const p = findPath(player.x, player.z, x, z);
  if (!p) return false;
  player.path = p;
  player.walkStart = performance.now();
  player.target = p[p.length - 1];
  return true;
}

// Handy for debugging and automated screenshots.
if (DEBUG) (window as unknown as Record<string, unknown>).__tabernacle = { player, useStore, walkTo, lookAt };

/** Turn the camera to face a point. */
export function lookAt(x: number, z: number) {
  player.yaw = Math.atan2(-(x - player.x), -(z - player.z));
  player.lastLook = performance.now();
}

function angleDiff(a: number, b: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function Player() {
  const { camera, gl } = useThree();
  const navVersion = useStore((s) => s.navVersion);
  const open = useStore((s) => s.open);
  const setRegion = useStore((s) => s.setRegion);
  const keys = useRef(new Set<string>());
  const marker = useRef<THREE.Mesh>(null);

  useEffect(() => {
    buildNav(open);
    // re-plan if a curtain closed across our path
    if (player.target) walkTo(player.target[0], player.target[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navVersion]);

  // Drag to look (mouse or one finger). The view follows the finger 1:1, like grabbing the scene.
  useEffect(() => {
    const el = gl.domElement;
    let active: number | null = null;
    let sx = 0;
    let sy = 0;
    let yaw0 = 0;
    let pitch0 = 0;
    let dragging = false;
    const down = (e: PointerEvent) => {
      if (active !== null) return;
      active = e.pointerId;
      sx = e.clientX;
      sy = e.clientY;
      yaw0 = player.yaw;
      pitch0 = player.pitch;
      dragging = false;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== active) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (!dragging && Math.hypot(dx, dy) < 6) return;
      dragging = true;
      // radians per pixel so a point under the finger stays under the finger
      const k = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov) / el.clientHeight;
      player.yaw = yaw0 + dx * k;
      player.pitch = THREE.MathUtils.clamp(pitch0 + dy * k, -1.2, 1.2);
      player.lastLook = performance.now();
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === active) active = null;
    };
    const kd = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      keys.current.add(e.key.toLowerCase());
    };
    const ku = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, [gl, camera]);

  const ringGeo = useMemo(() => new THREE.RingGeometry(0.35, 0.5, 24), []);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const k = keys.current;
    // keyboard: WASD / arrows
    const fwd = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    const turn = (k.has('a') || k.has('arrowleft') ? 1 : 0) - (k.has('d') || k.has('arrowright') ? 1 : 0);
    if (turn) {
      player.yaw += turn * dt * 1.8;
      player.lastLook = performance.now();
    }
    if (fwd) {
      player.path = [];
      player.target = null;
      const nx = player.x - Math.sin(player.yaw) * fwd * SPEED * dt;
      const nz = player.z - Math.cos(player.yaw) * fwd * SPEED * dt;
      if (walkable(nx, nz)) {
        player.x = nx;
        player.z = nz;
      } else if (walkable(nx, player.z)) player.x = nx;
      else if (walkable(player.x, nz)) player.z = nz;
    }

    // follow the planned path
    if (player.path.length) {
      const [tx, tz] = player.path[0];
      const dx = tx - player.x;
      const dz = tz - player.z;
      const d = Math.hypot(dx, dz);
      const step = SPEED * dt;
      if (d <= step) {
        player.x = tx;
        player.z = tz;
        player.path.shift();
        if (!player.path.length) player.target = null;
      } else {
        player.x += (dx / d) * step;
        player.z += (dz / d) * step;
        // face the way we walk, unless the user has looked around since setting off
        if (player.lastLook < player.walkStart) {
          const want = Math.atan2(-dx, -dz);
          player.yaw += angleDiff(player.yaw, want) * Math.min(1, dt * 2.5);
          player.pitch += (-0.04 - player.pitch) * Math.min(1, dt * 1.5);
        }
      }
    }

    // keep a comfortable horizontal view on tall phone screens
    const cam = camera as THREE.PerspectiveCamera;
    const fov = THREE.MathUtils.clamp(
      THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(36)) / cam.aspect)),
      65,
      88,
    );
    if (Math.abs(cam.fov - fov) > 0.1) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    // gentle head bob while walking
    const walking = player.path.length > 0 || fwd !== 0;
    const bob = walking ? Math.sin(state.clock.elapsedTime * 9) * 0.04 : 0;
    camera.position.set(player.x, EYE_HEIGHT + bob, player.z);
    camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');

    if (marker.current) {
      marker.current.visible = !!player.target;
      if (player.target) {
        marker.current.position.set(player.target[0], 0.03, player.target[1]);
        const s = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.15;
        marker.current.scale.set(s, s, s);
      }
    }

    const r = SITE.regionOf(player.x, player.z);
    if (useStore.getState().region !== r) setRegion(r);
  });

  return (
    <mesh ref={marker} geometry={ringGeo} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <meshBasicMaterial color="#fff6d6" transparent opacity={0.85} depthWrite={false} />
    </mesh>
  );
}
