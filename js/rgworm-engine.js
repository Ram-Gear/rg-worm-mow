/*
 * RG Worm MOW calculation engine – Ram-Gear Manufacturing Inc.
 * --------------------------------------------------------------
 * Measurement over wires (M.O.W.) for involute-helicoid worm threads,
 * reproducing the method of the DOS program Quick Worm (QWORM, (C) 1995 James R. Shaneyfelt).
 * Independent re-implementation; no code from the original.
 *
 * Provenance of every formula is documented in ../../notes.md. In short:
 *  - The ORIGINAL's built-in help/documentation text (recovered from QWORM.EXE) states:
 *      axial pitch = 1 / TPI;  TPI = starts / lead;  tan(lead angle) = lead / (pi * PD);
 *      tan(normal PA) = tan(axial PA) * cos(lead angle);
 *      axial thickness = normal thickness / cos(lead angle);
 *      best wire = T * cos(B) / cos(An), T = 0.5 * axial pitch;
 *      M.O.W. by the "Buckingham Exact Involute Helicoid Formula" (Machinery's Handbook);
 *      plating -> axial tooth thinning (backlash); PD reduced by backlash * cot(axial PA).
 *  - The exact equations below were then pinned down by running the original QWORM.EXE
 *    under DOSBox and matching 24 recorded outputs to the original's displayed 4 decimals.
 * No source code or disassembly of the original was available; nothing here is decompiled.
 *
 * Works in the browser (window.RGWormMOW) and in Node (module.exports).
 */
(function (root) {
  'use strict';

  var PI = Math.PI;
  var D2R = PI / 180;

  function inv(x) { return Math.tan(x) - x; }

  /** Inverse involute on (0, pi/2) by bisection + Newton polish. */
  function invInverse(v) {
    if (!(v > 0)) return NaN;
    var lo = 0, hi = PI / 2 - 1e-12;
    for (var i = 0; i < 200; i++) {
      var m = 0.5 * (lo + hi);
      if (inv(m) < v) lo = m; else hi = m;
    }
    var x = 0.5 * (lo + hi);
    for (var k = 0; k < 3; k++) {
      var t = Math.tan(x), f = t - x - v, d = t * t;
      if (d === 0) break;
      var nx = x - f / d;
      if (nx > 0 && nx < PI / 2) x = nx;
    }
    return x;
  }

  /**
   * Core helical-gear ("Buckingham") wire formula applied to a worm whose
   * axial thread thickness equals half the axial pitch at diameter E.
   * The worm is treated as a helical gear with N teeth and helix angle psi = 90 deg - lead angle.
   */
  function mowAtBasic(P, N, An, E, W) {
    var L = N * P;
    var lam = Math.atan(L / (PI * E));          // lead angle at diameter E
    var psi = PI / 2 - lam;                      // helix angle
    var At = Math.atan(Math.tan(An) / Math.cos(psi)); // transverse PA (plane normal to axis)
    var Db = E * Math.cos(At);                   // base diameter
    var tt = (P / 2) * Math.tan(psi);            // transverse circular thickness
    var psib = Math.asin(Math.sin(psi) * Math.cos(An)); // base helix angle
    var v = tt / E + inv(At) + W / (Db * Math.cos(psib)) - PI / N;
    var phiW = invInverse(v);
    return {
      M: Db / Math.cos(phiW) + W,
      lam: lam, At: At, Db: Db, psib: psib, invPhiW: v, phiW: phiW
    };
  }

  /**
   * Main RG Worm MOW calculation.
   * @param {object} p inputs:
   *   P      axial pitch (length)
   *   An     normal pressure angle (deg)
   *   N      number of starts (integer >= 1)
   *   lamDeg lead angle at pitch diameter (deg)
   *   ta     axial tooth thickness at PD (length); default P/2
   *   W      wire diameter (length); default = best wire
   *   platMin, platMax  plating allowance (thickness per surface, length); optional
   */
  function compute(p) {
    var P = +p.P, N = Math.round(+p.N), AnDeg = +p.An, lamDeg = +p.lamDeg;
    var An = AnDeg * D2R, lam = lamDeg * D2R;
    var L = N * P;
    var E = L / (PI * Math.tan(lam));                       // pitch diameter
    var phiA = Math.atan(Math.tan(An) / Math.cos(lam));     // axial PA
    var bestWire = 0.5 * P * Math.cos(lam) / Math.cos(An);  // from original help text
    var ta = (p.ta === undefined || p.ta === null || p.ta === '') ? P / 2 : +p.ta;
    var W = (p.W === undefined || p.W === null || p.W === '') ? bestWire : +p.W;
    var B = P / 2 - ta;                                     // contributing backlash

    function mowWithBacklash(Bt) {
      var E2 = E - Bt / Math.tan(phiA);   // PD reduced by backlash * cot(axial PA)
      var r = mowAtBasic(P, N, An, E2, W);
      r.E2 = E2;
      return r;
    }
    function platingToBacklash(pl) {     // plating normal to flank -> axial thinning (both flanks)
      return 2 * pl / (Math.cos(An) * Math.cos(lam));
    }

    var main = mowWithBacklash(B);
    var basic = mowAtBasic(P, N, An, E, W); // at the reference PD, basic thickness (extra info)

    var hasPlat = p.platMin !== undefined && p.platMin !== null && p.platMin !== '' && +p.platMin > 0;
    var pre = null;
    if (hasPlat) {
      var pmin = +p.platMin;
      var pmax = (p.platMax === undefined || p.platMax === null || p.platMax === '') ? pmin : +p.platMax;
      var rMin = mowWithBacklash(B + platingToBacklash(pmin));
      var rMax = mowWithBacklash(B + platingToBacklash(pmax));
      pre = {
        platMin: pmin, platMax: pmax,
        backlashMin: platingToBacklash(pmin), backlashMax: platingToBacklash(pmax),
        mowMin: rMin.M,  // pre-plate M.O.W. for MIN plating (larger value)
        mowMax: rMax.M   // pre-plate M.O.W. for MAX plating (smaller value)
      };
    }

    return {
      inputs: { P: P, N: N, An: AnDeg, lamDeg: lamDeg, ta: ta, W: W },
      lead: L,
      tpi: 1 / P,
      pitchDiameter: E,
      axialPA: phiA / D2R,
      bestWire: bestWire,
      backlash: B,
      mow: main.M,
      preplate: pre,
      extra: {
        reducedPD: main.E2,
        wireCenterDiameter: main.M - W,
        transversePA: basic.At / D2R,
        baseDiameter: basic.Db,
        baseLeadAngle: 90 - basic.psib / D2R,
        normalThickness: ta * Math.cos(lam)
      }
    };
  }

  /** Validation mirroring (and slightly extending) the original. Returns {errors:[], warnings:[]} */
  function validate(p) {
    var e = [], w = [];
    function num(v) { return v !== '' && v !== null && v !== undefined && isFinite(+v); }
    if (!num(p.P) || +p.P <= 0) e.push(['P', 'Axial pitch must be a positive number.']);
    if (!num(p.An) || +p.An <= 0 || +p.An >= 45) e.push(['An', 'Normal pressure angle must be between 0 and 45 degrees.']);
    if (!num(p.N) || +p.N < 1 || Math.round(+p.N) !== +p.N) e.push(['N', 'Number of starts must be a whole number of 1 or more.']);
    if (!num(p.lamDeg) || +p.lamDeg <= 0 || +p.lamDeg >= 60) e.push(['lamDeg', 'Lead angle must be between 0 and 60 degrees.']);
    if (p.ta !== '' && p.ta != null) {
      if (!num(p.ta) || +p.ta <= 0) e.push(['ta', 'Axial tooth thickness must be a positive number.']);
      else if (num(p.P) && +p.ta >= +p.P) e.push(['ta', 'Axial tooth thickness must be less than the axial pitch.']);
    }
    if (p.W !== '' && p.W != null && (!num(p.W) || +p.W <= 0)) e.push(['W', 'Wire diameter must be a positive number.']);
    if (p.platMin !== '' && p.platMin != null && (!num(p.platMin) || +p.platMin < 0)) e.push(['platMin', 'Plating allowance must be zero or a positive number.']);
    if (p.platMax !== '' && p.platMax != null) {
      if (!num(p.platMax) || +p.platMax < 0) e.push(['platMax', 'Plating allowance must be zero or a positive number.']);
      else if (num(p.platMin) && +p.platMax < +p.platMin) e.push(['platMax', 'Max. plating allowance must not be less than the min.']);
      if (p.platMin === '' || p.platMin == null || +p.platMin === 0) e.push(['platMin', 'Enter a min. plating allowance (the original only asks for max. after a min. is given).']);
    }
    if (e.length === 0) {
      var P = +p.P;
      if (+p.lamDeg > 25) w.push('Lead angle above 25\u00b0: wire measurement of steep worms is sensitive; consider ball/pin measurement.');
      if (p.ta !== '' && p.ta != null && (+p.ta < 0.3 * P || +p.ta > 0.7 * P)) w.push('Axial tooth thickness is far from half the axial pitch - check the entry.');
      var lam = +p.lamDeg * D2R, An = +p.An * D2R;
      var bw = 0.5 * P * Math.cos(lam) / Math.cos(An);
      if (p.W !== '' && p.W != null && (+p.W < 0.75 * bw || +p.W > 1.25 * bw)) w.push('Wire diameter differs from the best-size wire (' + bw.toFixed(5) + ') by more than 25% - make sure the wire contacts the flanks, not the root or crest.');
      var pm = Math.max(+(p.platMin || 0), +(p.platMax || 0));
      if (pm >= 0.03 * P) w.push('Plating allowance is large relative to the pitch. The original DOS program rejected such entries (observed: 0.02 rejected at 0.5 axial pitch; exact limit unknown).');
    }
    return { errors: e, warnings: w };
  }

  /** Degrees to D° M' (as the original displays, minutes rounded) and D° M' S" */
  function toDM(deg) {
    var s = deg < 0 ? '-' : ''; deg = Math.abs(deg);
    var d = Math.floor(deg), m = Math.round((deg - d) * 60);
    if (m === 60) { d += 1; m = 0; }
    return s + d + '\u00b0 ' + m + '\u2032';
  }
  function toDMS(deg) {
    var s = deg < 0 ? '-' : ''; deg = Math.abs(deg);
    var tot = Math.round(deg * 3600);
    var d = Math.floor(tot / 3600), m = Math.floor((tot % 3600) / 60), sec = tot % 60;
    return s + d + '\u00b0 ' + m + '\u2032 ' + sec + '\u2033';
  }
  /** Parse "5.5", "5 30", "5°30'", "5d30m15s", "5-30-15" into decimal degrees. */
  function parseAngle(str) {
    if (str === null || str === undefined) return NaN;
    str = String(str).trim();
    if (str === '') return NaN;
    if (/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(str)) return +str;
    var parts = str.replace(/[°d'\u2032"\u2033ms:\-]/gi, ' ').trim().split(/\s+/);
    if (parts.length < 1 || parts.length > 3) return NaN;
    var vals = parts.map(Number);
    if (vals.some(function (v) { return !isFinite(v); })) return NaN;
    return vals[0] + (vals[1] || 0) / 60 + (vals[2] || 0) / 3600;
  }

  /* Helper conversions (the original pointed users to its RPN calculator for these). */
  var helpers = {
    pitchFromTPI: function (tpi) { return 1 / tpi; },
    pitchFromLead: function (lead, starts) { return lead / starts; },
    pitchFromModule: function (m) { return PI * m; },
    leadAngleFromPD: function (lead, pd) { return Math.atan(lead / (PI * pd)) / D2R; },
    pdFromLeadAngle: function (lead, lamDeg) { return lead / (PI * Math.tan(lamDeg * D2R)); },
    normalPAFromAxial: function (axialDeg, lamDeg) { return Math.atan(Math.tan(axialDeg * D2R) * Math.cos(lamDeg * D2R)) / D2R; },
    axialFromNormalThickness: function (tn, lamDeg) { return tn / Math.cos(lamDeg * D2R); }
  };

  var api = { compute: compute, validate: validate, toDM: toDM, toDMS: toDMS, parseAngle: parseAngle, helpers: helpers, inv: inv, invInverse: invInverse, version: '1.0.0' };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.RGWormMOW = api;
})(typeof window !== 'undefined' ? window : globalThis);
