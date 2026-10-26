import { useEffect, useRef } from 'react';
import { player } from '../scene/Player';
import { CLOUD_X, CRASH_AT, HALF, RISE_X, SLAB, START, groundH } from '../sea/dims';
import { SITE } from '../sites';
import { tapToWalk, usePlayerDot } from './mapCommon';

/** The path is long and narrow, so the plan is stretched north-south to stay readable. */
const ZS = 6;
const { minX, maxX } = SITE.bounds;

/** Where the climbing seabed reaches the level of the sea. */
const SEA_LEVEL_X = (() => {
  let x = 0;
  while (x < maxX && groundH(x, 0) < CRASH_AT) x += 2;
  return x;
})();

/** Strip map of the crossing, west to east; tap to walk, double-tap to jump. */
export function SeaMap() {
  const dot = usePlayerDot(ZS);
  const top = (HALF + SLAB + 3) * ZS;
  const vb = `${minX - 15} ${-top} ${maxX - minX + 30} ${top * 2}`;
  const path = HALF * ZS;
  return (
    <svg className="minimap sea" viewBox={vb} onClick={(e) => tapToWalk(e, ZS)} aria-label="Map: tap to walk">
      <defs>
        <linearGradient id="mm-rise" x1="0" x2="1">
          <stop offset="0" stopColor="#e6d2a6" />
          <stop offset="1" stopColor="#b9a26a" />
        </linearGradient>
      </defs>
      <rect x={minX - 15} y={-top} width={maxX - minX + 30} height={top * 2} className="mm-sea" />
      <rect x={minX - 15} y={-path} width={RISE_X - minX + 15} height={path * 2} className="mm-path" />
      <rect x={RISE_X} y={-path} width={SEA_LEVEL_X - RISE_X} height={path * 2} fill="url(#mm-rise)" />
      <rect x={SEA_LEVEL_X} y={-top} width={maxX - SEA_LEVEL_X + 15} height={top * 2} className="mm-land" />
      <line x1={SEA_LEVEL_X} y1={-top} x2={SEA_LEVEL_X} y2={top} className="mm-sealevel" />
      <circle cx={CLOUD_X + 40} cy={0} r={70} className="mm-cloud" />
      <text x={minX + 6} y={-path - 14} className="mm-label big">
        W
      </text>
      <text x={maxX - 40} y={-path - 14} className="mm-label big">
        E
      </text>
      <g ref={dot}>
        <path d="M0,-4.2 L2.8,3 L0,1.6 L-2.8,3 Z" className="mm-player" transform="scale(10)" />
      </g>
    </svg>
  );
}

/** " · 120 cubits walked": the furthest you have come from the western shore. */
export function Walked() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let best = 0;
    let shown = -1;
    let raf = 0;
    const tick = () => {
      best = Math.max(best, player.x - START.x);
      const n = Math.round(best / 10) * 10;
      if (n !== shown && ref.current) {
        shown = n;
        ref.current.textContent = ` · ${n.toLocaleString()} cubits`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <span ref={ref} />;
}
