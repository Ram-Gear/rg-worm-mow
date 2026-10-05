# QWORM – Worm Thread Measurement Over Wires (Ram-Gear web edition)

A browser rebuild of **QWORM** ("Quick Worm", © 1995 James R. Shaneyfelt), the DOS program
Ram-Gear Manufacturing Inc. uses to calculate the **measurement over wires (M.O.W.)** of
involute-helicoid worm threads, including **pre-plate M.O.W.** for a min./max. plating allowance.

It is a static site: plain HTML/CSS/JavaScript, no build step, no server code, no external
libraries or network calls. Open `index.html` directly or host it on GitHub Pages as-is.

## What it does

Inputs, in the same order as the original:

1. Axial pitch
2. Normal pressure angle (default 20°)
3. Number of starts (default 1)
4. Lead angle at the pitch diameter (decimal degrees, or `deg min sec` such as `5 42 38`)
5. Axial tooth thickness (default ½ axial pitch)
6. Wire diameter (default = approximate best-size wire)
7. Min. plating allowance (optional)
8. Max. plating allowance (optional; defaults to min.)

The report (item numbers follow the original's printed report): axial pitch, starts, lead, lead angle,
normal and axial pressure angle, pitch diameter, axial tooth thickness, contributing backlash,
**measurement over wires**, **pre-plate measurement over wires (min./max.)**, wire diameter used, and
best-size wire. A second table ("Additional data") shows values the original did not display
(base diameter, base lead angle, wire-center diameter, and so on). It is labelled as such.

Other features: input validation, context notes for each field (the original had these too), conversion helpers
(TPI, lead, module, PD to lead angle, axial to normal PA, normal to axial thickness) in place of the original's RPN calculator,
optional job information, a printable one-page report (**Print report** or Ctrl+P), a shareable link with the
inputs in the URL, and the last inputs remembered in the browser (localStorage).

Units: the calculation has no units. The inch/mm selector changes only the labels.

## Accuracy against the original

The formulas (see the "About" section on the page and `../notes.md`) were confirmed by running the
original `QWORM.EXE` in DOSBox. Its displayed outputs for 23 input sets (1–4 starts, 14.5–30° PA,
2–20° lead angle, thick/thin teeth, plating) were recorded in `tests/reference-cases.json`.

```
node tests/run-tests.js
```

All 55 checks agree with the original to its displayed precision (4 decimals). Differences are ≤ 0.00006,
which is consistent with the original's single-precision arithmetic. In one recorded case (`u4`) the web app
rounds to 2.1378 where the original shows 2.1377.

## Files

```
index.html               page markup
css/style.css            screen + print styles
js/qworm-engine.js       calculation engine (pure functions, also loadable in Node)
js/app.js                user interface
tests/reference-cases.json  outputs recorded from the original QWORM.EXE
tests/run-tests.js       engine-vs-original regression test (Node)
```

## Deploying to GitHub Pages (when ready)

> Nothing has been pushed or published. These are the steps for when Gary decides to go ahead.

1. Create a repository under the **Ram-Gear** GitHub account (for example `qworm`).
2. From this folder:
   ```
   git remote add origin https://github.com/Ram-Gear/qworm.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   then choose branch `main`, folder `/ (root)`, and **Save**.
4. After a minute the site will be at `https://ram-gear.github.io/qworm/`.

All paths are relative, so the site also works from a sub-folder, from a custom domain, or from a local file.
Note that a GitHub Pages site is **public** even if the repository is private (private Pages needs GitHub Enterprise).

## Testing locally

```
python3 -m http.server 8000      # then open http://localhost:8000/
node tests/run-tests.js          # numeric regression against the original
```

## Caveats

* This tool assumes an **involute-helicoid (ZI) worm** measured with three wires, as the original did.
  Worms made with a straight-sided lathe tool (ZA/ZN) will differ slightly at larger lead angles.
* The original's upper limit on plating allowance could not be pinned down. In testing, 0.02 was rejected
  at 0.5 axial pitch and 0.019 was accepted at 1.0 axial pitch. This version accepts any plating value
  and warns when it is large.
* Always check critical dimensions independently before cutting.
