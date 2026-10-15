/* RG Worm MOW help page: "Try it" practice boxes.
 * Uses the app's own engine (js/rgworm-engine.js) in the browser.
 * Nothing is sent anywhere; no network calls. */
(function () {
  'use strict';
  var Q = window.RGWormMOW;
  var PI = Math.PI;
  var IN_TOL = 0.0005, DEG_TOL = 0.05;

  function f(x, d) { return x.toFixed(d); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  /* A scenario is a worm described the way it often appears on a print: DP, starts, normal PA, pitch dia. */
  var BASE = { DP: 5, N: 1, An: 14.5, PD: 2.0, plat: 0.0003, axPA: 14.5 };
  function randomScenario() {
    var DP = pick([3, 4, 5, 6, 8, 10, 12]);
    var N = pick([1, 1, 1, 2, 3, 4]);
    var An = pick([14.5, 20, 25]);
    var P = PI / DP;
    // pitch diameter giving a lead angle between ~3 and ~18 degrees, rounded to 0.125"
    var lamTarget = 3 + Math.random() * 15;
    var PD = Math.max(0.5, Math.round((N * P / (PI * Math.tan(lamTarget * PI / 180))) * 8) / 8);
    var lam = Math.atan(N * P / (PI * PD)) * 180 / PI;
    if (lam > 25) PD += 0.5;
    var plat = pick([0.0002, 0.0003, 0.0005, 0.001]);
    var axPA = pick([14.5, 20, 25]);
    return { DP: DP, N: N, An: An, PD: PD, plat: plat, axPA: axPA };
  }
  function derive(s) {
    var P = PI / s.DP, L = s.N * P;
    var lam = Q.helpers.leadAngleFromPD(L, s.PD);
    var r = Q.compute({ P: P, An: s.An, N: s.N, lamDeg: lam, platMin: s.plat });
    return { P: P, L: L, lam: lam, r: r };
  }
  function startsTxt(n) { return n === 1 ? 'single start' : n + ' starts'; }
  function worm(s) { return s.DP + ' DP (axial diametral pitch), ' + startsTxt(s.N) + ', ' + s.An + '\u00b0 normal pressure angle, ' + f(s.PD, 3) + '" pitch diameter'; }

  var EXERCISES = {
    pitch: {
      unit: 'in', tol: IN_TOL,
      q: function (s) { return 'A worm is ' + worm(s) + '. What <strong>axial pitch</strong> do you type into field 1?'; },
      answer: function (s, d) { return d.P; },
      why: function (s, d) {
        return 'Axial pitch is the axial circular pitch: P = \u03c0 \u00f7 DP = 3.14159 \u00f7 ' + s.DP + ' = ' + f(d.P, 5) + '". ' +
          'Common mistakes: typing the DP itself (' + s.DP + '), or 1 \u00f7 DP (' + f(1 / s.DP, 5) + '). For a threaded worm given as TPI, P = 1 \u00f7 TPI. The module helper is for metric (P = \u03c0 \u00d7 module).';
      }
    },
    lead: {
      unit: 'deg', tol: DEG_TOL,
      q: function (s) { return 'A worm is ' + worm(s) + '. What <strong>lead angle</strong> (decimal degrees) goes into field 4?'; },
      answer: function (s, d) { return d.lam; },
      why: function (s, d) {
        return 'Lead L = starts \u00d7 axial pitch = ' + s.N + ' \u00d7 ' + f(d.P, 5) + ' = ' + f(d.L, 5) + '". tan \u03bb = L \u00f7 (\u03c0 \u00d7 PD) = ' + f(d.L, 5) + ' \u00f7 (\u03c0 \u00d7 ' + f(s.PD, 3) + '), so \u03bb = ' + f(d.lam, 4) + '\u00b0 (' + Q.toDMS(d.lam) + '). ' +
          'Common mistakes: forgetting to multiply by the number of starts, using the DP instead of the axial pitch, or entering minutes as decimals (5\u00b0 42\u2032 is 5.70\u00b0, not 5.42\u00b0). The "Lead angle from pitch diameter" helper does this for you.';
      }
    },
    wire: {
      unit: 'in', tol: IN_TOL,
      q: function (s) { return 'A worm is ' + worm(s) + '. What is the approximate <strong>best-size wire</strong> diameter?'; },
      answer: function (s, d) { return d.r.bestWire; },
      why: function (s, d) {
        return 'Best wire W = (0.5 \u00d7 P) \u00d7 cos \u03bb \u00f7 cos \u03c6n = 0.5 \u00d7 ' + f(d.P, 5) + ' \u00d7 cos ' + f(d.lam, 4) + '\u00b0 \u00f7 cos ' + s.An + '\u00b0 = ' + f(d.r.bestWire, 5) + '". ' +
          'Common mistakes: using the axial pressure angle instead of the normal one, or leaving out cos \u03bb. If you leave field 6 blank the app uses this wire automatically.';
      }
    },
    mow: {
      unit: 'in', tol: IN_TOL,
      q: function (s) { return 'A worm is ' + worm(s) + ', standard tooth thickness (half the axial pitch) and best-size wires. What is the <strong>measurement over wires</strong> (item 10)?'; },
      answer: function (s, d) { return d.r.mow; },
      why: function (s, d) {
        return 'Enter P = ' + f(d.P, 5) + ', normal PA ' + s.An + ', starts ' + s.N + ', lead angle ' + f(d.lam, 5) + ', and leave tooth thickness and wire blank. M.O.W. = ' + f(d.r.mow, 4) + '" over ' + f(d.r.bestWire, 5) + '" wires (Buckingham involute-helicoid formula). ' +
          'Common mistakes: typing the DP as the axial pitch, or a lead angle that is rounded too much. Typing the wire rounded to 4 places can move the last digit.';
      }
    },
    pre: {
      unit: 'in', tol: IN_TOL,
      q: function (s) { return 'A worm is ' + worm(s) + ', measured with best-size wires, with a plating allowance of ' + s.plat + '" per surface. What is the <strong>pre-plate measurement over wires</strong> (item 11) to machine to?'; },
      answer: function (s, d) { return d.r.preplate.mowMin; },
      why: function (s, d) {
        var bp = 2 * s.plat / (Math.cos(s.An * PI / 180) * Math.cos(d.lam * PI / 180));
        return 'Type ' + s.plat + ' in field 7 (min. plating). The plating thins each tooth axially by 2 \u00d7 plating \u00f7 (cos \u03c6n \u00d7 cos \u03bb) = ' + f(bp, 5) + '", which lowers the M.O.W. from ' + f(d.r.mow, 4) + ' to ' + f(d.r.preplate.mowMin, 4) + '". ' +
          'Common mistakes: simply subtracting 2 \u00d7 plating (would give ' + f(d.r.mow - 2 * s.plat, 4) + '), or adding plating instead of removing it.';
      }
    },
    npa: {
      unit: 'deg', tol: DEG_TOL,
      q: function (s, d) { return 'A worm is ' + s.DP + ' DP, ' + startsTxt(s.N) + ', ' + f(s.PD, 3) + '" pitch diameter (lead angle ' + f(d.lam, 4) + '\u00b0), and the print gives the <strong>axial</strong> pressure angle as ' + s.axPA + '\u00b0. What <strong>normal pressure angle</strong> goes into field 2?'; },
      answer: function (s, d) { return Q.helpers.normalPAFromAxial(s.axPA, d.lam); },
      why: function (s, d) {
        var a = Q.helpers.normalPAFromAxial(s.axPA, d.lam);
        return 'tan \u03c6n = tan \u03c6a \u00d7 cos \u03bb = tan ' + s.axPA + '\u00b0 \u00d7 cos ' + f(d.lam, 4) + '\u00b0, so \u03c6n = ' + f(a, 4) + '\u00b0. ' +
          'Common mistake: typing the axial angle (' + s.axPA + ') straight into the normal pressure angle field. The "Normal PA from axial PA" helper does this conversion.';
      }
    }
  };

  function setup(box) {
    var key = box.dataset.ex, ex = EXERCISES[key];
    var scenario = Object.assign({}, BASE);
    var qEl = box.querySelector('.tq'), inp = box.querySelector('input'), out = box.querySelector('.tresult');
    box.querySelector('.tunit').textContent = ex.unit === 'deg' ? 'deg' : 'in';
    box.querySelector('.ttol').textContent = '\u00b1' + (ex.unit === 'deg' ? DEG_TOL + '\u00b0' : IN_TOL + '"');
    function render() {
      var d = derive(scenario);
      qEl.innerHTML = ex.q(scenario, d);
      inp.value = ''; out.className = 'tresult'; out.textContent = '';
    }
    function check() {
      var d = derive(scenario), want = ex.answer(scenario, d);
      var raw = inp.value.trim().replace(/["\u00b0]|in$|deg$/gi, '').trim();
      var got = ex.unit === 'deg' ? Q.parseAngle(raw) : (raw === '' ? NaN : +raw);
      if (!isFinite(got)) { out.className = 'tresult bad'; out.textContent = 'Please enter a number first.'; return; }
      var dec = ex.unit === 'deg' ? 4 : 4;
      if (Math.abs(got - want) <= ex.tol) {
        out.className = 'tresult good';
        out.innerHTML = '<strong>Correct.</strong> The engine gives ' + f(want, dec) + (ex.unit === 'deg' ? '\u00b0' : '"') + '. ' + ex.why(scenario, d);
      } else {
        out.className = 'tresult bad';
        out.innerHTML = '<strong>Incorrect.</strong> You entered ' + raw + '; the right answer is ' + f(want, dec) + (ex.unit === 'deg' ? '\u00b0' : '"') + '. ' + ex.why(scenario, d);
      }
    }
    box.querySelector('.tcheck').addEventListener('click', check);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); check(); } });
    box.querySelector('.tnew').addEventListener('click', function () { scenario = randomScenario(); render(); inp.focus(); });
    box.querySelector('.treset').addEventListener('click', function () { scenario = Object.assign({}, BASE); render(); });
    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    Array.prototype.forEach.call(document.querySelectorAll('.tryit[data-ex]'), setup);
    var v = document.getElementById('ver'); if (v) v.textContent = Q.version;
  });
  // exposed for tests only
  window.RGWormHelp = { derive: derive, BASE: BASE, EXERCISES: EXERCISES };
})();
