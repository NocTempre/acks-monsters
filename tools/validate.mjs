/**
 * Pre-release validation: JS syntax, JSON validity, and — critically —
 * Handlebars template compilation (a template parse error otherwise only
 * surfaces at render time inside Foundry).
 *
 * Usage:  node tools/validate.mjs   (run by the release workflow)
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import Handlebars from "handlebars";

const ROOT = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
let failed = false;

function fail(file, message) {
  console.error(`FAIL ${file}: ${message}`);
  failed = true;
}

for (const dir of ["scripts", "tools"]) {
  for (const file of fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith(".mjs"))) {
    const full = path.join(ROOT, dir, file);
    try {
      execFileSync(process.execPath, ["--check", full], { stdio: "pipe" });
    } catch (err) {
      fail(`${dir}/${file}`, String(err.stderr ?? err.message).trim().split("\n")[0]);
    }
  }
}

// Templates may be nested; walk the tree.
function walkHbs(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHbs(full);
    else if (entry.name.endsWith(".hbs")) {
      try {
        Handlebars.precompile(fs.readFileSync(full, "utf8"));
      } catch (err) {
        fail(path.relative(ROOT, full), err.message.split("\n").slice(0, 2).join(" "));
      }
    }
  }
}
walkHbs(path.join(ROOT, "templates"));

for (const file of ["module.json", "lang/en.json", "package.json"]) {
  try {
    JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
  } catch (err) {
    fail(file, err.message);
  }
}

if (failed) process.exit(1);
console.log("validate: all scripts, templates, and JSON OK");
