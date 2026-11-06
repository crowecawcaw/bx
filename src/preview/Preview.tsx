/**
 * Asset preview: one model or texture on its own, with orbit controls and the scene's lighting.
 * Open with `?preview`, or link straight to an item: `?preview=model:menorah`, `?preview=tex:ashlar`.
 * Add `&toon` to see the original cel shading.
 */
import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Cherub } from '../scene/Cherub';
import { Courtyard } from '../scene/Courtyard';
import { Wind } from '../scene/Environment';
import { Ark, BronzeAltar, IncenseAltar, Laver, Menorah, Table } from '../scene/Furniture';
import { TOON, toon } from '../scene/materials';
import { SkyLight } from '../scene/Sky';
import { Post } from '../scene/Post';
import { Tent } from '../scene/Tent';
import * as tabTex from '../scene/textures';
import { bumpOf, weaveBump } from '../scene/textures';
import { House } from '../temple/House';
import { Pillars } from '../temple/Pillars';
import { TempleCherub } from '../temple/TempleCherub';
import * as templeTex from '../temple/textures';
import { Bases, BrassAltar, MoltenSea } from '../temple/Vessels';

const MODELS: Record<string, () => ReactNode> = {
  ark: () => <Ark at={[0, 0]} rotY={0} presence={false} />,
  table: () => <Table at={[0, 0]} />,
  menorah: () => <Menorah at={[0, 0]} rotY={0} light={false} />,
  incense: () => <IncenseAltar at={[0, 0]} />,
  bronzeAltar: () => <BronzeAltar />,
  laver: () => <Laver />,
  cherub: () => <Cherub />,
  tent: () => <Tent />,
  courtyard: () => <Courtyard />,
  templeCherub: () => <TempleCherub position={[0, 0, 0]} />,
  jachinBoaz: () => <Pillars />,
  moltenSea: () => <MoltenSea />,
  bases: () => <Bases />,
  brassAltar: () => <BrassAltar />,
  house: () => <House />,
};

// Every exported no-argument `...Texture()` function in the two texture modules.
const TEXTURES: Record<string, () => THREE.Texture> = {};
for (const mod of [tabTex, templeTex] as Record<string, unknown>[]) {
  for (const [name, fn] of Object.entries(mod)) {
    if (typeof fn === 'function' && name.endsWith('Texture') && fn.length === 0) {
      TEXTURES[name.replace(/Texture$/, '')] = fn as () => THREE.Texture;
    }
  }
}
TEXTURES.weaveBump = weaveBump;

type Shape = 'plane' | 'box' | 'sphere' | 'cylinder';

function readHash() {
  const v = new URLSearchParams(location.search).get('preview') || 'model:menorah';
  const [kind, name] = v.split(':');
  return kind === 'tex' && TEXTURES[name] ? { kind: 'tex' as const, name } : { kind: 'model' as const, name: MODELS[name] ? name : 'menorah' };
}

/** Frames the camera on the item: on load, after shapes settle, and when `n` (the Fit button) changes. */
function Fit({ target, dep, n }: { target: React.RefObject<THREE.Group>; dep: string; n: number }) {
  const { camera, controls, size } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera;
    controls: { target: THREE.Vector3; update: () => void } | null;
    size: { width: number; height: number };
  };
  useEffect(() => {
    const fit = () => {
      if (!target.current || !controls) return;
      const box = new THREE.Box3().setFromObject(target.current);
      if (box.isEmpty()) return;
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const fov = THREE.MathUtils.degToRad(camera.fov);
      const fit = Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * camera.aspect));
      const dist = (sphere.radius * 1.15) / Math.sin(fit / 2);
      const dir = new THREE.Vector3(1, 0.55, 1.3).normalize();
      camera.position.copy(sphere.center).addScaledVector(dir, dist);
      camera.near = dist / 200;
      camera.far = dist * 20;
      camera.updateProjectionMatrix();
      controls.target.copy(sphere.center);
      controls.update();
    };
    // cloth and instanced parts finish building a little after mount
    const ids = [150, 800, 2000].map((t) => setTimeout(fit, t));
    return () => ids.forEach(clearTimeout);
  }, [dep, n, controls, camera, target, size.width, size.height]);
  return null;
}

/** Counts triangles and meshes under the item, and applies the wireframe toggle. */
function Stats({ target, wire, onStats }: { target: React.RefObject<THREE.Group>; wire: boolean; onStats: (s: string) => void }) {
  useEffect(() => {
    const id = setTimeout(() => {
      let tris = 0;
      let meshes = 0;
      target.current?.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !m.geometry) return;
        meshes++;
        const g = m.geometry;
        const n = (g.index ? g.index.count : g.attributes.position?.count ?? 0) / 3;
        const inst = (m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : 1;
        tris += n * inst;
        for (const mat of ([] as THREE.Material[]).concat(m.material)) {
          if ('wireframe' in mat) (mat as THREE.MeshBasicMaterial).wireframe = wire;
        }
      });
      onStats(`${meshes} meshes · ${Math.round(tris).toLocaleString()} triangles`);
    }, 300);
    return () => clearTimeout(id);
  });
  return null;
}

function TextureMesh({ tex, shape, tiles, real }: { tex: THREE.Texture; shape: Shape; tiles: number; real: boolean }) {
  const bump = bumpOf(tex.name);
  const mat = useMemo(() => {
    const isBumpOnly = tex === weaveBump();
    const p = { map: isBumpOnly ? null : tex, bumpMap: isBumpOnly ? tex : bump ?? null, bumpScale: 1, side: THREE.DoubleSide };
    // the app material by default; "plain" is an untuned matte standard material, for comparison
    return real ? new THREE.MeshStandardMaterial({ ...p, roughness: 0.8 }) : toon(`preview:${tex.name || 'weave'}`, p);
  }, [tex, bump, real]);
  // show the texture at `tiles` repeats, whatever repeat the scene uses
  useLayoutEffect(() => {
    const saved = [tex.repeat.clone(), bump?.repeat.clone()] as const;
    for (const t of [tex, bump]) {
      if (!t) continue;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(tiles, tiles);
      t.needsUpdate = true;
    }
    return () => {
      tex.repeat.copy(saved[0]);
      if (bump && saved[1]) bump.repeat.copy(saved[1]);
    };
  }, [tex, bump, tiles]);
  return (
    <mesh material={mat} castShadow receiveShadow>
      {shape === 'plane' && <planeGeometry args={[4, 4]} />}
      {shape === 'box' && <boxGeometry args={[2.5, 2.5, 2.5]} />}
      {shape === 'sphere' && <sphereGeometry args={[1.6, 64, 32]} />}
      {shape === 'cylinder' && <cylinderGeometry args={[1.2, 1.2, 3, 48]} />}
    </mesh>
  );
}

/** The source canvases, flat, so you can see the pixels the scene samples. */
function Flat({ tex }: { tex: THREE.Texture }) {
  const bump = bumpOf(tex.name);
  const srcs = [tex, bump].filter(Boolean).map((t) => {
    const img = t!.image as HTMLCanvasElement | ImageData | undefined;
    if (img instanceof HTMLCanvasElement) return { url: img.toDataURL(), w: img.width, h: img.height };
    if (img && 'data' in img) {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const d = new ImageData(img.width, img.height);
      // bump maps are single-channel DataTextures; spread to grey
      const src = img.data as ArrayLike<number>;
      const stride = src.length / (img.width * img.height);
      for (let i = 0; i < img.width * img.height; i++) {
        const v = src[i * stride];
        d.data.set([v, v, v, 255], i * 4);
      }
      c.getContext('2d')!.putImageData(d, 0, 0);
      return { url: c.toDataURL(), w: img.width, h: img.height };
    }
    return null;
  });
  return (
    <div className="pv-flat">
      {srcs.map((s, i) =>
        s ? (
          <figure key={i}>
            <img src={s.url} alt="" />
            <figcaption>
              {i === 0 ? 'colour' : 'bump'} · {s.w}×{s.h}
            </figcaption>
          </figure>
        ) : null,
      )}
    </div>
  );
}

export function Preview() {
  const [sel, setSel] = useState(readHash);
  const [wire, setWire] = useState(false);
  const [ink, setInk] = useState(true);
  const [shape, setShape] = useState<Shape>('sphere');
  const [tiles, setTiles] = useState(1);
  const [flat, setFlat] = useState(false);
  const [real, setReal] = useState(false);
  const [refit, setRefit] = useState(0);
  const [sun, setSun] = useState(40);
  const [stats, setStats] = useState('');
  const item = useRef<THREE.Group>(null);
  const key = `${sel.kind}:${sel.name}`;

  useEffect(() => {
    const u = new URL(location.href);
    u.searchParams.set('preview', key);
    history.replaceState(null, '', u);
  }, [key]);

  const tex = sel.kind === 'tex' ? TEXTURES[sel.name]() : null;
  const a = (sun * Math.PI) / 180;
  const sunPos: [number, number, number] = [Math.cos(a) * 60, Math.sin(a) * 60 + 5, 35];

  return (
    <div className="pv">
      <Canvas shadows dpr={Math.min(devicePixelRatio, 1.5)} camera={{ fov: 40, near: 0.05, far: 2000, position: [6, 4, 8] }}
        gl={{ antialias: !ink }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <color attach="background" args={['#cfd6dc']} />
        {!TOON && <SkyLight sun={sunPos} haze="#ecdcc0" ground="#c08850" light={0.45} background={false} />}
        <hemisphereLight args={['#a9b6e8', '#c49460', TOON ? 1.0 : 0.45]} />
        <directionalLight position={sunPos} intensity={TOON ? 2.5 : 3.1} color="#ffdcae" castShadow shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} shadow-bias={-0.0005} />
        <Wind />
        <Suspense fallback={null}>
          <group ref={item} key={key}>
            {tex ? <TextureMesh tex={tex} shape={shape} tiles={tiles} real={real} /> : MODELS[sel.name]()}
          </group>
        </Suspense>
        <Fit target={item} dep={key + shape} n={refit} />
        <Stats target={item} wire={wire} onStats={setStats} />
        <OrbitControls makeDefault enableDamping />
        {ink && <Post quality={0} dpr={Math.min(devicePixelRatio, 1.5)} />}
      </Canvas>

      {tex && flat && <Flat tex={tex} />}

      <div className="pv-panel">
        <select value={key} onChange={(e) => { const [kind, name] = e.target.value.split(':'); setSel({ kind: kind as 'tex' | 'model', name }); }}>
          <optgroup label="Models">
            {Object.keys(MODELS).map((m) => <option key={m} value={`model:${m}`}>{m}</option>)}
          </optgroup>
          <optgroup label="Textures">
            {Object.keys(TEXTURES).map((t) => <option key={t} value={`tex:${t}`}>{t}</option>)}
          </optgroup>
        </select>
        <div className="pv-row">
          <label><input type="checkbox" checked={ink} onChange={(e) => setInk(e.target.checked)} /> ink</label>
          <label><input type="checkbox" checked={wire} onChange={(e) => setWire(e.target.checked)} /> wire</label>
          <button onClick={() => setRefit((n) => n + 1)}>fit</button>
          {tex && <label><input type="checkbox" checked={real} onChange={(e) => setReal(e.target.checked)} /> plain</label>}
          {tex && <label><input type="checkbox" checked={flat} onChange={(e) => setFlat(e.target.checked)} /> flat</label>}
        </div>
        {tex && (
          <div className="pv-row">
            {(['sphere', 'box', 'cylinder', 'plane'] as Shape[]).map((s) => (
              <button key={s} className={s === shape ? 'on' : ''} onClick={() => setShape(s)}>{s}</button>
            ))}
            <label>tiles <input type="number" min={1} max={16} value={tiles} onChange={(e) => setTiles(Math.max(1, +e.target.value || 1))} /></label>
          </div>
        )}
        <label className="pv-row">sun <input type="range" min={5} max={175} value={sun} onChange={(e) => setSun(+e.target.value)} /></label>
        <div className="pv-stats">{stats}</div>
      </div>
    </div>
  );
}
