import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Collects axis-aligned blocks by material and merges them into one geometry per material.
 * UVs come from world position, so a texture tile is the same size in cubits on every wall,
 * and images read the right way round from whichever side you look at them.
 */
export class Mason {
  private parts = new Map<string, THREE.BufferGeometry[]>();
  constructor(private tiles: Record<string, [number, number]>) {}

  box(key: string, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) {
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return;
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    worldUV(g, this.tiles[key] ?? [1, 1]);
    let list = this.parts.get(key);
    if (!list) this.parts.set(key, (list = []));
    list.push(g);
  }

  /**
   * A wall slab with rectangular holes (doors, windows). `along` is the wall's run (x or z),
   * holes are [a0, a1, y0, y1] in the same axis. The slab is split into solid pieces around them.
   */
  wall(
    key: string,
    along: 'x' | 'z',
    a0: number,
    a1: number,
    y0: number,
    y1: number,
    t0: number,
    t1: number,
    holes: [number, number, number, number][] = [],
  ) {
    for (const [p0, p1, q0, q1] of solidPieces(a0, a1, y0, y1, holes)) {
      if (along === 'x') this.box(key, p0, p1, q0, q1, t0, t1);
      else this.box(key, t0, t1, q0, q1, p0, p1);
    }
  }

  build(): Record<string, THREE.BufferGeometry> {
    const out: Record<string, THREE.BufferGeometry> = {};
    for (const [k, list] of this.parts) {
      out[k] = mergeGeometries(list)!;
      list.forEach((g) => g.dispose());
      out[k].computeBoundingSphere();
    }
    return out;
  }
}

/** Splits a rectangle into solid rectangles around non-overlapping holes. */
export function solidPieces(a0: number, a1: number, y0: number, y1: number, holes: [number, number, number, number][]) {
  const cuts = [a0, a1, ...holes.flatMap((h) => [h[0], h[1]])].filter((v) => v >= a0 && v <= a1);
  const xs = [...new Set(cuts)].sort((a, b) => a - b);
  const out: [number, number, number, number][] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const p0 = xs[i];
    const p1 = xs[i + 1];
    const mid = (p0 + p1) / 2;
    const inCol = holes.filter((h) => h[0] < mid && h[1] > mid).sort((a, b) => a[2] - b[2]);
    let y = y0;
    for (const h of inCol) {
      if (h[2] > y) out.push([p0, p1, y, h[2]]);
      y = Math.max(y, h[3]);
    }
    if (y < y1) out.push([p0, p1, y, y1]);
  }
  return out;
}

/** Replaces box UVs with world-space ones: (along the face to the viewer's right, up) / tile. */
export function worldUV(g: THREE.BufferGeometry, [tu, tv]: [number, number]) {
  const p = g.attributes.position as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const nx = n.getX(i);
    const ny = n.getY(i);
    const nz = n.getZ(i);
    let u: number;
    let v: number;
    if (Math.abs(ny) > 0.5) {
      u = x;
      v = ny > 0 ? -z : z;
    } else if (Math.abs(nx) > 0.5) {
      u = nx > 0 ? -z : z;
      v = y;
    } else {
      u = nz > 0 ? x : -x;
      v = y;
    }
    uv.setXY(i, u / tu, v / tv);
  }
  uv.needsUpdate = true;
}
