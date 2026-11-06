import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import url from '../models/furniture.glb?url';
import { acacia, bronze, gold, pureGold, silver } from './materials';

// Shapes modelled in Blender (tools/models/build.py); the game supplies the materials by name.
const MATERIALS: Record<string, () => THREE.Material> = { gold, pureGold, bronze, silver, acacia };

useGLTF.preload(url, false);

export interface ModelPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

/** The meshes of one piece in the model file, one per material, in the piece's own frame. */
export function useModel(name: string): ModelPart[] {
  const { scene } = useGLTF(url, false);
  return useMemo(() => {
    const root = scene.getObjectByName(name);
    if (!root) throw new Error(`no model "${name}"`);
    const parts: ModelPart[] = [];
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const key = (m.material as THREE.Material).name;
      const material = MATERIALS[key]?.();
      if (!material) throw new Error(`model "${name}": unknown material "${key}"`);
      parts.push({ geometry: m.geometry, material });
    });
    return parts;
  }, [scene, name]);
}

export function Model({ name }: { name: string }) {
  const parts = useModel(name);
  return (
    <>
      {parts.map((p, i) => (
        <mesh key={i} geometry={p.geometry} material={p.material} castShadow receiveShadow />
      ))}
    </>
  );
}
