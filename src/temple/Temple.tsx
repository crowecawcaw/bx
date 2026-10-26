import { Courts } from './Court';
import { House } from './House';
import { Interior } from './Interior';
import { Pillars } from './Pillars';
import { Bases, BrassAltar, MoltenSea } from './Vessels';

/** Solomon's Temple: the house, its porch and pillars, the courts and their vessels (1 Kgs 6–7; 2 Chr 3–4). */
export function Temple() {
  return (
    <>
      <Courts />
      <House />
      <Pillars />
      <Interior />
      <BrassAltar />
      <MoltenSea />
      <Bases />
    </>
  );
}
