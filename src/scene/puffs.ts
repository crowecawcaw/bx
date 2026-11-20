/**
 * Fragment shader for smoke and cloud drawn as camera-facing cards: each card is shaded as a soft
 * ball lit by the sun, with a ragged, fading edge so that many of them merge into one billow.
 * Expects varyings vUv, vFade (0..1) and vSeed, and uniforms sunDir, lit, shade and opacity.
 */
export const PUFF_FRAG = /* glsl */ `
uniform vec3 sunDir;
uniform vec3 lit;
uniform vec3 shade;
uniform float opacity;
varying vec2 vUv;
varying float vFade;
varying float vSeed;
float phash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float pnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(phash(i), phash(i + vec2(1.0, 0.0)), f.x), mix(phash(i + vec2(0.0, 1.0)), phash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r2 = dot(p, p);
  if (r2 > 1.0) discard;
  vec3 n = vec3(p, sqrt(1.0 - r2));
  vec3 l = normalize((viewMatrix * vec4(sunDir, 0.0)).xyz);
  float d = dot(n, l) * 0.5 + 0.5;
  float rag = pnoise(p * 2.6 + vSeed * 40.0) * 0.6 + pnoise(p * 6.0 + vSeed * 90.0) * 0.4;
  float a = (1.0 - smoothstep(0.25, 1.0, r2 + (rag - 0.5) * 0.55)) * vFade * opacity;
  vec3 col = mix(shade, lit, smoothstep(0.15, 0.95, d + (rag - 0.5) * 0.25));
  gl_FragColor = vec4(col, a);
  #include <fog_fragment>
}`;
