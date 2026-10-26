import { useEffect, useRef, type MouseEvent } from 'react';
import { player, walkTo } from '../scene/Player';
import { walkable } from '../scene/nav';

/** Keeps an SVG group on the player's position and heading, without React re-renders. */
export function usePlayerDot() {
  const dot = useRef<SVGGElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (dot.current) {
        const deg = (-player.yaw * 180) / Math.PI;
        dot.current.setAttribute('transform', `translate(${player.x} ${player.z}) rotate(${deg})`);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return dot;
}

/** Map clicks are in world cubits (x east, y = z south): walk there. */
export function tapToWalk(e: MouseEvent<SVGSVGElement>) {
  const svg = e.currentTarget;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
  // stay on this storey if the spot is on it; otherwise go down to the ground
  walkTo(p.x, p.y, walkable(p.x, p.y, player.level) ? player.level : 0);
}
