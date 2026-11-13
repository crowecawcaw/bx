import {
  ALTAR,
  AZARAH,
  CHEL,
  GATE,
  HOUSE,
  LAVER,
  MOUNT,
  PORTICO,
  RAMP,
  SOREG,
  STOA,
  WOMEN,
} from '../second/dims';
import { useStore } from '../store';
import { tapToWalk, usePlayerDot } from './mapCommon';

const rect = (x0: number, z0: number, x1: number, z1: number) => ({ x: x0, y: z0, width: x1 - x0, height: z1 - z0 });

/** Top-down plan of the temple mount, its courts and the house; tap to walk. */
export function SecondMap() {
  const dot = usePlayerDot();
  const open = useStore((s) => s.open);
  const pad = 10;
  const vb = `${MOUNT.minX - pad} ${MOUNT.minZ - pad} ${MOUNT.maxX - MOUNT.minX + pad * 2} ${MOUNT.maxZ - MOUNT.minZ + pad * 2}`;
  const { minX, maxX, minZ, maxZ } = MOUNT;
  const D = PORTICO.depth;
  return (
    <svg className="minimap second" viewBox={vb} onClick={tapToWalk} aria-label="Map: tap to walk">
      <rect {...rect(minX, minZ, maxX, maxZ)} className="mm-mount" />
      {/* the porticoes, and the Royal Stoa on the south */}
      <rect {...rect(minX, minZ, maxX, minZ + D)} className="mm-portico" />
      <rect {...rect(minX, minZ, minX + D, maxZ)} className="mm-portico" />
      <rect {...rect(maxX - D, minZ, maxX, maxZ)} className="mm-portico" />
      <rect {...rect(minX, maxZ - STOA.depth, maxX, maxZ)} className="mm-portico" />
      <rect {...rect(SOREG.minX, -SOREG.half, SOREG.maxX, SOREG.half)} className="mm-soreg" />
      <rect {...rect(CHEL.minX, -CHEL.half, CHEL.maxX, CHEL.half)} className="mm-chel" />
      <rect {...rect(AZARAH.minX, -AZARAH.half, AZARAH.maxX, AZARAH.half)} className="mm-court" />
      <rect {...rect(WOMEN.minX, -WOMEN.half, WOMEN.maxX, WOMEN.half)} className="mm-court" />
      <line x1={AZARAH.maxX + 2} y1={-GATE.half} x2={AZARAH.maxX + 2} y2={GATE.half} className={open.nicanor ? 'mm-gate open' : 'mm-gate'} />
      {/* the house, the Holy Place and the Most Holy Place */}
      <rect {...rect(HOUSE.backX, -HOUSE.body, HOUSE.hekalX, HOUSE.body)} className="mm-stone" />
      <rect {...rect(HOUSE.hekalX, -HOUSE.porch, HOUSE.frontX, HOUSE.porch)} className="mm-stone" />
      <rect {...rect(HOUSE.holiestX, -HOUSE.inner, HOUSE.hekalX, HOUSE.inner)} className="mm-goldroom" />
      <rect {...rect(HOUSE.porchBack, -HOUSE.porchInner, HOUSE.porchIn, HOUSE.porchInner)} className="mm-porch" />
      <line x1={HOUSE.veilEast} y1={-HOUSE.inner} x2={HOUSE.veilEast} y2={HOUSE.inner} className={open.veil ? 'mm-veil open' : 'mm-veil'} />
      <rect {...rect(ALTAR.minX, -ALTAR.half, ALTAR.maxX, ALTAR.half)} className="mm-ramp" />
      <rect {...rect(RAMP.minX, RAMP.z0, RAMP.maxX, RAMP.z1)} className="mm-ramp" />
      <circle cx={LAVER.x} cy={LAVER.z} r={LAVER.r} className="mm-bronze" />
      <text x={maxX - 24} y={8} className="mm-label big">
        E
      </text>
      <g ref={dot}>
        <path d="M0,-4.2 L2.8,3 L0,1.6 L-2.8,3 Z" className="mm-player" transform="scale(3)" />
      </g>
    </svg>
  );
}
