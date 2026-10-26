import { useStore } from '../store';
import {
  ALTAR,
  CHAMBER_BACK,
  CHAMBER_OUT,
  GREAT,
  HOUSE,
  INNER,
  OUT,
  PILLAR,
  PLAT,
  PORCH,
  STEPS,
  POS,
  RAMP,
  SEA,
} from '../temple/dims';
import { tapToWalk, usePlayerDot } from './mapCommon';

const rect = (x0: number, z0: number, x1: number, z1: number) => ({ x: x0, y: z0, width: x1 - x0, height: z1 - z0 });

/** Top-down plan of the temple courts and house; tap to walk. */
export function TempleMap() {
  const dot = usePlayerDot();
  const open = useStore((s) => s.open);
  const { halfWidth: hw } = HOUSE;
  const pad = 8;
  const vb = `${GREAT.minX - pad} ${GREAT.minZ - pad} ${GREAT.maxX - GREAT.minX + pad * 2} ${GREAT.maxZ - GREAT.minZ + pad * 2}`;
  return (
    <svg className="minimap temple" viewBox={vb} onClick={tapToWalk} aria-label="Map: tap to walk">
      <rect {...rect(GREAT.minX, GREAT.minZ, GREAT.maxX, GREAT.maxZ)} className="mm-great" />
      <rect {...rect(INNER.minX, INNER.minZ, INNER.maxX, INNER.maxZ)} className="mm-court" />
      <line x1={INNER.maxX} y1={-INNER.gate} x2={INNER.maxX} y2={INNER.gate} className={open.gate ? 'mm-gate open' : 'mm-gate'} />
      {/* the platform and its steps, the house with its chambers, and the porch */}
      <rect {...rect(PLAT.minX, -PLAT.halfZ, PLAT.maxX, PLAT.halfZ)} className="mm-ramp" />
      <rect {...rect(PLAT.maxX, -STEPS.halfZ, PLAT.maxX + STEPS.run, STEPS.halfZ)} className="mm-ramp" />
      <rect {...rect(CHAMBER_BACK, -CHAMBER_OUT, OUT, CHAMBER_OUT)} className="mm-stone" />
      <rect {...rect(PORCH.backX, -OUT, PORCH.faceX, OUT)} className="mm-stone" />
      <rect {...rect(HOUSE.oracleX, -hw, HOUSE.frontX, hw)} className="mm-goldroom" />
      <rect {...rect(PORCH.backX, -hw, PORCH.faceX, hw)} className="mm-porch" />
      <line x1={HOUSE.partitionX} y1={-hw} x2={HOUSE.partitionX} y2={hw} className={open.veil ? 'mm-veil open' : 'mm-veil'} />
      {[1, -1].map((s) => (
        <circle key={s} cx={PILLAR.x} cy={s * PILLAR.z} r={PILLAR.radius} className="mm-bronze" />
      ))}
      <rect {...rect(POS.ark[0] - 1, -1.5, POS.ark[0] + 1, 1.5)} className="mm-gold" />
      {/* court vessels */}
      <rect {...rect(POS.altar[0] - ALTAR.size / 2, -ALTAR.size / 2, POS.altar[0] + ALTAR.size / 2, ALTAR.size / 2)} className="mm-bronze" />
      <rect {...rect(RAMP.minX, ALTAR.size / 2, RAMP.maxX, ALTAR.size / 2 + RAMP.length)} className="mm-ramp" />
      <circle cx={POS.sea[0]} cy={POS.sea[1]} r={SEA.radius} className="mm-bronze" />
      {POS.basesX.flatMap((x) =>
        [1, -1].map((s) => <rect key={`${x}${s}`} {...rect(x - 2, s * POS.basesZ - 2, x + 2, s * POS.basesZ + 2)} className="mm-bronze" />),
      )}
      <text x={GREAT.maxX - 14} y={4} className="mm-label big">
        E
      </text>
      <g ref={dot}>
        <path d="M0,-4.2 L2.8,3 L0,1.6 L-2.8,3 Z" className="mm-player" transform="scale(2.2)" />
      </g>
    </svg>
  );
}
