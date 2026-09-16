/* =============================================================================
 *  tools/package.mjs
 *  Builds the deployment archive for Plesk.
 *
 *  Why this is a script and not a one-line npm command:
 *
 *  On Windows two different `tar` binaries are commonly on PATH -
 *  C:\Windows\System32\tar.exe (bsdtar, understands zip) and Git for Windows'
 *  /usr/bin/tar (GNU tar, does NOT). Whichever comes first wins, so the same
 *  command produces a real zip from PowerShell and a plain tar named .zip from
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

const OUT = "adbk-site.zip";
const CONTENTS = ["index.html", "assets"];

// --- pick an archiver that can actually write zip ---------------------------
const tarBin =
  process.platform === "win32"
    ? join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe")
    : "tar";

if (process.platform === "win32" && !existsSync(tarBin)) {
  console.error(`✗ bsdtar not found at ${tarBin}`);
  process.exit(1);
}

// --- build ------------------------------------------------------------------
rmSync(OUT, { force: true });

const run = spawnSync(tarBin, ["-a", "-c", "-f", OUT, ...CONTENTS], {
  stdio: "inherit",
});

if (run.status !== 0) {
  console.error("✗ archiving failed");
  process.exit(run.status ?? 1);
}

// --- verify it is a zip, not a tar in disguise ------------------------------
const fd = openSync(OUT, "r");
const magic = Buffer.alloc(4);
readSync(fd, magic, 0, 4, 0);
closeSync(fd);

// Every zip starts with a local file header: 50 4B 03 04 ("PK\x03\x04").
if (magic.toString("hex") !== "504b0304") {
  console.error(
    `✗ ${OUT} is not a zip archive (starts with ${magic.toString("hex")}).\n` +
      `  A tar was written instead - check that ${tarBin} is bsdtar.`
  );
  rmSync(OUT, { force: true });
  process.exit(1);
}

// --- report ------------------------------------------------------------------
const list = spawnSync(tarBin, ["-tf", OUT], { encoding: "utf8" });
// Trim first: on Windows the lines carry \r, which would hide the trailing
// slash and make directory entries count as files.
const files = list.stdout
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.endsWith("/"));
const mb = (statSync(OUT).size / 1024 / 1024).toFixed(2);

console.log(`✓ ${OUT} — ${files.length} files, ${mb} MB (verified zip)`);
