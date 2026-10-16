// RG Worm MOW: tests for the added worm outside diameter (not part of the original program).
// Run: node tests/od-tests.js
const Q = require('../js/rgworm-engine.js');
let fail = 0, n = 0;
function check(name, got, want, tol) {
  n++; const ok = Math.abs(got - want) <= tol; if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got ${got.toFixed(6)} want ${want} (±${tol})`);
}
function is(name, cond) { n++; if (!cond) fail++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}`); }
// 5 DP, single start, 14.5 deg, 2.000" PD -> default addendum 0.2000", OD 2.4000"
const P5 = Math.PI / 5, lam5 = Q.helpers.leadAngleFromPD(P5, 2);
let r = Q.compute({ P: P5, An: 14.5, N: 1, lamDeg: lam5 });
check('5DP default addendum', r.addendum, 0.2000, 0.00005);
check('5DP OD', r.outsideDiameter, 2.4000, 0.00005);
is('5DP addendum flagged default', r.addendumIsDefault === true);
check('5DP MOW unchanged by addendum', r.mow, 2.4035, 0.00005);
// same worm as typed in the app (P 0.62832, lead angle 5.71059)
r = Q.compute({ P: 0.62832, An: 14.5, N: 1, lamDeg: 5.71059, ad: '' });
check('5DP typed: OD', r.outsideDiameter, 2.4000, 0.00005);
// entered addendum
r = Q.compute({ P: P5, An: 14.5, N: 1, lamDeg: lam5, ad: 0.18 });
check('entered addendum 0.18: OD', r.outsideDiameter, 2.3600, 1e-9);
is('entered addendum flagged entered', r.addendumIsDefault === false);
check('entered addendum does not change MOW', r.mow, Q.compute({ P: P5, An: 14.5, N: 1, lamDeg: lam5 }).mow, 1e-12);
// 2-start 0.5 pitch example: default addendum 0.3183 x 0.5 = 0.15915, OD = PD + 0.3183
r = Q.compute({ P: 0.5, An: 14.5, N: 2, lamDeg: 10, ta: 0.24, W: 0.25 });
check('0.5 pitch default addendum', r.addendum, 0.15915, 1e-9);
check('0.5 pitch OD', r.outsideDiameter, r.pitchDiameter + 0.3183, 1e-9);
// 10 DP, 4 start, 1.25" PD
const P10 = Math.PI / 10; r = Q.compute({ P: P10, An: 20, N: 4, lamDeg: Q.helpers.leadAngleFromPD(4 * P10, 1.25) });
check('10DP 4-start 1.25 PD: OD', r.outsideDiameter, 1.4500, 0.00005);
// validation
is('validation: negative addendum rejected', Q.validate({ P: 0.5, An: 20, N: 1, lamDeg: 5, ad: '-0.1' }).errors.some(e => e[0] === 'ad'));
is('validation: zero addendum rejected', Q.validate({ P: 0.5, An: 20, N: 1, lamDeg: 5, ad: '0' }).errors.some(e => e[0] === 'ad'));
is('validation: blank addendum ok', Q.validate({ P: 0.5, An: 20, N: 1, lamDeg: 5, ad: '' }).errors.length === 0);
console.log(`\n${n - fail}/${n} OD checks passed.`);
process.exit(fail ? 1 : 0);
