import { RIVER_COURSE } from '../ezekiel/World';
import {
  ALTAR,
  BUILDING,
  GATE,
  GATES,
  HOUSE,
  INNER,
  KITCHEN,
  OUTER_CHAMBER,
  PAVEMENT,
  PRIESTS,
  RIVER_PATH,
  SEPARATE,
  WALL,
  gateRect,
} from '../ezekiel/dims';
import { useStore } from '../store';
import { tapToWalk, usePlayerDot } from './mapCommon';

const rect = (x0: number, z0: number, x1: number, z1: number) => ({ x: x0, y: z0, width: x1 - x0, height: z1 - z0 });
const r4 = ([x0, z0, x1, z1]: [number, number, number, number]) => rect(x0, z0, x1, z1);

/** Top-down plan of Ezekiel's temple: the wall, gates and courts, the house, and the water; tap to walk. */
export function EzekielMap() {
  const dot = usePlayerDot();
  const open = useStore((s) => s.open);
  const pad = 12;
  const W = WALL.half;
  const vb = `${-W - pad} ${-W - pad} ${2 * W + pad * 2 + 40} ${2 * W + pad * 2}`;
  const inner = W - WALL.t;
  const P = PAVEMENT;
  const H = HOUSE;
  const river = [...RIVER_PATH, ...RIVER_COURSE.filter(([x]) => x < W + 52)].map(([x, z]) => `${x},${z}`).join(' ');
  return (
    <svg className="minimap ezekiel" viewBox={vb} onClick={tapToWalk} aria-label="Map: tap to walk">
      <rect {...rect(-W, -W, W, W)} className="mm-mount" />
      <rect {...rect(-inner, -inner, inner, inner)} className="mm-pave" />
      <rect {...rect(-P, -P, P, P)} className="mm-earth" />
      {/* the thirty chambers and the four kitchens */}
      {OUTER_CHAMBER.spans.flatMap(([a, b]) =>
        [1, -1].flatMap((s) => {
          const [x0, x1] = s > 0 ? [a, b] : [-b, -a];
          return [
            <rect key={`n${x0}`} {...rect(x0, -inner, x1, -inner + OUTER_CHAMBER.depth)} className="mm-stone" />,
            <rect key={`s${x0}`} {...rect(x0, inner - OUTER_CHAMBER.depth, x1, inner)} className="mm-stone" />,
            <rect key={`e${x0}`} {...rect(inner - OUTER_CHAMBER.depth, x0, inner, x1)} className="mm-stone" />,
          ];
        }),
      )}
      {[1, -1].flatMap((sx) =>
        [1, -1].map((sz) => (
          <rect
            key={`k${sx}${sz}`}
            {...rect(Math.min(sx * inner, sx * (inner - KITCHEN.long)), Math.min(sz * inner, sz * (inner - KITCHEN.broad)), Math.max(sx * inner, sx * (inner - KITCHEN.long)), Math.max(sz * inner, sz * (inner - KITCHEN.broad)))}
            className="mm-kitchen"
          />
        )),
      )}
      {/* the inner court and the separate place, the priests' chambers and the building */}
      <rect {...rect(SEPARATE.minX, -INNER.half, INNER.half, INNER.half)} className="mm-court" />
      {[1, -1].map((s) => (
        <g key={s}>
          <rect {...rect(PRIESTS.minX, s > 0 ? PRIESTS.innerRow[0] : -PRIESTS.innerRow[1], PRIESTS.maxX, s > 0 ? PRIESTS.innerRow[1] : -PRIESTS.innerRow[0])} className="mm-stone" />
          <rect {...rect(PRIESTS.outerMinX, s > 0 ? PRIESTS.outerRow[0] : -PRIESTS.outerRow[1], PRIESTS.maxX, s > 0 ? PRIESTS.outerRow[1] : -PRIESTS.outerRow[0])} className="mm-stone" />
        </g>
      ))}
      <rect {...rect(BUILDING.minX, -BUILDING.half, BUILDING.maxX, BUILDING.half)} className="mm-stone" />
      {/* the gates */}
      {GATES.map((g) => (
        <rect key={g.id} {...r4(gateRect(g, 0, GATE.len, -GATE.half, GATE.half))} className="mm-gatehouse" />
      ))}
      <line x1={W - 3} y1={-GATE.entry} x2={W - 3} y2={GATE.entry} className="mm-gate" />
      <line x1={53} y1={-GATE.entry} x2={53} y2={GATE.entry} className={open.sabbath ? 'mm-gate open' : 'mm-gate'} />
      {/* the house */}
      <rect {...rect(H.back, -H.outer, H.porchBack, H.outer)} className="mm-stone" />
      <rect {...rect(H.porchBack, -H.porchHalf, H.front, H.porchHalf)} className="mm-stone" />
      <rect {...rect(H.holiestBack, -H.inner, H.holiestX, H.inner)} className="mm-goldroom" />
      <rect {...rect(H.partition, -H.inner, H.holyX, H.inner)} className="mm-holy" />
      <rect {...rect(H.porchBack, -H.inner, H.porchIn, H.inner)} className="mm-porch" />
      <line x1={H.holyX + 1} y1={-H.door} x2={H.holyX + 1} y2={H.door} className={open.doors ? 'mm-veil open' : 'mm-veil'} />
      <line x1={H.holiestX + 1} y1={-H.holiestDoor} x2={H.holiestX + 1} y2={H.holiestDoor} className={open.holiest ? 'mm-veil open' : 'mm-veil'} />
      <rect {...rect(-ALTAR.base, -ALTAR.base, ALTAR.base, ALTAR.base)} className="mm-ramp" />
      <polyline points={river} className="mm-river" />
      <text x={W + 18} y={-W + 26} className="mm-label big">
        E
      </text>
      <g ref={dot}>
        <path d="M0,-4.2 L2.8,3 L0,1.6 L-2.8,3 Z" className="mm-player" transform="scale(3)" />
      </g>
    </svg>
  );
}
