/* RG Worm MOW web UI – Ram-Gear Manufacturing Inc. */
(function () {
  'use strict';
  var Q = window.RGWormMOW;
  var $ = function (id) { return document.getElementById(id); };
  var FIELDS = ['P', 'An', 'N', 'lam', 'ta', 'W', 'platMin', 'platMax'];
  var JOB = ['jobCustomer', 'jobNo', 'jobPart', 'jobBy', 'jobNotes'];
  var STORE = 'ramgear.rgwormmow.v1';
  var OLD_STORE = 'ramgear.qworm.v1'; // pre-rename key, read once for continuity
  var last = null;

  /* ---------- context notes (paraphrasing the original's help screens) ---------- */
  var NOTES = {
    pitch: '<p>Axial pitch = 1 ÷ threads per inch.</p><p>Threads per inch = number of starts ÷ lead.</p><p>Not given? Use the conversion helpers below.</p>',
    pa: '<p>Normal pressure angle: one half of the included thread angle, measured in the normal plane. Default 20°.</p><p>If the axial PA is given:<br><code>tan(normal PA) = tan(axial PA) × cos(lead angle)</code></p>',
    starts: '<p>Number of thread starts. Default is one (single).</p>',
    lead: '<p>Lead angle of the worm at the pitch diameter, in decimal degrees (or degrees minutes seconds, e.g. <code>5 42 38</code>).</p><p><code>tan(lead angle) = lead ÷ (π × pitch dia.)</code></p>',
    tt: '<p>Axial tooth (thread) thickness at the pitch diameter. Default is ½ the axial pitch (zero backlash).</p><p>If the normal thickness is given:<br><code>axial = normal ÷ cos(lead angle)</code></p>',
    wire: '<p>Diameter of the measuring wires you will use. The approximate best-size wire is</p><p><code>W = T × cos B ÷ cos An</code><br>T = ½ axial pitch, B = lead angle at pitch dia., An = normal PA.</p>',
    plmin: '<p>Minimum plating allowance (plating thickness per surface) for pre-plate measurement over wires. Leave blank if there is no plating.</p>',
    plmax: '<p>Maximum plating allowance for pre-plate measurement over wires. If left blank, the min. value is used.</p>'
  };
  function showNote(key) { $('notesBody').innerHTML = NOTES[key] || ''; }

  /* ---------- helpers ---------- */
  function val(id) { return $(id).value.trim(); }
  function fmt(x, d) { return (x === null || x === undefined || !isFinite(x)) ? '—' : x.toFixed(d); }
  function lenU() { return $('units').value === 'mm' ? 'mm' : 'in'; }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200);
  }

  function readInputs() {
    var lamStr = val('lam');
    return {
      P: val('P'), An: val('An') === '' ? '20' : val('An'), N: val('N') === '' ? '1' : val('N'),
      lamDeg: lamStr === '' ? '' : String(Q.parseAngle(lamStr)),
      ta: val('ta'), W: val('W'), platMin: val('platMin'), platMax: val('platMax')
    };
  }

  function updateUnits() {
    var u = lenU();
    Array.prototype.forEach.call(document.querySelectorAll('.u.len'), function (el) { el.textContent = u; });
  }

  function updateHints() {
    var inp = readInputs();
    var lam = +inp.lamDeg, P = +inp.P, An = +inp.An;
    $('hint-lam').textContent = (val('lam') !== '' && isFinite(lam) && lam > 0) ? '= ' + lam.toFixed(5) + '°  (' + Q.toDMS(lam) + ')' : '';
    $('hint-ta').textContent = (P > 0 && val('ta') === '') ? 'will use ' + (P / 2).toFixed(5) : '';
    if (P > 0 && lam > 0 && lam < 90 && An > 0 && An < 90) {
      var bw = 0.5 * P * Math.cos(lam * Math.PI / 180) / Math.cos(An * Math.PI / 180);
      $('hint-W').textContent = 'approx. best-size wire = ' + bw.toFixed(5) + (val('W') === '' ? '  (will be used)' : '');
      $('btnBest').dataset.best = bw.toFixed(5);
    } else { $('hint-W').textContent = ''; $('btnBest').dataset.best = ''; }
  }

  function clearErrors() {
    Array.prototype.forEach.call(document.querySelectorAll('.err'), function (e) { e.textContent = ''; });
    Array.prototype.forEach.call(document.querySelectorAll('.field'), function (f) { f.classList.remove('has-error'); });
  }

  /* ---------- calculation & rendering ---------- */
  function calculate(opts) {
    opts = opts || {};
    clearErrors();
    var inp = readInputs();
    if (val('lam') !== '' && !isFinite(+inp.lamDeg)) inp.lamDeg = 'x';
    var v = Q.validate(inp);
    if (v.errors.length) {
      if (!opts.quiet) {
        v.errors.forEach(function (e) {
          var el = $('err-' + e[0]); if (el) { el.textContent = e[1]; el.parentNode.classList.add('has-error'); }
        });
        $('messages').innerHTML = '<div class="msg error">Please correct the highlighted entries.</div>';
      }
      return null;
    }
    var r = Q.compute(inp);
    if (!isFinite(r.mow)) {
      $('messages').innerHTML = '<div class="msg error">No solution for these inputs (the wire cannot seat on the thread flanks). Check the wire diameter and tooth thickness.</div>';
      return null;
    }
    last = { inputs: inp, result: r };
    render(r, v.warnings);
    saveState();
    return r;
  }

  function row(idx, label, value, unit, cls, extra) {
    return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td class="idx">' + idx + '</td><td>' + label + '</td><td class="num">' + value +
      (unit ? '<span class="unit">' + unit + '</span>' : '') + (extra ? '<span class="dm">' + extra + '</span>' : '') + '</td></tr>';
  }

  function render(r, warnings) {
    var u = lenU(), i = r.inputs, pre = r.preplate;
    var h = '';
    h += row('1.', 'Axial pitch', fmt(i.P, 5), u);
    h += row('2.', 'Number of starts', String(i.N), '', '', i.N === 1 ? '(single)' : '');
    h += row('3.', 'Lead', fmt(r.lead, 5), u);
    h += row('4.', 'Lead angle at pitch dia.', fmt(i.lamDeg, 5), '°', '', '(' + Q.toDM(i.lamDeg) + ')');
    h += row('5.', 'Normal pressure angle', fmt(i.An, 5), '°', '', '(' + Q.toDM(i.An) + ')');
    h += row('6.', 'Axial pressure angle', fmt(r.axialPA, 5), '°', '', '(' + Q.toDM(r.axialPA) + ')');
    h += row('7.', 'Pitch diameter', fmt(r.pitchDiameter, 4), u);
    h += row('8.', 'Axial tooth thickness', fmt(i.ta, 5), u);
    h += row('9.', 'Contributing backlash', fmt(r.backlash, 5), u);
    h += row('10.', 'Measurement over wires', fmt(r.mow, 4), u, 'key');
    if (pre) {
      h += row('11.', 'Pre-plate meas. over wires <small>(min. / max. plating)</small>', fmt(pre.mowMin, 4) + ' / ' + fmt(pre.mowMax, 4), u, 'key');
      h += row('', 'Plating allowance <small>(min. / max.)</small>', fmt(pre.platMin, 5) + ' / ' + fmt(pre.platMax, 5), u);
    } else {
      h += row('11.', 'Pre-plate meas. over wires', 'No plating specified', '');
    }
    h += row('12.', 'Wire diameter used', fmt(i.W, 5), u);
    h += row('13.', 'Best size wire', fmt(r.bestWire, 5), u);
    $('resBody').innerHTML = h;

    var e = r.extra, x = '';
    x += row('', 'Threads per inch (1 ÷ axial pitch)', u === 'in' ? fmt(r.tpi, 4) : '—', u === 'in' ? 'TPI' : '');
    x += row('', 'Normal tooth thickness (axial × cos λ)', fmt(e.normalThickness, 5), u);
    x += row('', 'Wire-center diameter (M − W)', fmt(e.wireCenterDiameter, 5), u);
    x += row('', 'Base diameter of involute helicoid', fmt(e.baseDiameter, 5), u);
    x += row('', 'Base lead angle', fmt(e.baseLeadAngle, 4), '°');
    x += row('', 'Transverse pressure angle', fmt(e.transversePA, 4), '°');
    x += row('', 'Equivalent pitch dia. used for thinning', fmt(e.reducedPD, 5), u);
    if (pre) x += row('', 'Plating converted to axial thinning (min. / max.)', fmt(pre.backlashMin, 5) + ' / ' + fmt(pre.backlashMax, 5), u);
    $('extraBody').innerHTML = x;

    $('messages').innerHTML = (warnings || []).map(function (w) { return '<div class="msg warn">⚠ ' + escapeHtml(w) + '</div>'; }).join('');
    $('stamp').textContent = 'Calculated ' + new Date().toLocaleString();
    renderJob();
  }

  function renderJob() {
    var labels = { jobCustomer: 'Customer', jobNo: 'Job / W.O.', jobPart: 'Part / worm', jobBy: 'Prepared by' };
    var cells = Object.keys(labels).map(function (k) { return '<td class="k">' + labels[k] + '</td><td>' + escapeHtml(val(k)) + '</td>'; });
    var h = '<tr>' + cells[0] + cells[1] + '</tr><tr>' + cells[2] + cells[3] + '</tr>';
    h += '<tr><td class="k">Date</td><td>' + new Date().toLocaleDateString() + '</td><td class="k">Units</td><td>' + (lenU() === 'in' ? 'inch' : 'millimetre') + '</td></tr>';
    if (val('jobNotes')) h += '<tr><td class="k">Notes</td><td colspan="3">' + escapeHtml(val('jobNotes')) + '</td></tr>';
    $('jobTable').innerHTML = h;
  }

  /* ---------- state ---------- */
  function getState() {
    var s = {}; FIELDS.concat(JOB).forEach(function (f) { s[f] = $(f).value; }); s.units = $('units').value; return s;
  }
  function setState(s) {
    if (!s) return;
    FIELDS.concat(JOB).forEach(function (f) { if (s[f] !== undefined) $(f).value = s[f]; });
    if (s.units) $('units').value = s.units;
  }
  function saveState() { try { localStorage.setItem(STORE, JSON.stringify(getState())); } catch (e) { /* ignore */ } }
  function stateFromHash() {
    if (!location.hash || location.hash.length < 2) return null;
    var p = new URLSearchParams(location.hash.slice(1)), s = {};
    FIELDS.forEach(function (f) { if (p.has(f)) s[f] = p.get(f); });
    if (p.has('units')) s.units = p.get('units');
    return Object.keys(s).length ? s : null;
  }
  function shareLink() {
    var p = new URLSearchParams();
    FIELDS.forEach(function (f) { if (val(f) !== '') p.set(f, val(f)); });
    p.set('units', $('units').value);
    var url = location.href.split('#')[0] + '#' + p.toString();
    history.replaceState(null, '', url);
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('Link copied'); }, function () { toast('Link is in the address bar'); });
    else toast('Link is in the address bar');
  }

  /* ---------- conversion helpers ---------- */
  function setOut(id, v, d) { $(id).textContent = (isFinite(v) && v !== null) ? v.toFixed(d) : ''; }
  function updateHelpers() {
    var H = Q.helpers, n = function (id) { var t = $(id).value.trim(); return t === '' ? NaN : +t; };
    setOut('oTPI', n('hTPI') > 0 ? H.pitchFromTPI(n('hTPI')) : NaN, 5);
    setOut('oLead', n('hLead') > 0 && n('hLeadN') >= 1 ? H.pitchFromLead(n('hLead'), n('hLeadN')) : NaN, 5);
    setOut('oMod', n('hMod') > 0 ? H.pitchFromModule(n('hMod')) : NaN, 5);
    var P = +val('P'), N = +(val('N') || 1), lam = Q.parseAngle(val('lam'));
    setOut('oPD', n('hPD') > 0 && P > 0 ? H.leadAngleFromPD(P * N, n('hPD')) : NaN, 5);
    setOut('oAPA', n('hAPA') > 0 && lam > 0 ? H.normalPAFromAxial(n('hAPA'), lam) : NaN, 5);
    setOut('oTN', n('hTN') > 0 && lam > 0 ? H.axialFromNormalThickness(n('hTN'), lam) : NaN, 5);
  }

  /* ---------- wiring ---------- */
  function init() {
    $('ver').textContent = Q.version;
    setState(stateFromHash() || (function () { try { return JSON.parse(localStorage.getItem(STORE) || localStorage.getItem(OLD_STORE)); } catch (e) { return null; } })());
    updateUnits(); updateHints(); showNote('pitch');

    $('form').addEventListener('submit', function (ev) { ev.preventDefault(); calculate(); });
    Array.prototype.forEach.call(document.querySelectorAll('.field'), function (f) {
      var input = f.querySelector('input');
      input.addEventListener('focus', function () { showNote(f.dataset.help); });
      input.addEventListener('input', function () { updateHints(); updateHelpers(); calculate({ quiet: true }); });
    });
    // Enter advances to next field like the original; Enter on the last field calculates.
    FIELDS.forEach(function (id, k) {
      $(id).addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          if (k < FIELDS.length - 1) { $(FIELDS[k + 1]).focus(); $(FIELDS[k + 1]).select(); }
          else calculate();
        }
      });
    });
    $('units').addEventListener('change', function () { updateUnits(); if (last) calculate({ quiet: true }); saveState(); });
    $('btnBest').addEventListener('click', function () { if (this.dataset.best) { $('W').value = this.dataset.best; updateHints(); calculate({ quiet: true }); } });
    $('btnReset').addEventListener('click', function () {
      FIELDS.forEach(function (f) { $(f).value = ''; }); $('An').value = '20'; $('N').value = '1';
      clearErrors(); last = null; $('messages').innerHTML = '';
      $('resBody').innerHTML = '<tr><td colspan="3" class="empty">Enter the worm data and press Calculate.</td></tr>';
      $('extraBody').innerHTML = ''; $('stamp').textContent = ''; updateHints(); saveState(); $('P').focus();
      history.replaceState(null, '', location.href.split('#')[0]);
    });
    $('btnExample').addEventListener('click', function () {
      setState({ P: '0.5', An: '14.5', N: '2', lam: '10', ta: '0.24', W: '0.25', platMin: '0.001', platMax: '0.002' });
      updateHints(); calculate();
    });
    $('btnPrint').addEventListener('click', function () {
      if (!calculate()) { toast('Fix the inputs before printing'); return; }
      renderJob(); window.print();
    });
    window.addEventListener('beforeprint', function () { if (last) renderJob(); });
    $('btnShare').addEventListener('click', shareLink);
    JOB.forEach(function (j) { $(j).addEventListener('input', function () { renderJob(); saveState(); }); });
    ['hTPI', 'hLead', 'hLeadN', 'hMod', 'hPD', 'hAPA', 'hTN'].forEach(function (h) { $(h).addEventListener('input', updateHelpers); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-send]'), function (b) {
      b.addEventListener('click', function () {
        var v = $(b.dataset.from).textContent; if (!v) return;
        $(b.dataset.send).value = v; updateHints(); updateHelpers(); calculate({ quiet: true }); $(b.dataset.send).focus();
      });
    });
    if (val('P') && val('lam')) calculate({ quiet: true });
    updateHelpers();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
