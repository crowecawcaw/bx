// Verifies every reference in the requirement data resolves to bundled KJV text.
import { FEATURES, GENERAL } from '../src/data/specs';
import { lookup } from '../src/data/verses';

const refs = [...GENERAL.map((r) => r.ref), ...FEATURES.flatMap((f) => [...f.requirements.map((r) => r.ref), ...f.refs])];
let bad = 0;
for (const r of refs) {
  const res = lookup(r);
  if ('error' in res) {
    bad++;
    console.error(`✗ ${r}: ${res.error}`);
  }
}
const n = FEATURES.reduce((a, f) => a + f.requirements.length, GENERAL.length);
console.log(`${refs.length - bad}/${refs.length} references resolve; ${n} requirements`);
process.exit(bad ? 1 : 0);
