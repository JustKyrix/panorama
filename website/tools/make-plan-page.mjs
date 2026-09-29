/* =============================================================================
 *  tools/make-plan-page.mjs
 *  Builds assets/plan.html - the Gebäudeplan on its own, with none of the
 *  homepage around it.
 *
 *      node tools/make-plan-page.mjs
 *
 *  The 360° tours load this in an overlay, so that pressing "Gebäudeplan"
 *  inside a tour opens the very same panel it opens on the homepage instead of
 *  navigating away from the panorama.
 *
 *  The markup is LIFTED FROM index.html rather than written out a second time.
 *  The plan is generated (tools/gen_plan + the splice), so a hand-kept copy
 *  would be one more thing to remember on every change - and the floors, the
 *  areas and the two tour cards would quietly drift apart between the two
 *  pages.
 *
 *  <base href="../"> is what makes the lift possible: the page sits in
 *  assets/, so the base puts it back at the site root and every path inside
 *  the block - assets/css/main.css, assets/tour/index.html - resolves exactly
 *  as it does on the homepage, unchanged.
 * ========================================================================== */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const SRC = "index.html";
const OUT = "assets/plan.html";
const OPEN_TAG = '<div class="gplan" data-gplan>';

if (!existsSync(SRC)) {
  console.error(`✗ ${SRC} not found`);
  process.exit(1);
}

const html = readFileSync(SRC, "utf8");
const start = html.indexOf(OPEN_TAG);

if (start === -1) {
  console.error(`✗ ${SRC}: no ${OPEN_TAG} found`);
  process.exit(1);
}

// Walk the tags from the opening one, counting depth, so the block ends at its
// own closing tag and not at the first </div> that happens to come along.
const tag = /<div\b[^>]*>|<\/div>/g;
tag.lastIndex = start;

let depth = 0;
let end = -1;
let m;

while ((m = tag.exec(html))) {
  depth += m[0] === "</div>" ? -1 : 1;
  if (depth === 0) {
    end = m.index + m[0].length;
    break;
  }
}

if (end === -1) {
  console.error(`✗ ${SRC}: ${OPEN_TAG} is never closed`);
  process.exit(1);
}

// The ?v= stamps on the two tour links are dropped, and that is not an
// oversight - it breaks a cycle that would otherwise re-stamp everything on
// every build:
//
//   plan.html holds the tour URLs -> its hash feeds tour-nav.js
//   -> which changes each tour's index.html -> whose hash IS the tour URL
//   -> which is in plan.html
//
// Nothing is lost by cutting it here. What those stamps guard against is a
// stale copy of a tour PAGE, and each tour stamps its own stylesheet, script
// and data.js from the inside, so a cached shell still pulls fresh contents.
// The homepage keeps its stamped links either way.
const block = html
  .slice(start, end)
  .replace(/(assets\/tour(?:-1og)?\/index\.html)\?v=[a-f0-9]+/g, "$1");

// Keep whatever ?v= stamps index.html already carries: this runs before
// stamp.mjs, which then re-stamps this page's own links anyway.
const cssHref = /href="(assets\/css\/main\.css[^"]*)"/.exec(html)?.[1]
  ?? "assets/css/main.css";
const jsSrc = /src="(assets\/js\/gebaeudeplan\.js[^"]*)"/.exec(html)?.[1]
  ?? "assets/js/gebaeudeplan.js";

const page = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gebäudeplan · Albrecht-Dürer-Berufskolleg</title>

<!-- GENERIERT von tools/make-plan-page.mjs - nicht von Hand bearbeiten.
     Der Block unten stammt unverändert aus index.html; geändert wird dort. -->

<!-- Die Seite liegt in assets/, die Basis schiebt sie zurück auf die
     Wurzel. Dadurch stimmen alle Pfade aus index.html hier unverändert. -->
<base href="../">

<link rel="stylesheet" href="${cssHref}">
</head>
<body class="gplan-standalone">

${block}

<script src="${jsSrc}" defer></script>
</body>
</html>
`;

const before = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
if (page !== before) writeFileSync(OUT, page);

console.log(
  `${page !== before ? "✓ wrote" : "· already current"} — ${OUT}` +
    ` (${(block.length / 1024).toFixed(1)} KB of markup lifted from ${SRC})`
);
