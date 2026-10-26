// Verifies every reference in the requirement data resolves to bundled KJV text.
import { FEATURES, GENERAL, type Feature, type Requirement } from '../src/data/specs';
import { TEMPLE_FEATURES, TEMPLE_GENERAL } from '../src/data/templeSpecs';
import { lookup } from '../src/data/verses';

let failed = false;
for (const [name, features, general] of [
  ['Tabernacle', FEATURES, GENERAL],
  ['Temple', TEMPLE_FEATURES, TEMPLE_GENERAL],
] as [string, Feature[], Requirement[]][]) {
  const refs = [...general.map((r) => r.ref), ...features.flatMap((f) => [...f.requirements.map((r) => r.ref), ...f.refs])];
  let bad = 0;
  for (const r of refs) {
    const res = lookup(r);
    if ('error' in res) {
      bad++;
      console.error(`✗ ${name}: ${r}: ${res.error}`);
    }
  }
  const ids = features.map((f) => f.id);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) console.error(`✗ ${name}: duplicate feature ids ${dup.join(', ')}`);
  const n = features.reduce((a, f) => a + f.requirements.length, general.length);
  console.log(`${name}: ${refs.length - bad}/${refs.length} references resolve; ${n} requirements`);
  failed ||= bad > 0 || dup.length > 0;
}
process.exit(failed ? 1 : 0);
