/* =============================================================================
 *  tools/sync-tour.mjs
 *  Copies the shared tour skin and nav script into every tour, and makes sure
 *  each tour's index.html actually links them.
 *
 *      node tools/sync-tour.mjs
 *
 *  Each Marzipano tour is a self-contained export, so anything we add has to
 *  live inside it. Maintaining the same file twice by hand had already let the
 *  two copies drift apart once, hence one source in tools/tour-shared/ and
 *  this script.
 *
 *  The generated files - index.js, style.css, data.js - are never touched, so
 *  a tour can be re-exported from the Marzipano Tool and only needs this run
 *  again afterwards to get its links back.
 * ========================================================================== */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const TOURS = [join("assets", "tour"), join("assets", "tour-1og")];
const SRC = join("tools", "tour-shared");

// Each shared file, with the tag that has to be present in index.html.
const FILES = [
{
    name: "tour-skin.css",
    // After style.css, so it overrides the generated defaults.
    tag: '<link rel="stylesheet" href="tour-skin.css">',
    after: /<link rel="stylesheet" href="style\.css">/,
    present: /href="tour-skin\.css/,
  },{
    name: "tour-nav.js",
    // After index.js: the countdown reads the class index.js puts on the
    // autorotate button, so that file has to have run first.
    tag: '<script src="tour-nav.js"></script>',
    after: /<script src="index\.js"><\/script>/,
    present: /src="tour-nav\.js/,
  },{
    name: "tour-extras.js",
    // Last: it reads window.__tour, which index.js only defines once it has
    // run, and it leans on the same skin as tour-nav.js.
    tag: '<script src="tour-extras.js"></script>',
    // Tolerates the ?v= stamp that will already be on that tag.
    after: /<script src="tour-nav\.js[^"]*"><\/script>/,
    present: /src="tour-extras\.js/,
  },
];

/* -----------------------------------------------------------------------------
 *  Bruecke zu index.js
 *
 *  index.js is generated and keeps `viewer`, the scene list and switchScene
 *  inside an IIFE, so nothing outside can move the camera or change scene.
 *  tour-nav.js needs both - keyboard navigation and the poster hotspot - so
 *  one small handle is appended rather than forking the whole file. Applied
 *  here so that re-exporting a tour and running this script restores it.
 * -------------------------------------------------------------------------- */

const BRIDGE_MARK = "window.__tour =";

const BRIDGE = `
  // --- Angehaengt von tools/sync-tour.mjs ---------------------------------
  // Handle fuer tour-nav.js. Nichts davon wird hier veraendert, nur gereicht.
  window.__tour = {
    viewer: viewer,
    scenes: scenes,
    data: data,
    switchScene: switchScene,
    findSceneById: findSceneById,
    startAutorotate: startAutorotate,
    stopAutorotate: stopAutorotate,
    autorotateToggle: autorotateToggleElement
  };

`;

const bridge = (dir) => {
  const file = join(dir, "index.js");
  const js = readFileSync(file, "utf8");

  if (js.includes(BRIDGE_MARK)) return false;

  // The IIFE's own closing line, which is the last thing in the file.
  const at = js.lastIndexOf("})();");
  if (at === -1) {
    console.error(`✗ ${file}: could not find the end of the IIFE`);
    process.exit(1);
  }

  writeFileSync(file, js.slice(0, at) + BRIDGE + js.slice(at));
  return true;
};

let copied = 0;
let linked = 0;
let bridged = 0;

for (const dir of TOURS) {
  if (!existsSync(dir)) {
    console.error(`✗ ${dir} does not exist`);
    process.exit(1);
  }

  const page = join(dir, "index.html");
  let html = readFileSync(page, "utf8");
  const before = html;

  for (const file of FILES) {
    const from = join(SRC, file.name);

    if (!existsSync(from)) {
      console.error(`✗ ${from} not found`);
      process.exit(1);
    }

    copyFileSync(from, join(dir, file.name));
    copied++;

    if (file.present.test(html)) continue;

    const anchor = file.after.exec(html);
    if (!anchor) {
      console.error(
        `✗ ${page}: could not find where to put ${file.name} - expected ${file.after}`
      );
      process.exit(1);
    }

    const at = anchor.index + anchor[0].length;
    html = html.slice(0, at) + "\n" + file.tag + html.slice(at);
    linked++;
  }

  if (html !== before) writeFileSync(page, html);

  if (bridge(dir)) bridged++;
}

console.log(
  `✓ synced — ${copied} files into ${TOURS.length} tours` +
    (linked ? `, added ${linked} missing link(s)` : "") +
    (bridged ? `, bridged ${bridged} index.js` : "")
);
