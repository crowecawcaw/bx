import * as THREE from 'three';

/** The warm dawn haze (Ex 14:27, "when the morning appeared"). Used by the scene fog and the water shaders. */
export const FOG_COLOR = '#e0a353';
export const FOG_NEAR = 120;
export const FOG_FAR = 650;

/** Shared uniforms: one clock and one fog for every water material. */
export const waterTime = { value: 0 };
export const fogUniforms = {
  uFog: { value: new THREE.Color(FOG_COLOR) },
  uNear: { value: FOG_NEAR },
  uFar: { value: FOG_FAR },
};
/** Device pixels per CSS pixel, so particles keep their size at any resolution. */
export const pixelRatio = { value: 1 };

export const NOISE = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
`;

/**
 * Colours below are written as sRGB (as picked by eye) and converted here, because the
 * renderer works in linear light like the toon materials. Also applies the distance fog.
 */
export const FINISH = /* glsl */ `
uniform vec3 uFog;
uniform float uNear, uFar;
vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }
vec3 fogged(vec3 srgb, float depth) {
  return mix(toLinear(srgb), uFog, clamp((depth - uNear) / (uFar - uNear), 0.0, 1.0));
}
float fogAmount(float depth) { return clamp((depth - uNear) / (uFar - uNear), 0.0, 1.0); }
`;

let drop: THREE.CanvasTexture | null = null;
/** A ringed droplet / bubble sprite. */
export function dropletTexture() {
  if (drop) return drop;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const x = cv.getContext('2d')!;
  x.strokeStyle = 'rgba(238,252,255,.95)';
  x.lineWidth = 6;
  x.beginPath();
  x.arc(32, 32, 23, 0, 7);
  x.stroke();
  x.fillStyle = 'rgba(210,244,250,.28)';
  x.beginPath();
  x.arc(32, 32, 22, 0, 7);
  x.fill();
  x.fillStyle = 'rgba(255,255,255,.85)';
  x.beginPath();
  x.arc(23, 23, 5, 0, 7);
  x.fill();
  drop = new THREE.CanvasTexture(cv);
  return drop;
}
