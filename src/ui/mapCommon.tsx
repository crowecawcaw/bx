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

/** The last map tap: when, where on screen, and the spot it chose. */
const first = { t: -Infinity, x: 0, y: 0, spot: [0, 0, 0] };

/**
 * Map clicks are in world cubits (x east, y = z south): walk there. A second tap soon after,
 * within a few pixels on screen, jumps to the spot the first tap chose.
 */
export function tapToWalk(e: MouseEvent<SVGSVGElement>, zScale = 1) {
  const now = e.timeStamp; // when the finger touched, even if the page was busy
  if (now - first.t < 450 && Math.hypot(e.clientX - first.x, e.clientY - first.y) < 40) {
    first.t = -Infinity;
    teleportTo(first.spot[0], first.spot[1], first.spot[2]);
    return;
  }
  const svg = e.currentTarget;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
  const x = p.x;
  const z = p.y / zScale;
  // stay on this storey if the spot is on it; otherwise go down to the ground
  const level = walkable(x, z, player.level) ? player.level : 0;
  Object.assign(first, { t: now, x: e.clientX, y: e.clientY, spot: [x, z, level] });
  walkTo(x, z, level);
}
