import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

interface Part {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

/** Every mesh (and every instance of an instanced mesh) under `root`, merged per material, in root's space. */
function bake(root: THREE.Object3D): Part[] {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, m: THREE.Matrix4) => {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(m);
    const n = g.attributes.position.count;
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    let list = groups.get(mat);
    if (!list) groups.set(mat, (list = []));
    list.push(g);
  };
  const local = new THREE.Matrix4();
  const inst = new THREE.Matrix4();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    local.multiplyMatrices(inv, mesh.matrixWorld);
    const im = o as THREE.InstancedMesh;
    if (im.isInstancedMesh) {
      for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, inst);
        add(mesh.geometry, mesh.material, new THREE.Matrix4().multiplyMatrices(local, inst));
      }
    } else add(mesh.geometry, mesh.material, local.clone());
  });
  return [...groups].map(([material, list]) => {
    const geometry = mergeGeometries(list)!;
    list.forEach((g) => g.dispose());
    geometry.computeBoundingSphere();
    return { geometry, material };
  });
}

/**
 * Renders `children` once, bakes them into one merged geometry per material, then draws that
 * at each placement with instancing. Ten lampstands then cost a handful of draw calls, not hundreds.
 * The copies are static: per-frame animation in the children (flames, lights) is dropped.
 */
export function Replicate({
  at,
  feature,
  children,
}: {
  at: { x: number; z: number; rotY: number }[];
  feature: string;
  children: ReactNode;
}) {
  const proto = useRef<THREE.Group>(null);
  const [parts, setParts] = useState<Part[] | null>(null);
  useLayoutEffect(() => {
    if (!parts && proto.current) setParts(bake(proto.current));
  }, [parts]);
  const mats = useMemo(
    () =>
      at.map(({ x, z, rotY }) =>
        new THREE.Matrix4().compose(
          new THREE.Vector3(x, 0, z),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY),
          new THREE.Vector3(1, 1, 1),
        ),
      ),
    [at],
  );
  if (!parts)
    return (
      <group ref={proto} visible={false}>
        {children}
      </group>
    );
  return (
    <group userData={{ feature }}>
      {parts.map((p, i) => (
        <Instanced key={i} part={p} mats={mats} />
      ))}
    </group>
  );
}

function Instanced({ part, mats }: { part: Part; mats: THREE.Matrix4[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    mats.forEach((m, i) => ref.current!.setMatrixAt(i, m));
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [mats]);
  return <instancedMesh ref={ref} args={[part.geometry, part.material, mats.length]} castShadow receiveShadow />;
}
