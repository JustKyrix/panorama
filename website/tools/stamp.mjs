/* =============================================================================
 *  tools/stamp.mjs
 *  Stamps a content hash onto the CSS and JS links in index.html:
 *
 *      assets/css/main.css  ->  assets/css/main.css?v=6f1a2c9d
 *
 *  Browsers cache stylesheets and scripts hard. Without this, uploading a new
 *  build to Plesk leaves visitors (and you) on the previous CSS until a manual
 *  hard reload - the file on the server is correct, but nobody sees it. The
 *  filename staying the same is exactly what makes the cache hold on, so the
 *  query string gives it a new identity whenever the bytes change.
 *
 *  The value is a hash of the file's own contents, not a timestamp, so it only
 *  moves when something actually changed - re-running this on an unchanged
 *  build leaves index.html untouched and produces no git noise.
 * ========================================================================== */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

const PAGE = "index.html";

// Assets whose links should carry a hash. Vendor files are versioned by their
// own release, so they are left alone.
const ASSETS = ["assets/css/main.css", "assets/js/gebaeudeplan.js"];

if (!existsSync(PAGE)) {
  console.error(`✗ ${PAGE} not found`);
  process.exit(1);
}

let html = readFileSync(PAGE, "utf8");
const before = html;
const stamped = [];

for (const asset of ASSETS) {
  if (!existsSync(asset)) {
    console.error(`✗ ${asset} not found - run the build first`);
    process.exit(1);
  }

  const hash = createHash("sha256")
    .update(readFileSync(asset))
    .digest("hex")
    .slice(0, 8);

  // Match the path with or without an existing ?v=... so re-runs replace
  // rather than append.
  const pattern = new RegExp(
    `(["'])${asset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\?v=[a-f0-9]+)?\\1`,
    "g"
  );

  if (!pattern.test(html)) {
    console.error(`✗ no link to ${asset} found in ${PAGE}`);
    process.exit(1);
  }

  html = html.replace(pattern, `$1${asset}?v=${hash}$1`);
  stamped.push(`${asset.split("/").pop()}?v=${hash}`);
}

if (html === before) {
  console.log(`· ${PAGE} already current — ${stamped.join(", ")}`);
} else {
  writeFileSync(PAGE, html);
  console.log(`✓ ${PAGE} stamped — ${stamped.join(", ")}`);
}
