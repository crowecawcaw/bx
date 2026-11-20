import { Bloom, EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing';
import { useFrame } from '@react-three/fiber';
import { BlendFunction, Effect, EffectAttribute, ToneMappingMode } from 'postprocessing';
import { useMemo } from 'react';
import * as THREE from 'three';
import { INK, TOON } from './materials';

/**
 * What the air does to light in the current world. A world sets this when it mounts (see
 * `setAir`); with `density` 0 the atmosphere pass leaves the picture alone.
 */
export const air = {
  /** Direction toward the sun. */
  sun: new THREE.Vector3(0.6, 0.4, 0.3).normalize(),
  /** Colour of haze lit from the side or behind. */
  haze: new THREE.Color('#ecdcc0'),
  /** Colour of haze looking toward the sun. */
  glow: new THREE.Color('#ffe2b0'),
  /** Haze per cubit at ground level. */
  density: 0,
  /** How quickly the haze thins with height (1 / cubits). */
  falloff: 0.012,
  /** Height of the ground the haze lies on. */
  base: 0,
  /** Strength of the shafts of light around whatever stands in front of the sun. */
  shafts: 0,
};

export function setAir(a: { sun: [number, number, number]; haze: string; glow: string; density: number; falloff?: number; base?: number; shafts?: number }) {
  air.sun.set(...a.sun).normalize();
  air.haze.set(a.haze);
  air.glow.set(a.glow);
  air.density = a.density;
  air.falloff = a.falloff ?? 0.012;
  air.base = a.base ?? 0;
  air.shafts = a.shafts ?? 0;
}

/**
 * Ink lines drawn from the depth buffer (the `?toon` look). On any flat surface 1/z changes
 * linearly across the screen, so its second difference is zero there and spikes at silhouettes
 * and creases. That gives outlines for every object (and fold) without extra geometry.
 */
const inkFrag = /* glsl */ `
uniform vec3 inkColor;
uniform float thickness;
float invZ(vec2 uv) { return -1.0 / getViewZ(readDepth(uv)); }
void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  vec2 o = texelSize * thickness;
  float w = -1.0 / getViewZ(depth);
  float l = invZ(uv - vec2(o.x, 0.0));
  float r = invZ(uv + vec2(o.x, 0.0));
  float d = invZ(uv - vec2(0.0, o.y));
  float u = invZ(uv + vec2(0.0, o.y));
  // pixels nearer the camera take the line, so silhouettes stay crisp and one pixel thick
  float nearest = max(max(l, r), max(d, u));
  float lap = (abs(l + r - 2.0 * w) + abs(u + d - 2.0 * w)) / max(w, nearest);
  float e = smoothstep(0.012, 0.03, lap);
  float z = 1.0 / w;
  e *= 1.0 - smoothstep(160.0, 650.0, z);
  outputColor = vec4(mix(inputColor.rgb, inkColor, e * 0.9), inputColor.a);
}`;

class InkEffect extends Effect {
  constructor(thickness: number) {
    super('InkEffect', inkFrag, {
      attributes: EffectAttribute.DEPTH,
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['inkColor', new THREE.Uniform(new THREE.Color(INK).convertSRGBToLinear())],
        ['thickness', new THREE.Uniform(thickness)],
      ]),
    });
  }
}

/**
 * Aerial perspective. Haze lies on the ground and thins with height, so the foot of a far hill
 * fades before its crest, and it brightens toward the sun. Where something stands in front of
 * the sun, shafts of light fan out around it (a march across the depth buffer toward the sun).
 */
const airFrag = /* glsl */ `
uniform mat4 projInv;
uniform mat4 camWorld;
uniform vec3 camPos;
uniform vec3 sunDir;
uniform vec3 haze;
uniform vec3 glow;
uniform float density;
uniform float falloff;
uniform float base;
uniform vec3 sunScreen; // xy: the sun's place on screen (0..1), z: how far in front of the camera it is
uniform float shafts;
uniform float aspectRatio;

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  vec4 v = projInv * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec3 ray = (camWorld * vec4(v.xyz / v.w, 0.0)).xyz;
  float dist = length(ray);
  vec3 dir = ray / dist;
  vec3 c = inputColor.rgb;
  float toSun = max(dot(dir, sunDir), 0.0);
  vec3 hazeCol = mix(haze, glow, pow(toSun, 6.0) * 0.6);
  if (depth < 0.99999) {
    // the integral of density * exp(-falloff * height) along the ray
    float dy = dir.y * falloff;
    float k = abs(dy) > 1e-5 ? (1.0 - exp(-dy * dist)) / dy : dist;
    float amount = density * exp(-falloff * (camPos.y - base)) * k;
    c = mix(c, hazeCol, 1.0 - exp(-amount));
  }
  if (shafts > 0.0 && sunScreen.z > 0.0) {
    vec2 d = sunScreen.xy - uv;
    vec2 da = vec2(d.x * aspectRatio, d.y);
    float reach = length(da);
    float lit = 0.0;
    const int N = 14;
    // a different starting offset per pixel turns banding into fine grain
    float jitter = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
    for (int i = 0; i < N; i++) {
      vec2 p = uv + d * ((float(i) + jitter) / float(N));
      float open = step(0.99999, readDepth(p));
      lit += open * step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0);
    }
    lit /= float(N);
    float halo = exp(-reach * 3.2);
    c += glow * (shafts * sunScreen.z * halo * lit * lit);
  }
  outputColor = vec4(c, inputColor.a);
}`;

class AirEffect extends Effect {
  constructor() {
    super('AirEffect', airFrag, {
      attributes: EffectAttribute.DEPTH,
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['projInv', new THREE.Uniform(new THREE.Matrix4())],
        ['camWorld', new THREE.Uniform(new THREE.Matrix4())],
        ['camPos', new THREE.Uniform(new THREE.Vector3())],
        ['sunDir', new THREE.Uniform(air.sun)],
        ['haze', new THREE.Uniform(new THREE.Color())],
        ['glow', new THREE.Uniform(new THREE.Color())],
        ['density', new THREE.Uniform(0)],
        ['falloff', new THREE.Uniform(0.012)],
        ['base', new THREE.Uniform(0)],
        ['sunScreen', new THREE.Uniform(new THREE.Vector3())],
        ['shafts', new THREE.Uniform(0)],
        ['aspectRatio', new THREE.Uniform(1)],
      ]),
    });
  }
}

/**
 * The final grade, on the tone-mapped picture: a gentle S-curve, cool shadows against warm
 * highlights, a little more colour in the mid-tones, darkened corners and a trace of grain.
 */
const gradeFrag = /* glsl */ `
uniform float grain;
uniform float seed;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = clamp(inputColor.rgb, 0.0, 1.0);
  c = pow(c, vec3(1.0 / 2.2));
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // split toning
  c *= mix(vec3(0.94, 0.98, 1.07), vec3(1.0), smoothstep(0.0, 0.45, l));
  c *= mix(vec3(1.0), vec3(1.035, 1.0, 0.95), smoothstep(0.5, 1.0, l));
  // contrast about middle grey
  c = mix(c, c * c * (3.0 - 2.0 * c), 0.32);
  // vibrance: lift weak colours more than strong ones
  l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
  c = mix(vec3(l), c, 1.0 + 0.22 * (1.0 - sat));
  vec2 q = uv - 0.5;
  c *= 1.0 - 0.42 * smoothstep(0.25, 0.95, dot(q, q) * 2.0);
  float n = fract(sin(dot(uv * (seed + 1.0), vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  c += n * grain;
  outputColor = vec4(pow(clamp(c, 0.0, 1.0), vec3(2.2)), inputColor.a);
}`;

class GradeEffect extends Effect {
  constructor() {
    super('GradeEffect', gradeFrag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['grain', new THREE.Uniform(0.018)],
        ['seed', new THREE.Uniform(0)],
      ]),
    });
  }
}

const tmp = new THREE.Vector3();

/** Keeps the atmosphere pass in step with the camera and the world's air. */
function useAir(fx: AirEffect, grade: GradeEffect, shafts: boolean) {
  useFrame(({ camera, size, clock }) => {
    const u = fx.uniforms;
    (u.get('projInv')!.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (u.get('camWorld')!.value as THREE.Matrix4).copy(camera.matrixWorld);
    (u.get('camPos')!.value as THREE.Vector3).setFromMatrixPosition(camera.matrixWorld);
    (u.get('haze')!.value as THREE.Color).copy(air.haze);
    (u.get('glow')!.value as THREE.Color).copy(air.glow);
    u.get('density')!.value = air.density;
    u.get('falloff')!.value = air.falloff;
    u.get('base')!.value = air.base;
    u.get('aspectRatio')!.value = size.width / size.height;
    // where the sun sits on screen; the shafts fade out as it leaves the view
    tmp.copy(air.sun).transformDirection(camera.matrixWorldInverse);
    const ahead = -tmp.z;
    const s = u.get('sunScreen')!.value as THREE.Vector3;
    if (shafts && air.shafts > 0 && ahead > 0.05) {
      tmp.copy(air.sun).multiplyScalar(1000).add(camera.position).project(camera);
      s.set(tmp.x * 0.5 + 0.5, tmp.y * 0.5 + 0.5, THREE.MathUtils.smoothstep(ahead, 0.05, 0.45));
    } else s.z = 0;
    u.get('shafts')!.value = air.shafts;
    grade.uniforms.get('seed')!.value = (clock.elapsedTime * 60) % 17;
  }, -1);
}

/** quality: 2 = ambient occlusion, bloom, light shafts + 4x MSAA; 1 = bloom + 2x MSAA; 0 = haze and grade only. */
export function Post({ quality, dpr }: { quality: number; dpr: number }) {
  const ink = useMemo(() => new InkEffect(1), []);
  const airFx = useMemo(() => new AirEffect(), []);
  const grade = useMemo(() => new GradeEffect(), []);
  ink.uniforms.get('thickness')!.value = dpr * 0.9;
  useAir(airFx, grade, quality === 2);
  const tone = <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />;

  if (TOON) {
    if (quality === 2)
      return (
        <EffectComposer key="toon-hi" multisampling={4} enableNormalPass={false}>
          <N8AO halfRes quality="performance" aoRadius={3} distanceFalloff={1.2} intensity={3.4} color="#3a2a48" />
          <primitive object={ink} />
          {tone}
        </EffectComposer>
      );
    return (
      <EffectComposer key={`toon-${quality}`} multisampling={quality === 1 ? 2 : 0} enableNormalPass={false}>
        <primitive object={ink} />
        {tone}
      </EffectComposer>
    );
  }

  const bloom = <Bloom mipmapBlur luminanceThreshold={0.92} luminanceSmoothing={0.25} intensity={0.55} radius={0.72} />;
  if (quality === 2)
    return (
      <EffectComposer key="hi" multisampling={4} enableNormalPass={false}>
        {/* a tight pass for creases and contact, a wide one for the shade under and between things */}
        <N8AO halfRes quality="medium" aoRadius={1.6} distanceFalloff={1} intensity={2.2} color="#2a2030" />
        <N8AO halfRes quality="performance" aoRadius={9} distanceFalloff={1.4} intensity={1.6} color="#33283a" />
        <primitive object={airFx} />
        {bloom}
        {tone}
        <primitive object={grade} />
      </EffectComposer>
    );
  if (quality === 1)
    return (
      <EffectComposer key="mid" multisampling={2} enableNormalPass={false}>
        <primitive object={airFx} />
        {bloom}
        {tone}
        <primitive object={grade} />
      </EffectComposer>
    );
  return (
    <EffectComposer key="lo" multisampling={0} enableNormalPass={false}>
      <primitive object={airFx} />
      {tone}
      <primitive object={grade} />
    </EffectComposer>
  );
}
