import * as THREE from 'three';
import { hammeredTexture, woodTexture, weaveBump } from './textures';

let gradient: THREE.DataTexture | null = null;

/** Four-step ramp gives the cel-shaded look. */
export function toonRamp() {
  if (gradient) return gradient;
  const data = new Uint8Array([105, 160, 212, 255]);
  gradient = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
}

const mats = new Map<string, THREE.MeshToonMaterial>();

export function toon(key: string, params: THREE.MeshToonMaterialParameters) {
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({ gradientMap: toonRamp(), ...params });
    mats.set(key, m);
  }
  return m;
}

export const gold = () =>
  toon('gold', { color: '#f2c14e', emissive: '#4a3000', emissiveIntensity: 0.35, map: hammeredTexture() });
export const pureGold = () =>
  toon('pureGold', { color: '#f7c843', emissive: '#4a2c00', emissiveIntensity: 0.4, map: hammeredTexture() });
export const bronze = () =>
  toon('bronze', { color: '#c07a3c', emissive: '#2a1200', emissiveIntensity: 0.3, map: hammeredTexture() });
export const silver = () =>
  toon('silver', { color: '#dfe4ea', emissive: '#20242a', emissiveIntensity: 0.3, map: hammeredTexture() });
export const acacia = () => toon('acacia', { color: '#ffffff', map: woodTexture() });

/** Cloth material: double-sided toon with a weave relief. */
export function cloth(key: string, map: THREE.Texture, bumpScale = 1.2) {
  return toon(`cloth:${key}`, {
    map,
    side: THREE.DoubleSide,
    bumpMap: weaveBump(),
    bumpScale,
  });
}

export const INK = '#1d140d';
