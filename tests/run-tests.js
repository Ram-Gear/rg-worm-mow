// RG Worm MOW: compare the engine against outputs recorded from the original DOS program
// Quick Worm (QWORM.EXE, run in DOSBox).
// Run: node tests/run-tests.js
const Q = require('../js/rgworm-engine.js');
const cases = require('./reference-cases.json');
let fail = 0, checks = 0;
const tol = 0.00006; // original displays 4 decimals (single precision); allow rounding
for (const c of cases) {
  const r = Q.compute(c);
  const got = { pd: r.pitchDiameter, mow: r.mow, backlash: r.backlash, bestWire: r.bestWire,
    preMin: r.preplate && r.preplate.mowMin, preMax: r.preplate && r.preplate.mowMax };
  for (const k of Object.keys(c.orig)) {
    checks++;
    const d = got[k] - c.orig[k];
    const ok = Math.abs(d) <= (k === 'bestWire' ? 0.000006 : tol);
    if (!ok) fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${c.id.padEnd(6)} ${k.padEnd(8)} original=${c.orig[k].toFixed(5)} web=${got[k].toFixed(6)} diff=${d.toExponential(1)}`);
  }
}
console.log(`\n${checks - fail}/${checks} checks agree with the original Quick Worm (QWORM) outputs within display precision.`);
process.exit(fail ? 1 : 0);
