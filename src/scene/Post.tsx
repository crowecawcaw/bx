import { EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing';
import { BlendFunction, Effect, EffectAttribute, ToneMappingMode } from 'postprocessing';
import { useMemo } from 'react';
import * as THREE from 'three';
import { INK } from './materials';

/**
 * Ink lines drawn from the depth buffer. On any flat surface 1/z changes linearly across the
 * screen, so its second difference is zero there and spikes at silhouettes and creases.
 * That gives outlines for every object (and fold) without extra geometry.
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

/** quality: 2 = ambient occlusion + 4x MSAA, 1 = 2x MSAA, 0 = ink lines only. */
export function Post({ quality, dpr }: { quality: number; dpr: number }) {
  const ink = useMemo(() => new InkEffect(1), []);
  ink.uniforms.get('thickness')!.value = dpr * 0.9;
  const tone = <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />;
  if (quality === 2)
    return (
      <EffectComposer key="hi" multisampling={4} enableNormalPass={false}>
        <N8AO halfRes quality="performance" aoRadius={3} distanceFalloff={1.2} intensity={3.4} color="#3a2a48" />
        <primitive object={ink} />
        {tone}
      </EffectComposer>
    );
  return (
    <EffectComposer key={quality} multisampling={quality === 1 ? 2 : 0} enableNormalPass={false}>
      <primitive object={ink} />
      {tone}
    </EffectComposer>
  );
}
