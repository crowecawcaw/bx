import { useEffect, useRef, type MouseEvent } from 'react';
import { player, teleportTo, walkTo } from '../scene/Player';
import { walkable } from '../scene/nav';

/**
 * Keeps an SVG group on the player's position and heading, without React re-renders.
 * `zScale` stretches the plan north-south (for a long, narrow site drawn at a readable size).
 */
export function usePlayerDot(zScale = 1) {
  const dot = useRef<SVGGElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (dot.current) {
        const deg = (-player.yaw * 180) / Math.PI;
        dot.current.setAttribute('transform', `translate(${player.x} ${player.z * zScale}) rotate(${deg})`);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [zScale]);
  return dot;
}

const lastTap = { t: 0, x: 0, y: 0 };

/** Map clicks are in world cubits (x east, y = z south): walk there, or jump there on a double tap. */
export function tapToWalk(e: MouseEvent<SVGSVGElement>, zScale = 1) {
  const svg = e.currentTarget;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
  const x = p.x;
  const z = p.y / zScale;
  // stay on this storey if the spot is on it; otherwise go down to the ground
  const level = walkable(x, z, player.level) ? player.level : 0;
  const now = performance.now();
  if (now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
    lastTap.t = 0;
    teleportTo(x, z, level);
    return;
  }
  Object.assign(lastTap, { t: now, x: e.clientX, y: e.clientY });
  walkTo(x, z, level);
}
