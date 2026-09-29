/* =============================================================================
 *  tools/package.mjs
 *  Builds the deployment archives for Plesk.
 *
 *    node tools/package.mjs           -> adbk-site.zip     (the site, ~2 MB)
 *    node tools/package.mjs tour      -> adbk-tour.zip     (EG tour)
 *    node tools/package.mjs tour-1og  -> adbk-tour-1og.zip (1. OG tour)
 *
 *  Each tour is packaged separately on purpose. They are thousands of tile
 *  files that practically never change, and together well over 100 MB, so
 *  folding them into the routine archive would mean re-uploading all of it for
 *  every CSS tweak. Upload a tour once; after that only the small site archive
 *  needs to travel.
 *
 *  Why this is a script and not a one-line npm command:
 *
 *  On Windows two different `tar` binaries are commonly on PATH -
 *  C:\Windows\System32\tar.exe (bsdtar, understands zip) and Git for Windows'
 *  /usr/bin/tar (GNU tar, does NOT). Whichever comes first wins, so the same
 *  command produced a real zip from PowerShell and a plain tar named .zip from
 *  Git Bash. GNU tar does not warn: `-a` simply fails to recognise the .zip
 *  extension and writes an uncompressed tar, which Plesk then rejects with
 *  "End-of-central-directory signature not found".
 *
 *  So: resolve bsdtar by absolute path, then verify the result really is a zip
 *  before saying it worked.
 * ========================================================================== */

import { spawnSync } from "node:child_process";
import { openSync, readSync, closeSync, statSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

// One self-contained Marzipano tour per floor. They are packaged separately
// from the site and from each other: together they are well over 100 MB and
// practically never change, so folding them into the routine archive would
// mean re-uploading all of it for every CSS tweak.
const TOUR_DIRS = ["assets/tour", "assets/tour-1og"];

// No argument means the site archive; otherwise the argument names a tour by
// its folder's last segment ("tour", "tour-1og").
const arg = process.argv[2];
const tourDir = arg
  ? TOUR_DIRS.find((d) => d.split("/").pop() === arg)
  : undefined;

if (arg && !tourDir) {
  console.error(
    `✗ unknown target "${arg}" - expected one of: ` +
      TOUR_DIRS.map((d) => d.split("/").pop()).join(", ")
  );
  process.exit(1);
}

const target = tourDir
  ? {
      out: `adbk-${tourDir.split("/").pop()}.zip`,
      args: [tourDir],
      label: `360° tour (${tourDir.split("/").pop()})`,
    }
  : {
      out: "adbk-site.zip",
      // Both tours are excluded here; they ship via `package:tour*`.
      args: [...TOUR_DIRS.flatMap((d) => ["--exclude", d]), "index.html", "assets"],
      label: "site",
    };

// --- pick an archiver that can actually write zip ---------------------------
const tarBin =
  process.platform === "win32"
    ? join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe")
    : "tar";

if (process.platform === "win32" && !existsSync(tarBin)) {
  console.error(`✗ bsdtar not found at ${tarBin}`);
  process.exit(1);
}

if (tourDir && !existsSync(tourDir)) {
  console.error(`✗ ${tourDir} does not exist`);
  process.exit(1);
}

// --- build ------------------------------------------------------------------
rmSync(target.out, { force: true });

const run = spawnSync(tarBin, ["-a", "-c", "-f", target.out, ...target.args], {
  stdio: "inherit",
});

if (run.status !== 0) {
  console.error("✗ archiving failed");
  process.exit(run.status ?? 1);
}

// --- verify it is a zip, not a tar in disguise ------------------------------
const fd = openSync(target.out, "r");
const magic = Buffer.alloc(4);
readSync(fd, magic, 0, 4, 0);
closeSync(fd);

// Every zip starts with a local file header: 50 4B 03 04 ("PK\x03\x04").
if (magic.toString("hex") !== "504b0304") {
  console.error(
    `✗ ${target.out} is not a zip archive (starts with ${magic.toString("hex")}).\n` +
      `  A tar was written instead - check that ${tarBin} is bsdtar.`
  );
  rmSync(target.out, { force: true });
  process.exit(1);
}

// --- report ------------------------------------------------------------------
const list = spawnSync(tarBin, ["-tf", target.out], { encoding: "utf8" });
// Trim first: on Windows the lines carry \r, which would hide the trailing
// slash and make directory entries count as files.
const files = list.stdout
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.endsWith("/"));
const mb = (statSync(target.out).size / 1024 / 1024).toFixed(2);

console.log(
  `✓ ${target.out} — ${target.label}, ${files.length} files, ${mb} MB (verified zip)`
);
