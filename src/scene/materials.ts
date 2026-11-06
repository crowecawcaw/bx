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

const mats = new Map<string, THREE.Material>();

/**
 * `?toon` brings back the original cel shading (a 4-step ramp, no reflections), for comparison.
 * Otherwise surfaces are physically shaded and lit by the sky (see Sky.tsx), with the ink lines kept.
 */
export const TOON = new URLSearchParams(location.search).has('toon');

/** Shared clock for cloth in the wind; advanced every frame by the scene. */
export const windTime = { value: 0 };

type Shader = Parameters<THREE.Material['onBeforeCompile']>[0];

/**
 * Adds a rim light, and optionally wind. The rim only shows where the
 * surface curves (bevels, pillars, folds), so big flat walls don't glow at grazing angles.
 * Wind ripples cloth, more toward the hem (local y runs from 0 at the top edge downward).
 */
function stylize<M extends THREE.Material>(m: M, wind = 0, geomCurv = false, rim = 0.3) {
  // With a bump map on a hard surface, the curvature test uses the unbumped normal, or every
  // tooling mark and pore would count as a curve and flat walls would glow at grazing angles.
  // (Cloth keeps the bumped normal: its weave catching the rim light is part of its look.)
  const curvN = geomCurv ? 'nonPerturbedNormal' : 'normal';
  m.onBeforeCompile = (sh: Shader) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float rimV = 1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0);
      float curv = clamp(length(fwidth(${curvN})) * 25.0, 0.0, 1.0);
      outgoingLight += diffuseColor.rgb * vec3(1.0, 0.93, 0.8) * ${rim.toFixed(2)} * smoothstep(0.55, 0.62, rimV) * curv;
      #include <opaque_fragment>`,
    );
    if (wind > 0) {
      sh.uniforms.windTime = windTime;
      sh.vertexShader =
        'uniform float windTime;\n' +
        sh.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          {
            float hem = clamp(-position.y / 4.5, 0.0, 1.0);
            vec4 wp = modelMatrix * vec4(position, 1.0);
            float gust = 0.55 + 0.45 * sin(windTime * 0.37 + (wp.x + wp.z) * 0.02);
            float wave = sin((wp.x + wp.z) * 0.9 - windTime * 1.7) + 0.5 * sin((wp.x - wp.z) * 2.1 - windTime * 2.9);
            transformed.z += ${wind.toFixed(3)} * hem * hem * gust * wave;
          }`,
        );
    }
  };
  m.customProgramCacheKey = () => `style-${m.type}-${wind}-${curvN}-${rim}`;
  return m;
}

/** What a surface is made of, read from its material key. */
type Kind = 'metal' | 'cloth' | 'skin' | 'water' | 'wood' | 'stone';
function kindOf(key: string): Kind {
  if (/gold|bronze|silver|brass|basePanel|t-carved|t-floor|t-ceiling|chapiterNet|^net$/i.test(key)) return 'metal';
  if (key.startsWith('cloth:') || key.startsWith('sea:figure')) return 'cloth';
  if (key === 'ram' || key === 'tachash' || key.startsWith('camp')) return 'skin';
  if (/water/i.test(key)) return 'water';
  if (/acacia|cedar|beam|wood|bread|bush|foliage/i.test(key)) return 'wood';
  return 'stone';
}

/** Physically based version of a toon parameter set. */
function physical(key: string, params: THREE.MeshToonMaterialParameters) {
  const kind = kindOf(key);
  // the toon look faked shine with a glow; real reflections replace most of it
  const glow = (params.emissiveIntensity ?? 1) * (kind === 'metal' ? 0.6 : 1);
  const base: THREE.MeshStandardMaterialParameters = { ...(params as THREE.MeshStandardMaterialParameters), emissiveIntensity: glow };
  if (kind === 'metal') {
    const hammered = hammeredTexture();
    return new THREE.MeshStandardMaterial({
      ...base,
      metalness: 1,
      roughness: key === 'pureGold' ? 0.28 : /bronze|brass|basePanel/i.test(key) ? 0.42 : /board|t-floor|t-carved|t-ceiling/i.test(key) ? 0.48 : 0.34,
      // planishing facets break up the reflections
      roughnessMap: hammered,
      bumpMap: params.bumpMap ?? hammered,
      bumpScale: params.bumpMap ? params.bumpScale : 0.6,
    });
  }
  if (kind === 'cloth')
    return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.95, metalness: 0, sheen: 0.25, sheenRoughness: 0.5, sheenColor: new THREE.Color('#fff0d8') });
  if (kind === 'water') return new THREE.MeshStandardMaterial({ ...base, roughness: 0.08, metalness: 0.1 });
  return new THREE.MeshStandardMaterial({ ...base, metalness: 0, roughness: kind === 'wood' ? 0.72 : kind === 'skin' ? 0.8 : 0.9 });
}

export function toon(key: string, params: THREE.MeshToonMaterialParameters, wind = 0) {
  let m = mats.get(key);
  if (!m) {
    const geomCurv = !!params.bumpMap && !key.startsWith('cloth:');
    m = TOON
      ? stylize(new THREE.MeshToonMaterial({ gradientMap: toonRamp(), ...params }), wind, geomCurv)
      : stylize(physical(key, params), wind, geomCurv, 0.18);
    mats.set(key, m);
  }
  return m as THREE.MeshStandardMaterial;
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
export function cloth(key: string, map: THREE.Texture, bumpScale = 1.2, wind = 0) {
  return toon(
    `cloth:${key}`,
    {
      map,
      side: THREE.DoubleSide,
      bumpMap: weaveBump(),
      bumpScale,
    },
    wind,
  );
}

export const INK = '#1d140d';
