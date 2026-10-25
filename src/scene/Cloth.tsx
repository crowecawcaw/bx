import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

export interface ClothProps {
  width: number;
  height: number;
  material: THREE.Material;
  /** Width of one fold, in cubits. */
  foldWidth?: number;
  /** Depth of the folds, in cubits. */
  foldDepth?: number;
  /** 0 = hanging flat, 1 = drawn fully aside. Animated toward this value. */
  open?: number;
  /** How a drawn curtain gathers: split to both sides, or all to one side. */
  gather?: 'split' | 'left' | 'right';
  /** Texture repeats across the width (for long plain hangings). */
  uRepeat?: number;
  segmentsPerCubit?: number;
  castShadow?: boolean;
  userData?: Record<string, unknown>;
}

/**
 * A hanging cloth. The top edge hangs on hooks, so it stays straight, and the fabric
 * falls in vertical folds that deepen toward the hem. When drawn aside, the folds bunch up.
 * Origin: top-centre of the cloth; the cloth hangs down along -y and lies in the xy-plane.
 */
export function Cloth({
  width,
  height,
  material,
  foldWidth = 0.7,
  foldDepth = 0.12,
  open = 0,
  gather = 'split',
  uRepeat = 1,
  segmentsPerCubit = 6,
  castShadow = true,
  userData,
}: ClothProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const state = useRef({ o: open, dirty: true });

  const geom = useMemo(() => {
    const sx = Math.max(8, Math.round(width * segmentsPerCubit));
    const sy = Math.max(4, Math.round(height * 1.6));
    const g = new THREE.PlaneGeometry(width, height, sx, sy);
    g.translate(0, -height / 2, 0);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * uRepeat);
    return g;
  }, [width, height, segmentsPerCubit, uRepeat]);

  const base = useMemo(() => {
    const p = geom.attributes.position as THREE.BufferAttribute;
    const u = new Float32Array(p.count);
    const v = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) {
      u[i] = p.getX(i) / width + 0.5;
      v[i] = -p.getY(i) / height; // 0 at top, 1 at hem
    }
    return { u, v };
  }, [geom, width, height]);

  const apply = (o: number) => {
    const p = geom.attributes.position as THREE.BufferAttribute;
    const { u, v } = base;
    const k = (Math.PI * 2 * width) / foldWidth;
    for (let i = 0; i < p.count; i++) {
      const uu = u[i];
      const vv = v[i];
      // gathering: compress toward the side(s); the hem is pulled a touch further, like a tie-back
      const g = o * (0.86 + 0.08 * vv);
      let x: number;
      if (gather === 'split') {
        x = uu < 0.5 ? -width / 2 + uu * width * (1 - g) : width / 2 - (1 - uu) * width * (1 - g);
      } else if (gather === 'left') {
        x = -width / 2 + uu * width * (1 - g);
      } else {
        x = width / 2 - (1 - uu) * width * (1 - g);
      }
      const depth = foldDepth * (0.55 + 0.45 * vv) * (1 + o * 3.2);
      // two harmonics so the folds aren't perfectly regular
      const z = depth * (Math.sin(uu * k) + 0.35 * Math.sin(uu * k * 2.3 + 1.7)) - foldDepth * 0.15 * vv * vv;
      p.setXYZ(i, x, -vv * height, z);
    }
    p.needsUpdate = true;
    geom.computeVertexNormals();
    geom.computeBoundingSphere();
    geom.computeBoundingBox();
  };

  useLayoutEffect(() => {
    apply(state.current.o);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geom]);

  useFrame((_, dt) => {
    const s = state.current;
    const d = open - s.o;
    if (Math.abs(d) < 0.001) {
      if (s.o !== open) {
        s.o = open;
        apply(open);
      }
      return;
    }
    s.o += d * Math.min(1, dt * 3.2);
    apply(s.o);
  });

  return (
    <mesh ref={mesh} geometry={geom} material={material} castShadow={castShadow} receiveShadow userData={userData} />
  );
}
