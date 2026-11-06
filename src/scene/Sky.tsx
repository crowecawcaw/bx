import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Sky as SkyMesh } from 'three/examples/jsm/objects/Sky.js';
import { SITE } from '../sites';
import { player } from './Player';

/** Regions with a roof or curtains overhead, where the open sky shouldn't light things. */
const INDOOR: Record<string, string[]> = {
  tabernacle: ['holy', 'holiest'],
  temple: ['holy', 'oracle', 'chambers'],
  sea: [],
};

interface SkyProps {
  /** Direction toward the sun (any length); match the scene's directional light. */
  sun: [number, number, number];
  /** Colour the sky fades to at the horizon, normally the fog colour, so distant hills sit in it. */
  haze: string;
  /** Colour of the ground as the sky light sees it: warm bounce light from below. */
  ground: string;
  turbidity?: number;
  rayleigh?: number;
  /** Brightness of the visible sky. */
  exposure?: number;
  /** How strongly the sky lights and reflects in materials, outdoors. */
  light?: number;
  /** false: light the scene from this sky but keep the scene's own backdrop. */
  background?: boolean;
}

function makeSky({ sun, haze, turbidity = 2, rayleigh = 1.6, exposure = 1 }: SkyProps) {
  const sky = new SkyMesh();
  sky.scale.setScalar(10000);
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  const u = sky.material.uniforms;
  u.turbidity.value = turbidity;
  u.rayleigh.value = rayleigh;
  u.mieCoefficient.value = 0.004;
  u.mieDirectionalG.value = 0.82;
  u.sunPosition.value.set(...sun).normalize();
  u.haze = { value: new THREE.Color(haze) };
  u.exposure = { value: exposure };
  // scale the sky's brightness, and melt the horizon into the haze so fogged hills sit in it
  sky.material.fragmentShader = sky.material.fragmentShader
    .replace('void main() {', 'uniform vec3 haze;\nuniform float exposure;\nvoid main() {')
    .replace(
      'gl_FragColor = vec4( retColor, 1.0 );',
      `retColor *= exposure;
      float up = direction.y;
      retColor = mix(haze, retColor, smoothstep(-0.01, 0.16, up) * 0.85 + 0.15 * step(0.0, up));
      gl_FragColor = vec4( retColor, 1.0 );`,
    );
  sky.material.fog = false;
  return sky;
}

/**
 * A physically based sky (Preetham) whose sun matches the scene's light, plus image-based lighting
 * from it: every material reflects this sky and is lit by it. Inside the sanctuary a warm,
 * lamp-lit room takes its place, since the walls and curtains shut the sky out.
 */
export function SkyLight(props: SkyProps) {
  const { background = true, light = 0.55, ground } = props;
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const sky = useMemo(() => makeSky(props), []); // eslint-disable-line react-hooks/exhaustive-deps

  const envs = useRef<{ out: THREE.Texture; in: THREE.Texture } | null>(null);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    // outdoors: just the sky over a warm ground, baked into a prefiltered environment map
    const outScene = new THREE.Scene();
    const envSky = makeSky({ ...props, exposure: (props.exposure ?? 1) * 0.9 });
    outScene.add(envSky);
    const floor = new THREE.Mesh(
      new THREE.SphereGeometry(500, 32, 16, 0, Math.PI * 2, Math.PI / 2 + 0.02, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: ground, side: THREE.BackSide }),
    );
    outScene.add(floor);
    const outRt = pmrem.fromScene(outScene, 0, 0.1, 20000);
    // indoors: a closed, lamp-lit room, so gold reflects warm walls rather than a blue sky
    const room = new THREE.Mesh(
      new THREE.SphereGeometry(50, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `varying vec3 vP;
          void main(){
            vec3 c = mix(vec3(0.16, 0.1, 0.06), vec3(0.55, 0.36, 0.14), smoothstep(-0.6, 0.1, vP.y));
            c = mix(c, vec3(0.12, 0.08, 0.06), smoothstep(0.3, 0.9, vP.y));
            c += vec3(1.4, 0.9, 0.45) * pow(max(0.0, dot(vP, normalize(vec3(0.3, 0.25, 0.9)))), 12.0);
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    );
    const inScene = new THREE.Scene();
    inScene.add(room);
    const inRt = pmrem.fromScene(inScene, 0.02);
    envs.current = { out: outRt.texture, in: inRt.texture };
    scene.environment = outRt.texture;
    scene.environmentIntensity = light;
    pmrem.dispose();
    for (const m of [envSky, floor, room]) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    return () => {
      if (scene.environment === outRt.texture || scene.environment === inRt.texture) scene.environment = null;
      outRt.dispose();
      inRt.dispose();
      envs.current = null;
    };
  }, [gl, scene]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    if (!envs.current) return;
    const indoor = !!INDOOR[SITE.id]?.includes(SITE.regionOf(player.x, player.z));
    // the change happens as you pass a doorway or curtain, which hides the switch
    const env = indoor ? envs.current.in : envs.current.out;
    if (scene.environment !== env) scene.environment = env;
    const target = indoor ? 0.6 : light;
    scene.environmentIntensity += (target - scene.environmentIntensity) * Math.min(1, dt * 4);
  });

  return background ? <primitive object={sky} /> : null;
}
