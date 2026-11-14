import { Courts, Mount } from './Courts';
import { House } from './House';
import { Altar, Laver, Slaughter } from './Vessels';

/** The second temple as Herod rebuilt it: the mount and its porticoes, the courts, the altar and the house. */
export function SecondTemple() {
  return (
    <>
      <Mount />
      <Courts />
      <Altar />
      <Laver />
      <Slaughter />
      <House />
    </>
  );
}
