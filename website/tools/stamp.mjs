/* =============================================================================
 *  tools/stamp.mjs
 *  Stamps content hashes onto asset links so browsers refetch what changed:
 *
 *      assets/css/main.css  ->  assets/css/main.css?v=6f1a2c9d
 *
 *  Browsers cache stylesheets and scripts hard. Without this, uploading a new
 *  build to Plesk leaves visitors on the previous CSS until a manual hard
 *  reload - the file on the server is correct, but nobody sees it. The
 *  filename staying the same is exactly what makes the cache hold on, so the
 *  query string gives it a new identity whenever the bytes change.
 *
 *  Two pages are stamped, because the tour is a page of its own inside an
 *  iframe:
 *
 *    index.html            -> main.css, gebaeudeplan.js
 *    assets/tour/index.html-> tour-skin.css
 *
 *  ...and then the iframe URL itself gets a stamp derived from the tour page,
 *  otherwise a cached copy of that page keeps loading the old stylesheet list
 *  and a restyle never shows up. That is not hypothetical: it happened.
 *
 *  Values are hashes of the files' own bytes, not timestamps, so they only
 *  move when something actually changed - re-running on an unchanged build
 *  leaves everything alone and produces no git noise.
 * ========================================================================== */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, posix } from "node:path";

const hashOf = (file) =>
  createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 8);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Rewrite `href`/`src`/`data-tour` values for `assets` inside `page`,
 * replacing any existing ?v=... rather than appending a second one.
 * `dir` is where the asset paths resolve on disk, when the page references
 * them relatively.
 */
const stampPage = (page, assets, dir = ".") => {
  if (!existsSync(page)) {
    console.error(`✗ ${page} not found`);
    process.exit(1);
  }

  let html = readFileSync(page, "utf8");
  const before = html;
  const done = [];

  for (const asset of assets) {
    const onDisk = join(dir, asset);

    if (!existsSync(onDisk)) {
      console.error(`✗ ${onDisk} not found - run the build first`);
      process.exit(1);
    }

    const hash = hashOf(onDisk);
    const pattern = new RegExp(
      `(["'])${escapeRe(asset)}(\\?v=[a-f0-9]+)?\\1`,
      "g"
    );

    if (!pattern.test(html)) {
      console.error(`✗ no reference to ${asset} found in ${page}`);
      process.exit(1);
    }

    html = html.replace(pattern, `$1${asset}?v=${hash}$1`);
    done.push(`${posix.basename(asset)}?v=${hash}`);
  }

  if (html !== before) writeFileSync(page, html);
  return { changed: html !== before, done };
};

// --- 1. the tour pages, so their own stylesheet is versioned ----------------
// Each floor has its own self-contained tour, so each gets stamped.
const TOURS = [join("assets", "tour"), join("assets", "tour-1og")];
// data.js is stamped too: it holds the scene names, so a cached copy would
// keep showing the old ones even once the page itself has been refetched.
const tours = TOURS.map((dir) =>
  stampPage(join(dir, "index.html"), ["tour-skin.css", "data.js"], dir)
);

// --- 2. the site page ------------------------------------------------------
// The iframe URL is stamped from the tour page's hash, computed after the step
// above so it reflects the stylesheet stamp too.
const site = stampPage("index.html", [
  "assets/css/main.css",
  "assets/js/gebaeudeplan.js",
]);

let html = readFileSync("index.html", "utf8");
const before = html;
const tourStamps = [];

for (const dir of TOURS) {
  const hash = hashOf(join(dir, "index.html"));
  // `join` uses backslashes on Windows; the markup always uses forward ones.
  const parts = dir.split(/[\\/]/);
  const href = parts.join("/") + "/index.html";

  const pattern = new RegExp(
    "([\"'])" + escapeRe(href) + "(?:\\?v=[a-f0-9]+)?\\1",
    "g"
  );

  if (!pattern.test(html)) {
    console.error(`✗ no reference to ${href} found in index.html`);
    process.exit(1);
  }

  html = html.replace(pattern, `$1${href}?v=${hash}$1`);
  tourStamps.push(`${parts.at(-1)}?v=${hash}`);
}

if (html !== before) writeFileSync("index.html", html);
const withIframe = html;

// --- report -----------------------------------------------------------------
const parts = [...site.done, ...tours.flatMap((t) => t.done), ...tourStamps];

const touched = site.changed || tours.some((t) => t.changed) || withIframe !== before;
console.log(
  `${touched ? "✓ stamped" : "· already current"} — ${parts.join(", ")}`
);
