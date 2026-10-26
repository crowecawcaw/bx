import { Courts } from './Court';
import { PLAT } from './dims';
import { House } from './House';
import { Interior } from './Interior';
import { Pillars } from './Pillars';
import { Platform } from './Platform';
import { Bases, BrassAltar, MoltenSea } from './Vessels';

/** Solomon's Temple: the house, its porch and pillars, the courts and their vessels (1 Kgs 6–7; 2 Chr 3–4). */
export function Temple() {
  return (
    <>
      <Courts />
      <Platform />
      {/* the house and all within it stand on the platform */}
      <group position={[0, PLAT.h, 0]}>
        <House />
        <Pillars />
        <Interior />
      </group>
      <BrassAltar />
      <MoltenSea />
      <Bases />
    </>
  );
}
