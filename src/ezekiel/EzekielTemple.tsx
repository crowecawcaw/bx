import { Altar, Stream } from './Altar';
import { Courts } from './Courts';
import { Gates } from './Gates';
import { House } from './House';

/** The temple Ezekiel saw (Ezek 40–48): the wall, the gates and courts, the altar, the house, and the water from under its threshold. */
export function EzekielTemple() {
  return (
    <>
      <Courts />
      <Gates />
      <Altar />
      <House />
      <Stream />
    </>
  );
}
