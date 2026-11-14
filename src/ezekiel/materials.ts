import * as THREE from 'three';
import { toon } from '../scene/materials';
import { templeMaterials } from '../temple/House';
import { cedarBump, cedarTexture, pavementTexture, tex } from '../temple/textures';
import { carvedWoodTexture, plainWoodTexture } from './textures';

/** World-space tile sizes (cubits) for each material, for Mason. */
export const TILES: Record<string, [number, number]> = {
  stone: [8, 3],
  white: [8, 3],
  roof: [6, 6],
  dark: [1, 1],
  wood: [2, 6],
  carved: [5, 10],
  cedar: [2, 6],
  pave: [6, 6],
};

let cache: Record<string, THREE.Material> | null = null;

/** Hewn stone like Solomon's for the walls and gates, with paler copings and steps. */
export function ezekielMaterials() {
  if (cache) return cache;
  const t = templeMaterials();
  const st = t.stone as THREE.MeshStandardMaterial;
  cache = {
    stone: t.stone,
    white: toon('e-white', { map: st.map ?? undefined, bumpMap: st.bumpMap ?? undefined, bumpScale: 0.6, emissive: '#4c463c', emissiveIntensity: 0.3 }),
    roof: toon('e-roof', { color: '#d4c4a3' }),
    dark: toon('e-dark', { color: '#2a2219' }),
    wood: toon('e-wood', { map: tex(plainWoodTexture()) }),
    carved: toon('e-carved', { map: tex(carvedWoodTexture()) }),
    cedar: toon('e-cedar', { map: tex(cedarTexture()), bumpMap: cedarBump(), bumpScale: 0.5 }),
    pave: toon('e-pave', { map: tex(pavementTexture('e-pave', '#ddcfb0')) }),
  };
  return cache;
}
